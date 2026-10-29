# Restablecer la contraseña de un administrador

Requiere Java 21, Maven y MySQL disponible con el esquema existente. La herramienta usa la misma configuración de conexión que `CreateAdmin` (`application.properties` y variables de entorno). No requiere el secreto JWT porque no carga `AuthService` ni el servidor web.

Desde una terminal de Linux Mint, compilar y ejecutar:

```bash
cd /home/juanvalle/Documentos/Residencia/segurixt-frontend-arquitectura/backend/segurixt-api
java -version
mvn clean test package
mvn dependency:build-classpath -Dmdep.includeScope=runtime -Dmdep.outputFile=target/runtime-classpath.txt

read -r -p 'Usuario MySQL: ' DB_USERNAME
export DB_USERNAME
read -r -s -p 'Contraseña MySQL: ' DB_PASSWORD
printf '\n'
export DB_PASSWORD

java -cp "target/classes:$(cat target/runtime-classpath.txt)" com.segurixt.api.tools.ResetAdminPassword
unset DB_PASSWORD
```

Si MySQL usa otra dirección o base, exportar `SPRING_DATASOURCE_URL` antes de ejecutar Java. Si las credenciales ya están exportadas, omitir los comandos `read` correspondientes.

Introducir `admin@gmail.com` cuando solicite el correo. La nueva contraseña y su confirmación se leen mediante `System.console().readPassword()`, sin eco. Debe tener al menos 14 caracteres Unicode y ocupar como máximo 72 bytes UTF-8; no se recorta ni normaliza la contraseña. No pasar argumentos ni redirigir la entrada: sin terminal interactiva la herramienta finaliza con código 1 antes de conectar a MySQL.

Solo actualiza `passwordHash` de un ADMIN activo existente, dentro de una transacción, usando BCrypt con coste 12. No crea usuarios, no arranca HTTP y no carga las reglas de Spring Security. Devuelve código 0 tras confirmar la transacción; los errores devuelven código 1 sin imprimir excepciones, contraseñas ni hashes.

Las pruebas usan H2 y el `AuthService` real: comprueban persistencia, login con la contraseña nueva, HTTP 401 en el servicio para la anterior, conservación de los demás campos, rechazo de usuarios inexistentes/inactivos/EDITOR y límites de longitud UTF-8.

```bash
mvn -Dtest=ResetAdminPasswordTest test
```

El cambio de contraseña no revoca por sí mismo tokens ya emitidos. Para invalidar las sesiones en memoria existentes, reiniciar la instancia de la API.

## Diagnóstico de persistencia y conexión

El mapeo JPA usa acceso a campos (`@Id` sobre el campo) y `passwordHash` apunta a `password_hash`, sin `updatable=false`. `TransactionTemplate` abre una transacción de escritura; con una entidad administrada, modificar el campo y ejecutar `flush()` ya debería persistir. Las pruebas con H2 no reproducen el fallo informado. Cambiar a `saveAndFlush()` hace explícito el guardado, pero por sí solo no demuestra que `flush()` fuera la causa.

Ahora la CLI confirma la transacción, vuelve a consultar por ID en otra transacción y comprueba BCrypt antes de anunciar éxito. Muestra el ID afectado y la identidad MySQL (base, servidor y puerto), nunca la URL JDBC completa, credenciales ni el hash. Un fallo al verificar después del commit devuelve error, pero no deshace un commit que ya ocurrió.

API y herramienta cargan `src/main/resources/application.properties`; el valor por defecto es `jdbc:mysql://localhost:3306/segurixt_db`. Pueden diferir por directorio de ejecución, configuración externa, perfiles, `SPRING_DATASOURCE_URL`, `SPRING_APPLICATION_JSON`, opciones JVM o argumentos de la API. El perfil de la herramienta es `reset-admin-password`. Ejecutar ambos desde el mismo directorio y con la misma configuración de datasource; si la API usa una URL explícita, exportar exactamente esa URL como `SPRING_DATASOURCE_URL` en la terminal de la herramienta. No copiar opciones que incluyan contraseñas en registros o mensajes.

Desde la conexión que utiliza la API, comprobar sin seleccionar hashes:

```sql
SELECT DATABASE() AS base, @@hostname AS servidor, @@port AS puerto;
SELECT id, email, rol, activo, fecha_creacion, fecha_actualizacion
FROM usuarios WHERE email = 'admin@gmail.com';
```

Comparar estos valores con el destino e ID mostrados por la herramienta. En el esquema del repositorio, `fecha_actualizacion` la mantiene MySQL con `ON UPDATE CURRENT_TIMESTAMP`; no hace falta mapearla en JPA. Si las fechas no cambian en la misma instancia tras una actualización confirmada, comprobar también `SHOW CREATE TABLE usuarios` para verificar que el esquema desplegado conserva esa cláusula. Una fecha sin cambios no identifica por sí sola la causa.

## Prueba opcional con MySQL real

La suite normal conserva las pruebas H2 de commit y rechazo de la clave anterior. `ResetAdminPasswordMySqlTest` requiere un MySQL de pruebas y un ADMIN activo ya existente. No crea ni elimina usuarios ni tablas: actualiza dentro de una transacción que Spring Test revierte al terminar. Limpia el contexto JPA y lee `password_hash` directamente por JDBC para comprobar BCrypt y el login. Esta prueba comprueba la escritura y relectura MySQL antes del rollback; el commit y la relectura posterior se comprueban en la CLI y en las pruebas H2.

```bash
export MYSQL_RESET_TEST_URL='jdbc:mysql://localhost:3306/segurixt_test'
read -r -p 'Usuario MySQL de pruebas: ' MYSQL_RESET_TEST_USERNAME
export MYSQL_RESET_TEST_USERNAME
read -r -s -p 'Contraseña MySQL de pruebas: ' MYSQL_RESET_TEST_PASSWORD
printf '\n'
export MYSQL_RESET_TEST_PASSWORD
read -r -p 'Correo del ADMIN existente de pruebas: ' MYSQL_RESET_TEST_EMAIL
export MYSQL_RESET_TEST_EMAIL
mvn -Dtest=ResetAdminPasswordMySqlTest test
unset MYSQL_RESET_TEST_PASSWORD
```

No usar la base de producción para esta prueba. Si no se configura `MYSQL_RESET_TEST_URL`, se omite automáticamente.

La versión actual requiere la migración `database/migrations/004_usuarios_lector_version_seguridad.sql`: el reset incrementa `version_seguridad` y los tokens anteriores quedan invalidados en el siguiente acceso.
