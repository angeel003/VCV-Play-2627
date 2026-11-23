# MAPA DE ARQUITECTURA - FANTASY VCV

Este documento describe la estructura y responsabilidades de los archivos del proyecto para facilitar el mantenimiento y la generacion de codigo eficiente con modelos de IA.

## 1. Backend (Cloudflare Pages Functions & Cloudflare D1)

Ruta base: functions/api/

- functions/api/vcv.js
  Enrutador HTTP principal (POST y GET). Centraliza la autenticacion, login, migraciones de esquema base y delega en los submodulos especializados.

- functions/api/_modules/shared.js
  Utilidades compartidas: jsonResponse, getMadridTimestamp, formatTsToMadridStr, hashPassword (PBKDF2), verifyPasswordHash, flushBatch (db.batch por lotes), runInBg (waitUntil), runInChunks, parseReglasPuntuacion, isSchemaMissingErr, isModoMantenimientoActivo.

- functions/api/_modules/matches.js
  Logica de partidos y escrutinio federativo: formatMatch, save_resultado_admin, get_pronosticos_partido_data, crawlers oficiales RFEVB/Leverade (admin_check_official_schedules, admin_apply_official_schedule_changes, admin_check_official_results, admin_apply_official_results).

- functions/api/_modules/mvp.js
  Logica de votacion y gestion MVP: normalizacion de nombres y dorsales, buildMvpVotesRecuento, vote_mvp, set_mvp_oficial, set_mvp_publicacion_ts, get_mvp_votos_summary, save_plantilla_superliga.

- functions/api/_modules/push.js
  Sistema Web Push nativo (RFC 8291 / RFC 8292): suscripciones multidispositivo, envio de push, crons (recordatorio 2 horas antes de partidos, MVP 1 hora, resumen viernes), broadcastPushToAll, notifyAdminsPush, crearNotificacion, log de notificaciones.

- functions/api/_modules/admin.js
  Gestion de administracion y usuarios: solicitudes de registro y aprobacion, gestion de ligas por usuario, insignias y avatares personalizados, peticiones de cambio de nombre, buzon de sugerencias/errores, monitor silencioso de accesos y estado de mantenimiento.

## 2. Frontend (HTML, CSS y JavaScript)

- index.html
  Documento HTML principal de la aplicacion (SPA). Contiene las secciones y contenedores de cartelera, clasificaciones, calendario, perfil y modales. Carga scripts de forma diferida (defer) y carga dinamica (lazy) de admin.js solo para administradores.

- css/
  - css/app.css: Estilos principales de la aplicacion, componentes, botones, modales y cartelera.
  - css/tokens.css: Variables de diseno y paleta de colores.
  - css/layout.css: Estructuras de rejilla y disposicion de pantallas.
  - css/base.css: Reset y tipografias.
  - css/admin.css: Estilos especificos del panel de administracion.

- js/
  - js/auth.js: Manejo de sesion, login, registro, recuperacion de credenciales y desconexion.
  - js/cartelera.js: Renderizado de tarjetas de partidos, badges de estado y enlaces a actas oficiales.
  - js/cartelera_interactive.js: Eventos interactivos de pronosticos (stepper de puntos, seleccion de sets, modales de votacion MVP).
  - js/ranking.js: Renderizado de tablas de clasificacion de ligas, desempates y vista de podio.
  - js/calendario.js: Vista de calendario completo por jornadas y meses.
  - js/push_notifications.js: Registro de Service Worker, suscripcion a Web Push y gestion de preferencias de notificacion en el perfil.
  - js/admin.js: Interfaz del panel de control de administracion (gestion de usuarios, partidos, horarios, insignias, escrutinio). Se carga bajo demanda para optimizar memoria.
  - js/config.js: Constantes de configuracion cliente y URLs base.
  - js/ui_gestures.js: Gestos tactiles y navegacion movil.

- sw.js
  Service Worker nativo para la recepcion de notificaciones Push en segundo plano y redireccion al hacer clic.
