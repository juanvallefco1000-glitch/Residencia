package com.segurixt.api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "categorias_servicio")
public class CategoriaServicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    private String slug;
    private String descripcion;
    private String icono;
    private Integer orden;
    private Boolean activo;

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getSlug() { return slug; }
    public String getDescripcion() { return descripcion; }
    public String getIcono() { return icono; }
    public Integer getOrden() { return orden; }
    public Boolean getActivo() { return activo; }
}