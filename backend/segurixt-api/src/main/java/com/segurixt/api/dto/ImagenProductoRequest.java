package com.segurixt.api.dto;
import jakarta.validation.constraints.*;

/** Transporte JSON para reutilizar el cliente Bearer existente. Máximo 3 MiB de archivo. */
public record ImagenProductoRequest(
    @NotBlank @Size(max=150) String nombreArchivo,
    @NotBlank @Size(max=4194304) String contenidoBase64,
    @Size(max=255) String textoAlt,
    @NotNull Boolean principal
) {}
