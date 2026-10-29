-- SegurIXT / MySQL 8. Ejecutar UNA VEZ sobre el esquema existente, antes del nuevo backend.
-- Precondiciones: rol ENUM('ADMIN','EDITOR'); version_seguridad todavía no existe.
-- DDL atómico en MySQL 8, con commit implícito. No ejecutarlo dentro de una transacción de datos.
-- Conserva los índices, filas, contraseñas, roles actuales, estados y relaciones.
USE segurixt_db;
ALTER TABLE usuarios
    MODIFY COLUMN rol ENUM('ADMIN','EDITOR','LECTOR') NOT NULL DEFAULT 'EDITOR',
    ADD COLUMN version_seguridad BIGINT NOT NULL DEFAULT 0;
