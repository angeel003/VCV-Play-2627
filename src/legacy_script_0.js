

// POLYFILL PARA REINTENTOS AUTOMATICOS (Soluciona los errores 500 y timeouts del primer login)
const fetchSeguro = (url, options, retries = 1) => {
    const bustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime(); return fetch(bustUrl, options)
        .then(res => res.json().then(data => ({ json: () => Promise.resolve(data) })))
        .catch(err => {
            if (retries > 0) return new Promise(r => setTimeout(r, 1000)).then(() => fetchSeguro(url, options, retries - 1));
            throw new Error("El servidor de Google está saturado (Timeout). Vuelve a pulsar el botón.");
        });
};


  // Comprobar si venimos de darle al botón Atrás para hacer la animación de la izquierda
  if (sessionStorage.getItem('vcv_slide_left') === 'true') {
      document.getElementById('loginSection').classList.add('slide-in-left');
      sessionStorage.removeItem('vcv_slide_left');
  }

// Nueva API ultrarrápida conectada a Cloudflare D1
const scriptURL = (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('vcvplay.com')) ? '/api/vcv' : 'https://vcv-play-2627.pages.dev/api/vcv';

// Pre-calentar el servidor de Google en segundo plano mientras el usuario escribe sus credenciales
try {
    fetch(scriptURL + (scriptURL.includes('?') ? '&' : '?') + 'ping=1', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping' }),
        mode: 'no-cors'
    }).catch(() => {});
} catch(e) {}

// --- PON AQUÍ TUS ENLACES DE GITHUB CUANDO LOS TENGAS ---
const URL_BADGE_GENERIC = "https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg"; 
// --------------------------------------------------------

let currentUser = ""; let currentPassword = ""; let equiposTotalesInfo = [];
let intervalCountdown = null;
let intervalTotalesCountdown = null;
let globalHistorialData = [];
let isSortDesc = true;
let currentJornadaGlobal = 0;


  let isGuestMode = false;



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
    if (b.type === 'lesionado') {
        return `<span style="font-size:${extraStyles.includes('12px') ? '11px' : '20px'}; margin-right:4px; color: #ff3b30; font-weight: 900; line-height: 1;">✚</span>`;
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
    // Si la insignia contiene una lista estructurada de varios equipos
    if (b.items && Array.isArray(b.items) && b.items.length > 1) {
        let title = b.roleTitle || ((b.type === 'entrenador') ? 'Entrenador de:' : 'Jugador de:');
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

function mostrarToast(mensaje) {
    const toast = document.getElementById('toastNotification');
    toast.innerText = mensaje;
    toast.style.opacity = "1";
    setTimeout(() => { toast.style.opacity = "0"; }, 2500);
}

// ------------------------------------------------------------------
// BOTÓN DE RECARGAR
// ------------------------------------------------------------------


// ------------------------------------------------------------------
// FUNCIONES INTRANET ADMINISTRADOR
// ------------------------------------------------------------------
function renderAdminPanel(equipos) {
    let html = "";
    let now = new Date().getTime();
    equipos.forEach(eq => {
        let ts = eq.timestamp || Infinity;
        let isAvailable = eq.estado === "ABIERTO" && eq.visibilidad === "MOSTRAR";
        let endedRecently = (eq.estado === "FINALIZADO" || eq.estado === "BLOQUEADO") && (now - (eq.timestamp_bloqueo || ts)) < 48 * 60 * 60 * 1000;
        if (isAvailable || endedRecently) {
            let adminLocal = (eq.ubicacion === 'LOCAL') ? eq.equipo_local : eq.rival;
            let adminVisit = (eq.ubicacion === 'LOCAL') ? eq.rival : eq.equipo_local;
            
            html += `
            <div class="admin-match-box" style="background: var(--bg-general); border: 1px solid rgba(230,126,34,0.3); border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="font-weight:bold; margin-bottom:8px; color: var(--text-main); font-size: 0.9rem;">
                    ${adminLocal} <span style="color:var(--text-muted);">vs</span> ${adminVisit}
                </div>
                
                <!-- SECCIÓN RESULTADOS -->
                <div style="margin-bottom: 8px; border-left: 2px solid var(--vcv-morado); padding-left: 8px;">
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Resultado Final</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="number" id="adm_sets_loc_${eq.id_partido}" class="form-control" placeholder="Sets Local" value="${eq.oficial_sets ? eq.oficial_sets.split('-')[0] : ''}" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); text-align:center;" ${now >= ts ? '' : 'disabled'}>
                        <span style="color: var(--text-muted);">-</span>
                        <input type="number" id="adm_sets_vis_${eq.id_partido}" class="form-control" placeholder="Sets Visitante" value="${eq.oficial_sets ? (eq.oficial_sets.split('-')[1] || '') : ''}" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); text-align:center;" ${now >= ts ? '' : 'disabled'}>
                    </div>
                    <input type="text" id="adm_parc_${eq.id_partido}" class="form-control" placeholder="${now >= ts ? 'Parciales (ej: 25-20, 25-22...)' : 'Bloqueado (No ha empezado)'}" value="${eq.oficial_parciales || ''}" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); margin-top: 6px;" ${now >= ts ? '' : 'disabled'}>
                </div>

                <!-- SECCIÓN STREAMING -->
                <div style="margin-bottom: 8px; border-left: 2px solid #e67e22; padding-left: 8px;">
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Link Streaming Oficial</label>
                    <input type="text" id="adm_stream_${eq.id_partido}" class="form-control" placeholder="URL de YouTube/Twitch/etc." value="${eq.streaming || ''}" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main);">
                </div>

                <button class="btn" style="width: 100%; padding: 8px; font-size: 0.8rem; background: #e67e22; color: #fff; border: none; border-radius: 6px; font-weight: bold; margin-top: 4px; box-shadow: 0 4px 6px rgba(230,126,34,0.2);" onclick="guardarResultadoAdmin(event, '${eq.id_partido}')">
                    Guardar Cambios
                </button>
            </div>`;
        }
    });
    if (html === "") html = "<div style='color:var(--text-muted); font-size:0.8rem; text-align:center; padding:10px;'>No hay partidos disponibles o han pasado más de 48h.</div>";
    document.getElementById('adminListaPartidos').innerHTML = html;
}

const btnAdminSyncEl = document.getElementById('btnAdminSync');
if(btnAdminSyncEl) btnAdminSyncEl.addEventListener('click', function(e) {
    e.preventDefault();
    const btn = this;
    btn.disabled = true; btn.innerText = "⏳ Sincronizando...";
    
    fetchSeguro(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'sync_permisos', usuario: currentUser, password: currentPassword }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    })
    .then(res => res.json())
    .then(d => {
        if(d.status === "success") { mostrarToast(d.message); } 
        else { alert("Error al guardar: " + (d.message || JSON.stringify(d))); }
    })
    .finally(() => { btn.disabled = false; btn.innerText = "🔄 Auto-Permisos"; });
});


    let btnLoadNameRequests = document.getElementById('btnLoadNameRequests');
    if (btnLoadNameRequests) {
        btnLoadNameRequests.addEventListener('click', async function(e) {
            let box = document.getElementById('adminNameRequestsBox');
            btnLoadNameRequests.disabled = true;
            btnLoadNameRequests.innerText = "Cargando...";
            
            try {
                let res = await fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify({action: 'get_name_change_requests', usuario: currentUser, password: currentPassword})});
                let d = await res.json();
                
                if (d.status === 'success') {
                    if (d.requests.length === 0) {
                        box.innerHTML = '<span style="color:var(--text-muted);">No hay peticiones pendientes.</span>';
                    } else {
                        let h = '';
                        d.requests.forEach(r => {
                            h += `<div style="background:var(--bg-lighter); padding:10px; border-radius:6px; border:1px solid #333;">
                                <div><b>Actual:</b> ${r.Usuario} ➡️ <b>Nuevo:</b> ${r.Nuevo_Usuario}</div>
                                ${r.Nuevo_Nombre ? `<div><b>Nombre Real:</b> ${r.Nuevo_Nombre}</div>` : ''}
                                <div style="font-size:0.7rem; color:#888;">Fecha: ${new Date(r.Fecha).toLocaleString()}</div>
                                <div style="margin-top:8px; display:flex; gap:8px;">
                                    <button class="btn btn-primary" onclick="resolveNameChange('${r.Usuario}', 'approve')" style="flex:1; padding:5px; font-size:0.8rem; background:green; border:none; cursor:pointer;">Aprobar</button>
                                    <button class="btn btn-primary" onclick="resolveNameChange('${r.Usuario}', 'reject')" style="flex:1; padding:5px; font-size:0.8rem; background:red; border:none; cursor:pointer;">Rechazar</button>
                                </div>
                            </div>`;
                        });
                        box.innerHTML = h;
                    }
                } else {
                    box.innerText = "❌ Error: " + d.message;
                }
            } catch(err) {
                box.innerText = "❌ Error de conexión al servidor";
            }
            btnLoadNameRequests.disabled = false;
            btnLoadNameRequests.innerHTML = `<i data-lucide="refresh-cw" style="width:16px; height:16px; margin-right:5px; vertical-align:middle;"></i> Cargar Peticiones Pendientes`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }

    window.resolveNameChange = async function(targetUser, resolution) {
        if(!confirm(`¿Estás seguro de que quieres ${resolution === 'approve' ? 'APROBAR' : 'RECHAZAR'} el cambio para ${targetUser}?`)) return;
        
        let payload = { action: 'resolve_name_change', usuario: currentUser, password: currentPassword, target_user: targetUser, resolution: resolution };
        try {
            let res = await fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify(payload) });
            let d = await res.json();
            if (d.status === 'success') {
                alert(d.message);
                document.getElementById('btnLoadNameRequests').click(); // recargar
            } else {
                alert("Error: " + d.message);
            }
        } catch(err) {
            alert("Error de conexión");
        }
    };


    let btnLoadBadgeRequests = document.getElementById('btnLoadBadgeRequests');
    if (btnLoadBadgeRequests) {
        btnLoadBadgeRequests.addEventListener('click', async function(e) {
            e.preventDefault();
            btnLoadBadgeRequests.disabled = true;
            btnLoadBadgeRequests.innerText = "Cargando...";
            let box = document.getElementById('adminBadgeRequestsBox');
            if(box) box.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem;">Cargando...</div>';

            try {
                let res = await fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify({action: 'get_peticiones_insignias', usuario: currentUser, password: currentPassword})});
                let data = await res.json();
                
                if (data.status === "success") {
                    if (data.data.length === 0) {
                        if(box) box.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem;">No hay peticiones de insignias pendientes.</div>';
                    } else {
                        let html = '';
                        data.data.forEach(req => {
                            let dateStr = new Date(req.Fecha).toLocaleString('es-ES');
                            
                            let details = '';
                            if (req.Tipo === 'PERFIL') {
                                let payloadObj = {};
                                try { payloadObj = JSON.parse(req.Equipo_Externo || '{}'); } catch(e){}
                                details = `<b>Género:</b> ${payloadObj.genero || '-'}<br>`;
                                details += `<b>Jugador/a de:</b> ${payloadObj.jugador_de || '-'}<br>`;
                                details += `<b>Entrenador/a de:</b> ${payloadObj.entrenador_de || '-'}<br>`;
                                details += `<b>Exjugador/a:</b> ${payloadObj.exjugador === 'X' ? 'Sí' : 'No'}<br>`;
                                details += `<b>Staff:</b> ${payloadObj.staff || '-'}`;
                                
                                if (payloadObj.lesionado === 'X') {
                                    details += `<br><b style="color:#ff3b30;">Lesionado:</b> Sí (${payloadObj.lesionado_desc || 'Sin detalles'})`;
                                }
                                if (payloadObj.custom === 'X') {
                                    details += `<br><br><b>Insignia Personalizada:</b> Sí<br>`;
                                    details += `<i>Título:</i> ${payloadObj.custom_desc || '-'}<br>`;
                                    
                                    let rawIcon = (payloadObj.custom_emoji || '').trim();
                                    let icon = sanitizeImgUrl(rawIcon);
                                    let preview = '';
                                    if (icon) {
                                        if (icon.toLowerCase().endsWith('.png') || icon.toLowerCase().endsWith('.jpg') || icon.toLowerCase().endsWith('.svg') || icon.toLowerCase().endsWith('.gif') || icon.startsWith('http')) {
                                            let src = icon.includes('/') || icon.startsWith('http') ? icon : 'files/images/' + icon;
                                            preview = `<img loading="lazy" src="${src}" style="max-width:24px; max-height:24px; vertical-align:middle; border-radius:4px;">`;
                                        } else {
                                            preview = `<span style="font-size:1.5rem; vertical-align:middle;">${icon}</span>`;
                                        }
                                        details += `<i>Solicita:</i> ${rawIcon} ${preview}`;
                                    }
                                }
                                if (payloadObj.avatar === 'X') {
                                    details += `<br><br><b>Foto de Perfil:</b> Sí<br>`;
                                    let rawUrl = (payloadObj.avatar_url || '').trim();
                                    let url = sanitizeImgUrl(rawUrl);
                                    if (url.startsWith('http')) {
                                        details += `<a href="${url}" target="_blank">${rawUrl}</a><br><img loading="lazy" src="${url}" style="max-width:60px; max-height:60px; border-radius:8px; margin-top:4px;">`;
                                    } else {
                                        details += `<i>Link inválido o no proporcionado:</i> ${rawUrl}`;
                                    }
                                }
                            } else {
                                details = `<b>Añadir a ${req.Tipo}:</b> ${req.Equipo_Externo}`;
                            }

                            html += `
                            <div style="background:var(--bg-general); border:1px solid var(--border-color); border-radius:8px; padding:10px; margin-bottom:8px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <strong style="color:var(--vcv-morado);">${req.Usuario}</strong>
                                        <div style="font-size:0.7rem; color:var(--text-muted);">${dateStr}</div>
                                    </div>
                                </div>
                                <div style="margin-top:8px; font-size:0.8rem; background:rgba(0,0,0,0.05); padding:8px; border-radius:4px;">
                                    ${details}
                                </div>
                                <div style="display:flex; gap:8px; margin-top:10px;">
                                    <button onclick="resolveBadgeRequest(${req.id_peticion}, 'approve')" class="btn" style="flex:1; background:#27ae60; color:white; border:none; padding:6px; border-radius:4px; font-size:0.8rem; font-weight:bold;">Aprobar</button>
                                    <button onclick="resolveBadgeRequest(${req.id_peticion}, 'reject')" class="btn" style="flex:1; background:#c0392b; color:white; border:none; padding:6px; border-radius:4px; font-size:0.8rem; font-weight:bold;">Rechazar</button>
                                </div>
                            </div>`;
                        });
                        if(box) box.innerHTML = html;
                    }
                } else {
                    if(box) box.innerHTML = `<div style="color:#e74c3c; font-size:0.8rem;">Error: ${data.message}</div>`;
                }
            } catch (err) {
                if(box) box.innerHTML = `<div style="color:#e74c3c; font-size:0.8rem;">Error de conexión.</div>`;
            }

            btnLoadBadgeRequests.disabled = false;
            btnLoadBadgeRequests.innerHTML = `<i data-lucide="refresh-cw" style="width:16px; height:16px; margin-right:5px; vertical-align:middle;"></i> Cargar Peticiones de Insignias`;
            if(window.lucide) window.lucide.createIcons();
        });
    }

    window.resolveBadgeRequest = async function(id, accion) {
        if(!confirm(`¿Estás seguro de que quieres ${accion === 'approve' ? 'aprobar' : 'rechazar'} esta petición?`)) return;
        
        try {
            let res = await fetchSeguro(scriptURL, { 
                method: 'POST', 
                body: JSON.stringify({ action: 'resolve_peticion_insignia', usuario: currentUser, password: currentPassword, id_peticion: id, resolution: accion }), 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
            });
            let data = await res.json();
            
            if(data.status === "success") {
                alert(data.message);
                let btn = document.getElementById('btnLoadBadgeRequests');
                if(btn) btn.click();
            } else {
                alert("Error: " + data.message);
            }
        } catch (err) {
            alert("Error de conexión al resolver petición.");
        }
    }


    window.guardarResultadoAdmin = function(e, idPart) {
    e.preventDefault();
    const btn = e.currentTarget || e.target;
    
    // Leer valores, protegiendo si no existen los nuevos inputs
    const elSetsLoc = document.getElementById(`adm_sets_loc_${idPart}`);
    const elSetsVis = document.getElementById(`adm_sets_vis_${idPart}`);
    const elParc = document.getElementById(`adm_parc_${idPart}`);
    const elStream = document.getElementById(`adm_stream_${idPart}`);
    
    let sets = "";
    if (elSetsLoc && elSetsVis && elSetsLoc.value.trim() !== "" && elSetsVis.value.trim() !== "") {
        sets = `${elSetsLoc.value.trim()}-${elSetsVis.value.trim()}`;
    }
    const parc = elParc ? elParc.value.trim() : "";
    const stream = elStream ? elStream.value.trim() : "";
    
    btn.disabled = true; btn.innerText = "Subiendo...";
    
    fetchSeguro(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'save_resultado_admin', usuario: currentUser, password: currentPassword, id_partido: idPart, sets: sets, parciales: parc, streaming: stream }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    })
    .then(res => res.json())
    .then(d => {
        btn.disabled = false; btn.innerText = "Guardar Cambios";
        if(d.status === "success") { 
            mostrarToast("Guardado correctamente"); 
            cargarPartidos(); 
        } else { 
            mostrarToast(d.message || "Error al guardar"); 
        }
    })
    .catch(err => {
        btn.disabled = false; btn.innerText = "Guardar Cambios";
        mostrarToast("Error de conexión");
    });
}
window.crearUsuarioAdmin = function(e) {
    e.preventDefault();
    const btn = e.target;
    const nu = document.getElementById('addUsrName').value.trim();
    const nr = document.getElementById('addUsrRealName') ? document.getElementById('addUsrRealName').value.trim() : "";
    const np = document.getElementById('addUsrPwd').value.trim();
    
    
    if(!nu || !np) { alert("Usuario y Contraseña son obligatorios"); return; }
    
    
    const checkboxes = document.querySelectorAll('#adminLigasCheckboxes input[type="checkbox"]');
    const selectedLigas = [];
    checkboxes.forEach(cb => {
        if (cb.checked) selectedLigas.push(cb.value);
    });
    
    btn.disabled = true; btn.innerText = "Creando...";
    
    fetchSeguro(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'add_user', usuario: currentUser, password: currentPassword, new_u: nu, new_p: np, new_n: nr , ligas_seleccionadas: selectedLigas }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    })
    .then(res => res.json())
    .then(d => {
        if(d.status === "success") { 
            mostrarToast(d.message); 
            document.getElementById('addUsrName').value = "";
            if (document.getElementById('addUsrRealName')) document.getElementById('addUsrRealName').value = "";
            document.getElementById('addUsrPwd').value = "";
            
        } 
        else { alert("Error al guardar: " + (d.message || JSON.stringify(d))); }
    })
    .finally(() => { btn.disabled = false; btn.innerText = "➕ Crear Usuario"; });
}
// ------------------------------------------------------------------

