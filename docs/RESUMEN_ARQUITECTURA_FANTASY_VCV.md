# Documentación Técnica y Arquitectura — VCV Play 26/27

Este documento resume la arquitectura actual de **VCV Play 26/27 (Fantasy VCV)** en producción sobre Cloudflare Pages y Cloudflare D1, tras la migración completa desde la primera versión en Google Apps Script / Google Sheets.

---

## 1. Stack Tecnológico Actual

- **Frontend:** Vanilla HTML5, CSS3 y JavaScript ES6+ sin frameworks externos. Implementado como **PWA** (Progressive Web App) mediante `manifest.json` y `sw.js`.
  - Tanto `dev.html` (desarrollo/staging) como `index.html` (producción en `vcvplay.com`) cargan los módulos JS situados en `js/` mediante `<script defer src="js/...?v=...">`, asegurando la disponibilidad universal de utilidades globales como `getCategoryHTML`.
- **Backend / API:** **Cloudflare Pages Functions** modularizado en `functions/api/vcv.js` y subdirectorio `functions/api/_modules/` (`shared.js`, `matches.js`, `mvp.js`, `push.js`, `admin.js`), expuesto en el endpoint `/api/vcv` para peticiones `POST` en formato JSON con micro-caché en memoria en el borde.
- **Base de Datos:** **Cloudflare D1 (`vcv_database`)**, base de datos relacional SQLite distribuida en el borde con consultas parametrizadas (`db.prepare(...).bind(...)`) e índices dedicados.
- **Notificaciones:** **Web Push API** con claves VAPID gestionadas desde el backend y Service Worker (`sw.js`).
- **Seguridad perimetral:** Cloudflare Proxy, Cloudflare WAF Rate Limiting, hash seguro de contraseñas, honeypot, detección de envíos sub-segundo y límite de frecuencia por IP en registros públicos.

---

## 2. Estructura de la Base de Datos (Cloudflare D1)

La base de datos `vcv_database` contiene las siguientes tablas principales:

### Núcleo de usuarios, permisos y ligas
- **`Usuarios`**: Credenciales (`Usuario`, `Password` hasheada), `Nombre_Real`, `Correo`, `Admin_Web`, `Avatar`, `Ultimo_Acceso`, estado de visibilidad/aprobación y metadatos de perfil.
- **`Solicitudes_Registro`**: Registro de altas solicitadas desde "Crear cuenta", control de IP/timestamp y estado de aprobación administrativa.
- **`Ligas` / `Ligas_Config` / `Ligas_Equipos`**: Relación de usuarios con ligas privadas/globales, configuración de cada liga y mapeo de equipos que puntúan en cada una.
- **`Permisos_Equipos` / `Permisos_Secreta`**: Equipos visibles y pronosticables para cada usuario (incluyendo el perfil `Invitado`) y acceso a la predicción de puntos totales de temporada.
- **`Insignias` / `Peticiones_Insignias` / `Peticiones_Nombre` / `Usuario_Alias`**: Roles visuales del club, solicitudes pendientes y alias.

### Partidos, pronósticos y resultados
- **`Ajustes`**: Catálogo completo de los partidos de la temporada (`ID_Partido`, `Ronda_Global`, `Equipo_Local`, `Rival`, `Jornada_Eq`, `Fecha`, `timestamp`, `Ubicacion`, `Estado`, `Visibilidad`, `Categoria`, `Pabellon`, `Streaming`, abreviaturas y parámetros de MVP).
- **`Resultados_Oficiales`**: Actas oficiales introducidas por administración (`ID Partido`, `Sets`, `Parciales`, declaraciones/MVP oficial y marcas de actualización).
- **`Porras`**: Pronósticos guardados por los usuarios (`Usuario`, `ID Partido`, `Sets`, `Puntos Dif`, `a favor o en contra del local`, `Equipo_Local`, `Equipo_Visitante` y marca temporal). Las antiguas columnas redundantes `Rival` y `Ubicacion_Club` fueron eliminadas del esquema.
- **`Predicciones_Secretas`**: Pronósticos de puntos totales de final de temporada por equipo.
- **`Reglas_Puntuacion`**: Parámetros dinámicos de puntuación (`ganador`, `sets`, `diff_exacta`, `max_dist`, `pct_mvp`).

