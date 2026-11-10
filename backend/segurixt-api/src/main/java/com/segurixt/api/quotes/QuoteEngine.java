package com.segurixt.api.quotes;

import java.math.*;
import java.util.*;
import static com.segurixt.api.quotes.QuoteModels.*;

/** Función pura: solo recibe precios y compatibilidad del servidor. */
public class QuoteEngine {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    public Estimate calculate(Request request, List<Product> catalog, Settings settings) {
        return calculate(request,catalog,settings,null);
    }
    public Estimate calculate(Request request, List<Product> catalog, Settings settings, InstallationTariffs tariffs) {
        boolean perCamera=request.installation().perCamera();
        Map<Long,Product> products = new HashMap<>();
        catalog.forEach(p -> products.put(p.id(), p));
        Map<Long,Integer> quantities = new LinkedHashMap<>();
        for (Item item : request.items()) quantities.merge(item.productId(), item.quantity(), Math::addExact);
        if (quantities.values().stream().anyMatch(q -> q > 1000)) throw new IllegalArgumentException("Cantidad excesiva");
        List<Line> lines = new ArrayList<>(); List<String> warnings = new ArrayList<>();
        boolean containsKit = quantities.keySet().stream().map(products::get).filter(Objects::nonNull).anyMatch(p -> "KIT".equals(p.role()));
        List<Product> selected = new ArrayList<>();
        for (var entry : quantities.entrySet()) {
            Product product = products.get(entry.getKey());
            if (product == null) throw new IllegalArgumentException("Producto no disponible");
            selected.add(product);
            if (containsKit && !"KIT".equals(product.role())) {
                lines.add(new Line(product.id(), product.name(), BigDecimal.valueOf(entry.getValue()), "CABLE".equals(product.role()) ? "m lineales" : "unidad",
                    product.price(), null, "Confirmar si este componente ya está incluido en el kit; no se suma al total conocido."));
            } else add(lines, product, BigDecimal.valueOf(entry.getValue()));
        }
        var installation = request.installation();
        boolean kit = selected.stream().anyMatch(p -> "KIT".equals(p.role()));
        boolean unknown = selected.stream().anyMatch(p -> "OTHER".equals(p.role()));
        if (kit || unknown) {
            pending(lines, "Revisión de contenido y compatibilidad", "Confirmar componentes incluidos antes de añadir equipos, materiales o instalación.");
            warnings.add("No se agregaron costos automáticos: hay kits o productos sin clasificación técnica verificada.");
        } else {
            List<Product> cameras = selected.stream().filter(p -> "CAMERA".equals(p.role())).toList();
            int count = cameras.stream().mapToInt(p -> quantities.get(p.id())).sum();
            Set<String> families = new HashSet<>(); cameras.forEach(p -> families.add(p.family()));
            if (count != installation.cameras()) pending(lines, "Número de cámaras", "La cantidad seleccionada no coincide con las cámaras de instalación.");
            String family = families.size() == 1 ? families.iterator().next() : null;
            if (family == null || family.isBlank()) {
                pending(lines, "Compatibilidad", "Selecciona cámaras de una misma familia técnica verificada.");
            } else {
                List<Product> recorders = selected.stream().filter(p -> "RECORDER".equals(p.role())).toList();
                if (recorders.isEmpty()) {
                    Product suggestion = catalog.stream().filter(p -> "RECORDER".equals(p.role()) && family.equals(p.family())
                        && p.channels() >= installation.cameras()).sorted(Comparator.comparingInt(Product::channels).thenComparingLong(Product::id)).findFirst().orElse(null);
                    if (suggestion == null) pending(lines, "Grabador", "No hay un DVR/NVR verificado con suficientes canales.");
                    else { add(lines, suggestion, BigDecimal.ONE); warnings.add("Se sugirió un grabador de " + suggestion.channels() + " canales. Confirma sus especificaciones con la empresa."); }
                } else if (recorders.size() != 1 || quantities.get(recorders.getFirst().id()) != 1
                    || !family.equals(recorders.getFirst().family()) || recorders.getFirst().channels() < installation.cameras()) {
                    pending(lines, "Grabador seleccionado", "Debe haber un grabador compatible con capacidad suficiente; requiere corrección.");
                }
                suggest(lines, selected, catalog, "DISK", family, BigDecimal.ONE);
                if (!perCamera) {
                if (installation.cableMetres() == null) pending(lines, "Cableado (m lineales)", "Falta medir el recorrido real; la superficie no determina la longitud.");
                else suggest(lines, selected, catalog, "CABLE", family, installation.cableMetres());
                suggest(lines, selected, catalog, "CONNECTOR", family, BigDecimal.valueOf(installation.cameras() * 2L));
                }
                var accessories = catalog.stream().filter(p -> "ACCESSORY".equals(p.role()) && family.equals(p.family())).map(p -> p.name() + " (#" + p.id() + ")").limit(10).toList();
                if (!accessories.isEmpty()) warnings.add("Accesorios compatibles para revisar y agregar según el proyecto: " + String.join(", ", accessories));
                if (selected.stream().anyMatch(p -> "ACCESSORY".equals(p.role()) && !family.equals(p.family()))) pending(lines, "Accesorio seleccionado", "Familia incompatible o sin verificar.");
                if (!perCamera) pending(lines, "Accesorios y alimentación", "Confirmar fuentes, PoE, cajas, canalización y almacenamiento necesario durante la revisión técnica.");
            }
            if (!perCamera) {
            BigDecimal rate = settings.labourPerCamera();
            BigDecimal difficulty = "ALTA".equals(installation.difficulty()) ? settings.highDifficultyMultiplier() : BigDecimal.ONE;
            BigDecimal exterior = !"INTERIOR".equals(installation.environment()) ? settings.exteriorMultiplier() : BigDecimal.ONE;
            if (rate == null || difficulty == null || exterior == null) pending(lines, "Mano de obra", "Tarifa o factores de instalación pendientes de configurar.");
            else line(lines, null, "Instalación · " + installation.difficulty() + " · " + installation.environment(), BigDecimal.valueOf(installation.cameras()), "cámara", money(rate.multiply(difficulty).multiply(exterior)), null);
            }
        }
        List<CableRunEstimate> cableRuns=perCamera ? new InstallationPricing().append(request,selected,settings,tariffs,lines,warnings) : List.of();
        BigDecimal subtotal = lines.stream().map(Line::amount).filter(Objects::nonNull).reduce(ZERO, BigDecimal::add);
        boolean fiscalPending = settings.taxEnabled() && settings.taxRate() == null;
        if (fiscalPending) pending(lines, "Impuestos", "Falta configurar la tasa fiscal.");
        BigDecimal tax = fiscalPending ? null : settings.taxEnabled() ? money(subtotal.multiply(settings.taxRate())) : ZERO;
        boolean complete = lines.stream().noneMatch(l -> l.pending() != null);
        warnings.add("Estimación en MXN sujeta a revisión y confirmación de SegurIXT. Los pendientes no están incluidos en el subtotal conocido.");
        return new Estimate(List.copyOf(lines), List.copyOf(warnings), subtotal, tax, tax == null ? subtotal : subtotal.add(tax), complete, settings.taxEnabled(), settings.taxRate(),cableRuns,installation.heightMetres(),tariffs==null?null:tariffs.includedLength());
    }
    private void suggest(List<Line> lines, List<Product> selected, List<Product> catalog, String role, String family, BigDecimal needed) {
        var existing = selected.stream().filter(p -> role.equals(p.role())).toList();
        if (!existing.isEmpty()) {
            if (existing.stream().anyMatch(p -> !family.equals(p.family()))) pending(lines, role, "Componente de familia incompatible.");
            BigDecimal quantity = lines.stream().filter(l -> existing.stream().anyMatch(p -> Objects.equals(p.id(), l.productId()))).map(Line::quantity).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (quantity.compareTo(needed) < 0) pending(lines, role, "Cantidad insuficiente; se requieren " + needed + " " + (role.equals("CABLE") ? "m lineales" : "unidades") + ".");
            return;
        }
        Product suggestion = catalog.stream().filter(p -> role.equals(p.role()) && family.equals(p.family())).min(Comparator.comparingLong(Product::id)).orElse(null);
        if (suggestion == null) pending(lines, role, "No hay un componente verificado disponible.");
        else add(lines, suggestion, needed);
    }
    private void add(List<Line> lines, Product p, BigDecimal quantity) {
        line(lines, p.id(), p.name(), quantity, "CABLE".equals(p.role()) ? "m lineales" : "unidad", p.price(), p.price() == null ? "Precio pendiente de cotizar" : null);
    }
    private void pending(List<Line> lines, String name, String reason) { line(lines, null, name, BigDecimal.ONE, "revisión", null, reason); }
    private void line(List<Line> lines, Long id, String name, BigDecimal q, String unit, BigDecimal price, String reason) {
        if (price != null && price.signum() < 0) throw new IllegalArgumentException("Precio inválido");
        lines.add(new Line(id, name, q, unit, price, price == null ? null : money(price.multiply(q)), reason));
    }
    private BigDecimal money(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP); }
}
