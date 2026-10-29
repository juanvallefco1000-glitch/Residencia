# Productos: diagnóstico de la instancia real y corrección

Actualización de autorización: [Usuarios, roles y permisos](USUARIOS_ROLES.md) define ADMIN/EDITOR/LECTOR y sustituye la matriz inicial de dos roles. EDITOR puede crear/editar productos; la baja y el cambio de estado quedan en ADMIN.

## Causa exacta comprobada antes de editar

1. React estaba configurado con `VITE_API_URL=http://localhost:8080` tanto en `.env.local` como en `.env.development`.
2. El proceso que escuchaba en 8080 era una JVM antigua (PID 9058, unas ocho horas de ejecución). `jcmd VM.class_hierarchy` mostraba `AuthController`, pero **no** `AdminProductoController`. El controlador y sus clases compiladas ya existían en disco: compilar archivos no los incorpora automáticamente a una JVM en ejecución sin reiniciarla.
3. Por tanto, las peticiones administrativas de React llegaban a una API que aún no tenía esos handlers. Las rutas de React **sí coinciden** con el código actual: `/api/admin/productos` y `/api/admin/productos/categorias`, con filtros `page`, `size`, `q`, `categoriaId` y `activo`.
4. Se reprodujo otro fallo con Tomcat real y un JWT válido: una ruta administrativa inexistente devolvía **401**, aunque `/api/auth/me` devolvía 200 antes y después. El despacho interno `ERROR → /error` era rechazado por la regla final de Spring Security; así se ocultaba el 404 original. La prueba `ProductoErrorDispatchIT` falló antes del cambio (`expected 404, was 401`) y pasó después.
5. La conexión de esa JVM usa realmente **MySQL 8.0.46, localhost:3306, `segurixt_db`**. La auditoría de `information_schema` confirmó columnas, claves, longitudes, tipos y relaciones esperados de `productos`, `categorias_producto` e `imagenes_producto`. La base habitual tenía **0 categorías, 0 productos y 0 imágenes**. El usuario `admin@gmail.com` estaba activo y tenía rol ADMIN.
6. El hook `useAdminData` descartaba el mensaje y código HTTP del fallo de categorías, sustituyéndolos por “No fue posible cargar la información”. El botón de alta dependía de categorías y no explicaba correctamente la ausencia de categorías activas.

El mensaje “La API rechazó esta operación, pero tu sesión sigue activa” pertenece al cliente cuando un módulo devuelve 401 y `/auth/me` confirma la sesión; no era una pérdida de JWT ni una razón para abrir permisos. Los 401 sin JWT medidos en la API habitual son esperados y no se presentan como una prueba de fallo de autenticación.

## Correcciones

- Se recompiló el backend y **se reinició únicamente la API de 8080 con sus mismos argumentos y entorno**, conservando configuración y secretos sin imprimirlos. Después se confirmó que la nueva JVM tiene cargado `AdminProductoController` y responde `/api/health` con 200. La API habitual quedó ejecutándose; no se sustituyó por la API de pruebas.
- Spring Security permite únicamente el despacho interno con `DispatcherType.ERROR` y destino `/error`, para conservar el 404/500 original. Un REQUEST directo a `/error` sigue protegido. Las escrituras administrativas mantienen el rol ADMIN; no se hizo público ningún CRUD.
- Categorías conserva ahora el mensaje HTTP original y su código; el listado muestra también el código cuando falla. Los errores no provocan una sustitución por datos locales ni un cierre de sesión por 403/500/red.
- Cuando faltan categorías activas, se muestra una explicación y “Agregar producto” permanece deshabilitado. ADMIN dispone de **Crear categoría** dentro de Productos. Tras guardarla, se actualizan las categorías y se habilita el alta. No se insertaron categorías ni productos de ejemplo en la base habitual.
- Se añadió `POST /api/admin/productos/categorias`, protegido por la regla ADMIN existente. Valida nombre, slug único y descripción; crea la categoría activa, con orden inicial 0. No cambia tablas ni añade migraciones.

La creación de categoría es necesaria para poder registrar productos en una base legítimamente vacía. No reemplaza el módulo de Categorías ni modifica el dashboard o el login.

## Rutas y parámetros

