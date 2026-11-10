package com.segurixt.api.quotes;

import java.nio.file.*;
import java.util.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import com.jayway.jsonpath.JsonPath;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:quotes;MODE=MySQL;DB_CLOSE_DELAY=-1",
 "spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password=",
 "spring.jpa.hibernate.ddl-auto=create-drop","auth.jwt.secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
@AutoConfigureMockMvc(print=org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.NONE)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class QuoteIntegrationTest {
 @Autowired MockMvc mvc;
 @Autowired JdbcTemplate db;
 long productId;
 @BeforeAll void schema() throws Exception {
   try (var connection=db.getDataSource().getConnection()) { assertTrue(connection.getMetaData().getURL().startsWith("jdbc:h2:mem:quotes")); }
   String sql=Files.readString(Path.of("../../database/migrations/005_cotizador_instalaciones.sql"));
   sql=sql.replaceAll("(?m)--.*$", "").replace(",\n INDEX idx_cotizador_fecha (fecha)", "");
   for (String statement:sql.split(";")) if (!statement.isBlank()) db.execute(statement);
   String extension=Files.readString(Path.of("../../database/migrations/006_altura_cableado_por_camara.sql")).replaceAll("(?m)--.*$", "");
   for(String statement:extension.split(";")) if(!statement.isBlank()) db.execute(statement);
   db.update("INSERT INTO categorias_producto(nombre,slug,orden,activo) VALUES ('Prueba','quote-test',0,TRUE)");
   long category=db.queryForObject("SELECT id FROM categorias_producto WHERE slug='quote-test'",Long.class);
   db.update("INSERT INTO productos(categoria_id,nombre,slug,precio,mostrar_precio,destacado,activo) VALUES (?,'Kit real','quote-kit',123.45,TRUE,FALSE,TRUE)",category);
   productId=db.queryForObject("SELECT id FROM productos WHERE slug='quote-kit'",Long.class);
   db.update("INSERT INTO cotizador_perfiles(producto_id,role,channels) VALUES (?,'KIT',0)",productId);
 }
 String config() { return """
   {"items":[{"productId":%d,"quantity":2,"price":0.01}],"installation":{"areaM2":100,"cameras":5,"environment":"INTERIOR","difficulty":"NORMAL","cableMetres":null},"total":0.01}
   """.formatted(productId); }
 @Test void precioDelClienteSeIgnoraYSeGuardaHistorialConConceptos() throws Exception {
   db.update("UPDATE productos SET precio=123.45 WHERE id=?",productId);
   String body="{\"configuration\":"+config()+",\"name\":\"Cliente prueba\",\"phone\":\"3241234567\",\"email\":\"test@example.test\",\"message\":\"Instalación\"}";
   String result=mvc.perform(post("/api/cotizador/solicitudes").contentType("application/json").content(body))
     .andExpect(status().isCreated()).andExpect(jsonPath("$.estimate.knownSubtotal").value(246.9)).andReturn().getResponse().getContentAsString();
   String id=JsonPath.read(result,"$.id");
   assertEquals(new BigDecimal("123.45"),db.queryForObject("SELECT precio_unitario FROM cotizador_conceptos WHERE solicitud_id=? AND producto_id=?",BigDecimal.class,id,productId));
   db.update("UPDATE productos SET precio=500 WHERE id=?",productId);
   assertEquals(new BigDecimal("246.90"),db.queryForObject("SELECT subtotal FROM cotizador_solicitudes WHERE id=?",BigDecimal.class,id));
   mvc.perform(get("/api/admin/cotizaciones/"+id)).andExpect(status().isUnauthorized());
   mvc.perform(get("/api/admin/cotizaciones/"+id).with(user("lector").roles("LECTOR")))
     .andExpect(status().isOk()).andExpect(jsonPath("$.lines[0].precio_unitario").value(123.45));
 }
 @Test void validaEntradasYRestringeEscrituraAdministrativa() throws Exception {
   mvc.perform(post("/api/cotizador/estimar").contentType("application/json").content(config().replace("\"quantity\":2","\"quantity\":-1"))).andExpect(status().isBadRequest());
   mvc.perform(post("/api/cotizador/solicitudes").contentType("application/json").content("{}" )).andExpect(status().isBadRequest());
   mvc.perform(post("/api/cotizador/estimar").contentType("application/json").content(config().replace("\"difficulty\":\"NORMAL\",", ""))).andExpect(status().isBadRequest());
   String settings="{\"labourPerCamera\":100,\"highDifficultyMultiplier\":1.5,\"exteriorMultiplier\":1.2,\"taxEnabled\":true,\"taxRate\":0.16}";
   mvc.perform(put("/api/admin/cotizaciones/configuracion").with(user("lector").roles("LECTOR")).contentType("application/json").content(settings)).andExpect(status().isForbidden());
   mvc.perform(put("/api/admin/cotizaciones/configuracion").with(user("editor").roles("EDITOR")).contentType("application/json").content(settings)).andExpect(status().isOk());
   mvc.perform(put("/api/admin/cotizaciones/perfiles").with(user("editor").roles("EDITOR")).contentType("application/json").content("{\"productId\":"+productId+",\"role\":\"RECORDER\",\"family\":\"IP-A\",\"channels\":0}")).andExpect(status().isBadRequest());
 }
 @Test void precioOcultoYProductoInactivoNoSeFiltranAlCotizador() throws Exception {
   db.update("UPDATE productos SET mostrar_precio=FALSE WHERE id=?",productId);
   try { mvc.perform(post("/api/cotizador/estimar").contentType("application/json").content(config())).andExpect(status().isOk()).andExpect(jsonPath("$.knownSubtotal").value(0)); }
   finally { db.update("UPDATE productos SET mostrar_precio=TRUE WHERE id=?",productId); }
   db.update("UPDATE productos SET activo=FALSE WHERE id=?",productId);
   try { mvc.perform(post("/api/cotizador/estimar").contentType("application/json").content(config())).andExpect(status().isBadRequest()); }
   finally { db.update("UPDATE productos SET activo=TRUE WHERE id=?",productId); }
 }
 @Test void catalogoExistenteCargaSinJwtBuscaYOcultaCamposPrivados() throws Exception {
   db.update("UPDATE productos SET mostrar_precio=TRUE,precio=123.45 WHERE id=?",productId);
   mvc.perform(get("/api/productos").param("q","Kit real").param("size","24"))
     .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].nombre").value("Kit real"))
     .andExpect(jsonPath("$.content[0].precio").value(123.45))
     .andExpect(jsonPath("$.content[0].activo").doesNotExist())
     .andExpect(jsonPath("$.content[0].family").doesNotExist());
   mvc.perform(get("/api/productos").param("q","sin-coincidencias-xyz"))
     .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
   db.update("UPDATE productos SET mostrar_precio=FALSE WHERE id=?",productId);
   try { mvc.perform(get("/api/productos/"+productId)).andExpect(status().isOk()).andExpect(jsonPath("$.precio").isEmpty()); }
   finally { db.update("UPDATE productos SET mostrar_precio=TRUE WHERE id=?",productId); }
   mvc.perform(get("/api/productos/9223372036854775807")).andExpect(status().isNotFound());
   mvc.perform(get("/api/admin/productos")).andExpect(status().isUnauthorized());
   mvc.perform(get("/api/admin/cotizaciones")).andExpect(status().isUnauthorized());
 }
 String installationTariffsBody() { return """
 {"includedLength":18,"cableMode":"METRE","extraMetrePrice":15.5,"segmentPrice":null,"segmentLength":18,"maxAutoHeight":6,
 "heightRates":[{"minHeight":0,"maxHeight":3,"pricePerCamera":75}],
 "cableRules":[{"family":"TEST-A","verified":true,"cameraType":"Tipo probado","cableType":"Cable probado","connectors":"Conector probado","power":"Alimentación verificada","manufacturerReference":"Documento de prueba","maxRunMetres":90,"allowExtensions":true,"allowSegments":true,"maxSegments":5}],
 "materials":[{"name":"Caja de prueba","quantityPerCamera":1,"unitPrice":10}]}
 """; }
 @Test void tarifasSeAdministranConPermisosYSeConservanRecorridosHistoricos() throws Exception {
   mvc.perform(get("/api/admin/cotizaciones/instalacion")).andExpect(status().isUnauthorized());
   mvc.perform(get("/api/admin/cotizaciones/instalacion").with(user("lector").roles("LECTOR"))).andExpect(status().isOk());
   mvc.perform(put("/api/admin/cotizaciones/instalacion").with(user("lector").roles("LECTOR")).contentType("application/json").content(installationTariffsBody())).andExpect(status().isForbidden());
   mvc.perform(put("/api/admin/cotizaciones/instalacion").with(user("editor").roles("EDITOR")).contentType("application/json").content(installationTariffsBody())).andExpect(status().isOk());
   mvc.perform(get("/api/cotizador/instalacion")).andExpect(status().isOk()).andExpect(jsonPath("$.includedLength").value(18))
     .andExpect(jsonPath("$.extraMetrePrice").doesNotExist()).andExpect(jsonPath("$.cableRules").doesNotExist());
   long category=db.queryForObject("SELECT categoria_id FROM productos WHERE id=?",Long.class,productId);
   String slug="camera-"+UUID.randomUUID();
   db.update("INSERT INTO productos(categoria_id,nombre,slug,precio,mostrar_precio,destacado,activo) VALUES (?,'Cámara de prueba',?,123.45,TRUE,FALSE,TRUE)",category,slug);
   long camera=db.queryForObject("SELECT id FROM productos WHERE slug=?",Long.class,slug);
   db.update("INSERT INTO cotizador_perfiles(producto_id,role,family,channels) VALUES (?,'CAMERA','TEST-A',0)",camera);
   db.update("UPDATE cotizador_config SET tax_enabled=FALSE WHERE id=1");
   String request="""
     {"items":[{"productId":%d,"quantity":2,"price":0.01}],"installation":{"areaM2":100,"cameras":2,"environment":"INTERIOR","heightMetres":2.5,"layoutAssumption":"UNKNOWN","cameraRuns":[{"distanceMetres":12},{"distanceMetres":25}]}}
     """.formatted(camera);
   mvc.perform(post("/api/cotizador/estimar").contentType("application/json").content(request)).andExpect(status().isOk())
     .andExpect(jsonPath("$.cableRuns[0].additionalMetres").value(0)).andExpect(jsonPath("$.cableRuns[1].additionalMetres").value(7))
     .andExpect(jsonPath("$.cableRuns[1].amount").value(108.5)).andExpect(jsonPath("$.knownSubtotal").value(525.4));
   String formal="{\"configuration\":"+request+",\"name\":\"Cliente prueba\",\"phone\":\"3241234567\"}";
   String response=mvc.perform(post("/api/cotizador/solicitudes").contentType("application/json").content(formal)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
   String id=JsonPath.read(response,"$.id");
   assertEquals(2,db.queryForObject("SELECT COUNT(*) FROM cotizador_recorridos WHERE solicitud_id=?",Integer.class,id));
   assertEquals(new BigDecimal("108.50"),db.queryForObject("SELECT amount FROM cotizador_recorridos WHERE solicitud_id=? AND camera_number=2",BigDecimal.class,id));
   assertTrue(db.queryForObject("SELECT installation_tariff_snapshot FROM cotizador_solicitudes WHERE id=?",String.class,id).contains("extraMetrePrice=15.50"));
   db.update("UPDATE cotizador_instalacion_config SET extra_metre_price=99 WHERE id=1");
   assertEquals(new BigDecimal("108.50"),db.queryForObject("SELECT amount FROM cotizador_recorridos WHERE solicitud_id=? AND camera_number=2",BigDecimal.class,id));
   mvc.perform(get("/api/admin/cotizaciones/"+id).with(user("lector").roles("LECTOR"))).andExpect(status().isOk())
     .andExpect(jsonPath("$.height_metres").value(2.5)).andExpect(jsonPath("$.cameraRuns[1].amount").value(108.5));
   mvc.perform(post("/api/cotizador/estimar").contentType("application/json").content(request.replace("\"cameras\":2","\"cameras\":3"))).andExpect(status().isBadRequest());
   mvc.perform(post("/api/cotizador/estimar").contentType("application/json").content(request.replace("\"heightMetres\":2.5","\"heightMetres\":0"))).andExpect(status().isBadRequest());
 }
 @Test void rangosSuperpuestosSeRechazanSinModificarLaConfiguracion() throws Exception {
   String overlap=installationTariffsBody().replace("\"heightRates\":[", "\"heightRates\":[{\"minHeight\":1,\"maxHeight\":2,\"pricePerCamera\":100},");
   mvc.perform(put("/api/admin/cotizaciones/instalacion").with(user("admin").roles("ADMIN")).contentType("application/json").content(overlap)).andExpect(status().isBadRequest());
 }
}
