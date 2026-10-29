package com.segurixt.api.repository;

import com.segurixt.api.entity.Producto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

// Opt-in: -Dtest=ProductoRepositoryIT test. Solo lecturas sobre la MySQL configurada.
// No crea una segunda base, no carga semillas ni altera el esquema.
@SpringBootTest
@Transactional(readOnly = true)
class ProductoRepositoryIT {
    @Autowired ProductoRepository productos;
    @Autowired JdbcTemplate jdbc;

    @Test void publicosExcluyeProductosYCategoriasInactivos() {
        long expected = jdbc.queryForObject("SELECT COUNT(*) FROM productos p JOIN categorias_producto c ON c.id=p.categoria_id WHERE p.activo=TRUE AND c.activo=TRUE", Long.class);
        var page = productos.findAll(ProductoSpecifications.publicos(null, null, null), PageRequest.of(0, 48, Sort.by("id")));
        assertEquals(expected, page.getTotalElements());
        for (Producto p : page) {
            assertEquals(Boolean.TRUE, p.getActivo());
            assertEquals(Boolean.TRUE, p.getCategoria().getActivo());
        }
    }

    @Test void combinaBusquedaCategoriaYDestacado() {
        var page = productos.findAll(ProductoSpecifications.publicos(null, null, null), PageRequest.of(0, 1, Sort.by("id")));
        assumeTrue(!page.isEmpty(), "Requiere al menos un producto público existente.");
        var p = page.getContent().getFirst();
        var found = productos.findAll(ProductoSpecifications.publicos(p.getCategoria().getSlug(), p.getNombre(), p.getDestacado()), PageRequest.of(0, 48));
        assertTrue(found.stream().anyMatch(item -> item.getId().equals(p.getId())));
        assertTrue(found.stream().allMatch(item -> item.getCategoria().getId().equals(p.getCategoria().getId())));
        assertTrue(found.stream().allMatch(item -> item.getDestacado().equals(p.getDestacado())));
        assertTrue(productos.findAll(ProductoSpecifications.publicos("categoria-inexistente-para-prueba", null, null), PageRequest.of(0, 1)).isEmpty());
    }

    @Test void paginacionTieneOrdenEstableSinRepetidos() {
        var first = productos.findAll(ProductoSpecifications.publicos(null, null, null), PageRequest.of(0, 1, Sort.by("id")));
        assumeTrue(first.getTotalElements() >= 2, "Requiere dos productos públicos existentes.");
        var second = productos.findAll(ProductoSpecifications.publicos(null, null, null), PageRequest.of(1, 1, Sort.by("id")));
        assertTrue(first.getContent().getFirst().getId() < second.getContent().getFirst().getId());
        assertEquals(first.getTotalElements(), second.getTotalElements());
    }
}
