# VCV Play 26/27 — Valladolid Club Voleibol

Plataforma web oficial y progresiva (PWA) de pronósticos, cartelera deportiva, votación de MVP y comunidad para el **Valladolid Club Voleibol (VCV)**.

---

## Descripción General

**VCV Play 26/27** es una aplicación web interactiva diseñada para la comunidad de aficionados, jugadores y cuerpo técnico del Valladolid Club Voleibol. Permite seguir el calendario oficial de los equipos del club (Superliga 2, Primera Nacional, etc.), realizar pronósticos deportivos jornada a jornada, votar al MVP de cada partido, consultar estadísticas y clasificaciones en tiempo real, y competir tanto a nivel global como en ligas privadas entre amigos o equipos.

Desarrollada bajo una arquitectura Jamstack/Serverless sobre **Cloudflare Pages** y base de datos relacional **Cloudflare D1 (SQLite)**, la plataforma ofrece tiempos de respuesta instantáneos, soporte de instalación nativa PWA en dispositivos móviles y una experiencia de usuario fluida con diseño Glassmorphism.

---

## Características Principales

### Cartelera de Partidos y Seguimiento en Vivo
- **Visualización en tiempo real:** Horarios, pabellones, categorías (RFEVB / EsVoley), escudos y estados de los encuentros (programado, en juego, finalizado).
- **Cierre automático:** Bloqueo de pronósticos minutos antes del inicio oficial.
- **Cuotas y porcentajes:** Muestra de tendencias de la comunidad sobre las predicciones de cada partido.

### Sistema de Pronósticos (Porras)
- Predicción de sets (marcador exacto: 3-0, 3-1, 3-2, etc.).
- Predicción de puntuación total para desempate y puntuación bonus.
- Cálculo automático de puntos por acierto de ganador, sets exactos y aproximación.

### Sistema MVP VALCYL
- **Votación interactiva:** Elección comunitaria del mejor jugador/a del encuentro tras la finalización del partido.
- **Proclamación oficial:** Reconocimiento de los galardonados de la jornada.
- **Generador de Tarjetas para Redes Sociales:** Motor Canvas 1080x1080 para exportar imágenes con estética profesional, foto del jugador, escudo, marca de agua de VALCYL y detalles del partido listas para compartir en Instagram Stories, WhatsApp y Twitter.

### Clasificaciones y Ligas Privadas
- **Ranking Global Dinámico:** Podio destacado, medallas, tendencias de ascenso/descenso y desglose interactivo de puntos por jornada para cada usuario.
- **Ligas Privadas:** Creación y unión mediante códigos de acceso exclusivos para competir en grupos cerrados.

### Perfiles de Usuario y Comunidad
- Tarjetas de perfil con avatares, estadísticas de efectividad histórica y roles (directiva, staff, cantera, afición).
- **Sistema de Insignias:** Reconocimientos y logros visuales desbloqueables.
- **Buzón de Sugerencias y Reportes:** Canal directo para que los usuarios informen de incidencias o propongan mejoras.

### Intranet de Administración
- Panel protegido para administradores del club.
- Gestión de partidos: creación, modificación y publicación de resultados oficiales.
- Cierre de jornadas y ejecución del motor de cálculo y reparto de puntos.
- Herramienta de proclamación de MVPs y generación de creatividades.
- Importación/exportación masiva de calendarios desde plantillas Excel.
- Visualización y gestión de sugerencias y reportes de la comunidad.

---

## Arquitectura Técnica

```
├── Frontend (Client-Side)
│   ├── Vanilla JavaScript (ES6+ Modular)
│   ├── CSS3 Responsive (Mobile-First, Glassmorphism UI)
│   └── PWA (Service Worker + Web App Manifest)
│
├── Edge Backend (Serverless)
│   └── Cloudflare Pages Functions (/functions/api/vcv.js)
│
└── Base de Datos
    └── Cloudflare D1 (Serverless Edge SQLite)
```

- **Frontend:** Single Page Application (SPA) ultraligera sin frameworks pesados, garantizando máxima velocidad de carga en dispositivos móviles y bajo consumo de datos.
- **API & Backend:** Cloudflare Pages Functions ejecutadas en la red global de Cloudflare Edge. Arquitectura RESTful con endpoints para autenticación, pronósticos, partidos y administración.
- **Persistencia:** Base de datos Cloudflare D1 estructurada en tablas relacionales (`Usuarios`, `Partidos`, `Porras`, `Ligas`, `Insignias`, `Sugerencias_Errores`, etc.).
- **Seguridad:** Encriptación y hashing de credenciales, tokens de sesión y consultas parametrizadas (Prepared Statements) para prevenir inyecciones SQL.

---

## Estructura del Repositorio

| Directorio / Archivo | Descripción |
| :--- | :--- |
| `index.html` | Aplicación principal en producción (PWA). |
| `dev.html` | Entorno de desarrollo y pruebas pre-despliegue. |
| `patros.html` | Página de patrocinadores y colaboradores del club. |
| `functions/api/vcv.js` | Backend serverless: API REST y controladores Cloudflare D1. |
| `js/` | Módulos JavaScript frontend (`app.js`, `cartelera.js`, `pronosticos.js`, `ranking.js`, `ligas.js`, `perfil.js`, `admin.js`, `config.js`). |
| `files/` | Recursos multimedia: escudos oficiales, fotos de jugadores, iconos PWA, fuentes tipográficas y APK. |
| `docs/` | Documentación técnica adicional, diagramas de arquitectura y changelog. |
| `datos_importacion/` | Hojas de cálculo Excel de referencia para carga de calendarios oficiales. |
| `manifest.json` / `sw.js` | Configuración de Progressive Web App y caché offline. |
| `wrangler.toml` | Configuración de enlaces y bindings de Cloudflare Pages y base de datos D1. |
| `iniciar_local.bat` | Script de arranque rápido para desarrollo en entorno local con Wrangler. |

---

## Desarrollo Local

Para ejecutar el proyecto localmente emulando el entorno de Cloudflare Pages y la base de datos D1:

1. **Requisitos previos:**
   - Node.js instalado (v18 o superior).
   - Wrangler CLI (`npm install -g wrangler` o mediante `npx wrangler`).

2. **Iniciar servidor de desarrollo:**
   ```bash
   # Opción 1: Ejecutar el script incluido
   iniciar_local.bat

   # Opción 2: Mediante Wrangler CLI
   npx wrangler pages dev . --d1 DB=vcv_database
   ```

3. Abrir en el navegador:
   - `http://localhost:8788/dev.html` (Entorno de desarrollo)
   - `http://localhost:8788/index.html` (Versión principal)

---

## Instalación como App (PWA)

VCV Play es instalable directamente desde el navegador en cualquier smartphone (iOS / Android) o PC:
1. Accede a la URL de la aplicación desde Chrome, Safari o el navegador que utilices.
2. Pulsa en **"Añadir a la pantalla de inicio"** o en el icono de instalación en la barra del navegador.
3. Se creará un acceso directo con apariencia y comportamiento de aplicación nativa.

---

## Licencia y Créditos

Proyecto desarrollado para el **Valladolid Club Voleibol**.  
Todos los derechos reservados © 2026-2027.
