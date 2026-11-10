# SegurIXT: preparación Vercel + Render Docker + MySQL 8

## Estado y alcance

Cambios preparados y validados localmente el 29/10/2026. **No se publicó nada, no hubo push, no se crearon/modificaron recursos externos y no se ejecutó SQL ni migraciones sobre bases reales en esta tarea.** Los pasos de despliegue de este documento son instrucciones futuras y requieren aprobación explícita.

La aplicación queda preparada para un despliegue inicial de **una instancia**, con disco persistente y nuevos inicios de sesión tras reinicios. No se presenta como una arquitectura de alta disponibilidad. La construcción de la imagen Docker está pendiente: Docker está instalado, pero el usuario no tiene acceso al socket del daemon, incluso fuera del sandbox. Se validó el JAR equivalente de producción y su contenido.

## Auditoría y cambios

| Área | Hallazgo | Preparación |
|---|---|---|
| Vite | `base` fija `/Residencia/` | Build por defecto `/`; desarrollo conserva `/Residencia/`; `VITE_BASE_PATH` permite elegir |
| Router | HashRouter y Link/NavLink, sin dependencia de rutas del servidor | Se conservan; Vercel usa `/#/catalogo`, `/#/admin/login`; no hacen falta rewrites de SPA |
| API frontend | Cliente público y cliente Bearer ya comparten `VITE_API_URL` | `build:vercel` exige origen HTTPS sin credenciales, `/api`, query ni fragmento |
| Backend | Puerto 8080 y URL MySQL local | `PORT`, `DB_JDBC_URL` y perfil `prod` explícito |
| CORS | Orígenes locales por defecto | Orígenes exactos, trim/deduplicación y sin comodines; prod exige HTTPS y origen remoto |
| JWT | Firma, estado actual y `version_seguridad`, más mapa de sesiones en RAM | Se conserva la seguridad; una instancia; reinicios invalidan tokens; no persistencia insegura en frontend |
| Imágenes | Archivos locales con URL en MySQL | `/var/data/productos` en volumen persistente; prueba de escritura al arrancar |
| Módulos administrativos | `adminService.js` conserva adaptadores de demostración para dashboard y otros módulos | Usuarios/Productos usan API real; completar o aceptar expresamente los módulos pendientes antes de habilitar ADMIN público |
| MySQL | DDL versionado y migración 004 manual | Prod usa `ddl-auto=validate`, sin ejecutar DDL; TLS `VERIFY_IDENTITY` obligatorio |
| Herramientas | Main CLI con `System.console`, sin handlers HTTP | Perfil Maven `production-image` las excluye completamente del JAR Docker |
| Publicación | Pages se desplegaba al hacer push | Pages manual con confirmación; Vercel y Render automáticos desactivados en archivos locales |

Referencias encontradas:

- `localhost`: `.env.development`, `.env.local` ignorado y defaults de desarrollo en `application.properties`; pruebas y documentación. No se usan como fallback en el perfil `prod`.
- Rutas `/api`: clientes `publicApi.js`, `authService.js`, `productAdminService.js`, `userAdminService.js` y controladores Spring. La URL del backend debe ser **solo el origen**, porque los clientes añaden `/api`.
- `/Residencia/`: desarrollo, Pages heredado y documentación previa. En Vercel la ruta pública empieza en `/` y el hash conserva las rutas de React.
- URLs externas de negocio: WhatsApp/redes/mapa y referencias de imágenes del catálogo. No son endpoints privados ni se reescribieron.
- `backend/segurixt-api/src/services/publicApi.js`: archivo JS duplicado fuera de las fuentes Java/recursos; no interviene en el frontend ni se copia al Dockerfile.

## Archivos preparados

Frontend y entrega:

- `vite.config.js`, `scripts/deploy-config.mjs`, `scripts/check-production-env.mjs`.
- `package.json`, `package-lock.json`, `.nvmrc` (Node 24).
- `vercel.json`, `.vercelignore`, `.env.example`, `.env.production.example`.
- `.github/workflows/deploy.yml`: Pages exclusivamente manual y base heredada explícita.
- `.gitignore`: archivos de entorno, proveedores, certificados, truststores y copias.

Backend, bajo `backend/segurixt-api/`:

