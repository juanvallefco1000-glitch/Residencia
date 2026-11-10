package com.segurixt.api.quotes;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import static com.segurixt.api.quotes.QuoteModels.*;

@Repository
public class QuoteRepository {
    private final JdbcTemplate db;
    public QuoteRepository(JdbcTemplate db) { this.db = db; }
    public List<Product> products() {
        return db.query("""
            SELECT p.id,p.nombre,CASE WHEN p.mostrar_precio AND p.precio > 0 THEN p.precio ELSE NULL END AS precio,
            COALESCE(t.role,'OTHER') AS role,t.family,COALESCE(t.channels,0) AS channels
            FROM productos p JOIN categorias_producto c ON c.id=p.categoria_id
            LEFT JOIN cotizador_perfiles t ON t.producto_id=p.id WHERE p.activo=TRUE AND c.activo=TRUE ORDER BY p.id
            """, (rs,n) -> new Product(rs.getLong("id"),rs.getString("nombre"),rs.getBigDecimal("precio"),rs.getString("role"),rs.getString("family"),rs.getInt("channels")));
    }
    public Settings settings() {
        var rows = db.query("SELECT * FROM cotizador_config WHERE id=1", (rs,n) -> new Settings(rs.getBigDecimal("labour_per_camera"),rs.getBigDecimal("high_difficulty_multiplier"),rs.getBigDecimal("exterior_multiplier"),rs.getBoolean("tax_enabled"),rs.getBigDecimal("tax_rate")));
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Cotizador pendiente de configurar.");
        return rows.getFirst();
    }
    public Settings saveSettings(Settings s) {
        db.update("UPDATE cotizador_config SET labour_per_camera=?,high_difficulty_multiplier=?,exterior_multiplier=?,tax_enabled=?,tax_rate=? WHERE id=1",
            s.labourPerCamera(),s.highDifficultyMultiplier(),s.exteriorMultiplier(),s.taxEnabled(),s.taxRate());
        return settings();
    }
    public Profile saveProfile(Profile p) {
        // Bloquear el producto serializa las ediciones de su ficha sin borrar datos.
        db.queryForObject("SELECT id FROM productos WHERE id=? FOR UPDATE",Long.class,p.productId());
        int updated=db.update("UPDATE cotizador_perfiles SET role=?,family=?,channels=? WHERE producto_id=?",p.role(),p.family(),p.channels(),p.productId());
        if (updated==0) db.update("INSERT INTO cotizador_perfiles(producto_id,role,family,channels) VALUES (?,?,?,?)",p.productId(),p.role(),p.family(),p.channels());
        return p;
    }
    public Map<String,Object> save(Formal formal, Estimate estimate, Settings settings) {
        String id = UUID.randomUUID().toString();
        var i = formal.configuration().installation();
        db.update("""
            INSERT INTO cotizador_solicitudes(id,nombre,telefono,email,mensaje,area_m2,cameras,environment,difficulty,cable_metres,
            subtotal,tax,total,tax_enabled,tax_rate,labour_per_camera,high_difficulty_multiplier,exterior_multiplier,warnings)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,id,formal.name(),formal.phone(),formal.email(),formal.message(),i.areaM2(),i.cameras(),i.environment(),i.perCamera()?"ALTURA":i.difficulty(),i.cableMetres(),
            estimate.knownSubtotal(),estimate.tax(),estimate.knownTotal(),settings.taxEnabled(),settings.taxRate(),settings.labourPerCamera(),settings.highDifficultyMultiplier(),settings.exteriorMultiplier(),String.join("\n",estimate.warnings()));
        for (Line l : estimate.lines()) db.update("INSERT INTO cotizador_conceptos(solicitud_id,producto_id,descripcion,cantidad,unidad,precio_unitario,importe,pendiente,kind) VALUES (?,?,?,?,?,?,?,?,?)",
            id,l.productId(),l.description(),l.quantity(),l.unit(),l.unitPrice(),l.amount(),l.pending(),l.kind());
        return Map.of("id",id,"estimate",estimate);
    }
    public List<Map<String,Object>> list(int page) {
        return normalize(db.queryForList("SELECT id,nombre,telefono,email,fecha,estado,total FROM cotizador_solicitudes ORDER BY fecha DESC,id DESC LIMIT 50 OFFSET ?",page*50));
    }
    public Map<String,Object> detail(String id) {
        var rows=normalize(db.queryForList("SELECT * FROM cotizador_solicitudes WHERE id=?",id));
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Solicitud no encontrada");
        var result=new LinkedHashMap<>(rows.getFirst());
        result.put("lines",normalize(db.queryForList("SELECT * FROM cotizador_conceptos WHERE solicitud_id=? ORDER BY id",id)));
        result.put("cameraRuns",normalize(db.queryForList("SELECT * FROM cotizador_recorridos WHERE solicitud_id=? ORDER BY camera_number",id)));
        return result;
    }
    public boolean existsProduct(long id) { return db.queryForObject("SELECT COUNT(*) FROM productos WHERE id=?",Integer.class,id)==1; }
    public Profile profile(long id) {
        var rows = db.query("SELECT * FROM cotizador_perfiles WHERE producto_id=?", (rs,n) -> new Profile(rs.getLong("producto_id"),rs.getString("role"),rs.getString("family"),rs.getInt("channels")),id);
        if (rows.isEmpty()) return new Profile(id,"OTHER","",0);
        return rows.getFirst();
    }
    private List<Map<String,Object>> normalize(List<Map<String,Object>> rows) {
        return rows.stream().map(row -> {
            Map<String,Object> normalized = new LinkedHashMap<>();
            row.forEach((key,value) -> normalized.put(key.toLowerCase(Locale.ROOT),value));
            return normalized;
        }).toList();
    }
}
