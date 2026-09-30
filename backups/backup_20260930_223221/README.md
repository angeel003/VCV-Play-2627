# VCV Play 26/27

Bienvenido al repositorio oficial de **VCV Play 26/27**, una aplicación web interactiva diseñada para gestionar una liga de pronósticos (porras) de partidos de voleibol, completamente renovada en su versión V2.

## 🏐 Sobre el Proyecto

Esta aplicación permite a los usuarios registrados (y visitantes en modo invitado) consultar la cartelera de partidos, realizar predicciones de resultados (sets y puntos totales) y competir en clasificaciones dinámicas. Todo el sistema está diseñado para ser rápido, seguro, mobile-first y fácil de administrar sin necesidad de bases de datos tradicionales complejas.

### 🚀 Novedades de la V2
* **Rediseño Completo (Glassmorphism):** Interfaz moderna orientada a dispositivos móviles con menús inferiores nativos, modales integrados y transiciones fluidas.
* **Predicción de Puntos Totales:** Sección secreta para predecir la suma exacta de puntos de un partido.
* **Sistema de Insignias:** Logros y roles visuales (jugadores, entrenadores, directiva) visibles en los perfiles de usuario.
* **Logos de Categorías Dinámicos:** Los partidos cargan automáticamente el logo oficial de la RFEVB / EsVoley según la categoría del encuentro.
* **Intranet de Administrador Integrada:** Los administradores pueden enviar resultados oficiales, sincronizar permisos y añadir usuarios directamente desde la web, sin abrir la base de datos.
* **PWA (Progressive Web App):** Soporte para instalación como aplicación nativa en móviles con Service Workers y archivo Manifest.

### ⚙️ Características Core
* **Modo Invitado:** Acceso de solo lectura para ver la cartelera pública.
* **Cierre Automático:** El sistema bloquea automáticamente los pronósticos 15 minutos antes de la hora oficial de inicio de cada partido.
* **Clasificaciones Dinámicas:** Cálculo automático de puntos proporcionales y exactos, con tendencias de subida/bajada (flechas) y medallas para el podio.
* **Smart Cache System:** Un sistema avanzado de caché en el servidor de Google que garantiza tiempos de carga ultrarrápidos, invalidándose automáticamente solo al detectar nuevas escrituras.

---

## 🛠 Arquitectura Técnica

El proyecto sigue una arquitectura *Serverless* apoyada en el ecosistema de Google Workspace y alojada en Cloudflare Pages:

* **Frontend:** HTML, CSS y JavaScript Vanilla. Diseñado como una Single Page Application (SPA) ultraligera alojada en **Cloudflare Pages**.
* **Backend (API):** Google Apps Script (`script-v2/Código.js`). Actúa como API RESTful recibiendo peticiones POST/GET.
* **Base de Datos:** Google Sheets. Almacena las configuraciones, usuarios, insignias, ligas, partidos, porras y resultados oficiales.

---

## 📂 Estructura del Repositorio

* `index.html` - Interfaz principal del usuario apuntando a Producción.
* `dev.html` - Interfaz para pruebas y desarrollo (apunta a una base de datos clon).
* `script-v2/` - Código backend moderno (`Código.js`) para Google Apps Script.
* `files/` - Assets estáticos (iconos PWA, imágenes corporativas, logos de ligas).
* `backups/` - Historial ordenado cronológicamente de todas las versiones anteriores e iteraciones del código fuente.
* `manifest.json` y `sw.js` - Archivos de configuración PWA para instalación móvil.
* `wrangler.json` - Configuración de despliegue continuo con Cloudflare Pages.

---

## 🚀 Despliegue y Configuración

### 1. Base de Datos y Backend (Apps Script)
1. Crea una hoja de cálculo en Google Sheets con las pestañas requeridas (Usuarios, Partidos, Porras, etc.).
2. Ve a **Extensiones > Apps Script** e introduce el contenido de `script-v2/Código.js`.
3. Haz clic en **Implementar > Nueva implementación** como Aplicación Web (Ejecutar como: Tú, Acceso: Cualquiera).
4. Copia la URL de la aplicación generada.

### 2. Conectar el Frontend
1. Abre `index.html` (o `dev.html`).
2. Modifica la constante `scriptURL` al principio del `<script>` con tu URL de Apps Script.

### 3. Hosting (Cloudflare Pages)
El proyecto está configurado para desplegarse automáticamente al hacer *push* a la rama `main` de GitHub utilizando Cloudflare Pages a través del archivo de configuración `wrangler.json`.

---

## 🐛 Notas de Desarrollo

* **PWA Cache Busting:** El archivo `manifest.json` utiliza sufijos `?v=vX` en el `start_url` para forzar a los dispositivos móviles a refrescar la memoria caché de la aplicación cuando hay actualizaciones grandes.
* **CORS en Apps Script:** El proyecto usa `credentials: 'omit'` en las peticiones `fetch` para evitar el bloqueo por políticas de origen cruzado de Google.
