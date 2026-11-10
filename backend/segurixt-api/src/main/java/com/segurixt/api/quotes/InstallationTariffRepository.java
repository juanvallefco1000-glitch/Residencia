package com.segurixt.api.quotes;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static com.segurixt.api.quotes.QuoteModels.*;

@Repository
public class InstallationTariffRepository {
    private final JdbcTemplate db;
    public InstallationTariffRepository(JdbcTemplate db) { this.db=db; }
    public InstallationTariffs read() {
        var heights=db.query("SELECT * FROM cotizador_altura_tarifas ORDER BY min_height",(rs,n)->new HeightRate(rs.getBigDecimal("min_height"),rs.getBigDecimal("max_height"),rs.getBigDecimal("price_per_camera")));
        var rules=db.query("SELECT * FROM cotizador_cable_reglas ORDER BY family",(rs,n)->new CableRule(rs.getString("family"),rs.getBoolean("verified"),rs.getString("camera_type"),rs.getString("cable_type"),rs.getString("connectors"),rs.getString("power_type"),rs.getString("manufacturer_reference"),rs.getBigDecimal("max_run_metres"),rs.getBoolean("allow_extensions"),rs.getBoolean("allow_segments"),rs.getInt("max_segments")));
        var materials=db.query("SELECT * FROM cotizador_material_tarifas ORDER BY name",(rs,n)->new MaterialRate(rs.getString("name"),rs.getBigDecimal("quantity_per_camera"),rs.getBigDecimal("unit_price")));
        var config=db.query("SELECT * FROM cotizador_instalacion_config WHERE id=1",(rs,n)->new InstallationTariffs(rs.getBigDecimal("included_length"),rs.getString("cable_mode"),rs.getBigDecimal("extra_metre_price"),rs.getBigDecimal("segment_price"),rs.getBigDecimal("segment_length"),rs.getBigDecimal("max_auto_height"),heights,rules,materials));
        if (config.isEmpty()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Tarifas de instalación pendientes de configurar.");
        return config.getFirst();
    }
    public InstallationTariffs save(InstallationTariffs t) {
        db.queryForObject("SELECT id FROM cotizador_instalacion_config WHERE id=1 FOR UPDATE",Integer.class);
        db.update("UPDATE cotizador_instalacion_config SET included_length=?,cable_mode=?,extra_metre_price=?,segment_price=?,segment_length=?,max_auto_height=? WHERE id=1",t.includedLength(),t.cableMode(),t.extraMetrePrice(),t.segmentPrice(),t.segmentLength(),t.maxAutoHeight());
        db.update("DELETE FROM cotizador_altura_tarifas");
        for(var r:t.heightRates()) db.update("INSERT INTO cotizador_altura_tarifas(min_height,max_height,price_per_camera) VALUES (?,?,?)",r.minHeight(),r.maxHeight(),r.pricePerCamera());
        db.update("DELETE FROM cotizador_cable_reglas");
        for(var r:t.cableRules()) db.update("INSERT INTO cotizador_cable_reglas(family,verified,camera_type,cable_type,connectors,power_type,manufacturer_reference,max_run_metres,allow_extensions,allow_segments,max_segments) VALUES (?,?,?,?,?,?,?,?,?,?,?)",r.family(),r.verified(),r.cameraType(),r.cableType(),r.connectors(),r.power(),r.manufacturerReference(),r.maxRunMetres(),r.allowExtensions(),r.allowSegments(),r.maxSegments());
        db.update("DELETE FROM cotizador_material_tarifas");
        for(var m:t.materials()) db.update("INSERT INTO cotizador_material_tarifas(name,quantity_per_camera,unit_price) VALUES (?,?,?)",m.name(),m.quantityPerCamera(),m.unitPrice());
        return read();
    }
    public void snapshot(String id, Installation input, InstallationTariffs tariffs, Estimate estimate) {
        db.update("UPDATE cotizador_solicitudes SET height_metres=?,layout_assumption=?,installation_tariff_snapshot=? WHERE id=?",input.heightMetres(),input.layoutAssumption(),tariffs.toString(),id);
        for(var r:estimate.cableRuns()) db.update("INSERT INTO cotizador_recorridos(solicitud_id,camera_number,distance_metres,included_metres,additional_metres,billed_metres,additional_segments,amount,pending) VALUES (?,?,?,?,?,?,?,?,?)",id,r.camera(),r.distanceMetres(),r.includedMetres(),r.additionalMetres(),r.billedMetres(),r.additionalSegments(),r.amount(),r.pending());
    }
}
