package com.segurixt.api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "servicios")
public class Servicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable=false, unique=true, length=150)
    private String slug;

    @Column(name = "descripcion_corta", length=500)
    private String descripcionCorta;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "imagen_url", length=500)
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
    public void setNombre(String value) { this.nombre = value; }
    public void setSlug(String value) { this.slug = value; }
    public void setDescripcionCorta(String value) { this.descripcionCorta = value; }
    public void setDescripcion(String value) { this.descripcion = value; }
    public void setImagenUrl(String value) { this.imagenUrl = value; }
    public void setDestacado(Boolean value) { this.destacado = value; }
    public void setActivo(Boolean value) { this.activo = value; }
    public void setOrden(Integer value) { this.orden = value; }
    public void setCategoria(CategoriaServicio value) { this.categoria = value; }
}