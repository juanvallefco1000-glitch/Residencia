package com.segurixt.api.tools;

import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import java.util.Arrays;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** Herramienta local, sin servidor HTTP ni parámetros de contraseña. */
public class CreateAdmin {
 @Configuration @Profile("bootstrap-admin") @EnableAutoConfiguration
 @EntityScan("com.segurixt.api.entity") @EnableJpaRepositories("com.segurixt.api.repository")
 public static class Config {}
 public static void main(String[] args) {
  var console=System.console();
  if(console==null) throw new IllegalStateException("Ejecuta en una terminal interactiva.");
  String nombre=console.readLine("Nombre: ").trim();
  String email=console.readLine("Correo: ").trim().toLowerCase(java.util.Locale.ROOT);
  char[] password=console.readPassword("Contraseña (mínimo 14 caracteres, máximo 72 bytes UTF-8): ");
  char[] confirm=console.readPassword("Confirmar contraseña: ");
  try {
   String value=new String(password);
   if(nombre.isBlank() || nombre.length()>100 || email.length()>150 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || password.length<14 || value.getBytes(StandardCharsets.UTF_8).length>72 || !Arrays.equals(password,confirm))
    throw new IllegalArgumentException("Datos inválidos o contraseñas distintas.");
   try(var context=new SpringApplicationBuilder(Config.class).profiles("bootstrap-admin").web(WebApplicationType.NONE).run()) {
    var users=context.getBean(UsuarioRepository.class);
    if(users.existsByRol(Usuario.Rol.ADMIN) || users.findByEmailIgnoreCase(email).isPresent()) throw new IllegalStateException("Ya existe un administrador o ese correo. No se modificó ningún usuario.");
    var user=new Usuario(); user.nombre=nombre; user.email=email; user.passwordHash=new BCryptPasswordEncoder(12).encode(value); user.rol=Usuario.Rol.ADMIN; user.activo=true;
    users.saveAndFlush(user); console.printf("Administrador creado. Cierra esta herramienta antes de iniciar el servidor.%n");
   }
  } finally { Arrays.fill(password,'\0'); Arrays.fill(confirm,'\0'); }
 }
}
