# Administración de productos SegurIXT

Actualización de autorización: [Usuarios, roles y permisos](USUARIOS_ROLES.md) define ADMIN/EDITOR/LECTOR y sustituye la matriz inicial de dos roles. EDITOR puede crear/editar productos; la baja y el cambio de estado quedan en ADMIN.

Actualización: el [diagnóstico de la instancia real](DIAGNOSTICO_PRODUCTOS.md) documenta la API antigua detectada, el despacho de errores corregido, la auditoría de segurixt_db y el alta de categorías desde Productos.

## Auditoría previa y alcance

Se revisaron frontend, backend, DTO, repositorios, esquema versionado, navegación, autenticación y pruebas antes de modificar archivos.

- `ProductoController` y `ProductoService` ya ofrecían categorías y catálogo públicos, búsqueda, filtros, paginación y detalle por ID/slug. `ProductoSpecifications` excluye productos y categorías inactivos.
- `Producto`, `CategoriaProducto` e `ImagenProducto` ya mapeaban las tres tablas. Se conservaron los repositorios, DTO públicos y su contrato.
- `AdminProductos` era una tabla de demostración: cargaba `adminService` y sus botones abrían vistas previas. Los demás módulos siguen utilizando sus adaptadores anteriores.
- `Catalogo`, `CatalogoCategoria`, `Producto` y los destacados de Inicio ya utilizaban la API al configurar `VITE_API_URL`. Sin URL queda el modo local explícito; con una API configurada, un error no se sustituye por datos de ejemplo.
- La seguridad existente permite lecturas administrativas a ADMIN/EDITOR y reserva las escrituras bajo `/api/admin/**` a ADMIN. Se conservó esa política; solo se agregó la lectura pública de archivos de imagen validados.
- El esquema `database/01_schema.sql` tiene `productos.categoria_id → categorias_producto` con RESTRICT; `imagenes_producto.producto_id → productos` con CASCADE y `detalles_cotizacion.producto_id → productos` con RESTRICT. Por ello DELETE administrativo significa **baja lógica**: cambia `activo` a false y conserva la fila, imágenes y referencias de cotizaciones. Editar permite reactivar.

No se cargaron semillas, cambiaron tablas ni borraron registros del servidor MySQL habitual. En la auditoría inicial no se disponía de acceso al servidor habitual. La actualización descrita en DIAGNOSTICO_PRODUCTOS.md ya contrastó su esquema y verificó las operaciones con rollback contra segurixt_db real. Sí se ejecutaron los escenarios contra una instancia MySQL 8.0.46 real, aislada en `/tmp`, puerto 13317, creada con el esquema del repositorio. Las pruebas HTTP usan rollback; las pruebas de Firefox guardaron datos únicamente en esa instancia temporal.

## Endpoints

| Método | Ruta | Acceso / resultado |
|---|---|---|
| GET | `/api/productos` | Público; productos y categorías activos; filtros `q`, `categoria` (slug), `destacado`, `page`, `size` |
| GET | `/api/productos/{id}` | Público; 404 para producto no publicado |
| GET | `/api/productos/slug/{slug}` | Público; detalle publicado |
| GET | `/api/categorias-producto` | Público; categorías activas |
| GET | `/api/admin/productos` | ADMIN/EDITOR; filtros por nombre `q`, `categoriaId`, `activo`, `page`, `size` |
| GET | `/api/admin/productos/{id}` | ADMIN/EDITOR; incluye inactivos y precio interno |
| GET | `/api/admin/productos/categorias` | ADMIN/EDITOR; incluye estado de categorías |
| POST | `/api/admin/productos/categorias` | ADMIN; crea categoría real con validaciones, 201 |
| POST | `/api/admin/productos` | ADMIN; 201 y Location |
| PUT | `/api/admin/productos/{id}` | ADMIN; 200 |
| DELETE | `/api/admin/productos/{id}` | ADMIN; baja lógica, 204; 404 si no existe |
| POST | `/api/admin/productos/{id}/imagenes` | ADMIN; 201, archivo nuevo y referencia |
| DELETE | `/api/admin/productos/{id}/imagenes/{imagenId}` | ADMIN; retira asociación, 204 |
| GET | `/api/productos/imagenes/{filename}` | Público; solo imagen asociada a producto y categoría activos |

