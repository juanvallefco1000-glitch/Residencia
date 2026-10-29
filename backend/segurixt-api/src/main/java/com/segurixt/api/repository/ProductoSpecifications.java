package com.segurixt.api.repository;

import com.segurixt.api.entity.Producto;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import java.util.*;

public final class ProductoSpecifications {
    private ProductoSpecifications() {}

    public static Specification<Producto> publicos(String categoria, String q, Boolean destacado) {
        return (root, query, cb) -> {
            var filters = new ArrayList<Predicate>();
            filters.add(cb.isTrue(root.get("activo")));
            filters.add(cb.isTrue(root.get("categoria").get("activo")));
            if (categoria != null && !categoria.isBlank()) {
                filters.add(cb.equal(root.get("categoria").get("slug"), categoria.trim()));
            }
            if (destacado != null) filters.add(cb.equal(root.get("destacado"), destacado));
            if (q != null && !q.isBlank()) {
                // La búsqueda es literal: % y _ del visitante no actúan como comodines.
                String term = "%" + q.trim().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                filters.add(cb.or(List.of("nombre", "descripcionCorta", "descripcion", "marca", "modelo")
                    .stream().map(field -> cb.like(cb.lower(root.get(field)), term, '\\'))
                    .toArray(Predicate[]::new)));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        };
    }
}
