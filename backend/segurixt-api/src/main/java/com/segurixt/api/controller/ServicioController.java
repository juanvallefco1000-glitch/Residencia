package com.segurixt.api.controller;

import com.segurixt.api.dto.ServicioResponse;
import com.segurixt.api.service.ServicioService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/servicios")
public class ServicioController {

    private final ServicioService service;

    public ServicioController(ServicioService service) {
        this.service = service;
    }

    @GetMapping
    public List<ServicioResponse> listar() {
        return service.listarActivos();
    }
}