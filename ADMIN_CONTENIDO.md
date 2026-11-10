# Administración de categorías, servicios y promociones

Se utilizan las tablas existentes de database/01_schema.sql: categorias_producto,
categorias_servicio, servicios y promociones. No se requiere migración ni se
modifican precios o registros existentes. Hibernate conserva ddl-auto=none.

## Rutas

- GET/POST /api/admin/productos/categorias
- PUT /api/admin/productos/categorias/{id}
- GET/POST /api/admin/servicios
- GET /api/admin/servicios/categorias (solo categorías de servicios activas)
- PUT /api/admin/servicios/{id}
- GET/POST /api/admin/promociones
- PUT /api/admin/promociones/{id}
- GET /api/promociones (público)

Las categorías y los servicios se desactivan o reactivan desde el formulario
Editar; no se borran relaciones. ADMIN cambia su estado, EDITOR crea y edita,
LECTOR consulta. ADMIN y EDITOR también cambian el estado de promociones.
Las reglas se comprueban en backend, además de la interfaz.

Los slugs son únicos. Las categorías de servicios no se crean ni se renombran
desde estos formularios, conservando las cuatro categorías y las rutas públicas.
Orden es un entero no negativo; los servicios públicos se ordenan por categoría,
orden e ID.

## Promociones e imágenes

Las fechas son inclusivas y usan el día de America/Mazatlan. Una fecha vacía
significa sin límite. Solo se publican registros activos dentro del rango.
Las páginas abiertas se actualizan tras guardar, al recuperar el foco y cada
minuto (también al cambiar la vigencia).

Las imágenes se asocian por URL http/https o ruta del sitio. No se reutiliza el
almacenamiento de imágenes de productos: está vinculado al producto y oculta
archivos de productos inactivos. Este módulo no sube archivos de promociones.
Los textos se renderizan como texto, sin HTML.

## Precios

El formulario de producto envía precio numérico o null y mostrarPrecio booleano.
Se admite cero y hasta dos decimales; mostrarPrecio=true requiere precio.
La API pública devuelve precio=null cuando está oculto y el catálogo usa
Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN'}).
Para publicar un precio existente se edita individualmente el producto y se
marca Mostrar precio. No se asignan importes automáticamente.

## Verificación

npm test
npm run build
cd backend/segurixt-api && ./mvnw test

Los escenarios de ProductModuleScenario incluyen persistencia, permisos,
activación, vigencia y precios. AdminProductoModuleTest los ejecuta con H2.
AdminProductoMySqlTest ejecuta los mismos escenarios con MySQL real si se
configuran PRODUCTS_TEST_MYSQL_URL, PRODUCTS_TEST_MYSQL_USERNAME y
PRODUCTS_TEST_MYSQL_PASSWORD. Usa transacciones con rollback y ddl-auto=none.
