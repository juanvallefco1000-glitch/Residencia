# Autenticación administrativa de SegurIXT

Implementación incremental sobre Spring Boot **4.1.1**, Spring Security **7.1.1**, Java 21 y React existente. No cambia tablas, semillas, diseño ni la selección del catálogo público. No se ha creado ningún usuario real, publicado el backend ni ejecutado git push.

## Arquitectura y permisos

`usuarios` se mapea respetando `id`, `nombre`, `email`, `password_hash`, `rol` y `activo`. MySQL mantiene los timestamps existentes. BCrypt coste 12 verifica contraseñas; el límite es 72 bytes UTF-8. Un correo inexistente también ejecuta BCrypt. Contraseña incorrecta, usuario inexistente y usuario inactivo reciben el mismo 401.

JWT HS256 con firma Nimbus, emisor explícito, identificador aleatorio y duración absoluta de 15 minutos. El servidor valida firma, emisor, expiración sin tolerancia adicional, registro de sesión y estado actual del usuario en cada petición. Los roles se consultan en MySQL, no se aceptan del cliente. Las respuestas nunca serializan la entidad con su hash.

React guarda el JWT exclusivamente en memoria; no usa localStorage, sessionStorage ni cookies. Recargar o cerrar la pestaña requiere login nuevamente. Se valida `/me` al entrar/cambiar de ruta administrativa y cada 30 segundos; un temporizador aplica la expiración. Los 401 borran la sesión y redirigen al login. La API sigue siendo la autoridad para cada operación.

El servidor mantiene una sesión activa por usuario: un login nuevo revoca el anterior. Logout revoca el identificador en memoria y React elimina el token. Un reinicio del backend invalida todas las sesiones. No hay refresh tokens ni renovación silenciosa: al expirar se solicitan las credenciales otra vez. Si falla la red al cerrar sesión, React borra el token y avisa que no pudo confirmar la revocación; el token remoto caduca como máximo en 15 minutos.

Esta estrategia se eligió porque GitHub Pages y el backend local son orígenes separados y aún no existe despliegue HTTPS para cookies fiables. CSRF está desactivado únicamente porque las credenciales se reciben en `Authorization: Bearer`, nunca en cookies; el cliente envía `credentials: omit` y no hay login de formulario HTTP ni autenticación Basic. Para migrar a cookies: desplegar preferiblemente bajo el mismo sitio, usar HttpOnly/Secure/SameSite apropiado y **habilitar CSRF antes de aceptar cookies**.

| Ámbito | ADMIN | EDITOR |
| --- | --- | --- |
| GET dashboard, productos, categorías, servicios, promociones bajo `/api/admin` | Sí | Sí |
| Escrituras bajo `/api/admin/**` | Sí | No |
| Usuarios, empresa, cotizaciones | Sí | No |
| Otras rutas administrativas futuras | Sí | No |

Los endpoints administrativos de contenido todavía no existen. Las reglas ya protegen su espacio de URLs. Las páginas muestran datos de demostración, con aviso explícito; sus controles todavía no guardan cambios. No existe registro público ni mecanismo para que un visitante elija un rol.

## Endpoints implementados

| Método y ruta | Entrada / salida | Acceso |
| --- | --- | --- |
| POST `/api/auth/login` | `{ "email": "…", "password": "…" }` → `{ token, expiresAt, usuario: { id, nombre, email, rol } }` | Público, limitado |
| GET `/api/auth/me` | `{ id, nombre, email, rol }` | Bearer válido |
| POST `/api/auth/logout` | 204, revocación inmediata | Bearer válido |

Errores JSON con `mensaje`: 400 datos inválidos, 401 autenticación inválida, 403 permisos insuficientes, 429 demasiados intentos y 503 indisponibilidad. Las respuestas de seguridad no se almacenan en caché. Login permite 20 intentos/minuto por dirección remota, con mapa limitado a 10 000 entradas; no se confía en X-Forwarded-For proporcionado por el cliente.

Siguen públicos los GET existentes de `/api/health`, `/api/categorias-servicio`, `/api/servicios`, `/api/categorias-producto`, `/api/productos`, `/api/productos/{id}` y `/api/productos/slug/{slug}`. El resto se deniega salvo reglas explícitas. CORS admite orígenes exactos y Authorization; no permite credenciales por cookies. CORS no sustituye autenticación.

## Configurar y arrancar localmente

Importar previamente el esquema existente `database/01_schema.sql`. No ejecutar `ddl-auto=create` contra MySQL. Desde una terminal, configurar las variables fuera del repositorio (no copiarlas a Vite):

```bash
read -r -p 'Usuario MySQL: ' DB_USERNAME
export DB_USERNAME
read -r -s -p 'Contraseña MySQL: ' DB_PASSWORD
export DB_PASSWORD
export AUTH_JWT_SECRET="$(openssl rand -base64 32)"
export AUTH_JWT_ISSUER=segurixt-api
cd backend/segurixt-api
mvn spring-boot:run
```

El servidor falla al arrancar sin una clave Base64 de al menos 32 bytes. Conservarla en un gestor de secretos cuando exista despliegue; nunca registrarla ni versionarla. `DB_USERNAME` y `DB_PASSWORD` ya eran requeridos por el proyecto. La URL MySQL sigue en `application.properties`; se puede sustituir con `SPRING_DATASOURCE_URL`.

CORS por defecto: `http://localhost:5173,http://127.0.0.1:5173`. Para otros entornos definir `AUTH_CORS_ORIGINS` con una lista separada por comas, sin comodines ni espacios. Usar HTTPS para credenciales fuera del desarrollo local.

## Crear el primer administrador manualmente

