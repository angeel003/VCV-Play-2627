# VCV Play 26/27 — Valladolid Club Voleibol

Plataforma web progresiva (PWA) oficial de pronósticos deportivos, cartelera interactiva, votación de MVP VALCYL, clasificaciones dinámicas, notificaciones Web Push y comunidad para el **Valladolid Club Voleibol (VCV)**.

---

## Descripción General

**VCV Play 26/27** es una aplicación web diseñada a medida para la masa social, aficionados, jugadores, familias y cuerpo técnico del Valladolid Club Voleibol.

La plataforma permite seguir el calendario oficial de las cinco categorías del club (Superliga Masculina 2, Primera División Nacional Masculina, Primera División Nacional Femenina, Segunda División Masculina FVCyL y Segunda División Femenina Oro FVCyL), pronosticar resultados jornada a jornada, participar en la elección del **MVP VALCYL**, consultar clasificaciones en tiempo real con sistema de congelación de fin de semana, recibir avisos Web Push y competir en ligas privadas.

Construida sobre una arquitectura Serverless Edge con **Cloudflare Pages**, **Cloudflare Pages Functions** y base de datos relacional distribuida **Cloudflare D1 (SQLite Edge)**, ofrece tiempos de respuesta rápidos, instalación como PWA multiplataforma (iOS, Android y escritorio) e interfaz responsive en tema oscuro estilo Glassmorphism.

---

## Características Principales

### Cartelera de Partidos y Seguimiento
- **Información oficial sincronizada:** Fechas, horarios, pabellones, enlaces de streaming, categorías (RFEVB / EsVoley y FVCyL), escudos normalizados y estado del encuentro (*Programado*, *En juego*, *Finalizado*).
- **Ajuste horario peninsular:** Los desplazamientos a las Islas Canarias se registran y muestran en hora peninsular para que el reloj de cuenta atrás y el cierre de pronósticos coincidan con el inicio real del partido en Valladolid.
- **Cierre automático:** Bloqueo automático del formulario de pronósticos al alcanzarse la hora oficial de inicio del partido.
- **Cuotas y tendencias de la comunidad:** Porcentajes agregados de pronósticos de los participantes para cada encuentro.

### Sistema de Pronósticos (Porras Deportivas)
- **Resultado en sets:** Selección directa de marcador exacto (`3-0`, `3-1`, `3-2`, `2-3`, `1-3`, `0-3`).
- **Diferencia de puntos:** Pronóstico de la diferencia acumulada de puntos en el partido y su sentido (a favor o en contra del equipo local).
- **Motor de puntuación configurable (`Reglas_Puntuacion`):**
  - Acierto del equipo ganador: **50 puntos**.
  - Acierto del resultado exacto en sets: **30 puntos**.
  - Aproximación en diferencia de puntos: hasta **80 puntos** al acertar la diferencia exacta, con reparto proporcional dentro de un margen máximo configurable (por defecto 10 puntos de desviación).
  - Multiplicador **Derby x2** en partidos donde el usuario sigue a ambos equipos implicados y bonificación asociada a la participación en el MVP (**10%**).
- **Predicción de temporada:** Pronóstico de puntos totales a final de liga por equipo (bloqueado al iniciarse la competición).

### Sistema de Votación MVP VALCYL (Superliga 2)
- **Votación comunitaria:** Apertura de votaciones tras finalizar el partido para elegir al jugador destacado entre los convocados de la plantilla (`Plantilla_Superliga_2_Masc`).
- **Cierre estricto e independiente:** Hora límite de votación configurable desde la intranet (por defecto lunes a las 12:00). Al superarse la hora, la votación queda bloqueada de forma estricta.
- **Proclamación desacoplada:** La publicación oficial del ganador y el desglose de porcentajes se gestionan por separado (hora programada o proclamación manual por administración).
- **Generador de Tarjetas Canvas:** Exportación en cliente mediante HTML5 Canvas de creatividades en formato cuadrado (1080x1080) y vertical Story (9:16) con foto del jugador, dorsal, escudo, estadísticas y marca de agua VALCYL, listas para compartir en WhatsApp o Instagram.

### Clasificaciones, Ligas Privadas y Congelación
- **Ranking Global, Podio y Tendencias:** Clasificación general con medallas, variación de puestos respecto a la jornada anterior, desglose por jornadas y comparador directo entre usuarios.
- **Congelación de Clasificaciones:** Congelación automática o manual durante el fin de semana para mantener la intriga mientras se disputan los partidos, con descongelación programada o manual desde administración.
- **Ligas Privadas:** Clasificaciones independientes por grupos, equipos o colectivos del club gestionadas mediante configuración de ligas y permisos.
- **Historial, Estadísticas y Wrapped:** Consulta detallada de todas las predicciones pasadas frente a los resultados oficiales, porcentajes de acierto, plenos, insignias de rol y resumen de temporada.

