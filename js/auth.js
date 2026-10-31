window.ocultarOverlayAutoLogin = function() {
    try {
        const elapsed = Date.now() - (window._autoLoginStartTs || 0);
        // Garantizar al menos 1.2s en auto-login para que el aficionado aprecie la pantalla de carga y el patrocinador
        const minTime = window._autoLoginStartTs ? 1200 : 0;
        const remaining = Math.max(0, minTime - elapsed);
        setTimeout(() => {
            const o = document.getElementById('vcvAutoLoginOverlay');
            if (o) {
                o.style.transition = 'opacity 0.3s ease';
                o.style.opacity = '0';
                setTimeout(() => {
                    document.documentElement.classList.remove('vcv-auto-logging-in');
                    o.style.setProperty('display', 'none', 'important');
                    o.style.opacity = '1';
                }, 300);
            } else {
                document.documentElement.classList.remove('vcv-auto-logging-in');
            }
        }, remaining);
    } catch(e) {}
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
    sessionStorage.setItem('vcv_just_logged_out', 'true');
    sessionStorage.setItem('vcv_slide_left', 'true');
    
    const appSec = document.getElementById('appSection');
    if (appSec) appSec.classList.add('slide-out-right');
    
    setTimeout(() => {
        window.location.href = window.location.pathname + '?v=' + new Date().getTime();
    }, 280);
};