Se conservan las consultas públicas anteriores. La paginación usa 12 elementos por defecto y admite de 1 a 48. Validaciones devuelven 400; duplicados de slug/conflictos, 409; sin sesión, 401; rol insuficiente, 403; recurso inexistente, 404; indisponibilidad de datos, 503. Los mensajes no incluyen SQL, credenciales ni valores sensibles.

Ejemplo de cuerpo para crear/editar (los IDs deben corresponder a categorías existentes):

```json
{
  "categoriaId": 1,
  "nombre": "Nombre del producto",
  "slug": "nombre-del-producto",
  "marca": "",
  "modelo": "",
  "descripcionCorta": "",
  "descripcion": "",
  "precio": null,
  "mostrarPrecio": false,
  "destacado": false,
  "activo": true
}
```

Nombre obligatorio, hasta 200 caracteres; slug único con minúsculas/números y guiones entre palabras, hasta 200; marca/modelo hasta 100; descripción corta hasta 500; descripción hasta 10000. Precio opcional, no negativo, hasta 10 enteros y 2 decimales; obligatorio para mostrarlo públicamente. No se permite asignar una categoría inactiva nueva, pero se conserva una asociación inactiva existente al editar.

## Imágenes y almacenamiento

El formulario admite JPEG/PNG de hasta **3 MiB** y envía JSON `{nombreArchivo, contenidoBase64, textoAlt, principal}` mediante el cliente JWT existente. La codificación Base64 solo es transporte: MySQL recibe una referencia de URL y metadatos, nunca el archivo binario.

El servidor valida extensión y formato real con ImageIO, decodifica el archivo, limita cada lado a 6000 píxeles y el área a 16 megapíxeles, y vuelve a codificarlo sin los metadatos originales. Rechaza SVG, formatos falsos, contenido inválido y archivos demasiado grandes. Máximo 10 imágenes por producto. Nombres UUID y escritura `CREATE_NEW` evitan sobrescrituras; el nombre enviado no se utiliza como ruta. La lectura comprueba un patrón de nombre cerrado y la asociación activa en BD. Entrega Content-Type fijo y `nosniff`.

Se guarda en `./uploads/productos`, relativo al directorio desde el que se inicia Java. Para un destino persistente:

```bash
export PRODUCTS_IMAGES_DIRECTORY='/ruta/absoluta/persistente/productos'
```

El usuario del proceso necesita acceso de lectura/escritura. Respaldar esa carpeta junto con la base de datos. La carpeta predeterminada del backend está en `.gitignore`. No se monta como directorio estático general.

Al fallar una transacción de subida, se intenta retirar el archivo recién creado. Retirar una asociación conserva el archivo físico; deja de ser accesible por el endpoint al no tener referencia. Esta retención evita borrar archivos existentes y requiere considerar espacio en disco. No hay limpieza automática de archivos huérfanos. La primera imagen es principal; una subida marcada como principal sustituye ese indicador y, al retirar la principal, se elige la siguiente disponible.

## Archivos de esta implementación

Backend, bajo `backend/segurixt-api/src/main/java/com/segurixt/api/`:

- Nuevos: `controller/AdminProductoController.java`, `AdminProductoErrorHandler.java`, `ProductoImagenController.java`; `service/AdminProductoService.java`, `ProductoImagenService.java`; `dto/ProductoRequest.java`, `AdminProductoResponse.java`, `ImagenProductoRequest.java`.
- Actualizados: `entity/Producto.java`, `ImagenProducto.java`; `repository/ProductoRepository.java`, `ImagenProductoRepository.java`; `config/SecurityConfig.java` (solo lectura pública de imágenes).
- Pruebas: `src/test/java/com/segurixt/api/products/ProductModuleScenario.java`, `AdminProductoModuleTest.java`, `AdminProductoMySqlTest.java`.

Frontend:

- Pantalla: `src/pages/admin/AdminProductos.jsx`.
- Formulario e imágenes: `src/components/admin/AdminProductForm.jsx`.
- Transporte administrativo: `src/services/admin/productAdminService.js`, reutilizando `authService.adminRequest` sin cambiar el login.
- Sincronización pública: `src/hooks/useCatalogRevision.js`, `useProductCatalog.js`, `src/pages/Producto.jsx`, `src/services/publicApi.js` y `src/components/ProductImage.jsx`.
- Estilos: `src/styles/admin.css`. Aviso contextual del módulo: `src/layouts/AdminLayout.jsx`.
- Pruebas: `tests/adminProducts.test.js`, `tests/products.browser.mjs`.
- Documentación y almacenamiento: `ADMIN_PRODUCTOS.md`, `.gitignore`.

