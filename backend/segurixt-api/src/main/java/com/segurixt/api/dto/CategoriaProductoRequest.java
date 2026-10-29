package com.segurixt.api.dto;

import jakarta.validation.constraints.*;

public record CategoriaProductoRequest(
    @NotBlank @Size(max=120) String nombre,
    @NotBlank @Size(max=120) @Pattern(regexp="[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
    @Size(max=500) String descripcion
) {}