function getCategoryHTML(catName) {
    if (!catName) return "";
    let safeName = catName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    let baseUrl = "files/categories/"; 
    let imgUrl = baseUrl + safeName + ".png";
    return `<img loading="lazy" src="${imgUrl}" class="cat-badge-img" alt="${catName}" title="${catName}" onerror="this.onerror=null; this.outerHTML='<div class=\\'cat-badge-text\\' title=\\'${catName}\\'>${catName}</div>';">`;
}

// LÓGICA DE CAMBIO DE CONTRASEÑA

const formSaveEmailEl = document.getElementById('formSaveEmail');
if(formSaveEmailEl) {
    formSaveEmailEl.addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = this.querySelector('button');
        const email = document.getElementById('txtEmail').value.trim();
        if(!email) return;
        
        btn.disabled = true; btn.innerText = "Guardando...";
        
        fetchSeguro(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'save_email', usuario: currentUser, password: currentPassword, email: email }), 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        })
        .then(res => res.json())
        .then(d => {
            if(d.status === "success") { 
                mostrarToast(d.message); 
                document.getElementById('currentEmailDisplay').style.display = 'block';
                document.getElementById('currentEmailText').innerText = email;
                document.getElementById('txtEmail').value = "";
            } else { 
                alert("Error: " + (d.message || JSON.stringify(d))); 
            }
        })
        .catch(err => alert("Error de conexión: " + err))
        .finally(() => { btn.disabled = false; btn.innerText = "Guardar Correo"; });
    });
}


document.getElementById('btnChangePwd').addEventListener('click', function(e) {
    e.preventDefault();
    const usr = document.getElementById('cpUsuario').value.trim();
    const oldP = document.getElementById('cpOldPwd').value.trim();
    const newP1 = document.getElementById('cpNewPwd').value.trim();
    const newP2 = document.getElementById('cpNewPwd2').value.trim();
    const msgBox = document.getElementById('msgChangePwd');
    const btn = this;

    if(!usr || !oldP || !newP1 || !newP2) {
        msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Por favor, rellena todos los campos."; msgBox.style.display = "block";
          updateProgressBar(); return;
    }
    if(newP1 !== newP2) {
        msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Las contraseñas nuevas no coinciden."; msgBox.style.display = "block";
          updateProgressBar(); return;
    }

    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Actualizando...'; 
    msgBox.style.display = "none";

    fetchSeguro(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'change_password', usuario: usr, old_password: oldP, new_password: newP1 }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    })
    .then(res => res.json())
    .then(data => {
        msgBox.style.display = "block";
          updateProgressBar();
        if(data.status === "success") {
            msgBox.className = "alert-box alert-success"; msgBox.innerText = data.message;
            document.getElementById('cpOldPwd').value = ""; document.getElementById('cpNewPwd').value = ""; document.getElementById('cpNewPwd2').value = "";
        } else {
            msgBox.className = "alert-box alert-danger"; msgBox.innerText = data.message;
        }
    })
    .catch(err => { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Error: " + err.message + " | " + (err.stack || ""); msgBox.style.display = "block";
          updateProgressBar(); })
    .finally(() => { btn.innerText = "Actualizar Contraseña"; btn.disabled = false; });
});

// LÓGICA DE PETICIÓN DE CAMBIO DE NOMBRE
document.getElementById('btnReqName').addEventListener('click', function(e) {
    e.preventDefault();
    const usr = document.getElementById('rnUsuario').value.trim();
    const pwd = document.getElementById('rnPwd').value.trim();
    const newU = document.getElementById('rnNewUser').value.trim();
    const newN = document.getElementById('rnNewName').value.trim();
    const msgBox = document.getElementById('msgReqName');
    const btn = this;

    if(!usr || !pwd) {
        msgBox.className = "alert-box alert-danger"; msgBox.innerText = "El usuario y contraseña actuales son obligatorios."; msgBox.style.display = "block";
          updateProgressBar(); return;
    }
    if(!newU && !newN) {
        msgBox.className = "alert-box alert-warning"; msgBox.innerText = "Debes rellenar al menos un dato nuevo para solicitar el cambio."; msgBox.style.display = "block";
          updateProgressBar(); return;
    }

    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...'; 
    msgBox.style.display = "none";

    fetchSeguro(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'request_name_change', usuario: usr, password: pwd, new_usuario: newU, new_nombre: newN }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    })
    .then(res => res.json())
    .then(data => {
        msgBox.style.display = "block";
          updateProgressBar();
        if(data.status === "success") {
            msgBox.className = "alert-box alert-success"; msgBox.innerText = data.message;
            document.getElementById('rnNewUser').value = ""; document.getElementById('rnNewName').value = "";
        } else {
            msgBox.className = "alert-box alert-danger"; msgBox.innerText = data.message;
        }
    })
    .catch(err => { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Error: " + err.message + " | " + (err.stack || ""); msgBox.style.display = "block";
          updateProgressBar(); })
    .finally(() => { btn.innerText = "Enviar Solicitud"; btn.disabled = false; });
});


// ------------------------------------------------------------------
// LOGICA DE BOTON VOLVER ATRAS / SALIR
// ------------------------------------------------------------------
document.getElementById('btnLogout').addEventListener('click', function() {
    localStorage.removeItem('vcv_cache_data');
    localStorage.removeItem('vcv_cache_type');
    localStorage.removeItem('vcv_cache_creds');
    sessionStorage.setItem('vcv_slide_left', 'true');
    
    document.getElementById('appSection').classList.add('slide-out-right');
    this.style.transform = 'translateY(-50%) translateX(-100%)';
    
    setTimeout(() => {
        window.location.href = window.location.pathname + '?v=' + new Date().getTime();
    }, 280);
});

