package com.segurixt.api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "categorias_producto")
public class CategoriaProducto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String nombre;
    @Column(nullable = false, unique = true, length = 120)
    private String slug;
    @Column(length = 500)
    private String descripcion;
    @Column(nullable = false)
    private Integer orden;
    @Column(nullable = false)
    private Boolean activo;

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getSlug() { return slug; }
    public String getDescripcion() { return descripcion; }
    public Integer getOrden() { return orden; }
    public Boolean getActivo() { return activo; }
    public void setNombre(String value) { this.nombre = value; }
    public void setSlug(String value) { this.slug = value; }
    public void setDescripcion(String value) { this.descripcion = value; }
    public void setOrden(Integer value) { this.orden = value; }
    public void setActivo(Boolean value) { this.activo = value; }
}
