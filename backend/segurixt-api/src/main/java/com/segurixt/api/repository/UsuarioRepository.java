package com.segurixt.api.repository;
import com.segurixt.api.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface UsuarioRepository extends JpaRepository<Usuario,Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Usuario> {
 Optional<Usuario> findByEmailIgnoreCase(String email);
 boolean existsByEmailIgnoreCase(String email);
 boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
 @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 @org.springframework.data.jpa.repository.Query("select u from Usuario u order by u.id")
 java.util.List<Usuario> lockForAdministration();
 boolean existsByRol(Usuario.Rol rol);
}
