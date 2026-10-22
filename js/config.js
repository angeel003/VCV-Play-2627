// ==================================================================
// CONFIGURACIÓN GLOBAL, ESTADO Y UTILIDADES
// ==================================================================



// POLYFILL PARA REINTENTOS AUTOMATICOS (Soluciona los errores 500 y timeouts del primer login)
var fetchSeguro = (url, options, retries = 1) => {
    const bustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    return fetch(bustUrl, options)
        .then(async res => {
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch(e) {
                data = { status: 'error', message: text || `HTTP ${res.status} ${res.statusText}` };
            }
            if (!res.ok && data && data.message) {
                // If it's a 4xx or 5xx with a JSON message, resolve it so caller can show d.message or handle it
                return { json: () => Promise.resolve(data), ok: res.ok, status: res.status };
            }
            return { json: () => Promise.resolve(data), ok: res.ok, status: res.status };
        })
        .catch(err => {
            if (retries > 0) return new Promise(r => setTimeout(r, 1000)).then(() => fetchSeguro(url, options, retries - 1));
            throw new Error(err && err.message ? err.message : "Tiempo de espera agotado al conectar con el servidor.");
        });
};


  // Comprobar si venimos de darle al botón Atrás para hacer la animación de la izquierda
  if (sessionStorage.getItem('vcv_slide_left') === 'true') {
      document.getElementById('loginSection').classList.add('slide-in-left');
      sessionStorage.removeItem('vcv_slide_left');
  }

// Nueva API ultrarrápida conectada a Cloudflare D1
// Si estamos en producción o en wrangler pages dev local con funciones, usa /api/vcv.
// Si estamos en un servidor local (VS Code Live Server, python http.server, etc.), apunta a la API remota de Cloudflare Pages para que todo funcione sin configurar nada más.
var isDev = window.location.pathname.includes('dev') || window.location.hostname.includes('dev');
var isLocalStaticServer = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '' && window.location.port !== '8788';
var scriptURL = (isLocalStaticServer)
    ? (isDev ? 'https://dev.vcv-play-2627.pages.dev/api/vcv' : 'https://vcv-play-2627.pages.dev/api/vcv')
    : ((window.location.hostname.includes('pages.dev') || window.location.hostname.includes('vcvplay.com') || window.location.port === '8788') ? '/api/vcv' : (isDev ? 'https://dev.vcv-play-2627.pages.dev/api/vcv' : 'https://vcv-play-2627.pages.dev/api/vcv'));
window.scriptURL = scriptURL;

// --- PERSISTENCIA LOCAL / CACHÉ DE HORA MVP ---
window.getLocalMvpPubMap = function() {
    try {
        const raw = localStorage.getItem('vcv_local_mvp_pub_map');
        return raw ? JSON.parse(raw) : {};
    } catch(e) { return {}; }
};
window.setLocalMvpPubTs = function(idPart, pubTs) {
    if (!idPart) return;
    try {
        const map = window.getLocalMvpPubMap();
        map[idPart] = pubTs;
        localStorage.setItem('vcv_local_mvp_pub_map', JSON.stringify(map));
    } catch(e) {}
};
window.aplicarHorasMvpLocales = function(data) {
    if (!data) return;
    const map = window.getLocalMvpPubMap();
    if (!map || Object.keys(map).length === 0) return;
    
    const applyToMatch = p => {
        if (!p || !p.id_partido) return;
        if (map[p.id_partido] && map[p.id_partido] > 0) {
            // Si la BD remota aún no tiene el valor nuevo o está desactualizado, aplicar la hora guardada
            p.mvp_publicacion_ts = map[p.id_partido];
            p.mvp_visible = true;
            p.visibilidad = 'MOSTRAR';
        }
    };
    if (Array.isArray(data.equipos)) data.equipos.forEach(applyToMatch);
    if (Array.isArray(data.todos_partidos)) data.todos_partidos.forEach(applyToMatch);
};

// Pre-calentar la API en segundo plano mientras el usuario escribe sus credenciales
try {
    fetch(scriptURL + (scriptURL.includes('?') ? '&' : '?') + 'ping=1', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping' }),
        mode: 'no-cors'
    }).catch(() => {});
} catch(e) {}

// --- PON AQUÍ TUS ENLACES DE GITHUB CUANDO LOS TENGAS ---
var URL_BADGE_GENERIC = "https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg"; 
// --------------------------------------------------------

var currentUser = ""; var currentPassword = ""; var equiposTotalesInfo = [];
var intervalCountdown = null;
var intervalTotalesCountdown = null;
var globalHistorialData = [];
var isSortDesc = true;
var currentJornadaGlobal = 0;


  var isGuestMode = false;



function formatFecha(ts) {
    if(!ts) return "";
    let d = new Date(ts);
    return d.toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
}

