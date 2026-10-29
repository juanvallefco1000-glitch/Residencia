# Administración de usuarios, roles y permisos

## Auditoría y diseño

Se revisaron antes de editar `Usuario`, `UsuarioRepository`, `AuthService`, `AuthController`, `BearerFilter`, `SecurityConfig`, `RequireAdmin`, HashRouter, menú y pantallas administrativas. El esquema real de `segurixt_db` en MySQL 8.0.46 tenía `rol ENUM('ADMIN','EDITOR')`, correo único, hash BCrypt y un ADMIN activo. La pantalla Usuarios usaba datos de demostración; no había API de cuentas.

Se mantienen entidad/repositorio/servicio/controlador, DTO, cliente Bearer, JWT en memoria y componentes visuales existentes. No se añadieron dependencias de autenticación, endpoints públicos de recuperación ni almacenamiento de tokens en el navegador. El contrato de login no cambia y las contraseñas existentes siguen siendo válidas.

El backend consulta la cuenta actual en cada petición. Ahora cada sesión también captura `version_seguridad` y el rol vigente al emitirla. Desactivar/reactivar, cambiar rol o restablecer contraseña incrementa esa versión dentro de la misma transacción; después del commit se retiran las sesiones locales anteriores. Otra instancia que hubiera emitido su propio token también lo rechaza al consultar la versión persistida. Restaurar un rol o reactivar una cuenta no revive los tokens anteriores.

Las escrituras de usuarios se serializan con `SELECT ... FOR UPDATE`, en orden por ID. Se comprueba otra vez que el actor es un ADMIN activo y se impide desactivar o quitar el rol al último ADMIN activo. Se probó la carrera entre dos administradores: una petición se confirma y la otra devuelve 409. La estrategia bloquea las filas de usuarios para asegurar consistencia en este panel de tamaño reducido.

## Permisos

| Acción | ADMIN | EDITOR | LECTOR |
|---|---|---|---|
| Consultar dashboard, productos, categorías, servicios y promociones | Sí | Sí | Sí |
| Consultar cotizaciones | Sí | Sí | Sí |
| Crear/editar productos y categorías de producto | Sí | Sí | No |
| Subir/retirar imágenes de productos | Sí | Sí | No |
| Dar de baja/reactivar productos | Sí | No | No |
| Crear/editar servicios | Sí | Sí | No |
| Eliminar servicios/categorías | Sí | No | No |
| Gestionar promociones y cotizaciones | Sí | Sí | No |
| Usuarios y configuración de empresa | Sí | No | No |

La política se aplica en Spring Security, no solo en React. Además, el servicio de productos impide a EDITOR cambiar `activo` mediante PUT: impedir DELETE sin esta comprobación habría dejado una vía para dar de baja productos. Retirar una imagen se considera editar contenido, no eliminar el producto.

Los permisos de servicios/promociones/cotizaciones se aplican sobre sus rutas administrativas. Este trabajo no inventa handlers CRUD para los módulos que aún son demostrativos: conserva su implementación y ajusta la visibilidad según rol. Usuarios y Productos sí usan las APIs reales existentes/nuevas.

## API de usuarios