- `Dockerfile`, `.dockerignore`, `.env.production.example`.
- `pom.xml`: perfil `production-image` sin clases `tools`; directorio de build configurable para pruebas aisladas.
- `src/main/resources/application.properties`, nuevo `application-prod.properties`.
- `config/SecurityConfig.java`, nuevos `CorsOrigins.java`, `ProductionSettings.java`, `ProductionConfig.java`, `JdbcTrustStoreConfig.java`.
- `tools/CreateAdmin.java`, `tools/ResetAdminPassword.java`: importan solo la configuración opcional de CA para CLI; siguen sin HTTP y se excluyen de la imagen.
- Pruebas `config/ProductionSettingsTest.java`, `config/ProductionCorsTest.java`.

Infraestructura y documentación: `render.yaml`, este documento y `tests/deployment.test.js`.

## Variables de entorno

Los valores siguientes son nombres y formatos públicos; no contienen secretos reales.

### Vercel: exclusivamente públicas, disponibles al compilar

| Variable | Uso |
|---|---|
| `VITE_API_URL` | Origen HTTPS real del servicio Render; sin `/api` ni barra de ruta |
| `VITE_BASE_PATH` | `/` para Vercel |
| `VITE_ADMIN_AUTH_VALIDATED` | `false` durante preparación; `true` solo tras validar seguridad en staging |

Ninguna contraseña, cadena con credenciales o clave JWT debe tener prefijo `VITE_`: estos valores se incluyen en el JavaScript del navegador. Modificar estas variables requiere una nueva compilación autorizada. La URL de la API no es un secreto.

`vercel.json` selecciona `npm run build:vercel`, `npm ci`, salida `dist` y `git.deploymentEnabled=false`. No contiene rewrites ni proxies `/api`; las solicitudes van directamente al origen configurado. HashRouter hace que el fragmento nunca se envíe a Vercel. El build ordinario `npm run build` sigue disponible para otros destinos; el de Vercel debe usar el comando estricto.

### Render: inyectadas al ejecutar

| Variable | Obligatoria / uso |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `PORT` | Render proporciona/configura el puerto; plantilla 10000; bind `0.0.0.0` |
| `DB_JDBC_URL` | JDBC MySQL remoto, base `segurixt_db`, con `sslMode=VERIFY_IDENTITY`; sin usuario/contraseña |
| `DB_USERNAME` | Cuenta de aplicación con permisos mínimos de datos |
| `DB_PASSWORD` | **Secreto**, sin valor predeterminado |
| `AUTH_JWT_SECRET` | **Secreto**, Base64 de al menos 32 bytes aleatorios; estable por entorno |
| `AUTH_JWT_ISSUER` | Emisor estable; predeterminado `segurixt-api` |
| `AUTH_CORS_ORIGINS` | CSV de orígenes frontend exactos HTTPS, sin rutas, hash, barra final ni comodines |
| `PRODUCTS_IMAGES_DIRECTORY` | `/var/data/productos`, dentro del disco persistente |
| `DB_POOL_SIZE` | Opcional; 5 por defecto; ajustar al límite del proveedor |
| `DB_TRUSTSTORE_URL` | Solo si la CA del proveedor no está en el JRE; `file:/etc/secrets/mysql-truststore.p12` |
| `DB_TRUSTSTORE_PASSWORD` | **Secreto** requerido si se usa truststore personalizado |

Formato orientativo de URL, sin credenciales: `jdbc:mysql://mysql.example.com:3306/segurixt_db?sslMode=VERIFY_IDENTITY`.

Prod rechaza MySQL local, credenciales en la URL, TLS sin verificación de identidad, parámetros de seguridad duplicados, claves JWT ausentes/cortas, CORS no autorizado y almacenamiento relativo o en `/tmp`. Fuerza SSL/verificación también en las propiedades del datasource. Hikari no imprime propiedades a nivel DEBUG en prod. No colocar contraseñas en `JAVA_TOOL_OPTIONS`: el JVM imprime esa variable al arrancar.

## Preparar MySQL seguro: solo después de aprobación

