package com.segurixt.api.auth;
import com.segurixt.api.config.SecurityConfig;
import com.segurixt.api.controller.AuthController;
import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import org.junit.jupiter.api.*;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@WebMvcTest(controllers={AuthController.class,AuthHttpTest.Probe.class},properties="auth.jwt.secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
@Import({SecurityConfig.class,AuthService.class,AuthErrorHandler.class,AuthHttpTest.Probe.class})
class AuthHttpTest {
 @RestController static class Probe {
  @GetMapping("/api/admin/productos") String read(){return "ok";}
  @PostMapping("/api/admin/productos") String write(){return "ok";}
  @RequestMapping(value={"/api/admin/servicios","/api/admin/promociones","/api/admin/cotizaciones"},method={RequestMethod.GET,RequestMethod.POST,RequestMethod.PUT,RequestMethod.PATCH,RequestMethod.DELETE}) String module(){return "ok";}
  @PutMapping("/api/admin/productos/{id}") String edit(){return "ok";}
  @DeleteMapping("/api/admin/productos/{id}") String deleteProduct(){return "ok";}
  @GetMapping("/api/admin/empresa") String company(){return "ok";}
  @GetMapping("/api/admin/usuarios") String users(){return "ok";}
 }
 @Autowired MockMvc mvc; @Autowired AuthService auth; @MockitoBean UsuarioRepository users;
 Usuario u;
 @BeforeEach void setup(){
  u=new Usuario();u.id=1L;u.nombre="Temporal";u.email="admin@example.test";u.rol=Usuario.Rol.ADMIN;u.activo=true;
  u.passwordHash=new BCryptPasswordEncoder(4).encode("temporal-solo-test");
  when(users.findByEmailIgnoreCase(u.email)).thenReturn(Optional.of(u));when(users.findById(1L)).thenReturn(Optional.of(u));
 }
 String token(){return auth.login(u.email,"temporal-solo-test").token();}
 @Test void loginMeNoExponeHashYCierraSesion() throws Exception {
  mvc.perform(post("/api/auth/login").contentType("application/json").content("{\"email\":\"admin@example.test\",\"password\":\"temporal-solo-test\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.token").isString()).andExpect(jsonPath("$.usuario.passwordHash").doesNotExist()).andExpect(header().string("Cache-Control","no-store"));
  String t=token();
  mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+t)).andExpect(status().isOk()).andExpect(jsonPath("$.email").value(u.email)).andExpect(jsonPath("$.passwordHash").doesNotExist());
  mvc.perform(post("/api/auth/logout").header("Authorization","Bearer "+t)).andExpect(status().isNoContent());
  mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+t)).andExpect(status().isUnauthorized());
 }
 @Test void sinSesionInvalidoYRoles() throws Exception {
  mvc.perform(get("/api/admin/productos")).andExpect(status().isUnauthorized());
  mvc.perform(get("/api/auth/me").header("Authorization","Bearer falso")).andExpect(status().isUnauthorized());
  String t=token();
  mvc.perform(post("/api/admin/productos").header("Authorization","Bearer "+t)).andExpect(status().isOk());
  u.rol=Usuario.Rol.EDITOR; t=token();
  mvc.perform(get("/api/admin/productos").header("Authorization","Bearer "+t)).andExpect(status().isOk());
  mvc.perform(post("/api/admin/productos").header("Authorization","Bearer "+t)).andExpect(status().isOk());
  mvc.perform(get("/api/admin/usuarios").header("Authorization","Bearer "+t)).andExpect(status().isForbidden());
 }
 @Test void matrizDePermisosAplicaEnElBackend() throws Exception {
  for(Usuario.Rol role:Usuario.Rol.values()) {
   u.rol=role; String t=token(); boolean admin=role==Usuario.Rol.ADMIN; boolean writer=role!=Usuario.Rol.LECTOR;
   mvc.perform(get("/api/admin/productos").header("Authorization","Bearer "+t)).andExpect(status().isOk());
   mvc.perform(put("/api/admin/productos/1").header("Authorization","Bearer "+t)).andExpect(status().is(writer?200:403));
   mvc.perform(delete("/api/admin/productos/1").header("Authorization","Bearer "+t)).andExpect(status().is(admin?200:403));
   for(String module:List.of("servicios","promociones","cotizaciones")) {
    mvc.perform(get("/api/admin/"+module).header("Authorization","Bearer "+t)).andExpect(status().isOk());
    mvc.perform(post("/api/admin/"+module).header("Authorization","Bearer "+t)).andExpect(status().is(writer?200:403));
   }
   mvc.perform(delete("/api/admin/servicios").header("Authorization","Bearer "+t)).andExpect(status().is(admin?200:403));
   mvc.perform(get("/api/admin/usuarios").header("Authorization","Bearer "+t)).andExpect(status().is(admin?200:403));
   mvc.perform(get("/api/admin/empresa").header("Authorization","Bearer "+t)).andExpect(status().is(admin?200:403));
  }
 }
 @Test void falloTemporalDeBaseDeDatosNoRevocaElJwt() throws Exception {
  String t=token();
  when(users.findById(1L)).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("Fallo simulado"));
  mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+t)).andExpect(status().isServiceUnavailable());
  mvc.perform(get("/api/admin/productos").header("Authorization","Bearer "+t)).andExpect(status().isServiceUnavailable());
  doReturn(Optional.of(u)).when(users).findById(1L);
  mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+t)).andExpect(status().isOk());
  mvc.perform(get("/api/admin/productos").header("Authorization","Bearer "+t)).andExpect(status().isOk());
 }
 @Test void credencialesInvalidasYDesactivadoDevuelvenMismoError() throws Exception {
  for(String email:List.of(u.email,"nadie@example.test")) mvc.perform(post("/api/auth/login").contentType("application/json").content("{\"email\":\""+email+"\",\"password\":\"incorrecta\"}"))
   .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.mensaje").value("Credenciales incorrectas o sesión no válida."));
  u.activo=false;
  mvc.perform(post("/api/auth/login").contentType("application/json").content("{\"email\":\"admin@example.test\",\"password\":\"temporal-solo-test\"}")).andExpect(status().isUnauthorized());
 }
 @Test void limitaIntentosPorDireccion() throws Exception {
  for(int i=0;i<20;i++) mvc.perform(post("/api/auth/login").servletPath("/api/auth/login")
    .with(req -> { req.setRemoteAddr("192.0.2.10"); return req; }).contentType("application/json").content("{}"))
    .andExpect(status().isBadRequest());
  mvc.perform(post("/api/auth/login").servletPath("/api/auth/login")
    .with(req -> { req.setRemoteAddr("192.0.2.10"); return req; }).contentType("application/json").content("{}"))
    .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After","60"));
 }
 @Test void corsLoginYValidacion() throws Exception {
  mvc.perform(options("/api/auth/login").header("Origin","http://localhost:5173").header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","content-type,authorization")).andExpect(status().isOk());
  mvc.perform(post("/api/auth/login").contentType("application/json").content("{}")).andExpect(status().isBadRequest());
 }
}
