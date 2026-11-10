package com.segurixt.api.quotes;

import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static com.segurixt.api.quotes.QuoteModels.*;

class InstallationPricingTest {
    BigDecimal b(String value) { return new BigDecimal(value); }
    final QuoteEngine engine=new QuoteEngine();
    Settings settings=new Settings(null,null,b("1.2"),false,null);
    List<Product> catalog=List.of(new Product(1,"Cámara",b("1000.00"),"CAMERA","A",0),new Product(2,"NVR",b("500.00"),"RECORDER","A",8),new Product(3,"Disco",b("500.00"),"DISK","A",0));
    CableRule rule(boolean extensions,boolean segments,int maxSegments,String maxRun) {
        return new CableRule("A",true,"Tipo documentado","Cable documentado","Conectores documentados","Alimentación verificada","Documento de fabricante de prueba",b(maxRun),extensions,segments,maxSegments);
    }
    InstallationTariffs tariffs(String mode) {
        return new InstallationTariffs(b("18"),mode,b("10.25"),b("100.00"),b("18"),b("6"),
            List.of(new HeightRate(b("0"),b("3"),b("100.00")),new HeightRate(b("3"),b("6"),b("180.00"))),List.of(rule(true,true,5,"90")),List.of(new MaterialRate("Caja",BigDecimal.ONE,b("20"))));
    }
    Request request(String height,String... distances) {
        return new Request(List.of(new Item(1L,distances.length)),new Installation(b("100"),distances.length,"INTERIOR",null,null,b(height),Arrays.stream(distances).map(d->new CameraRun(d==null?null:b(d))).toList(),"UNKNOWN"));
    }
    Estimate estimate(String mode,String height,String... distances) {return engine.calculate(request(height,distances),catalog,settings,tariffs(mode));}
    @Test void cableIncluidoNoGeneraAdicionalHastaDieciochoMetros() {
        var result=estimate("METRE","2.5","12","18");
        assertEquals(2,result.cableRuns().size());
        for(var run:result.cableRuns()) {assertEquals(0,run.additionalMetres().signum());assertEquals(0,run.amount().signum());}
        assertTrue(result.lines().stream().filter(l->"CABLE".equals(l.kind())).allMatch(l->l.amount().signum()==0));
    }
    @Test void excedentesSeCalculanIndividualmenteSinConvertirAreaACable() {
        var result=estimate("METRE","2.5","12","18","25","30","15");
        assertEquals(List.of(b("0"),b("0"),b("7"),b("12"),b("0")),result.cableRuns().stream().map(CableRunEstimate::additionalMetres).toList());
        assertEquals(b("71.75"),result.cableRuns().get(2).amount());
        assertEquals(b("123.00"),result.cableRuns().get(3).amount());
        var changed=request("2.5","25");
        var installation=changed.installation();
        var withArea=new Request(changed.items(),new Installation(b("900"),1,"INTERIOR",null,null,installation.heightMetres(),installation.cameraRuns(),"UNKNOWN"));
        assertEquals(engine.calculate(changed,catalog,settings,tariffs("METRE")).cableRuns(),engine.calculate(withArea,catalog,settings,tariffs("METRE")).cableRuns());
    }
    @Test void tramosSeRedondeanPorCamaraNuncaSobreLaSuma() {
        var result=estimate("SEGMENT","2.5","19","19");
        assertEquals(2,result.cableRuns().stream().mapToInt(CableRunEstimate::additionalSegments).sum());
        assertEquals(b("200.00"),result.cableRuns().stream().map(CableRunEstimate::amount).reduce(b("0.00"),BigDecimal::add));
        assertEquals(b("18"),result.cableRuns().getFirst().billedMetres());
    }
    @Test void noPermiteUnionesNoAprobadasNiExcederLimiteDeCableComercial() {
        var original=tariffs("SEGMENT");
        var notApproved=new InstallationTariffs(original.includedLength(),original.cableMode(),original.extraMetrePrice(),original.segmentPrice(),original.segmentLength(),original.maxAutoHeight(),original.heightRates(),List.of(rule(true,false,5,"90")),original.materials());
        var rejected=engine.calculate(request("2","19"),catalog,settings,notApproved).cableRuns().getFirst();
        assertNull(rejected.amount());assertTrue(rejected.pending().contains("uniones"));
        var limited=new InstallationTariffs(original.includedLength(),original.cableMode(),original.extraMetrePrice(),original.segmentPrice(),original.segmentLength(),original.maxAutoHeight(),original.heightRates(),List.of(rule(true,true,5,"30")),original.materials());
        assertNull(engine.calculate(request("2","25"),catalog,settings,limited).cableRuns().getFirst().amount()); // 18+18=36 >30 aunque recorrido=25
    }
    @Test void tarifasAusentesYRecorridosDesconocidosSonPendientes() {
        var missing=new InstallationTariffs(b("18"),"METRE",null,null,null,null,List.of(),List.of(),List.of());
        var result=engine.calculate(request("2.5",(String)null,"25"),catalog,settings,missing);
        assertNull(result.cableRuns().getFirst().additionalMetres());assertNull(result.cableRuns().get(1).amount());
        assertFalse(result.complete());
        assertTrue(result.lines().stream().anyMatch(l->"LABOUR".equals(l.kind())&&l.amount()==null));
    }
    @Test void usaRangosDeAlturaYNoInventarManoDeObraFueraDelLimite() {
        var low=estimate("METRE","3","18");
        var high=estimate("METRE","3.01","18");
        assertEquals(b("100.00"),low.lines().stream().filter(l->"LABOUR".equals(l.kind())).findFirst().orElseThrow().amount());
        assertEquals(b("180.00"),high.lines().stream().filter(l->"LABOUR".equals(l.kind())).findFirst().orElseThrow().amount());
        var over=estimate("METRE","6.01","25");
        assertNull(over.lines().stream().filter(l->"LABOUR".equals(l.kind())).findFirst().orElseThrow().amount());
        assertNull(over.cableRuns().getFirst().amount());assertFalse(over.complete());
    }
    @Test void cambioDeCamarasActualizaMaterialesYManoDeObra() {
        var one=estimate("METRE","2","18");var two=estimate("METRE","2","18","18");
        assertEquals(b("200.00"),two.lines().stream().filter(l->"LABOUR".equals(l.kind())).findFirst().orElseThrow().amount());
        assertEquals(b("20.00"),one.lines().stream().filter(l->"MATERIAL".equals(l.kind())).findFirst().orElseThrow().amount());
        assertEquals(b("40.00"),two.lines().stream().filter(l->"MATERIAL".equals(l.kind())).findFirst().orElseThrow().amount());
    }
    @Test void kitYCableSeleccionadoNoSeCobranDosVeces() {
        var products=new ArrayList<>(catalog);products.add(new Product(4,"Kit",b("3000"),"KIT",null,0));products.add(new Product(5,"Cable manual",b("100"),"CABLE","A",0));
        var input=request("2","25");
        for(long id:List.of(4L,5L)) {
            var result=engine.calculate(new Request(List.of(new Item(1L,1),new Item(id,1)),input.installation()),products,settings,tariffs("METRE"));
            assertNull(result.cableRuns().getFirst().amount());assertFalse(result.complete());
        }
    }
    @Test void productoSinPrecioVisiblePermanecePendiente() {
        var products=new ArrayList<>(catalog);products.set(0,new Product(1,"Cámara",null,"CAMERA","A",0));
        var result=engine.calculate(request("2","18"),products,settings,tariffs("METRE"));
        assertNull(result.lines().getFirst().unitPrice());assertNull(result.lines().getFirst().amount());assertFalse(result.complete());
    }
    @Test void longitudIncluidaYPrecioNoEstanFijosEnElMotor() {
        var original=tariffs("METRE");
        var configured=new InstallationTariffs(b("20"),"METRE",b("12.50"),null,null,b("6"),original.heightRates(),original.cableRules(),original.materials());
        var result=engine.calculate(request("2","19","25"),catalog,settings,configured);
        assertEquals(0,result.cableRuns().getFirst().additionalMetres().signum());
        assertEquals(b("5"),result.cableRuns().get(1).additionalMetres());
        assertEquals(b("62.50"),result.cableRuns().get(1).amount());
        var missing=new InstallationTariffs(b("18"),"METRE",null,null,null,b("6"),original.heightRates(),original.cableRules(),original.materials());
        assertTrue(engine.calculate(request("2","25"),catalog,settings,missing).cableRuns().getFirst().pending().contains("Precio por metro"));
    }
}
