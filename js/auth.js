window.ocultarOverlayAutoLogin = function(immediate = false) {
    try {
        window._autoLoginPending = false;
        const o = document.getElementById('vcvAutoLoginOverlay');
        if (immediate) {
            document.documentElement.classList.remove('vcv-auto-logging-in');
            if (o) {
                o.style.transition = 'none';
                o.style.setProperty('display', 'none', 'important');
                o.style.opacity = '1';
                o.style.pointerEvents = '';
            }
            return;
        }
        const startTs = window._vcvHeadStartTs || window._autoLoginStartTs || 0;
        const elapsed = startTs ? (Date.now() - startTs) : 0;
        // Transición mínima breve desde el inicio sin frenar el acceso real
        const minTime = startTs ? 250 : 0;
        const remaining = Math.max(0, minTime - elapsed);
        setTimeout(() => {
            if (o) {
                o.style.pointerEvents = 'none';
                o.style.transition = 'opacity 0.18s ease';
                o.style.opacity = '0';
                setTimeout(() => {
                    document.documentElement.classList.remove('vcv-auto-logging-in');
                    o.style.setProperty('display', 'none', 'important');
                    o.style.opacity = '1';
                    o.style.pointerEvents = '';
                }, 180);
            } else {
                document.documentElement.classList.remove('vcv-auto-logging-in');
            }
        }, remaining);
    } catch(e) {
        try { document.documentElement.classList.remove('vcv-auto-logging-in'); } catch(e2) {}
    }
};

window.applyReglasUI = function(reglas) {
    if (!reglas) return;
    const numR = (v, fb) => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) ? Number(v) : fb;
    const ptsSets = numR(reglas.sets, 5);
    const ptsGanador = numR(reglas.ganador, 3);
    const pDE = numR(reglas.diff_exacta, 2);
    const mD = numR(reglas.max_dist, 10);
    const pctMvpVal = numR(reglas.pct_mvp, 10);

    const listaReglas = document.getElementById('listaReglasPuntuacion');
    if (listaReglas) {
        listaReglas.innerHTML = `
            <li>Acertar el <b>Resultado Exacto (Sets)</b>: <span style="color:var(--vcv-rojo); font-weight:bold;">+${ptsSets} pts</span></li>
            <li>Acertar el <b>Ganador del partido</b>: <span style="color:var(--vcv-rojo); font-weight:bold;">+${ptsGanador} pts</span></li>
            <li>Acertar la <b>Diferencia de puntos exacta</b>: <span style="color:var(--vcv-rojo); font-weight:bold;">+${pDE} pts</span> extra</li>
            <li>Aproximarse a la diferencia (margen de ${mD} pts): <span style="color:var(--vcv-rojo); font-weight:bold;">${mD > 1 && pDE > 0 ? 'Bonus proporcional' : 'Solo diferencia exacta'}</span></li>
            <li>Acertar el <b>MVP</b>: <span style="color:var(--secondary-color); font-weight:bold;">+${pctMvpVal}% bonus extra</span> sobre los puntos del partido</li>
        `;
    }
    const pExact = document.getElementById('puntosExactosModal');
    const pMargen = document.getElementById('puntosMargenModal');
    if (pExact) pExact.innerText = pDE;
    if (pMargen) pMargen.innerText = mD;

    const elMvpPctModal = document.getElementById('infoMvpBonusPct');
    if (elMvpPctModal) elMvpPctModal.innerText = `+${pctMvpVal}%`;
    const elMvpEjemploModal = document.getElementById('infoMvpBonusEjemplo');
    if (elMvpEjemploModal) {
        const bonusEj = Math.ceil(12 * (pctMvpVal / 100));
        elMvpEjemploModal.innerText = `El cálculo se redondea siempre hacia arriba. Por ejemplo, si logras 12 puntos y aciertas el MVP, ganas +${bonusEj} pts extra (total ${12 + bonusEj} pts).`;
    }

    const ejCont = document.getElementById('ejemploProporcionalModal');
    if (ejCont) {
        const calcP = (d) => {
            if (d >= mD || mD <= 0 || pDE <= 0) return 0;
            return Math.round(pDE * ((mD - d) / mD));
        };
        let htmlEjemplo = `<b>Reparto actual de puntos:</b><br>`;
        if (pDE <= 0 || mD <= 0) {
            htmlEjemplo += `• Sin bonus por aproximación con las reglas actuales.`;
        } else if (mD === 1) {
            htmlEjemplo += `• Alejarte 1 o más puntos: 0 pts`;
        } else {
            htmlEjemplo += `• Alejarte 1 punto exacto: +${calcP(1)} pts<br>`;
            if (mD > 2) htmlEjemplo += `• Alejarte 2 puntos exactos: +${calcP(2)} pts<br>`;
            if (mD > 3) htmlEjemplo += `• Alejarte 3 puntos exactos: +${calcP(3)} pts<br>`;
            if (mD > 4) htmlEjemplo += `• ...<br>`;
            htmlEjemplo += `• Alejarte ${mD} o más puntos: 0 pts`;
        }
        ejCont.innerHTML = htmlEjemplo;
    }
};


