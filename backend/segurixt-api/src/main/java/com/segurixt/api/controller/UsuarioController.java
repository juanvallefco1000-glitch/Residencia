package com.segurixt.api.controller;

import com.segurixt.api.auth.AuthService;
import com.segurixt.api.dto.*;
import com.segurixt.api.entity.Usuario;
import com.segurixt.api.service.UsuarioService;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/usuarios")
public class UsuarioController {
    private final UsuarioService service;
    public UsuarioController(UsuarioService service) { this.service=service; }
    @GetMapping public PaginaResponse<UsuarioResponse> listar(@RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="12") int size,@RequestParam(required=false) String q,
            @RequestParam(required=false) Usuario.Rol rol,@RequestParam(required=false) Boolean activo) { return service.listar(page,size,q,rol,activo); }
    @GetMapping("/{id}") public UsuarioResponse detalle(@PathVariable long id) { return service.porId(id); }
    @PostMapping public ResponseEntity<UsuarioResponse> crear(@AuthenticationPrincipal AuthService.User actor,@Valid @RequestBody UsuarioRequests.Crear r) {
        var u=service.crear(actor.id(),r); return ResponseEntity.created(URI.create("/api/admin/usuarios/"+u.id())).body(u);
    }
    @PutMapping("/{id}") public UsuarioResponse editar(@AuthenticationPrincipal AuthService.User actor,@PathVariable long id,@Valid @RequestBody UsuarioRequests.Perfil r) { return service.editar(actor.id(),id,r); }
    @PatchMapping("/{id}/rol") public UsuarioResponse rol(@AuthenticationPrincipal AuthService.User actor,@PathVariable long id,@Valid @RequestBody UsuarioRequests.Rol r) { return service.rol(actor.id(),id,r.rol()); }
    @PatchMapping("/{id}/estado") public UsuarioResponse estado(@AuthenticationPrincipal AuthService.User actor,@PathVariable long id,@Valid @RequestBody UsuarioRequests.Estado r) { return service.estado(actor.id(),id,r.activo()); }
    @PostMapping("/{id}/password") public ResponseEntity<Void> password(@AuthenticationPrincipal AuthService.User actor,@PathVariable long id,@Valid @RequestBody UsuarioRequests.Password r) {
        service.password(actor.id(),id,r); return ResponseEntity.noContent().build();
    }
}
