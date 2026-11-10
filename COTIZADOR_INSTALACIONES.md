# Cotizador de instalaciones

## Estado y puesta en marcha

La ruta pública sigue siendo `/#/cotizacion`, y la administración sigue en
`/#/admin/cotizaciones`. No se han modificado Docker, puertos, proxy ni variables
de entorno. El cotizador exige la API real configurada por el mecanismo existente;
no usa los productos demostrativos del frontend cuando no hay conexión.

1. Revisar y respaldar MySQL 8 antes de aplicar manualmente
   `database/migrations/005_cotizador_instalaciones.sql` sobre la base elegida.
   El archivo **no se ejecuta al iniciar la aplicación**. Requiere el esquema
   existente de productos y categorías. Es una migración de una sola aplicación.
2. Las cuatro tablas nuevas son `cotizador_config`, `cotizador_perfiles`,
   `cotizador_solicitudes` y `cotizador_conceptos`. No se alteran ni importan
   automáticamente `cotizaciones` y `detalles_cotizacion` del SQL original:
   aquellas no tenían implementación Java y sus restricciones no permiten
   conceptos de cable, tarifas o pendientes sin un producto/servicio asociado.
3. En Cotizaciones del panel, configurar la mano de obra, los factores y la
   política fiscal real. Los importes y factores empiezan en NULL, sin tarifas
   de ejemplo. La aplicación de impuestos empieza desactivada y debe revisarla
   la empresa antes de ofrecer presupuestos.
4. Clasificar los productos reales por ID usando «Cargar ficha actual» y
   «Guardar ficha técnica». Revisar/editar los precios de materiales en Productos.
   Un cable clasificado como CABLE tiene precio por **metro lineal**, un conector
   por unidad. No clasificar una bobina o paquete como si su precio fuera unitario.
5. Verificar familias compatibles con información técnica del fabricante. Una
   familia es un grupo de compatibilidad completa aprobado por la empresa:
   protocolo, resolución, entradas, interfaces de almacenamiento y alimentación.
   Compartir la etiqueta IP/ONVIF, por sí solo, no demuestra compatibilidad.
   RECORDER requiere canales positivos. Los productos sin perfil quedan OTHER.

## Cálculo

- El frontend envía IDs, cantidades y características; nunca fija precios,
  impuestos, factores ni totales. Al estimar y al solicitar se consulta nuevamente
  el catálogo activo, incluyendo la actividad de la categoría. Los precios ocultos,
  nulos o sin disponibilidad quedan pendientes, sin revelar el precio privado.
- Se consolidan IDs repetidos; cantidades por producto de 1 a 1000. La longitud
  puede tener dos decimales y las cámaras se limitan a 256.
- Importe de producto = precio actual × cantidad; redondeo HALF_UP a dos decimales.
- Se sugiere un único grabador de familia verificada, con canales >= número de
  cámaras. Se elige la menor capacidad suficiente y, en empate, el menor ID.
  Si el cliente ya eligió grabador, se valida y no se agrega otro por encima.
- Disco compatible: una unidad sugerida, sujeto a revisión de días de grabación,
  capacidad, bitrate y soporte físico. Cable: recorrido total indicado en metros
  lineales. Conectores: dos por cámara, como estimación inicial revisable.
  Los componentes ya seleccionados no se añaden de nuevo; se comprueba familia
  y cantidad mínima. La empresa debe revisar conectores especiales y PoE.
- La superficie es contextual: **100 m² no son 100 m de cable**. Si no se conoce
  el recorrido, cableado queda pendiente; no se deduce del área.
- Mano de obra por cámara = tarifa × factor de dificultad (ALTA) × factor exterior
  (EXTERIOR o MIXTO). Se redondea la tarifa resultante y se multiplica por cámaras.
  El factor exterior se aplica a toda la instalación mixta. Factores normales = 1.
  No hay recargo por superficie ni tarifas ocultas. Un factor especial sin configurar
  deja pendiente la mano de obra.
- Accesorios/alimentación/canalización y almacenamiento requieren valoración
  técnica; se muestran referencias compatibles para revisión. Esto hace que la
  estimación normalmente siga siendo **parcial**, aunque todos los equipos tengan
  precio. No promete instalación completa ni presupuesto definitivo.
- Kits y productos OTHER conservan sus importes seleccionados, pero impiden agregar
  automáticamente más conceptos: su contenido debe verificarse para evitar costos
  duplicados. Si se selecciona un kit junto con componentes sueltos, esos componentes
  quedan pendientes y no se suman hasta confirmar si están incluidos. No se descompone un kit a partir de su nombre o descripción.