Todas las rutas siguientes requieren ADMIN. No hay borrado físico de cuentas.

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/api/admin/usuarios` | 200, página de DTO |
| GET | `/api/admin/usuarios/{id}` | 200 o 404 |
| POST | `/api/admin/usuarios` | 201 y Location |
| PUT | `/api/admin/usuarios/{id}` | 200, solo nombre/correo |
| PATCH | `/api/admin/usuarios/{id}/rol` | 200; revoca sesiones si cambia |
| PATCH | `/api/admin/usuarios/{id}/estado` | 200; activa/desactiva y revoca si cambia |
| POST | `/api/admin/usuarios/{id}/password` | 204; solo otra cuenta, con reautenticación |

GET listado acepta `page >= 0`, `size` de 1 a 48 (12 por defecto), `q` por nombre/correo hasta 150 caracteres, `rol=ADMIN/EDITOR/LECTOR` y `activo=true/false`.

Crear: `{nombre,email,rol,password,confirmPassword}`. La cuenta se crea activa, con BCrypt coste 12 y versión 0. Nombre obligatorio hasta 100; correo válido hasta 150, normalizado a minúsculas y único sin distinguir mayúsculas. Contraseña: mínimo 14 caracteres Unicode, máximo 72 bytes UTF-8, letras y algún número, símbolo o espacio, sin controles; confirmación igual. La política fuerte se aplica a las nuevas contraseñas, no se fuerza un cambio de las existentes al iniciar sesión.

Editar perfil: `{nombre,email}`. Campos adicionales como `rol`, `activo` o `versionSeguridad` son rechazados. La asignación de privilegios está separada: `{rol}` o `{activo}` en los endpoints específicos, siempre bajo ADMIN y tomando el actor del principal autenticado, nunca del cuerpo de la solicitud.

Restablecer: `{currentPassword,password,confirmPassword}`. `currentPassword` confirma la identidad del ADMIN que opera; no es la contraseña anterior del destinatario. El endpoint no permite restablecer la propia cuenta. La contraseña nueva se define y confirma sin mostrarse en respuestas; debe entregarse al destinatario por un canal privado. No se generan enlaces públicos ni se envían correos desde esta herramienta.

Errores: 400 validación/campos inválidos; 401 sin sesión o token revocado; 403 rol insuficiente o reautenticación fallida; 404 cuenta inexistente; 409 correo duplicado, último ADMIN o intento de usar el procedimiento para la propia contraseña; 503 datos no disponibles. Los 403/500/red conservan la sesión del cliente. Los DTO nunca contienen el hash, las contraseñas o la versión interna; los DTO de entrada con secretos tienen `toString` redactado y no se registran cuerpos ni excepciones con datos sensibles.

## Migración controlada

Archivo: `database/migrations/004_usuarios_lector_version_seguridad.sql`.

Añade LECTOR al final del ENUM para conservar los valores existentes y agrega `version_seguridad BIGINT NOT NULL DEFAULT 0`. La columna es necesaria para la revocación persistente; no es una tabla adicional de permisos ni una contraseña. No hay DELETE, UPDATE de cuentas, semillas o reconstrucción manual de usuarios. `spring.jpa.hibernate.ddl-auto` continúa en `none`.

Ejecutar una sola vez, antes del backend nuevo, sobre un esquema que tenga los dos roles anteriores y no tenga esa columna. MySQL 8 hace commit implícito y DDL atómico: una transacción ordinaria no sirve para deshacer este ALTER. No se proporciona un rollback que reduzca el enum, porque sería inseguro cuando existan cuentas LECTOR.

Comprobar primero con una conexión administrativa configurada, sin pasar contraseñas en la línea de comandos:

```bash
mysql --login-path=segurixt -e "SELECT DATABASE(); SHOW CREATE TABLE segurixt_db.usuarios; SELECT rol,activo,COUNT(*) FROM segurixt_db.usuarios GROUP BY rol,activo;"
mysql --login-path=segurixt < database/migrations/004_usuarios_lector_version_seguridad.sql
mysql --login-path=segurixt -e "SHOW COLUMNS FROM segurixt_db.usuarios WHERE Field IN ('rol','version_seguridad');"
```

`segurixt` es el login-path configurado localmente con las credenciales autorizadas; no se incluye uno en el repositorio. Para una instalación nueva, aplicar primero `database/01_schema.sql` y después esta migración, sin cargar cuentas de ejemplo. No repetir el ALTER si la versión ya existe; comprobar el esquema antes. Detener la API al actualizar y arrancarla después con el nuevo artefacto, manteniendo el secreto JWT existente.

La migración se validó sobre MySQL real aislado antes de actualizar la instancia habitual. El procedimiento de aplicación comprueba sus precondiciones y compara los campos existentes de las cuentas antes/después, en memoria y sin imprimir hashes, para verificar conservación de los datos.

## Interfaz

Usuarios es visible y accesible solo para ADMIN. Incluye tabla responsive, búsqueda, filtros, paginación, alta, edición, selector de rol, activación/desactivación y reset. Los cambios sensibles usan confirmación; el reset solicita la contraseña del ADMIN y la confirmación de la nueva. Se reutilizan estilos oscuros/dorados, AdminTable, DataState y cliente Bearer.

EDITOR no ve Usuarios/Empresa ni las acciones de baja o cambio de estado del producto. LECTOR consulta los módulos autorizados sin controles de escritura. El acceso directo por hash a una ruta no autorizada vuelve al dashboard; esto complementa el 403 del backend. No se cambió la pantalla ni el contrato de login.

## Pruebas realizadas

- **H2 aislado:** ocho escenarios de usuarios: alta, correo duplicado, validaciones UTF-8/complejidad, perfil sin asignación masiva, acceso por rol, último ADMIN, desactivación/reactivación, cambio de rol y reset con reautenticación. Comprueban hash BCrypt y lectura JDBC, ausencia del hash en JSON e invalidez de tokens antiguos. Incluyen otra instancia de AuthService que no recibe el callback local de revocación.
- **MySQL real aislado, 13317:** la migración se aplicó en `segurixt_users_validation`; los mismos ocho escenarios pasaron con fixtures reversibles sobre el esquema real, sin usar cuentas de la base habitual.
- **Concurrencia H2 y MySQL:** dos peticiones simultáneas para quitar ADMIN producen 200 y 409; queda un ADMIN activo. La prueba con commits requiere una base aislada vacía y deja únicamente sus cuentas de prueba allí.
- **Regresiones del backend:** autenticación, productos y matriz de permisos para los tres roles. EDITOR crea/edita productos, pero recibe 403 al dar de baja mediante DELETE o mediante PUT `activo=false`. LECTOR recibe 403 para escrituras.
- **Frontend:** 26 pruebas aprobadas, incluyendo permisos, política de contraseña, contratos separados de usuarios y conservación de sesión ante 403/409/500; compilación Vite correcta.
- **Firefox con API y MySQL reales aislados:** alta/edición, navegación ADMIN/EDITOR/LECTOR, roles, desactivación/reactivación y reset; tokens previos rechazados; contraseña anterior rechazada y nueva aceptada. Diseño validado a 1365px y 390px sin desbordamiento. Se registraron solo métodos/rutas/estados, sin cabeceras ni secretos.
- **Firefox con API simulada:** regresiones de red/401/403/503 y acceso por rol; estas pruebas simuladas se distinguen de las anteriores.

Los datos de la base habitual solo se auditaron durante las pruebas; no se restablecieron contraseñas, cambiaron roles o desactivaron cuentas reales. La aplicación de la migración agrega metadatos de seguridad conservando los campos anteriores.

## Archivos de esta implementación

Backend bajo `backend/segurixt-api/src/main/java/com/segurixt/api/`:

- `entity/Usuario.java`, `repository/UsuarioRepository.java`.
- `auth/AuthService.java`, nuevo `auth/PasswordPolicy.java`.
- `config/SecurityConfig.java`.
- Nuevos `dto/UsuarioRequests.java`, `dto/UsuarioResponse.java`.
- Nuevos `service/UsuarioService.java`, `controller/UsuarioController.java`.
- `controller/AdminProductoErrorHandler.java`: reutilización del manejo seguro para Usuarios.
- `service/AdminProductoService.java`, `controller/AdminProductoController.java`: proteger también la baja mediante edición.
- `tools/ResetAdminPassword.java`: incrementa la versión al cambiar contraseña, para que el procedimiento local también revoque tokens.

Frontend:

- Nueva API `src/services/admin/userAdminService.js` y política `permissions.js`.
- `src/pages/admin/AdminUsuarios.jsx` y nuevo `src/components/admin/AdminUserForm.jsx`.
- `src/components/admin/RequireAdmin.jsx`, `AdminSidebar.jsx`: navegación y acceso por rol.
- `src/pages/admin/AdminProductos.jsx`, `src/components/admin/AdminProductForm.jsx`: permisos de edición/baja.
- `src/pages/admin/AdminServicios.jsx`, `AdminPromociones.jsx`, `AdminCategorias.jsx`: ocultar acciones de edición a LECTOR; no se sustituyen sus adaptadores existentes.
- `src/layouts/AdminLayout.jsx`: aviso correcto para Usuarios conectado.
- `tests/users.test.js`, `tests/users.browser.mjs`, `tests/browser/bidiClient.mjs`, `tests/authNavigation.browser.mjs`.

Pruebas Java: nuevo paquete `src/test/java/com/segurixt/api/users/` (`UserModuleScenario`, `UsuarioModuleTest`, `UsuarioMySqlTest`, `UserConcurrencyScenario`, `UsuarioConcurrencyTest`, `UsuarioConcurrencyMySqlIT`); regresiones en `auth/AuthServiceTest`, `auth/AuthHttpTest` y `products/ProductModuleScenario`.

Migración/documentación: `database/migrations/004_usuarios_lector_version_seguridad.sql`, `USUARIOS_ROLES.md` y referencias actualizadas en la documentación administrativa.

## Ejecutar en Linux Mint

Java 21, Maven, Node 24 y MySQL 8. Aplicar la migración antes de arrancar esta versión. Mantener las variables existentes `DB_USERNAME`, `DB_PASSWORD` y `AUTH_JWT_SECRET`; no generar otro secreto ni escribir contraseñas en Git.

```bash
cd /home/juanvalle/Documentos/Residencia/segurixt-frontend-arquitectura/backend/segurixt-api
mvn clean test package
java -jar target/segurixt-api-0.0.1-SNAPSHOT.jar
```

Detener la instancia anterior antes de recompilar su JAR o arrancar otra en 8080. No reemplazar un JAR que esté usando una JVM en ejecución. El reinicio de la API elimina sus sesiones en memoria, por lo que se necesita un nuevo login; no cambia contraseñas.

```bash
cd /home/juanvalle/Documentos/Residencia/segurixt-frontend-arquitectura
npm ci
VITE_API_URL=http://localhost:8080 npm run dev
```

Abrir `http://localhost:5173/Residencia/#/admin/usuarios` con ADMIN.

