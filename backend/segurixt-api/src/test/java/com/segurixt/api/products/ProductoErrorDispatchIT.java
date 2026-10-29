package com.segurixt.api.products;

import com.segurixt.api.auth.AuthService;
import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import java.net.URI;
import java.net.http.*;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;

/** HTTP real y redispatch ERROR de Tomcat; MockMvc no reproduce ese segundo despacho. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={
    "spring.datasource.url=jdbc:h2:mem:product-errors;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "auth.jwt.secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
class ProductoErrorDispatchIT {
    @Autowired AuthService auth;
    @Autowired UsuarioRepository users;
    @Autowired Environment environment;
    final HttpClient http=HttpClient.newHttpClient();
    String token;
    @BeforeEach void session() {
        var u=new Usuario(); u.nombre="Prueba de despacho"; u.email=UUID.randomUUID()+"@example.test";
        u.passwordHash=new BCryptPasswordEncoder(4).encode("solo-prueba-aislada"); u.rol=Usuario.Rol.ADMIN; u.activo=true;
        users.saveAndFlush(u);
        token=auth.login(u.email,"solo-prueba-aislada").token();
    }
    int get(String path, boolean authenticated) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+environment.getProperty("local.server.port")+path)).GET();
        if(authenticated) builder.header("Authorization","Bearer "+token);
        return http.send(builder.build(),HttpResponse.BodyHandlers.discarding()).statusCode();
    }
    @Test void rutaAdministrativaInexistenteConJwtValidoEs404YNo401() throws Exception {
        assertEquals(200,get("/api/auth/me",true));
        assertEquals(404,get("/api/admin/productos/ruta/inexistente",true));
        assertEquals(200,get("/api/auth/me",true));
    }
    @Test void requestDirectoSinSesionSigueBloqueado() throws Exception {
        assertEquals(401,get("/api/admin/productos",false));
        assertEquals(401,get("/api/admin/productos/categorias",false));
        assertEquals(401,get("/error",false));
    }
}
