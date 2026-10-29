package com.segurixt.api.controller;

import com.segurixt.api.dto.*;
import com.segurixt.api.service.ProductoImagenService;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class ProductoImagenController {
    private final ProductoImagenService service;
    public ProductoImagenController(ProductoImagenService service) { this.service=service; }
    @PostMapping("/api/admin/productos/{id}/imagenes")
    public ResponseEntity<ImagenProductoResponse> agregar(@PathVariable long id,@Valid @RequestBody ImagenProductoRequest request) {
        var result=service.agregar(id,request);
        return ResponseEntity.created(URI.create(result.url())).body(result);
    }
    @DeleteMapping("/api/admin/productos/{id}/imagenes/{imagenId}")
    public ResponseEntity<Void> quitar(@PathVariable long id,@PathVariable long imagenId) {
        service.quitar(id,imagenId); return ResponseEntity.noContent().build();
    }
    @GetMapping("/api/productos/imagenes/{filename}")
    public ResponseEntity<byte[]> leer(@PathVariable String filename) {
        var file=service.leer(filename);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.tipo()))
            .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").body(file.bytes());
    }
}
