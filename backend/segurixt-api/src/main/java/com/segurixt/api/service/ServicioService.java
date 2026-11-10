package com.segurixt.api.service;

import com.segurixt.api.dto.ServicioResponse;
import com.segurixt.api.repository.ServicioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ServicioService {

    private final ServicioRepository repository;
    private final com.segurixt.api.repository.CategoriaServicioRepository categorias;

    public ServicioService(ServicioRepository repository, com.segurixt.api.repository.CategoriaServicioRepository categorias) {
        this.categorias = categorias;
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ServicioResponse> listarActivos() {
        return repository.findServiciosActivosOrdenados()
            .stream()
            .map(servicio -> new ServicioResponse(
                servicio.getId(),
                servicio.getNombre(),
                servicio.getSlug(),
                servicio.getDescripcionCorta(),
                servicio.getDescripcion(),
                servicio.getImagenUrl(),
                servicio.getCategoria().getId(),
                servicio.getCategoria().getNombre()
            ))
            .toList();
    }

    @Transactional(readOnly=true)
    public List<com.segurixt.api.dto.AdminServicioResponse> listarAdmin() {
        return repository.findAll(org.springframework.data.domain.Sort.by("orden","id")).stream().map(this::adminDto).toList();
    }
    @Transactional
    public com.segurixt.api.dto.AdminServicioResponse guardar(Long id, com.segurixt.api.dto.ServicioRequest r, com.segurixt.api.entity.Usuario.Rol rol) {
        var s=id==null ? new com.segurixt.api.entity.Servicio() : repository.findById(id).orElseThrow(
            ()->new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Servicio no encontrado."));
        if(id!=null && rol!=com.segurixt.api.entity.Usuario.Rol.ADMIN && !java.util.Objects.equals(s.getActivo(),r.activo()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Solo ADMIN puede cambiar el estado de servicios.");
        if(id==null ? repository.existsBySlug(r.slug()) : repository.existsBySlugAndIdNot(r.slug(),id))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"El slug ya existe.");
        var c=categorias.findById(r.categoriaId()).orElseThrow(
            ()->new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Categoría de servicio inválida."));
        if(!Boolean.TRUE.equals(c.getActivo()) && (s.getCategoria()==null || !s.getCategoria().getId().equals(c.getId())))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Selecciona una categoría activa.");
        s.setNombre(r.nombre().trim()); s.setSlug(r.slug()); s.setDescripcionCorta(r.descripcionCorta());
        s.setDescripcion(r.descripcion()); s.setImagenUrl(r.imagenUrl()); s.setCategoria(c);
        s.setDestacado(r.destacado()); s.setActivo(r.activo()); s.setOrden(r.orden());
        return adminDto(repository.saveAndFlush(s));
    }
    private com.segurixt.api.dto.AdminServicioResponse adminDto(com.segurixt.api.entity.Servicio s) {
        return new com.segurixt.api.dto.AdminServicioResponse(s.getId(),s.getNombre(),s.getSlug(),s.getDescripcionCorta(),
            s.getDescripcion(),s.getImagenUrl(),s.getCategoria().getId(),s.getCategoria().getNombre(),
            Boolean.TRUE.equals(s.getDestacado()),Boolean.TRUE.equals(s.getActivo()),s.getOrden());
    }
}