package com.segurixt.api.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "productos")
@org.hibernate.annotations.DynamicUpdate
public class Producto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private CategoriaProducto categoria;
    @Column(nullable = false, length = 200)
    private String nombre;
    @Column(nullable = false, unique = true, length = 200)
    private String slug;
    @Column(length = 100)
    private String marca;
    @Column(length = 100)
    private String modelo;
    @Column(name = "descripcion_corta", length = 500)
    private String descripcionCorta;
    @Column(columnDefinition = "TEXT")
    private String descripcion;
    @Column(precision = 12, scale = 2)
    private BigDecimal precio;
    @Column(name = "mostrar_precio", nullable = false)
    private Boolean mostrarPrecio;
    @Column(nullable = false)
    private Boolean destacado;
    @Column(nullable = false)
    private Boolean activo;

    public Long getId() { return id; }
    public CategoriaProducto getCategoria() { return categoria; }
    public String getNombre() { return nombre; }
    public String getSlug() { return slug; }
    public String getMarca() { return marca; }
    public String getModelo() { return modelo; }
    public String getDescripcionCorta() { return descripcionCorta; }
    public String getDescripcion() { return descripcion; }
    public BigDecimal getPrecio() { return precio; }
    public Boolean getMostrarPrecio() { return mostrarPrecio; }
    public Boolean getDestacado() { return destacado; }
    public Boolean getActivo() { return activo; }
    public void setCategoria(CategoriaProducto value) { this.categoria = value; }
    public void setNombre(String value) { this.nombre = value; }
    public void setSlug(String value) { this.slug = value; }
    public void setMarca(String value) { this.marca = value; }
    public void setModelo(String value) { this.modelo = value; }
    public void setDescripcionCorta(String value) { this.descripcionCorta = value; }
    public void setDescripcion(String value) { this.descripcion = value; }
    public void setPrecio(BigDecimal value) { this.precio = value; }
    public void setMostrarPrecio(Boolean value) { this.mostrarPrecio = value; }
    public void setDestacado(Boolean value) { this.destacado = value; }
    public void setActivo(Boolean value) { this.activo = value; }
}
