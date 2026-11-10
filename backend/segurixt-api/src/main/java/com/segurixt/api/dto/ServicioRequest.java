package com.segurixt.api.dto;
import jakarta.validation.constraints.*;
public record ServicioRequest(
 @NotBlank @Size(max=150) String nombre,
 @NotBlank @Size(max=150) @Pattern(regexp="[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
 @Size(max=500) String descripcionCorta, @Size(max=10000) String descripcion,
 @Size(max=500) @Pattern(regexp="^(?:https?://[^\\s]+|/[^/\\s][^\\s]*)?$") String imagenUrl,
 @NotNull @Positive Long categoriaId, @NotNull Boolean destacado,
 @NotNull Boolean activo, @NotNull @Min(0) Integer orden
) {}
