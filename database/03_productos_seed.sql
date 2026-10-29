-- OPCIONAL: ejemplos para un catálogo vacío. No ejecutar automáticamente.
-- No contiene precios oficiales ni imágenes externas. No cambia el esquema.
USE segurixt_db;
START TRANSACTION;

INSERT INTO categorias_producto (nombre, slug, descripcion, orden)
SELECT s.nombre, s.slug, s.descripcion, s.orden FROM (
    SELECT 'Videovigilancia' nombre, 'videovigilancia' slug,
           'Cámaras, grabadores y accesorios de monitoreo.' descripcion, 1 orden
    UNION ALL SELECT 'Redes y telecomunicaciones', 'redes-telecomunicaciones', 'Routers, switches y puntos de acceso.', 2
    UNION ALL SELECT 'Alarmas y control', 'alarmas-control', 'Alarmas y accesorios de seguridad electrónica.', 3
    UNION ALL SELECT 'Energía y accesorios', 'energia-accesorios', 'Fuentes, respaldos y accesorios de instalación.', 4
) s
LEFT JOIN categorias_producto c ON c.slug = s.slug OR c.nombre = s.nombre
WHERE c.id IS NULL;

INSERT INTO productos (categoria_id, nombre, slug, descripcion_corta, descripcion, precio, mostrar_precio, destacado)
SELECT c.id, s.nombre, s.slug,
       'Producto de ejemplo. Características y disponibilidad por confirmar.',
       CONCAT(s.descripcion, ' Registro demostrativo; confirmar especificaciones, marca y modelo con la empresa.'),
       NULL, FALSE, s.destacado
FROM (
    SELECT 'videovigilancia' categoria, 'Cámara IP 4 MP' nombre, 'demo-camara-ip-4mp' slug,
           'Cámara de red para proyectos de videovigilancia.' descripcion, TRUE destacado
    UNION ALL SELECT 'videovigilancia', 'NVR 8 canales', 'demo-nvr-8-canales', 'Grabador de video en red.', TRUE
    UNION ALL SELECT 'redes-telecomunicaciones', 'Switch PoE', 'demo-switch-poe', 'Switch para dispositivos compatibles con PoE.', TRUE
    UNION ALL SELECT 'redes-telecomunicaciones', 'Router de red', 'demo-router-red', 'Router para conectividad de hogares y negocios.', FALSE
    UNION ALL SELECT 'redes-telecomunicaciones', 'Access Point Wi-Fi', 'demo-access-point-wifi', 'Punto de acceso inalámbrico.', TRUE
    UNION ALL SELECT 'alarmas-control', 'Kit de alarma', 'demo-kit-alarma', 'Kit de seguridad electrónica.', FALSE
    UNION ALL SELECT 'energia-accesorios', 'Conectores de instalación', 'demo-conectores-instalacion', 'Accesorios para instalaciones tecnológicas.', FALSE
) s
JOIN categorias_producto c ON c.slug = s.categoria
LEFT JOIN productos p ON p.slug = s.slug OR p.nombre = s.nombre
WHERE p.id IS NULL;

COMMIT;