### Registro Público, Acceso y Seguridad
- **Crear cuenta:** Formulario público de registro integrado en la pantalla de acceso. Las nuevas cuentas pueden entrar de inmediato en su sesión, permaneciendo ocultas para el resto de la comunidad hasta su aprobación en la intranet (`Solicitudes_Registro`).
- **Protección anti-bots y anti-abuso:** Trampa honeypot oculta, validación de tiempo mínimo de cumplimentación, límite de frecuencia por IP (máximo 3 registros/IP/hora vía `cf-connecting-ip`) y protección en el borde mediante Cloudflare WAF Rate Limiting.
- **Modo Invitado:** Acceso de solo lectura a la cartelera y calendario sin necesidad de cuenta.
- **Gestión de perfil:** Cambio de contraseña, correo electrónico de contacto, solicitud de cambio de nombre, solicitud de insignias y buzón de sugerencias/reportes.

### Notificaciones Web Push (VAPID)
- **Suscripciones nativas vía Service Worker:** Compatible con Android, escritorio y PWA instalada en iOS 16.4+.
- **Avisos automatizados (crons y eventos):**
  - Recordatorio antes del inicio de partidos para no olvidar la porra (`cron_recordatorio_2horas`).
  - Resumen semanal de cartelera (`cron_resumen_viernes`).
  - Aviso de apertura y recordatorio 1 hora antes del cierre de votación MVP (`cron_recordatorio_mvp_1hora`).
  - Aviso de resultados oficiales y descongelación de clasificaciones.
- **Preferencias individuales:** Cada usuario puede activar o desactivar avisos desde su perfil y consultar el estado de su dispositivo.

### Intranet de Administración
- Acceso protegido por rol (`Admin Web`).
- Introducción y edición de actas oficiales (sets, parciales, enlace de streaming), horarios y pabellones.
- Gestión de solicitudes de registro, usuarios, ligas, permisos por equipo, cambios de nombre, insignias y buzón de sugerencias.
- Control de votaciones MVP (candidatos, horas de cierre y proclamación, publicación manual), gestión de la plantilla de Superliga 2 y congelación de clasificaciones.
- Modo mantenimiento global, monitor de accesos, limpieza de caché, sincronización de partidos oficiales y consola de pruebas/logs de notificaciones Web Push.

---

## Arquitectura Técnica

```text
+-------------------------------------------------------------------+
|                   FRONTEND (Single Page App / PWA)                |
|  dev.html (Desarrollo) / index.html (Producción en vcvplay.com)   |
|  Vanilla JavaScript ES6+ modularizado en /js (carga con defer)    |
|  CSS3 Responsive (Glassmorphism, Dark UI) + feedback háptico      |
|  Service Worker (sw.js) + Web App Manifest (manifest.json)        |
+---------------------------------+---------------------------------+
                                  | HTTPS Fetch (JSON REST /api/vcv)
                                  v
+-------------------------------------------------------------------+
|                     EDGE SERVERLESS BACKEND                       |
|  Cloudflare Pages Functions (/functions/api/vcv.js)               |
|  - Autenticación, sesiones, registro seguro y anti-bots           |
|  - Gestión de partidos, porras, resultados y reglas de puntuación |
|  - Motor de clasificaciones, congelación y caché (Cache_App)      |
|  - Sistema MVP VALCYL y Web Push Service (VAPID)                  |
+---------------------------------+---------------------------------+
                                  | SQL Prepared Statements
                                  v
+-------------------------------------------------------------------+
|                    PERSISTENCIA DISTRIBUIDA                       |
|  Cloudflare D1 (vcv_database — Edge SQLite)                       |
|  Tablas principales: Usuarios, Ajustes, Porras,                   |
|    Resultados_Oficiales, Ligas, Ligas_Config, Ligas_Equipos,      |
|    Permisos_Equipos, Permisos_Secreta, Predicciones_Secretas,     |
|    Insignias, MVP_Votos, Plantilla_Superliga_2_Masc,              |
|    Reglas_Puntuacion, Solicitudes_Registro,                       |
|    Suscripciones_Push_Dispositivos, Notificaciones,               |
|    Log_Notificaciones, Log_Accesos, Cache_App,                    |
|    Peticiones_Insignias, Peticiones_Nombre, Sugerencias_Errores   |
+-------------------------------------------------------------------+
```

- **Frontend ligero sin frameworks:** Scripts Vanilla JS cargados de forma diferida (`defer`) con control de caché por versión (`?v=...`).
- **Backend Edge:** Un único endpoint Cloudflare Pages Function en `/api/vcv` con consultas SQL preparadas, hash seguro de contraseñas y validación de permisos en servidor.
- **Esquema `Porras` optimizado:** Almacena `Equipo_Local` y `Equipo_Visitante` directamente junto al pronóstico, sin columnas redundantes de rival ni ubicación.

---

## Estructura del Repositorio

