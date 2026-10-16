# Integración pública de servicios

Iniciar MySQL con `segurixt_db` y la configuración privada existente del backend.
Desde la raíz, ejecutar en terminales separadas:

```sh
mvn -f backend/segurixt-api/pom.xml spring-boot:run
npm run dev -- --host localhost --port 5173
```

Abrir `http://localhost:5173/Residencia/`. `.env.development` configura localhost:8080;
una `.env.local` puede sobrescribirlo. No colocar secretos en variables Vite.

publicApi centraliza fetch, errores y AbortSignal. usePublicServices consulta
ambos endpoints, cancela al desmontar y conserva el catálogo local durante la
carga o si falla la API. El adaptador asocia por categoriaId y deduplica por slug.
Conserva el orden de las cuatro categorías, iconos, aliases y rutas locales.
Los nombres válidos de API prevalecen; los slugs permiten recuperar nombres
locales ausentes y ubicar servicios en los grupos existentes. Las descripciones
vacías de categoría usan los datos locales disponibles. El catálogo local no
contiene imágenes ni descripciones individuales: no se inventan esos campos;
los valores de API quedan conservados en records. Las tarjetas usan iconos.

En producción, sin URL configurada se usa el catálogo local. También se ignoran
URLs HTTP o de localhost, incluso heredadas de .env.local. GitHub Pages no está
conectado a MySQL. Una futura API HTTPS requiere configurar VITE_API_URL y
autorizar explícitamente el origen del frontend en CORS antes de reconstruir.

Spring Security permite GET a health, categorías y servicios; el resto queda
denegado. CORS admite localhost:5173 y 127.0.0.1:5173. El panel frontend conserva
su demostración pública preexistente, sin autenticación real ni escrituras al
backend. La protección efectiva actual está en los endpoints del backend.

Verificaciones: build de Vite, clean compile con Java 21, diff --check, cuatro
categorías y 25 servicios reales (8/6/5/6), asociación mediante el adaptador,
CORS local correcto, preflight 200, health 200, origen ajeno 403, GET
administrativo 403 y POST servicios 403. No se ejecutó una prueba visual ni
automatización de clics en navegador; se conservaron componentes y enlaces.

El SQL de semillas incluido solo declara cinco servicios; no reproduce por sí
solo los 25 observados en MySQL local. No recrear tablas para esta integración.
