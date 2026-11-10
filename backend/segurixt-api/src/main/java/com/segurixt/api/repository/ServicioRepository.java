package com.segurixt.api.repository;

import com.segurixt.api.entity.Servicio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ServicioRepository
        extends JpaRepository<Servicio, Long> {

    @EntityGraph(attributePaths = "categoria")
    List<Servicio> findByActivoTrueOrderByOrdenAsc();

    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);

    @EntityGraph(attributePaths = "categoria")
    @Query("""
        SELECT s
        FROM Servicio s
        JOIN s.categoria c
        WHERE s.activo = true
          AND c.activo = true
        ORDER BY c.orden ASC, s.orden ASC, s.id ASC
        """)
    List<Servicio> findServiciosActivosOrdenados();
}