| Directorio / Archivo | Responsabilidad |
| :--- | :--- |
| `index.html` | Entrada de producción (`vcvplay.com`) con estructura HTML, modales, estilos y carga modular de `js/`. |
| `dev.html` | Entorno de pruebas y desarrollo antes de promocionar cambios a producción. |
| `patros.html` | Página independiente de patrocinadores y colaboradores oficiales del club. |
| `functions/api/vcv.js` | Enrutador principal HTTP, middleware de autenticación y micro-caché D1 (~1.650 líneas). |
| `functions/api/_modules/shared.js` | Utilidades compartidas: hashing PBKDF2/SHA-256, CORS, sanitización y respuestas JSON. |
| `functions/api/_modules/matches.js` | Lógica de partidos: consulta, formateo por ligas y recálculo automático de porras. |
| `functions/api/_modules/mvp.js` | Módulo de MVP: estadísticas de jugadores, votos de jornada y rankings. |
| `functions/api/_modules/push.js` | Notificaciones Web Push: cifrado RFC 8291 / ECDH P-256, firmas VAPID y cola de envíos. |
| `functions/api/_modules/admin.js` | Endpoints de administración: gestión de usuarios, ligas, actas, ajustes de partidos y auditoría. |
| `js/config.js` | Configuración global, endpoint `/api/vcv`, `fetchSeguro`, formato de fechas y utilidades. |
| `js/admin.js` | Intranet de administración: actas, horarios, solicitudes, ligas, MVP y push (carga diferida bajo demanda). |
| `js/cartelera.js` | Renderizado de tarjetas de partidos, relojes de cuenta atrás y pronósticos de temporada. |
| `js/cartelera_interactive.js` | Interacción de porras, votación MVP, comparador, Wrapped y generador de tarjetas Canvas. |
| `js/ranking.js` | Historial de partidos del usuario, estadísticas personales y filtros por jornada/equipo. |
| `js/calendario.js` | Calendario anual completo de la temporada con buscador y filtros por categoría/equipo. |
| `js/auth.js` | Autenticación, auto-login (`localStorage`), registro "Crear cuenta", modo invitado y perfil. |
| `js/push_notifications.js` | Motor Web Push VAPID, gestión de suscripciones, soporte iOS PWA y preferencias de avisos. |
| `js/ui_gestures.js` | Navegación inferior móvil, gestos táctiles (swipe) y registro del Service Worker. |
| `sw.js` | Service Worker para caché PWA y recepción de eventos `push` y `notificationclick`. |
| `manifest.json` | Manifiesto PWA (iconos, colores, orientación y modo standalone). |
| `files/` | Recursos estáticos: escudos oficiales, fotos de plantillas, avatares y gráficos del club. |
| `sql/` | Esquemas SQL de referencia, índices y volcados de respaldo de D1. |
| `docs/` | Documentación funcional, arquitectura técnica, hoja de ruta de correo y registro de cambios. |
| `ARQUITECTURA_FRONTEND.md` | Guía de arquitectura y flujo de carga del frontend (espejada en `docs/`). |
| `iniciar_local.bat` | Script para levantar el servidor local de desarrollo con Wrangler. |
| `wrangler.toml` | Configuración de Cloudflare Pages y binding `DB` de la base de datos D1. |

---

## Entorno de Desarrollo Local

Para ejecutar la plataforma localmente emulando Cloudflare Pages y Cloudflare D1:

1. **Requisitos:**
   - [Node.js](https://nodejs.org/) (v18 o superior).
   - [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler` o mediante `npx wrangler`).

2. **Arrancar servidor local:**
   ```bash
   # En Windows, doble clic en:
   iniciar_local.bat

   # O desde terminal:
   npx wrangler pages dev . --d1 DB=vcv_database
   ```

3. **URLs locales:**
   - **Entorno de desarrollo:** `http://localhost:8788/dev.html`
   - **Entorno de producción local:** `http://localhost:8788/index.html`

---

## Instalación como App (PWA)

VCV Play puede instalarse directamente en el dispositivo sin necesidad de tiendas de aplicaciones:

- **Android (Chrome / Edge / Firefox):** Pulsa el aviso de instalación en la app o el menú del navegador y selecciona *"Añadir a la pantalla de inicio"* / *"Instalar aplicación"*.
- **iOS / iPadOS (Safari):** Pulsa el botón *Compartir* y selecciona *"Añadir a la pantalla de inicio"*. Nota: en iOS, la instalación en pantalla de inicio es requisito de Apple para activar las notificaciones Web Push.
- **Windows / macOS (Chrome / Edge):** Pulsa el icono de instalación situado en el extremo derecho de la barra de direcciones.

---

## Documentación Adicional

- [Guía de uso de VCV Play](docs/GUIA_VCV_PLAY.md)
- [Mapa de Arquitectura del Sistema](MAPA_ARQUITECTURA.md)
- [Arquitectura del Frontend](ARQUITECTURA_FRONTEND.md)
- [Resumen de Arquitectura Técnica y API](docs/RESUMEN_ARQUITECTURA_FANTASY_VCV.md)
- [Plan de Correo Propio, Recuperación y Turnstile](docs/PLAN_CORREO_RECUPERACION_Y_REGISTRO.md)
- [Registro de cambios (Changelog)](docs/changelog.txt)

---

## Licencia y Derechos

Proyecto desarrollado para el **Valladolid Club Voleibol**.  
Todos los derechos reservados (c) 2026-2027.