// --- DETECCIÓN PRECISA DE DISPOSITIVO Y MODELO PARA EL MONITOR SILENCIOSO ---
function detectarModeloDispositivo() {
    try {
        const ua = navigator.userAgent || '';
        const w = Math.min(window.screen.width, window.screen.height);
        const h = Math.max(window.screen.width, window.screen.height);
        const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;

        // 1. Detectar GPU si está disponible mediante WebGL
        let gpu = '';
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
                }
            }
        } catch(e) {}

        // 2. DETECCIÓN IPHONE / IPAD (iOS)
        const isIPhone = /iPhone|iPod/i.test(ua);
        const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isIPhone) {
            const matchOS = ua.match(/OS (\d+[_.\d]+)/i);
            const iosVer = matchOS ? 'iOS ' + matchOS[1].replace(/_/g, '.') : 'iOS';
            let model = 'iPhone';

            // Comprobación de dispositivo plegable (iPhone Fold / Flip)
            const isFoldSpanning = (window.matchMedia && (
                window.matchMedia('(horizontal-viewport-segments: 2)').matches ||
                window.matchMedia('(vertical-viewport-segments: 2)').matches ||
                window.matchMedia('(screen-spanning: single-fold-vertical)').matches ||
                window.matchMedia('(screen-spanning: single-fold-horizontal)').matches
            ));

            if (isFoldSpanning || (w >= 650 && w <= 850 && h >= 750 && h <= 1000)) {
                model = 'iPhone Plegable / Fold';
            } else if (w === 402 && h === 874) {
                model = 'iPhone 16 Pro / 17 / 18 (6.3")';
            } else if (w === 440 && h === 956) {
                model = 'iPhone 16 Pro Max / 17 / 18 Pro Max (6.9")';
            } else if (w === 430 && h === 932) {
                model = 'iPhone 14 Pro Max / 15 / 16 Plus (6.7")';
            } else if (w === 393 && h === 852) {
                model = 'iPhone 14 Pro / 15 / 16 (6.1")';
            } else if (w === 428 && h === 926) {
                model = 'iPhone 12 / 13 Pro Max / 14 Plus (6.7")';
            } else if (w === 390 && h === 844) {
                model = 'iPhone 12 / 13 / 14 (6.1")';
            } else if (w === 375 && h === 812) {
                model = 'iPhone X / XS / 11 Pro / Mini (5.4"-5.8")';
            } else if (w === 414 && h === 896) {
                model = (dpr >= 3) ? 'iPhone XS Max / 11 Pro Max (6.5")' : 'iPhone XR / 11 (6.1")';
            } else if (w === 375 && h === 667) {
                model = 'iPhone SE (2ª/3ª gen) / 8 (4.7")';
            } else if (w === 414 && h === 736) {
                model = 'iPhone 8 Plus / 7 Plus (5.5")';
            } else if (w === 320 && h === 568) {
                model = 'iPhone SE (1ª gen) (4.0")';
            }

            return `📱 ${model} (${iosVer})`;
        }

        if (isIPad) {
            const matchOS = ua.match(/OS (\d+[_.\d]+)/i);
            const ipadVer = matchOS ? 'iPadOS ' + matchOS[1].replace(/_/g, '.') : 'iPadOS';
            let model = 'iPad';
            if (w === 1024 && h === 1366) model = 'iPad Pro 12.9"';
            else if (w === 834 && h === 1194) model = 'iPad Pro 11"';
            else if (w === 834 && h === 1112) model = 'iPad Air / Pro 10.5"';
            else if (w === 820 && h === 1180) model = 'iPad Air / iPad 10ª gen';
            else if (w === 810 && h === 1080) model = 'iPad 10.2" (7ª/8ª/9ª gen)';
            else if (w === 768 && h === 1024) model = 'iPad 9.7" / iPad mini';
            else if (w === 744 && h === 1133) model = 'iPad mini (6ª gen)';
            return `📱 ${model} (${ipadVer})`;
        }

        // 3. DETECCIÓN ANDROID
        if (/Android/i.test(ua)) {
            const matchAnd = ua.match(/Android\s*([0-9.]+)/i);
            const andVer = matchAnd ? 'Android ' + matchAnd[1] : 'Android';
            let model = '';

            const matchModel = ua.match(/;\s*([A-Za-z0-9_\-\s]+)\s+(?:Build|\))/i);
            if (matchModel && matchModel[1]) {
                let rawModel = matchModel[1].trim();
                if (rawModel.startsWith('SM-')) {
                    model = 'Samsung (' + rawModel + ')';
                } else if (/Pixel/i.test(rawModel)) {
                    model = 'Google ' + rawModel;
                } else if (/Redmi|POCO|Xiaomi|22|23/i.test(rawModel)) {
                    model = 'Xiaomi / Redmi (' + rawModel + ')';
                } else if (/CPH/i.test(rawModel)) {
                    model = 'Oppo (' + rawModel + ')';
                } else if (/RMX/i.test(rawModel)) {
                    model = 'Realme (' + rawModel + ')';
                } else {
                    model = rawModel;
                }
            }

            return `📱 ${model ? model : 'Móvil Android'} (${andVer})`;
        }

        // 4. DETECCIÓN ORDENADORES (Windows, Mac, Linux)
        let nav = 'Navegador';
        if (/Edg\//i.test(ua)) nav = 'Edge';
        else if (/Chrome\//i.test(ua)) nav = 'Chrome';
        else if (/Firefox\//i.test(ua)) nav = 'Firefox';
        else if (/Safari\//i.test(ua)) nav = 'Safari';

        if (/Windows NT/i.test(ua)) {
            let winVer = 'Windows';
            if (ua.includes('Windows NT 10.0')) winVer = 'Windows 10/11';
            else if (ua.includes('Windows NT 6.3')) winVer = 'Windows 8.1';
            else if (ua.includes('Windows NT 6.1')) winVer = 'Windows 7';
            return `💻 PC ${winVer} (${w}x${h}) - ${nav}`;
        }

        if (/Macintosh/i.test(ua)) {
            return `💻 Mac (${w}x${h}) - ${nav}`;
        }

        if (/Linux/i.test(ua)) {
            return `💻 PC Linux (${w}x${h}) - ${nav}`;
        }

        return `Dispositivo desconocido (${w}x${h})`;
    } catch(e) {
        return 'Dispositivo desconocido';
    }
}
window.detectarModeloDispositivo = detectarModeloDispositivo;

// ==================================================================
// AUTENTICACIÓN, SESIONES Y AUTO-LOGIN
// ==================================================================

// LOGICA DE BOTON VOLVER ATRAS / SALIR
// ------------------------------------------------------------------
window.cerrarSesionApp = function() {
    localStorage.removeItem('vcv_saved_session');
    sessionStorage.removeItem('vcv_cached_app_data');
    sessionStorage.setItem('vcv_just_logged_out', 'true');
    sessionStorage.setItem('vcv_slide_left', 'true');
    
    const appSec = document.getElementById('appSection');
    if (appSec) appSec.classList.add('slide-out-right');
    
    setTimeout(() => {
        window.location.href = window.location.pathname + '?v=' + new Date().getTime();
    }, 280);
};


// ------------------------------------------------------------------

// ============================================================================
// GESTOR DE AVISOS Y NOTIFICACIONES (ACTIVOS VS HISTORIAL / INACTIVOS)
// ============================================================================
window.esNotificacionActiva = function(n) {
    if (!n) return false;
    // Si la columna Activa es explícitamente 0, false, "0", "NO", "no" o "INACTIVA"
    if (n.Activa === 0 || n.Activa === '0' || n.Activa === false || n.Activa === 'NO' || n.Activa === 'no' || n.Activa === 'INACTIVA' || n.Activa === 'inactiva') {
        return false;
    }
    // Si Visibilidad se define como INACTIVA, PASADA, HISTORICO, 0, NO
    const vis = String(n.Visibilidad || '').toUpperCase().trim();
    if (vis === 'INACTIVA' || vis === 'PASADA' || vis === 'HISTORICO' || vis === 'HISTÓRICO' || vis === 'NO' || vis === '0') {
        return false;
    }
    // Si Estado se define como INACTIVA, PASADA, HISTORICO
    const est = String(n.Estado || '').toUpperCase().trim();
    if (est === 'INACTIVA' || est === 'PASADA' || est === 'HISTORICO' || est === 'HISTÓRICO' || est === 'NO' || est === '0') {
        return false;
    }

    const tit = String(n.Titulo || '').toLowerCase();

    // 1. Notificaciones de recordatorios automáticos: NUNCA se marcan como activa
    if (tit.includes('recordatorio')) {
        return false;
    }

    // 2. Rankings y clasificaciones descongeladas: Solo activa durante 10 horas tras descongelar
    if (tit.includes('descongelad') || tit.includes('clasificaciones')) {
        const ts = Number(n.timestamp || 0);
        if (ts > 0 && (Date.now() - ts > 10 * 3600 * 1000)) {
            return false;
        }
    }

    // Comprobar preferencias personalizadas del usuario (si ha desactivado clasificaciones o MVP en sus ajustes)
    try {
        let pCfg = null;
        if (typeof currentPushConfig !== 'undefined' && currentPushConfig) pCfg = currentPushConfig;
        else {
            const raw = localStorage.getItem('vcv_push_config_local');
            if (raw) pCfg = JSON.parse(raw);
        }
        if (pCfg) {
            if (pCfg.opciones_descongelacion === false && (tit.includes('descongelad') || tit.includes('clasificaciones'))) {
                return false;
            }
            if (pCfg.opciones_mvp === false && tit.includes('mvp valcyl')) {
                return false;
            }
        }
    } catch(e) {}

    return true;
};

window.renderNotificaciones = function(notifList) {
    if (!Array.isArray(notifList)) notifList = [];
    window.appNotificaciones = notifList;

    // Ordenar de más reciente a más antigua
    const todas = [...notifList].sort((a, b) => {
        const tsA = a.timestamp || 0;
        const tsB = b.timestamp || 0;
        if (tsB !== tsA) return tsB - tsA;
        return (b.ID || 0) - (a.ID || 0);
    });

    const activas = todas.filter(window.esNotificacionActiva);
    const inactivas = todas.filter(n => !window.esNotificacionActiva(n));

    // 1. Campanita: Solo suma las notificaciones ACTIVAS
    const notifBadge = document.querySelector('.header-bell-badge');
    if (notifBadge) {
        if (activas.length > 0) {
            notifBadge.style.display = 'flex';
            notifBadge.innerText = activas.length;
            const hasHigh = activas.some(n => String(n.Importancia || '').toUpperCase() === 'ALTA');
            notifBadge.style.animation = hasHigh ? 'pulse-badge 2s infinite' : 'none';
        } else {
            notifBadge.style.display = 'none';
            notifBadge.innerText = '';
            notifBadge.style.animation = 'none';
        }
    }

    // 2. Contenedor del Modal
    const notifContainer = document.getElementById('notificacionesContainer');
    if (!notifContainer) return;

    if (todas.length === 0) {
        notifContainer.innerHTML = '<div style="text-align:center; padding: 25px 0; color:var(--text-muted); font-size:0.88rem;">No hay avisos ni notificaciones disponibles.</div>';
        return;
    }

    // Formateador de fecha
    function formatFechaRelativa(ts) {
        if (!ts) return '';
        try {
            const d = new Date(ts);
            const now = new Date();
            const diffMs = now - d;
            const diffMin = Math.floor(diffMs / 60000);
            const diffHoras = Math.floor(diffMin / 60);

            if (diffMin < 2) return 'Ahora mismo';
            if (diffMin < 60) return `Hace ${diffMin} min`;
            if (diffHoras < 24 && d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) {
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                return `Hoy, ${hh}:${mm}`;
            }
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${dia}/${mes} ${hh}:${mm}`;
        } catch(e) {
            return '';
        }
    }

    let html = '';

    // 1. ACTIVAS (arriba, color normal nítido, sin etiquetas rojas ni texto de aviso activo)
    if (activas.length > 0) {
        activas.forEach((n) => {
            const iconColor = n.Tipo === 'Aviso' ? '#f59e0b' : 'var(--primary-color, #a855f7)';
            const iconType = n.Tipo === 'Aviso' ? 'alert-triangle' : 'info';
            const fechaStr = formatFechaRelativa(n.timestamp);

            html += `
            <div class="notif-card notif-active" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
                <i data-lucide="${iconType}" style="width: 20px; height: 20px; color: ${iconColor}; flex-shrink: 0; margin-top: 2px;"></i>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 4px;">
                        <strong style="color: var(--text-main); font-size: 0.95rem; line-height: 1.3;">${n.Titulo || ''}</strong>
                        ${fechaStr ? `<span style="font-size: 0.7rem; color: var(--text-muted); flex-shrink: 0;">${fechaStr}</span>` : ''}
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0; line-height: 1.45; word-break: break-word;">${n.Mensaje || ''}</p>
                </div>
            </div>`;
        });
    }

    // Separador sutil si hay tanto activas como desactivadas
    if (activas.length > 0 && inactivas.length > 0) {
        html += `<div style="height: 1px; background: rgba(255, 255, 255, 0.07); width: 100%; margin: 4px 0;"></div>`;
    }

    // 2. DESACTIVADAS (más abajo, en gris, no suman al número de la campanita)
    if (inactivas.length > 0) {
        inactivas.forEach((n) => {
            const iconType = n.Tipo === 'Aviso' ? 'alert-triangle' : 'info';
            const fechaStr = formatFechaRelativa(n.timestamp);

            html += `
            <div class="notif-card notif-inactive" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.03); border-radius: 10px; opacity: 0.55;">
                <i data-lucide="${iconType}" style="width: 18px; height: 18px; color: #71717a; flex-shrink: 0; margin-top: 2px;"></i>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 4px;">
                        <strong style="color: #a1a1aa; font-size: 0.9rem; line-height: 1.3;">${n.Titulo || ''}</strong>
                        ${fechaStr ? `<span style="font-size: 0.7rem; color: #71717a; flex-shrink: 0;">${fechaStr}</span>` : ''}
                    </div>
                    <p style="color: #71717a; font-size: 0.82rem; margin: 0; line-height: 1.4; word-break: break-word;">${n.Mensaje || ''}</p>
                </div>
            </div>`;
        });
    }

    notifContainer.innerHTML = html;
    if (typeof window.renderLucideIcons === 'function') window.renderLucideIcons(notifContainer);
    else if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.abrirModalNotificaciones = function() {
    const modal = document.getElementById('notificacionesModal');
    if (!modal) return;
    const list = window.appNotificaciones || (window.appData && window.appData.notificaciones) || [];
    if (typeof window.renderNotificaciones === 'function') {
        window.renderNotificaciones(list);
    }
    if (typeof window.renderLucideIcons === 'function') {
        window.renderLucideIcons(modal);
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
};

window.cerrarModalNotificaciones = function() {
    const modal = document.getElementById('notificacionesModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
};

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        const nModal = document.getElementById('notificacionesModal');
        if (nModal) {
            nModal.addEventListener('touchmove', function(e) {
                const container = document.getElementById('notificacionesContainer');
                if (!container || !container.contains(e.target)) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    });
}


// LOGICA MODO INVITADO
const btnGuestEl = document.getElementById('btnGuest');
if (btnGuestEl) btnGuestEl.addEventListener('click', function(e) {
    e.preventDefault();
    const msgBox = document.getElementById('loginMessage');
    const btn = this;
    
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...'; 
    msgBox.style.display = "none";

    fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'login_guest' }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
    .then(res => res.json())
    .then(data => {
        if(data.status === "success") {
            window.isGuestMode = true;
            currentUser = "Invitado";
            currentPassword = "";

            // Filter matches for Guest using:
            // 1) Permissions assigned to user 'Invitado' (Universidad de Valladolid VCV, VALCYL VCV, Valladolid CV Vacceas, VCV Maria Molina, VCV Meseta)
            // 2) The EXACT same time window as registered users (<= 7 days future, <= 36h past or <= 48h after proclaimed MVP)
            if (data.equipos && Array.isArray(data.equipos)) {
                const now = Date.now();
                // Teams permitted for 'Invitado'
                const guestAllowedTeams = Array.isArray(data.mis_equipos_siguiendo) && data.mis_equipos_siguiendo.length > 0
                    ? data.mis_equipos_siguiendo
                    : [
                        'Universidad de Valladolid VCV',
                        'VALCYL VCV',
                        'Valladolid CV Vacceas',
                        'VCV Maria Molina',
                        'VCV Meseta'
                    ];

                const guestMatches = data.equipos.filter(p => {
                    if (p.visibilidad === "OCULTAR") return false;

                    // Strictly check if Invitado has permission for local or rival team
                    const esLoc = guestAllowedTeams.includes(p.equipo_local);
                    const esRiv = guestAllowedTeams.includes(p.rival);
                    if (!esLoc && !esRiv) return false;

                    if (esLoc && esRiv) p.es_derby = true;

                    let noTimestamp = !p.timestamp;
                    let isTooFarFuture = p.timestamp && (p.timestamp - now > 7 * 24 * 60 * 60 * 1000);
                    
                    let localMap = (typeof window.getLocalMvpPubMap === 'function') ? window.getLocalMvpPubMap() : {};
                    if (localMap[p.id_partido] && localMap[p.id_partido] > 0) {
                        p.mvp_publicacion_ts = localMap[p.id_partido];
                        p.mvp_visible = true;
                    }
                    let hasMvpAssignment = (Array.isArray(p.mvp_candidatos) && p.mvp_candidatos.length > 0) || Boolean(p.mvp_oficial) || Boolean(p.mvp_publicacion_ts > 0);
                    let isTooOld = false;

                    if (hasMvpAssignment) {
                        if (p.mvp_oficial) {
                            let baseTime = p.mvp_proclamado_ts || p.mvp_publicacion_ts || p.timestamp || 0;
                            if (baseTime && (now - baseTime > 24 * 60 * 60 * 1000)) {
                                isTooOld = true;
                            }
                        } else if (p.mvp_publicacion_ts && p.mvp_publicacion_ts > now) {
                            isTooOld = false;
                        } else if (p.timestamp && (now - p.timestamp > 72 * 60 * 60 * 1000)) {
                            isTooOld = true;
                        } else {
                            isTooOld = false;
                        }
                    } else {
                        isTooOld = p.timestamp && (now - p.timestamp > 36 * 60 * 60 * 1000);
                    }

                    return !(noTimestamp || isTooFarFuture || isTooOld);
                });

                guestMatches.forEach(eq => {
                    eq.permitido = true;
                    eq.visibilidad = "MOSTRAR";
                });

                data.equipos = guestMatches;
                // Preserve full season matches in data.todos_partidos so Calendario and Resultados can show all season matches
            }

            window.appData = data;
            window.appData.usuario = "Invitado";
            window.currentUser = "Invitado";

            // Header User chip for guest
            const rankEl = document.getElementById('h2-user-rank');
            if (rankEl) rankEl.innerText = "Modo";
            const ptsEl = document.getElementById('h2-user-pts');
            if (ptsEl) ptsEl.innerText = "Invitado";

            // Hide totals prediction section completely for guest
            const secTotales = document.getElementById('prediccionesTotalesSection');
            if (secTotales) {
                secTotales.classList.remove('active-tab');
                secTotales.style.display = 'none';
            }

            // Setup simplified bottom nav for Guest (Partidos, Patrocinadores si existe, ¡Únete!)
            const navItems = document.querySelectorAll('#bottomNavV2 .nav-item-v2');
            navItems.forEach(b => {
                b.style.display = 'none';
                b.classList.remove('active');
            });
            const navPatros = document.getElementById('navItemPatros');
            if (navPatros) {
                if (navItems[0]) {
                    navItems[0].style.display = 'flex';
                    navItems[0].classList.add('active');
                    navItems[0].style.width = '33.33%';
                }
                navPatros.style.display = 'flex';
                navPatros.style.width = '33.33%';
                const navGuest = document.getElementById('navItemGuestInfo');
                if (navGuest) {
                    navGuest.style.display = 'flex';
                    navGuest.style.width = '33.33%';
                }
            } else {
                if (navItems[0]) {
                    navItems[0].style.display = 'flex';
                    navItems[0].classList.add('active');
                    navItems[0].style.width = '50%';
                }
                const navGuest = document.getElementById('navItemGuestInfo');
                if (navGuest) {
                    navGuest.style.display = 'flex';
                    navGuest.style.width = '50%';
                }
            }

            // Top greeting for guest
            const pTop = document.getElementById('perfilUsuarioTop');
            if (pTop) {
                pTop.innerHTML = `
                <div style="padding: 14px; border-radius: 16px; background: linear-gradient(135deg, rgba(93, 23, 137, 0.4), var(--bg-card)); border: 1px solid var(--border-color); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size:0.75rem; font-weight:800; color:var(--secondary-color); letter-spacing:0.5px; text-transform:uppercase;">Explorador Oficial</span>
                        <h2 style="font-size: 1.35rem; font-weight: 900; color: var(--text-main); margin: 2px 0 0 0;">Modo Invitado</h2>
                    </div>
                    <button type="button" onclick="if(window.abrirModalSolicitarCuenta) window.abrirModalSolicitarCuenta(); else switchTabV2('guestInfoSection', document.getElementById('navItemGuestInfo'));" style="background:linear-gradient(135deg, #f39c12, #e67e22); color:#fff; font-weight:800; border:none; padding:8px 14px; border-radius:10px; font-size:0.82rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow: 0 4px 12px rgba(243, 156, 18, 0.35);">
                        <span>📝 Solicitar cuenta</span>
                    </button>
                </div>`;
            }

            // Hide other UI sections not meant for guests
            const admPanel = document.getElementById('adminPanelWrapper');
            if (admPanel) admPanel.style.display = 'none';
            const btnSub = document.getElementById('btnSubmit');
            if (btnSub) btnSub.style.display = 'none';
            const titSec = document.getElementById('tituloPrincipalSeccion');
            if (titSec) titSec.style.display = 'block';

            // Render modern match cards (pestaña inicial visible)
            window.appData = data;
            window.appData.usuario = "Invitado";
            window.currentUser = "Invitado";
            if (data.reglas && typeof window.applyReglasUI === 'function') {
                window.applyReglasUI(data.reglas);
            }
            window.renderCarteleraHTML(data);

            window.appNotificaciones = data.notificaciones || [];
            if (typeof window.renderLucideIcons === 'function') {
                window.renderLucideIcons('tituloPrincipalSeccion');
                window.renderLucideIcons('bottomNavWrapperV2');
            }

            // Activate cartelera tab immediately
            document.getElementById('loginSection').style.display = "none";
            document.getElementById('appSection').style.display = "block";
            const firstNavBtn = navItems[0] || null;
            switchTabV2('carteleraSection', firstNavBtn);
            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin();

            // Diferir notificaciones y calendario al siguiente frame tras pintar Partidos
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (typeof window.renderNotificaciones === 'function') {
                        window.renderNotificaciones(window.appNotificaciones);
                    }
                    if (typeof window.initCalendar === 'function') {
                        window.initCalendar();
                    }
                    if (typeof window.renderLucideIcons === 'function') {
                        window.renderLucideIcons('guestInfoSection');
                    }
                }, 0);
            });
        } else {
            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
            else document.documentElement.classList.remove('vcv-auto-logging-in');
            msgBox.className = "alert-box alert-danger"; msgBox.innerText = data.message || "Error cargando modo invitado."; msgBox.style.display = "block";
            if (typeof updateProgressBar === 'function') updateProgressBar();
        }
    })
    .catch(err => { 
        if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
        else document.documentElement.classList.remove('vcv-auto-logging-in');
        msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Error: " + err.message; msgBox.style.display = "block";
        if (typeof updateProgressBar === 'function') updateProgressBar();
    })
    .finally(() => { 
        btn.innerText = "👀 Entrar como invitado"; 
        btn.disabled = false; 
    });
});

// LOGICA USUARIO NORMAL
const btnLoginEl = document.getElementById('btnLogin');
if (btnLoginEl) btnLoginEl.addEventListener('click', function() {
    const usr = document.getElementById('loginUsuario').value.trim();
    const pwd = document.getElementById('loginPassword').value.trim();
    const msgBox = document.getElementById('loginMessage');
    const btn = this;

    if(!usr || !pwd) { document.documentElement.classList.remove('vcv-auto-logging-in'); msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Rellena usuario y contraseña."; msgBox.style.display = "block";
          updateProgressBar(); return; }
    
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Accediendo...'; 
    msgBox.style.display = "none";

    const payloadLogin = { action: 'login', usuario: usr, password: pwd };
    if (window._esAutoLogin) {
        payloadLogin.is_auto_reconnect = true;
        window._esAutoLogin = false;
    }
    if (typeof window.detectarModeloDispositivo === 'function') {
        payloadLogin.dispositivo = window.detectarModeloDispositivo();
    }
    fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify(payloadLogin), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
    .then(res => res.json())
    .then(data => {
        if(data.status === "success") {
            const canonicalUser = data.usuario || usr;
            currentUser = canonicalUser; currentPassword = pwd;
            currentJornadaGlobal = data.jornada;
            window.appData = data;
            window.appData.usuario = canonicalUser;
            window.currentUser = canonicalUser;
            if (typeof window.aplicarHorasMvpLocales === 'function') window.aplicarHorasMvpLocales(data);

            if (data.modo_mantenimiento !== undefined) {
                if (typeof window.adminActualizarUiMantenimiento === 'function') {
                    window.adminActualizarUiMantenimiento(data.modo_mantenimiento);
                }
            }

            // Si hay un aviso de moderación sobre su cuenta, mostrárselo
            if (data.aviso_moderacion && typeof window.mostrarAvisoModeracion === 'function') {
                window.mostrarAvisoModeracion(data.aviso_moderacion, canonicalUser);
            }
            
            // Guardar sesión persistente si el checkbox está marcado
            const chkRec = document.getElementById('chkRecordarSesion');
            if (!chkRec || chkRec.checked) {
                try {
                    localStorage.setItem('vcv_saved_session', JSON.stringify({
                        usuario: canonicalUser,
                        password: pwd,
                        ts: Date.now()
                    }));
                } catch(e) {}
            } else {
                localStorage.removeItem('vcv_saved_session');
            }

            // Guardar instant-cache de sesión para renderizado ultrarrápido (0ms) en reaperturas
            try {
                sessionStorage.setItem('vcv_cached_app_data', JSON.stringify({
                    data: data,
                    usuario: canonicalUser,
                    ts: Date.now()
                }));
            } catch(e) {}
            window.appNotificaciones = data.notificaciones || [];
            if (data.ligas && data.ligas.length > 0) {
                window.currentLiga = data.ligas[0];
            }

            let totalOpen = 0;
            let predictedOpen = 0;
            if (data.equipos && data.equipos.length > 0) {
                data.equipos.forEach(eq => {
                    if (eq.estado !== "CERRADO") {
                        totalOpen++;
                        if (data.predicciones_usuario && data.predicciones_usuario[eq.id_partido]) { predictedOpen++; }
                    }
                });
            }
            let porcentaje = totalOpen > 0 ? Math.round((predictedOpen / totalOpen) * 100) : 100;

            let myBadges = data.insignias ? (data.insignias[currentUser] || []) : [];
            let podioBadges = (typeof window.getPodioBadgesForUser === 'function')
                ? window.getPodioBadgesForUser(currentUser)
                : [];
            let displayMyBadges = [...podioBadges, ...myBadges.filter(b => b.type !== 'avatar' && b.type !== 'permiso_mvp' && b.type !== 'permiso_resultados')];
            let insigniasHTML = "";
            if (displayMyBadges.length > 0) {
                insigniasHTML += `<div class="user-badges-scroll-wrapper" style="position:relative; width:100%; max-width:100%; margin-top:0; min-width:0; overflow:hidden;"><div class="user-badges-scroll-track horizontal-drag-scroll" style="display:flex; flex-wrap:nowrap; align-items:center; gap:8px; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; -webkit-overflow-scrolling:touch; cursor:grab; padding:2px 2px;">`;
                displayMyBadges.forEach(b => {
                    let tooltipText = (b.items && b.items.length > 0)
                        ? `${b.title || b.text}: ${b.items.join(' • ')}`
                        : (b.text || '');
                    let safeText = tooltipText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    let badgeIcon = renderBadgeIcon(b, "", "width:18px; height:18px; display:block; margin:0;");
                    if (badgeIcon) {
                        insigniasHTML += `<div class="user-badge-chip-icon" title="${safeText}" onclick="showMobileTooltip(event, '${safeText}')" onmouseenter="showMobileTooltip(event, '${safeText}')" onmouseleave="hideMobileTooltip()" style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; background:var(--bg-general); border:1px solid var(--border-color); cursor:pointer; flex-shrink:0; transition:transform 0.15s ease, border-color 0.15s ease;">${badgeIcon}</div>`;
                    }
                });
                insigniasHTML += `</div></div>`;
            }

            let highestJornada = data.jornada || "Activa";
            if (data.equipos && data.equipos.length > 0) {
                let max = -1;
                data.equipos.forEach(eq => {
                    let j = parseInt(eq.jornada_eq);
                    if (!isNaN(j) && j > max) {
                        max = j;
                    }
                });
                if (max > -1) {
                    highestJornada = max;
                }
            }

            let htmlPerfil = `
    
            <div style="padding: 14px; border-radius: 16px; background: linear-gradient(to right, rgba(93, 23, 137, 0.4), var(--bg-card), var(--bg-card)); border: 1px solid var(--border-color); position: relative; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); margin-bottom: 10px;">
              <div style="display: flex; align-items: center; justify-content: flex-start; font-size: 0.75rem; margin-bottom: 12px;">
                <span style="display: inline-flex; align-items: center; font-weight: bold; padding: 3px 10px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">
                  <span style="width: 6px; height: 6px; border-radius: 9999px; background: #10b981; margin-right: 6px; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></span> Jornada ${highestJornada}
                </span>
              </div>
              
              <div style="min-width: 0;">
                <h2 style="font-size: 1.55rem; font-weight: 800; color: var(--text-main); margin:0; letter-spacing:-0.5px; line-height:1.1; text-align:left;">¡Hola ${data.nombre_real || currentUser}!</h2>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin: 4px 0 0 0; text-align:left;">
                  <span style="color: var(--vcv-dorado); font-weight: 700;">@${currentUser}</span>
                </p>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; min-width: 0;">
                <div style="min-width: 0; flex: 1 1 auto; overflow: hidden;">
                  ${insigniasHTML}
                </div>
                <span id="user-progress-label" style="font-size: 0.8rem; font-weight: bold; color: var(--vcv-dorado); background: rgba(212, 175, 55, 0.1); padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.3); white-space: nowrap; flex-shrink: 0;">${porcentaje}% Listo</span>
              </div>

              <div style="width: 100%; background: rgba(0, 0, 0, 0.15); border-radius: 9999px; height: 6px; margin-top: 14px; overflow: hidden;">
                
                <div id="user-progress-bar" style="background: #d4af37; background: linear-gradient(to right, #ffd700, #d4af37); min-height: 6px; display: block; transition: width 0.5s ease-in-out; height: 100%; border-radius: 9999px; width: ${porcentaje}%; "></div>
              </div>
            </div>`;
            document.getElementById('perfilUsuarioTop').innerHTML = htmlPerfil;
            let promoDiv2 = document.getElementById('guestPromoBanner');
            if (promoDiv2) promoDiv2.style.display = "none";

            if (data.reglas && typeof window.applyReglasUI === 'function') {
                window.applyReglasUI(data.reglas);
            }

            // Cabecera y metadatos visibles
            let nameEl = document.getElementById('h2-user-name'); if(nameEl) nameEl.innerText = data.nombre_real || usr;
            if (data.correo) { let emlDisp = document.getElementById('currentEmailDisplay'); let emlTxt = document.getElementById('currentEmailText'); if(emlDisp && emlTxt) { emlDisp.style.display = 'block'; emlTxt.innerText = data.correo; } }
            let handleEl = document.getElementById('h2-user-handle'); if(handleEl) handleEl.innerText = "@" + usr;

            let misInsignias = data.insignias[usr] || [];
            let insigniasH2Html = "";
            let isAdmin = false;
            let hasPermisoMvp = false;
            let hasPermisoResultados = false;
            let permisoResultadosVal = "";

            if(typeof window.updateHeaderStats === "function") { window.updateHeaderStats(); }
            let displayMisInsignias = misInsignias.filter(b => b.type !== 'avatar');
            displayMisInsignias.forEach(b => {
                if (b.type === 'admin') isAdmin = true;
                if (b.type === 'permiso_mvp') hasPermisoMvp = true;
                if (b.type === 'permiso_resultados') {
                    hasPermisoResultados = true;
                    permisoResultadosVal = b.text || "";
                }
                let badgeIconH2 = renderBadgeIcon(b, "", "width:14px; height:14px;");
                if (badgeIconH2) {
                    insigniasH2Html += badgeIconH2;
                }
            });

            let badgesEl = document.getElementById('h2-user-badges'); if(badgesEl) badgesEl.innerHTML = insigniasH2Html;

            let canAccessIntranet = isAdmin || hasPermisoMvp || hasPermisoResultados;
            window._userPermisoResultados = isAdmin ? 'TODOS' : (hasPermisoResultados ? permisoResultadosVal : '');

            const admWrap = document.getElementById('adminPanelWrapper');
            if (canAccessIntranet) {
                if (admWrap) admWrap.style.display = "block";
                const titleEl = document.getElementById('adminMainTitle');
                const badgeEl = document.getElementById('adminRootBadge');
                if (isAdmin) {
                    if (titleEl) titleEl.innerText = "Intranet Administrador";
                    if (badgeEl) { badgeEl.innerText = "ROOT"; badgeEl.style.background = "#e67e22"; }
                } else if (hasPermisoMvp && hasPermisoResultados) {
                    if (titleEl) titleEl.innerText = "Gestión de Partidos y MVP";
                    if (badgeEl) { badgeEl.innerText = "GESTOR"; badgeEl.style.background = "var(--secondary-color)"; badgeEl.style.color = "#000"; }
                } else if (hasPermisoMvp) {
                    if (titleEl) titleEl.innerText = "Gestor MVP Superliga 2";
                    if (badgeEl) { badgeEl.innerText = "MVP"; badgeEl.style.background = "var(--secondary-color)"; badgeEl.style.color = "#000"; }
                } else if (hasPermisoResultados) {
                    if (titleEl) titleEl.innerText = "Gestor de Resultados y Enlaces";
                    if (badgeEl) { badgeEl.innerText = "RESULTADOS"; badgeEl.style.background = "#3498db"; }
                }

                const allCollapsibles = document.querySelectorAll('#adminMainDetails details.admin-collapsible');
                allCollapsibles.forEach(sec => {
                    if (isAdmin) {
                        sec.style.display = "block";
                    } else {
                        if (sec.id === 'secAdminMvp' && hasPermisoMvp) {
                            sec.style.display = "block";
                        } else if (sec.id === 'secAdminResultados' && hasPermisoResultados) {
                            sec.style.display = "block";
                        } else {
                            sec.style.display = "none";
                        }
                    }
                });

                // Cargar js/admin.js bajo demanda (Lazy Loading) únicamente para usuarios con permisos
                if (typeof window.loadAdminScript === 'function') {
                    window.loadAdminScript().then(function() {
                        if (typeof window.cambiarAdminCategoria === 'function') {
                            let savedTab = 'usuarios';
                            try { savedTab = sessionStorage.getItem('vcv_admin_tab') || 'usuarios'; } catch(e) {}
                            window.cambiarAdminCategoria(savedTab);
                        }
                    });
                }

                // Sincronizar categorías temáticas del panel admin
                if (isAdmin) {
                    const catNav = document.getElementById('adminCategoryNav');
                    const searchCont = document.getElementById('adminQuickSearchContainer');
                    const catInfo = document.getElementById('adminCatInfoText');
                    if (catNav) catNav.style.display = 'block';
                    if (searchCont) searchCont.style.display = 'block';
                    if (catInfo) catInfo.style.display = 'block';
                    if (typeof window.cambiarAdminCategoria === 'function') {
                        let savedTab = 'usuarios';
                        try { savedTab = sessionStorage.getItem('vcv_admin_tab') || 'usuarios'; } catch(e) {}
                        window.cambiarAdminCategoria(savedTab);
                    }
                } else if (hasPermisoMvp || hasPermisoResultados) {
                    const catNav = document.getElementById('adminCategoryNav');
                    const searchCont = document.getElementById('adminQuickSearchContainer');
                    const catInfo = document.getElementById('adminCatInfoText');
                    if (catNav) catNav.style.display = 'none';
                    if (searchCont) searchCont.style.display = 'none';
                    if (catInfo) catInfo.style.display = 'none';
                    const catPanels = document.querySelectorAll('.admin-category-panel');
                    catPanels.forEach(p => {
                        p.style.display = (p.getAttribute('data-admin-cat') === 'partidos') ? 'block' : 'none';
                    });
                }
            } else {
                if (admWrap) admWrap.style.display = "none";
            }

            document.getElementById('tituloPrincipalSeccion').style.display = 'block';

            // Renderizar ÚNICAMENTE la pestaña activa inicial (Partidos / Cartelera) antes de mostrar #appSection
            window.renderCarteleraHTML(data);

            if (typeof window.renderLucideIcons === 'function') {
                window.renderLucideIcons('tituloPrincipalSeccion');
                window.renderLucideIcons('bottomNavWrapperV2');
                window.renderLucideIcons('perfilUsuarioTop');
            } else if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            document.getElementById('loginSection').style.display = "none";
            document.getElementById('appSection').style.display = "block";
            const bannerProv = document.getElementById('bannerCuentaProvisional');
            if (bannerProv) {
                bannerProv.style.display = (data.es_provisional || data.verificado === 'PENDIENTE') ? 'block' : 'none';
            }
            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin();

            const renderPrediccionesTotalesLazy = () => {
                if(!data.equipos_totales || data.equipos_totales.length === 0) {
                    let tsSec = document.getElementById('prediccionesTotalesSection');
                    if(tsSec) tsSec.remove();
                    return;
                }
                let tsSec = document.getElementById('prediccionesTotalesSection');
                if(tsSec) tsSec.style.display = '';

                let isClosed = new Date().getTime() >= new Date("2026-10-10T12:00:00").getTime();
                let htmlTot = ``;

                data.equipos_totales.forEach(eq => {
                    let ptsActuales = data.puntos_reales[eq] || 0;
                    let misPts = "";
                    let categoriaEq = "";
                    let matchEncontrado = data.equipos.find(m => m.equipo_local === eq || m.rival === eq);
                    if (matchEncontrado && matchEncontrado.categoria) {
                        categoriaEq = matchEncontrado.categoria;
                    }
                    let porrasEq = data.predicciones_totales[eq] || [];
                    porrasEq.forEach(porra => {
                        if (porra.usuario === usr) misPts = porra.puntos;
                    });

                    let safeEqName = (window.getEscudoSlug ? window.getEscudoSlug(eq) : eq.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
                    let eqLogo = `<picture style="display:inline-flex; width:24px; height:24px; vertical-align:middle; flex-shrink:0;"><source srcset="files/images/escudos/${safeEqName}.webp?v=20261124_v5" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeEqName}.png?v=20261124_v5" alt="${eq}" onerror="this.style.display='none';" style="width:100%; height:100%; object-fit:contain;"></picture>`;

                    let miCajonHTML = "";
                    if (isClosed) {
                        let txtPts = misPts !== "" ? `${misPts} pts` : "Sin predicción";
                        miCajonHTML = `
                        <div style="background:rgba(0,0,0,0.32); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:space-between;">
                            <span style="font-weight:700; color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.4px;">Tu predicción final:</span>
                            <div style="font-size:1.1rem; font-weight:900; color:var(--vcv-dorado); display:flex; align-items:center; gap:6px; font-family:'Space Grotesk', sans-serif;">
                                <i data-lucide="lock" style="width:13px; height:13px; opacity:0.8;"></i>
                                ${txtPts}
                            </div>
                        </div>`;
                    } else {
                        miCajonHTML = `
                        <div style="background:rgba(0,0,0,0.32); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:space-between; gap:10px;">
                            <span style="font-weight:700; color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.4px;">Tu predicción:</span>
                            <div class="stepper-container-v2" style="width: 130px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:2px; display:flex; align-items:center;">
                                <button type="button" class="btn-step-v2" style="width:30px; height:30px; border-radius:6px; background:rgba(255,255,255,0.06); color:#fff; border:none; font-weight:900; font-size:1.05rem; cursor:pointer;" onclick="document.getElementById('pt_${eq}').stepDown()">-</button>
                                <div class="stepper-value-v2" style="flex:1; min-width:auto;">
                                    <input type="number" id="pt_${eq}" placeholder="0" value="${misPts}" style="background:transparent; border:none; text-align:center; font-size:1.15rem; font-weight:900; color:var(--vcv-dorado); width:100%; outline:none; -moz-appearance:textfield; margin:0; padding:0; height:30px; font-family:'Space Grotesk', sans-serif;">
                                </div>
                                <button type="button" class="btn-step-v2" style="width:30px; height:30px; border-radius:6px; background:rgba(255,255,255,0.06); color:#fff; border:none; font-weight:900; font-size:1.05rem; cursor:pointer;" onclick="document.getElementById('pt_${eq}').stepUp()">+</button>
                            </div>
                        </div>`;
                    }

                    if (!categoriaEq && data.todos_partidos) {
                        let matchTodo = data.todos_partidos.find(m => m.equipo_local === eq || m.rival === eq);
                        if (matchTodo && matchTodo.categoria) categoriaEq = matchTodo.categoria;
                    }

                    htmlTot += `
                    <div class="vcv-card-v2" style="margin-bottom:10px; padding: 12px 14px; border-left:4px solid var(--vcv-dorado); background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color); text-align: left;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px;">
                            <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                                ${eqLogo}
                                <div style="min-width:0; flex:1; text-align:left;">
                                    <h4 style="color:var(--text-main); margin:0; font-weight:800; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${eq}">${eq}</h4>
                                    ${categoriaEq ? `<span style="color:var(--text-muted); font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; display:block;">${categoriaEq}</span>` : ''}
                                </div>
                            </div>
                            <span style="background:rgba(16, 185, 129, 0.12); color:#10b981; border:1px solid rgba(16, 185, 129, 0.28); padding:3px 8px; border-radius:6px; font-weight:800; font-size:0.75rem; white-space:nowrap; flex-shrink:0;">
                              Llevan: ${ptsActuales} pts
                            </span>
                        </div>
                        ${miCajonHTML}
                    </div>`;
                });

                htmlTot += `<div id="msgPrediccionesTotales" class="alert-box mt-3" style="padding:10px;"></div>`;
                if (!isClosed) {
                    htmlTot += `<button type="button" id="btnSaveTotales" style="width:100%; padding: 13px; border-radius: 10px; font-weight: 800; border: none; background: var(--secondary-color); color: #000; cursor:pointer; font-size:0.95rem; transition: all 0.2s; margin-top:10px; margin-bottom:10px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35); display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                        <span>Guardar Predicciones</span>
                    </button>`;
                }

                const contTot = document.getElementById('contenedorPrediccionesTotales');
                if (contTot) {
                    contTot.innerHTML = htmlTot;
                    if (typeof window.renderLucideIcons === 'function') window.renderLucideIcons(contTot);
                }

                if (!isClosed) {
                    const btnSaveTot = document.getElementById('btnSaveTotales');
                    if (btnSaveTot) btnSaveTot.addEventListener('click', function(e) {
                        e.preventDefault();
                        let prediccionesTot = {};
                        data.equipos_totales.forEach(eq => {
                            let val = document.getElementById(`pt_${eq}`).value.trim();
                            if(val !== "") prediccionesTot[eq] = val;
                        });
                        const btnT = this;
                        const msgT = document.getElementById('msgPrediccionesTotales');
                        btnT.disabled = true;
                        btnT.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
                        msgT.style.display = "none";

                        fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'save_totales', usuario: currentUser, password: currentPassword, predicciones_totales: prediccionesTot }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
                        .then(res => res.json())
                        .then(d => {
                            msgT.style.display = "block";
                            if(d.status === "success") { msgT.className = "alert-box alert-success"; msgT.innerText = d.message; }
                            else { msgT.className = "alert-box alert-danger"; msgT.innerText = d.message; }
                        }).catch(() => { msgT.className = "alert-box alert-danger"; msgT.innerText = "Error de conexión."; msgT.style.display = "block"; })
                        .finally(() => { btnT.disabled = false; btnT.innerText = "💾 Guardar Predicciones"; });
                    });
                }
            };

            const renderAdminLigasAndFreezeLazy = () => {
                if (isAdmin) {
                    var ligasContainer = document.getElementById('adminLigasCheckboxes');
                    if (ligasContainer && data.todas_las_ligas) {
                        ligasContainer.innerHTML = '';
                        data.todas_las_ligas.forEach(function(liga) {
                            if (!liga) return;
                            var div = document.createElement('div');
                            div.innerHTML = '<label style="margin:0; cursor:pointer;"><input type="checkbox" value="' + liga + '" style="margin-right:5px;"> ' + liga + '</label>';
                            ligasContainer.appendChild(div);
                        });
                    }

                    var ligasFreezeContainer = document.getElementById('adminLigasCongelarCheckboxes');
                    if (ligasFreezeContainer && data.todas_las_ligas) {
                        ligasFreezeContainer.innerHTML = '';
                        var frozenSet = new Set(data.ligas_congeladas || data.todas_las_ligas);
                        data.todas_las_ligas.forEach(function(liga) {
                            if (!liga) return;
                            var isChecked = frozenSet.has(liga) ? 'checked' : '';
                            var div = document.createElement('div');
                            div.innerHTML = '<label style="margin:0; cursor:pointer; font-size:0.8rem; background:var(--bg-input); padding:6px 10px; border-radius:6px; border:1px solid var(--border-color); display:flex; align-items:center; gap:6px;"><input type="checkbox" class="chk-liga-freeze" value="' + liga + '" ' + isChecked + '> ' + liga + '</label>';
                            ligasFreezeContainer.appendChild(div);
                        });
                    }

                    var freezeBadge = document.getElementById('adminFreezeStatusBadge');
                    var freezeDesc = document.getElementById('adminFreezeStatusDesc');
                    if (freezeBadge && freezeDesc) {
                        if (data.freeze_override === 'UNFREEZE') {
                            freezeBadge.innerText = '🔓 DESCONGELADO (MANUAL)';
                            freezeBadge.style.background = 'rgba(46, 204, 113, 0.2)';
                            freezeBadge.style.color = '#2ecc71';
                            freezeBadge.style.borderColor = '#2ecc71';
                            freezeDesc.innerHTML = 'Has <b>forzado el descongelado</b>. Todo el mundo ve los puntos en vivo. Volverá al ciclo automático al comenzar la siguiente jornada, o pulsa abajo para volver ahora.';
                        } else if (data.freeze_override === 'FREEZE') {
                            freezeBadge.innerText = '❄️ CONGELADO (MANUAL)';
                            freezeBadge.style.background = 'rgba(52, 152, 219, 0.2)';
                            freezeBadge.style.color = '#3498db';
                            freezeBadge.style.borderColor = '#3498db';
                            freezeDesc.innerHTML = 'Has <b>forzado la congelación</b> manualmente. Los puntos permanecen ocultos hasta que pulses Descongelar o restablezcas a Automático.';
                        } else {
                            if (data.is_frozen) {
                                freezeBadge.innerText = '❄️ CONGELADO (AUTOMÁTICO)';
                                freezeBadge.style.background = 'rgba(52, 152, 219, 0.2)';
                                freezeBadge.style.color = '#3498db';
                                freezeBadge.style.borderColor = '#3498db';
                                freezeDesc.innerHTML = 'Siguiendo el horario habitual de fin de semana. Se descongelará solo el lunes a las 10:00 (o pulsa <b>Descongelar Ahora</b> si quieres adelantarlo ya).';
                            } else {
                                freezeBadge.innerText = '🟢 DESCONGELADO (AUTOMÁTICO)';
                                freezeBadge.style.background = 'rgba(46, 204, 113, 0.15)';
                                freezeBadge.style.color = '#2ecc71';
                                freezeBadge.style.borderColor = 'rgba(46, 204, 113, 0.4)';
                                freezeDesc.innerHTML = 'Horario entre semana normal. Los puntos puntúan en directo. Se congelará automáticamente al llegar el fin de semana.';
                            }
                        }
                    }
                }
            };

            const deferredTasks = {
                clasificacionesSection: () => {
                    if (typeof window.renderRankingV2 === "function") window.renderRankingV2();
                },
                historialSection: () => {
                    if (typeof window.renderHistorialV2 === "function") window.renderHistorialV2(data);
                    renderPrediccionesTotalesLazy();
                    if (typeof iniciarRelojTotales === "function") iniciarRelojTotales();
                },
                calendarioSection: () => {
                    if (typeof window.initCalendar === "function") window.initCalendar();
                },
                enlacesRfevbSection: () => {
                    if (typeof window.loadInsigniasUI === "function") window.loadInsigniasUI();
                    if (typeof window.renderMyProfileCard === "function") window.renderMyProfileCard();
                    if (canAccessIntranet) {
                        if ((isAdmin || hasPermisoResultados) && typeof renderAdminPanel === "function") {
                            renderAdminPanel(data.equipos);
                        }
                        if (isAdmin || hasPermisoMvp) {
                            if (typeof window.renderAdminPlantillaMvp === 'function') window.renderAdminPlantillaMvp();
                            if (typeof window.populateDirectMvpBoxes === 'function') window.populateDirectMvpBoxes();
                        }
                        renderAdminLigasAndFreezeLazy();
                        if (isAdmin && typeof window.cargarSolicitudesRegistroAdmin === 'function') {
                            window.cargarSolicitudesRegistroAdmin(true);
                        }
                    }
                    if (typeof window.renderLucideIcons === 'function') {
                        window.renderLucideIcons('enlacesRfevbSection');
                    }
                }
            };
            window._pendingDeferredTabs = deferredTasks;
            window.runDeferredTabRender = function(targetId) {
                const pending = window._pendingDeferredTabs;
                if (!pending) return;
                if (targetId === 'all') {
                    ['clasificacionesSection', 'historialSection', 'calendarioSection', 'enlacesRfevbSection'].forEach(k => {
                        if (typeof pending[k] === 'function') {
                            const fn = pending[k];
                            delete pending[k];
                            try { fn(); } catch(e) { console.error('Error en carga diferida (' + k + '):', e); }
                        }
                    });
                    return;
                }
                if (targetId && typeof pending[targetId] === 'function') {
                    const fn = pending[targetId];
                    delete pending[targetId];
                    try { fn(); } catch(e) { console.error('Error en carga diferida (' + targetId + '):', e); }
                }
            };

            const adminDet = document.getElementById('adminMainDetails');
            if (adminDet && !adminDet._vcvDeferredBound) {
                adminDet._vcvDeferredBound = true;
                adminDet.addEventListener('toggle', () => {
                    if (adminDet.open && typeof window.runDeferredTabRender === 'function') {
                        window.runDeferredTabRender('enlacesRfevbSection');
                    }
                });
            }

            requestAnimationFrame(() => {
                setTimeout(() => {
                    try {
                        if (Array.isArray(data.plantilla_superliga) && data.plantilla_superliga.length > 0) {
                            localStorage.setItem('vcv_plantilla_superliga_cache', JSON.stringify(data.plantilla_superliga));
                        }
                    } catch(e) {}
                    if (typeof window.runDeferredTabRender === 'function') {
                        window.runDeferredTabRender('all');
                    }
                    if (typeof window.renderPushPromoBannerPartidos === 'function') {
                        window.renderPushPromoBannerPartidos();
                    }
                    if (typeof window.renderNotificaciones === 'function') {
                        window.renderNotificaciones(window.appNotificaciones);
                    }
                    if (typeof window.updateAllBadgeScrollFades === 'function') window.updateAllBadgeScrollFades();
                    if (typeof window.observeBadgeScrollContainers === 'function') window.observeBadgeScrollContainers();
                    if (typeof window.cargarEstadoPush === 'function') {
                        window.cargarEstadoPush().then(() => {
                            if (typeof window.renderPushPromoBannerPartidos === 'function') window.renderPushPromoBannerPartidos();
                            if (typeof window.renderNotificaciones === 'function' && window.appNotificaciones) {
                                window.renderNotificaciones(window.appNotificaciones);
                            }
                        }).catch(() => {});
                    }
                    if (isAdmin && (new URLSearchParams(window.location.search).get('admin_tab') === 'solicitudes')) {
                        setTimeout(() => {
                            if (typeof window.abrirSolicitudesAdmin === 'function') {
                                window.abrirSolicitudesAdmin();
                            }
                        }, 500);
                    }
                }, 0);
            });
        } else if (data.status === "ok") {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Conectando...';
            setTimeout(() => {
                btn.disabled = false;
                btn.click();
            }, 400);
            return;
        } else {
            // Si el servidor rechaza por Usuario Baneado / Suspendido
            if (data.code === 'USUARIO_BANEADO') {
                localStorage.removeItem('vcv_saved_session');
                if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
                else document.documentElement.classList.remove('vcv-auto-logging-in');
                if (typeof window.mostrarPantallaBaneo === 'function') {
                    window.mostrarPantallaBaneo(data.motivo_baneo || data.message);
                } else {
                    msgBox.className = "alert-box alert-danger";
                    msgBox.innerHTML = `<b>🚫 Cuenta Suspendida</b><br><span style="font-size:0.8rem;">${data.message}<br><b>Motivo:</b> ${data.motivo_baneo || 'Decisión de la administración.'}</span>`;
                    msgBox.style.display = "block";
                }
                if (typeof updateProgressBar === 'function') updateProgressBar();
                return;
            }

            // Si intenta entrar con un nuevo usuario que todavía está pendiente de aprobación
            if (data.code === 'USUARIO_CAMBIO_PENDIENTE') {
                if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
                else document.documentElement.classList.remove('vcv-auto-logging-in');
                msgBox.className = "alert-box alert-warning";
                msgBox.innerHTML = `<b>⏳ Cambio de Usuario Pendiente</b><br><span style="font-size:0.85rem; line-height:1.4; display:inline-block; margin-top:4px;">${data.message}</span>`;
                msgBox.style.display = "block";
                if (typeof updateProgressBar === 'function') updateProgressBar();
                return;
            }

            // Si intenta entrar con un usuario antiguo cuyo periodo de gracia / uso único ya expiró
            if (data.code === 'ALIAS_EXPIRADO') {
                localStorage.removeItem('vcv_saved_session');
                if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
                else document.documentElement.classList.remove('vcv-auto-logging-in');
                msgBox.className = "alert-box alert-warning";
                msgBox.innerHTML = `<b>⚠️ Usuario Antiguo Desactivado</b><br><span style="font-size:0.85rem; line-height:1.4; display:inline-block; margin-top:4px;">${data.message}</span>`;
                msgBox.style.display = "block";
                if (typeof updateProgressBar === 'function') updateProgressBar();
                return;
            }

            // Si la solicitud de registro fue rechazada por el administrador
            if (data.code === 'REGISTRO_RECHAZADO') {
                localStorage.removeItem('vcv_saved_session');
                if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
                else document.documentElement.classList.remove('vcv-auto-logging-in');
                msgBox.className = "alert-box alert-danger";
                msgBox.innerHTML = `<b>Solicitud no aprobada</b><br><span style="font-size:0.8rem;">${data.message}</span>`;
                msgBox.style.display = "block";
                if (typeof updateProgressBar === 'function') updateProgressBar();
                return;
            }

            // Si el servidor rechaza por Modo Mantenimiento
            if (data.code === 'MODO_MANTENIMIENTO') {
                if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
                else document.documentElement.classList.remove('vcv-auto-logging-in');
                const mb = document.getElementById('mantenimientoBannerLogin');
                if (mb) mb.style.display = 'block';
                msgBox.className = "alert-box alert-danger";
                msgBox.innerHTML = `<b>🚧 Modo Mantenimiento Activo</b><br><span style="font-size:0.8rem;">${data.message || 'El acceso está reservado exclusivamente a administradores. Por favor, vuelve a intentarlo en 5 minutos.'}</span>`;
                msgBox.style.display = "block";
                if (typeof updateProgressBar === 'function') updateProgressBar();
                return;
            }

            // Si el servidor rechaza las credenciales, limpiar la sesión guardada
            const msgLower = (data.message || '').toLowerCase();
            const isCredsError = msgLower.includes('incorrect') || msgLower.includes('inválid') || msgLower.includes('no existe');
            if (isCredsError) {
                localStorage.removeItem('vcv_saved_session');
            }
            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
            else document.documentElement.classList.remove('vcv-auto-logging-in');
            msgBox.className = "alert-box alert-danger"; 
            msgBox.innerText = (data.message && data.message.includes('incorrect')) 
                ? "Tu sesión guardada ya no es válida o las credenciales cambiaron. Inicia sesión de nuevo." 
                : (data.message || "Error devuelto por el servidor."); 
            msgBox.style.display = "block";
            if (typeof updateProgressBar === 'function') updateProgressBar();
        }
    })
    .catch(err => { 
        if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
        else document.documentElement.classList.remove('vcv-auto-logging-in');
        msgBox.className = "alert-box alert-danger"; 
        msgBox.innerHTML = `<div style="margin-bottom:6px;">⚠️ Error de conexión: ${err.message || 'Sin conexión'}</div>
        <button type="button" onclick="document.getElementById('btnLogin').click()" style="background:#fff; color:#e74c3c; border:none; padding:4px 10px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.75rem;">🔄 Reintentar</button>`; 
        msgBox.style.display = "block";
        if (typeof updateProgressBar === 'function') updateProgressBar(); 
    })
    .finally(() => { 
        btn.innerText = "Entrar"; 
        btn.disabled = false; 
    });
});