// LOGICA MODO INVITADO
document.getElementById('btnGuest').addEventListener('click', function(e) {
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
            
            isGuestMode = true;
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
            window.appData = data;
            if(window.initCalendar) window.initCalendar();
            if(window.loadInsigniasUI) window.loadInsigniasUI();
            if(window.renderHistorialV2) window.renderHistorialV2(data);
            let nameEl = document.getElementById('h2-user-name'); if(nameEl) nameEl.innerText = "Modo Invitado";
            let handleEl = document.getElementById('h2-user-handle'); if(handleEl) handleEl.innerText = "@lectura";
            let badgesEl = document.getElementById('h2-user-badges'); if(badgesEl) badgesEl.innerHTML = "";
            document.getElementById('tituloPrincipalSeccion').style.display = 'none';
            
            document.getElementById('appSection').style.display = "block";
            
            document.getElementById('btnLogout').style.display = "block";
            document.querySelector('#prediccionForm > div').style.display = "none"; 
            document.getElementById('adminPanelWrapper').style.display = "none";
            
            document.getElementById('btnSubmit').style.display = "none";
            document.getElementById('warningPredicciones').style.display = "none";
            
            
            
            
            
            // Mostrar banner promo de invitados
            let promoDiv = document.getElementById('guestPromoBanner');
            if (!promoDiv) {
                promoDiv = document.createElement('div');
                promoDiv.id = 'guestPromoBanner';
                promoDiv.style = "background: linear-gradient(135deg, var(--vcv-morado), #1565c0); color: white; padding: 25px 20px; border-radius: 12px; margin-top: 30px; text-align: left; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: 2px solid var(--vcv-dorado);";
                promoDiv.innerHTML = `
                    <h3 style="color: var(--vcv-dorado); font-weight: bold; margin-bottom: 15px;">¿Quieres ver más? 🏐</h3>
                    <p style="font-size: 1.05rem; margin-bottom: 15px;">Si quieres acceder a toda la información detallada, <b>resultados pasados</b>, <b>calendario completo de próximos partidos</b> de tus equipos favoritos y <b>jugar en la liga de pronósticos</b>, ¡tienes que registrarte!</p>
                    <p style="font-size: 1rem; margin-bottom: 5px;">Envíanos un correo a <a href="mailto:adminfantasyvcv@gmail.com" style="color: var(--vcv-dorado); font-weight: bold; text-decoration: underline;">adminfantasyvcv@gmail.com</a> con:</p>
                    <ul style="padding-left: 25px; margin-bottom: 15px; font-weight: bold; font-size: 0.95rem;">
                        <li>Nombre de usuario (ej: juan_vcv)</li>
                        <li>Contraseña deseada</li>
                        <li>Tu relación con el club (ej: jugador/entrenador, indicando de qué equipo y categoría) para añadir insignias a tu perfil.</li>
                        <li>Qué equipos te gustaría seguir.</li>
                        <li style="margin-top:8px; font-weight:normal;"><i>(Opcional)</i> <b>Liga Privada:</b> Puedes tener una clasificación privada con tus amigos. Escribe en el correo los nombres de usuario de todos los que os queráis unir y qué equipos puntuarán en vuestra clasificación.</li>
                    </ul>
                    <p style="font-size: 0.95rem; opacity: 0.9;"><i>Te crearemos la cuenta y te avisaremos enseguida para que puedas acceder al VCV Play.</i></p>
                `;
                document.getElementById('prediccionForm').parentNode.appendChild(promoDiv);
            }
            promoDiv.style.display = "block";


            
            // FILTRO MODO INVITADO
            let nowTime = new Date().getTime();
            let limitTime = nowTime + (10 * 24 * 60 * 60 * 1000); // 10 days
            
            // Agrupar pasados por equipo para coger solo el más reciente
            let pasadosPorEquipo = {};
            let proximosFiltrados = [];
            
            data.equipos.forEach(eq => {
                let esPasado = eq.oficial_sets && eq.oficial_sets.includes("-");
                
                if (esPasado) {
                    if (!pasadosPorEquipo[eq.equipo_local]) {
                        pasadosPorEquipo[eq.equipo_local] = eq;
                    } else {
                        // Keep the most recent (highest timestamp that is past, or just highest timestamp if multiple)
                        let currentTs = pasadosPorEquipo[eq.equipo_local].timestamp || 0;
                        let newTs = eq.timestamp || 0;
                        if (newTs > currentTs) {
                            pasadosPorEquipo[eq.equipo_local] = eq;
                        }
                    }
                } else {
                    // Es Próximo. Solo incluir si es en los próximos 10 días
                    if (eq.timestamp && eq.timestamp <= limitTime) {
                        proximosFiltrados.push(eq);
                    } else if (!eq.timestamp) {
                        // Si no tiene fecha, lo mostramos? El user dijo "que se vayan a jugar en los proximos 10 dias".
                        // Lo ocultamos por si acaso, o lo mostramos? Mejor lo ocultamos si no hay fecha.
                    }
                }
            });
            
            let pasadosFiltrados = Object.values(pasadosPorEquipo);
            data.equipos = proximosFiltrados.concat(pasadosFiltrados);

            data.equipos.sort((a, b) => {

                let tsA = a.timestamp || Infinity; 
                let tsB = b.timestamp || Infinity;
                return tsA - tsB; 
            });

            let htmlProximos = "";
            let htmlPasados = "";

            data.equipos.forEach(eq => {
                let valJornada = String(eq.jornada_eq || "").trim();
                let infoJornadaEq = valJornada ? (isNaN(valJornada) ? ` <span style="font-size:0.9rem; color:#666; font-weight:normal;">(${valJornada})</span>` : ` <span style="font-size:0.9rem; color:#666; font-weight:normal;">(Jornada ${valJornada})</span>`) : "";
                let iconoLoc = eq.ubicacion === "CASA" ? "🏠" : (eq.ubicacion === "FUERA" ? "✈️" : "");
                let streamIcon = eq.streaming ? ` <a href="${eq.streaming}" target="_blank" style="margin-left:8px; display:inline-block; vertical-align:middle;" title="Ver Streaming Oficial"><img loading="lazy" src="files/images/play_icon.png" style="width:16px; height:16px; display:block;"></a>` : "";
                  let infoLocFecha = (iconoLoc || eq.timestamp) ? `<div style="font-size:0.9rem; color:#555; margin-bottom:4px; font-weight:bold;">${iconoLoc} ${formatFecha(eq.timestamp)}${streamIcon}</div>` : (streamIcon ? `<div style="margin-bottom:4px;">${streamIcon}</div>` : "");
                let infoPabellon = eq.pabellon ? `<div style="font-size:0.85rem; color:#777; margin-bottom:10px;">📍 ${eq.pabellon}</div>` : "<div style='margin-bottom:10px;'></div>";

                let infoAdicional = "";
                let esPasado = false;

                if (eq.oficial_sets && eq.oficial_sets.includes("-")) {
                    esPasado = true;
                    let sL = parseInt(eq.oficial_sets.split("-")[0]);
                    let sV = parseInt(eq.oficial_sets.split("-")[1]);
                    let textoRes = sL > sV ? `<span style="color:#28a745; font-weight:bold; margin-left:5px;">🟢 Ganado</span>` : `<span style="color:var(--vcv-rojo); font-weight:bold; margin-left:5px;">🔴 Perdido</span>`;
                    
                    infoAdicional = `
                    <div style="margin-top:10px; background:var(--bg-general); border-left:4px solid var(--vcv-morado); padding:10px; border-radius:4px;">
                        <span style="font-size:0.85rem; color:#666; text-transform:uppercase; letter-spacing:0.5px;">Resultado Oficial</span><br>
                        <b style="font-size:1.1rem; color:var(--vcv-negro);">${eq.oficial_sets}</b> ${textoRes} <br>
                        <span style="font-size:0.9rem; color:#555;">(${eq.oficial_parciales})</span>
                    </div>`;
                } else if (eq.estado === "CERRADO" || eq.visibilidad === "OCULTAR") {
                    esPasado = true;
                    infoAdicional = `<div style="margin-top:10px;"><span style="background-color:#e2e3e5; color:#383d41; padding:6px 12px; border-radius:20px; font-weight:bold; font-size:0.85rem;"> Partido finalizado</span></div>`;
                } else {
                    infoAdicional = `<div style="margin-top:10px;"><span style="background-color:#d4edda; color:#155724; padding:6px 12px; border-radius:20px; font-weight:bold; font-size:0.85rem;">🟢 Próximamente</span>${eq.timestamp ? `<div class="reloj-partido" data-ts="${eq.timestamp}" style="font-size:0.85rem; font-weight:bold; padding:4px 8px; background:#fff3cd; color:#856404; border-radius:4px; display:inline-block; margin-left:10px;">Calculando tiempo...</div>` : ""}</div>`;
                }
                
                let categoryHtml = getCategoryHTML(eq.categoria);

                let cardHtml = `
                <div class="p-3 mb-3 card-match" style="background: var(--vcv-blanco); border-radius: 8px; border: 1px solid #e9ecef; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    ${categoryHtml}
                    <h5 style="margin-bottom: 5px; color:var(--vcv-morado); font-weight:bold; padding-right: 90px;">🏐 ${eq.equipo_local} vs ${eq.rival}${infoJornadaEq}</h5>
                      ${eq.es_derby ? `<div style="margin-bottom:10px; background:linear-gradient(90deg, #b06000, #d4af37); color:#fff; padding:6px 10px; border-radius:8px; font-size:0.85rem; font-weight:900; display:inline-flex; align-items:center; gap:8px; box-shadow: 0 2px 8px rgba(212, 175, 55, 0.5);">🔥 ¡DERBY! <span onclick="document.getElementById('infoDerbyModal').style.display='flex'; event.stopPropagation();" style="display:flex; align-items:center; justify-content:center; width:20px; height:20px; background:rgba(255,255,255,0.2); border-radius:50%; cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5"/><circle cx="12" cy="12" r="10"/></svg></span></div>` : ""}
                    ${infoLocFecha}
                    ${infoPabellon}
                    
                    ${infoAdicional}
                </div>`;

                if (esPasado) { htmlPasados = cardHtml + htmlPasados; } 
                else { htmlProximos += cardHtml; }
            });

            let finalHtml = "";
            if(htmlProximos !== "") finalHtml += `<h4 style="color:var(--vcv-morado); margin-bottom:15px; text-align:left; border-bottom:2px solid var(--vcv-dorado); padding-bottom:5px;">Partidos en los próximos 10 días</h4>` + htmlProximos;
            if(htmlPasados !== "") finalHtml += `<h4 style="color:var(--vcv-morado); margin-top:30px; margin-bottom:15px; text-align:left; border-bottom:2px solid var(--vcv-dorado); padding-bottom:5px;">Últimos Resultados</h4>` + htmlPasados;
            
            if(finalHtml === "") finalHtml = `<div class="alert-box alert-info" style="display:block;">No hay partidos públicos disponibles en este momento.</div>`;

            document.getElementById('contenedorPartidos').innerHTML = finalHtml;
            if(window.updateCategoryFilter) window.updateCategoryFilter();
            document.getElementById('loginSection').style.display = "none";
            if(typeof iniciarRelojes === 'function') iniciarRelojes();
        } else {
            msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Error cargando modo invitado."; msgBox.style.display = "block";
          updateProgressBar();
        }
    })
    .catch(err => { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Error: " + err.message + " | " + (err.stack || ""); msgBox.style.display = "block";
          updateProgressBar(); })
    .finally(() => { 
        btn.innerText = "👀 Entrar como invitado"; 
        btn.disabled = false; 
    });
});

