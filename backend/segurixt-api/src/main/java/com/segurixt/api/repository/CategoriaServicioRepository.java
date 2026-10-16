package com.segurixt.api.repository;

import com.segurixt.api.entity.CategoriaServicio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CategoriaServicioRepository
        extends JpaRepository<CategoriaServicio, Long> {

    List<CategoriaServicio> findByActivoTrueOrderByOrdenAsc();
}