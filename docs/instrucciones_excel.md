# Notas sobre Gestión de Datos (Migración desde Google Sheets a Cloudflare D1)

> **Aviso de archivo histórico:** Este documento recogía las instrucciones manuales de configuración de pestañas en Google Sheets utilizadas en la versión inicial (v1) de Fantasy VCV.

## Situación actual (VCV Play 26/27)

La aplicación ya **no depende de Google Sheets ni de Google Apps Script**. Toda la persistencia funciona sobre **Cloudflare D1 (`vcv_database`)** a través de `functions/api/vcv.js`.

Todas las operaciones que antes se hacían manualmente en hojas de cálculo se gestionan ahora directamente desde la **Intranet de Administración** dentro de la web:

- **Resultados oficiales, parciales y streaming:** Se introducen y editan desde la mesa de administración (tabla `Resultados_Oficiales` y `Ajustes`).
- **Horarios y pabellones:** Sincronizados en la tabla `Ajustes` frente a los calendarios oficiales de RFEVB (EsVoley) y FVCyL.
- **Plantilla y votación MVP VALCYL:** Gestionados en `Plantilla_Superliga_2_Masc` y `MVP_Votos` desde el panel de administración (las fotografías de jugadores se almacenan en `files/`).
- **Usuarios, último acceso, ligas y solicitudes de registro:** Gestionados automáticamente en `Usuarios`, `Log_Accesos`, `Ligas`, `Permisos_Equipos` y `Solicitudes_Registro`.

Consulta [RESUMEN_ARQUITECTURA_FANTASY_VCV.md](RESUMEN_ARQUITECTURA_FANTASY_VCV.md) para ver el esquema actual de tablas y endpoints.
