package com.segurixt.api.repository;
import com.segurixt.api.entity.Promocion;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
public interface PromocionRepository extends JpaRepository<Promocion,Long> {
 @Query("select p from Promocion p where p.activo=true and (p.fechaInicio is null or p.fechaInicio<=:hoy) and (p.fechaFin is null or p.fechaFin>=:hoy) order by p.id desc")
 List<Promocion> vigentes(@Param("hoy") LocalDate hoy);
}