// -------------------------------------------------------------
// SISTEMA DE SESIÓN PERSISTENTE Y AUTO-LOGIN (LOCAL)
// -------------------------------------------------------------
window.verificarAutoLogin = function() {
    window._autoLoginStartTs = Date.now();
    // Situación 1: Si el usuario acaba de pulsar 'Cerrar sesión / Volver', no auto-iniciar
    if (sessionStorage.getItem('vcv_just_logged_out')) {
        sessionStorage.removeItem('vcv_just_logged_out');
        localStorage.removeItem('vcv_saved_session');
        if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
        else document.documentElement.classList.remove('vcv-auto-logging-in');
        return;
    }

    // Situación 2: Parámetro en la URL para forzar salida (?logout=1)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout')) {
        localStorage.removeItem('vcv_saved_session');
        if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
        else document.documentElement.classList.remove('vcv-auto-logging-in');
        return;
    }

    try {
        const raw = localStorage.getItem('vcv_saved_session');
        if (!raw) {
            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
            else document.documentElement.classList.remove('vcv-auto-logging-in');
            return;
        }
        const ses = JSON.parse(raw);
        if (!ses || !ses.usuario || !ses.password) {
            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
            else document.documentElement.classList.remove('vcv-auto-logging-in');
            return;
        }

        // Situación 3: Caducidad por inactividad prolongada (ej. 30 días)
        const DIAS_LIMITE = 30;
        if (ses.ts && (Date.now() - ses.ts > DIAS_LIMITE * 24 * 60 * 60 * 1000)) {
            console.warn("Sesión caducada por superar el límite de 30 días.");
            localStorage.removeItem('vcv_saved_session');
            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
            else document.documentElement.classList.remove('vcv-auto-logging-in');
            return;
        }
        // Renovar fecha de actividad para que cuente 30 días desde la última vez que abrió la app
        try {
            ses.ts = Date.now();
            localStorage.setItem('vcv_saved_session', JSON.stringify(ses));
        } catch(e) {}

        const inputUsr = document.getElementById('loginUsuario');
        const inputPwd = document.getElementById('loginPassword');
        const btn = document.getElementById('btnLogin');
        const chk = document.getElementById('chkRecordarSesion');

        if (inputUsr && inputPwd && btn) {
            inputUsr.value = ses.usuario;
            inputPwd.value = ses.password;
            if (chk) chk.checked = true;

            // Renderizado instantáneo (0ms) desde caché de sesión mientras la red verifica en segundo plano
            try {
                const rawCache = sessionStorage.getItem('vcv_cached_app_data');
                if (rawCache) {
                    const cached = JSON.parse(rawCache);
                    if (cached && cached.data && cached.usuario === ses.usuario && (Date.now() - cached.ts < 6 * 3600000)) {
                        window.appData = cached.data;
                        if (typeof window.renderCarteleraHTML === 'function') {
                            window.renderCarteleraHTML(cached.data);
                        }
                    }
                }
            } catch(e) {}

            window._esAutoLogin = true;
            btn.disabled = false;
            btn.click();
        } else {
            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
        }
    } catch(e) {
        if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
        console.error("Error al procesar auto-login:", e);
    }
};

