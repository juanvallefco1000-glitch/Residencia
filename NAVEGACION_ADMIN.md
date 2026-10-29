# Corrección de navegación y autenticación administrativa

Actualización de autorización: [Usuarios, roles y permisos](USUARIOS_ROLES.md) define ADMIN/EDITOR/LECTOR y sustituye la matriz inicial de dos roles. EDITOR puede crear/editar productos; la baja y el cambio de estado quedan en ADMIN.

## Causa encontrada antes de modificar código

`RequireAdmin` valida `/api/auth/me` al cambiar `location.pathname`. En `authService.validateSession`, el `catch` anterior ejecutaba `update(null)` para **cualquier excepción**, no solo para credenciales rechazadas. Se reprodujo con el cliente original e inyección de respuestas HTTP 403, 503 y error de red: en los tres casos desaparecía una sesión que acababa de iniciar correctamente. Después, `RequireAdmin` veía `session === null` y redirigía a `/admin/login`.

El dashboard usa datos de demostración y puede visualizarse sin consultar productos. Entrar en Productos sí activa consultas reales; además activa la validación por cambio de ruta. Así, poder ver el dashboard no demuestra que las peticiones siguientes a la API estén disponibles.

Había otro comportamiento demasiado amplio: cualquier 401 de un endpoint administrativo borraba inmediatamente la sesión sin comprobar `/api/auth/me`. Un 403 significa falta de permisos, no cierre de sesión; un 503 o fallo de red tampoco demuestra que el JWT haya sido revocado.

El dashboard usa `StatCard → Link`, el menú usa `NavLink`, y las rutas están bajo el mismo `RequireAdmin` y `HashRouter`. No se encontró un `href` externo, `location.assign` o recarga completa en Dashboard → Productos. La prueba Firefox verifica el clic de la tarjeta y que una marca en `window` sobrevive a la navegación.

Esta es una causa reproducida del cliente, no una afirmación de que la instancia desplegada haya devuelto específicamente 503: no se capturó su tráfico real en este trabajo. Si el servidor realmente rechaza el JWT, se sigue requiriendo iniciar sesión.

## Comportamiento corregido

| Situación | Resultado |
|---|---|
| Sin sesión o JWT vencido localmente | Se bloquea la petición protegida y se vuelve al login |
| `/api/auth/me` devuelve 401 | Se elimina la sesión correspondiente y se vuelve al login |
| `/api/auth/me` devuelve 403, 5xx o falla la red | Se conserva la sesión en memoria; la ruta queda bloqueada con error y botón de reintento |
| Productos devuelve 403 | Se muestra error de permisos; no se elimina la sesión |
| Productos devuelve 5xx o falla la red | Se muestra error de carga; no se elimina la sesión |
| Un módulo devuelve 401 y `/api/auth/me` devuelve 200 | Se conserva la sesión y se muestra que esa operación fue rechazada; no se reenvía automáticamente una escritura |
| Un módulo devuelve 401 y `/api/auth/me` también devuelve 401 | Se confirma la invalidez y se vuelve al login |
| Un módulo devuelve 401 y la validación falla temporalmente | No se presupone invalidez; se comunica el fallo de verificación y no se entregan datos de la operación rechazada |
| Respuesta 401 antigua tras otro login | No se elimina la sesión nueva |

Las validaciones simultáneas del mismo token comparten una petición. `AbortError` se conserva como cancelación. Los errores HTTP incluyen `status` mediante `AdminApiError` para distinguir autenticación, autorización y carga.

`RequireAdmin` asocia su validación al token, ruta e intento actuales. No monta el módulo nuevo antes de validar para después desmontarlo y abortar sus consultas. Los errores de verificación ya no se ignoran: bloquean el acceso y permiten reintentar. Se mantienen la validación periódica, la expiración y las restricciones por rol.

No se modificaron Spring Security, endpoints, dashboard, enlaces ni el almacenamiento de tokens. El JWT sigue únicamente en memoria y se envía por `Authorization: Bearer`. Recargar completamente el documento, abrir otra pestaña administrativa o reiniciar la aplicación pierde esa memoria y requiere volver a iniciar sesión; no se añadió almacenamiento persistente para ocultarlo.

El backend conserva un registro de sesiones activas en memoria, además de validar la firma y vencimiento JWT. Reiniciar la API, cerrar sesión o iniciar otra sesión del mismo usuario puede invalidar tokens anteriores. Navegar entre rutas no contiene una operación de revocación. Una prueba HTTP confirma que una indisponibilidad temporal del repositorio produce 503 y que el mismo JWT funciona al recuperarse.

