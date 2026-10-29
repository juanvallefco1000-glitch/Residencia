package com.segurixt.api.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ProductoRequest(
    @NotNull @Positive Long categoriaId,
    @NotBlank @Size(max=200) String nombre,
    @NotBlank @Size(max=200) @Pattern(regexp="[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
    @Size(max=100) String marca,
    @Size(max=100) String modelo,
    @Size(max=500) String descripcionCorta,
    @Size(max=10000) String descripcion,
    @DecimalMin("0.00") @Digits(integer=10, fraction=2) BigDecimal precio,
    @NotNull Boolean mostrarPrecio,
    @NotNull Boolean destacado,
    @NotNull Boolean activo
) {
    @AssertTrue(message="Indica un precio para mostrarlo")
    public boolean isPrecioVisibleValido() { return !Boolean.TRUE.equals(mostrarPrecio) || precio != null; }
}
