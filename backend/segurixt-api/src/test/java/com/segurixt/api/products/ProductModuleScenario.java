package com.segurixt.api.products;

import com.jayway.jsonpath.JsonPath;
import com.segurixt.api.entity.Usuario;
import com.segurixt.api.repository.*;
import jakarta.persistence.EntityManager;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Fixtures nuevas dentro de transacciones reversibles. Nunca borra registros existentes. */
@Transactional
abstract class ProductModuleScenario {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired UsuarioRepository users;
    @Autowired EntityManager em;
    @TempDir static Path uploads;
    @DynamicPropertySource static void images(DynamicPropertyRegistry registry) {
        registry.add("products.images.directory", () -> uploads.toString());
    }
    long categoryId;
    String categorySlug;
    String productSlug;
    String token;
    String editorToken;
    String lectorToken;

    @BeforeEach void fixtures() throws Exception {
        categorySlug="test-"+UUID.randomUUID();
        productSlug="test-"+UUID.randomUUID();
        token=login(Usuario.Rol.ADMIN);
        editorToken=login(Usuario.Rol.EDITOR);
        lectorToken=login(Usuario.Rol.LECTOR);
        var result=mvc.perform(post("/api/admin/productos/categorias").header("Authorization","Bearer "+token)
            .contentType("application/json").content(categoryBody()))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        categoryId=((Number)JsonPath.read(result,"$.id")).longValue();
    }
    String categoryBody() {
        return "{\"nombre\":\"Categoría de prueba\",\"slug\":\""+categorySlug+"\",\"descripcion\":\"Prueba reversible\"}";
    }
    String login(Usuario.Rol role) throws Exception {
        var u=new Usuario(); u.nombre="Prueba aislada"; u.email="test-"+UUID.randomUUID()+"@example.test";
        u.passwordHash=new BCryptPasswordEncoder(4).encode("clave-prueba-aislada"); u.rol=role; u.activo=true;
        users.saveAndFlush(u);
        var result=mvc.perform(post("/api/auth/login").with(req->{ req.setRemoteAddr("192.0.2."+(u.id%250+1)); return req; }).contentType("application/json")
            .content("{\"email\":\""+u.email+"\",\"password\":\"clave-prueba-aislada\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(result,"$.token");
    }
    String body(String name,boolean active) {
        return """
            {"categoriaId":%d,"nombre":"%s","slug":"%s","marca":"Marca",
             "modelo":"Modelo","descripcionCorta":"Producto temporal","descripcion":"Prueba reversible",
             "precio":123.45,"mostrarPrecio":true,"destacado":true,"activo":%s}
            """.formatted(categoryId,name,productSlug,active);
    }
    long create() throws Exception {
        var result=mvc.perform(post("/api/admin/productos").header("Authorization","Bearer "+token)
            .contentType("application/json").content(body("Producto temporal",true)))
            .andExpect(status().isCreated()).andExpect(header().exists("Location"))
            .andReturn().getResponse().getContentAsString();
        return ((Number)JsonPath.read(result,"$.id")).longValue();
    }
    @Test void categoriaSeGuardaSeConsultaYRechazaDuplicadosYRoles() throws Exception {
        em.clear();
        assertEquals("Categoría de prueba",jdbc.queryForObject("SELECT nombre FROM categorias_producto WHERE id=?",String.class,categoryId));
        mvc.perform(get("/api/admin/productos/categorias").header("Authorization","Bearer "+token))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == "+categoryId+")].slug").value(org.hamcrest.Matchers.hasItem(categorySlug)));
        mvc.perform(get("/api/categorias-producto")).andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == "+categoryId+")].slug").value(org.hamcrest.Matchers.hasItem(categorySlug)));
        mvc.perform(post("/api/admin/productos/categorias").header("Authorization","Bearer "+token).contentType("application/json").content(categoryBody()))
            .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/productos/categorias").header("Authorization","Bearer "+token).contentType("application/json").content(categoryBody().replace("Categoría de prueba"," ")))
            .andExpect(status().isBadRequest());
        for(String credential:List.of("","Bearer "+lectorToken)) {
            mvc.perform(post("/api/admin/productos/categorias").header("Authorization",credential).contentType("application/json").content(categoryBody()))
                .andExpect(status().is(credential.isEmpty()?401:403));
        }
    }

    @Test void adminCreaReleeEditaYDaBajaConCatalogoSinBorrarFila() throws Exception {
        long id=create();
        em.clear();
        assertEquals("Producto temporal",jdbc.queryForObject("SELECT nombre FROM productos WHERE id=?",String.class,id));
        mvc.perform(get("/api/productos/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("Producto temporal"));
        mvc.perform(put("/api/admin/productos/"+id).header("Authorization","Bearer "+token).contentType("application/json").content(body("Nombre actualizado",true)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("Nombre actualizado"));
        em.clear();
        assertEquals("Nombre actualizado",jdbc.queryForObject("SELECT nombre FROM productos WHERE id=?",String.class,id));
        mvc.perform(get("/api/productos").param("categoria",categorySlug).param("q","Nombre actualizado"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/admin/productos").header("Authorization","Bearer "+editorToken).param("categoriaId",""+categoryId).param("activo","true"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(delete("/api/admin/productos/"+id).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        em.clear();
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM productos WHERE id=? AND activo=FALSE",Integer.class,id));
        mvc.perform(get("/api/productos/"+id)).andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/productos/"+id).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.activo").value(false));
        mvc.perform(put("/api/admin/productos/"+id).header("Authorization","Bearer "+token).contentType("application/json").content(body("Reactivado",true))).andExpect(status().isOk());
        mvc.perform(get("/api/productos/"+id)).andExpect(status().isOk());
    }
    @Test void anonimoYLectorNoPuedenEscribir() throws Exception {
        for(String auth:List.of("","Bearer "+lectorToken)) {
            int expected=auth.isEmpty()?401:403;
            mvc.perform(post("/api/admin/productos").header("Authorization",auth).contentType("application/json").content(body("Bloqueado",true))).andExpect(status().is(expected));
            mvc.perform(put("/api/admin/productos/1").header("Authorization",auth).contentType("application/json").content(body("Bloqueado",true))).andExpect(status().is(expected));
            mvc.perform(delete("/api/admin/productos/1").header("Authorization",auth)).andExpect(status().is(expected));
            mvc.perform(post("/api/admin/productos/1/imagenes").header("Authorization",auth).contentType("application/json").content("{}")).andExpect(status().is(expected));
            mvc.perform(delete("/api/admin/productos/1/imagenes/1").header("Authorization",auth)).andExpect(status().is(expected));
        }
        mvc.perform(get("/api/admin/productos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/categorias-producto")).andExpect(status().isOk());
    }
    @Test void editorCreaYEditaPeroNoEliminaProducto() throws Exception {
        var result=mvc.perform(post("/api/admin/productos").header("Authorization","Bearer "+editorToken).contentType("application/json").content(body("Creado por editor",true)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id=((Number)JsonPath.read(result,"$.id")).longValue();
        mvc.perform(put("/api/admin/productos/"+id).header("Authorization","Bearer "+editorToken).contentType("application/json").content(body("Editado por editor",true))).andExpect(status().isOk());
        mvc.perform(delete("/api/admin/productos/"+id).header("Authorization","Bearer "+editorToken)).andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/productos/"+id).header("Authorization","Bearer "+editorToken).contentType("application/json").content(body("Intento de baja",false))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/productos/"+id).header("Authorization","Bearer "+lectorToken)).andExpect(status().isOk());
        mvc.perform(put("/api/admin/productos/"+id).header("Authorization","Bearer "+lectorToken).contentType("application/json").content(body("No permitido",true))).andExpect(status().isForbidden());
    }

    @Test void validacionesDuplicadosFiltrosY404() throws Exception {
        create();
        mvc.perform(post("/api/admin/productos").header("Authorization","Bearer "+token).contentType("application/json").content(body("Duplicado",true))).andExpect(status().isConflict());
        mvc.perform(post("/api/admin/productos").header("Authorization","Bearer "+token).contentType("application/json").content(body("",true))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/productos").header("Authorization","Bearer "+token).contentType("application/json").content(body("Prueba",true).replace("123.45","-1"))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/productos").header("Authorization","Bearer "+token).contentType("application/json").content(body("Prueba",true).replace("123.45","null"))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/productos").header("Authorization","Bearer "+token).contentType("application/json").content("{")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/productos").header("Authorization","Bearer "+token).param("size","49")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/productos").header("Authorization","Bearer "+token).param("q","%"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content").isArray());
        mvc.perform(get("/api/admin/productos/9223372036854775807").header("Authorization","Bearer "+token)).andExpect(status().isNotFound());
    }
    String png() throws Exception {
        var output=new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(2,2,BufferedImage.TYPE_INT_RGB),"png",output);
        return Base64.getEncoder().encodeToString(output.toByteArray());
    }
    String imageBody(String name,String content) { return "{\"nombreArchivo\":\""+name+"\",\"contenidoBase64\":\""+content+"\",\"textoAlt\":\"Prueba\",\"principal\":true}"; }
    @Test void imagenSeGuardaSinSobrescribirYSeOcultaAlDarBaja() throws Exception {
        long id=create();
        String first=null;
        long imageId=0;
        for(int i=0;i<2;i++) {
            var result=mvc.perform(post("/api/admin/productos/"+id+"/imagenes").header("Authorization","Bearer "+token)
                .contentType("application/json").content(imageBody("camara.png",png())))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
            String url=JsonPath.read(result,"$.url");
            if(i==0) { first=url; imageId=((Number)JsonPath.read(result,"$.id")).longValue(); }
            else assertNotEquals(first,url);
            mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().contentType("image/png"))
                .andExpect(header().string("X-Content-Type-Options","nosniff"));
        }
        assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM imagenes_producto WHERE producto_id=?",Integer.class,id));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM imagenes_producto WHERE producto_id=? AND principal=TRUE",Integer.class,id));
        mvc.perform(delete("/api/admin/productos/"+id+"/imagenes/"+imageId).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        mvc.perform(get(first)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/admin/productos/"+id).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        String remaining=jdbc.queryForObject("SELECT url FROM imagenes_producto WHERE producto_id=?",String.class,id);
        mvc.perform(get(remaining)).andExpect(status().isNotFound());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM imagenes_producto WHERE producto_id=?",Integer.class,id));
    }
    @Test void jpegAsociaSoloAlProductoCorrectoYConservaImagenTrasIntentoAjeno() throws Exception {
        long id=create();
        var output=new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2,2,BufferedImage.TYPE_INT_RGB),"jpg",output);
        var result=mvc.perform(post("/api/admin/productos/"+id+"/imagenes").header("Authorization","Bearer "+token)
            .contentType("application/json").content(imageBody("foto.jpg",Base64.getEncoder().encodeToString(output.toByteArray()))))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String url=JsonPath.read(result,"$.url");
        long imageId=((Number)JsonPath.read(result,"$.id")).longValue();
        productSlug="test-"+UUID.randomUUID();
        long other=create();
        mvc.perform(delete("/api/admin/productos/"+other+"/imagenes/"+imageId).header("Authorization","Bearer "+token)).andExpect(status().isNotFound());
        assertEquals(id,jdbc.queryForObject("SELECT producto_id FROM imagenes_producto WHERE id=?",Long.class,imageId));
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().contentType("image/jpeg"));
        jdbc.update("UPDATE categorias_producto SET activo=FALSE WHERE id=?",categoryId);
        em.clear();
        mvc.perform(get(url)).andExpect(status().isNotFound());
        mvc.perform(get("/api/productos/"+id)).andExpect(status().isNotFound());
    }

    @Test void rechazaSvgFalsoJpegDimensionesYExcesoDeBytes() throws Exception {
        long id=create();
        var large=new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(6001,1,BufferedImage.TYPE_INT_RGB),"png",large);
        for(String invalid:List.of(imageBody("mal.svg",Base64.getEncoder().encodeToString("<svg/>".getBytes())),
                imageBody("falso.jpg",png()),imageBody("grande.png",Base64.getEncoder().encodeToString(large.toByteArray())),
                imageBody("mal.png","no-base64!"))) {
            mvc.perform(post("/api/admin/productos/"+id+"/imagenes").header("Authorization","Bearer "+token).contentType("application/json").content(invalid)).andExpect(status().isBadRequest());
        }
        String tooBig=Base64.getEncoder().encodeToString(new byte[3*1024*1024+1]);
        mvc.perform(post("/api/admin/productos/"+id+"/imagenes").header("Authorization","Bearer "+token).contentType("application/json").content(imageBody("grande.png",tooBig))).andExpect(status().isBadRequest());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM imagenes_producto WHERE producto_id=?",Integer.class,id));
    }
}