### MVP VALCYL, Push, Auditoría y Caché
- **`Plantilla_Superliga_2_Masc`**: Dorsales, nombres, apodos, posiciones y referencias visuales de la plantilla para votaciones MVP.
- **`MVP_Votos`**: Votos emitidos por los usuarios por partido y jugador.
- **`Suscripciones_Push_Dispositivos` / `Notificaciones` / `Log_Notificaciones`**: Endpoints Web Push (VAPID), avisos en la app, preferencias por usuario y registro de envíos.
- **`Cache_App`**: Caché clave-valor en D1 (estado de congelación `FREEZE_OVERRIDE`, `AUTO_UNFREEZE_*`, modo mantenimiento, modo pruebas push y clasificaciones cacheadas).
- **`Log_Accesos` / `Monitor_Usuarios` / `Sugerencias_Errores`**: Auditoría de accesos, seguimiento administrativo y buzón de sugerencias/reportes de usuarios.

---

## 3. Contrato de la API (`/api/vcv`)

Todas las operaciones pasan por `POST /api/vcv` enviando un cuerpo JSON con el campo `action`. Las acciones actuales se agrupan por dominio:

- **Sesión, registro y perfil:**
  `ping`, `login`, `login_guest`, `get_data`, `get_history`, `request_registration`, `get_registro_ligas`, `change_password`, `save_email`, `delete_avatar`, `request_name_change`, `request_badge_update`, `delete_custom_badge`, `dismiss_aviso_moderacion`, `enviar_sugerencia`, `submit_feedback`.
- **Pronósticos y MVP:**
  `save`, `save_totales`, `get_pronosticos_partido_data`, `vote_mvp`, `get_mvp_votos_summary`.
- **Notificaciones Web Push y tareas programadas (crons):**
  `get_vapid_public_key`, `guardar_suscripcion_push`, `eliminar_suscripcion_push`, `obtener_config_push`, `cron_recordatorio_2horas`, `cron_recordatorio_mvp_1hora`, `cron_resumen_viernes`.
- **Intranet de administración (requiere rol admin):**
  - *Partidos y actas:* `save_resultado_admin`, `sync_official_matches_now`, `fix_timestamps`, `set_mvp_oficial`, `set_mvp_publicacion_ts`, `save_plantilla_superliga`.
  - *Usuarios, registros y ligas:* `add_user`, `admin_get_user_full_profile`, `admin_save_user_full_profile`, `admin_reset_password`, `admin_delete_user`, `get_solicitudes_registro`, `resolver_solicitud_registro`, `get_usuarios_ligas_admin`, `save_usuario_ligas_admin`, `get_usuarios_permisos`, `save_usuario_permisos`, `save_ligas_config`, `sync_permisos`.
  - *Moderación y sistema:* `get_name_change_requests`, `resolve_name_change`, `get_peticiones_insignias`, `resolve_peticion_insignia`, `get_sugerencias`, `marcar_sugerencia_estado`, `update_sugerencia_estado`, `set_freeze_override`, `toggle_modo_mantenimiento`, `get_mantenimiento_status`, `clear_cache`, `apply_indexes`, `migrate_db`, `get_monitor_data`, `toggle_monitor_user`, `enviar_push_prueba_admin`, `obtener_log_notificaciones`, `get_modo_pruebas_notif`, `set_modo_pruebas_notif`.

---

## 4. Reglas de Negocio Clave

1. **Cierre por hora oficial peninsular:** El servidor valida `timestamp` antes de aceptar un guardado en `Porras`. Los desplazamientos a las Islas Canarias se almacenan en hora peninsular (+1h respecto a la hora local canaria) para que la cuenta atrás y el cierre coincidan con el inicio real del partido en Valladolid.
2. **Signo obligatorio en diferencia de puntos:** El pronóstico requiere especificar si la diferencia de puntos es a favor o en contra del equipo local para evaluar el margen correctamente.
3. **MVP con cierre y proclamación desacoplados:** El cierre de votación impide nuevos votos o cambios a partir de la hora límite, mientras que la proclamación controla cuándo se revelan el ganador y los porcentajes.
4. **Congelación de clasificaciones:** Permite congelar los rankings durante los partidos del fin de semana (de forma automática o manual mediante `FREEZE_OVERRIDE`) y descongelarlos al finalizar la jornada.
5. **Protección de registro público:** `request_registration` aplica honeypot, validación de tiempo mínimo en cliente y rate limiting por IP (3 registros/hora por IP) antes de crear cuentas pendientes de aprobación visible en `Solicitudes_Registro`.
6. **PWA y resiliencia en red móvil:** El frontend emplea `fetchSeguro()` con reintentos controlados, respeta las áreas seguras de pantalla (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`) y gestiona el requisito de modo standalone en iOS Safari para Web Push.
