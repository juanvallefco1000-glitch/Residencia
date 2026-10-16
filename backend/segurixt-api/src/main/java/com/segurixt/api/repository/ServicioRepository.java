package com.segurixt.api.repository;

import com.segurixt.api.entity.Servicio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;

public interface ServicioRepository
        extends JpaRepository<Servicio, Long> {

    @EntityGraph(attributePaths = "categoria")
    List<Servicio> findByActivoTrueOrderByOrdenAsc();
}