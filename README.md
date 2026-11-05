# VCV Play 26/27 — Valladolid Club Voleibol

Plataforma web oficial y progresiva (PWA) de pronósticos deportivos, cartelera interactiva en vivo, votación de MVP VALCYL, clasificaciones dinámicas, sistema de notificaciones Web Push y comunidad para el **Valladolid Club Voleibol (VCV)**.

---

## 🏐 Descripción General

**VCV Play 26/27** es una aplicación web interactiva diseñada a medida para la masa social, aficionados, jugadores y cuerpo técnico del Valladolid Club Voleibol. 

La plataforma permite seguir el calendario oficial de todas las categorías del club (Superliga 2, Primera Nacional Masculina y Femenina, categorías autonómicas), pronosticar resultados jornada a jornada, participar activamente en la elección del **MVP VALCYL**, consultar clasificaciones en tiempo real con sistema de suspense por congelación, recibir alertas Web Push personalizadas y competir en ligas privadas.

Diseñada bajo una arquitectura Serverless Jamstack de alto rendimiento sobre **Cloudflare Pages** y base de datos relacional distribuida **Cloudflare D1 (SQLite Edge)**, VCV Play garantiza tiempos de respuesta inferiores a 100 ms, soporte de instalación nativa PWA multiplataforma (iOS, Android, PC) y una interfaz gráfica fluida basada en diseño Glassmorphism oscuro.

---

## 🌟 Características Principales

### 📅 Cartelera de Partidos y Seguimiento en Vivo
- **Información completa en tiempo real:** Horarios, pabellones oficiales, categorías (RFEVB / FVBCL / EsVoley), escudos oficiales monocromo y estados del encuentro (*Programado*, *En juego*, *Finalizado*).
- **Cierre automático sincronizado:** Bloqueo automático del formulario de predicciones minutos antes de la hora oficial del saque inicial.
- **Estadísticas y cuotas de la comunidad:** Tendencias y porcentajes de pronósticos de la comunidad en tiempo real para cada encuentro.

### 🎯 Sistema de Pronósticos (Porras Deportivas)
- **Predicción de marcador en sets:** Selección intuitiva de tanteo exacto (3-0, 3-1, 3-2, 2-3, 1-3, 0-3).
- **Diferencia de puntos y desempate:** Pronóstico de puntos totales / margen para romper empates y optar a puntuaciones bonus.
- **Motor de puntuación automatizado:** Algoritmo que premia el acierto del ganador, el tanteo exacto de sets y la aproximación en puntos.

### 🏆 Sistema de Votación MVP VALCYL (Superliga 2)
- **Votación comunitaria de la afición:** Apertura de votaciones tras el pitido final para elegir al mejor jugador/a del partido entre los convocados.
- **Cierre estricto e independiente:** Horario de cierre de votaciones predeterminado (por defecto lunes a las 12:00, configurable desde el panel de control). Una vez alcanzada la hora, la votación queda bloqueada de forma estricta y ningún usuario puede modificar su voto.
- **Proclamación oficial y desacoplamiento:** La publicación del ganador y del desglose oficial de votos se desacopla del cierre (por defecto lunes a las 15:00 o mediante proclamación manual inmediata por el administrador).
- **Generador de Tarjetas Canvas 1080x1080:** Motor gráfico en cliente con HTML5 Canvas para exportar creatividades profesionales en alta resolución con la foto del jugador, dorsal, escudo, estadísticas del partido y marca de agua VALCYL, listas para compartir en Instagram Stories, WhatsApp y Twitter.

### 📊 Clasificaciones, Ligas Privadas y Mecánica de Suspense
- **Ranking Global y Podio:** Visualización de medallas, desglose de puntos por jornada y tendencias de ascenso/descenso.
- **Congelación de Clasificaciones:** Sistema que congela las puntuaciones y puestos durante la disputa de los partidos del fin de semana para mantener la emoción.
- **Descongelación Automática o Manual:** Apertura oficial de clasificaciones definitivas el lunes por la mañana o manualmente por los administradores, notificando automáticamente a los participantes.
- **Ligas Privadas:** Creación y gestión de ligas exclusivas mediante códigos alfanuméricos compartibles para competir entre grupos de amigos o equipos de la cantera.

