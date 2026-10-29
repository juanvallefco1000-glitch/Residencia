package com.segurixt.api.auth;
import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import org.junit.jupiter.api.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {
 UsuarioRepository users; Usuario u; AuthService auth;
 MutableClock clock;
 static final String SECRET=Base64.getEncoder().encodeToString(new byte[32]);
 static class MutableClock extends Clock {
  Instant now=Instant.now();
  public ZoneId getZone(){return ZoneOffset.UTC;} public Clock withZone(ZoneId z){return this;}
  public Instant instant(){return now;}
 }
 @BeforeEach void setup() {
  users=mock(UsuarioRepository.class); clock=new MutableClock();
  u=new Usuario(); u.id=1L; u.nombre="Temporal"; u.email="admin@example.test"; u.rol=Usuario.Rol.ADMIN; u.activo=true;
  u.passwordHash=new BCryptPasswordEncoder(4).encode("temporal-solo-test");
  when(users.findByEmailIgnoreCase(u.email)).thenReturn(Optional.of(u)); when(users.findById(1L)).thenReturn(Optional.of(u));
  auth=new AuthService(users,SECRET,"segurixt-api",clock);
 }
 @Test void loginCorrectoYLogoutRevoca() {
  var s=auth.login(u.email,"temporal-solo-test"); assertEquals(u.email,auth.authenticate(s.token()).email());
  auth.logout(s.token()); assertThrows(Exception.class,()->auth.authenticate(s.token()));
 }
 @Test void incorrectoInexistenteDesactivado() {
  assertThrows(Exception.class,()->auth.login(u.email,"incorrecta"));
  assertThrows(Exception.class,()->auth.login("nadie@example.test","incorrecta"));
  u.activo=false; assertThrows(Exception.class,()->auth.login(u.email,"temporal-solo-test"));
 }
 @Test void invalidoFirmaAlteradaYExpirado() {
  assertThrows(Exception.class,()->auth.authenticate("invalido"));
  var s=auth.login(u.email,"temporal-solo-test");
  var parts=s.token().split("\\."); parts[2]=(parts[2].startsWith("A")?"B":"A")+parts[2].substring(1);
  assertThrows(Exception.class,()->auth.authenticate(String.join(".",parts)));
  clock.now=clock.now.plusSeconds(901); assertThrows(Exception.class,()->auth.authenticate(s.token()));
 }
 @Test void desactivarOCambiarRolAfectaSesionExistente() {
  var s=auth.login(u.email,"temporal-solo-test"); u.rol=Usuario.Rol.EDITOR;
  assertThrows(Exception.class,()->auth.authenticate(s.token()));
  var editor=auth.login(u.email,"temporal-solo-test"); assertEquals(Usuario.Rol.EDITOR,auth.authenticate(editor.token()).rol()); u.activo=false;
  assertThrows(Exception.class,()->auth.authenticate(s.token()));
 }
 @Test void emisorIncorrectoConFirmaValidaEsRechazado() throws Exception {
  var s=auth.login(u.email,"temporal-solo-test");
  var original=com.nimbusds.jwt.SignedJWT.parse(s.token());
  var claims=new com.nimbusds.jwt.JWTClaimsSet.Builder(original.getJWTClaimsSet()).issuer("otro-emisor").build();
  var jwt=new com.nimbusds.jwt.SignedJWT(new com.nimbusds.jose.JWSHeader(com.nimbusds.jose.JWSAlgorithm.HS256),claims);
  jwt.sign(new com.nimbusds.jose.crypto.MACSigner(Base64.getDecoder().decode(SECRET)));
  assertThrows(Exception.class,()->auth.authenticate(jwt.serialize()));
 }
 @Test void reinicioYOtroEmisorInvalidan() {
  var s=auth.login(u.email,"temporal-solo-test");
  assertThrows(Exception.class,()->new AuthService(users,SECRET,"segurixt-api",clock).authenticate(s.token()));
  assertThrows(Exception.class,()->new AuthService(users,SECRET,"otro",clock).authenticate(s.token()));
 }
}
