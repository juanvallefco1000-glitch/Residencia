package com.segurixt.api.controller;

import com.segurixt.api.dto.*;
import com.segurixt.api.service.ProductoService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ProductoController {
    private final ProductoService service;
    public ProductoController(ProductoService service) { this.service = service; }

    @GetMapping("/categorias-producto")
    public List<CategoriaProductoResponse> categorias() { return service.categorias(); }

    @GetMapping("/productos")
    public PaginaResponse<ProductoResponse> listar(
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size,
        @RequestParam(required = false) String categoria, @RequestParam(required = false) String q,
        @RequestParam(required = false) Boolean destacado) {
        return service.listar(page, size, categoria, q, destacado);
    }

    @GetMapping("/productos/{id}")
    public ProductoResponse porId(@PathVariable long id) { return service.porId(id); }

    @GetMapping("/productos/slug/{slug}")
    public ProductoResponse porSlug(@PathVariable String slug) { return service.porSlug(slug); }
}