// LOGICA USUARIO NORMAL
document.getElementById('btnLogin').addEventListener('click', function() {
    const usr = document.getElementById('loginUsuario').value.trim();
    const pwd = document.getElementById('loginPassword').value.trim();
    const msgBox = document.getElementById('loginMessage');
    const btn = this;

    if(!usr || !pwd) { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Rellena usuario y contraseña."; msgBox.style.display = "block";
          updateProgressBar(); return; }
    
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Accediendo...'; 
    msgBox.style.display = "none";

    fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'login', usuario: usr, password: pwd }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
    .then(res => res.json())
    .then(data => {
        if(data.status === "success") {
            
            currentUser = usr; currentPassword = pwd;
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
            
            let myBadges = data.insignias ? (data.insignias[currentUser] || []) : [];
            let insigniasHTML = "";
            let displayMyBadges = myBadges.filter(b => b.type !== 'avatar');
            if (displayMyBadges.length > 0) {
                insigniasHTML += `<div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:8px;">`;
                displayMyBadges.forEach(b => {
                    let safeText = (b.text || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    let badgeIcon = renderBadgeIcon(b, "", "width:18px; height:18px; display:block; margin:0;");
                    insigniasHTML += `<div class="user-badge-chip-icon" title="${safeText}" onclick="showMobileTooltip(event, '${safeText}')" onmouseenter="showMobileTooltip(event, '${safeText}')" onmouseleave="hideMobileTooltip()" style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; background:var(--bg-general); border:1px solid var(--border-color); cursor:pointer; transition:transform 0.15s ease, border-color 0.15s ease;">${badgeIcon}</div>`;
                });
                insigniasHTML += `</div>`;
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
              
              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                  <h2 style="font-size: 1.55rem; font-weight: 800; color: var(--text-main); margin:0; letter-spacing:-0.5px; line-height:1.1; text-align:left;">¡Hola ${data.nombre_real || currentUser}!</h2>
                  <p style="font-size: 0.85rem; color: var(--text-muted); margin: 4px 0 0 0; text-align:left;">
                    <span style="color: var(--vcv-dorado); font-weight: 700;">@${currentUser}</span>
                  </p>
                  ${insigniasHTML}
                </div>
                <span id="user-progress-label" style="font-size: 0.8rem; font-weight: bold; color: var(--vcv-dorado); background: rgba(212, 175, 55, 0.1); padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.3); white-space: nowrap; margin-left:10px;">${porcentaje}% Listo</span>
              </div>

              <div style="width: 100%; background: rgba(0, 0, 0, 0.15); border-radius: 9999px; height: 6px; margin-top: 14px; overflow: hidden;">
                
                <div id="user-progress-bar" style="background: #d4af37; background: linear-gradient(to right, #ffd700, #d4af37); min-height: 6px; display: block; transition: width 0.5s ease-in-out; height: 100%; border-radius: 9999px; width: ${porcentaje}%; "></div>
              </div>
            </div>`;
            document.getElementById('perfilUsuarioTop').innerHTML = htmlPerfil;
            
            let promoDiv2 = document.getElementById('guestPromoBanner');
            if (promoDiv2) promoDiv2.style.display = "none";
            currentJornadaGlobal = data.jornada;
            window.appData = data;
            if(window.initCalendar) window.initCalendar();
            if(window.renderHistorialV2) window.renderHistorialV2(data);
            if(window.loadInsigniasUI) window.loadInsigniasUI();
            if(window.renderMyProfileCard) window.renderMyProfileCard();
            
            

            if(data.reglas) {
                let listaReglas = document.getElementById('listaReglasPuntuacion');
                if(listaReglas) {
                    listaReglas.innerHTML = `
                        <li>Acertar el <b>Resultado Exacto (Sets)</b>: <span style="color:var(--vcv-rojo); font-weight:bold;">+${data.reglas.sets} pts</span></li>
                        <li>Acertar el <b>Ganador del partido</b>: <span style="color:var(--vcv-rojo); font-weight:bold;">+${data.reglas.ganador} pts</span></li>
                        <li>Acertar la <b>Diferencia de puntos exacta</b>: <span style="color:var(--vcv-rojo); font-weight:bold;">+${data.reglas.diff_exacta} pts</span> extra</li>
                        <li>Aproximarse a la diferencia (margen de ${data.reglas.max_dist} pts): <span style="color:var(--vcv-rojo); font-weight:bold;">Bonus proporcional</span></li>
                    `;
                }
                const pExact = document.getElementById('puntosExactosModal');
                const pMargen = document.getElementById('puntosMargenModal');
                if (pExact) pExact.innerText = data.reglas.diff_exacta;
                if (pMargen) pMargen.innerText = data.reglas.max_dist;

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

            // Calculate Rank from Global Leaderboard
            if(typeof window.updateHeaderStats === "function") { window.updateHeaderStats(); } else { setTimeout(() => { if(typeof window.updateHeaderStats === "function") window.updateHeaderStats(); }, 500); }
            let displayMisInsignias = misInsignias.filter(b => b.type !== 'avatar');
            displayMisInsignias.forEach(b => {
                if (b.type === 'admin') isAdmin = true;
                let cssColorClass = getBadgeCSS(b.type);
                insigniasHeaderHtml += renderBadgeIcon(b, "badge-header", "width:18px; height:18px; cursor:pointer;").replace(">", ` title="${b.text}" onclick="showMobileTooltip(event, \'${b.text}\')">`);
                
                // NO tooltips, NO onclick for the top header badges! Just visual.
                insigniasH2Html += renderBadgeIcon(b, "", "width:14px; height:14px;");
            });
            
            let badgesEl = document.getElementById('h2-user-badges'); if(badgesEl) badgesEl.innerHTML = insigniasH2Html;
            
            // Render lucide icons in the newly injected HTML
            lucide.createIcons();
            
            if (isAdmin) {
                document.getElementById('adminPanelWrapper').style.display = "block";
                renderAdminPanel(data.equipos); 
                
                // POPULATE LIGAS
                var ligasContainer = document.getElementById('adminLigasCheckboxes');
                if (ligasContainer && data.todas_las_ligas) {
                    ligasContainer.innerHTML = '';
                    var allLigas = data.todas_las_ligas;
                    allLigas.forEach(function(liga) {
                        if (!liga) return; // Skip empty columns
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
            } else {
                document.getElementById('adminPanelWrapper').style.display = "none";
            }

             document.getElementById('tituloPrincipalSeccion').style.display = 'block';

            data.equipos.sort((a, b) => {
                let tsA = a.timestamp || Infinity; 
                let tsB = b.timestamp || Infinity;
                return tsA - tsB; 
            });
            
            equiposTotalesInfo = data.equipos;

            let htmlPartidos = ``;
            let equiposPermitidos = 0;
            let equiposCerrados = 0;
            let nowMs = new Date().getTime();
            
            data.equipos.forEach(eq => {
                if (eq.permitido && eq.visibilidad === "MOSTRAR") {
                    equiposPermitidos++;
                    
                let isPredicted = false;
                let pSets = "", pPts = "", pSig = "";
                let ptsText = "", formStr = "";
                let savedLocalName = "", savedVisitName = "", formattedSets = "";
                
                console.log('Preds para ' + eq.id_partido + ':', data.predicciones_usuario ? data.predicciones_usuario[eq.id_partido] : 'none');
                if (data.predicciones_usuario && data.predicciones_usuario[eq.id_partido]) {
                    isPredicted = true;
                    pSets = data.predicciones_usuario[eq.id_partido].sets || "";
                    pPts = data.predicciones_usuario[eq.id_partido].puntos || "";
                    pSig = data.predicciones_usuario[eq.id_partido].signo || "";
                    savedLocalName = (eq.ubicacion === 'LOCAL') ? eq.equipo_local : eq.rival;
                    savedVisitName = (eq.ubicacion === 'LOCAL') ? eq.rival : eq.equipo_local;
                    let winnerName = "";
                    if (pSig.toLowerCase().includes('a favor')) winnerName = savedLocalName;
                    else if (pSig.toLowerCase().includes('en contra')) winnerName = savedVisitName;
                    formStr = winnerName ? `(+${pPts} pts para ${winnerName})` : `(${pPts} pts)`;
                    if(pPts == 0) formStr = `(0 pts)`;
                    formattedSets = String(pSets).replace('-', ' - ');
                }
                let valJornada = String(eq.jornada_eq || "").trim();
                    let infoJornadaEq = "";
                    if(valJornada) {
                        infoJornadaEq = isNaN(valJornada) ? ` <span style="font-size:0.9rem; color:#666; font-weight:normal;">(${valJornada})</span>` : ` <span style="font-size:0.9rem; color:#666; font-weight:normal;">(Jornada ${valJornada})</span>`;
                    }
                    
                    let iconoLoc = eq.ubicacion === "CASA" ? "🏠" : (eq.ubicacion === "FUERA" ? "✈️" : "");
                    let streamIcon = eq.streaming ? ` <a href="${eq.streaming}" target="_blank" style="margin-left:8px; display:inline-block; vertical-align:middle;" title="Ver Streaming Oficial"><img loading="lazy" src="files/images/play_icon.png" style="width:16px; height:16px; display:block;"></a>` : "";
                    let infoLocFecha = (iconoLoc || eq.timestamp) ? `<div style="font-size:0.9rem; color:#555; margin-bottom:4px; font-weight:bold;">${iconoLoc} ${formatFecha(eq.timestamp)}${streamIcon}</div>` : (streamIcon ? `<div style="margin-bottom:4px;">${streamIcon}</div>` : "");
                    let infoPabellon = eq.pabellon ? `<div style="font-size:0.85rem; color:#777; margin-bottom:10px;">📍 ${eq.pabellon}</div>` : "<div style='margin-bottom:10px;'></div>";
                    
                    let categoryHtml = getCategoryHTML(eq.categoria);

                    // --- LOGICA JUGADOR DESTACADO ---
                      let destacadoHtml = "";
                      // --- FIN LOGICA JUGADOR DESTACADO ---

                    if (eq.estado === "ABIERTO" || eq.estado === "CERRADO") {
                        let dt = new Date(eq.timestamp);
                        let fechaFormateada = isNaN(dt) ? "" : `${dt.toLocaleDateString()} ${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;

                        

                        let localTeamName = (eq.ubicacion === 'LOCAL') ? eq.equipo_local : eq.rival;
                        let visitTeamName = (eq.ubicacion === 'LOCAL') ? eq.rival : eq.equipo_local;
                        
                        let abrevLocalRaw = (eq.ubicacion === 'LOCAL') ? eq.abrev_local : eq.abrev_rival;
                        let abrevVisitRaw = (eq.ubicacion === 'LOCAL') ? eq.abrev_rival : eq.abrev_local;
                        
                        let localAbrev = (abrevLocalRaw || localTeamName.substring(0,3)).toUpperCase();
                        let visitAbrev = (abrevVisitRaw || visitTeamName.substring(0,3)).toUpperCase();

                        let safeLocalName = localTeamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
let safeVisitName = visitTeamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
let localLogo = `<picture><source srcset="files/images/escudos/${safeLocalName}.webp" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeLocalName}.png?v=2" alt="${localTeamName}" onload="this.parentNode.parentNode.style.border='none'; this.parentNode.parentNode.style.background='transparent';" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\\'font-weight:900; font-size: 1.2rem;\\'>${localAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
let visitLogo = `<picture><source srcset="files/images/escudos/${safeVisitName}.webp" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeVisitName}.png?v=2" alt="${visitTeamName}" onload="this.parentNode.parentNode.style.border='none'; this.parentNode.parentNode.style.background='transparent';" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\\'font-weight:900; font-size: 1.2rem;\\'>${visitAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
                        
                        let infoPabellon = eq.pabellon ? `<div style="margin-top:2px;"><i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-top:-2px;"></i> ${eq.pabellon}</div>` : '';

                        let btnStreaming = eq.streaming 
                            ? `<a href="${eq.streaming}" target="_blank" class="btn-streaming-v2 active" style="text-decoration:none;"><i data-lucide="play" style="width:14px;height:14px;"></i> Streaming</a>` 
                            : `<button class="btn-streaming-v2 disabled" disabled><i data-lucide="play-square" style="width:14px;height:14px;"></i> Sin enlace</button>`;

                        
                        let catFilename = eq.categoria + ".svg";
    let catLower = eq.categoria.toLowerCase();
    let isFvcl = false;
    if (catLower.includes("sm2") || catLower.includes("superliga 2")) catFilename = "SM2.svg";
    else if (catLower.includes("primera") && catLower.includes("masc")) catFilename = "1DIV_MASC.svg";
    else if (catLower.includes("1") && catLower.includes("masc")) catFilename = "1DIV_MASC.svg";
    else if (catLower.includes("primera") && catLower.includes("fem")) catFilename = "1DIV_FEM.svg";
    else if (catLower.includes("1") && catLower.includes("fem")) catFilename = "1DIV_FEM.svg";
    else if (catLower.includes("segunda") || catLower.includes("2")) {
        catFilename = "fvcl.png";
        isFvcl = true;
    }

    let catLogoHtml = "";
    if (isFvcl) {
        catLogoHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <img loading="lazy" src="files/images/${catFilename}" style="height: 28px; width: auto;" alt="FVCL" onerror="this.style.display='none'">
                <span style="color: var(--secondary-color); font-weight: 800; line-height: 36px;">
                  ${eq.categoria.toUpperCase()}
                </span>
            </div>`;
    } else {
        catLogoHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <img loading="lazy" src="files/images/logo_esvoley.svg" style="height: 36px; width: auto;" alt="EsVoley" onerror="this.style.display='none'">
                <img loading="lazy" src="files/images/${catFilename}" style="height: 36px; width: auto;" alt="${eq.categoria}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block'; this.previousElementSibling.style.display='none';">
                <span style="color: var(--secondary-color); font-weight: 800; display: none; line-height: 36px;">
                  ${eq.categoria.toUpperCase()}
                </span>
            </div>`;
    }
                        if (eq.estado === "CERRADO") {
                            // --- PARTIDO CERRADO: DISEÑO COMPACTO Y SIMÉTRICO (OFICIAL VS TU PRONÓSTICO) ---
                            let miPronSets = isPredicted ? (pSets || '-').replace('-', ' - ') : 'Sin datos';
                            let miPronDetalle = 'Sin predicción';
                            if (isPredicted) {
                                let isWinnerLocal = pSig.toLowerCase().includes('a favor');
                                let isWinnerVisit = pSig.toLowerCase().includes('en contra');
                                let winnerSafe = isWinnerLocal ? safeLocalName : (isWinnerVisit ? safeVisitName : '');
                                let winnerAbrev = isWinnerLocal ? localAbrev : (isWinnerVisit ? visitAbrev : '');

                                if (pPts == 0) {
                                    miPronDetalle = `<span>Empate en puntos (0 pts)</span>`;
                                } else if (winnerSafe) {
                                    miPronDetalle = `
                                    <div style="display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                                        <span>+${pPts} pts</span>
                                        <picture style="display:inline-flex; vertical-align:middle;">
                                            <source srcset="files/images/escudos/${winnerSafe}.webp" type="image/webp">
                                            <img loading="lazy" src="files/images/escudos/${winnerSafe}.png?v=2" alt="" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\\'font-weight:800; font-size:0.75rem;\\'>${winnerAbrev}</span>';" style="width:22px; height:22px; object-fit:contain;">
                                        </picture>
                                    </div>`;
                                } else {
                                    miPronDetalle = `<span>Dif: ${pPts} pts</span>`;
                                }
                            }

                            htmlPartidos += `
                            <div class="vcv-card-v2" id="card-v2-${eq.id_partido}" data-category="${eq.categoria}" style="padding: 16px; margin-bottom: 12px; ${eq.es_derby ? 'box-shadow: 0 0 20px rgba(212, 175, 55, 0.4); border-color: var(--secondary-color);' : ''}">
                                <!-- Header completo con Fecha, Jornada y Pabellón/Lugar -->
                                <div class="match-header-strip-v2" style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid var(--border-color);">
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        ${catLogoHtml}
                                        ${eq.es_derby ? `<div style="background:linear-gradient(90deg, #b06000, #d4af37); color:#fff; padding:2px 8px; border-radius:8px; font-size:0.75rem; font-weight:900; display:inline-flex; align-items:center; gap:6px; box-shadow: 0 2px 8px rgba(212, 175, 55, 0.5);">🔥 DERBY <span onclick="document.getElementById('infoDerbyModal').style.display='flex'; event.stopPropagation();" style="display:flex; align-items:center; justify-content:center; width:16px; height:16px; background:rgba(255,255,255,0.2); border-radius:50%; cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5"/><circle cx="12" cy="12" r="10"/></svg></span></div>` : ''}
                                    </div>
                                    <div style="text-align: right; color:var(--text-muted); font-size:0.78rem;">
                                        <div><i data-lucide="calendar" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-top:-2px;"></i> ${fechaFormateada}</div>
                                        ${infoPabellon}
                                    </div>
                                </div>

                                <!-- Fila de Equipos con Escudos Grandes -->
                                <div class="teams-versus-container-v2" style="margin-bottom: 12px;">
                                    <div class="team-box-v2">
                                        <div class="team-avatar-v2">${localLogo}</div>
                                        <span class="team-name-v2">${localTeamName}</span>
                                        <span class="team-role-v2" style="color: var(--success); font-weight:800;">LOCAL</span>
                                    </div>
                                    <div class="vs-divider-v2" style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                                        <div style="font-size: 0.85rem; font-weight:900; color:var(--text-muted);">VS</div>
                                        ${btnStreaming}
                                    </div>
                                    <div class="team-box-v2">
                                        <div class="team-avatar-v2">${visitLogo}</div>
                                        <span class="team-name-v2">${visitTeamName}</span>
                                        <span class="team-role-v2" style="color: var(--text-muted); font-weight:800;">VISITANTE</span>
                                    </div>
                                </div>

                                <!-- Comparativa Visual Gemela: Resultado Oficial vs Tu Predicción -->
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                                    <!-- Caja Resultado Oficial -->
                                    <div style="background: var(--bg-card-alt); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
                                        <div style="font-size: 0.68rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                                            RESULTADO OFICIAL
                                        </div>
                                        <div style="font-size: 1.25rem; font-weight: 900; color: var(--text-main); font-family: 'Space Grotesk', sans-serif;">
                                            ${(eq.oficial_sets || 'Sin resultado').replace('-', ' - ')}
                                        </div>
                                        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${eq.oficial_parciales || ''}">
                                            ${eq.oficial_parciales || 'Parciales pendientes'}
                                        </div>
                                    </div>

                                    <!-- Caja Tu Predicción -->
                                    <div style="background: ${isPredicted ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card-alt)'}; border: 1px solid ${isPredicted ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-color)'}; border-radius: 10px; padding: 10px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
                                        <div style="font-size: 0.68rem; font-weight: 800; color: ${isPredicted ? 'var(--success)' : 'var(--text-muted)'}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                            <i data-lucide="${isPredicted ? 'check-circle-2' : 'help-circle'}" style="width: 12px; height: 12px;"></i> TU PREDICCIÓN
                                        </div>
                                        <div style="font-size: 1.25rem; font-weight: 900; color: ${isPredicted ? 'var(--text-main)' : 'var(--text-muted)'}; font-family: 'Space Grotesk', sans-serif;">
                                            ${miPronSets}
                                        </div>
                                        <div style="font-size: 0.75rem; color: ${isPredicted ? 'var(--text-main)' : 'var(--text-muted)'}; font-weight: 700; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            ${miPronDetalle}
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                        } else {
                            // --- PARTIDO ABIERTO / EN CURSO ---
                            htmlPartidos += `
                            <div class="vcv-card-v2 ${isPredicted ? 'collapsed' : ''}" id="card-v2-${eq.id_partido}" data-category="${eq.categoria}" ${eq.es_derby ? 'style="box-shadow: 0 0 20px rgba(212, 175, 55, 0.4); border-color: var(--secondary-color);"' : ''}>
                                <div class="match-header-strip-v2" style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        ${catLogoHtml}
                                        ${eq.es_derby ? `<div style="background:linear-gradient(90deg, #b06000, #d4af37); color:#fff; padding:2px 8px; border-radius:8px; font-size:0.75rem; font-weight:900; display:inline-flex; align-items:center; gap:6px; box-shadow: 0 2px 8px rgba(212, 175, 55, 0.5);">🔥 DERBY <span onclick="document.getElementById('infoDerbyModal').style.display='flex'; event.stopPropagation();" style="display:flex; align-items:center; justify-content:center; width:16px; height:16px; background:rgba(255,255,255,0.2); border-radius:50%; cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5"/><circle cx="12" cy="12" r="10"/></svg></span></div>` : ''}
                                    </div>
                                    <div style="text-align: right;">
                                        <div><i data-lucide="calendar" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-top:-2px;"></i> ${fechaFormateada}</div>
                                        ${infoPabellon}
                                    </div>
                                </div>

                                <div class="teams-versus-container-v2">
                                    <div class="team-box-v2">
                                      <div class="team-avatar-v2">${localLogo}</div>
                                      <span class="team-name-v2">${localTeamName}</span>
                                      <span class="team-role-v2" style="color: var(--success)">LOCAL</span>
                                    </div>
                                    <div class="vs-divider-v2" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                                      <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; background:var(--bg-general); padding:2px 8px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:-4px; white-space:nowrap;">J. ${eq.jornada_eq}</div>
                                      <div>VS</div>
                                      ${btnStreaming}
                                    </div>
                                    <div class="team-box-v2">
                                      <div class="team-avatar-v2">${visitLogo}</div>
                                      <span class="team-name-v2">${visitTeamName}</span>
                                      <span class="team-role-v2" style="color: var(--text-muted)">VISITANTE</span>
                                    </div>
                                </div>
                                <div style="text-align: center; margin-top: 10px; margin-bottom: 5px;">
                                    <div class="reloj-partido" data-ts="${eq.timestamp}" data-eq="${eq.id_partido}" style="display:inline-block;"></div>
                                </div>

                                <div class="summary-v2" id="summary-v2-${eq.id_partido}" style="${isPredicted ? 'display:block;' : 'display:none;'} margin-bottom: 12px;">
                                    <div id="summary-text-${eq.id_partido}">
                                    ${isPredicted ? `<div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; color: var(--text-main); text-align: left; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success);"><i data-lucide="check-circle-2" style="width: 20px; height: 20px; color: var(--success); flex-shrink: 0;"></i><span><strong style="color: var(--success); text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 2px;">Predicción Guardada</strong><strong style="color: var(--text-main); font-weight:900;">${savedLocalName} ${formattedSets} ${savedVisitName} ${formStr}</strong></span></div>` : ``}
                                    </div>
                                </div>

                                <!-- HIDDEN INPUTS -->
                                <input type="hidden" id="e${eq.id_partido}_sets" value="${pSets}">
                                <input type="hidden" id="e${eq.id_partido}_puntos" value="${pPts || '14'}">
                                <input type="hidden" id="e${eq.id_partido}_signo" value="${pSig}">

                                <div class="inputs-eq" id="inputs_eq_${eq.id_partido}" style="${isPredicted ? 'display:none;' : 'display:block;'}">
                                    <div class="sets-grid-label-v2">
                                      <span>Resultado</span>
                                    </div>
                                    <div class="sets-selector-grid-v2">
                                        <button type="button" class="set-option-btn-v2 ${pSets === '3-0' ? 'selected' : ''}" onclick="seleccionarSetV2(this, '3-0', '${eq.id_partido}')">3-0</button>
                                        <button type="button" class="set-option-btn-v2 ${pSets === '3-1' ? 'selected' : ''}" onclick="seleccionarSetV2(this, '3-1', '${eq.id_partido}')">3-1</button>
                                        <button type="button" class="set-option-btn-v2 ${pSets === '3-2' ? 'selected' : ''}" onclick="seleccionarSetV2(this, '3-2', '${eq.id_partido}')">3-2</button>
                                        <button type="button" class="set-option-btn-v2 ${pSets === '2-3' ? 'selected' : ''}" onclick="seleccionarSetV2(this, '2-3', '${eq.id_partido}')">2-3</button>
                                        <button type="button" class="set-option-btn-v2 ${pSets === '1-3' ? 'selected' : ''}" onclick="seleccionarSetV2(this, '1-3', '${eq.id_partido}')">1-3</button>
                                        <button type="button" class="set-option-btn-v2 ${pSets === '0-3' ? 'selected' : ''}" onclick="seleccionarSetV2(this, '0-3', '${eq.id_partido}')">0-3</button>
                                    </div>

                                    <div class="points-diff-container-v2">
                                      <div class="points-header-v2">
                                        <span style="font-size: 0.75rem; color: var(--text-main); font-weight: 700; text-transform: uppercase; display:flex; align-items:center; justify-content:center; gap:5px; letter-spacing:0.5px;">DIFERENCIA DE PUNTOS <i data-lucide="help-circle" style="width:14px; height:14px; cursor:pointer; color:var(--primary-color);" onclick="document.getElementById(\'guiaModal\').style.display=\'flex\'"></i></span>
                                      </div>
                                      <div class="points-controls-row-v2">
                                        <div class="stepper-container-v2">
                                          <button type="button" class="btn-step-v2" id="btn-step-minus-${eq.id_partido}" onclick="cambiarPuntosV2('${eq.id_partido}', -1)">-</button>
                                          <div class="stepper-value-v2">
                                            <input type="number" id="val-v2-${eq.id_partido}" value="${pPts || '14'}" oninput="sincronizarPuntosV2(\'${eq.id_partido}\')" style="background:transparent; border:none; text-align:center; font-size:1.3rem; font-weight:900; color:var(--secondary-color); width:46px; max-width:46px; outline:none; -moz-appearance:textfield; padding:0; margin:0; height:30px;">
                                            <small>PTS</small>
                                          </div>
                                          <button type="button" class="btn-step-v2" id="btn-step-plus-${eq.id_partido}" onclick="cambiarPuntosV2('${eq.id_partido}', 1)">+</button>
                                        </div>
                                        <div class="sign-selector-v2">
                                          <button type="button" class="sign-btn-v2 sign-plus-v2 ${pSig === 'A favor' ? 'selected' : ''}" id="signo-plus-v2-${eq.id_partido}" onclick="cambiarSignoV2('${eq.id_partido}', this, true)">
                                            <span style="font-size:0.7rem;">${localTeamName}</span>
                                          </button>
                                          <button type="button" class="sign-btn-v2 sign-minus-v2 ${pSig === 'En contra' ? 'selected' : ''}" id="signo-minus-v2-${eq.id_partido}" onclick="cambiarSignoV2('${eq.id_partido}', this, false)">
                                            <span style="font-size:0.7rem;">${visitTeamName}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                </div>
                                
                                <button type="button" id="btn-save-${eq.id_partido}" onclick="handleSaveOrModifyV2('${eq.id_partido}')" style="width:100%; margin-top:10px; padding:12px; border-radius:10px; ${isPredicted ? "background:transparent; color:var(--text-muted); font-weight:800; border:1px solid var(--border-color);" : "background:var(--secondary-color); color:#000; font-weight:800; border:none;"} cursor:pointer; transition: all 0.2s;">
                                    ${isPredicted ? "Modificar Predicción" : "Guardar Predicción"}
                                </button>
                                
                                ${destacadoHtml}
                            </div>`;
                        }
                    }
                }
            });

            if (equiposPermitidos === 0) {
                htmlPartidos = `<div class="alert-box alert-warning" style="display:block;">No hay partidos pendientes de predecir o en curso en este momento.</div>`;
                document.getElementById('btnSubmit').style.display = "none";
            } else if (equiposPermitidos === equiposCerrados) { document.getElementById('btnSubmit').style.display = "none"; }
            
            document.getElementById('contenedorPartidos').innerHTML = htmlPartidos;
            if(window.updateCategoryFilter) window.updateCategoryFilter();
            iniciarRelojes();
            if(window.lucide) setTimeout(() => lucide.createIcons(), 50);

            
            if(data.ligas && data.ligas.length > 0) {
                window.currentLiga = data.ligas[0];
            }
            if(typeof window.renderRankingV2 === "function") { window.renderRankingV2(); } else { setTimeout(() => { if(typeof window.renderRankingV2 === "function") window.renderRankingV2(); }, 500); }
            if(!data.equipos_totales || data.equipos_totales.length === 0) {
                let tsSec = document.getElementById('prediccionesTotalesSection');
                if(tsSec) tsSec.remove();
            }
            if(data.equipos_totales && data.equipos_totales.length > 0) {
                
                
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

            document.getElementById('loginSection').style.display = "none";
            document.getElementById('appSection').style.display = "block";
            
            document.getElementById('btnLogout').style.display = "block";
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
            msgBox.className = "alert-box alert-danger"; msgBox.innerText = data.message || "Error desconocido devuelto por el servidor."; msgBox.style.display = "block";
          updateProgressBar();
        }
    })
    .catch(err => { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Error: " + err.message + " | " + (err.stack || ""); msgBox.style.display = "block";
          updateProgressBar(); })
    .finally(() => { 
        btn.innerText = "Entrar"; 
        btn.disabled = false; 
    });
});

function iniciarRelojes() {
    if(intervalCountdown) clearInterval(intervalCountdown);
    intervalCountdown = setInterval(() => {
        const now = new Date().getTime();
        document.querySelectorAll('.reloj-partido').forEach(el => {
            const ts = parseInt(el.getAttribute('data-ts'));
            const eqId = el.getAttribute('data-eq');
            if(!ts) { el.style.display = 'none'; return; }
            
            const diff = ts - now;
            const limite = 0; 

            const applyStyle = (bg, color, text) => {
                el.innerHTML = text;
                el.style.backgroundColor = bg;
                el.style.color = color;
                el.style.border = '1px solid ' + color;
                el.style.borderRadius = '8px';
                el.style.padding = '6px 12px';
                el.style.fontSize = '0.75rem';
                el.style.fontWeight = '800';
            };

            const darkBg = 'var(--bg-input)';
            const red = 'var(--danger)';
            const blue = '#3498db';
            const yellow = 'var(--secondary-color)';
            const green = 'var(--success)';
            const gray = 'var(--text-muted)';

            if (isGuestMode) {
                if (diff <= 0 && diff > -14400000) {
                    applyStyle('rgba(231,76,60,0.1)', red, " Partido en curso");
                } else if (diff <= -14400000) {
                    const inputs = document.getElementById('inputs_eq_' + eqId);
                    if(inputs) {
                        if(!inputs.querySelector('span') || inputs.querySelector('span').innerText !== 'El plazo para predecir este partido está cerrado.') { inputs.innerHTML = '<div style="text-align:center; margin-top:15px; padding:12px; background:var(--bg-input); border-radius:12px; border:1px dashed var(--border-color);"><span style="font-size: 0.85rem; color: var(--text-muted); font-weight:bold;">El plazo para predecir este partido está cerrado.</span></div>'; }
                    }
                    const btnSave = document.getElementById('btn-save-' + eqId);
                    if (btnSave) btnSave.style.display = 'none';
                    applyStyle('rgba(255,255,255,0.05)', gray, " Partido Finalizado");
                } else {
                    let d = Math.floor(diff / (1000 * 60 * 60 * 24));
                    let h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    let m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    let s = Math.floor((diff % (1000 * 60)) / 1000);
                    let timeStr = "";
                    if (d > 0) timeStr = `${d}d ${h}h ${m}m ${s}s`;
                    else if (h > 0) timeStr = `${h}h ${m}m ${s}s`;
                    else if (m > 0) timeStr = `${m}m ${s}s`;
                    else timeStr = `${s}s`;
                    applyStyle('rgba(52,152,219,0.1)', blue, ` Empieza en: ${timeStr}`);
                }
            } else {
                if (diff <= limite && diff > -14400000) {
                    const inputs = document.getElementById('inputs_eq_' + eqId);
                    if(inputs) {
                        if(!inputs.querySelector('span') || inputs.querySelector('span').innerText !== 'El plazo para predecir este partido está cerrado.') { inputs.innerHTML = '<div style="text-align:center; margin-top:15px; padding:12px; background:var(--bg-input); border-radius:12px; border:1px dashed var(--border-color);"><span style="font-size: 0.85rem; color: var(--text-muted); font-weight:bold;">El plazo para predecir este partido está cerrado.</span></div>'; }
                    }
                    const btnSave = document.getElementById('btn-save-' + eqId);
                    if (btnSave) btnSave.style.display = 'none';
                    applyStyle('rgba(231,76,60,0.1)', red, " PREDICCIONES CERRADAS");
                } else if (diff <= -14400000) {
                    const inputs = document.getElementById('inputs_eq_' + eqId);
                    if(inputs) {
                        if(!inputs.querySelector('span') || inputs.querySelector('span').innerText !== 'El plazo para predecir este partido está cerrado.') { inputs.innerHTML = '<div style="text-align:center; margin-top:15px; padding:12px; background:var(--bg-input); border-radius:12px; border:1px dashed var(--border-color);"><span style="font-size: 0.85rem; color: var(--text-muted); font-weight:bold;">El plazo para predecir este partido está cerrado.</span></div>'; }
                    }
                    const btnSave = document.getElementById('btn-save-' + eqId);
                    if (btnSave) btnSave.style.display = 'none';
                    applyStyle('rgba(255,255,255,0.05)', gray, " Partido Finalizado");
                } else {
                    let diffLimit = diff - limite;
                    let d = Math.floor(diffLimit / (1000 * 60 * 60 * 24));
                    let h = Math.floor((diffLimit % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    let m = Math.floor((diffLimit % (1000 * 60 * 60)) / (1000 * 60));
                    let s = Math.floor((diffLimit % (1000 * 60)) / 1000);
                    let timeStr = "";
                    if (d > 0) timeStr = `${d}d ${h}h ${m}m ${s}s`;
                    else if (h > 0) timeStr = `${h}h ${m}m ${s}s`;
                    else if (m > 0) timeStr = `${m}m ${s}s`;
                    else timeStr = `${s}s`;
                    
                    if (d > 0 || h > 0) {
                        applyStyle('rgba(212,175,55,0.1)', yellow, ` Faltan: ${timeStr}`);
                    } else {
                        applyStyle('rgba(231,76,60,0.1)', red, ` Faltan: ${timeStr}`);
                    }
                }
            }
        });
    }, 1000);
}

function iniciarRelojTotales() {
    if(intervalTotalesCountdown) clearInterval(intervalTotalesCountdown);
    const deadline = new Date("2026-10-10T12:00:00").getTime();
    intervalTotalesCountdown = setInterval(() => {
        const el = document.getElementById('relojTotales');
        if(!el) return;
        const now = new Date().getTime();
        const diff = deadline - now;
        if(diff <= 0) {
            el.innerHTML = "CERRADO";
            el.style.color = "var(--vcv-rojo)";
            el.style.backgroundColor = "transparent";
        } else {
            let d = Math.floor(diff / (1000 * 60 * 60 * 24));
            let h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            let s = Math.floor((diff % (1000 * 60)) / 1000);
            el.innerHTML = `⏳ Cierra en: ${d}d ${h}h ${m}m ${s}s`;
        }
    }, 1000);
}

window.historialDataCache = null;

function renderHistorialV2(data) {
    window.historialDataCache = data;
    drawHistorialUI('todas');
}

function drawHistorialUI(selectedJornada = 'todas', selectedEquipo = 'todos') {
    const data = window.historialDataCache;
    const container = document.getElementById('historialContentV2');
    if (!container || !data) return;

    let ptsGanador = 3, ptsSets = 5, ptsDiffExacta = 2, maxDistancia = 10;
    if (data.reglas) {
        ptsGanador = data.reglas.ganador || ptsGanador;
        ptsSets = data.reglas.sets || ptsSets;
        ptsDiffExacta = data.reglas.diff_exacta || ptsDiffExacta;
        maxDistancia = data.reglas.max_dist || maxDistancia;
    }

    const todosPartidosMap = {};
    if (data.todos_partidos) {
        data.todos_partidos.forEach(p => { todosPartidosMap[p.id_partido] = p; });
    } else if (data.equipos) {
        data.equipos.forEach(p => { todosPartidosMap[p.id_partido] = p; });
    }

    let todosArr = Object.values(todosPartidosMap);
    
    // Filtrar para mostrar solo los partidos que "están o han estado disponibles":
    const carteleraMap = {};
    if (data.equipos) {
        data.equipos.forEach(p => carteleraMap[p.id_partido] = true);
    }

    todosArr = todosArr.filter(match => {
        if (data.predicciones_usuario && data.predicciones_usuario[match.id_partido]) return true;
        if (match.estado === "CERRADO" || match.oficial_sets) return true;
        if (carteleraMap[match.id_partido]) return true;
        // Si es un partido futuro que aún no está en la cartelera, lo ocultamos del historial
        return false;
    });

    // Extraer jornadas y equipos de todos los partidos filtrados
    let jornadas = new Set();
    let equipos = new Set();
    todosArr.forEach(match => {
        if (match.jornada_eq) jornadas.add(match.jornada_eq);
        if (match.equipo_local) equipos.add(match.equipo_local);
    });
    
    let jornadasArr = Array.from(jornadas).sort((a,b) => parseInt(a) - parseInt(b));
    let equiposArr = Array.from(equipos).sort();

    // Ordenar de más nuevo a más antiguo por timestamp
    todosArr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    let ptsTotales = 0;
    let aciertosGanador = 0;
    let plenos = 0;
    let setsExactos = 0;
    let totalPredicciones = 0;
    let partidosEvaluados = [];

    for (const match of todosArr) {
        // Filtrar por jornada y equipo
        if (selectedJornada !== 'todas' && match.jornada_eq !== selectedJornada) continue;
        if (selectedEquipo !== 'todos' && match.equipo_local !== selectedEquipo) continue;

        let localName = match.ubicacion === 'LOCAL' ? match.equipo_local : match.rival;
        let visitName = match.ubicacion === 'LOCAL' ? match.rival : match.equipo_local;

        const pred = (data.predicciones_usuario && data.predicciones_usuario[match.id_partido]) 
            ? data.predicciones_usuario[match.id_partido] 
            : null;

        if (!pred) {
            // NO PREDICTION MADE
            if (match.estado !== "CERRADO") {
                // ABIERTO (WARNING)
                partidosEvaluados.push(`
                <div class="vcv-card-v2" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--vcv-dorado); margin-bottom:12px; border-left:4px solid var(--vcv-dorado); box-shadow:0 4px 10px rgba(212,175,55,0.1);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                    <span style="font-size: 0.75rem; background:rgba(212,175,55,0.1); padding:3px 8px; border-radius:4px; font-weight: 700; color:var(--vcv-dorado);">Jornada ${match.jornada_eq || '-'} • Pendiente</span>
                    <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 900;">- PTS</span>
                  </div>
                  <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 10px; color:var(--text-main);">${localName} <span style="color:var(--text-muted); font-weight:400;">vs</span> ${visitName}</div>
                  
                  <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-main); display: flex; align-items: center; gap: 8px; font-weight:600; background:rgba(212,175,55,0.05); padding:10px; border-radius:8px;">
                    <i data-lucide="alert-triangle" style="width: 16px; height: 16px; color:var(--vcv-dorado);"></i>
                    <span>¡Aún no has hecho tu predicción! Ve a "Partidos" para guardarla.</span>
                  </div>
                </div>`);
            } else {
                // CERRADO Y SIN PREDICCION (NO PENALIZA EN ESTADÍSTICAS)
                // Se quita el totalPredicciones++ para no arruinar la media
                
                let oDiffStr = "Sin acta";
                let oficialTxt = "Sin acta";
                if (match.oficial_sets) {
                    let oDiff = 0;
                    const setsP = match.oficial_parciales.split(",");
                    for (const sp of setsP) {
                        const nums = sp.split("-");
                        if (nums.length === 2) oDiff += (parseInt(nums[0]) - parseInt(nums[1]));
                    }
                    oDiffStr = oDiff >= 0 ? `+${oDiff}` : `${oDiff}`;
                    oficialTxt = `${match.oficial_sets} (${oDiffStr} pts local)`;
                }

                partidosEvaluados.push(`
                <div class="vcv-card-v2" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px; border-left:4px solid var(--text-muted); opacity: 0.65; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                    <span style="font-size: 0.75rem; background:var(--bg-card-alt); padding:3px 8px; border-radius:4px; font-weight: 700; color:var(--text-muted);">Jornada ${match.jornada_eq || '-'} • Finalizado</span>
                    <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 900;">- PTS</span>
                  </div>
                  <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 10px; color:var(--text-main);">${localName} <span style="color:var(--text-muted); font-weight:400;">vs</span> ${visitName}</div>
                  <div style="background: var(--bg-card-alt); padding: 12px; border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px; border:1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-muted);">Tu Pronóstico:</span>
                      <strong style="color: var(--text-muted);">No participaste</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-muted);">Acta Oficial:</span>
                      <strong style="color: var(--text-main);">${oficialTxt}</strong>
                    </div>
                  </div>
                  <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; font-weight:600;">
                    <i data-lucide="info" style="width: 14px; height: 14px;"></i>
                    <span>No enviaste predicción para este partido.</span>
                  </div>
                </div>`);
            }
            continue;
        }

        // --- PREDICCIÓN EXISTE ---
        if (match.estado !== "CERRADO" || !match.oficial_sets) {
            let uDiff = parseInt(pred.puntos) || 0;
            if (pred.signo && pred.signo.toLowerCase().includes("en contra")) uDiff = -uDiff;
            let uDiffStr = uDiff >= 0 ? `+${uDiff}` : `${uDiff}`;

            partidosEvaluados.push(`
            <div class="vcv-card-v2" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px; border-left:4px solid var(--border-color); opacity: 0.85;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                <span style="font-size: 0.75rem; background:var(--bg-card-alt); padding:3px 8px; border-radius:4px; font-weight: 700; color:var(--text-muted);">Jornada ${match.jornada_eq || '-'} • Pendiente</span>
                <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 900;">- PTS</span>
              </div>
              <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 10px; color:var(--text-main);">${localName} <span style="color:var(--text-muted); font-weight:400;">vs</span> ${visitName}</div>
              <div style="background: var(--bg-card-alt); padding: 12px; border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px; border:1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Tu Pronóstico:</span>
                  <strong style="color: var(--secondary-color);">${pred.sets} (${uDiffStr} pts local)</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Acta Oficial:</span>
                  <strong style="color: var(--text-muted); font-style:italic;">En juego / Sin acta</strong>
                </div>
              </div>
            </div>`);
            continue;
        }

        // --- PARTIDO CERRADO CON PREDICCIÓN ---
        totalPredicciones++;

        const oSets = match.oficial_sets.split("-");
        const oLocalWin = parseInt(oSets[0]) > parseInt(oSets[1]);
        const uSets = pred.sets.split("-");
        const uLocalWin = parseInt(uSets[0]) > parseInt(uSets[1]);

        let matchPts = 0;
        let acertoGanador = false;
        let acertoSets = false;

        if (uLocalWin === oLocalWin) { matchPts += ptsGanador; acertoGanador = true; aciertosGanador++; }
        if (pred.sets === match.oficial_sets) { matchPts += ptsSets; acertoSets = true; setsExactos++; }

        let oDiff = 0;
        const setsP = match.oficial_parciales.split(",");
        for (const sp of setsP) {
            const nums = sp.split("-");
            if (nums.length === 2) oDiff += (parseInt(nums[0]) - parseInt(nums[1]));
        }
        let uDiff = parseInt(pred.puntos) || 0;
        if (pred.signo && pred.signo.toLowerCase().includes("en contra")) uDiff = -uDiff;

        const dist = Math.abs(oDiff - uDiff);
        if (dist === 0) matchPts += ptsDiffExacta;
        else if (maxDistancia > 0 && dist < maxDistancia) {
            matchPts += Math.round(ptsDiffExacta * ((maxDistancia - dist) / maxDistancia));
        }

        ptsTotales += matchPts;
        if (acertoGanador && acertoSets && dist <= 2) plenos++;

        let oDiffStr = oDiff >= 0 ? `+${oDiff}` : `${oDiff}`;
        let uDiffStr = uDiff >= 0 ? `+${uDiff}` : `${uDiff}`;

        let summaryText = "";
        let colorClass = "var(--text-muted)";
        let iconType = "award";
        if (matchPts > (ptsGanador + ptsSets)) { summaryText = "¡Partidazo! Clavaste la predicción casi perfecta."; colorClass = "var(--success)"; }
        else if (acertoGanador) { summaryText = "Acertaste el ganador del partido."; colorClass = "var(--text-gold)"; }
        else { summaryText = "No hubo suerte en este partido."; colorClass = "var(--vcv-rojo)"; iconType = "x-circle"; }

        partidosEvaluados.push(`
        <!-- Tarjeta Historial -->
        <div class="vcv-card-v2" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px; border-left:4px solid ${colorClass}; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
            <span style="font-size: 0.75rem; background:var(--bg-card-alt); padding:3px 8px; border-radius:4px; font-weight: 700; color:var(--text-muted);">Jornada ${match.jornada_eq || '-'} • Finalizado</span>
            <span style="font-size: 0.95rem; color: ${colorClass}; font-weight: 900;">+${matchPts} PTS</span>
          </div>
          <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 10px; color:var(--text-main);">${localName} <span style="color:var(--text-muted); font-weight:400;">vs</span> ${visitName}</div>
          <div style="background: var(--bg-card-alt); padding: 12px; border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px; border:1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Tu Pronóstico:</span>
              <strong style="color: var(--secondary-color);">${pred.sets} (${uDiffStr} pts local)</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Acta Oficial:</span>
              <strong style="color: var(--text-main);">${match.oficial_sets} (${oDiffStr} pts local)</strong>
            </div>
          </div>
          <div style="margin-top: 10px; font-size: 0.8rem; color: ${colorClass}; display: flex; align-items: center; gap: 6px; font-weight:600;">
            <i data-lucide="${iconType}" style="width: 14px; height: 14px;"></i>
            <span>${summaryText}</span>
          </div>
        </div>`);
    }

    let eficacia = totalPredicciones > 0 ? Math.round((aciertosGanador / totalPredicciones) * 100) : 0;
    let promedio = totalPredicciones > 0 ? Math.round(ptsTotales / totalPredicciones) : 0;
    
    let ptsTxt = totalPredicciones > 0 ? ptsTotales : "-";
    let setsPorcentaje = totalPredicciones > 0 ? Math.round((setsExactos / totalPredicciones) * 100) : 0;
    let setsTxt = totalPredicciones > 0 ? `${setsExactos} <span style="font-size:0.9rem; font-weight:900; color:#55efc4; float:right; margin-top:8px;">${setsPorcentaje}%</span>` : "-";
    let aciertosTxt = totalPredicciones > 0 ? `${aciertosGanador} <span style="font-size:0.8rem; font-weight:normal; color:#ccc;">/ ${totalPredicciones}</span> <span style="font-size:0.9rem; font-weight:900; color:#55efc4; float:right; margin-top:8px;">${eficacia}%</span>` : "-";
    let promedioTxt = totalPredicciones > 0 ? `${promedio} <span style="font-size:0.8rem; font-weight:normal; color:#ccc;">/ part.</span>` : "-";

    let filterOptionsJ = `<option value="todas" ${selectedJornada==='todas' ? 'selected' : ''}>Todas las jornadas</option>`;
    jornadasArr.forEach(j => {
        filterOptionsJ += `<option value="${j}" ${selectedJornada===j ? 'selected' : ''}>Jornada ${j}</option>`;
    });

    let filterOptionsE = `<option value="todos" ${selectedEquipo==='todos' ? 'selected' : ''}>Todos los equipos</option>`;
    equiposArr.forEach(eq => {
        filterOptionsE += `<option value="${eq}" ${selectedEquipo===eq ? 'selected' : ''}>${eq}</option>`;
    });

    let topBar = `
      <div style="margin-bottom:15px;">
         <h2 style="font-size: 1.15rem; font-weight: 900; color:var(--text-main); margin:0 0 10px 0;">
            <i data-lucide="bar-chart-2" style="width:18px;height:18px;display:inline-block;vertical-align:text-bottom; color:var(--vcv-dorado);"></i> Estadísticas
         </h2>
         <div style="display:flex; gap:10px; flex-wrap:wrap;">
             <select id="histFilterJornada" onchange="drawHistorialUI(this.value, document.getElementById('histFilterEquipo').value)" style="flex:1; min-width:140px; padding:8px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-main); font-weight:bold; font-size:0.85rem; outline:none;">
                ${filterOptionsJ}
             </select>
             <select id="histFilterEquipo" onchange="drawHistorialUI(document.getElementById('histFilterJornada').value, this.value)" style="flex:2; min-width:180px; padding:8px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-main); font-weight:bold; font-size:0.85rem; outline:none;">
                ${filterOptionsE}
             </select>
         </div>
      </div>
    `;

    let statsHTML = `
      <!-- Resumen Métricas -->
      <div style="background: linear-gradient(135deg, var(--vcv-morado) 0%, #15081a 100%); padding: 15px; border-radius:12px; margin-bottom:20px; color:white; border:1px solid var(--vcv-dorado); box-shadow: 0 4px 15px rgba(212,175,55,0.15);">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          
          <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 0.72rem; color: rgba(255,255,255,0.7); text-transform: uppercase; font-weight:700;">Pts Ganados</div>
            <div style="font-size: 1.5rem; font-weight: 900; color: var(--vcv-dorado);">${ptsTxt}</div>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 0.72rem; color: rgba(255,255,255,0.7); text-transform: uppercase; font-weight:700;">Promedio</div>
            <div style="font-size: 1.5rem; font-weight: 900; color: #a29bfe;">${promedioTxt}</div>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 0.72rem; color: rgba(255,255,255,0.7); text-transform: uppercase; font-weight:700;">Aciertos (Part.)</div>
            <div style="font-size: 1.5rem; font-weight: 900; color: #74b9ff;">${aciertosTxt}</div>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 0.72rem; color: rgba(255,255,255,0.7); text-transform: uppercase; font-weight:700;">Sets Exactos</div>
            <div style="font-size: 1.5rem; font-weight: 900; color: #fff;">${setsTxt}</div>
          </div>
          
        </div>
      </div>
    `;

    let listHTML = "";
    if (partidosEvaluados.length === 0) {
        listHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); background:var(--bg-card-alt); border-radius:12px; border:1px dashed var(--border-color);">
            <i data-lucide="clock" style="width: 40px; height: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
            <p style="font-weight:600; margin:0;">No hay predicciones ni partidos que coincidan con estos filtros.</p>
        </div>`;
    } else {
        listHTML = `<div style="display: flex; flex-direction: column; gap: 12px;">` + partidosEvaluados.join("") + `</div>`;
    }

    container.innerHTML = topBar + statsHTML + `<h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:12px; margin-top:25px;">Desglose de Partidos</h3>` + listHTML;
    
    if(window.lucide) setTimeout(() => window.lucide.createIcons(), 10);
}

function cargarDatosAntiguos() {
    fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'load', usuario: currentUser, password: currentPassword }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
    .then(res => res.json())
    .then(data => {
        if(data.status === "success") {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el && val != null && val !== "") el.value = String(val).trim(); };
            var preds = data.data.predicciones;
            for(var idPart in preds) {
                setVal(`e${idPart}_sets`, preds[idPart].sets);
                setVal(`e${idPart}_puntos`, preds[idPart].puntos);
                setVal(`e${idPart}_signo`, preds[idPart].signo);
                
                // --- V2 UI Sync ---
                let isFilled = false;
                if (preds[idPart].sets) {
                    const btn = document.querySelector(`button[onclick*="seleccionarSetV2(this, '${preds[idPart].sets}', '${idPart}')"]`);
                    if (btn) btn.classList.add('selected');
                    isFilled = true;
                }
                if (preds[idPart].puntos !== undefined) {
                    const span = document.getElementById(`val-v2-${idPart}`);
                    if (span) span.innerText = preds[idPart].puntos;
                    // If it's 0, we can also force the tied state just in case
                    if (parseInt(preds[idPart].puntos) === 0) {
                        const btnPlus = document.getElementById(`signo-plus-v2-${idPart}`);
                        const btnMinus = document.getElementById(`signo-minus-v2-${idPart}`);
                        const btnStepMinus = document.getElementById(`btn-step-minus-${idPart}`);
                        if(btnPlus) { btnPlus.classList.add('tied-btn'); btnPlus.disabled = true; }
                        if(btnMinus) { btnMinus.classList.add('tied-btn'); btnMinus.disabled = true; }
                        if(btnStepMinus) {
                            btnStepMinus.disabled = true;
                            btnStepMinus.style.background = 'var(--secondary-color)';
                            btnStepMinus.style.color = '#000';
                            btnStepMinus.style.cursor = 'not-allowed';
                        }
                    }
                }
                if (preds[idPart].signo) {
                    const signoVal = preds[idPart].signo;
                    if (signoVal === "A favor") {
                        const btn = document.getElementById(`signo-plus-v2-${idPart}`);
                        if (btn) btn.classList.add('selected');
                    } else if (signoVal === "En contra") {
                        const btn = document.getElementById(`signo-minus-v2-${idPart}`);
                        if (btn) btn.classList.add('selected');
                    } else if (signoVal === "Empate") {
                        const btnPlus = document.getElementById(`signo-plus-v2-${idPart}`);
                        const btnMinus = document.getElementById(`signo-minus-v2-${idPart}`);
                        if(btnPlus) { btnPlus.classList.add('tied-btn'); btnPlus.disabled = true; }
                        if(btnMinus) { btnMinus.classList.add('tied-btn'); btnMinus.disabled = true; }
                    }
                }
                
                if (isFilled) {
                    const card = document.getElementById('card-v2-' + idPart);
                    const btn = document.getElementById('btn-save-' + idPart);
                    const summary = document.getElementById('summary-v2-' + idPart);
                    const inputs = document.getElementById('inputs_eq_' + idPart);
                    if(card && btn && summary && inputs) {
                        const s = preds[idPart].sets;
                        const p = preds[idPart].puntos;
                        const sig = preds[idPart].signo;
                        
                    const selectedSignBtn = document.querySelector(`#signo-plus-v2-${idPart}.selected`) || document.querySelector(`#signo-minus-v2-${idPart}.selected`);
                    let signText = selectedSignBtn ? selectedSignBtn.innerText : (sig === 'Empate' ? 'Empate' : sig);
                    if(p == 0) signText = "Empate";
                    

                        card.classList.add('collapsed');
                        inputs.style.display = 'none';
                        summary.style.display = 'block';
                        btn.innerText = 'Modificar Predicción';
                        btn.style.background = 'transparent';
                        btn.style.color = 'var(--text-muted)';
                        btn.style.border = '1px solid var(--border-color)';
                    }
                }
            }
        }
    });
}

