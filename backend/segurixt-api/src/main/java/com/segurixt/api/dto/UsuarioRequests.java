package com.segurixt.api.dto;

import com.segurixt.api.entity.Usuario;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;

public final class UsuarioRequests {
    private UsuarioRequests() {}
    public record Crear(@NotBlank @Size(max=100) String nombre,
                        @NotBlank @Email @Size(max=150) String email,
                        @NotNull Usuario.Rol rol,
                        @NotBlank @Size(max=72) String password,
                        @NotBlank @Size(max=72) String confirmPassword) {
        @Override public String toString() { return "CrearUsuario[datos omitidos]"; }
    }
    public record Perfil(@NotBlank @Size(max=100) String nombre, @NotBlank @Email @Size(max=150) String email) {
        @JsonAnySetter public void campoDesconocido(String name,Object value) { throw new IllegalArgumentException("Campo no admitido."); }
    }
    public record Rol(@NotNull Usuario.Rol rol) {}
    public record Estado(@NotNull Boolean activo) {}
    public record Password(@NotBlank @Size(max=72) String currentPassword,
                           @NotBlank @Size(max=72) String password,
                           @NotBlank @Size(max=72) String confirmPassword) {
        @Override public String toString() { return "ResetPassword[datos omitidos]"; }
    }
}