El repositorio ya tenía cambios previos sin commit; esta lista delimita el trabajo de productos, no todos los archivos que aparecen en `git status`. No se modificaron las páginas de login, dashboard, servicios, promociones, cotizaciones, usuarios o empresa.

## Ejecutar en Linux Mint

Requisitos: Java 21, Maven, Node compatible con Vite 7 y MySQL con el esquema existente. No ejecutar los scripts seed sobre una base con datos para probar este módulo.

Terminal del backend:

```bash
cd /home/juanvalle/Documentos/Residencia/segurixt-frontend-arquitectura/backend/segurixt-api
java -version
read -r -p 'Usuario MySQL: ' DB_USERNAME
export DB_USERNAME
read -r -s -p 'Contraseña MySQL: ' DB_PASSWORD
printf '\n'
export DB_PASSWORD
# Cargar AUTH_JWT_SECRET con el mismo secreto utilizado por la API existente.
: "${AUTH_JWT_SECRET:?Carga el secreto JWT existente antes de iniciar}"
mvn clean test package
java -jar target/segurixt-api-0.0.1-SNAPSHOT.jar
```

La conexión predeterminada es `jdbc:mysql://localhost:3306/segurixt_db`. Exportar `SPRING_DATASOURCE_URL` si la instancia real usa otra dirección. No guardar contraseñas o el secreto JWT en Git.

Terminal del frontend:

```bash
cd /home/juanvalle/Documentos/Residencia/segurixt-frontend-arquitectura
npm ci
VITE_API_URL=http://localhost:8080 npm run dev
```

Abrir **http://localhost:5173/Residencia/#/admin/productos**. La base `/Residencia/` y HashRouter se conservan. Para verificar compilación y pruebas del frontend:

```bash
npm test
npm run build
```

La compilación de producción necesita una API HTTPS pública y `VITE_ADMIN_AUTH_VALIDATED=true`, según la política previa del proyecto. `npm run preview` con una compilación sin esa configuración no sustituye la prueba local con `npm run dev`.

Si Mockito no puede conectarse automáticamente al JVM dentro de un entorno restringido, cargar el agente explícitamente. En el entorno validado se utilizó:

```bash
mvn -DargLine="-javaagent:$HOME/.m2/repository/org/mockito/mockito-core/5.23.0/mockito-core-5.23.0.jar" test
```

No fue necesario cambiar el POM para esa restricción del entorno.

## Pruebas y resultados

- Compilación Java y empaquetado: correctos.
- Resultado de la validación inicial del backend: 37 pruebas aprobadas, 0 fallos y 0 errores. La actualización de DIAGNOSTICO_PRODUCTOS.md contiene la verificación posterior ampliada. Incluye 6 escenarios del módulo con H2 y 6 con MySQL real. Quedó omitida 1 prueba opcional previa de restablecimiento de contraseña MySQL, ajena al módulo, por no configurar sus variables específicas.
- MySQL real 8.0.46 aislado: mismos 6 escenarios HTTP con JWT y consultas JDBC, sin DDL en los tests y con rollback de fixtures. Verifican alta, relectura sin caché JPA, edición, publicación, baja/reactivación sin borrar fila, filtros, duplicados, validaciones, 401/403, PNG/JPEG, aislamiento entre productos, nombres únicos y ocultación por estado de producto/categoría.
- Frontend: suites de autenticación/catálogo y nueva suite del adaptador de productos. Verifican contrato CRUD, filtros, cancelación, cabeceras Bearer, errores y formato/tamaño de imagen.
- Firefox real, perfil temporal, Vite y API conectados a la MySQL temporal: login y navegación existentes; alta; tabla actualizada; carga de PNG y visualización pública; edición; sincronización entre pestañas; confirmación y baja lógica; pantalla de 1365px y móvil de 390px sin desbordamiento horizontal; ruta de Servicios; sin excepciones JavaScript.

Para repetir la integración MySQL, usar una **instancia/base exclusiva de pruebas** con el esquema existente:

```bash
cd /home/juanvalle/Documentos/Residencia/segurixt-frontend-arquitectura/backend/segurixt-api
read -r -p 'URL JDBC MySQL de pruebas: ' PRODUCTS_TEST_MYSQL_URL
export PRODUCTS_TEST_MYSQL_URL
read -r -p 'Usuario MySQL de pruebas: ' PRODUCTS_TEST_MYSQL_USERNAME
export PRODUCTS_TEST_MYSQL_USERNAME
read -r -s -p 'Contraseña MySQL de pruebas: ' PRODUCTS_TEST_MYSQL_PASSWORD
printf '\n'
export PRODUCTS_TEST_MYSQL_PASSWORD
mvn -Dtest=AdminProductoMySqlTest test
unset PRODUCTS_TEST_MYSQL_PASSWORD
```

No se necesitan usuarios/productos previos: los fixtures se insertan dentro de cada transacción y se revierten. MySQL puede consumir IDs autoincrementales incluso después del rollback; por eso se recomienda una base aislada. Los tests no hacen `deleteAll`, no cargan seeds ni alteran tablas.

Para repetir la automatización de navegador, preparar una instancia aislada de API/MySQL con un ADMIN y una categoría activa llamada `Navegador` y slug `browser-tests`. La prueba guarda productos únicamente en esa instancia, no debe apuntar a producción. Iniciar Vite apuntando a ella y Firefox con un perfil temporal:

```bash
mkdir -p /tmp/segurixt-products-firefox-profile
firefox --headless --no-remote --profile /tmp/segurixt-products-firefox-profile --remote-debugging-port 19223
```

En otra terminal, desde la raíz del proyecto:

```bash
export PRODUCTS_BROWSER_ORIGIN='http://localhost:5173/Residencia'
export PRODUCTS_BROWSER_BIDI='ws://127.0.0.1:19223/session'
read -r -p 'Correo ADMIN de pruebas: ' PRODUCTS_BROWSER_EMAIL
export PRODUCTS_BROWSER_EMAIL
read -r -s -p 'Contraseña ADMIN de pruebas: ' PRODUCTS_BROWSER_PASSWORD
printf '\n'
export PRODUCTS_BROWSER_PASSWORD
node tests/products.browser.mjs
unset PRODUCTS_BROWSER_PASSWORD
```

La automatización utiliza WebDriver BiDi directamente, sin dependencias de navegador adicionales; la conexión local sigue el [procedimiento de Mozilla](https://developer.mozilla.org/en-US/docs/Web/WebDriver/How_to/Create_BiDi_connection). Guarda capturas en `/tmp/segurixt-products-desktop.png` y `/tmp/segurixt-products-mobile.png`.

## Verificación manual desde el navegador

1. Iniciar sesión como ADMIN y abrir Productos. Comprobar carga, búsqueda por nombre, filtros de categoría/estado y paginación.
2. En una base de pruebas, Agregar producto, elegir una categoría activa y guardar. Comprobar que se mantiene el formulario para asociar imágenes y aparece en la tabla.
3. Subir JPEG/PNG y comprobar que se muestra en el catálogo abierto en otra pestaña. Probar SVG o archivo mayor de 3 MiB: deben rechazarse.
4. Editar nombre, descripciones, precio, visibilidad o destacado; guardar. El catálogo vuelve a consultar al recibir cambios entre pestañas y al recuperar el foco. Sin almacenamiento compartido entre navegadores, recargar o regresar al catálogo.
5. Dar de baja y confirmar. Debe conservarse la fila administrativa inactiva y desaparecer de las consultas públicas; Editar y activar la restaura.
6. Sin Bearer, POST/PUT/DELETE bajo `/api/admin/productos` deben responder 401. Con EDITOR deben responder 403, aunque puede consultar el listado.
7. Revisar Inicio, detalle público, categorías y otros módulos administrativos. Sus rutas y datos anteriores se conservan.

## Pendientes y límites

- Resuelto en la actualización: se auditó segurixt_db real y el esquema esperado coincide. Véase DIAGNOSTICO_PRODUCTOS.md para los resultados y conteos.
- Si no hay categorías activas, Productos informa el estado y permite a ADMIN crear una categoría real antes de registrar el primer producto.
- La carpeta de imágenes requiere persistencia y respaldo en despliegue; los archivos sin asociación se retienen. No se implementó un borrado físico automático.
- No hay notificaciones push entre navegadores o dispositivos distintos: la actualización ocurre por nueva consulta, navegación, foco o evento entre pestañas del mismo origen.