document.getElementById('prediccionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const btnSubmit = document.getElementById('btnSubmit'); 
    const msgBox = document.getElementById('appMessage');
    msgBox.style.display = "none";

    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    let prediccionesList = {};
    
    equiposTotalesInfo.forEach(eq => {
        const elSet = document.getElementById(`e${eq.id_partido}_sets`);
        if(elSet && !elSet.disabled) {
            let vSet = getVal(`e${eq.id_partido}_sets`);
            let vPuntos = getVal(`e${eq.id_partido}_puntos`);
            let vSigno = getVal(`e${eq.id_partido}_signo`);

            // ONLY send this prediction if the user has actually made one (or is modifying an existing one).
            // This prevents overwriting valid backend predictions with empty ones.
            if (vSet !== "") {
                prediccionesList[eq.id_partido] = { sets: vSet, puntos: vPuntos, signo: vSigno };
            }
        }
    });

    

    btnSubmit.disabled = true; 
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...'; 

    fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'save', usuario: currentUser, password: currentPassword, jornada: currentJornadaGlobal, predicciones: prediccionesList }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
    .then(res => res.json())
    .then(data => {
        msgBox.style.display = "block";
          updateProgressBar();
        if (data.status === "success") { msgBox.className = "alert-box alert-success"; msgBox.innerText = "✅ " + data.message; } 
        else { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "❌ " + data.message; }
    })
    .catch(() => { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Error: " + err.message + " | " + (err.stack || ""); msgBox.style.display = "block";
          updateProgressBar(); })
    .finally(() => { btnSubmit.disabled = false; btnSubmit.innerText = "💾 Guardar Mis Predicciones"; });
});

