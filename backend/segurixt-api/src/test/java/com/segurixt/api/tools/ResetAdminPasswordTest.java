package com.segurixt.api.tools;

import com.segurixt.api.auth.AuthService;
import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = ResetAdminPassword.Config.class, webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {"spring.datasource.url=jdbc:h2:mem:reset-admin;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.jpa.hibernate.ddl-auto=create-drop"})
@ActiveProfiles("reset-admin-password")
class ResetAdminPasswordTest {
    @Autowired UsuarioRepository users;
    @Autowired PlatformTransactionManager transactions;
    static final String OLD = "anterior-solo-test";
    static final String NEW = "nueva-clave-solo-test";
    Usuario admin;

    @BeforeEach void setup() {
        users.deleteAll();
        admin = new Usuario();
        admin.nombre = "Administrador";
        admin.email = "admin@gmail.com";
        admin.rol = Usuario.Rol.ADMIN;
        admin.activo = true;
        admin.passwordHash = new BCryptPasswordEncoder(4).encode(OLD);
        admin = users.saveAndFlush(admin);
    }

    void reset(String email, String password, String confirmation) {
        ResetAdminPassword.reset(users, transactions, email, password.toCharArray(), confirmation.toCharArray());
    }

    @Test void nuevaClavePermiteLoginYAnteriorDevuelve401SinCambiarOtrosDatos() {
        var auth = new AuthService(users, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "segurixt-api");
        assertNotNull(auth.login(admin.email, OLD).token());
        reset(" ADMIN@gmail.com ", NEW, NEW);
        var saved = users.findById(admin.id).orElseThrow();
        assertEquals(admin.nombre, saved.nombre);
        assertEquals(admin.email, saved.email);
        assertEquals(admin.rol, saved.rol);
        assertTrue(saved.activo);
        assertEquals(1, users.count());
        assertTrue(saved.passwordHash.startsWith("$2a$12$"));
        assertEquals(admin.id, auth.login(admin.email, NEW).usuario().id());
        var error = assertThrows(ResponseStatusException.class, () -> auth.login(admin.email, OLD));
        assertEquals(401, error.getStatusCode().value());
    }

    @Test void actualizaSoloElIdDelCorreoSeleccionado() {
        var other = new Usuario();
        other.nombre = "Otro administrador";
        other.email = "otro@example.test";
        other.rol = Usuario.Rol.ADMIN;
        other.activo = true;
        other.passwordHash = new BCryptPasswordEncoder(4).encode(OLD);
        other = users.saveAndFlush(other);
        String originalHash = other.passwordHash;
        assertEquals(admin.id, ResetAdminPassword.reset(users, transactions,
                " ADMIN@gmail.com ", NEW.toCharArray(), NEW.toCharArray()));
        assertTrue(java.util.Objects.equals(originalHash, users.findById(other.id).orElseThrow().passwordHash),
                "El otro administrador debe conservar su contraseña");
        assertEquals(2, users.count());
    }

    @Test void rechazaInexistenteInactivoYEditorSinModificarDatos() {
        assertThrows(IllegalStateException.class, () -> reset("nadie@example.test", NEW, NEW));
        admin.activo = false;
        users.saveAndFlush(admin);
        assertThrows(IllegalStateException.class, () -> reset(admin.email, NEW, NEW));
        admin.activo = true;
        admin.rol = Usuario.Rol.EDITOR;
        users.saveAndFlush(admin);
        assertThrows(IllegalStateException.class, () -> reset(admin.email, NEW, NEW));
        assertTrue(java.util.Objects.equals(admin.passwordHash, users.findById(admin.id).orElseThrow().passwordHash),
                "La contraseña original debe conservarse");
        assertEquals(1, users.count());
    }

    @Test void validaLongitudConfirmacionYLimiteUtf8SinModificarClave() {
        for (String invalid : new String[]{"corta", "a".repeat(73), "é".repeat(37), "😀".repeat(13)}) {
            assertThrows(IllegalArgumentException.class, () -> reset(admin.email, invalid, invalid));
        }
        assertThrows(IllegalArgumentException.class, () -> reset(admin.email, NEW, OLD));
        assertThrows(IllegalArgumentException.class, () -> ResetAdminPassword.reset(users, transactions, admin.email, null, null));
        assertTrue(java.util.Objects.equals(admin.passwordHash, users.findById(admin.id).orElseThrow().passwordHash),
                "La contraseña original debe conservarse");
        for (String valid : new String[]{"a".repeat(14), "a".repeat(72), "é".repeat(36)}) {
            reset(admin.email, valid, valid);
            assertTrue(new BCryptPasswordEncoder(12).matches(valid, users.findById(admin.id).orElseThrow().passwordHash));
        }
    }
}