## Archivos modificados

- `src/services/admin/authService.js`: errores tipados; conservación de sesión frente a errores temporales; confirmación de 401 de módulos; deduplicación y protección frente a respuestas antiguas; cancelación preservada.
- `src/components/admin/RequireAdmin.jsx`: validación vinculada a ruta/token; error recuperable sin redirigir al login ni habilitar acceso sin verificar.
- `tests/auth.test.js`: ocho regresiones adicionales, incluyendo navegación del cliente, 401/403/5xx/red, expiración, concurrencia y cancelación.
- `backend/segurixt-api/src/test/java/com/segurixt/api/auth/AuthHttpTest.java`: regresión de indisponibilidad temporal sin revocar el JWT.
- Nuevos `tests/browser/bidiClient.mjs` y `tests/authNavigation.browser.mjs`: prueba de React/HashRouter real en Firefox con una API de pruebas local controlada.
- `NAVEGACION_ADMIN.md`: diagnóstico y procedimiento de verificación.

## Pruebas realizadas

- Frontend: 21 pruebas aprobadas, incluidas 13 de autenticación. Se ejecutaron con `node --test --test-isolation=none tests/*.test.js`, además del comando habitual del proyecto.
- `npm run build`: compilación correcta.
- Firefox real: Dashboard → Productos mediante clic en la tarjeta, sin recarga; presencia de Bearer; token ausente de localStorage/sessionStorage; acceso directo sin sesión; errores 503/403/red al validar con reintento; errores 503/403/401 de productos sin cierre erróneo; 401 confirmado con vuelta al login; acceso EDITOR sin acciones de escritura y redirección de rutas exclusivas de ADMIN.
- Backend: 32 pruebas aprobadas, 0 fallos y 0 errores; incluye la prueba HTTP de JWT y recuperación tras 503 y la suite normal con H2. Se omitieron 7 pruebas MySQL opt-in de trabajos anteriores porque esta corrección no modifica la persistencia ni conecta a una base real.

La automatización Firefox usa una **API simulada solo dentro del proceso de pruebas**; no cambia ni reemplaza la autenticación de la aplicación. La regresión del backend usa `AuthService` y Spring Security reales con el repositorio sustituido en el contexto de test.

## Ejecutar las verificaciones en Linux Mint

Desde la raíz del repositorio, con Node 24 y Firefox disponibles:

```bash
npm ci
node --test --test-isolation=none tests/*.test.js
npm run build
node tests/authNavigation.browser.mjs
```

La prueba de navegador inicia y cierra automáticamente su API local (19081), Vite (15175) y Firefox BiDi (19224), usando un perfil nuevo bajo `/tmp`. Esos puertos deben estar libres; no requiere MySQL, tokens ni contraseñas reales. Puede configurarse `FIREFOX_BINARY` si Firefox no está en PATH.

Pruebas de backend, con Java 21:

```bash
cd backend/segurixt-api
mvn test
```

En el entorno restringido de validación, Mockito necesitó cargarse explícitamente como agente:

```bash
mvn -DargLine="-javaagent:$HOME/.m2/repository/org/mockito/mockito-core/5.23.0/mockito-core-5.23.0.jar" test
```

Para verificar manualmente contra la API habitual, iniciarla con su configuración existente. Desde la raíz del frontend:

```bash
VITE_API_URL=http://localhost:8080 npm run dev
```

1. Abrir `http://localhost:5173/Residencia/#/admin/login`, iniciar sesión y hacer clic en la tarjeta Productos del dashboard. Debe cambiar únicamente el hash de la URL.
2. En Red de las herramientas del navegador, comprobar `/api/auth/me`, `/api/admin/productos` y `/api/admin/productos/categorias`. Las peticiones deben incluir Bearer.
3. Si falla `/api/auth/me` por red/503, debe mostrarse el error con Reintentar validación y mantenerse el hash de la ruta protegida; no debe mostrarse el formulario de login ni contenido administrativo sin validar.
4. Recuperar la conexión y reintentar: no debe pedir de nuevo las credenciales. Un fallo de carga de productos debe quedar en su módulo con opción de reintento.
5. Si `/api/auth/me` responde realmente 401, debe volver al login. Revisar vencimiento, reinicio de la API u otra sesión del mismo usuario; esta corrección no evita una revocación legítima.
6. Verificar con EDITOR que Productos se puede consultar, mientras que las acciones de escritura y rutas exclusivas de ADMIN siguen restringidas.
