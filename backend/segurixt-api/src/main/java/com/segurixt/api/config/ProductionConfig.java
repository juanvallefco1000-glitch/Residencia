package com.segurixt.api.config;

import com.zaxxer.hikari.HikariDataSource;
import java.nio.file.*;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;

@Configuration
@Profile("prod")
public class ProductionConfig {
    @Bean
    static BeanPostProcessor productionDataSource(Environment env) {
        ProductionSettings.validate(env);
        return new BeanPostProcessor() {
            @Override public Object postProcessBeforeInitialization(Object bean,String name) throws BeansException {
                if(bean instanceof HikariDataSource dataSource) configureTls(dataSource,env);
                return bean;
            }
        };
    }
    static void configureTls(HikariDataSource dataSource,Environment env) {
        dataSource.addDataSourceProperty("sslMode","VERIFY_IDENTITY");
        dataSource.addDataSourceProperty("allowPublicKeyRetrieval","false");
        JdbcTrustStoreConfig.apply(dataSource,env);
    }
    @Bean
    org.springframework.beans.factory.InitializingBean productionImageDirectory(Environment env) {
        return () -> {
            Path directory=Path.of(env.getRequiredProperty("products.images.directory"));
            try {
                Files.createDirectories(directory);
                Path probe=Files.createTempFile(directory,".segurixt-write-check-",".tmp");
                Files.delete(probe);
            } catch(Exception e) { throw new IllegalStateException("El volumen de PRODUCTOS no es escribible; comprobar el montaje y UID 10001."); }
        };
    }
}
