package com.segurixt.api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "servicios")
public class Servicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    private String slug;

    @Column(name = "descripcion_corta")
    private String descripcionCorta;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "imagen_url")
    private String imagenUrl;

    private Boolean destacado;
    private Boolean activo;
    private Integer orden;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private CategoriaServicio categoria;

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getSlug() { return slug; }
    public String getDescripcionCorta() { return descripcionCorta; }
    public String getDescripcion() { return descripcion; }
    public String getImagenUrl() { return imagenUrl; }
    public Boolean getDestacado() { return destacado; }
    public Boolean getActivo() { return activo; }
    public Integer getOrden() { return orden; }
    public CategoriaServicio getCategoria() { return categoria; }
}