package com.segurixt.api.quotes;

import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static com.segurixt.api.quotes.QuoteModels.*;

class QuoteEngineTest {
    final QuoteEngine engine=new QuoteEngine();
    BigDecimal b(String n) { return new BigDecimal(n); }
    Settings settings=new Settings(b("100.00"),b("1.5"),b("1.2"),true,b("0.16"));
    Request request(List<Item> items, BigDecimal cable) { return new Request(items,new Installation(b("100"),5,"INTERIOR","NORMAL",cable)); }
    List<Product> catalog() { return List.of(
        new Product(1,"Cámara",b("1000.00"),"CAMERA","IP-A",0),
        new Product(2,"NVR 4",b("2000.00"),"RECORDER","IP-A",4),
        new Product(3,"NVR 8",b("2500.00"),"RECORDER","IP-A",8),
        new Product(4,"Disco",b("900.00"),"DISK","IP-A",0),
        new Product(5,"Cable",b("10.50"),"CABLE","IP-A",0),
        new Product(6,"Conector",b("5.00"),"CONNECTOR","IP-A",0)); }
    @Test void cincoCamarasRequierenOchoCanalesYNoCuatroConPreciosExactos() {
        var e=engine.calculate(request(List.of(new Item(1L,5)),b("120.50")),catalog(),settings);
        assertTrue(e.lines().stream().anyMatch(l -> Objects.equals(3L,l.productId())));
        assertFalse(e.lines().stream().anyMatch(l -> Objects.equals(2L,l.productId())));
        assertEquals(b("10215.25"),e.knownSubtotal());
        assertEquals(b("1634.44"),e.tax());
        assertEquals(b("11849.69"),e.knownTotal());
        assertFalse(e.complete()); // alimentación/canalización requieren valoración técnica
    }
    @Test void superficieNuncaSeConvierteEnCable() {
        var e=engine.calculate(request(List.of(new Item(1L,5)),null),catalog(),settings);
        assertFalse(e.lines().stream().anyMatch(l -> Objects.equals(5L,l.productId())));
        assertTrue(e.lines().stream().anyMatch(l -> l.description().equals("Cableado (m lineales)") && l.amount()==null));
    }
    @Test void precioAusenteNoSeInventaYLosImpuestosSonOpcionales() {
        var e=engine.calculate(request(List.of(new Item(7L,1)),null),List.of(new Product(7,"Kit",null,"KIT",null,0)),new Settings(null,null,null,false,null));
        assertEquals(b("0.00"),e.knownTotal()); assertEquals(b("0.00"),e.tax());
        assertNull(e.lines().getFirst().unitPrice()); assertFalse(e.complete());
        assertEquals(2,e.lines().size()); // ningún extra automático para kits
    }
    @Test void consolidaProductosYNoDuplicaDiscoSeleccionado() {
        var e=engine.calculate(request(List.of(new Item(1L,2),new Item(1L,3),new Item(4L,1)),b("10")),catalog(),settings);
        assertEquals(1,e.lines().stream().filter(l -> Objects.equals(1L,l.productId())).count());
        assertEquals(1,e.lines().stream().filter(l -> Objects.equals(4L,l.productId())).count());
        assertEquals(b("5"),e.lines().getFirst().quantity());
    }
    @Test void grabadorIncompatibleOInsuficienteSeMarcaPendiente() {
        var e=engine.calculate(request(List.of(new Item(1L,5),new Item(2L,1)),b("10")),catalog(),settings);
        assertTrue(e.lines().stream().anyMatch(l -> l.description().equals("Grabador seleccionado") && l.pending()!=null));
        assertFalse(e.lines().stream().anyMatch(l -> Objects.equals(3L,l.productId())));
    }
    @Test void aplicaFactoresConfiguradosConRedondeoYNoImpuestosInventados() {
        var req=new Request(List.of(new Item(1L,5)),new Installation(b("100"),5,"MIXTO","ALTA",null));
        var e=engine.calculate(req,catalog(),new Settings(b("100"),b("1.5"),b("1.2"),false,null));
        assertTrue(e.lines().stream().anyMatch(l -> l.description().startsWith("Instalación") && l.amount().equals(b("900.00"))));
        assertEquals(b("0.00"),e.tax());
    }
    @Test void rechazaProductosInexistentesYCantidadesAcumuladasExcesivas() {
        assertThrows(IllegalArgumentException.class,()->engine.calculate(request(List.of(new Item(99L,1)),null),catalog(),settings));
        assertThrows(IllegalArgumentException.class,()->engine.calculate(request(List.of(new Item(1L,1000),new Item(1L,1)),null),catalog(),settings));
    }
    @Test void materialesInsuficientesYFamiliasDiferentesNoPasanComoCompletos() {
        var mixed=new ArrayList<>(catalog()); mixed.add(new Product(9,"Cámara incompatible",b("400"),"CAMERA","OTRA",0));
        var e=engine.calculate(request(List.of(new Item(1L,4),new Item(9L,1)),null),mixed,settings);
        assertTrue(e.lines().stream().anyMatch(l -> l.description().equals("Compatibilidad")));
        var shortCable=engine.calculate(request(List.of(new Item(1L,5),new Item(5L,1)),b("50")),catalog(),settings);
        assertTrue(shortCable.lines().stream().anyMatch(l -> l.pending()!=null && l.pending().startsWith("Cantidad insuficiente")));
    }
    @Test void kitConComponentesSueltosNoDuplicaCostosPotencialmenteIncluidos() {
        var products=new ArrayList<>(catalog()); products.add(new Product(10,"Kit",b("4000"),"KIT",null,0));
        var e=engine.calculate(request(List.of(new Item(10L,1),new Item(1L,5),new Item(4L,1)),null),products,settings);
        assertEquals(b("4000.00"),e.knownSubtotal());
        assertTrue(e.lines().stream().filter(l -> Objects.equals(1L,l.productId()) || Objects.equals(4L,l.productId())).allMatch(l -> l.amount()==null && l.pending()!=null));
    }
}