function sanitizeImgUrl(url) {
    if(!url) return "";
    url = url.trim();
    if(url.startsWith('https://imgur.com/') && !url.includes('/a/') && !url.includes('/gallery/')) {
        let id = url.split('imgur.com/')[1].split('?')[0];
        if(id && !id.includes('.')) {
            return `https://i.imgur.com/${id}.jpeg`;
        }
    }
    return url;
}


async function directDeleteAvatar() {
    if(!confirm("¿Estás seguro de que quieres borrar tu foto de perfil al instante?")) return;
    try {
        let res = await fetchSeguro(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'delete_avatar', usuario: currentUser, password: currentPassword }), 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        });
        let data = await res.json();
        if (data.status === 'success') {
            mostrarToast("Foto borrada.");
            if(document.getElementById('insAvatarUrl')) document.getElementById('insAvatarUrl').value = '';
            if(document.getElementById('avatarUploadStatus')) document.getElementById('avatarUploadStatus').textContent = 'Sin foto';
            if(document.getElementById('insAvatar')) {
                document.getElementById('insAvatar').checked = false;
                document.getElementById('insAvatarContainer').style.display = 'none';
            }
            cargarDatosAntiguos();
        } else {
            mostrarToast("Error al borrar: " + data.message);
        }
    } catch(e) {
        mostrarToast("Error de conexión");
    }
}

async function directDeleteCustomBadge() {
    if(!confirm("¿Estás seguro de que quieres borrar tu insignia personalizada al instante?")) return;
    try {
        let res = await fetchSeguro(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'delete_custom_badge', usuario: currentUser, password: currentPassword }), 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        });
        let data = await res.json();
        if (data.status === 'success') {
            mostrarToast("Insignia borrada.");
            document.getElementById('insCustomEmoji').value = '';
            document.getElementById('insCustomDesc').value = '';
            document.getElementById('customUploadStatus').textContent = 'Sin foto';
            document.getElementById('insCustom').checked = false;
            document.getElementById('insCustomContainer').style.display = 'none';
            cargarDatosAntiguos();
        } else {
            mostrarToast("Error al borrar: " + data.message);
        }
    } catch(e) {
        mostrarToast("Error de conexión");
    }
}

async function uploadToImgBB(input, targetUrlId, targetStatusId) {
    const file = input.files[0];
    if (!file) return;

    const statusSpan = document.getElementById(targetStatusId);
    statusSpan.textContent = "Subiendo...";
    statusSpan.style.color = "#3498db";

    const formData = new FormData();
    formData.append('image', file);

    const API_KEY = 'e972b481c99f7bf7a305bebab9e14a04'; // Reemplazar con API Key

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            document.getElementById(targetUrlId).value = data.data.url;
            statusSpan.textContent = "¡Subida con éxito!";
            statusSpan.style.color = "#2ecc71";
        } else {
            statusSpan.textContent = "Error al subir";
            statusSpan.style.color = "#e74c3c";
            console.error(data);
        }
    } catch (err) {
        statusSpan.textContent = "Error de red";
        statusSpan.style.color = "#e74c3c";
        console.error(err);
    }
}


function renderBadgeIcon(b, sizeClasses, extraStyles) {
    if (!b || b.type === 'permiso_mvp' || b.type === 'permiso_resultados') {
        return '';
    }
    if (b.type === 'lesionado') {
        return `<span style="font-size:${extraStyles.includes('12px') ? '11px' : '20px'}; margin-right:4px; color: #ff3b30; font-weight: 900; line-height: 1;">✚</span>`;
    }
    if (b.type === 'mvp') {
        let isSmall = extraStyles.includes('12px') || extraStyles.includes('14px') || extraStyles.includes('16px');
        let sz = isSmall ? '12px' : '16px';
        return `<span style="font-size:${sz}; margin-right:3px; color: #f1c40f; line-height: 1; display:inline-flex; align-items:center; justify-content:center; vertical-align:middle;">⭐</span>`;
    }
    if (b.type === 'custom') {
        let icon = sanitizeImgUrl(b.emoji || '✨');
        if (icon.toLowerCase().endsWith('.png') || icon.toLowerCase().endsWith('.jpg') || icon.toLowerCase().endsWith('.svg') || icon.toLowerCase().endsWith('.gif')) {
            let src = icon.includes('/') ? icon : 'files/images/' + icon;
            return `<img loading="lazy" src="${src}" class="${sizeClasses}" style="${extraStyles}">`;
        } else if (icon.startsWith('http')) {
            return `<img loading="lazy" src="${icon}" class="${sizeClasses}" style="${extraStyles}">`;
        } else {
            return `<span style="font-size:${extraStyles.includes('12px') ? '10px' : '18px'}; margin-right:4px;">${icon}</span>`;
        }
    }
    let cssColorClass = window.getBadgeCSS ? window.getBadgeCSS(b.type) : '';
    return `<img loading="lazy" src="${URL_BADGE_GENERIC}" class="${sizeClasses} ${cssColorClass}" style="${extraStyles}">`;
}

