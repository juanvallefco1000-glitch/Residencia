package com.segurixt.api.dto;
import com.segurixt.api.entity.Usuario;
public record UsuarioResponse(Long id,String nombre,String email,Usuario.Rol rol,boolean activo) {
    public static UsuarioResponse of(Usuario u) { return new UsuarioResponse(u.id,u.nombre,u.email,u.rol,u.activo); }
}
