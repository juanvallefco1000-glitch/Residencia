package com.segurixt.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record ProductoResponse(
    Long id, String nombre, String slug, String marca, String modelo,
    String descripcionCorta, String descripcion, BigDecimal precio,
    boolean mostrarPrecio, boolean destacado, CategoriaProductoResponse categoria,
    List<ImagenProductoResponse> imagenes
) {}
