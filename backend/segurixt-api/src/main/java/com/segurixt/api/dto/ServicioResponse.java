package com.segurixt.api.dto;

public record ServicioResponse(
    Long id,
    String nombre,
    String slug,
    String descripcionCorta,
    String descripcion,
    String imagenUrl,
    Long categoriaId,
    String categoria
) {}