1. Elegir un servicio **MySQL 8 administrado** con TLS, backups automáticos y restauración verificable. El `databases:` de Render es para Postgres; este blueprint no intenta crear un MySQL administrado en Render.
2. Crear `segurixt_db` con `utf8mb4` y la collation compatible con el esquema versionado. Elegir una región próxima al backend. Obtener el hostname DNS, puerto y certificado CA del proveedor; no sustituir el hostname por una IP al verificar identidad.
3. Configurar la red del proveedor para admitir únicamente las direcciones/CIDR de salida vigentes del servicio Render y, cuando corresponda, una IP administrativa temporal. Obtener esas direcciones del panel de Render; no se fijaron IP públicas supuestas en Git. No abrir MySQL a todo internet.
4. Crear una cuenta de aplicación con SELECT/INSERT/UPDATE/DELETE sobre `segurixt_db.*` y exigir TLS. Usar otra cuenta para DDL/migraciones. No conceder ALTER/CREATE/DROP a la API para facilitar la instalación.
5. Antes de cualquier importación, determinar si la base es nueva o contiene datos. Hacer respaldo y verificar restauración. **No ejecutar seeds `02_seed.sql`/`03_productos_seed.sql` sobre datos existentes.**
6. Base nueva: revisar e importar el esquema `database/01_schema.sql` y luego la migración 004. Base existente: comparar `SHOW CREATE TABLE` y aplicar únicamente las migraciones pendientes, una vez y con aprobación.

El esquema inicial crea y selecciona `segurixt_db`. Si el proveedor ya crea la base y no permite `CREATE DATABASE`, preparar una copia revisable sin esas dos instrucciones, sin alterar las definiciones de tablas:

```bash
sed -E '/^CREATE DATABASE IF NOT EXISTS segurixt_db /d; /^USE segurixt_db;/d' \
  database/01_schema.sql > /tmp/segurixt-schema-managed.sql
```

No se ejecutó esa importación en esta tarea. Una vez aprobada, usar un login-path/config local protegido y verificación TLS del cliente; no pasar contraseñas con `-pVALOR`:

```bash
# EJECUCIÓN FUTURA, requiere aprobación y la conexión del proveedor configurada.
mysql --login-path=segurixt-migraciones --ssl-mode=VERIFY_IDENTITY \
  --ssl-ca=/ruta/ca-del-proveedor.pem --database=segurixt_db \
  < /tmp/segurixt-schema-managed.sql
```

Revisar `database/migrations/004_usuarios_lector_version_seguridad.sql`: agrega LECTOR y `version_seguridad`, sin borrar cuentas. Requiere el enum previo de dos roles y la ausencia de esa columna. DDL de MySQL hace commit implícito; no se promete rollback transaccional de esa migración. Si ya está aplicada, no repetirla. **No se comprobó ni modificó su estado en la base real durante esta tarea.**

`ddl-auto=validate` detectará un esquema incompatible al iniciar el backend nuevo; no lo reparará automáticamente. No hay Flyway/Liquibase, scripts SQL de inicio, hook de migración o seed en el Dockerfile/blueprint.

### CA del proveedor

Con CA pública confiable, el JRE puede validar el certificado usando su truststore estándar. Si el proveedor entrega una CA propia, crear un truststore PKCS12 localmente; la contraseña se introduce interactivamente:

```bash
keytool -importcert -alias segurixt-mysql-ca -file /ruta/ca-del-proveedor.pem \
  -keystore /tmp/mysql-truststore.p12 -storetype PKCS12
```

Tras aprobación, cargarlo como **Secret File** en Render con nombre `mysql-truststore.p12`; configurar `DB_TRUSTSTORE_URL` y su contraseña secreta. No copiarlo al repositorio, a la imagen ni a la URL JDBC. El cliente MySQL nativo utiliza el `.pem`; Connector/J utiliza el truststore PKCS12.

## Configurar Render: solo después de aprobación

La plantilla `render.yaml` es revisable y no se ha aplicado. Crearla/importarla o pulsar Create Web Service puede lanzar el primer despliegue; **no hacerlo durante esta fase**.

Configuración propuesta:

| Campo | Valor/configuración |
|---|---|
| Runtime/Language | Docker |
| Root Directory | `backend/segurixt-api` |
| Dockerfile Path | `./Dockerfile`, relativo al root elegido |
| Docker Build Context | `.` |
| Docker Command | Vacío; usar ENTRYPOINT de la imagen |
| Health Check Path | `/api/health` |
| Instancias | 1, sin autoscaling |
| Auto Deploy | Off / manual |
| Disco | Montaje `/var/data`, tamaño inicial 1 GB a revisar |
| Plan | Plantilla `standard`, sujeto a presupuesto y prueba de memoria; no se contrató ningún plan |

