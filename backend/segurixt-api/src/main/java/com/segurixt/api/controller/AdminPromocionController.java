package com.segurixt.api.controller;
import com.segurixt.api.service.PromocionService;
import com.segurixt.api.dto.PromocionRequest;
import com.segurixt.api.entity.Promocion;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;
@RestController @RequestMapping("/api/admin/promociones")
public class AdminPromocionController {
 private final PromocionService service;
 public AdminPromocionController(PromocionService service) { this.service=service; }
 @GetMapping public List<Promocion> listar() { return service.listar(); }
 @PostMapping public ResponseEntity<Promocion> crear(@Valid @RequestBody PromocionRequest r) {
  var p=service.guardar(null,r); return ResponseEntity.created(java.net.URI.create("/api/admin/promociones/"+p.getId())).body(p);
 }
 @PutMapping("/{id}") public Promocion editar(@PathVariable long id,@Valid @RequestBody PromocionRequest r) { return service.guardar(id,r); }
}
