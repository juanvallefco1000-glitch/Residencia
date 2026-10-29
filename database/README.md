# Base de datos SegurIXT

## Instalación

Desde la raíz del proyecto, con MySQL instalado:

```bash
sudo mysql < database/01_schema.sql
sudo mysql < database/02_seed.sql
```

Para comprobar:

```bash
sudo mysql -e 'USE segurixt_db; SHOW TABLES; SELECT nombre FROM categorias_servicio ORDER BY orden;'
```

No se incluyen credenciales ni usuarios administrativos de ejemplo. La creación de administradores y el hash de contraseñas se implementarán desde el backend. Los servicios de `02_seed.sql` son un conjunto inicial de prueba y deben sincronizarse con los datos actuales del frontend antes de producción.

## Roles y sesiones

Para una base existente con ADMIN/EDITOR aplicar una sola vez `migrations/004_usuarios_lector_version_seguridad.sql`, después de comprobar el esquema, antes del backend actualizado. Añade LECTOR y una versión de seguridad por cuenta sin borrar ni cambiar datos existentes. Véase [procedimiento y pruebas](../USUARIOS_ROLES.md). Hibernate mantiene `ddl-auto=none`; las migraciones no se ejecutan automáticamente al iniciar.
