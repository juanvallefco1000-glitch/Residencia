package com.segurixt.api.service;

import com.segurixt.api.dto.*;
import com.segurixt.api.entity.*;
import com.segurixt.api.repository.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ProductoService {
    private final ProductoRepository productos;
    private final CategoriaProductoRepository categorias;
    private final ImagenProductoRepository imagenes;

    public ProductoService(ProductoRepository productos, CategoriaProductoRepository categorias, ImagenProductoRepository imagenes) {
        this.productos = productos;
        this.categorias = categorias;
        this.imagenes = imagenes;
    }

    public List<CategoriaProductoResponse> categorias() {
        return categorias.findByActivoTrueOrderByOrdenAscIdAsc().stream().map(ProductoService::categoriaDto).toList();
    }

    public PaginaResponse<ProductoResponse> listar(int page, int size, String categoria, String q, Boolean destacado) {
        if (page < 0 || size < 1 || size > 48 || (q != null && q.length() > 200)
            || (categoria != null && categoria.length() > 120)) {
            throw new IllegalArgumentException("Filtros inválidos: page >= 0, size entre 1 y 48, q hasta 200 caracteres y categoria hasta 120.");
        }
        var result = productos.findAll(ProductoSpecifications.publicos(categoria, q, destacado),
            PageRequest.of(page, size, Sort.by("id").ascending()));
        return new PaginaResponse<>(presentar(result.getContent()), page, size, result.getTotalElements(), result.getTotalPages());
    }

    public ProductoResponse porId(long id) {
        return detalle((root, query, cb) -> cb.equal(root.get("id"), id));
    }

    public ProductoResponse porSlug(String slug) {
        return detalle((root, query, cb) -> cb.equal(root.get("slug"), slug));
    }

    private ProductoResponse detalle(Specification<Producto> filtro) {
        var result = productos.findAll(ProductoSpecifications.publicos(null, null, null).and(filtro), PageRequest.of(0, 1));
        if (result.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado.");
        return presentar(result.getContent()).getFirst();
    }

    private List<ProductoResponse> presentar(List<Producto> items) {
        if (items.isEmpty()) return List.of();
        // Una consulta de imágenes para toda la página, sin N+1 ni fetch de colección paginada.
        var porProducto = imagenes.findByProductoIdInOrderByPrincipalDescOrdenAscIdAsc(items.stream().map(Producto::getId).toList())
            .stream().collect(Collectors.groupingBy(i -> i.getProducto().getId()));
        return items.stream().map(p -> {
            boolean mostrarPrecio = Boolean.TRUE.equals(p.getMostrarPrecio()) && p.getPrecio() != null && p.getPrecio().signum() >= 0;
            var fotos = porProducto.getOrDefault(p.getId(), List.of()).stream()
                .map(i -> new ImagenProductoResponse(i.getId(), i.getUrl(), i.getTextoAlt(), Boolean.TRUE.equals(i.getPrincipal()), i.getOrden())).toList();
            return new ProductoResponse(p.getId(), p.getNombre(), p.getSlug(), p.getMarca(), p.getModelo(),
                p.getDescripcionCorta(), p.getDescripcion(), mostrarPrecio ? p.getPrecio() : null,
                mostrarPrecio, Boolean.TRUE.equals(p.getDestacado()), categoriaDto(p.getCategoria()), fotos);
        }).toList();
    }

    private static CategoriaProductoResponse categoriaDto(CategoriaProducto c) {
        return new CategoriaProductoResponse(c.getId(), c.getNombre(), c.getSlug(), c.getDescripcion(), c.getOrden());
    }
}
