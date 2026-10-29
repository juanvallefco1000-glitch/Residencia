package com.segurixt.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record AdminProductoResponse(
    Long id, String nombre, String slug, String marca, String modelo,
    String descripcionCorta, String descripcion, BigDecimal precio,
    boolean mostrarPrecio, boolean destacado, boolean activo,
    Categoria categoria, List<ImagenProductoResponse> imagenes
) {
    public record Categoria(Long id, String nombre, String slug, boolean activo) {}
}
