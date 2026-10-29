package com.segurixt.api.tools;

import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.UsuarioRepository;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import javax.sql.DataSource;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Herramienta local sin servidor HTTP ni parámetros de contraseña. */
public class ResetAdminPassword {
    @Configuration
    @Profile("reset-admin-password")
    @EnableAutoConfiguration
    @EntityScan("com.segurixt.api.entity")
    @EnableJpaRepositories("com.segurixt.api.repository")
    public static class Config {}

    public static void main(String[] args) {
        var console = System.console();
        if (console == null) {
            System.err.println("Ejecuta en una terminal interactiva.");
            System.exit(1);
            return;
        }
        char[] password = null;
        char[] confirmation = null;
        int status = 0;
        try {
            if (args.length != 0) throw new IllegalArgumentException();
            String email = console.readLine("Correo del administrador: ");
            password = console.readPassword("Nueva contraseña (mínimo 14 caracteres, máximo 72 bytes UTF-8): ");
            confirmation = console.readPassword("Confirmar nueva contraseña: ");
            validate(email, password, confirmation);
            // Desactiva registros, SQL y cambios de esquema para esta ejecución local.
            try (var context = new SpringApplicationBuilder(Config.class)
                    .profiles("reset-admin-password").web(WebApplicationType.NONE)
                    .run("--logging.level.root=OFF", "--spring.main.banner-mode=off",
                         "--spring.jpa.show-sql=false", "--spring.jpa.hibernate.ddl-auto=none",
                         "--logging.level.org.hibernate=OFF", "--logging.level.org.springframework=OFF",
                         "--logging.level.org.hibernate.SQL=OFF",
                         "--logging.level.org.hibernate.orm.jdbc.bind=OFF",
                         "--logging.level.org.hibernate.orm.jdbc.extract=OFF")) {
                try (var connection = context.getBean(DataSource.class).getConnection();
                     var statement = connection.createStatement();
                     var result = statement.executeQuery("SELECT DATABASE(), @@hostname, @@port")) {
                    if (!result.next()) throw new IllegalStateException("Destino MySQL no disponible.");
                    console.printf("Destino MySQL: servidor=%s puerto=%s base=%s%n",
                            result.getString(2), result.getString(3), result.getString(1));
                }
                Long id = reset(context.getBean(UsuarioRepository.class),
                      context.getBean(PlatformTransactionManager.class), email, password, confirmation);
                console.printf("Persistencia y contraseña verificadas para usuario id=%d.%n", id);
            }
            console.printf("Contraseña del administrador restablecida.%n");
        } catch (IllegalArgumentException e) {
            console.printf("Correo o contraseña inválidos, entrada cancelada o contraseñas distintas.%n");
            status = 1;
        } catch (Exception e) {
            console.printf("No se pudo restablecer la contraseña. Verifica la conexión y que el usuario exista, esté activo y tenga rol ADMIN.%n");
            status = 1;
        } finally {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmation != null) Arrays.fill(confirmation, '\0');
        }
        if (status != 0) System.exit(status);
    }

    static Long reset(UsuarioRepository users, PlatformTransactionManager transactions,
                      String email, char[] password, char[] confirmation) {
        validate(email, password, confirmation);
        var encoder = new BCryptPasswordEncoder(12);
        var template = new TransactionTemplate(transactions);
        Long id = template.execute(transaction -> {
            var user = users.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT))
                    .filter(u -> u.activo && u.rol == Usuario.Rol.ADMIN)
                    .orElseThrow(() -> new IllegalStateException("Administrador no disponible."));
            user.passwordHash = encoder.encode(new String(password));
            user.versionSeguridad = Math.incrementExact(user.versionSeguridad);
            return users.saveAndFlush(user).id;
        });
        // En la CLI, la transacción anterior ya confirmó. Esta lectura usa otro contexto JPA.
        template.executeWithoutResult(transaction -> {
            var saved = users.findById(id)
                    .filter(u -> u.activo && u.rol == Usuario.Rol.ADMIN
                            && u.email.equalsIgnoreCase(email.trim()))
                    .orElseThrow(() -> new IllegalStateException("Usuario guardado no coincide."));
            if (!encoder.matches(new String(password), saved.passwordHash)) {
                throw new IllegalStateException("No se pudo verificar la contraseña persistida.");
            }
        });
        return id;
    }

    private static void validate(String email, char[] password, char[] confirmation) {
        if (email == null || email.isBlank() || email.trim().length() > 150
                || password == null || confirmation == null
                || Character.codePointCount(password, 0, password.length) < 14
                || !Arrays.equals(password, confirmation)) throw new IllegalArgumentException();
        byte[] utf8 = new String(password).getBytes(StandardCharsets.UTF_8);
        try {
            if (utf8.length > 72) throw new IllegalArgumentException();
        } finally {
            Arrays.fill(utf8, (byte) 0);
        }
    }
}
