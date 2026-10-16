USE segurixt_db;
INSERT INTO categorias_servicio (nombre,slug,icono,orden) VALUES
('Videovigilancia y Seguridad','videovigilancia-seguridad','Camera',1),
('Redes y Telecomunicaciones','redes-telecomunicaciones','Network',2),
('Internet Satelital y Automatización','internet-satelital','SatelliteDish',3),
('Electricidad y Soporte Tecnológico','electricidad-soporte','Zap',4)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), icono=VALUES(icono), orden=VALUES(orden);

INSERT INTO servicios (categoria_id,nombre,slug,orden)
SELECT c.id, s.nombre, s.slug, s.orden
FROM (
 SELECT 'videovigilancia-seguridad' categoria,'Cámaras de seguridad IP' nombre,'camaras-seguridad-ip' slug,1 orden
 UNION ALL SELECT 'videovigilancia-seguridad','Sistemas DVR / NVR','sistemas-dvr-nvr',2
 UNION ALL SELECT 'videovigilancia-seguridad','Alarmas','alarmas',3
 UNION ALL SELECT 'videovigilancia-seguridad','Control de acceso','control-acceso',4
 UNION ALL SELECT 'videovigilancia-seguridad','Monitoreo remoto','monitoreo-remoto',5
) s JOIN categorias_servicio c ON c.slug=s.categoria
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), orden=VALUES(orden);

INSERT INTO configuracion_empresa (id,nombre_empresa,ciudad,estado)
VALUES (1,'Cámaras de Seguridad Ixtlán','Ixtlán del Río','Nayarit')
ON DUPLICATE KEY UPDATE nombre_empresa=VALUES(nombre_empresa);
