package com.segurixt.api.dto;
public record AdminServicioResponse(Long id, String nombre, String slug, String descripcionCorta,
 String descripcion, String imagenUrl, Long categoriaId, String categoria, boolean destacado, boolean activo, Integer orden) {}
