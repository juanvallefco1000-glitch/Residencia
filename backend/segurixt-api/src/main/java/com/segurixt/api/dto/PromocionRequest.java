package com.segurixt.api.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record PromocionRequest(
 @NotBlank @Size(max=200) String titulo, @Size(max=10000) String descripcion,
 @Size(max=500) @Pattern(regexp="^(?:https?://[^\\s]+|/[^/\\s][^\\s]*)?$") String imagenUrl,
 LocalDate fechaInicio, LocalDate fechaFin, @NotNull Boolean activo
) {
 @AssertTrue(message="La fecha final debe ser igual o posterior al inicio.")
 public boolean isVigenciaValida() { return fechaInicio==null || fechaFin==null || !fechaFin.isBefore(fechaInicio); }
}
