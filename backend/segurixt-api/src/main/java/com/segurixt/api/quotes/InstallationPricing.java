package com.segurixt.api.quotes;

import java.math.*;
import java.util.*;
import static com.segurixt.api.quotes.QuoteModels.*;

/** Tarifas aprobadas por la empresa: sin costos fijos ni conversiones de superficie. */
final class InstallationPricing {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    List<CableRunEstimate> append(Request request, List<Product> selected, Settings settings,
            InstallationTariffs tariffs, List<Line> lines, List<String> warnings) {
        var input=request.installation();
        if (tariffs==null) throw new IllegalArgumentException("Configuración de instalación no disponible");
        boolean review=selected.stream().anyMatch(p -> "KIT".equals(p.role()) || "OTHER".equals(p.role()));
        Set<String> families=new HashSet<>();
        selected.stream().filter(p -> "CAMERA".equals(p.role())).forEach(p -> families.add(p.family()));
        String family=families.size()==1 ? families.iterator().next() : null;
        CableRule rule=family==null ? null : tariffs.cableRules().stream().filter(r -> family.equals(r.family()) && r.verified()).findFirst().orElse(null);
        int selectedCameras=request.items().stream().filter(i -> selected.stream().anyMatch(p -> p.id()==i.productId() && "CAMERA".equals(p.role()))).mapToInt(Item::quantity).sum();
        boolean cameraCountMatches=selectedCameras==input.cameras();
        boolean selectedCable=selected.stream().anyMatch(p -> "CABLE".equals(p.role()) || "CONNECTOR".equals(p.role()));
        boolean heightReview=tariffs.maxAutoHeight()==null || input.heightMetres().compareTo(tariffs.maxAutoHeight())>0;
        if (heightReview) pending(lines,"Altura de instalación",tariffs.maxAutoHeight()==null ? "Altura máxima automática pendiente de configurar." : "La altura supera el límite automático; requiere valoración técnica.","REVIEW");
        List<CableRunEstimate> runs=new ArrayList<>();
        for (int index=0;index<input.cameras();index++) {
            BigDecimal distance=input.cameraRuns().get(index).distanceMetres();
            BigDecimal extra=distance==null?null:distance.subtract(tariffs.includedLength()).max(BigDecimal.ZERO);
            BigDecimal billed=null,amount=null,quantity=null,price=null;
            Integer segments=null; String unit="m adicionales",reason=null;
            if (distance==null) reason="Recorrido pendiente de valoración; la superficie no determina el cable.";
            else if (extra.signum()==0) {
                billed=BigDecimal.ZERO; segments=0; amount=ZERO; quantity=BigDecimal.ZERO; price=ZERO;
                if (rule!=null && tariffs.includedLength().compareTo(rule.maxRunMetres())>0) {
                    pending(lines,"Cable incluido · Cámara "+(index+1),"La longitud prefabricada incluida supera el límite técnico; requiere valoración.","REVIEW");
                }
            }
            else if (review || !cameraCountMatches) reason="Verificar cámaras, contenido de kits y componentes incluidos antes de cobrar cable adicional.";
            else if (heightReview) reason="Valoración técnica por altura pendiente.";
            else if (selectedCable) reason="Hay cable o conectores seleccionados; confirmar cobertura para evitar costos duplicados.";
            else if (rule==null) reason="Sin regla técnica verificada para cámara, cable, conectores y alimentación.";
            else if (!rule.allowExtensions()) reason="El fabricante no tiene extensiones aprobadas en esta configuración.";
            else if ("METRE".equals(tariffs.cableMode())) {
                billed=extra; quantity=extra; price=tariffs.extraMetrePrice();
                if (distance.max(tariffs.includedLength()).compareTo(rule.maxRunMetres())>0) reason="Se supera el límite técnico del recorrido completo.";
                else if (price==null) reason="Precio por metro adicional pendiente de configurar.";
            } else if ("SEGMENT".equals(tariffs.cableMode())) {
                unit="tramo adicional";
                if (!rule.allowSegments()) reason="No están aprobadas las uniones de tramos prefabricados.";
                else if (tariffs.segmentLength()==null) reason="Longitud de tramo comercial pendiente de configurar.";
                else {
                    segments=extra.divide(tariffs.segmentLength(),0,RoundingMode.CEILING).intValueExact();
                    billed=tariffs.segmentLength().multiply(BigDecimal.valueOf(segments)); quantity=BigDecimal.valueOf(segments); price=tariffs.segmentPrice();
                    if ((long)segments+1>rule.maxSegments() || tariffs.includedLength().add(billed).compareTo(rule.maxRunMetres())>0) reason="La unión supera el número de tramos o la longitud total aprobados por el fabricante.";
                    else if (price==null) reason="Precio por tramo pendiente de configurar.";
                }
            } else reason="Modalidad de cable adicional pendiente de configurar.";
            if (reason==null && amount==null && quantity!=null && price!=null) amount=money(quantity.multiply(price));
            if (extra!=null) lines.add(new Line(null,"Cable adicional · Cámara "+(index+1),quantity==null?extra:quantity,unit,reason==null?price:null,amount,reason,"CABLE"));
            if (distance==null) pending(lines,"Cableado · Cámara "+(index+1),reason,"CABLE");
            runs.add(new CableRunEstimate(index+1,distance,tariffs.includedLength(),extra,billed,segments,amount,reason));
        }
        if (rule==null || !cameraCountMatches) pending(lines,"Compatibilidad del cable incluido","Confirmar familia técnica, cantidad de cámaras, conectores y alimentación; no se garantiza el kit de cable solo por su longitud.","REVIEW");
        if (review) pending(lines,"Mano de obra y materiales","Revisar contenido de kits o productos sin clasificar antes de añadir costos.","LABOUR");
        else {
            HeightRate rate=tariffs.heightRates().stream().filter(r -> input.heightMetres().compareTo(r.minHeight())>0 && input.heightMetres().compareTo(r.maxHeight())<=0).findFirst().orElse(null);
            BigDecimal exterior="INTERIOR".equals(input.environment())?BigDecimal.ONE:settings.exteriorMultiplier();
            if (heightReview || rate==null || rate.pricePerCamera()==null || exterior==null) pending(lines,"Mano de obra por altura","Rango de altura, tarifa, factor exterior o valoración técnica pendientes.","LABOUR");
            else {
                BigDecimal unitPrice=money(rate.pricePerCamera().multiply(exterior));
                lines.add(new Line(null,"Mano de obra · altura "+input.heightMetres()+" m",BigDecimal.valueOf(input.cameras()),"cámara",unitPrice,money(unitPrice.multiply(BigDecimal.valueOf(input.cameras()))),null,"LABOUR"));
            }
            if (tariffs.materials().isEmpty()) pending(lines,"Materiales y accesorios adicionales","Confirmar fuentes, cajas, canalización y materiales requeridos antes del presupuesto final.","MATERIAL");
            if (!heightReview) for (MaterialRate material:tariffs.materials()) {
                BigDecimal quantity=material.quantityPerCamera().multiply(BigDecimal.valueOf(input.cameras()));
                // Los accesorios del catálogo seleccionados pueden cubrir estos conceptos.
                boolean overlap=selected.stream().anyMatch(p -> "ACCESSORY".equals(p.role()));
                String reason=overlap?"Confirmar si los accesorios seleccionados ya cubren este material.":material.unitPrice()==null?"Tarifa de material pendiente de configurar.":null;
                lines.add(new Line(null,material.name(),quantity,"unidad",reason==null?material.unitPrice():null,reason==null?money(quantity.multiply(material.unitPrice())):null,reason,"MATERIAL"));
            }
        }
        warnings.add("Cable incluido: "+tariffs.includedLength()+" m por cámara. Los excedentes se calculan individualmente; no se convierten m² a metros lineales.");
        if (input.layoutAssumption()!=null && !"UNKNOWN".equals(input.layoutAssumption())) warnings.add("Recorridos aproximados bajo hipótesis "+input.layoutAssumption()+"; confirmar geometría, posición y altura del grabador y obstáculos.");
        return List.copyOf(runs);
    }
    private void pending(List<Line> lines,String description,String reason,String kind) { lines.add(new Line(null,description,BigDecimal.ONE,"revisión",null,null,reason,kind)); }
    private BigDecimal money(BigDecimal value) { return value.setScale(2,RoundingMode.HALF_UP); }
}