function getBadgeCSS(type) {
    if(type === 'admin') return 'badge-admin';
    if(type === 'staff') return 'badge-staff';
    if(type === 'entrenador') return 'badge-entrenador';
    if(type === 'jugador') return 'badge-jugador';
    if(type === 'exjugador') return 'badge-exjugador';
    return '';
}

function renderBadgeItemHtml(b, iconSize = "24px") {
    if (!b || b.type === 'permiso_mvp' || b.type === 'permiso_resultados') {
        return '';
    }
    // Si la insignia contiene una lista estructurada de varios partidos o equipos
    if (b.items && Array.isArray(b.items) && b.items.length > 0) {
        let title = b.roleTitle || b.text || ((b.type === 'entrenador') ? 'Entrenador de:' : (b.type === 'mvp' ? 'MVP de:' : 'Jugador de:'));
        let itemsHtml = b.items.map(it => `
            <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:var(--text-muted); margin-top:3px; padding-left:2px;">
                <span style="color:var(--secondary-color); font-size:0.7rem; line-height:1;">•</span>
                <span style="color:var(--text-main); font-weight:500;">${it}</span>
            </div>
        `).join('');

        return `
            <div style="display:flex; align-items:flex-start; gap: 12px; margin-bottom: 2px;">
                <div style="margin-top:2px; flex-shrink:0;">
                    ${renderBadgeIcon(b, "badge-icon", `width:${iconSize}; height:${iconSize};`)}
                </div>
                <div style="flex:1; text-align:left;">
                    <div style="font-size: 0.86rem; color: var(--text-main); font-weight: 700;">${title}</div>
                    <div style="margin-top:2px;">
                        ${itemsHtml}
                    </div>
                </div>
            </div>
        `;
    }

    // Formato estándar para una sola insignia o un solo equipo
    let text = (b.text || '').replace(/, /g, " - ");
    return `
        <div style="display:flex; align-items:center; gap: 12px;">
            <div style="flex-shrink:0;">
                ${renderBadgeIcon(b, "badge-icon", `width:${iconSize}; height:${iconSize};`)}
            </div>
            <span style="font-size: 0.85rem; color: var(--text-main); font-weight: 500; text-align:left;">${text}</span>
        </div>
    `;
}

// ------------------------------------------------------------------
// LÓGICA DEL TOOLTIP FLOTANTE PARA MÓVILES
// ------------------------------------------------------------------
function showMobileTooltip(e, text) {
    e.stopPropagation(); 
    const tooltip = document.getElementById('mobileTooltip');
    if (!tooltip) return;
    tooltip.innerText = text;
    
    const target = e.currentTarget || e.target;
    const rect = target.getBoundingClientRect();
    
    // Posicionar inicialmente para medir dimensiones reales
    tooltip.classList.add('show');
    const tipRect = tooltip.getBoundingClientRect();
    
    // Centrado horizontal con margen para que no se salga de la pantalla
    let left = rect.left + (rect.width / 2);
    const halfWidth = tipRect.width / 2;
    if (left - halfWidth < 12) {
        left = 12 + halfWidth;
    } else if (left + halfWidth > window.innerWidth - 12) {
        left = window.innerWidth - 12 - halfWidth;
    }
    
    // Posición vertical: si no cabe arriba o choca con la barra/notch, ponerlo debajo
    let top = rect.top;
    if (rect.top - tipRect.height - 12 < 70) {
        // Mostrar debajo del elemento si arriba choca con la cabecera/notch
        top = rect.bottom + 12;
        tooltip.style.transform = 'translate(-50%, 0)';
    } else {
        top = rect.top - 10;
        tooltip.style.transform = 'translate(-50%, -100%)';
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    
    clearTimeout(tooltip.timeoutId);
    tooltip.timeoutId = setTimeout(() => {
        tooltip.classList.remove('show');
    }, 3500); 
}

function hideMobileTooltip() {
    const tooltip = document.getElementById('mobileTooltip');
    if (tooltip && tooltip.classList.contains('show')) {
        clearTimeout(tooltip.timeoutId);
        tooltip.classList.remove('show');
    }
}

document.addEventListener('click', function(e) {
    hideMobileTooltip();
});

let _toastTimer = null;
function mostrarToast(mensaje, duracion = 2500) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.innerHTML = mensaje;
    toast.classList.add('show-toast');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
        toast.classList.remove('show-toast');
    }, duracion);
}

// ------------------------------------------------------------------
// BOTÓN DE RECARGAR
// ------------------------------------------------------------------


// ------------------------------------------------------------------
window.mostrarToast = mostrarToast;
window.showMobileTooltip = showMobileTooltip;
window.hideMobileTooltip = hideMobileTooltip;
window.renderBadgeIcon = renderBadgeIcon;
window.getBadgeCSS = getBadgeCSS;
