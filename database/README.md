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
