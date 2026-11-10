package com.segurixt.api.config;

import com.segurixt.api.auth.AuthService;
import com.segurixt.api.controller.HealthController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers=HealthController.class,properties="auth.cors.origins=https://segurixt.example.com")
@Import(SecurityConfig.class)
class ProductionCorsTest {
    @Autowired MockMvc mvc;
    @MockitoBean AuthService auth;
    @Test void permiteSoloElOrigenExactoConfigurado() throws Exception {
        mvc.perform(get("/api/health").header("Origin","https://segurixt.example.com"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","https://segurixt.example.com"))
            .andExpect(header().doesNotExist("Access-Control-Allow-Credentials"));
        for(String origin:new String[]{"https://otra.vercel.app","http://localhost:5173","https://segurixt.example.com.attacker.test"})
            mvc.perform(get("/api/health").header("Origin",origin)).andExpect(status().isForbidden());
    }
    @Test void preflightNoConvierteLaEscrituraEnPublica() throws Exception {
        mvc.perform(options("/api/admin/usuarios").header("Origin","https://segurixt.example.com")
            .header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","authorization,content-type"))
            .andExpect(status().isOk());
        mvc.perform(post("/api/admin/usuarios").header("Origin","https://segurixt.example.com").contentType("application/json").content("{}"))
            .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/tools/ResetAdminPassword")).andExpect(status().isUnauthorized());
    }
}
