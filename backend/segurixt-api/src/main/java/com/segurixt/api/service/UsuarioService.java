package com.segurixt.api.service;

import com.segurixt.api.auth.*;
import com.segurixt.api.dto.*;
import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly=true)
public class UsuarioService {
    private final UsuarioRepository users;
    private final AuthService auth;
    private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder(12);
    public UsuarioService(UsuarioRepository users,AuthService auth) { this.users=users; this.auth=auth; }

    public PaginaResponse<UsuarioResponse> listar(int page,int size,String q,Usuario.Rol rol,Boolean activo) {
        if(page<0 || size<1 || size>48 || (q!=null && q.length()>150)) throw error(HttpStatus.BAD_REQUEST,"Filtros inválidos.");
        Specification<Usuario> spec=(root,query,cb)-> {
            var filters=new ArrayList<jakarta.persistence.criteria.Predicate>();
            if(q!=null && !q.isBlank()) {
                String term="%"+q.trim().toLowerCase(Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
                filters.add(cb.or(cb.like(cb.lower(root.get("nombre")),term,'\\'),cb.like(cb.lower(root.get("email")),term,'\\')));
            }
            if(rol!=null) filters.add(cb.equal(root.get("rol"),rol));
            if(activo!=null) filters.add(cb.equal(root.get("activo"),activo));
            return cb.and(filters.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        var result=users.findAll(spec,PageRequest.of(page,size,Sort.by("id")));
        return new PaginaResponse<>(result.map(UsuarioResponse::of).getContent(),page,size,result.getTotalElements(),result.getTotalPages());
    }
    public UsuarioResponse porId(long id) { return UsuarioResponse.of(users.findById(id).orElseThrow(()->error(HttpStatus.NOT_FOUND,"Usuario no encontrado."))); }

    @Transactional
    public UsuarioResponse crear(Long actorId,UsuarioRequests.Crear r) {
        var locked=lock(actorId);
        validatePassword(r.password(),r.confirmPassword());
        String email=normalizeEmail(r.email());
        if(users.existsByEmailIgnoreCase(email)) throw error(HttpStatus.CONFLICT,"El correo ya está registrado.");
        var u=new Usuario(); u.nombre=r.nombre().trim(); u.email=email; u.rol=r.rol(); u.activo=true;
        u.passwordHash=passwords.encode(r.password());
        return UsuarioResponse.of(users.saveAndFlush(u));
    }
    @Transactional
    public UsuarioResponse editar(Long actorId,long id,UsuarioRequests.Perfil r) {
        var u=target(lock(actorId),id);
        String email=normalizeEmail(r.email());
        if(users.existsByEmailIgnoreCaseAndIdNot(email,id)) throw error(HttpStatus.CONFLICT,"El correo ya está registrado.");
        u.nombre=r.nombre().trim(); u.email=email;
        return UsuarioResponse.of(users.saveAndFlush(u));
    }
    @Transactional
    public UsuarioResponse rol(Long actorId,long id,Usuario.Rol rol) {
        var locked=lock(actorId); var u=target(locked,id);
        if(u.rol!=rol) {
            protectLastAdmin(locked,u,rol,u.activo);
            u.rol=rol; changed(u);
        }
        return UsuarioResponse.of(users.saveAndFlush(u));
    }
    @Transactional
    public UsuarioResponse estado(Long actorId,long id,boolean activo) {
        var locked=lock(actorId); var u=target(locked,id);
        if(u.activo!=activo) {
            protectLastAdmin(locked,u,u.rol,activo);
            u.activo=activo; changed(u);
        }
        return UsuarioResponse.of(users.saveAndFlush(u));
    }
    @Transactional
    public void password(Long actorId,long id,UsuarioRequests.Password r) {
        var locked=lock(actorId); var actor=target(locked,actorId);
        if(actorId==id) throw error(HttpStatus.CONFLICT,"Este procedimiento solo permite restablecer la contraseña de otro usuario.");
        if(r.currentPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72 || !passwords.matches(r.currentPassword(),actor.passwordHash))
            throw error(HttpStatus.FORBIDDEN,"No se pudo confirmar la identidad del administrador.");
        validatePassword(r.password(),r.confirmPassword());
        var u=target(locked,id); u.passwordHash=passwords.encode(r.password()); changed(u); users.saveAndFlush(u);
    }
    private List<Usuario> lock(Long actorId) {
        // Orden único de bloqueo para todas las escrituras: impide dos bajas concurrentes del último ADMIN.
        var locked=users.lockForAdministration();
        var actor=target(locked,actorId);
        if(!actor.activo || actor.rol!=Usuario.Rol.ADMIN) throw error(HttpStatus.FORBIDDEN,"Se requiere un administrador activo.");
        return locked;
    }
    private Usuario target(List<Usuario> locked,long id) {
        return locked.stream().filter(u->u.id==id).findFirst().orElseThrow(()->error(HttpStatus.NOT_FOUND,"Usuario no encontrado."));
    }
    private void protectLastAdmin(List<Usuario> locked,Usuario u,Usuario.Rol rol,boolean activo) {
        if(u.activo && u.rol==Usuario.Rol.ADMIN && (!activo || rol!=Usuario.Rol.ADMIN)
                && locked.stream().filter(v->v.activo && v.rol==Usuario.Rol.ADMIN).count()<=1)
            throw error(HttpStatus.CONFLICT,"Debe conservarse al menos un administrador activo.");
    }
    private void changed(Usuario u) {
        u.versionSeguridad=Math.incrementExact(u.versionSeguridad);
        Long id=u.id; long version=u.versionSeguridad;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { auth.revokeOlderSessions(id,version); }
        });
    }
    private static String normalizeEmail(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    private static void validatePassword(String password,String confirm) {
        if(!PasswordPolicy.valid(password) || !Objects.equals(password,confirm))
            throw error(HttpStatus.BAD_REQUEST,"La contraseña requiere mínimo 14 caracteres, máximo 72 bytes UTF-8, letras y algún número, símbolo o espacio; la confirmación debe coincidir.");
    }
    private static ResponseStatusException error(HttpStatus status,String reason) { return new ResponseStatusException(status,reason); }
}