// ------------------------------------------------------------------

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
                            let baseTime = p.mvp_proclamado_ts || p.timestamp || 0;
                            if (baseTime && (now - baseTime > 48 * 60 * 60 * 1000)) {
                                isTooOld = true;
                            }
                        } else if (p.mvp_publicacion_ts && p.mvp_publicacion_ts > now) {
                            isTooOld = false;
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
                data.todos_partidos = guestMatches;
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
                    <button type="button" onclick="switchTabV2('guestInfoSection', document.getElementById('navItemGuestInfo'))" style="background:var(--secondary-color); color:#000; font-weight:800; border:none; padding:8px 14px; border-radius:10px; font-size:0.82rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        <span>¡Únete!</span> ✨
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

            // Render modern match cards
            window.appData = data;
            window.appData.usuario = "Invitado";
            window.currentUser = "Invitado";
            window.renderCarteleraHTML(data);

            // Notifications
            if (data.notificaciones && data.notificaciones.length > 0) {
                const notifBadge = document.querySelector('.header-bell-badge');
                if (notifBadge) {
                    notifBadge.style.display = 'flex';
                    notifBadge.innerText = data.notificaciones.length;
                }
            }

            // Activate cartelera tab
            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin();
            document.getElementById('loginSection').style.display = "none";
            document.getElementById('appSection').style.display = "block";
            const firstNavBtn = navItems[0] || null;
            switchTabV2('carteleraSection', firstNavBtn);
        } else {
            document.documentElement.classList.remove('vcv-auto-logging-in');
            msgBox.className = "alert-box alert-danger"; msgBox.innerText = data.message || "Error cargando modo invitado."; msgBox.style.display = "block";
            if (typeof updateProgressBar === 'function') updateProgressBar();
        }
    })
    .catch(err => { 
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
            
            currentUser = usr; currentPassword = pwd;
            
            // Guardar sesión persistente si el checkbox está marcado
            const chkRec = document.getElementById('chkRecordarSesion');
            if (!chkRec || chkRec.checked) {
                try {
                    localStorage.setItem('vcv_saved_session', JSON.stringify({
                        usuario: usr,
                        password: pwd,
                        ts: Date.now()
                    }));
                } catch(e) {}
            } else {
                localStorage.removeItem('vcv_saved_session');
            }
            // --- NOTIFICACIONES ---
            if (data.notificaciones) {
                const notifBadge = document.querySelector('.header-bell-badge');
                const notifContainer = document.getElementById('notificacionesContainer');
                
                if (data.notificaciones.length > 0) {
                    if (notifBadge) {
                        notifBadge.style.display = 'flex';
                        notifBadge.innerText = data.notificaciones.length;
                        const hasHigh = data.notificaciones.some(n => n.Importancia === 'ALTA');
                        notifBadge.style.animation = hasHigh ? 'pulse-badge 2s infinite' : 'none';
                    }
                    
                    if (notifContainer) {
                        let html = '';
                        data.notificaciones.forEach((n, idx) => {
                            const iconColor = n.Tipo === 'Aviso' ? '#e67e22' : 'var(--primary-color)';
                            const iconType = n.Tipo === 'Aviso' ? 'alert-triangle' : 'info';
                            const isLast = idx === data.notificaciones.length - 1;
                            
                            html += `
                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                <i data-lucide="${iconType}" style="width: 20px; height: 20px; color: ${iconColor}; flex-shrink: 0; margin-top: 2px;"></i>
                                <div>
                                    <strong style="color: var(--text-main); font-size: 0.95rem; display: block; margin-bottom: 4px;">${n.Titulo}</strong>
                                    <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0; line-height: 1.4;">${n.Mensaje}</p>
                                </div>
                            </div>`;
                            
                            if (!isLast) {
                                html += `<div style="height:1px; background:rgba(255, 255, 255, 0.1); width:100%;"></div>`;
                            }
                        });
                        notifContainer.innerHTML = html;
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }
                } else {
                    if (notifBadge) notifBadge.style.display = 'none';
                    if (notifContainer) notifContainer.innerHTML = '<div style="text-align:center; padding: 20px 0;">No hay notificaciones nuevas.</div>';
                }
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
            
            // Asegurar que appData y currentUser estén disponibles antes de calcular podioBadges
            window.appData = data;
            window.appData.usuario = usr;
            window.currentUser = usr;

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
            if (typeof window.renderPushPromoBannerPartidos === 'function') window.renderPushPromoBannerPartidos();
            if (typeof window.updateAllBadgeScrollFades === 'function') setTimeout(window.updateAllBadgeScrollFades, 20);
            if (typeof window.observeBadgeScrollContainers === 'function') setTimeout(window.observeBadgeScrollContainers, 20);
            
            let promoDiv2 = document.getElementById('guestPromoBanner');
            if (promoDiv2) promoDiv2.style.display = "none";
            currentJornadaGlobal = data.jornada;
            if (typeof window.aplicarHorasMvpLocales === 'function') window.aplicarHorasMvpLocales(data);
            window.appData = data;
            if (Array.isArray(data.plantilla_superliga) && data.plantilla_superliga.length > 0) {
                try { localStorage.setItem('vcv_plantilla_superliga_cache', JSON.stringify(data.plantilla_superliga)); } catch(e) {}
            }
            if(window.initCalendar) window.initCalendar();
            if(window.renderHistorialV2) window.renderHistorialV2(data);
            if(window.loadInsigniasUI) window.loadInsigniasUI();
            if(window.renderMyProfileCard) window.renderMyProfileCard();
            
            

            if(data.reglas) {
                let pctMvpVal = (data.reglas.pct_mvp !== undefined) ? data.reglas.pct_mvp : 10;
                let listaReglas = document.getElementById('listaReglasPuntuacion');
                if(listaReglas) {
                    listaReglas.innerHTML = `
                        <li>Acertar el <b>Resultado Exacto (Sets)</b>: <span style="color:var(--vcv-rojo); font-weight:bold;">+${data.reglas.sets} pts</span></li>
                        <li>Acertar el <b>Ganador del partido</b>: <span style="color:var(--vcv-rojo); font-weight:bold;">+${data.reglas.ganador} pts</span></li>
                        <li>Acertar la <b>Diferencia de puntos exacta</b>: <span style="color:var(--vcv-rojo); font-weight:bold;">+${data.reglas.diff_exacta} pts</span> extra</li>
                        <li>Aproximarse a la diferencia (margen de ${data.reglas.max_dist} pts): <span style="color:var(--vcv-rojo); font-weight:bold;">Bonus proporcional</span></li>
                        <li>Acertar el <b>MVP</b>: <span style="color:var(--secondary-color); font-weight:bold;">+${pctMvpVal}% bonus extra</span> sobre los puntos del partido</li>
                    `;
                }
                const pExact = document.getElementById('puntosExactosModal');
                const pMargen = document.getElementById('puntosMargenModal');
                if (pExact) pExact.innerText = data.reglas.diff_exacta;
                if (pMargen) pMargen.innerText = data.reglas.max_dist;

                // Actualizar textos dinámicos del modal de información de MVP
                const elMvpPctModal = document.getElementById('infoMvpBonusPct');
                if (elMvpPctModal) elMvpPctModal.innerText = `+${pctMvpVal}%`;
                const elMvpEjemploModal = document.getElementById('infoMvpBonusEjemplo');
                if (elMvpEjemploModal) {
                    let bonusEj = Math.ceil(12 * (pctMvpVal / 100));
                    elMvpEjemploModal.innerText = `El cálculo se redondea siempre hacia arriba. Por ejemplo, si logras 12 puntos y aciertas el MVP, ganas +${bonusEj} pts extra (total ${12 + bonusEj} pts).`;
                }

                const ejCont = document.getElementById('ejemploProporcionalModal');
                if(ejCont && data.reglas.diff_exacta && data.reglas.max_dist) {
                    let pDE = parseInt(data.reglas.diff_exacta);
                    let mD = parseInt(data.reglas.max_dist);
                    let calcP = (d) => {
                        if(d >= mD) return 0;
                        return Math.round(pDE * ((mD - d) / mD));
                    };
                    
                    let htmlEjemplo = `<b>Reparto actual de puntos:</b><br>`;
                    htmlEjemplo += `• Alejarte 1 punto exacto: +${calcP(1)} pts<br>`;
                    if (mD > 2) htmlEjemplo += `• Alejarte 2 puntos exactos: +${calcP(2)} pts<br>`;
                    if (mD > 3) htmlEjemplo += `• Alejarte 3 puntos exactos: +${calcP(3)} pts<br>`;
                    
                    if (mD > 4) {
                       htmlEjemplo += `• ...<br>`;
                    }
                    htmlEjemplo += `• Alejarte ${mD} o más puntos: 0 pts`;
                    
                    ejCont.innerHTML = htmlEjemplo;
                }


                
                // Update match cards dynamically
                                            }

            let displayNom = data.nombre_real && data.nombre_real !== usr ? `${data.nombre_real} <span style="font-size:0.85rem; color:#666; font-weight:normal; font-family:sans-serif;">(@${usr})</span>` : usr;
            
            
            // Populating new Header V2
            let nameEl = document.getElementById('h2-user-name'); if(nameEl) nameEl.innerText = data.nombre_real || usr;
            if (data.correo) { let emlDisp = document.getElementById('currentEmailDisplay'); let emlTxt = document.getElementById('currentEmailText'); if(emlDisp && emlTxt) { emlDisp.style.display = 'block'; emlTxt.innerText = data.correo; } }
            let handleEl = document.getElementById('h2-user-handle'); if(handleEl) handleEl.innerText = "@" + usr;
            
            let misInsignias = data.insignias[usr] || [];
            let insigniasHeaderHtml = "";
            let insigniasH2Html = "";
            let isAdmin = false;
            let hasPermisoMvp = false;
            let hasPermisoResultados = false;
            let permisoResultadosVal = "";

            // Calculate Rank from Global Leaderboard
            if(typeof window.updateHeaderStats === "function") { window.updateHeaderStats(); } else { setTimeout(() => { if(typeof window.updateHeaderStats === "function") window.updateHeaderStats(); }, 500); }
            let displayMisInsignias = misInsignias.filter(b => b.type !== 'avatar');
            displayMisInsignias.forEach(b => {
                if (b.type === 'admin') isAdmin = true;
                if (b.type === 'permiso_mvp') hasPermisoMvp = true;
                if (b.type === 'permiso_resultados') {
                    hasPermisoResultados = true;
                    permisoResultadosVal = b.text || "";
                }
                let cssColorClass = getBadgeCSS(b.type);
                let badgeIconHeader = renderBadgeIcon(b, "badge-header", "width:18px; height:18px; cursor:pointer;");
                if (badgeIconHeader) {
                    insigniasHeaderHtml += badgeIconHeader.replace(">", ` title="${b.text}" onclick="showMobileTooltip(event, \'${b.text}\')">`);
                }
                
                // NO tooltips, NO onclick for the top header badges! Just visual.
                let badgeIconH2 = renderBadgeIcon(b, "", "width:14px; height:14px;");
                if (badgeIconH2) {
                    insigniasH2Html += badgeIconH2;
                }
            });
            
            let badgesEl = document.getElementById('h2-user-badges'); if(badgesEl) badgesEl.innerHTML = insigniasH2Html;
            
            // Render lucide icons in the newly injected HTML
            lucide.createIcons();
            
            let canAccessIntranet = isAdmin || hasPermisoMvp || hasPermisoResultados;
            window._userPermisoResultados = isAdmin ? 'TODOS' : (hasPermisoResultados ? permisoResultadosVal : '');

            if (canAccessIntranet) {
                document.getElementById('adminPanelWrapper').style.display = "block";

                // Personalizar encabezado según rol
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

                // Mostrar/Ocultar secciones según permisos
                const allCollapsibles = document.querySelectorAll('#adminMainDetails details.admin-collapsible');
                allCollapsibles.forEach(sec => {
                    if (isAdmin) {
                        sec.style.display = "block";
                    } else {
                        // Para usuarios no-admin, ocultar todo excepto sus secciones autorizadas
                        if (sec.id === 'secAdminMvp' && hasPermisoMvp) {
                            sec.style.display = "block";
                        } else if (sec.id === 'secAdminResultados' && hasPermisoResultados) {
                            sec.style.display = "block";
                        } else {
                            sec.style.display = "none";
                        }
                    }
                });

                // Si tiene acceso a resultados, renderizar la lista de partidos
                if (isAdmin || hasPermisoResultados) {
                    renderAdminPanel(data.equipos);
                }

                // Renderizar plantilla MVP si tiene acceso a MVP
                if (isAdmin || hasPermisoMvp) {
                    if (typeof window.renderAdminPlantillaMvp === 'function') window.renderAdminPlantillaMvp();
                    if (typeof window.populateDirectMvpBoxes === 'function') window.populateDirectMvpBoxes();
                }
                
                // Elementos exclusivos de administrador completo
                if (isAdmin) {
                    // POPULATE LIGAS
                    var ligasContainer = document.getElementById('adminLigasCheckboxes');
                    if (ligasContainer && data.todas_las_ligas) {
                        ligasContainer.innerHTML = '';
                        var allLigas = data.todas_las_ligas;
                        allLigas.forEach(function(liga) {
                            if (!liga) return;
                            var div = document.createElement('div');
                            div.innerHTML = '<label style="margin:0; cursor:pointer;"><input type="checkbox" value="' + liga + '" style="margin-right:5px;"> ' + liga + '</label>';
                            ligasContainer.appendChild(div);
                        });
                    }

                    // POPULATE LIGAS CONGELAR (FINDE)
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

                    // ACTUALIZAR ESTADO VISUAL DE CONGELACIÓN (ADMIN)
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
                                freezeDesc.innerHTML = 'Siguiendo el horario habitual de fin de semana. Se descongelará solo el lunes a las 18:00 (o pulsa <b>Descongelar Ahora</b> si quieres adelantarlo ya).';
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
            } else {
                document.getElementById('adminPanelWrapper').style.display = "none";
            }

             document.getElementById('tituloPrincipalSeccion').style.display = 'block';

            // Render match cards with unified function
            window.renderCarteleraHTML(data);

            
            if(data.ligas && data.ligas.length > 0) {
                window.currentLiga = data.ligas[0];
            }
            if(typeof window.renderRankingV2 === "function") { window.renderRankingV2(); } else { setTimeout(() => { if(typeof window.renderRankingV2 === "function") window.renderRankingV2(); }, 500); }
            if(!data.equipos_totales || data.equipos_totales.length === 0) {
                let tsSec = document.getElementById('prediccionesTotalesSection');
                if(tsSec) tsSec.remove();
            }
            if(data.equipos_totales && data.equipos_totales.length > 0) {
                let tsSec = document.getElementById('prediccionesTotalesSection');
                if(tsSec) tsSec.style.display = '';
                
                
                let isClosed = new Date().getTime() >= new Date("2026-10-10T12:00:00").getTime();
                
                let htmlTot = ``;
                
                data.equipos_totales.forEach(eq => {
                    let ptsActuales = data.puntos_reales[eq] || 0;
                    let misPts = "";
                    let listaOtros = "";
                    let categoriaEq = "";
                    let matchEncontrado = data.equipos.find(m => m.equipo_local === eq || m.rival === eq);
                    if (matchEncontrado && matchEncontrado.categoria) {
                        categoriaEq = matchEncontrado.categoria;
                    }
                    let porrasEq = data.predicciones_totales[eq] || [];
                    
                    // Nadie podrá ver la puntuación del resto nunca
                    misPts = "";
                    porrasEq.forEach(porra => {
                        if (porra.usuario === usr) misPts = porra.puntos;
                    });
                    
                    let miCajonHTML = "";
                    if (isClosed) {
                        let txtPts = misPts !== "" ? `${misPts} pts` : "Sin predicción";
                        miCajonHTML = `
                        <div style="background:var(--bg-card-alt); padding:10px; border-radius:10px; border:1px solid var(--border-color); margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
                            <label style="font-weight:700; color:var(--text-muted); font-size:0.75rem; margin:0; text-transform:uppercase;">Tu predicción final:</label>
                            <div style="font-size:1.1rem; font-weight:900; color:var(--secondary-color); display:flex; align-items:center; gap:6px;">
                                <i data-lucide="lock" style="width:14px; height:14px;"></i>
                                ${txtPts}
                            </div>
                        </div>`;
                    } else {
                        miCajonHTML = `
                        <div style="background:var(--bg-card-alt); padding:10px; border-radius:10px; border:1px solid var(--border-color); margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
                            <label style="font-weight:700; color:var(--text-muted); font-size:0.75rem; margin:0; text-transform:uppercase;">Tu predicción:</label>
                            <div class="stepper-container-v2" style="width: 140px; background:var(--bg-input);">
                                <button type="button" class="btn-step-v2" style="width:30px; height:30px; border-radius:6px;" onclick="document.getElementById('pt_${eq}').stepDown()">-</button>
                                <div class="stepper-value-v2" style="flex:1; min-width:auto;">
                                    <input type="number" id="pt_${eq}" placeholder="0" value="${misPts}" style="background:transparent; border:none; text-align:center; font-size:1.1rem; font-weight:900; color:var(--secondary-color); width:100%; outline:none; -moz-appearance:textfield; margin:0; padding:0; height:30px;">
                                </div>
                                <button type="button" class="btn-step-v2" style="width:30px; height:30px; border-radius:6px;" onclick="document.getElementById('pt_${eq}').stepUp()">+</button>
                            </div>
                        </div>`;
                    }
                    
                    if (!categoriaEq && data.todos_partidos) {
                        let matchTodo = data.todos_partidos.find(m => m.equipo_local === eq || m.rival === eq);
                        if (matchTodo && matchTodo.categoria) categoriaEq = matchTodo.categoria;
                    }
                    
                    htmlTot += `
                    <div class="vcv-card-v2" style="margin-bottom:10px; padding: 14px 16px; border-left:4px solid var(--vcv-dorado); text-align: left;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
                            <div style="display:flex; flex-direction:column; min-width:0; flex:1; text-align:left;">
                                <h4 style="color:var(--text-main); margin:0; font-weight:800; font-size:1.02rem; letter-spacing:-0.3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:left;" title="${eq}">${eq}</h4>
                                ${categoriaEq ? `<span style="color:var(--text-muted); font-size:0.7rem; font-weight:700; margin-top:2px; text-transform:uppercase; letter-spacing:0.5px; text-align:left; display:block;">${categoriaEq}</span>` : ''}
                            </div>
                            <span style="background:rgba(16, 185, 129, 0.15); color:#10b981; padding:4px 10px; border-radius:6px; border:1px solid rgba(16, 185, 129, 0.3); font-weight:bold; font-size:0.75rem; white-space:nowrap; flex-shrink:0;">Llevan: ${ptsActuales} pts</span>
                        </div>
                        
                        ${miCajonHTML}

                    </div>`;
                });
                
                htmlTot += `<div id="msgPrediccionesTotales" class="alert-box mt-3" style="padding:10px;"></div>`;
                
                if (!isClosed) {
                    htmlTot += `<button type="button" id="btnSaveTotales" style="width:100%; padding: 14px; border-radius: 12px; font-weight: 900; border: none; background: var(--secondary-color); color: #000; cursor:pointer; font-size:1.1rem; transition: all 0.2s; margin-top:10px; margin-bottom:10px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);">💾 Guardar Predicciones</button>`;
                }

                document.getElementById('contenedorPrediccionesTotales').innerHTML = htmlTot;

                if (!isClosed) {
                    document.getElementById('btnSaveTotales').addEventListener('click', function(e) {
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
            }

            if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin();
            document.getElementById('loginSection').style.display = "none";
            document.getElementById('appSection').style.display = "block";
            
            iniciarRelojTotales();
        } else if (data.status === "ok") {
            console.log("Servidor despertado con éxito (Cold Start). Reintentando login automáticamente...");
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Conectando...';
            setTimeout(() => {
                btn.disabled = false;
                btn.click();
            }, 400);
            return;
        } else {
            // Si el servidor rechaza las credenciales, limpiar la sesión guardada
            const msgLower = (data.message || '').toLowerCase();
            const isCredsError = msgLower.includes('incorrect') || msgLower.includes('inválid') || msgLower.includes('no existe');
            if (isCredsError) {
                localStorage.removeItem('vcv_saved_session');
            }
            document.documentElement.classList.remove('vcv-auto-logging-in');
            msgBox.className = "alert-box alert-danger"; 
            msgBox.innerText = (data.message && data.message.includes('incorrect')) 
                ? "Tu sesión guardada ya no es válida o las credenciales cambiaron. Inicia sesión de nuevo." 
                : (data.message || "Error devuelto por el servidor."); 
            msgBox.style.display = "block";
            if (typeof updateProgressBar === 'function') updateProgressBar();
        }
    })
    .catch(err => { 
        document.documentElement.classList.remove('vcv-auto-logging-in');
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
        document.documentElement.classList.remove('vcv-auto-logging-in');
        sessionStorage.removeItem('vcv_just_logged_out');
        localStorage.removeItem('vcv_saved_session');
        return;
    }

    // Situación 2: Parámetro en la URL para forzar salida (?logout=1)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout')) {
        document.documentElement.classList.remove('vcv-auto-logging-in');
        localStorage.removeItem('vcv_saved_session');
        return;
    }

    try {
        const raw = localStorage.getItem('vcv_saved_session');
        if (!raw) {
            document.documentElement.classList.remove('vcv-auto-logging-in');
            return;
        }
        const ses = JSON.parse(raw);
        if (!ses || !ses.usuario || !ses.password) {
            document.documentElement.classList.remove('vcv-auto-logging-in');
            return;
        }

        // Situación 3: Caducidad por inactividad prolongada (ej. 30 días)
        const DIAS_LIMITE = 30;
        if (ses.ts && (Date.now() - ses.ts > DIAS_LIMITE * 24 * 60 * 60 * 1000)) {
            console.warn("Sesión caducada por superar el límite de 30 días.");
            document.documentElement.classList.remove('vcv-auto-logging-in');
            localStorage.removeItem('vcv_saved_session');
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

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Restaurando sesión...';

            window._esAutoLogin = true;
            setTimeout(() => {
                btn.disabled = false;
                btn.click();
            }, 120);
        }
    } catch(e) {
        if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin();
        console.error("Error al procesar auto-login:", e);
    }
};

// Ejecutar verificación en cuanto la página esté lista
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.verificarAutoLogin);
} else {
    window.verificarAutoLogin();
}

