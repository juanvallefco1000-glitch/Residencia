-- Aplicar manualmente después de revisar y respaldar MySQL 8.
-- No modifica cotizaciones/detalles_cotizacion existentes ni carga precios de ejemplo.
CREATE TABLE cotizador_config (
 id INT PRIMARY KEY,
 labour_per_camera DECIMAL(12,2) NULL,
 high_difficulty_multiplier DECIMAL(8,4) NULL,
 exterior_multiplier DECIMAL(8,4) NULL,
 tax_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 tax_rate DECIMAL(8,6) NULL,
 CONSTRAINT chk_cotizador_rates CHECK ((labour_per_camera IS NULL OR labour_per_camera >= 0) AND
 (high_difficulty_multiplier IS NULL OR high_difficulty_multiplier BETWEEN 1 AND 100) AND
 (exterior_multiplier IS NULL OR exterior_multiplier BETWEEN 1 AND 100) AND
 (tax_rate IS NULL OR tax_rate BETWEEN 0 AND 1))
);
INSERT INTO cotizador_config(id) VALUES (1);
CREATE TABLE cotizador_perfiles (
 producto_id BIGINT UNSIGNED PRIMARY KEY,
 role VARCHAR(20) NOT NULL,
 family VARCHAR(80),
 channels INT NOT NULL DEFAULT 0,
 CONSTRAINT fk_cotizador_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
 CONSTRAINT chk_cotizador_channels CHECK (channels BETWEEN 0 AND 256)
);
CREATE TABLE cotizador_solicitudes (
 id VARCHAR(36) PRIMARY KEY,
 nombre VARCHAR(150) NOT NULL,
 telefono VARCHAR(30) NOT NULL,
 email VARCHAR(150),
 mensaje TEXT,
 fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 estado VARCHAR(20) NOT NULL DEFAULT 'NUEVA',
 area_m2 DECIMAL(12,2) NOT NULL,
 cameras INT NOT NULL,
 environment VARCHAR(20) NOT NULL,
 difficulty VARCHAR(20) NOT NULL,
 cable_metres DECIMAL(12,2),
 subtotal DECIMAL(18,2) NOT NULL,
 tax DECIMAL(18,2),
 total DECIMAL(18,2) NOT NULL,
 tax_enabled BOOLEAN NOT NULL,
 tax_rate DECIMAL(8,6),
 labour_per_camera DECIMAL(12,2),
 high_difficulty_multiplier DECIMAL(8,4),
 exterior_multiplier DECIMAL(8,4),
 warnings TEXT NOT NULL,
 INDEX idx_cotizador_fecha (fecha)
);
CREATE TABLE cotizador_conceptos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 solicitud_id VARCHAR(36) NOT NULL,
 producto_id BIGINT UNSIGNED NULL,
 descripcion VARCHAR(500) NOT NULL,
 cantidad DECIMAL(12,2) NOT NULL,
 unidad VARCHAR(30) NOT NULL,
 precio_unitario DECIMAL(18,2),
 importe DECIMAL(18,2),
 pendiente VARCHAR(500),
 CONSTRAINT fk_cotizador_solicitud FOREIGN KEY (solicitud_id) REFERENCES cotizador_solicitudes(id) ON DELETE RESTRICT
 -- producto_id es referencia histórica; se conserva aunque el producto deje de existir.
);
