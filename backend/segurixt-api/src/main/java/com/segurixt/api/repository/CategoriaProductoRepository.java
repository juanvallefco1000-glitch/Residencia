package com.segurixt.api.repository;

import com.segurixt.api.entity.CategoriaProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CategoriaProductoRepository extends JpaRepository<CategoriaProducto, Long> {
    boolean existsBySlug(String slug);
    List<CategoriaProducto> findByActivoTrueOrderByOrdenAscIdAsc();
}
