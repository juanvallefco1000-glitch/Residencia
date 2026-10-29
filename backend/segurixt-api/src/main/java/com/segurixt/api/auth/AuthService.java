package com.segurixt.api.auth;
import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.spec.SecretKeySpec;

@Service
public class AuthService {
 public record User(Long id, String nombre, String email, Usuario.Rol rol) {}
 public record Session(String token, Instant expiresAt, User usuario) {}
 private record Active(Long userId, Instant expiry, long securityVersion, Usuario.Rol rol) {}
 private final UsuarioRepository users;
 private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);
 private final String dummy = passwords.encode(UUID.randomUUID().toString());
 private final byte[] key;
 private final String issuer;
 private final JwtDecoder decoder;
 private final Clock clock;
 private final Map<String,Active> sessions = new ConcurrentHashMap<>();
 @org.springframework.beans.factory.annotation.Autowired
 public AuthService(UsuarioRepository users, @Value("${auth.jwt.secret}") String secret,
                    @Value("${auth.jwt.issuer:segurixt-api}") String issuer) {
  this(users,secret,issuer,Clock.systemUTC());
 }
 AuthService(UsuarioRepository users,String secret,String issuer,Clock clock) {
  this.users=users; this.issuer=issuer; this.clock=clock;
  try { key=Base64.getDecoder().decode(secret); } catch (IllegalArgumentException e) { throw new IllegalStateException("AUTH_JWT_SECRET debe ser Base64", e); }
  if(key.length<32) throw new IllegalStateException("AUTH_JWT_SECRET requiere al menos 32 bytes aleatorios");
  var nimbus=NimbusJwtDecoder.withSecretKey(new SecretKeySpec(key,"HmacSHA256")).build();
  var timestamp=new JwtTimestampValidator(Duration.ZERO); timestamp.setClock(clock);
  nimbus.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(timestamp,new JwtIssuerValidator(issuer))); decoder=nimbus;
 }
 public synchronized Session login(String email,String password) {
  sessions.entrySet().removeIf(e -> !e.getValue().expiry().isAfter(clock.instant()));
  var u=users.findByEmailIgnoreCase(email.trim()).orElse(null);
  if(password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72) throw unauthorized();
  boolean valid=passwords.matches(password,u==null?dummy:u.passwordHash);
  if(!valid || u==null || !u.activo) throw unauthorized();
  Instant expiry=clock.instant().plusSeconds(900); String id=UUID.randomUUID().toString();
  try {
   var claims=new JWTClaimsSet.Builder().subject(u.id.toString()).issuer(issuer).jwtID(id)
      .issueTime(Date.from(clock.instant())).expirationTime(Date.from(expiry)).build();
   var jwt=new SignedJWT(new JWSHeader(JWSAlgorithm.HS256),claims); jwt.sign(new MACSigner(key));
   sessions.entrySet().removeIf(e -> e.getValue().userId().equals(u.id));
   sessions.put(id,new Active(u.id,expiry,u.versionSeguridad,u.rol)); return new Session(jwt.serialize(),expiry,view(u));
  } catch(JOSEException e) { throw new IllegalStateException("No se pudo firmar la sesión",e); }
 }
 public User authenticate(String token) {
  try {
   var jwt=decoder.decode(token); var active=sessions.get(jwt.getId());
   if(active==null || !active.expiry().isAfter(clock.instant()) || !active.userId().toString().equals(jwt.getSubject())) throw unauthorized();
   var u=users.findById(active.userId()).filter(v->v.activo).orElseThrow(AuthService::unauthorized);
   if(u.versionSeguridad!=active.securityVersion() || u.rol!=active.rol()) throw unauthorized();
   return view(u);
  } catch(JwtException | IllegalArgumentException e) { throw unauthorized(); }
 }
 public void revokeOlderSessions(Long userId,long version) {
  sessions.entrySet().removeIf(e -> e.getValue().userId().equals(userId) && e.getValue().securityVersion()<version);
 }
 public void logout(String token) { var jwt=decoder.decode(token); sessions.remove(jwt.getId()); }
 public static User view(Usuario u) { return new User(u.id,u.nombre,u.email,u.rol); }
 public static ResponseStatusException unauthorized() { return new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Credenciales incorrectas o sesión no válida."); }
}
