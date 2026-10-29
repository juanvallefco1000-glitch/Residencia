package com.segurixt.api.controller;

import com.segurixt.api.dto.*;
import com.segurixt.api.service.AdminProductoService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/productos")
public class AdminProductoController {
    private final AdminProductoService service;
    public AdminProductoController(AdminProductoService service) { this.service=service; }
    @GetMapping public PaginaResponse<AdminProductoResponse> listar(
        @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="12") int size,
        @RequestParam(required=false) String q, @RequestParam(required=false) Long categoriaId,
        @RequestParam(required=false) Boolean activo) { return service.listar(page,size,q,categoriaId,activo); }
    @GetMapping("/categorias") public List<AdminProductoResponse.Categoria> categorias() { return service.categorias(); }
    @PostMapping("/categorias") public ResponseEntity<AdminProductoResponse.Categoria> crearCategoria(@Valid @RequestBody CategoriaProductoRequest request) {
        return ResponseEntity.status(201).body(service.crearCategoria(request));
    }
    @GetMapping("/{id}") public AdminProductoResponse porId(@PathVariable long id) { return service.porId(id); }
    @PostMapping public ResponseEntity<AdminProductoResponse> crear(@Valid @RequestBody ProductoRequest request) {
        var p=service.crear(request);
        return ResponseEntity.created(URI.create("/api/admin/productos/"+p.id())).body(p);
    }
    @PutMapping("/{id}") public AdminProductoResponse actualizar(@org.springframework.security.core.annotation.AuthenticationPrincipal com.segurixt.api.auth.AuthService.User actor, @PathVariable long id, @Valid @RequestBody ProductoRequest request) {
        return service.actualizar(id,request,actor.rol());
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> eliminar(@PathVariable long id) {
        service.desactivar(id); return ResponseEntity.noContent().build();
    }
}
