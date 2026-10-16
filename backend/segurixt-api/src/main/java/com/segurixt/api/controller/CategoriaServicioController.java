package com.segurixt.api.controller;

import com.segurixt.api.entity.CategoriaServicio;
import com.segurixt.api.service.CategoriaServicioService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categorias-servicio")
public class CategoriaServicioController {

    private final CategoriaServicioService service;

    public CategoriaServicioController(
            CategoriaServicioService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoriaServicio> listar() {
        return service.listarActivas();
    }
}