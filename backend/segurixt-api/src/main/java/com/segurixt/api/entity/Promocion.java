package com.segurixt.api.entity;
import jakarta.persistence.*;
@Entity @Table(name="promociones")
public class Promocion {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 public Long getId() { return id; }
 @Column(name="titulo", nullable=false, length=200) private String titulo;
 public String getTitulo() { return titulo; }
 public void setTitulo(String value) { this.titulo=value; }
 @Column(name="descripcion", columnDefinition="TEXT") private String descripcion;
 public String getDescripcion() { return descripcion; }
 public void setDescripcion(String value) { this.descripcion=value; }
 @Column(name="imagen_url", length=500) private String imagenUrl;
 public String getImagenUrl() { return imagenUrl; }
 public void setImagenUrl(String value) { this.imagenUrl=value; }
 @Column(name="fecha_inicio") private java.time.LocalDate fechaInicio;
 public java.time.LocalDate getFechaInicio() { return fechaInicio; }
 public void setFechaInicio(java.time.LocalDate value) { this.fechaInicio=value; }
 @Column(name="fecha_fin") private java.time.LocalDate fechaFin;
 public java.time.LocalDate getFechaFin() { return fechaFin; }
 public void setFechaFin(java.time.LocalDate value) { this.fechaFin=value; }
 @Column(name="activo", nullable=false) private Boolean activo;
 public Boolean getActivo() { return activo; }
 public void setActivo(Boolean value) { this.activo=value; }
}
