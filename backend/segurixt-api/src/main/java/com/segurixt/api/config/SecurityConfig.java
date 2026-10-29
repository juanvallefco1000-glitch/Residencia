package com.segurixt.api.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, com.segurixt.api.auth.AuthService authService, UrlBasedCorsConfigurationSource corsSource)
            throws Exception {

        http
            .csrf(csrf -> csrf.disable()) // Solo Authorization Bearer; nunca autenticación por cookies.
            .sessionManagement(s -> s.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
            .addFilterBefore(new com.segurixt.api.auth.BearerFilter(authService), org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(e -> e.authenticationEntryPoint((req,res,ex) -> com.segurixt.api.auth.BearerFilter.error(res,401))
                .accessDeniedHandler((req,res,ex) -> com.segurixt.api.auth.BearerFilter.error(res,403)))
            .cors(cors -> cors.configurationSource(corsSource))
            .authorizeHttpRequests(auth -> auth
                // Solo el despacho interno de Tomcat a /error conserva el 404/500 original.
                // Un REQUEST directo a /error o a /api/admin/** conserva sus restricciones.
                .requestMatchers(request -> request.getDispatcherType() == jakarta.servlet.DispatcherType.ERROR
                    && "/error".equals(request.getServletPath())).permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers("/api/auth/me", "/api/auth/logout").authenticated()
                .requestMatchers("/api/admin/usuarios", "/api/admin/usuarios/**", "/api/admin/empresa", "/api/admin/empresa/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/admin/dashboard", "/api/admin/productos", "/api/admin/productos/**", "/api/admin/categorias", "/api/admin/categorias/**", "/api/admin/servicios", "/api/admin/servicios/**", "/api/admin/promociones", "/api/admin/promociones/**", "/api/admin/cotizaciones", "/api/admin/cotizaciones/**").hasAnyRole("ADMIN", "EDITOR", "LECTOR")
                // Retirar una imagen edita el producto; eliminar el producto sigue reservado a ADMIN.
                .requestMatchers(HttpMethod.DELETE, "/api/admin/productos/*/imagenes/*").hasAnyRole("ADMIN", "EDITOR")
                .requestMatchers(HttpMethod.DELETE, "/api/admin/productos", "/api/admin/productos/**", "/api/admin/servicios", "/api/admin/servicios/**", "/api/admin/categorias", "/api/admin/categorias/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/admin/productos", "/api/admin/productos/**", "/api/admin/servicios", "/api/admin/servicios/**", "/api/admin/categorias", "/api/admin/categorias/**", "/api/admin/promociones", "/api/admin/promociones/**", "/api/admin/cotizaciones", "/api/admin/cotizaciones/**").hasAnyRole("ADMIN", "EDITOR")
                .requestMatchers(HttpMethod.PUT, "/api/admin/productos/**", "/api/admin/servicios/**", "/api/admin/categorias/**", "/api/admin/promociones/**", "/api/admin/cotizaciones/**").hasAnyRole("ADMIN", "EDITOR")
                .requestMatchers(HttpMethod.PATCH, "/api/admin/productos/**", "/api/admin/servicios/**", "/api/admin/categorias/**", "/api/admin/promociones/**", "/api/admin/cotizaciones/**").hasAnyRole("ADMIN", "EDITOR")
                .requestMatchers(HttpMethod.DELETE, "/api/admin/promociones/**", "/api/admin/cotizaciones/**").hasAnyRole("ADMIN", "EDITOR")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/categorias-servicio",
                    "/api/servicios",
                    "/api/categorias-producto",
                    "/api/productos",
                    "/api/productos/{id}",
                    "/api/productos/slug/{slug}",
                    "/api/productos/imagenes/{filename}"
                ).permitAll()
                .anyRequest().denyAll()
            );

        return http.build();
    }

    @Bean
    UrlBasedCorsConfigurationSource corsConfigurationSource(@org.springframework.beans.factory.annotation.Value("${auth.cors.origins:http://localhost:5173,http://127.0.0.1:5173}") String origins) {

        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of(origins.split(",")));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Accept", "Authorization"));

        UrlBasedCorsConfigurationSource source =
            new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/api/**", config);

        return source;
    }
}
