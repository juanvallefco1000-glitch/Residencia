# Administración

La autenticación es real y las rutas requieren una sesión validada. El transporte
`authService.js` guarda Bearer JWT exclusivamente en memoria y gestiona login,
validación, expiración y logout con revocación en el backend.

El contenido de `adminService.js` todavía es demostrativo. Los endpoints de su
mapa son contratos futuros bajo `/api/admin/**`; no están implementados ni se
simulan guardados exitosos. EDITOR tiene solo lectura de catálogo, servicios,
promociones y dashboard. Usuarios, empresa y cotizaciones requieren ADMIN.

Consultar [AUTENTICACION_ADMIN.md](../../../AUTENTICACION_ADMIN.md) para configurar
el backend, crear el primer administrador, ejecutar pruebas y revisar límites.
Producción permanece deshabilitada por defecto. No habilitarla sin backend HTTPS
y validación completa. El sitio público mantiene sus fuentes locales cuando no
se configura una API.
