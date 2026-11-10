package com.segurixt.api.config;

import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.*;
import org.springframework.core.env.Environment;

/** Validación pura; no abre conexiones ni ejecuta DDL. Nunca incorpora valores a errores. */
public final class ProductionSettings {
    private ProductionSettings() {}
    public static void validate(Environment env) {
        String value=required(env,"spring.datasource.url");
        URI jdbc;
        try {
            if(!value.startsWith("jdbc:mysql://")) throw new IllegalArgumentException();
            jdbc=URI.create(value.substring(5));
        } catch(IllegalArgumentException e) { throw invalid("DB_JDBC_URL debe ser una URL JDBC MySQL válida."); }
        if(jdbc.getHost()==null || CorsOrigins.loopback(jdbc.getHost()) || jdbc.getUserInfo()!=null || jdbc.getFragment()!=null
                || !"/segurixt_db".equals(jdbc.getPath())) throw invalid("DB_JDBC_URL requiere host MySQL remoto y base segurixt_db, sin credenciales.");
        var query=new HashMap<String,String>();
        try {
            for(String field:Objects.toString(jdbc.getRawQuery(),"").split("&")) {
                if(field.isEmpty()) continue;
                String[] pair=field.split("=",2);
                String key=URLDecoder.decode(pair[0],StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
                String item=pair.length==2?URLDecoder.decode(pair[1],StandardCharsets.UTF_8):"";
                if(query.putIfAbsent(key,item)!=null) throw invalid("DB_JDBC_URL no admite parámetros duplicados.");
            }
        } catch(IllegalArgumentException e) { throw invalid("Parámetros de DB_JDBC_URL inválidos."); }
        if(!"VERIFY_IDENTITY".equals(query.get("sslmode"))) throw invalid("DB_JDBC_URL requiere sslMode=VERIFY_IDENTITY.");
        if(query.keySet().stream().anyMatch(k->List.of("user","password","usessl","requiressl","verifyservercertificate","trustcertificatekeystorepassword","clientcertificatekeystorepassword").contains(k))
                || "true".equalsIgnoreCase(query.get("allowpublickeyretrieval"))) throw invalid("DB_JDBC_URL no admite credenciales ni opciones TLS inseguras/ambiguas.");
        required(env,"spring.datasource.username"); required(env,"spring.datasource.password");
        CorsOrigins.parse(required(env,"auth.cors.origins"),true);
        String secret=required(env,"auth.jwt.secret");
        try { if(Base64.getDecoder().decode(secret).length<32) throw new IllegalArgumentException(); }
        catch(IllegalArgumentException e) { throw invalid("AUTH_JWT_SECRET requiere Base64 de al menos 32 bytes aleatorios."); }
        Path directory;
        try { directory=Path.of(required(env,"products.images.directory")).normalize(); }
        catch(RuntimeException e) { throw invalid("PRODUCTS_IMAGES_DIRECTORY debe ser una ruta absoluta persistente."); }
        if(!directory.isAbsolute() || directory.startsWith("/tmp") || directory.startsWith("/var/tmp") || directory.getParent()==null)
            throw invalid("PRODUCTS_IMAGES_DIRECTORY debe ser una ruta absoluta persistente, fuera de /tmp.");
        String trust=env.getProperty("DB_TRUSTSTORE_URL","");
        if(!trust.isBlank() && (!trust.startsWith("file:/") || env.getProperty("DB_TRUSTSTORE_PASSWORD","").isBlank()))
            throw invalid("El truststore personalizado requiere DB_TRUSTSTORE_URL file: y DB_TRUSTSTORE_PASSWORD.");
        if(Arrays.stream(env.getActiveProfiles()).anyMatch(p->p.equals("bootstrap-admin") || p.equals("reset-admin-password")))
            throw invalid("Los perfiles de herramientas locales no se admiten junto con prod.");
    }
    private static String required(Environment env,String key) {
        String value=env.getProperty(key);
        if(value==null || value.isBlank()) throw invalid("Falta una propiedad obligatoria de producción: "+key);
        return value;
    }
    private static IllegalArgumentException invalid(String message) { return new IllegalArgumentException(message); }
}