- Impuesto = subtotal conocido × tasa configurada, solo si está habilitado. Una
  tasa ausente deja pendiente el impuesto. La base fiscal es el subtotal conocido;
  la configuración presupone precios netos y no implementa tasas distintas por
  concepto ni extracción de IVA ya incluido. Confirmar política fiscal con la empresa.
- `knownTotal` siempre es un total **conocido**, excluye pendientes. Si el impuesto
  es desconocido, también lo excluye. `complete` no equivale a aprobación comercial.

## Historial y seguridad

El guardado es transaccional y usa una lectura consistente REPEATABLE_READ. Guarda
contacto, características, nombre de cada concepto, cantidades, unidad, precio
unitario, importe, pendientes, advertencias, tarifas y configuración fiscal usadas.
Los cambios futuros del catálogo no reescriben esos conceptos. No se necesita
conservar el producto activo para consultar el historial.

No hay lectura pública de solicitudes ni acceso público a datos personales. Los
GET administrativos conservan ADMIN/EDITOR/LECTOR; las escrituras conservan
ADMIN/EDITOR. Se reutilizan JWT y el tratamiento de errores existente. React escapa
los datos mostrados y las consultas SQL usan parámetros. WhatsApp solo abre un
borrador con el resumen, sin enviar mensajes automáticamente ni sustituir el guardado.

Endpoints nuevos:

- GET `/api/productos?q=&page=&size=24`: endpoint público existente utilizado por Equipos.
  `/api/cotizador/productos` queda como ruta anterior, sin uso en la selección pública.
- POST `/api/cotizador/estimar`: cálculo sin persistencia.
- POST `/api/cotizador/solicitudes`: recalcula y guarda, devuelve folio y estimación.
- GET `/api/admin/cotizaciones?page=` y `/{id}`: consulta de solicitudes nuevas.
- GET/PUT `/api/admin/cotizaciones/configuracion`: tarifas y política fiscal.
- GET `/api/admin/cotizaciones/perfiles/{id}` y PUT `/perfiles`: ficha técnica.

## Validación y límites

Pruebas del motor: BigDecimal, canales, compatibilidad, cantidades, impuestos,
precios ausentes, kits, componentes repetidos y separación entre área y cable.
Integración con Spring Security, MockMvc y H2 en memoria: migración auxiliar,
validación HTTP, precios del cliente ignorados, persistencia histórica, precios
ocultos, inactivos y permisos. No se conecta a MySQL compartido.

Comandos desde `backend/segurixt-api`:

```sh
./mvnw -Dtest=QuoteEngineTest,QuoteIntegrationTest test
```

Frontend desde la raíz: `npm test` y `npm run build`.

Pendiente de validación operativa: aplicación manual en MySQL 8 de pruebas,
familias y unidades técnicas reales, tarifas aprobadas, fiscalidad y revisión visual
con dispositivos/navegador conectados a esa instancia. El dashboard general conserva
sus indicadores demostrativos preexistentes; la consulta real está en Cotizaciones.
No se implementan cambios de estado, generación PDF, envío automático de mensajes,
ni importación del histórico legado. Para exposición pública de alto tráfico,
configurar en la infraestructura existente límites de solicitudes y retención de datos
personales según la política de la empresa.

## Archivos de esta implementación

- `src/pages/Cotizacion.jsx`: configurador en tres pasos, desglose y solicitud formal.
- `src/services/quoteService.js`: transporte sin fallback local y formato monetario.
- `src/pages/admin/AdminCotizaciones.jsx`: consulta real, detalle histórico, tarifas y
  buscador de productos para cargar/editar sus perfiles técnicos.
- `src/layouts/AdminLayout.jsx`: identifica Cotizaciones como módulo real.
- `src/styles/public.css` y `src/styles/admin.css`: estilos responsive del cotizador.
- `backend/segurixt-api/src/main/java/com/segurixt/api/quotes/QuoteModels.java`:
  contratos y validación de entrada.
- En esa misma carpeta, `QuoteEngine.java`: cálculo puro;
  `QuoteService.java`: reglas de validación y límites transaccionales;
  `QuoteRepository.java`: consultas parametrizadas y persistencia;
  `QuoteController.java` y `AdminQuoteController.java`: endpoints.
- `backend/segurixt-api/src/main/java/com/segurixt/api/config/SecurityConfig.java`:
  habilita exclusivamente las nuevas rutas públicas de catálogo, cálculo y envío.
