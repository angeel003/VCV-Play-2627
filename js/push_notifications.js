// ============================================================================
// 🔔 GESTOR DE NOTIFICACIONES WEB PUSH NATIVAS (VCV PLAY)
// ============================================================================

(function() {
    'use strict';

    const DEFAULT_VAPID_PUBKEY = "BC2qOrSTAHeNqSis_RChG_ycGZ0SY1bTIgJbRr7etA9D6z0XgIZqNdR-1jwLn99sKtaJvuganWgIwUnFRUYd_1U";

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function isPushSupported() {
        return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
    }

    async function getServiceWorkerRegistration() {
        if (!('serviceWorker' in navigator)) return null;
        try {
            let reg = await navigator.serviceWorker.getRegistration();
            if (!reg) {
                reg = await navigator.serviceWorker.register('sw.js');
            }
            await navigator.serviceWorker.ready;
            return reg;
        } catch (e) {
            console.warn('[Push] Error obteniendo Service Worker:', e);
            return null;
        }
    }

    // Estado local en memoria
    let currentPushConfig = {
        dispositivo_suscrito: false,
        opciones_2horas: true,
        opciones_solo_olvidos: false,
        opciones_viernes: true,
        public_key: DEFAULT_VAPID_PUBKEY
    };

    // --- CARGAR ESTADO Y CONFIGURACIÓN ---
    window.cargarEstadoPush = async function() {
        if (!isPushSupported()) return currentPushConfig;
        const usr = window.currentUser || (window.appData && window.appData.usuario);
        const pwd = window.currentPassword;
        if (!usr || usr === 'lectura' || usr === 'Invitado') return currentPushConfig;

        try {
            const reg = await getServiceWorkerRegistration();
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                currentPushConfig.dispositivo_suscrito = Boolean(sub);
            }

            // Consultar preferencias guardadas en D1
            if (typeof fetchSeguro === 'function' && window.scriptURL) {
                const res = await fetchSeguro(window.scriptURL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'obtener_config_push',
                        usuario: usr,
                        password: pwd
                    })
                });
                const data = await res.json();
                if (data && data.status === 'success' && data.config) {
                    currentPushConfig.opciones_2horas = data.config.opciones_2horas !== false;
                    currentPushConfig.opciones_solo_olvidos = Boolean(data.config.opciones_solo_olvidos);
                    currentPushConfig.opciones_viernes = data.config.opciones_viernes !== false;
                    if (data.config.public_key) {
                        currentPushConfig.public_key = data.config.public_key;
                    }
                }
            }
        } catch (e) {
            console.warn('[Push] Error cargando config de push:', e);
        }
        return currentPushConfig;
    };

    // --- ACTIVAR / DESACTIVAR PUSH EN ESTE DISPOSITIVO ---
    window.togglePushDispositivo = async function(activar) {
        const statusBadge = document.getElementById('pushStatusBadge');
        const feedbackDiv = document.getElementById('pushConfigFeedback');
        const optionsBox = document.getElementById('pushSubOptionsBox');

        if (!isPushSupported()) {
            if (feedbackDiv) {
                feedbackDiv.style.display = 'block';
                feedbackDiv.style.color = '#ef4444';
                feedbackDiv.textContent = '❌ Tu navegador no es compatible con notificaciones Push nativas.';
            }
            return;
        }

        const usr = window.currentUser || (window.appData && window.appData.usuario);
        const pwd = window.currentPassword;
        if (!usr || usr === 'lectura' || usr === 'Invitado') {
            alert('Debes iniciar sesión para activar las notificaciones.');
            return;
        }

        try {
            if (activar) {
                if (feedbackDiv) {
                    feedbackDiv.style.display = 'block';
                    feedbackDiv.style.color = '#eab308';
                    feedbackDiv.textContent = '⏳ Solicitando permiso al navegador...';
                }

                let perm = Notification.permission;
                if (perm === 'default') {
                    perm = await Notification.requestPermission();
                }

                if (perm !== 'granted') {
                    if (feedbackDiv) {
                        feedbackDiv.style.display = 'block';
                        feedbackDiv.style.color = '#ef4444';
                        feedbackDiv.textContent = '⚠️ Permiso denegado. Permite las notificaciones en el icono del candado 🔒 de tu navegador para activarlas.';
                    }
                    const toggleInput = document.getElementById('switchPushDispositivo');
                    if (toggleInput) toggleInput.checked = false;
                    return;
                }

                const reg = await getServiceWorkerRegistration();
                if (!reg) throw new Error('No se pudo inicializar el Service Worker');

                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    const pubKey = currentPushConfig.public_key || DEFAULT_VAPID_PUBKEY;
                    sub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(pubKey)
                    });
                }

                // Guardar suscripción y preferencias en D1
                const chk2h = document.getElementById('chkPush2Horas');
                const chkOlv = document.getElementById('chkPushSoloOlvidos');
                const chkVie = document.getElementById('chkPushViernes');

                const op2h = chk2h ? chk2h.checked : currentPushConfig.opciones_2horas;
                const opOlv = chkOlv ? chkOlv.checked : currentPushConfig.opciones_solo_olvidos;
                const opVie = chkVie ? chkVie.checked : currentPushConfig.opciones_viernes;

                const res = await fetchSeguro(window.scriptURL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'guardar_suscripcion_push',
                        usuario: usr,
                        password: pwd,
                        suscripcion: sub.toJSON(),
                        opciones_2horas: op2h,
                        opciones_solo_olvidos: opOlv,
                        opciones_viernes: opVie
                    })
                });
                const data = await res.json();
                if (data && data.status === 'success') {
                    currentPushConfig.dispositivo_suscrito = true;
                    if (statusBadge) {
                        statusBadge.textContent = 'Activas';
                        statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
                        statusBadge.style.color = '#10b981';
                    }
                    if (optionsBox) optionsBox.style.opacity = '1';
                    if (feedbackDiv) {
                        feedbackDiv.style.display = 'block';
                        feedbackDiv.style.color = '#10b981';
                        feedbackDiv.textContent = '✅ ¡Notificaciones activadas en este dispositivo!';
                    }
                } else {
                    throw new Error((data && data.message) || 'Error al guardar en el servidor');
                }
            } else {
                // Desactivar
                const reg = await getServiceWorkerRegistration();
                if (reg) {
                    const sub = await reg.pushManager.getSubscription();
                    if (sub) await sub.unsubscribe();
                }

                await fetchSeguro(window.scriptURL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'eliminar_suscripcion_push',
                        usuario: usr,
                        password: pwd
                    })
                });

                currentPushConfig.dispositivo_suscrito = false;
                if (statusBadge) {
                    statusBadge.textContent = 'Desactivadas';
                    statusBadge.style.background = 'rgba(255, 255, 255, 0.08)';
                    statusBadge.style.color = 'var(--text-muted)';
                }
                if (optionsBox) optionsBox.style.opacity = '0.5';
                if (feedbackDiv) {
                    feedbackDiv.style.display = 'block';
                    feedbackDiv.style.color = 'var(--text-muted)';
                    feedbackDiv.textContent = 'Notificaciones desactivadas para este dispositivo.';
                }
            }
        } catch (err) {
            console.error('[Push] Error al cambiar estado de push:', err);
            if (feedbackDiv) {
                feedbackDiv.style.display = 'block';
                feedbackDiv.style.color = '#ef4444';
                feedbackDiv.textContent = '❌ Error: ' + err.message;
            }
            const toggleInput = document.getElementById('switchPushDispositivo');
            if (toggleInput) toggleInput.checked = currentPushConfig.dispositivo_suscrito;
        }
    };

    // --- GUARDAR AJUSTES DE PREFERENCIAS (2 Horas, Olvidos, Viernes) ---
    window.guardarAjustesPush = async function() {
        const feedbackDiv = document.getElementById('pushConfigFeedback');
        const usr = window.currentUser || (window.appData && window.appData.usuario);
        const pwd = window.currentPassword;
        if (!usr || usr === 'lectura' || usr === 'Invitado') return;

        const chk2h = document.getElementById('chkPush2Horas');
        const chkOlv = document.getElementById('chkPushSoloOlvidos');
        const chkVie = document.getElementById('chkPushViernes');

        const op2h = chk2h ? chk2h.checked : currentPushConfig.opciones_2horas;
        const opOlv = chkOlv ? chkOlv.checked : currentPushConfig.opciones_solo_olvidos;
        const opVie = chkVie ? chkVie.checked : currentPushConfig.opciones_viernes;

        currentPushConfig.opciones_2horas = op2h;
        currentPushConfig.opciones_solo_olvidos = opOlv;
        currentPushConfig.opciones_viernes = opVie;

        const reg = await getServiceWorkerRegistration();
        let sub = reg ? await reg.pushManager.getSubscription() : null;

        try {
            const res = await fetchSeguro(window.scriptURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'guardar_suscripcion_push',
                    usuario: usr,
                    password: pwd,
                    suscripcion: sub ? sub.toJSON() : 'dummy_pref_only',
                    opciones_2horas: op2h,
                    opciones_solo_olvidos: opOlv,
                    opciones_viernes: opVie
                })
            });
            const data = await res.json();
            if (data && data.status === 'success') {
                if (feedbackDiv) {
                    feedbackDiv.style.display = 'block';
                    feedbackDiv.style.color = '#10b981';
                    feedbackDiv.textContent = '💾 Preferencias guardadas';
                    setTimeout(() => { if (feedbackDiv) feedbackDiv.style.display = 'none'; }, 3000);
                }
            }
        } catch (e) {
            console.error('[Push] Error guardando preferencias:', e);
        }
    };

    // --- RENDERIZAR INTERFAZ DE USUARIO EN LA PESTAÑA PERFIL ---
    window.renderUserPushSettings = async function() {
        const container = document.getElementById('userPushSettingsContainer');
        if (!container) return;

        const usr = window.currentUser || (window.appData && window.appData.usuario);
        if (!usr || usr === 'lectura' || usr === 'Invitado') {
            container.innerHTML = '';
            return;
        }

        const supported = isPushSupported();
        let perm = supported ? Notification.permission : 'unsupported';
        await window.cargarEstadoPush();

        const isActivo = currentPushConfig.dispositivo_suscrito && perm === 'granted';

        let statusText = 'Desactivadas';
        let statusBg = 'rgba(255, 255, 255, 0.08)';
        let statusColor = 'var(--text-muted)';

        if (!supported) {
            statusText = 'No compatible';
            statusBg = 'rgba(239, 68, 68, 0.15)';
            statusColor = '#ef4444';
        } else if (isActivo) {
            statusText = 'Activas';
            statusBg = 'rgba(16, 185, 129, 0.2)';
            statusColor = '#10b981';
        } else if (perm === 'denied') {
            statusText = 'Bloqueadas en navegador';
            statusBg = 'rgba(239, 68, 68, 0.15)';
            statusColor = '#ef4444';
        }

        container.innerHTML = `
            <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(192, 132, 252, 0.2); border-radius: 14px; padding: 18px; margin-top: 16px; text-align: left; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size: 1.2rem;">🔔</span>
                        <h4 style="margin:0; font-size: 0.96rem; font-weight: 800; color: #f5c542; letter-spacing: 0.3px;">Avisos y Notificaciones Push</h4>
                    </div>
                    <span id="pushStatusBadge" style="font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 12px; background: ${statusBg}; color: ${statusColor};">
                        ${statusText}
                    </span>
                </div>

                <p style="font-size: 0.78rem; color: #bfa9c9; margin: 0 0 14px 0; line-height: 1.4;">
                    Recibe alertas en tu dispositivo para que no se te pase pronosticar ningún partido de tu equipo antes de que empiece.
                </p>

                <!-- SWITCH PRINCIPAL: ACTIVAR EN ESTE DISPOSITIVO -->
                <div style="display:flex; align-items:center; justify-content:space-between; background: rgba(28, 10, 38, 0.8); border: 1px solid rgba(192, 132, 252, 0.25); padding: 12px 14px; border-radius: 10px; margin-bottom: 12px;">
                    <div>
                        <strong style="font-size: 0.85rem; color: var(--text-main); display:block;">Activar en este dispositivo</strong>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">Alertas nativas de VCV Play</span>
                    </div>
                    <label style="position: relative; display: inline-block; width: 46px; height: 26px; margin: 0; cursor: pointer;">
                        <input type="checkbox" id="switchPushDispositivo" ${isActivo ? 'checked' : ''} ${!supported ? 'disabled' : ''} onchange="window.togglePushDispositivo(this.checked)" style="opacity: 0; width: 0; height: 0;">
                        <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isActivo ? '#10b981' : 'rgba(255,255,255,0.2)'}; transition: .3s; border-radius: 34px;">
                            <span style="position: absolute; content: ''; height: 20px; width: 20px; left: ${isActivo ? '23px' : '3px'}; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
                        </span>
                    </label>
                </div>

                <!-- SUB-OPCIONES DE RECORDATORIO -->
                <div id="pushSubOptionsBox" style="opacity: ${isActivo ? '1' : '0.55'}; transition: opacity 0.3s; display:flex; flex-direction:column; gap:10px; padding: 10px 4px;">
                    <!-- 2 HORAS ANTES -->
                    <label style="display:flex; align-items:flex-start; gap: 10px; cursor: pointer; user-select:none;">
                        <input type="checkbox" id="chkPush2Horas" ${currentPushConfig.opciones_2horas ? 'checked' : ''} onchange="window.guardarAjustesPush()" style="margin-top: 2px; transform: scale(1.15); accent-color: var(--secondary-color); cursor:pointer;">
                        <div>
                            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">⏱️ Recordatorio 2 horas antes de cada partido</div>
                            <div style="font-size: 0.72rem; color: #bfa9c9;">Te avisará con antelación suficiente cuando juegue uno de tus equipos.</div>
                        </div>
                    </label>

                    <!-- SOLO SI HE OLVIDADO PRONOSTAR -->
                    <label style="display:flex; align-items:flex-start; gap: 10px; cursor: pointer; margin-left: 24px; user-select:none;">
                        <input type="checkbox" id="chkPushSoloOlvidos" ${currentPushConfig.opciones_solo_olvidos ? 'checked' : ''} onchange="window.guardarAjustesPush()" style="margin-top: 2px; transform: scale(1.1); accent-color: #f59e0b; cursor:pointer;">
                        <div>
                            <div style="font-size: 0.80rem; font-weight: 600; color: #f59e0b;">⚠️ Avisarme solo si aún no he pronosticado</div>
                            <div style="font-size: 0.70rem; color: var(--text-muted);">Si ya has guardado tu porra para ese partido, no te molestará.</div>
                        </div>
                    </label>

                    <!-- VIERNES RESUMEN -->
                    <label style="display:flex; align-items:flex-start; gap: 10px; cursor: pointer; user-select:none; margin-top:2px;">
                        <input type="checkbox" id="chkPushViernes" ${currentPushConfig.opciones_viernes ? 'checked' : ''} onchange="window.guardarAjustesPush()" style="margin-top: 2px; transform: scale(1.15); accent-color: var(--secondary-color); cursor:pointer;">
                        <div>
                            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">📅 Resumen de la jornada los viernes</div>
                            <div style="font-size: 0.72rem; color: #bfa9c9;">Aviso con la lista de encuentros que se juegan el fin de semana.</div>
                        </div>
                    </label>
                </div>

                <div id="pushConfigFeedback" style="font-size: 0.75rem; margin-top: 8px; display: none;"></div>
            </div>
        `;

        // Añadir animación suave al switch
        const sw = document.getElementById('switchPushDispositivo');
        if (sw) {
            sw.addEventListener('change', function() {
                const knob = this.nextElementSibling.querySelector('span');
                const track = this.nextElementSibling;
                if (this.checked) {
                    track.style.backgroundColor = '#10b981';
                    knob.style.left = '23px';
                } else {
                    track.style.backgroundColor = 'rgba(255,255,255,0.2)';
                    knob.style.left = '3px';
                }
            });
        }
    };

    // ============================================================================
    // 🔒 FUNCIONES DE ADMINISTRACIÓN Y PRUEBAS (SOLO ADMINS)
    // ============================================================================

    window.initAdminPushPanel = async function() {
        const adminWrapper = document.getElementById('adminPushLogsTable');
        if (!adminWrapper) return;

        const usr = window.currentUser || (window.appData && window.appData.usuario);
        const pwd = window.currentPassword;
        if (!usr || !pwd) return;

        // 1. Cargar estado de 'Modo Pruebas (Solo Administradores)'
        try {
            const resModo = await fetchSeguro(window.scriptURL, {
                method: 'POST',
                body: JSON.stringify({ action: 'get_modo_pruebas_notif', usuario: usr, password: pwd })
            });
            const dataModo = await resModo.json();
            const swModo = document.getElementById('adminSoloAdminsPushSwitch');
            const txtModo = document.getElementById('adminSoloAdminsStatusText');
            if (swModo && dataModo && dataModo.status === 'success') {
                swModo.checked = Boolean(dataModo.solo_admin);
                if (txtModo) {
                    txtModo.textContent = dataModo.solo_admin 
                        ? '🛡️ ACTIVO: Envíos restringidos exclusivamente a administradores.'
                        : '🌐 INACTIVO: Las notificaciones pueden enviarse a todos los usuarios.';
                    txtModo.style.color = dataModo.solo_admin ? '#10b981' : '#f59e0b';
                }
            }
        } catch(e) {
            console.warn('[Admin Push] Error consultando modo pruebas:', e);
        }

        // 2. Poblar selector de partidos para pruebas
        const selectPartidos = document.getElementById('adminSelectPartidoPushPrueba');
        if (selectPartidos && window.appData && Array.isArray(window.appData.partidos)) {
            selectPartidos.innerHTML = '<option value="">-- Próximos partidos en 2h (Automático) --</option>';
            const sorted = [...window.appData.partidos].sort((a,b) => (a.timestamp||0) - (b.timestamp||0));
            sorted.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id_partido;
                const fechaStr = p.fecha || (p.timestamp ? new Date(p.timestamp).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : '');
                opt.textContent = `[${p.id_partido}] ${p.equipo_local} vs ${p.rival} (${fechaStr})`;
                selectPartidos.appendChild(opt);
            });
        }

        // 3. Cargar logs
        window.adminCargarLogsNotificaciones();
    };

    window.adminCambiarModoPruebas = async function(activarSoloAdmin) {
        const usr = window.currentUser || (window.appData && window.appData.usuario);
        const pwd = window.currentPassword;
        const txtModo = document.getElementById('adminSoloAdminsStatusText');
        const feedback = document.getElementById('adminPushActionFeedback');

        try {
            const res = await fetchSeguro(window.scriptURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'set_modo_pruebas_notif',
                    usuario: usr,
                    password: pwd,
                    solo_admin: activarSoloAdmin
                })
            });
            const data = await res.json();
            if (data && data.status === 'success') {
                if (txtModo) {
                    txtModo.textContent = data.solo_admin 
                        ? '🛡️ ACTIVO: Envíos restringidos exclusivamente a administradores.'
                        : '🌐 INACTIVO: Las notificaciones pueden enviarse a todos los usuarios.';
                    txtModo.style.color = data.solo_admin ? '#10b981' : '#f59e0b';
                }
                if (feedback) {
                    feedback.style.display = 'block';
                    feedback.style.background = 'rgba(16, 185, 129, 0.15)';
                    feedback.style.color = '#10b981';
                    feedback.textContent = data.message;
                    setTimeout(() => { if (feedback) feedback.style.display = 'none'; }, 3500);
                }
            } else {
                throw new Error(data.message || 'Error al actualizar modo pruebas');
            }
        } catch(e) {
            alert('Error: ' + e.message);
        }
    };

    window.adminEnviarPushPrueba = async function() {
        const usr = window.currentUser || (window.appData && window.appData.usuario);
        const pwd = window.currentPassword;
        const feedback = document.getElementById('adminPushActionFeedback');

        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = 'rgba(212, 175, 55, 0.15)';
            feedback.style.color = '#f5c542';
            feedback.textContent = '⏳ Enviando notificación Push de prueba...';
        }

        try {
            const res = await fetchSeguro(window.scriptURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'enviar_push_prueba_admin',
                    usuario: usr,
                    password: pwd,
                    target_usuario: usr,
                    titulo: '🏐 VCV Play - Notificación de Prueba',
                    mensaje: `¡Hola @${usr}! Tu navegador y dispositivo reciben alertas nativas a la perfección.`
                })
            });
            const data = await res.json();
            if (data && data.status === 'success') {
                if (feedback) {
                    feedback.style.background = 'rgba(16, 185, 129, 0.2)';
                    feedback.style.color = '#10b981';
                    feedback.textContent = data.message;
                }
            } else {
                if (feedback) {
                    feedback.style.background = 'rgba(239, 68, 68, 0.2)';
                    feedback.style.color = '#ef4444';
                    feedback.textContent = '❌ ' + (data.message || 'Fallo al enviar push de prueba');
                }
            }
            window.adminCargarLogsNotificaciones();
        } catch (e) {
            if (feedback) {
                feedback.style.background = 'rgba(239, 68, 68, 0.2)';
                feedback.style.color = '#ef4444';
                feedback.textContent = '❌ Error de red: ' + e.message;
            }
        }
    };

    window.adminDispararCron2Horas = async function(forzarPartido = false) {
        const usr = window.currentUser || (window.appData && window.appData.usuario);
        const pwd = window.currentPassword;
        const feedback = document.getElementById('adminPushActionFeedback');
        const selPart = document.getElementById('adminSelectPartidoPushPrueba');
        const forzarId = (forzarPartido && selPart && selPart.value) ? selPart.value : undefined;

        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = 'rgba(37, 99, 235, 0.15)';
            feedback.style.color = '#93c5fd';
            feedback.textContent = '⏳ Ejecutando comprobación de recordatorios 2 horas...';
        }

        try {
            const res = await fetchSeguro(window.scriptURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'cron_recordatorio_2horas',
                    usuario: usr,
                    password: pwd,
                    forzar_partido_id: forzarId
                })
            });
            const data = await res.json();
            if (data && data.status === 'success') {
                if (feedback) {
                    feedback.style.background = 'rgba(16, 185, 129, 0.2)';
                    feedback.style.color = '#10b981';
                    let extra = data.solo_admin ? ' [Modo Admins: Solo administradores evaluados]' : '';
                    feedback.textContent = `✅ ${data.message} (${data.partidos_encontrados} partidos, ${data.enviados} envíos)${extra}`;
                }
            } else {
                if (feedback) {
                    feedback.style.background = 'rgba(239, 68, 68, 0.2)';
                    feedback.style.color = '#ef4444';
                    feedback.textContent = '❌ ' + (data.message || 'Error en cron 2 horas');
                }
            }
            window.adminCargarLogsNotificaciones();
        } catch(e) {
            if (feedback) {
                feedback.style.background = 'rgba(239, 68, 68, 0.2)';
                feedback.style.color = '#ef4444';
                feedback.textContent = '❌ Error de red: ' + e.message;
            }
        }
    };

    window.adminCargarLogsNotificaciones = async function() {
        const tableContainer = document.getElementById('adminPushLogsTable');
        if (!tableContainer) return;

        const usr = window.currentUser || (window.appData && window.appData.usuario);
        const pwd = window.currentPassword;
        if (!usr || !pwd) return;

        try {
            const res = await fetchSeguro(window.scriptURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'obtener_log_notificaciones',
                    usuario: usr,
                    password: pwd
                })
            });
            const data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.logs)) {
                if (data.logs.length === 0) {
                    tableContainer.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">No hay registros de notificaciones aún.</div>';
                    return;
                }

                let html = `
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.72rem;">
                        <thead>
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); text-align: left; color: #bfa9c9;">
                                <th style="padding: 6px 8px;">Hora</th>
                                <th style="padding: 6px 8px;">Usuario</th>
                                <th style="padding: 6px 8px;">Tipo</th>
                                <th style="padding: 6px 8px;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                data.logs.forEach(log => {
                    const isOk = (log.Estado || '').startsWith('ENVIADO');
                    const badgeColor = isOk ? '#10b981' : '#ef4444';
                    html += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 6px 8px; color: var(--text-muted); white-space:nowrap;">${log.Fecha || ''}</td>
                            <td style="padding: 6px 8px; font-weight: 700; color: #f5c542;">@${log.Usuario || ''}</td>
                            <td style="padding: 6px 8px; color: var(--text-main);" title="${log.Titulo || ''}: ${log.Mensaje || ''}">${log.Tipo || ''}</td>
                            <td style="padding: 6px 8px; font-weight: 700; color: ${badgeColor}; white-space:nowrap;">${log.Estado || ''}</td>
                        </tr>
                    `;
                });
                html += '</tbody></table>';
                tableContainer.innerHTML = html;
            }
        } catch(e) {
            tableContainer.innerHTML = `<div style="padding:10px; color:#ef4444; text-align:center;">Error al cargar registros: ${e.message}</div>`;
        }
    };

})();
