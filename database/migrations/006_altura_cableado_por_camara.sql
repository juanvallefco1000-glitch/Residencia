-- MySQL 8. Aplicación MANUAL después de 005, con respaldo y revisión.
-- No altera productos, precios ni cotizaciones anteriores. Sin tarifas monetarias de ejemplo.
CREATE TABLE cotizador_instalacion_config (
 id INT PRIMARY KEY,
 included_length DECIMAL(12,2) NOT NULL DEFAULT 18.00,
 cable_mode VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 extra_metre_price DECIMAL(12,2),
 segment_price DECIMAL(12,2),
 segment_length DECIMAL(12,2),
 max_auto_height DECIMAL(5,2),
 CONSTRAINT chk_instalacion_config CHECK (id=1 AND included_length>0 AND cable_mode IN ('PENDING','METRE','SEGMENT')
 AND (extra_metre_price IS NULL OR extra_metre_price>=0) AND (segment_price IS NULL OR segment_price>=0)
 AND (segment_length IS NULL OR segment_length>0) AND (max_auto_height IS NULL OR max_auto_height>0))
);
INSERT INTO cotizador_instalacion_config(id) VALUES (1);
CREATE TABLE cotizador_altura_tarifas (
 min_height DECIMAL(5,2) NOT NULL PRIMARY KEY,
 max_height DECIMAL(5,2) NOT NULL,
 price_per_camera DECIMAL(12,2),
 CONSTRAINT chk_altura_tarifa CHECK (min_height>=0 AND max_height>min_height AND (price_per_camera IS NULL OR price_per_camera>=0))
);
CREATE TABLE cotizador_cable_reglas (
 family VARCHAR(80) PRIMARY KEY,
 verified BOOLEAN NOT NULL,
 camera_type VARCHAR(150) NOT NULL,
 cable_type VARCHAR(150) NOT NULL,
 connectors VARCHAR(150) NOT NULL,
 power_type VARCHAR(150) NOT NULL,
 manufacturer_reference VARCHAR(500) NOT NULL,
 max_run_metres DECIMAL(12,2) NOT NULL,
 allow_extensions BOOLEAN NOT NULL,
 allow_segments BOOLEAN NOT NULL,
 max_segments INT NOT NULL,
 CONSTRAINT chk_cable_regla CHECK (max_run_metres>0 AND max_segments BETWEEN 1 AND 1000)
);
CREATE TABLE cotizador_material_tarifas (
 name VARCHAR(150) PRIMARY KEY,
 quantity_per_camera DECIMAL(6,2) NOT NULL,
 unit_price DECIMAL(12,2),
 CONSTRAINT chk_material_tarifa CHECK (quantity_per_camera>0 AND (unit_price IS NULL OR unit_price>=0))
);
ALTER TABLE cotizador_solicitudes ADD COLUMN height_metres DECIMAL(5,2) NULL;
ALTER TABLE cotizador_solicitudes ADD COLUMN layout_assumption VARCHAR(30) NULL;
ALTER TABLE cotizador_solicitudes ADD COLUMN installation_tariff_snapshot LONGTEXT NULL;
ALTER TABLE cotizador_conceptos ADD COLUMN kind VARCHAR(20) NULL;
CREATE TABLE cotizador_recorridos (
 solicitud_id VARCHAR(36) NOT NULL,
 camera_number INT NOT NULL,
 distance_metres DECIMAL(12,2),
 included_metres DECIMAL(12,2) NOT NULL,
 additional_metres DECIMAL(12,2),
 billed_metres DECIMAL(12,2),
 additional_segments INT,
 amount DECIMAL(18,2),
 pending VARCHAR(500),
 PRIMARY KEY (solicitud_id,camera_number),
 CONSTRAINT fk_recorrido_solicitud FOREIGN KEY(solicitud_id) REFERENCES cotizador_solicitudes(id) ON DELETE RESTRICT
);
