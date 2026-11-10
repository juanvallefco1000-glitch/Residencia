package com.segurixt.api.dto;
import jakarta.validation.constraints.*;
public record CategoriaProductoUpdateRequest(
 @NotBlank @Size(max=120) String nombre,
 @NotBlank @Size(max=120) @Pattern(regexp="[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
 @Size(max=500) String descripcion, @NotNull @Min(0) Integer orden, @NotNull Boolean activo
) {}
