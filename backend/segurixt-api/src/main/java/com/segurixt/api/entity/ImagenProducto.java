package com.segurixt.api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "imagenes_producto")
public class ImagenProducto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;
    @Column(nullable = false, length = 500)
    private String url;
    @Column(name = "texto_alt", length = 255)
    private String textoAlt;
    @Column(nullable = false)
    private Boolean principal;
    @Column(nullable = false)
    private Integer orden;

    public Long getId() { return id; }
    public Producto getProducto() { return producto; }
    public String getUrl() { return url; }
    public String getTextoAlt() { return textoAlt; }
    public Boolean getPrincipal() { return principal; }
    public Integer getOrden() { return orden; }
    public void setProducto(Producto value) { this.producto = value; }
    public void setUrl(String value) { this.url = value; }
    public void setTextoAlt(String value) { this.textoAlt = value; }
    public void setPrincipal(Boolean value) { this.principal = value; }
    public void setOrden(Integer value) { this.orden = value; }
}