- `backend/segurixt-api/src/main/java/com/segurixt/api/controller/AdminProductoErrorHandler.java`:
  reutiliza el manejo seguro de errores para ambos controladores nuevos.
- `backend/segurixt-api/src/test/java/com/segurixt/api/quotes/QuoteEngineTest.java`
  y `QuoteIntegrationTest.java`: cálculo e integración aislada.
- `tests/quotes.test.js`: transporte del cliente y fallo seguro sin API.
- `database/migrations/005_cotizador_instalaciones.sql`: migración manual.
- `COTIZADOR_INSTALACIONES.md`: reglas, configuración y límites operativos.

## Resultados de comprobación

- Suite backend aislada (excluye expresamente las tres clases MySQL `*Test`):
  **67 pruebas aprobadas**, incluyendo 9 del motor y 3 de integración del cotizador.
- `npm test`: **7 archivos de pruebas aprobados**, incluido el cliente del cotizador.
- `npm run build`: compilación Vite correcta.
- `git diff --check`: sin errores de espacios.
- No se ejecutaron migraciones en una base compartida ni despliegues.

## Corrección de acceso al catálogo público

El paso Equipos consultaba `/api/cotizador/productos`. Durante el diagnóstico,
el servidor local en 10002 respondió 401 en esa ruta, mientras que `/api/productos`
respondió 200 sin credenciales y `/api/admin/productos` conservó su 401. El código
fuente ya autorizaba la ruta nueva, por lo que existe una diferencia entre esa
configuración y el servidor en ejecución; la corrección reutiliza el catálogo
público establecido sin requerir cambiar ni relajar permisos administrativos.

`quoteService.js` adapta el DTO público existente (`nombre`, `precio`,
`mostrarPrecio`, paginación) para el cotizador y distingue errores 401, 403, 404,
red y resultados vacíos. `Cotizacion.jsx` presenta carga y reintento, cantidades
antes de agregar y controles para aumentar, disminuir y quitar productos.
`quoteSelection.js` conserva datos informativos de selección y obtiene subtotales
en centavos enteros para evitar errores de punto flotante. La selección permanece
en el estado del componente al cambiar de paso; los pasos siguientes están
bloqueados si la selección está vacía o contiene cantidades inválidas.

El precio de selección es informativo: la solicitud sigue enviando únicamente IDs,
cantidades y características; el backend conserva la autoridad sobre los precios.
No se modificó SecurityConfig para esta corrección ni se agregaron endpoints.

Validación de esta corrección: 7 archivos de pruebas frontend, compilación Vite y
25 pruebas backend (motor, integración del cotizador, autenticación HTTP y controlador
del catálogo) aprobados. Incluye consulta anónima, búsqueda, precios ocultos,
404 de producto inexistente y rechazo de operaciones administrativas sin JWT.
La comprobación HTTP utilizó solo lecturas; no se modificaron registros compartidos.

## Tarjetas e imágenes del cotizador

La API pública existente `/api/productos` incluye `imagenes` mediante la relación
`imagenes_producto`, ordenada por principal, orden e ID. El adaptador del cotizador
conserva esas imágenes, marca, modelo y descripción breve. `ProductImage` se reutiliza
para tarjetas y selección; prioriza la imagen principal, aplica `object-fit: contain`
y carga diferida. El respaldo local es un SVG genérico con «Imagen no disponible»;
no corresponde a un producto ficticio ni se guarda en MySQL.

`productImages.js` resuelve las rutas públicas contra la API o el proxy y conserva
la base de recursos `/Residencia/`. Rechaza protocolos no HTTP, rutas de disco y
rutas privadas conocidas. Spring Boot conserva la validación del nombre UUID y
comprueba que producto y categoría estén publicados antes de servir el archivo.
No se modificó almacenamiento, seguridad, proxy ni configuración de despliegue.

Al repetir Agregar se incrementa la cantidad de una sola línea, hasta 1000 unidades.
Los subtotales preliminares individuales y generales se suman en centavos enteros;
los conceptos sin precio quedan pendientes. La solicitud formal sigue excluyendo
precios del cliente y se recalcula en el backend.

Validación: 8 archivos de pruebas frontend aprobados y compilación correcta;
32 pruebas backend aisladas aprobadas, incluyendo imágenes PNG/JPEG públicas,
catálogo, cotizador y autenticación. `tests/quotes.browser.mjs` verificó lectura
anónima, búsqueda, agregar/incrementar/disminuir/eliminar, conservación entre pasos,
respaldo de imagen y ausencia de desbordamiento a 1440, 768 y 390 px (3/2/1 columnas).
Es una prueba de solo lectura y selección en memoria, sin guardar cotizaciones.

