package com.segurixt.api.service;

import com.segurixt.api.dto.*;
import com.segurixt.api.entity.*;
import com.segurixt.api.repository.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly=true)
public class AdminProductoService {
    private final ProductoRepository productos;
    private final CategoriaProductoRepository categorias;
    private final ImagenProductoRepository imagenes;

    public AdminProductoService(ProductoRepository productos, CategoriaProductoRepository categorias, ImagenProductoRepository imagenes) {
        this.productos=productos; this.categorias=categorias; this.imagenes=imagenes;
    }

    public List<AdminProductoResponse.Categoria> categorias() {
        return categorias.findAll(Sort.by("orden", "id")).stream().map(AdminProductoService::categoria).toList();
    }

    @Transactional
    public AdminProductoResponse.Categoria crearCategoria(CategoriaProductoRequest request) {
        if(categorias.existsBySlug(request.slug()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Ya existe una categoría con ese slug.");
        var category=new CategoriaProducto();
        category.setNombre(request.nombre().trim()); category.setSlug(request.slug());
        category.setDescripcion(trim(request.descripcion())); category.setOrden(0); category.setActivo(true);
        return categoria(categorias.saveAndFlush(category));
    }

    public PaginaResponse<AdminProductoResponse> listar(int page, int size, String q, Long categoriaId, Boolean activo) {
        if(page<0 || size<1 || size>48 || (q!=null && q.length()>200) || (categoriaId!=null && categoriaId<1))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filtros inválidos.");
        Specification<Producto> spec=(root, query, cb)-> {
            var filters=new ArrayList<jakarta.persistence.criteria.Predicate>();
            if(q!=null && !q.isBlank()) {
                String term="%"+q.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")+"%";
                filters.add(cb.like(cb.lower(root.get("nombre")),term,'\\'));
            }
            if(categoriaId!=null) filters.add(cb.equal(root.get("categoria").get("id"), categoriaId));
            if(activo!=null) filters.add(cb.equal(root.get("activo"),activo));
            return cb.and(filters.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        var result=productos.findAll(spec, PageRequest.of(page,size,Sort.by("id").descending()));
        return new PaginaResponse<>(presentar(result.getContent()),page,size,result.getTotalElements(),result.getTotalPages());
    }

    public AdminProductoResponse porId(long id) { return presentar(List.of(buscar(id))).getFirst(); }

    private Producto buscar(long id) {
        return productos.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Producto no encontrado."));
    }

    @Transactional
    public AdminProductoResponse crear(ProductoRequest request) { return guardar(new Producto(),request); }

    @Transactional
    public AdminProductoResponse actualizar(long id, ProductoRequest request, Usuario.Rol actorRole) {
        var product=bloquear(id);
        if(actorRole!=Usuario.Rol.ADMIN && !Objects.equals(product.getActivo(),request.activo()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Solo ADMIN puede dar de baja o reactivar productos.");
        return guardar(product,request);
    }

    @Transactional
    public void desactivar(long id) {
        var p=bloquear(id);
        p.setActivo(false);
        productos.saveAndFlush(p);
    }

    private Producto bloquear(long id) {
        return productos.findLockedById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Producto no encontrado."));
    }

    private AdminProductoResponse guardar(Producto p, ProductoRequest r) {
        if(p.getId()==null ? productos.existsBySlug(r.slug()) : productos.existsBySlugAndIdNot(r.slug(),p.getId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Ya existe un producto con ese slug.");
        var c=categorias.findById(r.categoriaId()).orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Categoría no encontrada."));
        if(!Boolean.TRUE.equals(c.getActivo()) && (p.getCategoria()==null || !p.getCategoria().getId().equals(c.getId())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Selecciona una categoría activa.");
        p.setCategoria(c); p.setNombre(r.nombre().trim()); p.setSlug(r.slug());
        p.setMarca(trim(r.marca())); p.setModelo(trim(r.modelo()));
        p.setDescripcionCorta(trim(r.descripcionCorta())); p.setDescripcion(trim(r.descripcion()));
        p.setPrecio(r.precio()); p.setMostrarPrecio(r.mostrarPrecio());
        p.setDestacado(r.destacado()); p.setActivo(r.activo());
        return presentar(List.of(productos.saveAndFlush(p))).getFirst();
    }

    private static String trim(String s) { return s==null ? null : s.trim(); }
    private static AdminProductoResponse.Categoria categoria(CategoriaProducto c) {
        return new AdminProductoResponse.Categoria(c.getId(),c.getNombre(),c.getSlug(),Boolean.TRUE.equals(c.getActivo()));
    }
    private List<AdminProductoResponse> presentar(List<Producto> items) {
        if(items.isEmpty()) return List.of();
        var fotos=imagenes.findByProductoIdInOrderByPrincipalDescOrdenAscIdAsc(items.stream().map(Producto::getId).toList())
            .stream().collect(Collectors.groupingBy(i->i.getProducto().getId()));
        return items.stream().map(p->new AdminProductoResponse(p.getId(),p.getNombre(),p.getSlug(),p.getMarca(),p.getModelo(),
            p.getDescripcionCorta(),p.getDescripcion(),p.getPrecio(),Boolean.TRUE.equals(p.getMostrarPrecio()),
            Boolean.TRUE.equals(p.getDestacado()),Boolean.TRUE.equals(p.getActivo()),categoria(p.getCategoria()),
            fotos.getOrDefault(p.getId(),List.of()).stream().map(i->new ImagenProductoResponse(i.getId(),i.getUrl(),i.getTextoAlt(),Boolean.TRUE.equals(i.getPrincipal()),i.getOrden())).toList())).toList();
    }
}