1. Tras aprobar recursos/región/plan, enlazar el repositorio y la rama revisada. Mantener Auto Deploy en Off.
2. Completar las variables anteriores usando secretos de Render, sin valores de desarrollo. No regenerar `AUTH_JWT_SECRET` al reiniciar. Generarlo de forma aleatoria fuera de Git, por ejemplo con `openssl rand -base64 32`, y guardarlo en el gestor de secretos.
3. Configurar el disco y el acceso del UID/GID **10001:10001** a `/var/data/productos`. La imagen corre como ese usuario, no como root. El directorio en la imagen tiene dueño adecuado, pero un montaje nuevo puede cambiar esos permisos: verificarlos en el volumen mediante el procedimiento administrativo autorizado. No usar `chmod 777`. El perfil prod prueba escritura y falla claramente si el montaje no es utilizable.
4. Configurar CA/TLS y red MySQL antes del arranque. No poner migraciones en Pre-Deploy Command ni crear un endpoint de bootstrap.
5. Hacer un despliegue manual aprobado. Comprobar `/api/health`, catálogo público, logs sin secretos y conectividad MySQL. Health es liveness del proceso; no sustituye un monitor de consultas ni una prueba del catálogo.
6. Render termina HTTPS delante del contenedor y reenvía HTTP interno. El contenedor escucha en `0.0.0.0:$PORT`; no expone MySQL ni otro servidor administrativo.

### Sesiones y proxy

- La versión de seguridad persistida invalida tokens al desactivar, cambiar rol o restablecer contraseñas; se consulta la cuenta actual, no un rol antiguo del JWT.
- El mapa de JTI/sesiones activas sigue en RAM. **Cada reinicio o deploy fuerza nuevo login**, incluso con el secreto estable. El frontend también conserva su token solo en memoria y pierde sesión al recargar el documento.
- Varias réplicas no son compatibles con ese mapa: un token emitido en A puede fallar en B. Disco y blueprint limitan a una instancia. Para HA o sesiones que sobrevivan reinicios se requiere un almacén compartido de sesiones/revocaciones, con diseño y pruebas independientes; no se eliminó la revocación para aparentar persistencia.
- Se conserva `server.forward-headers-strategy=none`: no se confía indiscriminadamente en cabeceras del cliente. El límite actual de login por `remoteAddr` puede agrupar usuarios detrás del proxy Render. Antes de activar el acceso administrativo público debe verificarse una configuración de proxy confiable o un límite en el borde. No se resolvió ese punto aceptando cualquier X-Forwarded-For.
- El límite de intentos también es local a RAM; vuelve a cero al reiniciar. Es una limitación operativa pendiente, no protección distribuida.

## Configurar Vercel: solo después de aprobación

1. Crear/importar el proyecto solo durante la fase aprobada. Importación inicial puede generar una publicación; `git.deploymentEnabled=false` bloquea despliegues por Git, no reemplaza esa autorización.
2. Elegir **Vite**, Root Directory **raíz del repositorio**, Install **npm ci**, Build **npm run build:vercel**, Output **dist**, Node **24.x**.
3. Configurar `VITE_API_URL` con el origen HTTPS real de Render, `VITE_BASE_PATH=/` y `VITE_ADMIN_AUTH_VALIDATED=false` al principio. No introducir secretos del backend.
4. Usar un dominio de frontend que pertenezca al proyecto. Una vez conocido el origen exacto de Vercel o dominio propio, configurarlo en `AUTH_CORS_ORIGINS` de Render. No usar `*.vercel.app`: eso autorizaría proyectos ajenos. Previews deben usar backend/base de staging y orígenes explícitos; no concederles acceso automático a producción.
5. Tras aprobar y realizar validaciones de staging, cambiar `VITE_ADMIN_AUTH_VALIDATED=true` y hacer la compilación/publicación manual correspondiente. Esa bandera habilita la interfaz; no sustituye JWT ni roles del servidor.
6. Verificar `/#/catalogo`, `/#/producto/ID` y `/#/admin/login`. Desarrollo sigue bajo `/Residencia/#/...`. No introducir reglas de rewrite que envíen `/api` a `index.html`.

