# Catálogo público de productos

El módulo utiliza el esquema existente de `database/01_schema.sql`. No se
modificó el esquema ni se ejecutaron escrituras en MySQL. Hibernate conserva
`spring.jpa.hibernate.ddl-auto=none`.

## API

| GET | Respuesta |
| --- | --- |
| `/api/categorias-producto` | Categorías activas, por `orden` e `id` |
| `/api/productos` | Página de productos y metadatos |
| `/api/productos/{id}` | Producto activo o 404 |
| `/api/productos/slug/{slug}` | Producto activo por slug o 404 |

Listado: `page` empieza en 0; `size` es 12 por defecto y admite 1–48.
`categoria` es el slug; `q` busca una cadena literal en nombre, descripción
corta/completa, marca y modelo (hasta 200 caracteres). `destacado` admite
`true` o `false`. Los filtros se combinan y el orden estable es `id ASC`.
Una categoría inactiva también oculta sus productos. Los parámetros inválidos
devuelven 400, los productos no públicos 404 y los errores de acceso a datos
503 con un mensaje genérico, sin SQL.

La página JSON tiene `content`, `page`, `size`, `totalElements`, `totalPages`.
Cada producto contiene categoría e imágenes (principal primero, luego orden e
id). Se devuelven DTOs, nunca las entidades del catálogo. La categoría se carga
mediante EntityGraph; las imágenes se obtienen en lote para los IDs de la página.
No hay fetch de colecciones paginadas ni consultas de imágenes por producto.

`precio` usa BigDecimal y solo se devuelve si `mostrar_precio` es verdadero
y existe un importe no negativo. En otro caso es null, `mostrarPrecio` es
false y React muestra «Solicitar cotización». Cero es un precio válido si
está autorizado. No se calcularon ni inventaron precios.

Spring Security permite exclusivamente GET a estas rutas, además de las
consultas públicas anteriores. Escrituras y administración siguen denegadas.
CORS conserva `http://localhost:5173` y `http://127.0.0.1:5173`.

## Ejecución local

Iniciar MySQL y proporcionar las variables que el backend ya utiliza, sin
añadirlas a Git ni a ningún archivo de variables del frontend:

```bash
export DB_USERNAME='usuario_mysql'
read -r -s -p 'Contraseña MySQL: ' DB_PASSWORD
export DB_PASSWORD
mvn -f backend/segurixt-api/pom.xml spring-boot:run
```

En otra terminal:

```bash
npm run dev -- --host localhost --port 5173
```

Abrir `http://localhost:5173/Residencia/#/catalogo`. `.env.development` ya
define `VITE_API_URL=http://localhost:8080`; una `.env.local` puede sobrescribirlo.
Para usar deliberadamente los ejemplos locales en desarrollo, definir
`VITE_API_URL=` en `.env.local` y reiniciar Vite.

```bash
curl 'http://localhost:8080/api/categorias-producto'
curl 'http://localhost:8080/api/productos?page=0&size=6'
curl 'http://localhost:8080/api/productos?categoria=videovigilancia&q=camara&destacado=true'
curl 'http://localhost:8080/api/productos/1'
curl 'http://localhost:8080/api/productos/slug/demo-camara-ip-4mp'
curl -i -H 'Origin: http://localhost:5173' 'http://localhost:8080/api/productos'
```

Reemplazar ID y slug por registros existentes; los ejemplos pueden devolver 404.

## Semillas opcionales

No se pudo confirmar si el catálogo local está vacío: la conexión de inspección
fue rechazada porque esta sesión no dispone de DB_USERNAME y DB_PASSWORD.
Antes de cargar ejemplos, revisar los registros existentes:

```bash
mysql -u usuario_mysql -p segurixt_db -e 'SELECT id,nombre,slug FROM categorias_producto; SELECT id,nombre,slug,activo FROM productos; SELECT COUNT(*) FROM imagenes_producto;'
```

Si el catálogo está vacío y se desean ejemplos, revisar y ejecutar manualmente:

```bash
mysql -u usuario_mysql -p segurixt_db < database/03_productos_seed.sql
```

El script agrega hasta cuatro categorías y siete productos demostrativos.
No carga imágenes externas, deja marca/modelo y precio nulos y mostrar_precio
en false. No elimina ni sobrescribe filas: omite nombres o slugs existentes.
No cambia categorías inactivas ni crea duplicados al repetirse. Usa las claves
de las categorías existentes por slug. Si un nombre de categoría ya existe con
otro slug, no crea otra categoría ni fuerza una reasignación de productos.
Los ejemplos no representan inventario, especificaciones o precios oficiales.