Pruebas frontend y backend:

```bash
node --test --test-isolation=none tests/*.test.js
npm run build
node tests/authNavigation.browser.mjs
cd backend/segurixt-api
mvn test
```

En el entorno restringido de trabajo fue necesario cargar Mockito explícitamente:

```bash
mvn -DargLine="-javaagent:$HOME/.m2/repository/org/mockito/mockito-core/5.23.0/mockito-core-5.23.0.jar" test
```

MySQL de pruebas: preparar una instancia/base exclusiva VACÍA con el esquema y migración. `UsuarioMySqlTest` se niega a operar si hay cuentas previas, para evitar alterar cuentas reales. No apuntar estas pruebas a la base habitual.

```bash
read -r -p 'URL JDBC de MySQL aislado: ' USERS_TEST_MYSQL_URL
export USERS_TEST_MYSQL_URL
read -r -p 'Usuario MySQL de pruebas: ' USERS_TEST_MYSQL_USERNAME
export USERS_TEST_MYSQL_USERNAME
read -r -s -p 'Contraseña MySQL de pruebas: ' USERS_TEST_MYSQL_PASSWORD
printf '\n'
export USERS_TEST_MYSQL_PASSWORD
mvn -Dtest=UsuarioMySqlTest test
# Ejecutar después: esta prueba confirma cuentas de prueba, únicamente en la base vacía aislada.
mvn -Dtest=UsuarioConcurrencyMySqlIT test
unset USERS_TEST_MYSQL_PASSWORD
```

