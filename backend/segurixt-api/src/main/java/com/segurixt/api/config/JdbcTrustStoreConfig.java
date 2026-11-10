package com.segurixt.api.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;

/** CA opcional también disponible en las herramientas CLI sin secretos en argumentos JDBC. */
@Configuration
public class JdbcTrustStoreConfig {
    @Bean
    static BeanPostProcessor jdbcTrustStore(Environment env) {
        return new BeanPostProcessor() {
            @Override public Object postProcessBeforeInitialization(Object bean,String name) {
                if(bean instanceof HikariDataSource dataSource) apply(dataSource,env);
                return bean;
            }
        };
    }
    static void apply(HikariDataSource dataSource,Environment env) {
        String trust=env.getProperty("DB_TRUSTSTORE_URL","");
        if(trust.isBlank()) return;
        String password=env.getProperty("DB_TRUSTSTORE_PASSWORD","");
        if(!trust.startsWith("file:/") || password.isBlank())
            throw new IllegalArgumentException("El truststore requiere URL file: y DB_TRUSTSTORE_PASSWORD.");
        dataSource.addDataSourceProperty("trustCertificateKeyStoreUrl",trust);
        dataSource.addDataSourceProperty("trustCertificateKeyStoreType","PKCS12");
        dataSource.addDataSourceProperty("trustCertificateKeyStorePassword",password);
    }
}