Incidencia de datos existente: de los siete productos consultados, uno tiene una
fotografía registrada, pero su URL devuelve HTTP 404:
`/api/productos/imagenes/a93bdaaa-f92c-45ab-849e-990f7720de46.png`.
El navegador mostró correctamente el respaldo; queda pendiente recuperar o volver
a cargar el archivo original desde el panel con autorización del responsable.
No se alteró ese registro ni se sustituyó la fotografía. Las pruebas aisladas
confirman que los archivos presentes se sirven sin JWT.

## Tema claro y precios públicos

El tema público usa blanco `#FFFFFF`, secciones `#F7F7F7`, textos oscuros y acentos
negro/dorado. Las variables están limitadas a `.app`; el panel mantiene su tema
oscuro. Se ajustaron navegación, menús, pie, formularios, tarjetas, detalle y cotizador.

`ProductPrice` y los adaptadores del catálogo/cotizador comparten `publicSalePrice`
y `formatSalePrice` en `catalogService.js`: precio de venta positivo y finito,
formateado con Intl es-MX/MXN; en otro caso muestran «Consultar precio». El DTO
público y el repositorio del cálculo también consideran cero como precio pendiente.
No se escriben precios ni flags en MySQL. Se conserva `mostrar_precio`: los precios
marcados como no publicados siguen ocultos hasta que la empresa decida publicarlos.
La API ya contiene imagen principal, precio de venta, marca y modelo; no se añadieron
endpoints ni campos privados. Las tarjetas mantienen Ver producto y añaden el enlace
a la ruta existente de Cotización con el ID del producto.

Verificación: 37 pruebas backend aisladas, 8 archivos de pruebas frontend,
`npm run build` y `git diff --check` correctos. Firefox comprobó Inicio, Empresa,
Catálogo, Promociones, Servicios y Cotización a 1440 y 390 px: fondo blanco,
texto oscuro y sin desbordamiento; catálogo y selección presentan el mismo precio.
El recorrido del cotizador se comprobó además a 768 px. El caso de precio numérico
positivo se verifica con fixtures aisladas, sin introducir precios de ejemplo en
producción. Sigue pendiente recuperar la fotografía existente que responde 404.

Archivos de este ajuste: `src/styles/public.css`, `src/components/ProductCard.jsx`,
`src/components/ProductPrice.jsx`, `src/services/catalogService.js`,
`src/services/quoteService.js`, `src/pages/Cotizacion.jsx`,
`backend/segurixt-api/src/main/java/com/segurixt/api/service/ProductoService.java`,
`backend/segurixt-api/src/main/java/com/segurixt/api/quotes/QuoteRepository.java`,
`backend/segurixt-api/src/test/java/com/segurixt/api/service/ProductoServiceTest.java`,
`tests/productCatalog.test.js`, `tests/quotes.browser.mjs` y este documento.

## Diagnóstico de «Consultar precio» y control administrativo

Los productos que el panel identifica como «Oculto» tienen desactivado
`Producto.mostrarPrecio` (`productos.mostrar_precio`, BOOLEAN con valor inicial
FALSE). El precio de venta se guarda en `productos.precio` (DECIMAL), representado
por BigDecimal en Java. Registrar un precio no autoriza su publicación por sí solo.

Recorrido inspeccionado:

- `AdminProductos.jsx` / `AdminProductForm.jsx` y `productAdminService.js` consultan
  GET `/api/admin/productos`, GET `/{id}` y guardan mediante POST o PUT `/{id}`.
- `ProductoRequest` contiene `precio` y `mostrarPrecio`; `AdminProductoService`
  guarda ambos mediante la entidad Producto. El DTO administrativo conserva el
  importe aun cuando esté oculto, para permitir editarlo.
- `ProductoService` publica GET `/api/productos`, GET `/{id}` y GET `/slug/{slug}`:
  solo productos/categorías activos; precio positivo únicamente si está autorizado.
  El DTO público envía precio null y mostrarPrecio false para un importe oculto.
- `catalogService.js` y `quoteService.js` respetan ese DTO; ProductPrice muestra
  «Consultar precio» para null, oculto o inválido y utiliza formato es-MX/MXN para
  precios positivos publicados. El motor de cotización vuelve a consultar la base
  y marca el precio oculto como pendiente, sin cobrar un importe ficticio.