Firefox con MySQL real: preparar otra instancia local de API/MySQL de pruebas, con un ADMIN `@example.test`. Iniciar Vite contra esa API y Firefox con un perfil temporal y `--remote-debugging-port 19223`. Desde la raíz:

```bash
export USERS_BROWSER_ISOLATED=true
export USERS_BROWSER_ORIGIN='http://localhost:5173/Residencia'
export USERS_BROWSER_BIDI='ws://127.0.0.1:19223/session'
read -r -p 'ADMIN @example.test de pruebas: ' USERS_BROWSER_EMAIL
export USERS_BROWSER_EMAIL
read -r -s -p 'Contraseña ADMIN de pruebas: ' USERS_BROWSER_PASSWORD
printf '\n'
export USERS_BROWSER_PASSWORD
node tests/users.browser.mjs
unset USERS_BROWSER_PASSWORD
```

Esta automatización confirma datos solo en la base aislada; no es reversible por transacción porque usa HTTP real entre varias sesiones. No usar cuentas reales. Las capturas se guardan en `/tmp/segurixt-users-desktop.png` y `/tmp/segurixt-users-mobile.png` sin formularios de contraseña.

## Verificación manual

1. Con ADMIN, abrir Usuarios y filtrar por nombre/correo, rol y estado.
2. Crear una cuenta de prueba LECTOR y comprobar que no aparecen hashes ni contraseñas en las respuestas de listado/detalle.
3. En otra sesión de navegador, entrar con esa cuenta: no debe ver Usuarios/Empresa ni botones de escritura.
4. Como ADMIN, cambiarla a EDITOR. La sesión anterior debe rechazarse; tras un nuevo login podrá crear/editar productos, pero no darlos de baja ni cambiar su estado activo.
5. Desactivar la cuenta: login y tokens anteriores deben fallar. Reactivar no revive el token; se requiere nuevo login.
6. Restablecer la contraseña de esa cuenta confirmando la del ADMIN; verificar que la anterior falla, la nueva funciona y se revocan los tokens anteriores.
7. Intentar desactivar o degradar al único ADMIN activo debe mostrar 409 y conservar su acceso.
8. Si la prueba requiere cuentas creadas para validación, hacerlo en una base aislada y desactivarlas según la política de pruebas; no modificar usuarios reales para probar estas reglas.

## Estado de instalación de esta entrega

La implementación y las pruebas finalizaron. La cuenta MySQL usada por la API habitual tiene únicamente SELECT/INSERT/UPDATE/DELETE; no tiene ALTER. El intento de aplicar 004 fue rechazado y se confirmó que `usuarios.rol` continúa con ADMIN/EDITOR y que `version_seguridad` aún no existe. La API habitual se mantuvo en su versión anterior para conservar login y módulos existentes.

Para completar la instalación con el usuario administrativo local, desde la raíz del repositorio:

```bash
sudo mysql < database/migrations/004_usuarios_lector_version_seguridad.sql
```

Introducir la contraseña de sudo solo en la terminal local, no en el chat. Alternativamente usar una conexión administrativa ya configurada con `mysql --login-path=...` o `--defaults-extra-file=...`. Después se debe detener la API anterior y arrancar la compilación nueva con las mismas variables de conexión y JWT. La cuenta de la aplicación conserva sus permisos de datos; no necesita ALTER para operar el módulo.

Hasta aplicar esa migración y actualizar la API, la interfaz nueva de Usuarios no puede consultar sus endpoints en 8080. No se presenta la validación aislada como una instalación terminada en la base habitual.