### 🔔 Sistema de Notificaciones Web Push (VAPID)
- **Tecnología Web Push nativa:** Alertas push estándar para móviles (Android y PWA instalada en iOS 16.4+) y escritorio vía Service Worker, sin requerir tiendas de aplicaciones.
- **Tipos de notificaciones automatizadas:**
  - *Recordatorio de pronósticos:* Aviso 1 hora antes del inicio del partido para no olvidar guardar la porra.
  - *Inicio de votación MVP VALCYL:* Alerta el domingo avisando de la apertura de votaciones de Superliga 2 y de la hora límite (hasta las 12:00).
  - *Aviso de última hora MVP:* Recordatorio 1 hora antes del cierre de votaciones exclusivamente para aquellos usuarios que aún no hayan votado.
  - *Descongelación de clasificaciones:* Notificación cuando las clasificaciones semanales se publican y se actualizan los puestos.
  - *Resultados y reparto de puntos:* Confirmación de liquidación de jornada.
- **Centro de Preferencias de Notificaciones:** Panel en el perfil de usuario donde cada aficionado puede activar o desactivar individualmente cada tipo de aviso o filtrar por equipos de interés.

### 👤 Perfiles de Usuario, Insignias y Comunidad
- Perfiles con avatares personalizados, estadísticas históricas de efectividad y roles asignados (*Directiva*, *Staff técnico*, *Cantera*, *Afición*).
- **Sistema de Insignias y Logros:** Medallas visuales desbloqueables por hitos conseguidos en la plataforma.
- **Buzón de Sugerencias y Reportes:** Canal bidireccional integrado para reportar incidencias técnicas o proponer mejoras a la directiva.

### 🛠️ Intranet de Administración y Control
- Acceso autenticado y protegido por roles (`admin`, `arbitro`).
- Gestión integral de partidos: edición de horarios, pabellones, sets y parciales oficiales.
- Cierre de jornadas y ejecución del motor de recálculo de clasificaciones.
- Panel de control de votaciones MVP (ajuste de horas de cierre, horas de proclamación y publicación de ganadores).
- Control del estado de congelación/descongelación de clasificaciones.
- Monitor de Notificaciones Push con herramientas de prueba, simulación y visualización de logs de envíos.
- Importación/exportación de calendarios en lote mediante hojas de cálculo Excel.

---