| Método | Endpoint | Acceso | Respuesta de éxito |
|---|---|---|---|
| GET | `/api/admin/productos?page=0&size=12` | ADMIN/EDITOR | 200; página, incluidos inactivos |
| GET | `/api/admin/productos/categorias` | ADMIN/EDITOR | 200; categorías con `activo` |
| POST | `/api/admin/productos/categorias` | ADMIN | 201; categoría creada |
| GET | `/api/admin/productos/{id}` | ADMIN/EDITOR | 200 |
| POST | `/api/admin/productos` | ADMIN | 201 |
| PUT | `/api/admin/productos/{id}` | ADMIN | 200 |
| DELETE | `/api/admin/productos/{id}` | ADMIN | 204; baja lógica |
| POST | `/api/admin/productos/{id}/imagenes` | ADMIN | 201 |
| GET | `/api/categorias-producto` | Público | 200; solo activas |
| GET | `/api/productos` | Público | 200; productos y categorías activos |
| GET | `/api/productos/{id}` | Público | 200 o 404 si no publicado |

Listado administrativo: `page >= 0`, `size` de 1 a 48, `q` por nombre hasta 200 caracteres, `categoriaId` numérico y `activo=true/false`. El listado público conserva `categoria` como slug y los demás filtros públicos anteriores. No se intercambian ambos contratos.

Cuerpo de categoría: `{ "nombre": "<nombre real>", "slug": "<slug-real>", "descripcion": "" }`. Nombre y slug hasta 120 caracteres, descripción hasta 500. El slug acepta minúsculas, números y guiones entre palabras; duplicados responden 409. Los campos vacíos o inválidos responden 400. EDITOR responde 403 a las escrituras; sin JWT, 401.

## Qué se verificó y contra qué base

### MySQL habitual, datos reales

- Auditoría de lectura de la conexión de la API, esquema, relaciones y rol del administrador.
- Siete escenarios ejecutados con `AdminProductoMySqlTest`, Spring Security/JWT reales y acceso JPA/JDBC a **`segurixt_db` del puerto 3306**, usando transacciones de prueba con rollback. Los fixtures son usuarios/categorías/productos temporales dentro de esas transacciones; no se usa la contraseña del administrador real.
- Incluyen alta y consulta de categorías, validaciones/duplicados, listado, detalle, creación/edición/baja/reactivación, reflejo público, protección 401/403 e imágenes.
- Conteos antes: usuarios **1**, categorías **0**, productos **0**, imágenes **0**. Conteos después: **1, 0, 0, 0**. No se ejecutó DDL, seeds, `deleteAll` ni borrados de registros reales. MySQL puede consumir IDs autoincrementales incluso con rollback; no se reiniciaron secuencias.
- La nueva API de 8080 se verificó por salud, carga del controlador y rutas públicas/protegidas. No se extrajo un token privado del navegador del usuario ni se inició sesión con su contraseña para esta comprobación.

### HTTP y navegador reales con MySQL aislado

Firefox, React/Vite y Spring Boot reales; segunda instancia MySQL 8.0.46 en **13317**, API de pruebas **18080** y base exclusiva `segurixt_products_fix_20261028_v2`. Se partió de categorías/productos vacíos y un ADMIN de pruebas. Aquí sí se confirmaron commits y lecturas mediante peticiones HTTP independientes.

Tráfico registrado por WebDriver BiDi, sin guardar cabeceras, tokens o contraseñas:

| Petición real del navegador | Código |
|---|---|
| POST `/api/auth/login` | 200 |
| GET `/api/auth/me` | 200 |
| GET `/api/admin/productos/categorias` | 200 |
| GET `/api/admin/productos?page=0&size=12` | 200 |
| POST `/api/admin/productos/categorias` | 201 |
| POST `/api/admin/productos` | 201 |
| POST `/api/admin/productos/1/imagenes` | 201 |
| GET `/api/admin/productos/1` | 200 |
| PUT `/api/admin/productos/1` | 200 |
| DELETE `/api/admin/productos/1` | 204 |
| GET `/api/categorias-producto` y `/api/productos?...` | 200 |

Se verificó que el alta permanece bloqueada con una explicación hasta crear una categoría; después se registra el producto, se sube una imagen, se edita y el catálogo de otra pestaña refleja los cambios. La baja lógica lo oculta públicamente. Se comprobaron escritorio, móvil y navegación a Servicios. No se usaron respuestas simuladas en este flujo.

### Pruebas aisladas con H2 o API simulada

- H2: suite normal de backend, incluidos siete escenarios de productos/categorías.
- HTTP con Tomcat y H2: dos pruebas `ProductoErrorDispatchIT`, incluyendo el 404 que antes se convertía en 401 y el bloqueo de REQUEST sin sesión a `/error` y administración.
- API simulada únicamente para pruebas de errores en Firefox: categorías con 404/403/503 muestran código y causa, bloquean el alta y permiten reintentar sin perder la sesión. Se mantienen las regresiones anteriores de JWT y navegación.
- Frontend: **22 pruebas aprobadas**; `npm run build` correcto.
- Informes backend acumulados de estas ejecuciones: **42 aprobadas, 0 fallos, 0 errores**. Quedó omitida una prueba opcional anterior de restablecimiento MySQL, ajena al módulo.

