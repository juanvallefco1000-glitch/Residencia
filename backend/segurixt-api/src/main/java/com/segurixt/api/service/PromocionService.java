package com.segurixt.api.service;
import com.segurixt.api.entity.Promocion;
import com.segurixt.api.dto.PromocionRequest;
import com.segurixt.api.repository.PromocionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.List;
@Service @Transactional(readOnly=true)
public class PromocionService {
 private final PromocionRepository repository;
 public PromocionService(PromocionRepository repository) { this.repository=repository; }
 public List<Promocion> listar() { return repository.findAll(org.springframework.data.domain.Sort.by("id").descending()); }
 public List<Promocion> vigentes() { return repository.vigentes(java.time.LocalDate.now(java.time.ZoneId.of("America/Mazatlan"))); }
 @Transactional public Promocion guardar(Long id, PromocionRequest r) {
  var p=id==null ? new Promocion() : repository.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Promoción no encontrada."));
  p.setTitulo(r.titulo().trim()); p.setDescripcion(r.descripcion()); p.setImagenUrl(r.imagenUrl());
  p.setFechaInicio(r.fechaInicio()); p.setFechaFin(r.fechaFin()); p.setActivo(r.activo());
  return repository.saveAndFlush(p);
 }
}
