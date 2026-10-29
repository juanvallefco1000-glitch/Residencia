package com.segurixt.api.users;

import com.jayway.jsonpath.JsonPath;
import com.segurixt.api.auth.AuthService;
import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Solo bases de prueba aisladas: fixtures reversibles; no modifica cuentas existentes. */
@Transactional
abstract class UserModuleScenario {
    @Autowired MockMvc mvc;
    @Autowired UsuarioRepository users;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;
    @Autowired AuthService auth;
    Usuario admin, editor, lector;
    String adminToken, editorToken, lectorToken;
    static final String PASSWORD="clave-prueba-aislada-2026";
    static final String NEW="nueva-prueba-aislada-2026";
    @BeforeEach void fixture() {
        assertEquals(0,users.count(),"La suite requiere una base de prueba vacía, nunca cuentas reales");
        admin=account(Usuario.Rol.ADMIN); editor=account(Usuario.Rol.EDITOR); lector=account(Usuario.Rol.LECTOR);
        adminToken=auth.login(admin.email,PASSWORD).token(); editorToken=auth.login(editor.email,PASSWORD).token(); lectorToken=auth.login(lector.email,PASSWORD).token();
    }
    Usuario account(Usuario.Rol role) {
        var u=new Usuario(); u.nombre="Prueba aislada";u.email=UUID.randomUUID()+"@example.test";u.rol=role;u.activo=true;
        u.passwordHash=new BCryptPasswordEncoder(4).encode(PASSWORD); return users.saveAndFlush(u);
    }
    String createBody(String email,String rol) {
        return "{\"nombre\":\"Usuario nuevo\",\"email\":\""+email+"\",\"rol\":\""+rol+"\",\"password\":\""+NEW+"\",\"confirmPassword\":\""+NEW+"\"}";
    }
    @Test void crearPersisteHashBCryptYDtoNuncaLoExpone() throws Exception {
        String email=UUID.randomUUID()+"@example.test";
        var response=mvc.perform(post("/api/admin/usuarios").header("Authorization","Bearer "+adminToken).contentType("application/json").content(createBody(email,"LECTOR")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.password_hash").doesNotExist())
            .andExpect(jsonPath("$.versionSeguridad").doesNotExist()).andReturn().getResponse().getContentAsString();
        long id=((Number)JsonPath.read(response,"$.id")).longValue();
        em.clear();
        String stored=jdbc.queryForObject("SELECT password_hash FROM usuarios WHERE id=?",String.class,id);
        assertTrue(stored.startsWith("$2a$12$")); assertTrue(new BCryptPasswordEncoder(12).matches(NEW,stored));
        assertEquals(id,auth.login(email,NEW).usuario().id());
        mvc.perform(get("/api/admin/usuarios/"+id).header("Authorization","Bearer "+adminToken)).andExpect(status().isOk()).andExpect(jsonPath("$.passwordHash").doesNotExist());
        mvc.perform(get("/api/admin/usuarios").param("q",email).param("rol","LECTOR").param("activo","true").header("Authorization","Bearer "+adminToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].passwordHash").doesNotExist());
    }
    @Test void duplicadosComplejidadUtf8YCamposManipuladosSonRechazados() throws Exception {
        mvc.perform(post("/api/admin/usuarios").header("Authorization","Bearer "+adminToken).contentType("application/json").content(createBody(admin.email.toUpperCase(Locale.ROOT),"ADMIN"))).andExpect(status().isConflict());
        mvc.perform(post("/api/admin/usuarios").header("Authorization","Bearer "+adminToken).contentType("application/json").content(createBody("invalido","LECTOR"))).andExpect(status().isBadRequest());
        for(String bad:List.of("corta","a".repeat(15),"é".repeat(36)+"1","a".repeat(73))) {
            mvc.perform(post("/api/admin/usuarios").header("Authorization","Bearer "+adminToken).contentType("application/json").content(createBody(UUID.randomUUID()+"@example.test","LECTOR").replace(NEW,bad))).andExpect(status().isBadRequest());
        }
        mvc.perform(put("/api/admin/usuarios/"+editor.id).header("Authorization","Bearer "+adminToken).contentType("application/json")
            .content("{\"nombre\":\"Cambio\",\"email\":\"nuevo@example.test\",\"rol\":\"ADMIN\"}"))
            .andExpect(status().isBadRequest());
        assertEquals(Usuario.Rol.EDITOR,users.findById(editor.id).orElseThrow().rol);
    }
    @Test void perfilEditaSoloNombreCorreoYValidaUnicidad() throws Exception {
        mvc.perform(put("/api/admin/usuarios/"+editor.id).header("Authorization","Bearer "+adminToken).contentType("application/json")
            .content("{\"nombre\":\"Nombre actualizado\",\"email\":\""+admin.email+"\"}")).andExpect(status().isConflict());
        mvc.perform(put("/api/admin/usuarios/"+editor.id).header("Authorization","Bearer "+adminToken).contentType("application/json")
            .content("{\"nombre\":\"Nombre actualizado\",\"email\":\"nuevo@example.test\"}")).andExpect(status().isOk());
        em.clear();
        assertEquals("Nombre actualizado",jdbc.queryForObject("SELECT nombre FROM usuarios WHERE id=?",String.class,editor.id));
        assertEquals(Usuario.Rol.EDITOR,users.findById(editor.id).orElseThrow().rol);
    }
    @Test void editorYLectorNoPuedenConsultarNiEscalarPrivilegios() throws Exception {
        for(String token:List.of("",editorToken,lectorToken)) {
            int code=token.isEmpty()?401:403;
            String header=token.isEmpty()?"":"Bearer "+token;
            mvc.perform(get("/api/admin/usuarios").header("Authorization",header)).andExpect(status().is(code));
            mvc.perform(post("/api/admin/usuarios").header("Authorization",header).contentType("application/json").content(createBody("elevado@example.test","ADMIN"))).andExpect(status().is(code));
            mvc.perform(patch("/api/admin/usuarios/"+editor.id+"/rol").header("Authorization",header).contentType("application/json").content("{\"rol\":\"ADMIN\"}")).andExpect(status().is(code));
            mvc.perform(patch("/api/admin/usuarios/"+lector.id+"/estado").header("Authorization",header).contentType("application/json").content("{\"activo\":false}")).andExpect(status().is(code));
            mvc.perform(post("/api/admin/usuarios/"+admin.id+"/password").header("Authorization",header).contentType("application/json").content("{}")).andExpect(status().is(code));
        }
    }
    @Test void ultimoAdministradorNoPuedeDesactivarseNiCambiarRol() throws Exception {
        mvc.perform(patch("/api/admin/usuarios/"+admin.id+"/estado").header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"activo\":false}")).andExpect(status().isConflict());
        mvc.perform(patch("/api/admin/usuarios/"+admin.id+"/rol").header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"rol\":\"LECTOR\"}")).andExpect(status().isConflict());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+adminToken)).andExpect(status().isOk());
        assertTrue(users.findById(admin.id).orElseThrow().activo);
    }
    @Test void cambiarRolRevocaInclusoSiSeRestauraElRolAnterior() throws Exception {
        var otherNode=new AuthService(users,"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","segurixt-api");
        var otherToken=otherNode.login(editor.email,PASSWORD).token();
        mvc.perform(patch("/api/admin/usuarios/"+editor.id+"/rol").header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"rol\":\"LECTOR\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+editorToken)).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/admin/usuarios/"+editor.id+"/rol").header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"rol\":\"EDITOR\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+editorToken)).andExpect(status().isUnauthorized());
        assertEquals(2,jdbc.queryForObject("SELECT version_seguridad FROM usuarios WHERE id=?",Long.class,editor.id));
        assertThrows(Exception.class,()->otherNode.authenticate(otherToken),"Otra instancia también debe rechazar el token anterior");
        assertNotNull(auth.login(editor.email,PASSWORD).token());
    }
    @Test void desactivarYReactivarNoReviveSesionAnterior() throws Exception {
        mvc.perform(patch("/api/admin/usuarios/"+lector.id+"/estado").header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"activo\":false}")).andExpect(status().isOk());
        assertThrows(Exception.class,()->auth.login(lector.email,PASSWORD));
        mvc.perform(patch("/api/admin/usuarios/"+lector.id+"/estado").header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"activo\":true}")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+lectorToken)).andExpect(status().isUnauthorized());
        assertNotNull(auth.login(lector.email,PASSWORD).token());
    }
    String resetBody(String current) { return "{\"currentPassword\":\""+current+"\",\"password\":\""+NEW+"\",\"confirmPassword\":\""+NEW+"\"}"; }
    @Test void resetExigeReautenticacionYRevocaTokenYCambiaSoloLaClaveObjetivo() throws Exception {
        mvc.perform(post("/api/admin/usuarios/"+editor.id+"/password").header("Authorization","Bearer "+adminToken).contentType("application/json").content(resetBody("incorrecta"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+adminToken)).andExpect(status().isOk());
        mvc.perform(post("/api/admin/usuarios/"+admin.id+"/password").header("Authorization","Bearer "+adminToken).contentType("application/json").content(resetBody(PASSWORD))).andExpect(status().isConflict());
        mvc.perform(post("/api/admin/usuarios/"+editor.id+"/password").header("Authorization","Bearer "+adminToken).contentType("application/json").content(resetBody(PASSWORD))).andExpect(status().isNoContent());
        em.clear();
        assertTrue(new BCryptPasswordEncoder(12).matches(NEW,jdbc.queryForObject("SELECT password_hash FROM usuarios WHERE id=?",String.class,editor.id)));
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+editorToken)).andExpect(status().isUnauthorized());
        assertThrows(Exception.class,()->auth.login(editor.email,PASSWORD));
        assertNotNull(auth.login(editor.email,NEW).token());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+adminToken)).andExpect(status().isOk());
    }
}