## React y GitHub Pages

publicApi centraliza fetch y conserva las funciones anteriores de servicios.
catalogService adapta los DTOs al formato de las tarjetas y mantiene las
funciones locales que utiliza la navegación. useProductCatalog consulta con
AbortController y espera brevemente al escribir la búsqueda. Las páginas
existentes conservan sus rutas por ID; también existe la función HTTP de slug.
Inicio utiliza la misma API para destacados, evitando mezclar IDs locales con
IDs remotos. Las imágenes ausentes o fallidas muestran el marcador existente.

Sin VITE_API_URL se usa el catálogo local, identificado como demostrativo.
Producción descarta URLs HTTP y localhost, incluyendo la configuración local
heredada: GitHub Pages continúa independiente del backend del desarrollador.
Con una API configurada, un fallo muestra un error; no sustituye un producto
remoto por otro local que casualmente tenga el mismo ID. Un 404 remoto tampoco
se reemplaza por un producto de demostración.

No se cambiaron HashRouter, rutas, base de Vite, workflow, Navbar, Footer,
estilos globales ni panel administrativo. El CSS nuevo está limitado al catálogo.
No se hizo push ni despliegue. La futura API HTTPS requerirá VITE_API_URL en la
compilación y una autorización CORS explícita para el origen publicado.

## Validación y límites

```bash
npm run build
npm run test:catalog
mvn -f backend/segurixt-api/pom.xml clean compile
mvn -f backend/segurixt-api/pom.xml -Dtest=ProductoServiceTest,ProductoControllerTest test
git diff --check
```

Pasaron cinco pruebas JavaScript de HTTP, filtros, paginación local, precios,
cancelación, errores y configuración de producción. Pasaron nueve pruebas
Java de servicio/controlador, incluyendo restricciones de escritura, CORS,
404/400/503, precios ocultos y regresión de rutas públicas de servicios.
Los repositorios están simulados en estas pruebas; no demuestran consultas
ejecutadas en MySQL.

Prueba opcional con la base real ya configurada, solo de lectura:

```bash
mvn -f backend/segurixt-api/pom.xml -Dtest=ProductoRepositoryIT test
```

Esta prueba compara el total público con SQL, verifica estado activo, búsqueda,
categoría, destacados y páginas estables. Algunas comprobaciones se omiten si
no hay productos suficientes. No fue ejecutada en esta sesión por falta de
credenciales. La prueba contextLoads original también requiere MySQL: no se
ejecutó la suite completa. No se dispone de navegador de prueba en esta sesión,
por lo que queda pendiente validar visualmente escritorio/móvil y clics reales.

Siguiente etapa: confirmar esquema/datos en MySQL, ejecutar la prueba de
repositorio y revisar visualmente. Después implementar autenticación real y
roles ADMIN/EDITOR antes de añadir operaciones administrativas de escritura.

## Archivos

Backend nuevo, dentro de `backend/segurixt-api/src/main/java/com/segurixt/api/`:

- `entity/`: CategoriaProducto, Producto, ImagenProducto.
- `dto/`: CategoriaProductoResponse, ProductoResponse, ImagenProductoResponse, PaginaResponse.
- `repository/`: CategoriaProductoRepository, ProductoRepository, ImagenProductoRepository, ProductoSpecifications.
- `service/ProductoService.java`.
- `controller/ProductoController.java` y `ProductoErrorHandler.java`.

Backend modificado: `config/SecurityConfig.java`. Pruebas nuevas en
`src/test/java/com/segurixt/api/`: service/ProductoServiceTest,
controller/ProductoControllerTest y repository/ProductoRepositoryIT.

Frontend modificado: `src/services/publicApi.js`, `src/services/catalogService.js`,
`src/components/ProductCard.jsx`, `src/pages/Catalogo.jsx`,
`src/pages/CatalogoCategoria.jsx`, `src/pages/Producto.jsx`, `src/pages/Home.jsx`
y `package.json` (comando de pruebas).

Frontend nuevo: `src/hooks/useProductCatalog.js`,
`src/components/ProductImage.jsx`, `ProductPrice.jsx`, `ProductResults.jsx`,
`ProductCatalog.css` y `tests/productCatalog.test.js`.

SQL/documentación nuevos: `database/03_productos_seed.sql` y este documento.