// Ejecutar verificación en cuanto la página esté lista
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.verificarAutoLogin);
} else {
    window.verificarAutoLogin();
}


// -------------------------------------------------------------
// VERIFICAR ESTADO PÚBLICO DE MODO MANTENIMIENTO
// -------------------------------------------------------------
window.verificarEstadoMantenimientoPublico = function() {
    try {
        if (localStorage.getItem('vcv_saved_session') && !sessionStorage.getItem('vcv_just_logged_out')) {
            // El endpoint de auto-login ya comprueba y devuelve el estado de mantenimiento
            return;
        }
    } catch(e) {}
    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'get_mantenimiento_status' }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (d && d.status === 'success') {
            const banner = document.getElementById('mantenimientoBannerLogin');
            if (banner) {
                banner.style.display = d.activo ? 'block' : 'none';
            }
            const btnGuest = document.getElementById('btnGuest');
            if (btnGuest && d.activo) {
                btnGuest.style.opacity = '0.5';
                btnGuest.title = 'No disponible durante modo mantenimiento';
            }
        }
    })
    .catch(() => {});
};

// Comprobar estado en carga inicial
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.verificarEstadoMantenimientoPublico);
} else {
    window.verificarEstadoMantenimientoPublico();
}



// FAQ DESPLEGABLE, CIERRE AUTOMATICO Y SCROLL SUAVE
window.cerrarFaqDesplegado = function() {
    var wrap = document.getElementById('faqContainerWrapper');
    var faq = document.getElementById('masterFaq');
    if (faq) faq.open = false;
    if (wrap) wrap.style.display = 'none';
    var loginCard = document.querySelector('.login-card') || document.getElementById('loginSection');
    if (loginCard) {
        loginCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

window.abrirFaqDesplegado = function() {
    var wrap = document.getElementById('faqContainerWrapper');
    var faq = document.getElementById('masterFaq');
    if (!wrap || !faq) return;

    if (wrap.style.display !== 'none' && faq.open) {
        // Si ya está abierto, lo cerramos y volvemos a ocultar
        window.cerrarFaqDesplegado();
    } else {
        // Si está cerrado, lo mostramos, abrimos y hacemos scroll suave
        wrap.style.display = 'block';
        faq.open = true;
        setTimeout(function() {
            faq.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }
};

function initFaqAutoClose() {
    var faq = document.getElementById('masterFaq');
    var wrap = document.getElementById('faqContainerWrapper');
    if (faq && wrap) {
        faq.addEventListener('toggle', function() {
            if (!faq.open) {
                wrap.style.display = 'none';
                var loginCard = document.querySelector('.login-card') || document.getElementById('loginSection');
                if (loginCard) {
                    loginCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaqAutoClose);
} else {
    initFaqAutoClose();
}

// ==============================================================================
// 📝 MODAL Y FORMULARIO DE SOLICITUD DE REGISTRO
// ==============================================================================

window.abrirModalSolicitarCuenta = function() {
    const modal = document.getElementById('modalSolicitarCuenta');
    if (!modal) return;
    
    // Limpiar campos y alertas
    const nr = document.getElementById('solicitarNombreReal');
    const u = document.getElementById('solicitarUsuario');
    const em = document.getElementById('solicitarEmail');
    const p1 = document.getElementById('solicitarPassword');
    const p2 = document.getElementById('solicitarPassword2');
    const selEq = document.getElementById('solicitarEquipoClub');
    const otroEq = document.getElementById('solicitarEquipoOtroTexto');
    const boxOtro = document.getElementById('contenedorSolicitarEquipoOtro');
    const msg = document.getElementById('solicitarMensaje');
    const btn = document.getElementById('btnEnviarSolicitud');
    
    if (nr) nr.value = '';
    if (u) u.value = '';
    if (em) em.value = '';
    if (p1) p1.value = '';
    if (p2) p2.value = '';
    if (selEq) selEq.value = 'NINGUNO';
    if (otroEq) otroEq.value = '';
    const hp = document.getElementById('solicitarSecurityCheck');
    if (hp) hp.value = '';
    window._solicitudModalOpenedAt = Date.now();
    if (typeof window.toggleSolicitarEquipoOtro === 'function') {
        window.toggleSolicitarEquipoOtro(selEq ? selEq.value : 'NINGUNO');
    }
    if (msg) { msg.style.display = 'none'; msg.innerHTML = ''; }
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>🚀</span> <span>Crear Cuenta</span>'; btn.style.background = ''; }
    
    modal.style.display = 'flex';

    // Detector de scroll para la pista visual de "Desliza hacia abajo"
    const card = document.getElementById('cardSolicitarCuenta');
    if (card) {
        card.scrollTop = 0;
        const hint = document.getElementById('scrollHintSolicitarModal');
        if (hint) {
            hint.style.opacity = '1';
            hint.style.pointerEvents = 'auto';
        }
        if (!card._vcvScrollHintBound) {
            card._vcvScrollHintBound = true;
            card.addEventListener('scroll', function() {
                const h = document.getElementById('scrollHintSolicitarModal');
                if (!h) return;
                const isNearBottom = (card.scrollHeight - card.scrollTop - card.clientHeight) < 60;
                h.style.opacity = isNearBottom ? '0' : '1';
                h.style.pointerEvents = isNearBottom ? 'none' : 'auto';
            });
        }
    }
};

window.scrollDownModalSolicitar = function() {
    const card = document.getElementById('cardSolicitarCuenta');
    if (card) {
        card.scrollBy({ top: 220, behavior: 'smooth' });
    }
};

window.toggleSolicitarEquipoOtro = function(val) {
    const box = document.getElementById('contenedorSolicitarEquipoOtro');
    const txt = document.getElementById('solicitarEquipoOtroTexto');
    if (!box || !txt) return;

    if (val === 'NINGUNO') {
        box.style.display = 'block';
        txt.placeholder = 'Especifica tu relación (ej. Aficionado, Familiar, Entrenador...)';
    } else if (val === 'OTRO') {
        box.style.display = 'block';
        txt.placeholder = 'Especifica tu categoría o equipo (ej. Juvenil Masc, Cadete Fem...)';
        txt.focus();
    } else {
        box.style.display = 'none';
        txt.value = '';
    }
};

window.cerrarModalSolicitarCuenta = function() {
    const modal = document.getElementById('modalSolicitarCuenta');
    if (modal) modal.style.display = 'none';
};

window.enviarSolicitudRegistro = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const nr = (document.getElementById('solicitarNombreReal')?.value || '').trim();
    const u = (document.getElementById('solicitarUsuario')?.value || '').trim();
    const em = (document.getElementById('solicitarEmail')?.value || '').trim().toLowerCase();
    const p1 = (document.getElementById('solicitarPassword')?.value || '').trim();
    const p2 = (document.getElementById('solicitarPassword2')?.value || '').trim();
    const selEq = document.getElementById('solicitarEquipoClub')?.value || 'NINGUNO';
    let equipoFinal = selEq;
    if (selEq === 'NINGUNO') {
        const txtEsp = (document.getElementById('solicitarEquipoOtroTexto')?.value || '').trim();
        equipoFinal = txtEsp ? `Ninguno (${txtEsp})` : 'Ninguno (Aficionado / Seguidor)';
    } else if (selEq === 'OTRO') {
        const txtOtro = (document.getElementById('solicitarEquipoOtroTexto')?.value || '').trim();
        if (!txtOtro) {
            showError('Por favor, indica tu equipo o categoría en el campo de texto.');
            document.getElementById('solicitarEquipoOtroTexto')?.focus();
            return;
        }
        equipoFinal = txtOtro;
    }
    const msg = document.getElementById('solicitarMensaje');
    const btn = document.getElementById('btnEnviarSolicitud');
    
    const showError = (txt) => {
        if (!msg) return;
        msg.style.display = 'block';
        msg.style.background = 'rgba(231, 76, 60, 0.15)';
        msg.style.border = '1px solid #e74c3c';
        msg.style.color = '#ff6b81';
        msg.innerHTML = `⚠️ ${txt}`;
    };

    const showSuccess = (txt) => {
        if (!msg) return;
        msg.style.display = 'block';
        msg.style.background = 'rgba(46, 204, 113, 0.15)';
        msg.style.border = '1px solid #2ecc71';
        msg.style.color = '#2ecc71';
        msg.innerHTML = `✅ ${txt}`;
    };

    if (!u || u.length < 3) {
        showError('El nombre de usuario debe tener al menos 3 caracteres.');
        return;
    }
    if (/\s/.test(u)) {
        showError('El nombre de usuario no puede contener espacios.');
        return;
    }
    if (!em || !em.includes('@') || !em.includes('.')) {
        showError('Introduce un correo electrónico válido.');
        return;
    }
    if (!p1 || p1.length < 4) {
        showError('La contraseña debe tener al menos 4 caracteres.');
        return;
    }
    if (p1 !== p2) {
        showError('Las contraseñas no coinciden. Por favor, revísalas.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> <span>Creando cuenta...</span>';
    }
    if (msg) msg.style.display = 'none';

    const honeypotVal = (document.getElementById('solicitarSecurityCheck') ? document.getElementById('solicitarSecurityCheck').value : '').trim();
    const elapsedVal = Date.now() - (window._solicitudModalOpenedAt || 0);

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'request_registration',
                new_u: u,
                new_p: p1,
                new_n: nr || u,
                new_email: em,
                equipo_club: equipoFinal,
                honeypot: honeypotVal,
                client_elapsed: elapsedVal
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();
        
        if (data && data.status === 'success') {
            showSuccess(data.message || '¡Cuenta creada con éxito! Ya puedes iniciar sesión con tu usuario y contraseña.');
            if (btn) {
                btn.innerHTML = '<span>✅</span> <span>¡Cuenta Creada!</span>';
                btn.style.background = '#27ae60';
            }
            // Autorrellenar campos de login
            const inpU = document.getElementById('username');
            const inpP = document.getElementById('password');
            if (inpU) inpU.value = u;
            if (inpP) inpP.value = p1;

            setTimeout(() => {
                window.cerrarModalSolicitarCuenta();
                if (typeof mostrarToast === 'function') {
                    mostrarToast('✨ Ya puedes pulsar en Iniciar Sesión para entrar con tu cuenta.');
                }
            }, 2500);
        } else {
            showError((data && data.message) || 'Error al procesar el registro.');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>🚀</span> <span>Crear Cuenta</span>';
            }
        }
    } catch(err) {
        showError('Error de conexión con el servidor. Por favor, inténtalo de nuevo.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>🚀</span> <span>Crear Cuenta</span>';
        }
    }
};

// -------------------------------------------------------------
// MODAL DE AVISO DE MODERACIÓN / CAMBIO DE NOMBRE POR ADMIN
// -------------------------------------------------------------
window.mostrarAvisoModeracion = function(msg, user) {
    if (!msg) return;
    if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
    let modal = document.getElementById('modalAvisoModeracion');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalAvisoModeracion';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10005; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);';
        modal.innerHTML = `
            <div style="background:var(--bg-card); border:1.5px solid #f39c12; border-radius:18px; max-width:440px; width:100%; padding:22px 20px; box-shadow:0 14px 48px rgba(0,0,0,0.7); text-align:left;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:rgba(243, 156, 18, 0.18); display:flex; align-items:center; justify-content:center; font-size:1.4rem;">⚠️</div>
                    <div>
                        <h3 style="margin:0; font-size:1.1rem; font-weight:800; color:#f39c12;">Aviso de la Administración</h3>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Mensaje sobre tu cuenta</span>
                    </div>
                </div>
                <div style="font-size:0.85rem; color:var(--text-main); line-height:1.5; margin-bottom:14px; background:rgba(0,0,0,0.25); padding:12px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
                    <p style="margin:0 0 6px 0;">Hola <b>@${user || ''}</b>:</p>
                    <div id="modalAvisoModeracionTexto" style="color:#f1c40f; font-weight:600; white-space:pre-wrap; word-break:break-word;"></div>
                </div>
                <p style="font-size:0.75rem; color:var(--text-muted); margin:0 0 16px 0; line-height:1.4;">
                    Puedes continuar utilizando VCV Play normalmente con tus datos asignados o consultar tu información desde tu <b>Perfil</b>.
                </p>
                <button type="button" class="btn-gold-v2" onclick="window.cerrarAvisoModeracion()" style="width:100%; padding:11px; font-weight:800; font-size:0.9rem; border-radius:10px; cursor:pointer;">
                    Entendido
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const txtEl = document.getElementById('modalAvisoModeracionTexto');
    if (txtEl) txtEl.innerText = msg;
    modal.style.display = 'flex';
};

window.cerrarAvisoModeracion = function() {
    const modal = document.getElementById('modalAvisoModeracion');
    if (modal) modal.style.display = 'none';
    if (typeof fetchSeguro === 'function' && typeof scriptURL !== 'undefined' && currentUser && currentPassword) {
        fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'dismiss_aviso_moderacion',
                usuario: currentUser,
                password: currentPassword
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        }).catch(() => {});
    }
};

// MODAL DE BLOQUEO / CUENTA BANEADA POR ADMINISTRADOR
// -------------------------------------------------------------
window.mostrarPantallaBaneo = function(motivo) {
    try {
        localStorage.removeItem('vcv_saved_session');
    } catch(e) {}
    if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin(true);
    else document.documentElement.classList.remove('vcv-auto-logging-in');

    let modal = document.getElementById('modalUsuarioBaneado');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalUsuarioBaneado';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(10,5,15,0.96); z-index:999999; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);';
        modal.innerHTML = `
            <div style="background:linear-gradient(180deg, #1f0d14 0%, #14080c 100%); border:2px solid #e74c3c; border-radius:18px; max-width:440px; width:100%; padding:24px 20px; text-align:center; box-shadow:0 14px 48px rgba(231,76,60,0.4); box-sizing:border-box;">
                <div style="width:64px; height:64px; border-radius:50%; background:rgba(231,76,60,0.15); border:2px solid rgba(231,76,60,0.5); display:flex; align-items:center; justify-content:center; font-size:2.2rem; margin:0 auto 16px auto;">
                    🚫
                </div>
                <h2 style="margin:0 0 8px 0; color:#ff6b6b; font-size:1.25rem; font-weight:900; letter-spacing:-0.3px;">
                    Cuenta Suspendida / Bloqueada
                </h2>
                <p style="margin:0 0 14px 0; font-size:0.82rem; color:#ddd; line-height:1.45;">
                    El acceso a VCV Play ha sido suspendido para esta cuenta por la administración del club.
                </p>
                <div style="background:rgba(0,0,0,0.45); border-left:3px solid #e74c3c; border-radius:8px; padding:12px; text-align:left; margin-bottom:18px;">
                    <div style="font-size:0.68rem; font-weight:800; color:#ff6b6b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
                        Motivo de la suspensión:
                    </div>
                    <div id="modalUsuarioBaneadoMotivo" style="font-size:0.82rem; color:#fff; line-height:1.4; word-break:break-word;"></div>
                </div>
                <p style="margin:0 0 20px 0; font-size:0.73rem; color:var(--text-muted); line-height:1.4;">
                    Si consideras que se trata de un error o deseas resolver esta situación, puedes ponerte en contacto con la administración del club.
                </p>
                <button type="button" onclick="window.cerrarSesionApp()" class="btn" style="width:100%; padding:12px; font-size:0.88rem; background:#e74c3c; color:#fff; border:none; border-radius:10px; font-weight:800; cursor:pointer; box-shadow:0 4px 14px rgba(231,76,60,0.4); display:flex; align-items:center; justify-content:center; gap:8px;">
                    <span>🚪</span> <span>Cerrar Sesión</span>
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const txtEl = document.getElementById('modalUsuarioBaneadoMotivo');
    if (txtEl) {
        txtEl.innerText = motivo || 'Tu cuenta ha sido bloqueada temporal o indefinidamente por incumplimiento de las normas o decisión de la administración.';
    }
    modal.style.display = 'flex';
};
