# Administración — etapa 1

Las rutas `/admin/*` son una demostración pública de interfaz, sin autenticación
ni permisos. `Cerrar sesión` vuelve al formulario; no existe una sesión que cerrar.
No cargar información privada en los mocks.

## Lecturas

Las páginas consumen funciones asíncronas de `adminService` a través de
`useAdminData`, que contempla carga, error, reintento y desmontaje. El adaptador
actual devuelve copias de datos de prueba y reutiliza las fuentes públicas sin
modificarlas. No hay persistencia ni escrituras en el sitio público.

| Función | Endpoint previsto |
| --- | --- |
| getDashboard | GET /api/admin/dashboard |
| getProducts | GET /api/productos |
| getCategories | GET /api/categorias |
| getServices | GET /api/servicios |
| getPromotions | GET /api/promociones |
| getQuotes | GET /api/cotizaciones |

Los contratos de empresa y usuarios están pendientes de acordar con el backend.
Los precios, estados, promociones, usuarios y cotizaciones son demostrativos.
Las imágenes faltantes muestran un marcador; no se inventan fotos de productos.
Los totales del dashboard se calculan sobre los datos de prueba para ser coherentes.

## Próxima integración con Spring Boot

1. Definir los DTO, paginación y respuestas de error con la API REST.
2. Sustituir los adaptadores de lectura por solicitudes HTTP y mapear los DTO a
   los modelos de vista actuales. Configurar la URL de API por entorno.
3. Implementar `authService.login(credentials)` con POST /api/auth/login y
   Spring Security + JWT. La implementación actual rechaza siempre y no envía,
   registra ni almacena credenciales. No hay contraseñas ni tokens de prueba.
4. La API debe autorizar cada operación y rol ADMIN/EDITOR. Agregar el manejo
   de 401/403, sesión y cierre de sesión al acordar el contrato de autenticación.
5. Agregar formularios y métodos POST/PUT/PATCH/DELETE después de definir dichos
   contratos. Los controles de esta etapa solo abren avisos; no anuncian guardados
   o eliminaciones exitosos. El formulario de empresa es un borrador en memoria.

No usar localStorage como base de datos ni como control de autorización.
`HashRouter`, la base `/Residencia/` y los componentes públicos permanecen intactos.
