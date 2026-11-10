package com.segurixt.api.controller;
import com.segurixt.api.dto.*;
import com.segurixt.api.service.*;
import com.segurixt.api.auth.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import java.util.List;
@RestController
@RequestMapping("/api/admin/servicios")
public class AdminServicioController {
 private final ServicioService service;
 private final CategoriaServicioService categorias;
 public AdminServicioController(ServicioService service, CategoriaServicioService categorias) { this.service=service; this.categorias=categorias; }
 @GetMapping public List<AdminServicioResponse> listar() { return service.listarAdmin(); }
 @GetMapping("/categorias") public List<com.segurixt.api.entity.CategoriaServicio> categorias() { return categorias.listarActivas(); }
 @PostMapping public ResponseEntity<AdminServicioResponse> crear(@Valid @RequestBody ServicioRequest r, @AuthenticationPrincipal AuthService.User actor) {
  var s=service.guardar(null,r,actor.rol());
  return ResponseEntity.created(java.net.URI.create("/api/admin/servicios/"+s.id())).body(s);
 }
 @PutMapping("/{id}") public AdminServicioResponse editar(@PathVariable long id, @Valid @RequestBody ServicioRequest r, @AuthenticationPrincipal AuthService.User actor) { return service.guardar(id,r,actor.rol()); }
}