document.getElementById('btnToggleSort').addEventListener('click', function(e) {
    e.preventDefault();
    isSortDesc = !isSortDesc;
    this.innerText = isSortDesc ? "⬇️ Orden Descendente (Nuevos primero)" : "⬆️ Orden Ascendente (Viejos primero)";
    renderizarHistorial();
});

document.getElementById('btnHistory').addEventListener('click', function(e) {
    e.preventDefault();
    const msgBox = document.getElementById('historyMessage');
    const container = document.getElementById('historyListContainer');
    const controls = document.getElementById('historyControls');
    const btnHist = this;

    btnHist.disabled = true; 
    btnHist.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cargando historial...'; 
    msgBox.style.display = "none";

    fetchSeguro(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'get_history', usuario: currentUser, password: currentPassword }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
    .then(res => res.json())
    .then(data => {
        if(data.status === "success") {
            if (data.history.length === 0) {
                msgBox.style.display = "block";
          updateProgressBar(); msgBox.className = "alert-box alert-warning"; msgBox.innerText = "Aún no tienes predicciones ni resultados."; container.style.display = "none"; controls.style.display = "none";
            } else {
                globalHistorialData = data.history;
                
                let equiposEnHistorial = new Set();
                globalHistorialData.forEach(r => {
                    r.partidos.forEach(p => { equiposEnHistorial.add(p.equipo_local); });
                });
                
                let equiposArray = Array.from(equiposEnHistorial).sort();
                let checksHtml = "";
                equiposArray.forEach(eq => {
                    checksHtml += `<label class="filter-checkbox"><input type="checkbox" class="chk-equipo" value="${eq}" checked> ${eq}</label>`;
                });
                document.getElementById('filterEquiposContainer').innerHTML = checksHtml;

                document.querySelectorAll('.chk-equipo').forEach(chk => {
                    chk.addEventListener('change', renderizarHistorial);
                });

                controls.style.display = "block"; 
                renderizarHistorial(); 
            }
        }
    })
    .finally(() => { 
        btnHist.innerText = " Cargar mi historial"; 
        btnHist.disabled = false; 
    });
});