## 🏗️ Arquitectura Técnica

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Single Page App)                  │
│  dev.html (Desarrollo Modular) / index.html (Producción PWA)    │
│  Vanilla JavaScript ES6+ (Modularizado en /js)                  │
│  CSS3 Responsive (Glassmorphism, Dark UI #0b132b)               │
│  Service Worker (sw.js) + Web App Manifest                      │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS Fetch (JSON REST)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE SERVERLESS BACKEND                      │
│  Cloudflare Pages Functions (/functions/api/vcv.js)             │
│  • Autenticación & Sesiones con tokens                          │
│  • Control de Partidos, Porras & MVP                            │
│  • Motor de Clasificaciones & Freeze Logic                      │
│  • Web Push Service (VAPID / web-push protocol)                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │ SQL Prepared Statements
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PERSISTENCIA DISTRIBUIDA                      │
│  Cloudflare D1 (Edge SQLite Relational Database)                │
│  Tablas: Usuarios, Partidos, Porras, MVP_Votos, Ligas,          │
│          Push_Subscriptions, Notificaciones_Config, etc.        │
└─────────────────────────────────────────────────────────────────┘
```

- **Frontend Ultra-rápido:** Construido sin dependencias pesadas ni frameworks sobrecargados (React/Angular/Vue), garantizando una carga inmediata de menos de 1 segundo en redes móviles 4G/5G.
- **Backend Edge Serverless:** Desplegado en la red global distribuida de Cloudflare con latencia mínima en toda España.
- **Base de Datos D1:** Consultas SQL preparadas con encriptación, transacciones ACID y protección absoluta contra inyecciones SQL.

---

## 📁 Estructura del Repositorio

| Directorio / Archivo | Responsabilidad |
| :--- | :--- |
| `dev.html` | Entorno principal de desarrollo con carga modular de scripts desde `js/`. |
| `index.html` | Aplicación en producción (`vcvplay.com`). |
| `patros.html` | Espacio dedicado a patrocinadores y colaboradores oficiales del club. |
| `functions/api/vcv.js` | Backend serverless: API REST, controladores D1, autenticación y Web Push. |
| `js/config.js` | Configuración global, endpoints de API, utilidades de fecha y sanitización. |
| `js/admin.js` | Intranet de administración, resultados oficiales, árbitros y congelación. |
| `js/cartelera.js` | Renderizado de partidos, temporizadores de cuenta atrás regresiva y cuotas. |
| `js/cartelera_interactive.js` | Interacción de porras, sets, votación MVP (cierre estricto) y exportador Canvas. |
| `js/ranking.js` | Clasificación general, podio, ligas privadas y desglose de puntos. |
| `js/calendario.js` | Calendario completo de la temporada, buscador y filtros por equipo. |
| `js/push_notifications.js` | Motor Web Push, suscripciones VAPID, banners y preferencias de usuario. |
| `js/ui_gestures.js` | Gestos táctiles móviles, swipe, navegación y registro de Service Worker. |
| `js/auth.js` | Autenticación, auto-login persistente (`localStorage`), roles y perfil. |
| `sw.js` | Service Worker para soporte offline PWA y recepción de eventos `push` / `notificationclick`. |
| `manifest.json` | Manifiesto de aplicación web progresiva (iconos, tema oscuro, modo standalone). |
| `files/images/escudos/` | Catálogo de escudos oficiales normalizados en blanco para fondos oscuros. |
| `archivos_desarrollo/` | Scripts de utilidad (procesamiento de imágenes, exportación de bases de datos). |
| `docs/` | Documentación técnica detallada y guías de arquitectura frontend. |
| `iniciar_local.bat` | Script de inicio automático de desarrollo local con Wrangler. |
| `wrangler.toml` | Configuración de bindings de Cloudflare Pages y base de datos D1. |

---

## 🚀 Entorno de Desarrollo Local

Para arrancar el proyecto localmente emulando con total fidelidad la infraestructura de Cloudflare Pages y la base de datos D1:

1. **Requisitos:**
   - [Node.js](https://nodejs.org/) (versión 18 o superior).
   - [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler` o mediante `npx wrangler`).

2. **Iniciar servidor:**
   ```bash
   # En Windows, doble clic en:
   iniciar_local.bat

   # O por terminal:
   npx wrangler pages dev . --d1 DB=vcv_database
   ```

3. **Acceso en el navegador:**
   - **Desarrollo modular:** `http://localhost:8788/dev.html`
   - **Versión de producción:** `http://localhost:8788/index.html`

---

## 📲 Instalación como App Nativa (PWA)

VCV Play está optimizada para comportarse como una aplicación nativa sin pasar por App Store ni Google Play:

- **En Android (Chrome / Firefox):** Pulsa el botón flotante de instalación en la app o en el menú del navegador `⋮` > *"Añadir a la pantalla de inicio"*.
- **En iOS (iPhone / iPad - Safari):** Pulsa el botón de compartir `Compartir` (icono del recuadro con flecha arriba) y selecciona *"Añadir a la pantalla de inicio"*.
- **En Windows / macOS (Chrome / Edge):** Pulsa en el icono de instalación situado en la parte derecha de la barra de direcciones.

---

## 📄 Licencia y Derechos

Proyecto desarrollado para el **Valladolid Club Voleibol**.  
Todos los derechos reservados © 2026-2027.