Los encabezados de Vercel añaden nosniff, frame DENY, referrer policy y restricciones de cámara/micrófono/geolocalización. La caché larga se aplica solo a assets con hash. Una CSP completa debe diseñarse tras inventariar los orígenes de imágenes/contenido externos; no se declara que estos encabezados resuelvan XSS por sí solos.

## Imágenes y archivos

La aplicación ya valida JPEG/PNG, tamaño y dimensiones, recodifica archivos, utiliza UUID y guarda referencias en MySQL. El volumen es obligatorio para conservar esos archivos; guardar en el filesystem efímero de Render perdería imágenes al reiniciar.

- Solo se preserva `/var/data`; respaldar ese disco y MySQL de manera coordinada y probar una restauración.
- Las imágenes existentes en Linux Mint deben transferirse después de aprobación; conservar sus nombres y referencias. No se transfirió ningún archivo en esta tarea.
- Los archivos sin asociación se retienen según la política existente. Vigilar ocupación; no se añadió borrado automático.
- Un disco de Render solo pertenece a una instancia y evita despliegues sin interrupción. Si se requiere escalado o almacenamiento compartido, migrar a almacenamiento de objetos en una fase separada.

## Secretos y herramientas locales

Revisión local del árbol actual y de las configuraciones del ZIP, sin mostrar valores sensibles:

- `.env.local` está ignorado y contiene configuración pública de API. Las plantillas nuevas dejan los secretos vacíos.
- No se encontraron claves privadas/credenciales reales en las configuraciones revisadas; los valores conocidos de pruebas permanecen solo en tests. Esto no certifica el historial completo de Git ni sustituye un escáner de secretos antes del push autorizado.
- **`segurixt-api.zip` ya está versionado.** No se detectaron contraseñas literales en sus propiedades, pero es una copia antigua e innecesaria del backend. Añadir `*.zip` al ignore no lo retira del índice/historial. Se recomienda retirarlo en un commit revisado; no se modificó el índice ni se reescribió historia.
- `.aws/`, `.codex/`, `.agents/`, `.vercel/`, certificados, truststores, `.cnf`, dumps y entornos privados se ignoran. `.vercelignore` excluye backend, bases, tests y entornos de la subida CLI; la salida estática es únicamente `dist`.
- El contexto Docker es solo `backend/segurixt-api`; `.dockerignore` bloquea configuraciones sensibles, uploads, tests y artefactos. El runtime recibe solo el JAR, nunca Maven, fuentes o SQL.
- CreateAdmin y ResetAdminPassword usan terminal interactiva y `WebApplicationType.NONE`. No tienen RequestMapping. El JAR del perfil `production-image` contiene **0 clases tools**; H2 tampoco se incluye. El reset administrativo HTTP de otra cuenta permanece protegido por ADMIN y reautenticación y no es la herramienta CLI.
- Para bootstrap autorizado usar el compilado local ordinario de las herramientas contra una conexión TLS, con `DB_JDBC_URL`, `DB_USERNAME`, `DB_PASSWORD` y, si se necesita, `DB_TRUSTSTORE_URL`/`DB_TRUSTSTORE_PASSWORD`. Las herramientas importan esa configuración de CA sin imprimirla. No usar la imagen de producción para bootstrap ni añadir rutas públicas.

## Validaciones locales de esta entrega

- **28 pruebas frontend aprobadas**, incluyendo validación de destino/base/configuración insegura, sin conexión a la API. Se verificaron build y preview en `/` y desarrollo en `/Residencia/`.
- Build Vercel con URL **de ejemplo** HTTPS y ADMIN deshabilitado: compilado localmente, assets en `/assets`; no representa conectividad ni publicación real. Se inyectaron secretos canarios ficticios del backend y se comprobó que no aparecen en el bundle.
- **51 pruebas backend aprobadas**, 0 fallos y 0 errores; **17 pruebas MySQL opt-in omitidas**. Se usaron H2 y pruebas de perfiles/TLS/CORS. Se eliminaron las variables opt-in MySQL para no conectarse a bases reales.
- Maven usó `/tmp/segurixt-deploy-validation`, sin sobrescribir el JAR de una API local en ejecución.
- JAR de producción inspeccionado: perfil prod incluido; sin herramientas CLI ni dependencia H2.
- JSON Vercel y YAML Render/GitHub comprobados localmente. No se validaron creando recursos en los proveedores.
- Docker daemon no accesible por permisos del socket; no se construyó, ejecutó ni publicó una imagen.