Ejecutar una sola instancia de esta herramienta, con el servidor detenido y las variables de MySQL configuradas. No incluir contraseñas en argumentos, historial, SQL ni variables Vite. La herramienta no abre servidor HTTP, solicita contraseña y confirmación con eco deshabilitado, exige 14 caracteres y hasta 72 bytes UTF-8, aplica BCrypt y rechaza la creación si ya existe un ADMIN o el correo está ocupado. No reactiva ni sobrescribe usuarios existentes.

```bash
cd backend/segurixt-api
mvn -DskipTests compile dependency:build-classpath -Dmdep.outputFile=target/runtime-classpath.txt -Dmdep.includeScope=runtime
java -cp "target/classes:$(cat target/runtime-classpath.txt)" com.segurixt.api.tools.CreateAdmin
```

Se necesita una terminal interactiva real: sin consola la herramienta se niega a continuar. El único usuario persistido es el elegido manualmente por el operador. Para recuperación de un ADMIN existente se requiere un procedimiento de operación controlado; esta herramienta no lo sustituye.

## Iniciar sesión desde React

Crear `.env.local` en la raíz del frontend (ya está ignorado):

```dotenv
VITE_API_URL=http://localhost:8080
```

Ejecutar `npm run dev`, abrir la URL que indica Vite y entrar a `#/admin/login`. Usar el administrador creado manualmente. Se conservan formulario, diseño y navegación del panel. EDITOR no ve usuarios, empresa ni cotizaciones; sus escrituras son rechazadas también en Spring Security.

Una compilación pública sin `VITE_API_URL` continúa usando el catálogo local. En producción el login y las rutas administrativas están deshabilitados salvo que exista URL HTTPS válida y **se defina deliberadamente `VITE_ADMIN_AUTH_VALIDATED=true` después de validar el despliegue**. No configurar esa variable en GitHub Pages todavía. Esta bandera es una barrera operativa de interfaz; la seguridad real permanece en el backend. No se ha modificado el flujo de publicación.

## Validación

```bash
npm test
npm run build
mvn -f backend/segurixt-api/pom.xml package
```

Las pruebas de servicio comprueban BCrypt, usuario inexistente/inactivo, firma alterada, emisor incorrecto firmado con clave válida, expiración, reinicio, cambio de rol y revocación. MockMvc usa el filtro y AuthService reales con repositorio simulado: login, `/me` sin hash, logout, 401, 403, acceso permitido, CORS, validación y límite de intentos. Los controladores administrativos de prueba solo existen en `src/test`, no se incluyen en el artefacto.

**Resultado de la verificación:** 21 pruebas Java sin fallos ni errores; 10 comprobaciones JavaScript aprobadas (autenticación y catálogo); `npm run build` correcto; `mvn package` correcto con JAR ejecutable generado. Mockito requirió ejecutar Maven fuera del sandbox por la restricción de adjuntar agentes Java.

El contexto completo arranca con H2 efímero exclusivo de pruebas; los fixtures no crean usuarios permanentes. Las pruebas existentes verifican GET públicos y catálogo. Las pruebas de transporte React verifican Bearer en memoria, 401/403, logout con/sin red y bloqueo de producción. La integración MySQL opcional `ProductoRepositoryIT` no forma parte del `package` normal; requiere una base configurada. No se ha validado el login en un navegador contra una instancia MySQL real ni el despliegue HTTPS.

## Archivos de esta implementación

Nuevos en backend: `auth/AuthService.java`, `auth/BearerFilter.java`, `auth/AuthErrorHandler.java`, `controller/AuthController.java`, `entity/Usuario.java`, `repository/UsuarioRepository.java`, `tools/CreateAdmin.java`, `auth/AuthServiceTest.java` y `auth/AuthHttpTest.java` (estos dos bajo test).

Modificados en backend: `pom.xml`, `config/SecurityConfig.java`, `application.properties`, `SegurixtApiApplicationTests.java`, `ProductoControllerTest.java`. Se agregaron JOSE y H2 solo para pruebas; se excluyó la creación automática del usuario de desarrollo de Spring Boot.

Frontend: nuevos `components/admin/RequireAdmin.jsx` y `tests/auth.test.js`; modificados `App.jsx`, `AdminLogin.jsx`, `AdminLayout.jsx`, `AdminHeader.jsx`, `AdminSidebar.jsx`, `styles/admin.css` (apariencia del botón de logout), `services/admin/authService.js`, `services/admin/adminService.js`, su `README.md` y el script `test` en `package.json`. Los cambios de catálogo que ya estaban presentes se conservaron.

## Límites y siguiente paso

El registro de sesiones y el límite de intentos funcionan para **una sola instancia**; para escalar se requiere almacenamiento compartido con expiración y revocación atómica. La protección por IP debe trasladarse o complementarse en un proxy de confianza; varios usuarios tras NAT comparten límite. No hay recuperación de contraseña, MFA ni auditoría persistente. La memoria del navegador reduce persistencia pero no elimina el riesgo de XSS: desplegar con CSP adecuada y controles de dependencias. La herramienta de inicialización supone un único operador y una única ejecución simultánea.

Antes de habilitar producción: backend HTTPS, validación real contra MySQL, pruebas de navegador de login/expiración/logout/CORS y revisión de la configuración del proxy. No habilitar la bandera administrativa hasta completar esas verificaciones.

El siguiente incremento es implementar DTO, validación y servicios transaccionales de productos/categorías bajo `/api/admin/**`, con pruebas de autorización por operación, y sustituir los mocks a través de `adminRequest`. EDITOR conserva solo lectura; cualquier ampliación debe autorizarse explícitamente. Después abordar servicios/promociones y mantener usuarios/cotizaciones/empresa exclusivos de ADMIN.
