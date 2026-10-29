package com.segurixt.api.users;

import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import com.segurixt.api.service.UsuarioService;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

/** Commits únicamente sobre una base aislada VACÍA; nunca usa cuentas existentes. */
abstract class UserConcurrencyScenario {
    @Autowired UsuarioRepository users;
    @Autowired UsuarioService service;
    @Test void dosCambiosConcurrentesNoPuedenEliminarElUltimoAdmin() throws Exception {
        assertEquals(0,users.count(),"Esta prueba solo admite una base aislada vacía");
        var a=fixture(); var b=fixture();
        var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var first=pool.submit(()->change(start,a.id));
            var second=pool.submit(()->change(start,b.id));
            start.countDown();
            var results=new ArrayList<>(List.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS)));
            Collections.sort(results);
            assertEquals(List.of(200,409),results);
        }
        assertEquals(1,users.findAll().stream().filter(u->u.activo && u.rol==Usuario.Rol.ADMIN).count());
    }
    int change(CountDownLatch start,Long id) throws Exception {
        start.await();
        try { service.rol(id,id,Usuario.Rol.LECTOR); return 200; }
        catch(ResponseStatusException e) { return e.getStatusCode().value(); }
    }
    Usuario fixture() {
        var u=new Usuario();u.nombre="Concurrencia aislada";u.email="concurrency-"+UUID.randomUUID()+"@example.test";
        u.passwordHash=new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4).encode("aislada-concurrencia-2026");
        u.rol=Usuario.Rol.ADMIN;u.activo=true;return users.saveAndFlush(u);
    }
}