function renderizarHistorial() {
    const container = document.getElementById('historyListContainer');
    let sortedHistory = JSON.parse(JSON.stringify(globalHistorialData));
    
    sortedHistory.sort((a, b) => {
        let numA = parseInt(a.ronda.replace(/\D/g, '')) || 0;
        let numB = parseInt(b.ronda.replace(/\D/g, '')) || 0;
        return isSortDesc ? numB - numA : numA - numB;
    });

    let checkedEquipos = Array.from(document.querySelectorAll('.chk-equipo:checked')).map(cb => cb.value);

    let histHtml = "";
    
    sortedHistory.forEach(ronda => {
        ronda.partidos.sort((a, b) => {
            let tA = a.timestamp || 0;
            let tB = b.timestamp || 0;
            return isSortDesc ? tB - tA : tA - tB;
        });

        let esActual = (ronda.ronda == currentJornadaGlobal);
        let blockHtml = `<div style="background:var(--vcv-blanco); border-radius:10px; padding:20px; margin-bottom:20px; box-shadow:0 4px 8px rgba(0,0,0,0.05); border:1px solid #e0e0e0; border-left: 5px solid var(--vcv-dorado);">`;
        blockHtml += `<h4 style="color:var(--vcv-morado); border-bottom:2px solid var(--bg-general); padding-bottom:10px; margin-top:0; font-weight:bold;">Ronda ${ronda.ronda}</h4>`;
        
        let hayDatosEnEsteBloque = false;
        
        ronda.partidos.forEach(p => {
            if (!checkedEquipos.includes(p.equipo_local)) return; 
            
            hayDatosEnEsteBloque = true;
            let eqName = p.equipo_local;
            let rivalName = p.rival;
            
            let ofText = `<i style="color:#999;">Pendiente de disputarse</i>`;
            if (p.oficial_sets && p.oficial_sets.includes("-")) {
                let sL = parseInt(p.oficial_sets.split("-")[0]);
                let sV = parseInt(p.oficial_sets.split("-")[1]);
                let textoRes = sL > sV ? `<span style="color:#28a745; font-weight:bold; margin-left:5px;">🟢 Ganado</span>` : `<span style="color:var(--vcv-rojo); font-weight:bold; margin-left:5px;">🔴 Perdido</span>`;
                ofText = `<b style="color:var(--vcv-negro); font-size:1.05rem;">${p.oficial_sets}</b> ${textoRes} <br><span style="font-size:0.85rem;">(${p.oficial_parciales})</span>`;
            }
            
            let valJornada = String(p.jornada_eq || "").trim();
            let infoJornadaEq = "";
            if(valJornada) {
                infoJornadaEq = isNaN(valJornada) ? ` <span style="font-size:0.85rem; color:#666; font-weight:normal;">(${valJornada})</span>` : ` <span style="font-size:0.85rem; color:#666; font-weight:normal;">(Jornada ${valJornada})</span>`;
            }

            let streamIconHist = p.streaming ? ` <a href="${p.streaming}" target="_blank" style="margin-left:8px; display:inline-block; vertical-align:middle;" title="Ver Streaming Oficial"><img loading="lazy" src="files/images/play_icon.png" style="width:16px; height:16px; display:block;"></a>` : "";
            let infoLocFecha = streamIconHist ? `<span style="margin-left:10px;">${streamIconHist}</span>` : "";
            let htmlReloj = "";
            let iconoLoc = p.ubicacion === "CASA" ? "🏠" : (p.ubicacion === "FUERA" ? "✈️" : "");
            
            if (esActual) {
                if(iconoLoc || p.timestamp) {
                    infoLocFecha = `<span style="font-weight:normal; font-size:0.85rem; color:#666; margin-left:10px;">${iconoLoc} ${formatFecha(p.timestamp)}${streamIconHist}</span>`;
                }
                if(p.timestamp && p.estado === "ABIERTO") {
                    htmlReloj = `<div class="reloj-partido" data-ts="${p.timestamp}" style="margin-top:8px; font-size:0.85rem; font-weight:bold; padding:4px 8px; background:#fff3cd; color:#856404; border-radius:4px; display:inline-block;">Calculando tiempo...</div>`;
                }
            }
            
            let puntosInfo = "";
            if (p.oficial_sets && p.oficial_parciales) {
                let pts = p.puntos_partido !== undefined ? p.puntos_partido : "?";
                let mot = p.motivos || "Cálculo pendiente";
                let bgColor = pts > 0 ? "#e8f5e9" : "#fde8e8";
                let textColor = pts > 0 ? "#2e7d32" : "var(--vcv-rojo)";
                if (mot === "No pronosticado") { bgColor = "#eeeeee"; textColor = "#666666"; }
                
                puntosInfo = `
                <div style="margin-top:10px; background:${bgColor}; border-radius:6px; padding:10px; text-align:center;">
                    <div style="color:${textColor}; font-weight:bold; font-size:1.1rem;">+${pts} Puntos</div>
                    <div style="color:#666; font-size:0.85rem; margin-top:2px;">${mot}</div>
                </div>`;
            } else {
                puntosInfo = `
                <div style="margin-top:10px; background:#fff8e1; border-radius:6px; padding:10px; text-align:center;">
                    <div style="color:#f57f17; font-weight:bold; font-size:0.9rem;">⏳ Partido sin puntuar aún</div>
                </div>`;
            }

            let txtPorraSets = p.sets ? p.sets : `<i style="color:#999;">Sin predicción</i>`;
            let txtPorraPtos = p.sets ? `<span style="font-size:0.9rem; color:#555;">| ${p.puntos} pts (${p.signo})</span>` : "";
            
            let infoPabellon = p.pabellon ? `<div style="font-size:0.85rem; color:#777; margin-top:2px;">📍 ${p.pabellon}</div>` : "";
            
            // INSIGNIA DE CATEGORÍA PARA EL HISTORIAL
            let categoryHtml = getCategoryHTML(p.categoria);

            blockHtml += `
            <div class="card-match" style="margin-bottom:20px; font-size:0.95rem; border-bottom:1px dashed #ccc; padding-bottom:15px; padding-top: 10px;">
                ${categoryHtml}
                <div style="font-weight:bold; color:#444; margin-bottom:6px; padding-right: 90px;">
                    🏐 ${eqName} vs ${rivalName}${infoJornadaEq}${infoLocFecha}
                    ${infoPabellon}
                </div>
                ${htmlReloj}
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; background:var(--bg-general); padding:12px; border-radius:6px; border-left: 4px solid var(--vcv-morado); margin-top:10px;">
                    <div style="margin-right:15px; margin-bottom:8px;">
                        <span style="color:#777; font-size:0.85rem; display:block; text-transform:uppercase; letter-spacing:0.5px;">Tu Predicción</span>
                        <span style="font-weight:bold; color:var(--vcv-morado); font-size:1.05rem;">${txtPorraSets}</span> ${txtPorraPtos}
                    </div>
                    <div>
                        <span style="color:#777; font-size:0.85rem; display:block; text-transform:uppercase; letter-spacing:0.5px;">Resultado Oficial</span>
                        ${ofText}
                    </div>
                </div>
                ${puntosInfo}
            </div>`;
        });
        
        blockHtml += `</div>`;
        
        if(hayDatosEnEsteBloque) { histHtml += blockHtml; }
    });
    
    if (histHtml === "") {
        histHtml = `<div class="alert-box alert-warning" style="display:block;">Ningún partido coincide con los filtros seleccionados.</div>`;
    }

    container.innerHTML = histHtml;
    container.style.display = "block";
    iniciarRelojes(); 
}
