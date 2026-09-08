# SegurIXT - Arquitectura inicial del frontend

Esta versión reorganiza el proyecto con una arquitectura por componentes, páginas y datos.

## Estructura

```text
src/
├── assets/
│   └── segurixt-logo-oficial.jpeg
├── components/
│   ├── Footer.jsx
│   ├── Navbar.jsx
│   ├── ProductCard.jsx
│   ├── ServiceIcon.jsx
│   ├── ServiceCard.jsx
│   └── WhatsAppFloat.jsx
├── config/
│   └── company.js
├── services/
│   ├── catalogService.js
│   └── serviceCatalogService.js
├── data/
│   ├── products.js
│   └── services.js
├── pages/
│   ├── Catalogo.jsx
│   ├── CatalogoCategoria.jsx
│   ├── Contacto.jsx
│   ├── Cotizacion.jsx
│   ├── Empresa.jsx
│   ├── Home.jsx
│   ├── NotFound.jsx
│   ├── Producto.jsx
│   ├── Promociones.jsx
│   ├── ServicioCategoria.jsx
│   └── Servicios.jsx
├── App.jsx
├── main.jsx
└── styles.css
```

## Rutas

- `/`
- `/empresa`
- `/servicios`
- `/servicios/seguridad-videovigilancia`
- `/servicios/redes-telecomunicaciones`
- `/servicios/energia-instalaciones`
- `/servicios/automatizacion-soporte`
- `/catalogo`
- `/catalogo/videovigilancia`
- `/catalogo/redes-telecomunicaciones`
- `/catalogo/alarmas-control`
- `/catalogo/energia-accesorios`
- `/producto/:id`
- `/promociones`
- `/cotizacion`
- `/contacto`

## Ejecutar en Linux Mint

Si ya tienes Node.js y npm mediante NVM:

```bash
cd segurixt-frontend-arquitectura
npm install
npm run dev
```

Abre en el navegador la dirección que muestre Vite, normalmente:

```text
http://localhost:5173/
```

## Enfoque de esta versión

La página principal ahora presenta información general de la empresa:
- descripción;
- objetivo;
- enfoque;
- cuatro categorías principales de servicios;
- productos destacados;
- valores;
- acceso a cotización.

Los menús **Servicios** y **Catálogo** incluyen submenús y rutas independientes.

## Cuatro categorías de servicios

1. Seguridad y videovigilancia.
2. Redes y telecomunicaciones.
3. Energía e instalaciones.
4. Automatización y soporte tecnológico.

## Próximos pasos

1. Validar diseño y textos con el cliente.
2. Sustituir contenido demostrativo por información definitiva.
3. Crear backend Spring Boot.
4. Diseñar API REST.
5. Crear modelo MySQL.
6. Conectar catálogo y cotizaciones al backend.
7. Agregar autenticación para el panel administrativo.
8. Integrar APIs de proveedores y tareas de sincronización.

## Fase 1: preparación del frontend

- `src/config/company.js` es la fuente de nombre, teléfono, WhatsApp, correo,
  ubicación y textos institucionales. Se conserva la marca SegurIXT del sitio;
  el correo es `null` hasta que se defina. Las variantes de textos de Inicio y
  Empresa se conservan para evitar cambios de contenido.
- Vite utiliza esa configuración para el título y la descripción de `index.html`,
  tanto en desarrollo como en el build. Los cambios de configuración requieren
  una nueva compilación para publicarse.
- `src/data/` contiene únicamente datos serializables de demostración, sin React
  ni iconos. `ServiceIcon` resuelve los iconos en la capa visual.
- Las páginas y el Navbar consultan `src/services/`; solo esos adaptadores
  importan los datos locales. No hay solicitudes HTTP ni endpoints inventados.
- Los adaptadores son **síncronos en esta fase**. Al acordar la API REST habrá
  que implementar el cliente HTTP y migrar sus consumidores a carga asíncrona,
  con estados de carga, error, vacío y cancelación. No basta con sustituir un
  arreglo por `fetch` sin adaptar esos consumidores.
- No se implementó persistencia: el formulario de cotización sigue siendo una
  demostración y no envía solicitudes.

### Navegación accesible

Los textos Servicios y Catálogo conservan sus enlaces. El botón de flecha
adyacente abre o cierra las categorías con clic, toque, Enter o Espacio.
El menú informa su estado con `aria-expanded` y relaciona cada botón con su panel.
Tab permite recorrer enlaces; Escape cierra primero el submenú y devuelve el
foco a su botón, y otro Escape cierra el menú móvil. También se cierran al
navegar, al salir con el foco, al pulsar fuera y al cambiar entre móvil/escritorio.
En escritorio se conserva la apertura al pasar el ratón; en móvil el panel
permite desplazamiento vertical cuando no cabe en la pantalla.

### Comprobación

```bash
npm run build
```

Comprobar también en navegador: menú a 320 px y 850 px, escritorio a 851 px o
más, Tab/Shift+Tab, Enter/Espacio, Escape, clic exterior, atrás/adelante y cambio
de tamaño con el menú abierto. Recorrer categorías, productos válidos e
inexistentes, cotización y WhatsApp. El diseño y las rutas públicas se conservan.
