package com.segurixt.api.repository;

import com.segurixt.api.entity.ImagenProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ImagenProductoRepository extends JpaRepository<ImagenProducto, Long> {
    java.util.Optional<ImagenProducto> findByUrl(String url);
    List<ImagenProducto> findByProductoIdInOrderByPrincipalDescOrdenAscIdAsc(List<Long> productoIds);
}
