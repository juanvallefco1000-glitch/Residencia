package com.segurixt.api.controller;
import com.segurixt.api.service.PromocionService;
import com.segurixt.api.entity.Promocion;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/promociones")
public class PromocionController {
 private final PromocionService service;
 public PromocionController(PromocionService service) { this.service=service; }
 @GetMapping public List<Promocion> listar() { return service.vigentes(); }
}
