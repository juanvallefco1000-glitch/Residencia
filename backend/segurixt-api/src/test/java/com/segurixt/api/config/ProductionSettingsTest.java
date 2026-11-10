package com.segurixt.api.config;

import com.zaxxer.hikari.HikariDataSource;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;

class ProductionSettingsTest {
    MockEnvironment valid() {
        var env=new MockEnvironment(); env.setActiveProfiles("prod");
        return env.withProperty("spring.datasource.url","jdbc:mysql://mysql.example.com:3306/segurixt_db?sslMode=VERIFY_IDENTITY")
            .withProperty("spring.datasource.username","segurixt_app")
            .withProperty("spring.datasource.password","fixture-not-real")
            .withProperty("auth.cors.origins","https://segurixt.example.com, https://preview.example.com")
            .withProperty("auth.jwt.secret",Base64.getEncoder().encodeToString(new byte[32]))
            .withProperty("products.images.directory","/var/data/productos");
    }
    @Test void admiteConfiguracionSeguraSinConectarANingunaBase() {
        assertDoesNotThrow(()->ProductionSettings.validate(valid()));
    }
    @Test void rechazaTlsDebilCredencialesEnUrlYParametrosDuplicadosSinFiltrarValores() {
        for(String url:new String[]{
                "jdbc:mysql://mysql.example.com/segurixt_db",
                "jdbc:mysql://mysql.example.com/segurixt_db?sslMode=REQUIRED",
                "jdbc:mysql://localhost/segurixt_db?sslMode=VERIFY_IDENTITY",
                "jdbc:mysql://mysql.example.com/otra?sslMode=VERIFY_IDENTITY",
                "jdbc:mysql://mysql.example.com/segurixt_db?sslMode=VERIFY_IDENTITY&password=canary-do-not-print",
                "jdbc:mysql://mysql.example.com/segurixt_db?sslMode=VERIFY_IDENTITY&sslMode=DISABLED",
                "jdbc:mysql://mysql.example.com/segurixt_db?sslMode=VERIFY_IDENTITY&allowPublicKeyRetrieval=true"}) {
            var error=assertThrows(IllegalArgumentException.class,()->ProductionSettings.validate(valid().withProperty("spring.datasource.url",url)));
            assertFalse(error.getMessage().contains("canary-do-not-print"));
        }
    }
    @Test void rechazaSecretosAusentesOCortosYAlmacenamientoEfimero() {
        assertThrows(IllegalArgumentException.class,()->ProductionSettings.validate(valid().withProperty("spring.datasource.password","")));
        assertThrows(IllegalArgumentException.class,()->ProductionSettings.validate(valid().withProperty("auth.jwt.secret","corta")));
        for(String path:new String[]{"uploads/productos","/tmp/productos","/var/tmp/productos","/"})
            assertThrows(IllegalArgumentException.class,()->ProductionSettings.validate(valid().withProperty("products.images.directory",path)));
        var tools=valid();tools.setActiveProfiles("prod","reset-admin-password");
        assertThrows(IllegalArgumentException.class,()->ProductionSettings.validate(tools));
    }
    @Test void corsExigeOrigenesExactosHttpsEnProduccion() {
        for(String origin:new String[]{"*","https://*.vercel.app","https://app.example.com/","https://app.example.com/ruta","http://app.example.com","https://localhost","https://a.example.com,","https://u:p@app.example.com"})
            assertThrows(IllegalArgumentException.class,()->ProductionSettings.validate(valid().withProperty("auth.cors.origins",origin)));
        assertEquals(2,CorsOrigins.parse("http://localhost:5173, http://127.0.0.1:5173",false).size());
    }
    @Test void truststoreSePasaComoPropiedadNoComoParametroDeUrl() {
        var env=valid().withProperty("DB_TRUSTSTORE_URL","file:/etc/secrets/mysql-truststore.p12").withProperty("DB_TRUSTSTORE_PASSWORD","fixture-not-real");
        assertDoesNotThrow(()->ProductionSettings.validate(env));
        try(var source=new HikariDataSource()) {
            ProductionConfig.configureTls(source,env);
            assertEquals("VERIFY_IDENTITY",source.getDataSourceProperties().getProperty("sslMode"));
            assertEquals("PKCS12",source.getDataSourceProperties().getProperty("trustCertificateKeyStoreType"));
            assertEquals("false",source.getDataSourceProperties().getProperty("allowPublicKeyRetrieval"));
        }
    }
}
