package com.segurixt.api.repository;

import com.segurixt.api.entity.Producto;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;

public interface ProductoRepository extends JpaRepository<Producto, Long>, JpaSpecificationExecutor<Producto> {
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Producto p where p.id = :id")
    java.util.Optional<Producto> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

    // Solo se carga una relación to-one: es seguro paginar sin multiplicar filas.
    @Override
    @EntityGraph(attributePaths = "categoria")
    Page<Producto> findAll(Specification<Producto> spec, Pageable pageable);
}
