package com.segurixt.api.controller;

import com.segurixt.api.config.SecurityConfig;
import com.segurixt.api.dto.*;
import com.segurixt.api.service.ProductoService;
import com.segurixt.api.service.ServicioService;
import com.segurixt.api.service.CategoriaServicioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({ProductoController.class, ServicioController.class, CategoriaServicioController.class, HealthController.class})
@Import({SecurityConfig.class, ProductoErrorHandler.class})
class ProductoControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean com.segurixt.api.auth.AuthService authService;
    @MockitoBean ProductoService service;
    @MockitoBean ServicioService servicios;
    @MockitoBean CategoriaServicioService categoriasServicio;

    @Test void conservaConsultasPublicasDeServicios() throws Exception {
        when(servicios.listarActivos()).thenReturn(List.of());
        when(categoriasServicio.listarActivas()).thenReturn(List.of());
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/api/servicios")).andExpect(status().isOk());
        mvc.perform(get("/api/categorias-servicio")).andExpect(status().isOk());
    }

    @Test void enlazaFiltrosYDevuelvePaginacion() throws Exception {
        when(service.listar(1, 6, "redes", "router", true)).thenReturn(new PaginaResponse<>(List.of(), 1, 6, 7, 2));
        mvc.perform(get("/api/productos").param("page", "1").param("size", "6").param("categoria", "redes")
                .param("q", "router").param("destacado", "true").header("Origin", "http://localhost:5173"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalPages").value(2))
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        verify(service).listar(1, 6, "redes", "router", true);
    }

    @Test void categoriasPublicasYErroresCorrectos() throws Exception {
        when(service.categorias()).thenReturn(List.of(new CategoriaProductoResponse(1L, "Redes", "redes", null, 1)));
        mvc.perform(get("/api/categorias-producto")).andExpect(status().isOk()).andExpect(jsonPath("$[0].slug").value("redes"));
        when(service.porId(99)).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
        when(service.porSlug("inactivo")).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
        mvc.perform(get("/api/productos/99")).andExpect(status().isNotFound());
        mvc.perform(get("/api/productos/slug/inactivo")).andExpect(status().isNotFound());
        mvc.perform(get("/api/productos").param("page", "abc")).andExpect(status().isBadRequest());
    }

    @Test void noRevelaErroresDeBaseDeDatos() throws Exception {
        when(service.categorias()).thenThrow(new DataAccessResourceFailureException("SQL y datos internos"));
        mvc.perform(get("/api/categorias-producto")).andExpect(status().isServiceUnavailable())
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("SQL"))));
    }

    @Test void bloqueaEscrituraAdministracionYOrigenAjeno() throws Exception {
        mvc.perform(post("/api/productos")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/productos/1")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/productos/1")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/productos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/productos").header("Origin", "https://example.org")).andExpect(status().isForbidden());
        mvc.perform(options("/api/productos").header("Origin", "http://127.0.0.1:5173")
            .header("Access-Control-Request-Method", "GET")).andExpect(status().isOk());
        verifyNoInteractions(service);
    }
}
