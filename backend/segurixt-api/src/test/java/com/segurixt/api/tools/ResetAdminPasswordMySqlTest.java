package com.segurixt.api.tools;

import com.segurixt.api.auth.AuthService;
import com.segurixt.api.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import java.util.Arrays;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

/** MySQL real, opt-in: utiliza un ADMIN de pruebas existente y revierte la transacción. */
@EnabledIfEnvironmentVariable(named = "MYSQL_RESET_TEST_URL", matches = "jdbc:mysql:.*")
@SpringBootTest(classes = ResetAdminPassword.Config.class, webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {"spring.datasource.url=${MYSQL_RESET_TEST_URL}",
        "spring.datasource.username=${MYSQL_RESET_TEST_USERNAME}",
        "spring.datasource.password=${MYSQL_RESET_TEST_PASSWORD}",
        "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
        "spring.jpa.hibernate.ddl-auto=none", "spring.jpa.show-sql=false",
        "logging.level.org.hibernate=OFF", "logging.level.org.hibernate.SQL=OFF",
        "logging.level.org.hibernate.orm.jdbc.bind=OFF", "logging.level.org.hibernate.orm.jdbc.extract=OFF"})
@ActiveProfiles("reset-admin-password")
@Transactional
class ResetAdminPasswordMySqlTest {
    @Autowired UsuarioRepository users;
    @Autowired PlatformTransactionManager transactions;
    @Autowired EntityManager entityManager;
    @Autowired JdbcTemplate jdbc;
    @Value("${MYSQL_RESET_TEST_EMAIL}") String email;

    @Test void releeHashDesdeMySqlSinCacheYPermiteLogin() {
        assertEquals("MySQL", jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<String>)
                connection -> connection.getMetaData().getDatabaseProductName()));
        var before = users.findByEmailIgnoreCase(email).orElseThrow();
        Long id = before.id;
        String nombre = before.nombre;
        String originalEmail = before.email;
        var rol = before.rol;
        boolean activo = before.activo;
        long count = users.count();
        char[] password = ("reset-test-" + UUID.randomUUID()).toCharArray();
        try {
            assertEquals(id, ResetAdminPassword.reset(users, transactions, email, password, password));
            entityManager.clear();
            // JDBC lee la columna física: no intervienen el contexto JPA ni su caché.
            String stored = jdbc.queryForObject("SELECT password_hash FROM usuarios WHERE id = ?", String.class, id);
            assertTrue(new BCryptPasswordEncoder(12).matches(new String(password), stored),
                    "La contraseña no coincide con el valor persistido en MySQL");
            var reread = users.findById(id).orElseThrow();
            assertEquals(nombre, reread.nombre);
            assertEquals(originalEmail, reread.email);
            assertEquals(rol, reread.rol);
            assertEquals(activo, reread.activo);
            assertEquals(count, users.count());
            var auth = new AuthService(users, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "segurixt-api");
            assertEquals(id, auth.login(email, new String(password)).usuario().id());
        } finally {
            Arrays.fill(password, '\0');
        }
        // Spring Test hace rollback: no crea ni elimina usuarios ni conserva la clave temporal.
    }
}
