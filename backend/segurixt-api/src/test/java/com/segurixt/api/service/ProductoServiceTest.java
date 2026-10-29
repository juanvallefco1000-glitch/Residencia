package com.segurixt.api.service;

import com.segurixt.api.entity.*;
import com.segurixt.api.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductoServiceTest {
    @Mock ProductoRepository productos;
    @Mock CategoriaProductoRepository categorias;
    @Mock ImagenProductoRepository imagenes;
    @InjectMocks ProductoService service;

    private Producto producto(long id, boolean mostrar, BigDecimal precio) {
        var categoria = new CategoriaProducto();
        ReflectionTestUtils.setField(categoria, "id", 7L);
        ReflectionTestUtils.setField(categoria, "nombre", "Redes");
        ReflectionTestUtils.setField(categoria, "slug", "redes");
        var p = new Producto();
        ReflectionTestUtils.setField(p, "id", id);
        ReflectionTestUtils.setField(p, "nombre", "Switch");
        ReflectionTestUtils.setField(p, "categoria", categoria);
        ReflectionTestUtils.setField(p, "precio", precio);
        ReflectionTestUtils.setField(p, "mostrarPrecio", mostrar);
        return p;
    }

    @Test void ocultaImportesNoAutorizadosYCargaImagenesEnLote() {
        var items = List.of(producto(1, false, new BigDecimal("500.00")), producto(2, true, null), producto(3, true, new BigDecimal("123.45")));
        when(productos.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(items));
        when(imagenes.findByProductoIdInOrderByPrincipalDescOrdenAscIdAsc(List.of(1L, 2L, 3L))).thenReturn(List.of());
        var result = service.listar(0, 12, "redes", "switch", true);
        assertNull(result.content().get(0).precio());
        assertNull(result.content().get(1).precio());
        assertEquals(new BigDecimal("123.45"), result.content().get(2).precio());
        assertEquals("redes", result.content().get(2).categoria().slug());
        verify(imagenes, times(1)).findByProductoIdInOrderByPrincipalDescOrdenAscIdAsc(anyList());
        var pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(productos).findAll(any(Specification.class), pageable.capture());
        assertEquals(Sort.by("id").ascending(), pageable.getValue().getSort());
    }

    @Test void limitaPaginacionYLongitudDeBusqueda() {
        assertThrows(IllegalArgumentException.class, () -> service.listar(-1, 12, null, null, null));
        assertThrows(IllegalArgumentException.class, () -> service.listar(0, 49, null, null, null));
        assertThrows(IllegalArgumentException.class, () -> service.listar(0, 0, null, null, null));
        assertThrows(IllegalArgumentException.class, () -> service.listar(0, 12, null, "x".repeat(201), null));
        verifyNoInteractions(productos);
    }

    @Test void devuelve404CuandoNoExisteProductoPublico() {
        when(productos.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());
        var error = assertThrows(ResponseStatusException.class, () -> service.porId(100));
        assertEquals(404, error.getStatusCode().value());
        assertThrows(ResponseStatusException.class, () -> service.porSlug("inactivo"));
        verifyNoInteractions(imagenes);
    }

    @Test void paginaVaciaNoConsultaImagenes() {
        when(productos.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());
        assertTrue(service.listar(2, 12, null, null, null).content().isEmpty());
        verifyNoInteractions(imagenes);
    }
}