## Comandos de validación desde Linux Mint

Desde la raíz:

```bash
node --version
java -version
node --test --test-isolation=none tests/*.test.js

# Solo una compilación local; este dominio de ejemplo NO es un backend de pruebas operativo.
VITE_API_URL=https://api.example.com VITE_BASE_PATH=/ \
VITE_ADMIN_AUTH_VALIDATED=false npm run build:vercel

# Conserva la base heredada si se desea comprobar Pages, sin publicar.
VITE_BASE_PATH=/Residencia/ npm run build
```

Backend, con salidas aisladas y pruebas MySQL desactivadas (usar un entorno de desarrollo, sin `SPRING_PROFILES_ACTIVE=prod`):

```bash
env -u USERS_TEST_MYSQL_URL -u PRODUCTS_TEST_MYSQL_URL -u MYSQL_RESET_TEST_URL \
  mvn -f backend/segurixt-api/pom.xml \
  -Dsegurixt.build.directory=/tmp/segurixt-deploy-validation \
  -Pproduction-image clean test package
```

En este entorno restringido, Mockito necesitó el argumento adicional (ajustar la versión al repositorio Maven local si cambia):

```bash
-DargLine="-javaagent:$HOME/.m2/repository/org/mockito/mockito-core/5.23.0/mockito-core-5.23.0.jar"
```

Inspeccionar el JAR sin arrancar ni conectar a MySQL:

```bash
jar tf /tmp/segurixt-deploy-validation/segurixt-api-0.0.1-SNAPSHOT.jar
```

Cuando el usuario local tenga acceso autorizado al daemon, construir **solo localmente**, sin push:

```bash
docker build -t segurixt-api:review backend/segurixt-api
docker image inspect segurixt-api:review --format '{{.Config.User}}'
```

Si la política local requiere sudo, ejecutar esos comandos Docker con `sudo` desde la terminal autorizada, sin compartir la contraseña. No se recomienda cambiar permisos globales del socket ni añadir privilegios al usuario de la API como solución al bloqueo de Docker. Validar imagen/CVE/digests antes del despliegue. Para arrancar una prueba futura, usar únicamente secretos/base de staging y un volumen con permisos 10001, nunca el entorno de la base real como una prueba improvisada.

## Pendientes antes de autorizar publicación

1. Acceso local a Docker para construir y probar la imagen completa, sus permisos y el arranque real con una base de staging/TLS. Fijar digests tras revisar imágenes base y su escaneo.
2. Selección/aprobación de región, plan, MySQL, dominios y presupuesto; configuración TLS/firewall/CA y backups con restauración.
3. Auditoría del esquema del destino y aprobación separada de las migraciones pendientes. No se presupone que 004 esté aplicada en ningún destino real.
4. Validar permisos/persistencia del volumen, transferencia de imágenes y restauración coordinada.
5. Resolver o aceptar explícitamente el comportamiento de sesiones al reiniciar, instancia única y el límite de login detrás del proxy; almacén compartido si se requiere HA.
6. Pruebas de staging de CORS, ADMIN/EDITOR/LECTOR, rechazo de escrituras anónimas, revocación y JWT; habilitar la interfaz administrativa pública solo después.
7. Revisión de secretos del historial y retirada revisada del ZIP versionado; no se hizo push ni publicación.
8. Completar o deshabilitar explícitamente los módulos administrativos que aún usan `src/services/admin/adminService.js` (dashboard, servicios, promociones, cotizaciones, empresa/categorías heredadas). No se convirtieron en datos reales por preparar hosting; Usuarios y Productos ya tienen adaptadores reales.

## Fuentes oficiales consultadas

- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite) y [configuración Git/auto-deploy](https://vercel.com/docs/project-configuration/git-configuration).
- [Servicios web y PORT en Render](https://render.com/docs/web-services), [monorepo y rutas](https://render.com/docs/monorepo-support), [Blueprint](https://render.com/docs/blueprint-spec) y [discos persistentes](https://render.com/docs/disks).
- [Propiedades TLS de MySQL Connector/J](https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-security.html).