## Archivos de esta corrección

Backend:

- `config/SecurityConfig.java`: excepción restringida al despacho interno de errores.
- `controller/AdminProductoController.java`: alta de categorías protegida.
- `service/AdminProductoService.java`: validación/persistencia de categoría dentro de transacción.
- Nuevo `dto/CategoriaProductoRequest.java`.
- `entity/CategoriaProducto.java`, `repository/CategoriaProductoRepository.java`: mutadores y comprobación de slug.
- `src/test/java/com/segurixt/api/products/ProductModuleScenario.java`: categorías mediante API y verificaciones JDBC/permisos.
- Nuevo `src/test/java/com/segurixt/api/products/ProductoErrorDispatchIT.java`: HTTP real y redispatch Tomcat.

Frontend:

- `src/hooks/admin/useAdminData.js`: conserva mensaje y estado HTTP del error.
- `src/services/admin/productAdminService.js`: POST de categorías.
- `src/pages/admin/AdminProductos.jsx`: diagnóstico, dependencia explícita de categorías y creación de categoría.
- `src/components/admin/AdminProductForm.jsx`: formulario de categoría con el diseño existente.
- `tests/adminProducts.test.js`, `tests/products.browser.mjs`, `tests/authNavigation.browser.mjs`: regresiones de contrato, flujo vacío y errores.
- `DIAGNOSTICO_PRODUCTOS.md` y actualización de `ADMIN_PRODUCTOS.md`.

## Ejecutar en Linux Mint

La API habitual ya quedó actualizada en 8080. **Iniciar sesión otra vez**: el reinicio elimina el registro de sesiones en memoria, sin cambiar la contraseña ni el secreto JWT. No es necesario iniciar otra API mientras ese puerto esté ocupado.

Para futuros arranques, detener primero la instancia anterior y cargar las mismas variables `DB_USERNAME`, `DB_PASSWORD` y `AUTH_JWT_SECRET`. No guardar secretos en el repositorio:

```bash
cd /home/juanvalle/Documentos/Residencia/segurixt-frontend-arquitectura/backend/segurixt-api
java -version
mvn clean test package
java -jar target/segurixt-api-0.0.1-SNAPSHOT.jar
```

MySQL predeterminado: `jdbc:mysql://localhost:3306/segurixt_db`; `spring.jpa.hibernate.ddl-auto=none`. Si se usa otra conexión, exportar `SPRING_DATASOURCE_URL` antes de arrancar.

Frontend, en otra terminal:

```bash
cd /home/juanvalle/Documentos/Residencia/segurixt-frontend-arquitectura
npm ci
VITE_API_URL=http://localhost:8080 npm run dev
```

Abrir `http://localhost:5173/Residencia/#/admin/productos`. Tras iniciar sesión, pulsar **Crear categoría**, introducir una categoría real y guardarla. Después, **Agregar producto**. Guardar, editar y comparar con `#/catalogo` en otra pestaña. No ejecutar seeds para llenar el listado.

Verificaciones repetibles:

```bash
node --test --test-isolation=none tests/*.test.js
npm run build
node tests/authNavigation.browser.mjs
```

La prueba de errores de navegador inicia y cierra su API simulada/Vite/Firefox, sin MySQL real. Requiere Firefox y Node 24.

```bash
cd backend/segurixt-api
mvn -Dtest=ProductoErrorDispatchIT test
```

Para repetir los siete escenarios sobre un MySQL disponible, preferir una base de pruebas con el esquema existente. La prueba no cambia el esquema y revierte sus fixtures:

```bash
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

En el entorno restringido se cargó Mockito explícitamente:

```bash
mvn -DargLine="-javaagent:$HOME/.m2/repository/org/mockito/mockito-core/5.23.0/mockito-core-5.23.0.jar" test
```

La automatización `tests/products.browser.mjs` también admite `PRODUCTS_BROWSER_CREATE_CATEGORY=true` para validar el alta desde una base aislada sin categorías; se conserva el procedimiento de Firefox y credenciales de pruebas descrito en `ADMIN_PRODUCTOS.md`. Ese flujo sí confirma datos en la base aislada y no debe apuntar a producción.