No se encontró un error de mapeo o persistencia de esa bandera: el estado «Oculto»
explica el comportamiento observado. El control existente se ha renombrado a
«Mostrar precio en el catálogo público», con explicación de sus consecuencias.
Se corrigió una incoherencia de validación: un precio cero ya no puede guardarse
como visible (antes se aceptaba aunque la API pública lo tratara como pendiente).
React y ProductoRequest validan esta regla; ocultar el precio conserva su importe.

Para publicar un producto concreto, un usuario autorizado debe entrar a Productos,
Editar, activar «Mostrar precio en el catálogo público» y Guardar producto.
Producto y categoría deben estar activos. No se han activado opciones ni modificado
registros de producción. No hay migración ni cambio de autorización.

Archivos modificados en esta revisión:

- `src/components/admin/AdminProductForm.jsx`: etiqueta, ayuda y validación.
- `src/services/admin/productAdminService.js`: validación comprobable del formulario.
- `src/services/catalogService.js`: mínimo de dos decimales explícito en el formateo.
- `backend/segurixt-api/src/main/java/com/segurixt/api/dto/ProductoRequest.java`:
  exige precio positivo al marcar visible.
- `tests/adminProducts.test.js`: validación y contrato de guardado/lectura.
- `backend/segurixt-api/src/test/java/com/segurixt/api/products/ProductModuleScenario.java`:
  persistencia de flag e importe, ocultación, republicación y rechazo de precio
  cero/nulo sin sobrescribir valores previos.
- Este documento.

Resultados: 70 pruebas backend aprobadas con H2 aislado, excluyendo expresamente
las clases de MySQL externo; 8 archivos de pruebas frontend aprobados;
`npm run build` y `git diff --check` correctos. Las pruebas cubren publicación
anónima, activos/inactivos, ausencia de precio, ocultación, conservación del precio
en base, relectura de la bandera tras editar y uso de precios en el cotizador.
No se ejecutaron pruebas de escritura contra MySQL compartido ni cambios de
visibilidad en los productos del usuario. Activarlos requiere decisión y acción
explícita del responsable; no es necesario modificar código adicional.

## Presupuesto dinámico durante los tres pasos

La causa del panel vacío era que su contenido dependía exclusivamente de una
respuesta del motor, solicitada solo al completar la instalación. Ahora el panel
muestra inmediatamente los equipos desde el mismo estado `items` usado en
«Tu selección». Sus líneas, cantidades y subtotal son cálculos derivados con
useMemo, no una segunda selección persistida en estado.

El desglose separa equipos, adicionales/instalación y resumen. Sin respuesta del
motor, los equipos tienen un total parcial conocido y la instalación/impuestos
permanecen pendientes. No se deduce cableado de los m² ni se calculan tarifas o
impuestos en React. Cuando el servidor responde, se respetan sus precios y sus
conceptos pendientes (incluidas exclusiones por kits); los adicionales se separan
por IDs para no sumar dos veces equipos ya seleccionados.

Cada respuesta se asocia con la configuración exacta enviada. Al cambiar selección
o cualquier campo de instalación se invalida el resultado anterior y se cancela
la consulta obsoleta; una espera de 400 ms agrupa cambios consecutivos. Los equipos
se recalculan visualmente sin esa espera. El envío formal conserva solo IDs,
cantidades y características y Spring Boot vuelve a calcular todos los importes.

Archivos modificados en esta revisión:
`src/pages/Cotizacion.jsx`, `src/services/quoteSelection.js`,
`src/services/quoteService.js`, `src/styles/public.css`, `tests/quotes.test.js`,
`tests/quotes.browser.mjs` y este documento.

Validación: 8 archivos frontend aprobados, compilación Vite correcta y 13 pruebas
backend aisladas (QuoteEngineTest y QuoteIntegrationTest) aprobadas. Firefox
comprobó actualización inmediata, cantidades acumuladas, subtotales, eliminación,
permanencia en los tres pasos y ausencia de desbordamiento en 1440/768/390 px.
Se observaron siete consultas reales de estimación al cambiar superficie, cámaras,
ubicación, dificultad y longitud de cable, sin envío de precios de cliente.

Pendiente externo: el servidor actualmente ejecutándose devuelve HTTP 401 en
POST `/api/cotizador/estimar`, aunque el SecurityConfig del checkout permite ese
endpoint público y las pruebas aisladas pasan. Es necesario revisar la versión y
configuración del backend en ejecución antes de validar tarifas reales de extremo
a extremo. No se reinició ni desplegó el servidor ni se relajaron reglas JWT. La UI
muestra el error y deja instalación/impuestos pendientes; no inventa importes.
La fotografía registrada que responde 404 sigue mostrando el respaldo local.
