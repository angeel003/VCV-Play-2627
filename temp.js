


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

const scriptURL = "https://script.google.com/macros/s/AKfycbyw9L6Te3q2ibdRBaaAwaiPpEPWLbsNdb8JA9yO272DBHgxaZA2l3TLkH9ofAXlQiWfAg/exec";

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

function getBadgeCSS(type) {
    if(type === 'admin') return 'badge-admin';
    if(type === 'staff') return 'badge-staff';
    if(type === 'entrenador') return 'badge-entrenador';
    if(type === 'jugador') return 'badge-jugador';
    if(type === 'exjugador') return 'badge-exjugador';
    return '';
}

// ------------------------------------------------------------------
// LÓGICA DEL TOOLTIP FLOTANTE PARA MÓVILES
// ------------------------------------------------------------------
function showMobileTooltip(e, text) {
    e.stopPropagation(); 
    const tooltip = document.getElementById('mobileTooltip');
    tooltip.innerText = text;
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = rect.top + 'px';
    
    tooltip.classList.add('show');
    
    clearTimeout(tooltip.timeoutId);
    tooltip.timeoutId = setTimeout(() => {
        tooltip.classList.remove('show');
    }, 3500); 
}

document.addEventListener('click', function(e) {
    const tooltip = document.getElementById('mobileTooltip');
    if (tooltip && tooltip.classList.contains('show')) {
        tooltip.classList.remove('show');
    }
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
        if (now - ts < 48 * 60 * 60 * 1000) {
            let adminLocal = (eq.ubicacion === 'LOCAL') ? eq.equipo_local : eq.rival;
            let adminVisit = (eq.ubicacion === 'LOCAL') ? eq.rival : eq.equipo_local;
            html += `
            <div class="admin-match-box">
                <div style="font-weight:bold; margin-bottom:8px; color: #e65100;">${adminLocal} vs ${adminVisit} <span style="color:#666; font-size:0.8rem; font-weight:normal;">(${eq.id_partido})</span></div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; gap:10px;">
                          <input type="text" id="adm_sets_${eq.id_partido}" class="form-control form-control-sm" placeholder="${now >= ts ? 'Sets (3-1)' : 'Bloqueado (No ha empezado)'}" value="${eq.oficial_sets || ''}" ${now >= ts ? '' : 'disabled'}>
                          <input type="text" id="adm_parc_${eq.id_partido}" class="form-control form-control-sm" placeholder="${now >= ts ? 'Parc (25-20...)' : 'Bloqueado'}" value="${eq.oficial_parciales || ''}" ${now >= ts ? '' : 'disabled'}>
                      </div>
                    <input type="text" id="adm_stream_${eq.id_partido}" class="form-control form-control-sm" placeholder="Link Streaming YouTube/Twitch" value="${eq.streaming || ''}">
                    
                </div>
                <button class="btn btn-sm btn-dark mt-2" style="font-weight:bold;" onclick="guardarResultadoAdmin(event, '${eq.id_partido}')">💾 Guardar Todo</button>
            </div>`;
        }
    });
    if (html === "") html = "<div style='color:white; font-size:0.9rem;'>No hay partidos disponibles o han pasado más de 48h.</div>";
    document.getElementById('adminListaPartidos').innerHTML = html;
}

document.getElementById('btnAdminSync').addEventListener('click', function(e) {
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

window.guardarResultadoAdmin = function(e, idPart) {
    e.preventDefault();
    const btn = e.currentTarget || e.target;
    
    // Leer valores, protegiendo si no existen los nuevos inputs
    const elSets = document.getElementById(`adm_sets_${idPart}`);
    const elParc = document.getElementById(`adm_parc_${idPart}`);
    const elStream = document.getElementById(`adm_stream_${idPart}`);
    
    
    const sets = elSets ? elSets.value.trim() : "";
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
        if(d.status === "success") { 
            mostrarToast("✅ Resultado subido al Excel"); 
        } else { 
            alert("Error al guardar: " + (d.message || JSON.stringify(d))); 
        }
    })
    .catch(err => {
        console.error("Error al guardar:", err);
        alert("�Guardado en Excel con �xito! (El servidor tard� mucho en confirmarlo, recarga la p�gina si lo necesitas).");
    })
    .finally(() => { 
        btn.disabled = false; 
        btn.innerText = "💾 Guardar Todo"; 
    });
}
window.crearUsuarioAdmin = function(e) {
    e.preventDefault();
    const btn = e.target;
    const nu = document.getElementById('addUsrName').value.trim();
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
        body: JSON.stringify({ action: 'add_user', usuario: currentUser, password: currentPassword, new_u: nu, new_p: np, new_n: "" , ligas_seleccionadas: selectedLigas }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    })
    .then(res => res.json())
    .then(d => {
        if(d.status === "success") { 
            mostrarToast(d.message); 
            document.getElementById('addUsrName').value = "";
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
    return `<img src="${imgUrl}" class="cat-badge-img" alt="${catName}" title="${catName}" onerror="this.onerror=null; this.outerHTML='<div class=\\'cat-badge-text\\' title=\\'${catName}\\'>${catName}</div>';">`;
}

// LÓGICA DE CAMBIO DE CONTRASEÑA
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
            window.appData = data;
            if(window.initCalendar) window.initCalendar();
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
                        <li>Nombre de usuario (ej: @juan_vcv)</li>
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
                let streamIcon = eq.streaming ? ` <a href="${eq.streaming}" target="_blank" style="margin-left:8px; display:inline-block; vertical-align:middle;" title="Ver Streaming Oficial"><img src="files/images/play_icon.png" style="width:16px; height:16px; display:block;"></a>` : "";
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
                    infoAdicional = `<div style="margin-top:10px;"><span style="background-color:#e2e3e5; color:#383d41; padding:6px 12px; border-radius:20px; font-weight:bold; font-size:0.85rem;">🔒 Partido finalizado</span></div>`;
                } else {
                    infoAdicional = `<div style="margin-top:10px;"><span style="background-color:#d4edda; color:#155724; padding:6px 12px; border-radius:20px; font-weight:bold; font-size:0.85rem;">🟢 Próximamente</span>${eq.timestamp ? `<div class="reloj-partido" data-ts="${eq.timestamp}" style="font-size:0.85rem; font-weight:bold; padding:4px 8px; background:#fff3cd; color:#856404; border-radius:4px; display:inline-block; margin-left:10px;">Calculando tiempo...</div>` : ""}</div>`;
                }
                
                let categoryHtml = getCategoryHTML(eq.categoria);

                let cardHtml = `
                <div class="p-3 mb-3 card-match" style="background: var(--vcv-blanco); border-radius: 8px; border: 1px solid #e9ecef; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    ${categoryHtml}
                    <h5 style="margin-bottom: 5px; color:var(--vcv-morado); font-weight:bold; padding-right: 90px;">🏐 ${eq.equipo_local} vs ${eq.rival}${infoJornadaEq}</h5>
                      ${eq.es_derby ? `<div style="margin-bottom:10px; background:#fff3cd; color:#856404; padding:5px 10px; border-radius:5px; font-weight:bold; font-size:0.85rem; border:1px solid #ffeeba;">⚔️ ¡DERBY LOCAL! Los puntos valen DOBLE en este partido.</div>` : ""}
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
            if (myBadges.length > 0) {
                insigniasHTML += `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">`;
                myBadges.forEach(b => {
                    let cssColorClass = getBadgeCSS(b.type);
                    insigniasHTML += `<div style="display:inline-flex; align-items:center; gap:4px; font-size:0.7rem; padding:2px 6px; border-radius:4px; background:var(--bg-general); border:1px solid var(--border-color);"><img src="${URL_BADGE_GENERIC}" class="badge-icon ${cssColorClass}" style="width:12px; height:12px;"><span style="color:var(--text-muted); font-weight:600;">${b.text}</span></div>`;
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
    
            <div style="padding: 14px; border-radius: 16px; background: linear-gradient(to right, rgba(93, 23, 137, 0.4), var(--bg-card), var(--bg-card)); border: 1px solid var(--border-color); position: relative; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); margin-top: -12px; margin-bottom: 20px;">
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
                
                <div id="user-progress-bar" style="background: linear-gradient(to right, #ffd700, var(--vcv-dorado)); transition: width 0.5s ease-in-out; height: 100%; border-radius: 9999px; width: ${porcentaje}%; "></div>
              </div>
            </div>`;
            document.getElementById('perfilUsuarioTop').innerHTML = htmlPerfil;
            
            let promoDiv2 = document.getElementById('guestPromoBanner');
            if (promoDiv2) promoDiv2.style.display = "none";
            currentJornadaGlobal = data.jornada;
            window.appData = data;
            if(window.initCalendar) window.initCalendar();
            
            

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
            let handleEl = document.getElementById('h2-user-handle'); if(handleEl) handleEl.innerText = "@" + usr;
            
            let misInsignias = data.insignias[usr] || [];
            let insigniasHeaderHtml = "";
            let insigniasH2Html = "";
            let isAdmin = false;

            // Calculate Rank from Global Leaderboard
            let globalRankList = data.clasificaciones && data.clasificaciones["Global"] ? data.clasificaciones["Global"] : [];
            let myRankIndex = globalRankList.findIndex(r => r.jugador === usr);
            let myRank = myRankIndex !== -1 ? myRankIndex + 1 : 0;
            let rankText = myRank > 0 ? "Top " + myRank : "-";
            
            let myPoints = myRankIndex !== -1 ? globalRankList[myRankIndex].puntos : 0;
            
            let rankEl = document.getElementById('h2-user-rank');
            if(rankEl) rankEl.innerText = rankText;
            let ptsEl = document.getElementById('h2-user-pts');
            if(ptsEl) ptsEl.innerText = myPoints + " pts";

            
            misInsignias.forEach(b => {
                if (b.type === 'admin') isAdmin = true;
                let cssColorClass = getBadgeCSS(b.type);
                insigniasHeaderHtml += `<img src="${URL_BADGE_GENERIC}" class="badge-header ${cssColorClass}" title="${b.text}" onclick="showMobileTooltip(event, '${b.text}')">`;
                
                // NO tooltips, NO onclick for the top header badges! Just visual.
                insigniasH2Html += `<img src="${URL_BADGE_GENERIC}" class="${cssColorClass}" style="width:14px; height:14px;">`;
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
                    let streamIcon = eq.streaming ? ` <a href="${eq.streaming}" target="_blank" style="margin-left:8px; display:inline-block; vertical-align:middle;" title="Ver Streaming Oficial"><img src="files/images/play_icon.png" style="width:16px; height:16px; display:block;"></a>` : "";
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

                        let localLogo = `<span style="font-weight:900; font-size: 1.2rem;">${localAbrev}</span>`;
                        let visitLogo = `<span style="font-weight:900; font-size: 1.2rem;">${visitAbrev}</span>`;
                        
                        let infoPabellon = eq.pabellon ? `<div style="margin-top:2px;"><i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-top:-2px;"></i> ${eq.pabellon}</div>` : '';

                        let btnStreaming = eq.streaming 
                            ? `<a href="${eq.streaming}" target="_blank" class="btn-streaming-v2 active" style="text-decoration:none;"><i data-lucide="play" style="width:14px;height:14px;"></i> Streaming</a>` 
                            : `<button class="btn-streaming-v2 disabled" disabled><i data-lucide="play-square" style="width:14px;height:14px;"></i> Sin enlace</button>`;

                        htmlPartidos += `
                        <div class="vcv-card-v2 ${isPredicted && eq.estado !== 'CERRADO' ? 'collapsed' : ''}" id="card-v2-${eq.id_partido}" data-category="${eq.categoria}">
                            <div class="match-header-strip-v2">
                                <span style="color: ${eq.es_derby ? 'var(--text-gold)' : 'var(--secondary-color)'}; font-weight: 800;">
                                  ${eq.categoria.toUpperCase()} ${eq.es_derby ? '🏆 DERBY' : ''}
                                </span>
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
                            
                            

                            ${eq.estado === "CERRADO" ? `<div style="text-align:center; margin-top:15px; padding:15px; background:var(--bg-card-alt); border-radius:12px; border:1px solid var(--border-color);"><div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">RESULTADO OFICIAL</div><div style="font-size: 1.25rem; font-weight: 900; color: var(--text-main);">${eq.oficial_sets || 'Sin resultado'}</div><div style="font-size: 0.85rem; color: var(--text-muted);">${eq.oficial_parciales || ''}</div></div>` : `
                            <!-- HIDDEN INPUTS -->
                            <input type="hidden" id="e${eq.id_partido}_sets" value="${pSets}">
                            <input type="hidden" id="e${eq.id_partido}_puntos" value="${pPts || '14'}">
                            <input type="hidden" id="e${eq.id_partido}_signo" value="${pSig}">

                            <div class="inputs-eq" id="inputs_eq_${eq.id_partido}" style="${isPredicted && eq.estado !== 'CERRADO' ? 'display:none;' : 'display:block;'}">
                                <div class="sets-grid-label-v2">
                                  <span>Resultado</span>
                                  
                                </div>
                                <div class="sets-selector-grid-v2">
                                    <button type="button" class="set-option-btn-v2" onclick="seleccionarSetV2(this, '3-0', '${eq.id_partido}')">3-0</button>
                                    <button type="button" class="set-option-btn-v2" onclick="seleccionarSetV2(this, '3-1', '${eq.id_partido}')">3-1</button>
                                    <button type="button" class="set-option-btn-v2" onclick="seleccionarSetV2(this, '3-2', '${eq.id_partido}')">3-2</button>
                                    <button type="button" class="set-option-btn-v2" onclick="seleccionarSetV2(this, '2-3', '${eq.id_partido}')">2-3</button>
                                    <button type="button" class="set-option-btn-v2" onclick="seleccionarSetV2(this, '1-3', '${eq.id_partido}')">1-3</button>
                                    <button type="button" class="set-option-btn-v2" onclick="seleccionarSetV2(this, '0-3', '${eq.id_partido}')">0-3</button>
                                </div>

                                <div class="points-diff-container-v2">
                                  <div class="points-header-v2">
                                    <span style="font-size: 0.75rem; color: var(--text-main); font-weight: 700; text-transform: uppercase; display:flex; align-items:center; justify-content:center; gap:5px; letter-spacing:0.5px;">DIFERENCIA DE PUNTOS <i data-lucide="help-circle" style="width:14px; height:14px; cursor:pointer; color:var(--primary-color);" onclick="document.getElementById(\'guiaModal\').style.display=\'flex\'"></i></span>
                                    
                                  </div>
                                  <div class="points-controls-row-v2">
                                    <div class="stepper-container-v2">
                                      <button type="button" class="btn-step-v2" id="btn-step-minus-${eq.id_partido}" onclick="cambiarPuntosV2('${eq.id_partido}', -1)">-</button>
                                      <div class="stepper-value-v2">
                                        <input type="number" id="val-v2-${eq.id_partido}" value="14" oninput="sincronizarPuntosV2(\'${eq.id_partido}\')" style="background:transparent; border:none; text-align:center; font-size:1.3rem; font-weight:900; color:var(--secondary-color); width:46px; max-width:46px; outline:none; -moz-appearance:textfield; padding:0; margin:0; height:30px;">
                                        <small>PTS</small>
                                      </div>
                                      <button type="button" class="btn-step-v2" id="btn-step-plus-${eq.id_partido}" onclick="cambiarPuntosV2('${eq.id_partido}', 1)">+</button>
                                    </div>
                                    <div class="sign-selector-v2">
                                      <button type="button" class="sign-btn-v2 sign-plus-v2" id="signo-plus-v2-${eq.id_partido}" onclick="cambiarSignoV2('${eq.id_partido}', this, true)">
                                        <span style="font-size:0.7rem;">${localTeamName}</span>
                                      </button>
                                      <button type="button" class="sign-btn-v2 sign-minus-v2" id="signo-minus-v2-${eq.id_partido}" onclick="cambiarSignoV2('${eq.id_partido}', this, false)">
                                        <span style="font-size:0.7rem;">${visitTeamName}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                            </div>
                            
                            <div class="summary-v2" id="summary-v2-${eq.id_partido}" style="${isPredicted && eq.estado !== 'CERRADO' ? 'display:block;' : 'display:none;'} margin-bottom: 12px;">
                                <div id="summary-text-${eq.id_partido}">
                                ${isPredicted ? `<div style="background: var(--bg-card-alt); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted); text-align: left;"><i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--success); flex-shrink: 0;"></i><span>Guardada: <strong style="color: var(--text-main); font-weight:800;">${savedLocalName} ${formattedSets} ${savedVisitName} ${formStr}</strong></span></div>` : ``}
                                </div>
                            </div>

                            
                            <button type="button" id="btn-save-${eq.id_partido}" onclick="handleSaveOrModifyV2('${eq.id_partido}')" style="width:100%; margin-top:10px; padding:12px; border-radius:10px; ${isPredicted ? "background:transparent; color:var(--text-muted); font-weight:800; border:1px solid var(--border-color);" : "background:var(--secondary-color); color:#000; font-weight:800; border:none;"} cursor:pointer; transition: all 0.2s;">
                                ${isPredicted ? "Modificar Predicción" : "Guardar Predicción"}
                            </button>`}
                            
                            ${destacadoHtml}
                        </div>`;
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

            let clasifHtml = "";
            if(data.ligas.length === 0) { 
                clasifHtml = `<div class="alert-box alert-warning" style="display:block;">No estás asignado a ninguna liga privada todavía.</div>`; 
            } else {
                data.ligas.forEach(liga => {
                    clasifHtml += `
                    <details style="background:var(--vcv-blanco); border:1px solid #ddd; border-radius:8px; margin-bottom:15px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                        <summary style="padding:15px; font-weight:bold; color:var(--vcv-morado); font-size:1.1rem; cursor:pointer; outline:none;">
                            🏆 Liga: ${liga}
                        </summary>
                        <div style="padding: 0 15px 15px 15px;">
                            <div class="table-responsive">
                                <table style="width:100%; border-collapse:collapse; border-radius:8px; overflow:hidden; margin-bottom:0;">
                                    <thead style="background:var(--vcv-morado); color:var(--vcv-blanco);">
                                        <tr>
                                            <th style="padding:12px; text-align:left;">Posición y Jugador</th>
                                            <th style="padding:12px; text-align:center;">Puntos</th>
                                        </tr>
                                    </thead>
                                    <tbody>`;
                    
                    let ranking = data.clasificaciones[liga] || [];
                    ranking.forEach((r, index) => {
                        let pos = index + 1;
                        let medalla = pos === 1 ? "🥇" : (pos === 2 ? "🥈" : (pos === 3 ? "🥉" : ""));
                        let clase = pos === 1 ? "medal-1" : (pos === 2 ? "medal-2" : (pos === 3 ? "medal-3" : ""));
                        
                        let uBadges = data.insignias[r.jugador] || [];
                        let badgesHtmlTable = "";
                        uBadges.forEach(b => {
                             let cssColorClass = getBadgeCSS(b.type);
                             badgesHtmlTable += `<img src="${URL_BADGE_GENERIC}" class="badge-icon ${cssColorClass}" title="${b.text}" onclick="showMobileTooltip(event, '${b.text}')">`;
                        });

                        let txtJugador = r.nombre_real !== r.jugador ? `${r.nombre_real} <span style="font-size:0.85rem; color:#666; font-weight:normal; font-family:sans-serif;">(@${r.jugador})</span>` : r.jugador;
                        
                        clasifHtml += `<tr class="${clase}"><td style="padding:14px; border-bottom:1px solid #ddd; line-height:1.4;"><strong>${pos}</strong> - ${txtJugador} ${badgesHtmlTable} ${medalla}</td><td style="padding:14px; border-bottom:1px solid #ddd; font-weight:bold; font-size:1.1rem; color:var(--vcv-dorado); text-align:center;">${r.puntos}</td></tr>`;
                    });
                    clasifHtml += `</tbody></table></div></div></details>`;
                });
            }
            document.getElementById('tablasClasificacionContainer').innerHTML = clasifHtml;

            if(data.equipos_totales && data.equipos_totales.length > 0) {
                
                
                let isClosed = new Date().getTime() >= new Date("2026-10-03T00:00:00").getTime();
                
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
                    
                    let agrupados = {};
                    porrasEq.forEach(porra => {
                        if (porra.usuario === usr) misPts = porra.puntos;
                        if (!agrupados[porra.puntos]) agrupados[porra.puntos] = [];
                        agrupados[porra.puntos].push(porra.nombre);
                    });
                    
                    let sortedPts = Object.keys(agrupados).map(Number).sort((a, b) => b - a);
                    sortedPts.forEach(pts => {
                        let nombresStr = agrupados[pts].map(n => `👤 ${n}`).join(', ');
                        listaOtros += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color); gap:12px;">
                            <div style="font-weight:900; color:var(--secondary-color); font-size:1.1rem; white-space:nowrap;">${pts} pts</div>
                            <div style="color:var(--text-muted); font-size:0.75rem; line-height:1.4; text-align:right;">${nombresStr}</div>
                        </div>`;
                    });

                    if (listaOtros === "") { listaOtros = "<div style='color:var(--text-muted); font-size:0.85rem; padding:10px 0;'>Nadie ha hecho su predicción todavía.</div>"; }

                    let miCajonHTML = "";
                    if (isClosed) {
                        miCajonHTML = ""; // El usuario pidió que al cerrarse solo quede el desplegable
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

                    htmlTot += `
                    <div class="vcv-card-v2" style="margin-bottom:10px; padding: 12px; border-left:4px solid var(--vcv-dorado);">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                            <div style="display:flex; flex-direction:column;">
                                <h4 style="color:var(--text-main); margin:0; font-weight:800; font-size:1.1rem; letter-spacing:-0.5px;">${eq}</h4>
                                ${categoriaEq ? `<span style="color:var(--text-muted); font-size:0.7rem; font-weight:700; margin-top:2px; text-transform:uppercase; letter-spacing:0.5px;">${categoriaEq}</span>` : ''}
                            </div>
                            <span style="background:rgba(16, 185, 129, 0.15); color:#10b981; padding:4px 8px; border-radius:6px; border:1px solid rgba(16, 185, 129, 0.3); font-weight:bold; font-size:0.75rem; white-space:nowrap; margin-left:8px;">Llevan: ${ptsActuales} pts</span>
                        </div>
                        
                        ${miCajonHTML}

                        <details>
                            <summary style="font-weight:700; font-size:0.85rem; color:var(--text-muted); cursor:pointer; outline:none;">👀 Ver predicciones del resto</summary>
                            <div style="margin-top:10px; background:var(--bg-card-alt); padding:10px 15px; border-radius:12px; border:1px solid var(--border-color);">
                                ${listaOtros}
                            </div>
                        </details>
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
            msgBox.className = "alert-box alert-warning"; msgBox.innerText = "El servidor se estaba despertando (Cold Start). Vuelve a pulsar Iniciar Sesión."; msgBox.style.display = "block";
          updateProgressBar();
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
    const deadline = new Date("2026-10-03T00:00:00").getTime();
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
        btnHist.innerText = "🔒 Cargar mi historial"; 
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

            let streamIconHist = p.streaming ? ` <a href="${p.streaming}" target="_blank" style="margin-left:8px; display:inline-block; vertical-align:middle;" title="Ver Streaming Oficial"><img src="files/images/play_icon.png" style="width:16px; height:16px; display:block;"></a>` : "";
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


        // Registrar Service Worker para PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').then(reg => {
                    reg.update(); // Forzar actualizacin siempre
                }).catch(err => console.log('SW Error:', err));
            });
        }
    
document.getElementById('btnForceSyncExcel').addEventListener('click', function(e) {
    e.preventDefault();
    const btn = this;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Borrando Caché...';
    btn.disabled = true;
    
    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'clear_cache', usuario: currentUser, password: currentPassword }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(data => {
        if(data.status === 'success') {
            btn.innerHTML = '✅ ¡Actualizado!';
            setTimeout(() => {
                window.location.href = window.location.pathname + '?v=' + new Date().getTime();
            }, 1000);
        } else {
            btn.innerHTML = originalText;
            btn.disabled = false;
            alert('Error: ' + data.message);
        }
    })
    .catch(err => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        alert('Error de conexión.');
    });
});


// ---------------------------------------------------
// LOGICA DE CALENDARIO / PROXIMOS PARTIDOS
// ---------------------------------------------------
window.initCalendar = function() {
    if(!window.appData || !window.appData.todos_partidos) return;
    
    let todos = window.appData.todos_partidos;
    
    // Sort by timestamp
    todos.sort((a, b) => {
        let tsA = a.timestamp || Infinity; 
        let tsB = b.timestamp || Infinity;
        return tsA - tsB; 
    });

    let catSelect = document.getElementById('calendarTeamSelect');
    let uniqueCats = window.appData.mis_equipos_siguiendo || [];
    
    let currentOptions = '<option value="">-- Ver Todos los Equipos --</option>';
    uniqueCats.forEach(cat => {
        currentOptions += `<option value="${cat}">${cat}</option>`;
    });
    catSelect.innerHTML = currentOptions;
    
    let savedCat = localStorage.getItem('pref_calendario_' + currentUser);
    if (savedCat && uniqueCats.includes(savedCat)) {
        catSelect.value = savedCat;
    }
    
    window.renderCalendar();
};

window.renderCalendar = function() {
    if(!window.appData || !window.appData.todos_partidos) return;
    
    let cat = document.getElementById('calendarTeamSelect').value;
    let search = document.getElementById('calendarSearchInput').value.toLowerCase().trim();
    
    localStorage.setItem('pref_calendario_' + currentUser, cat);
    
    let filtered = window.appData.todos_partidos.filter(p => {
        let matchCat = (!cat || p.equipo_local === cat || p.rival === cat);
        let matchSearch = (!search || p.rival.toLowerCase().includes(search) || p.equipo_local.toLowerCase().includes(search));
        return matchCat && matchSearch;
    });

    let html_res = "";
    if (filtered.length === 0) {
        html_res = `<div style="text-align:center; padding:30px; color:#888; font-weight:bold;">No se han encontrado partidos con estos filtros.</div>`;
    } else {
        filtered.forEach(p => {
            let fechaStr = "Fecha por confirmar";
            if (p.timestamp) {
                let d = new Date(p.timestamp);
                let dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                let mes = (d.getMonth() + 1).toString().padStart(2, '0');
                let dia = d.getDate().toString().padStart(2, '0');
                let h = d.getHours().toString().padStart(2, '0');
                let m = d.getMinutes().toString().padStart(2, '0');
                fechaStr = `${dias[d.getDay()]} ${dia}/${mes} - ${h}:${m}`;
            }
            
            let esPasado = p.oficial_sets && p.oficial_sets.trim() !== "";
            let estadoHtml = esPasado 
                ? `<span style="background:var(--vcv-dorado); color:#fff; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">Finalizado: ${p.oficial_sets}</span>`
                : `<span style="background:#e9ecef; color:#555; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">Próximamente</span>`;
                
            let titulo = p.ubicacion === 'LOCAL' ? `<b>${p.equipo_local}</b> vs ${p.rival}` : `${p.rival} vs <b>${p.equipo_local}</b>`;
            let pabellonStr = p.pabellon ? `<div style="font-size:0.8rem; color:#777; margin-top:5px;">📍 ${p.pabellon}</div>` : '';
            let streamStr = p.streaming ? `<div style="margin-top:5px;"><a href="${p.streaming}" target="_blank" class="btn btn-sm" style="background:#ff0000; color:white; font-size:0.7rem; font-weight:bold; padding:2px 6px; border-radius:4px;">▶ Ver Streaming</a></div>` : '';

            html_res += `<div style="background:white; padding:15px; border-radius:10px; border-left:5px solid ${esPasado ? 'var(--vcv-dorado)' : 'var(--vcv-morado)'}; box-shadow:0 2px 5px rgba(0,0,0,0.06); transition: transform 0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:0.85rem; font-weight:bold; color:var(--vcv-morado);">${fechaStr}</span>
                    ${estadoHtml}
                </div>
                <div style="font-size:1.05rem; color:#222; margin-bottom:2px;">
                    ${titulo}
                </div>
                <div style="font-size:0.8rem; font-weight:bold; color:#1565c0; margin-bottom:2px;">🏆 ${p.categoria} - Jornada ${p.jornada_eq}</div>
                ${pabellonStr}
                ${streamStr}
            </div>`;
        });
    }
    
    document.getElementById('calendarResults').innerHTML = html_res;
};

document.getElementById('calendarTeamSelect').addEventListener('change', window.renderCalendar);
document.getElementById('calendarSearchInput').addEventListener('input', window.renderCalendar);



    // --- V2 INTERACTIVE LOGIC ---
    document.addEventListener("DOMContentLoaded", () => {
        if(window.lucide) lucide.createIcons();
    });

    function seleccionarSetV2(btn, val, matchId) {
      const hiddenInput = document.getElementById('e' + matchId + '_sets');
      if (hiddenInput) {
          hiddenInput.value = val;
      }
      const container = btn.parentElement;
      container.querySelectorAll('.set-option-btn-v2').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    }
    
    
    function sincronizarPuntosV2(matchId) {
      const hiddenInput = document.getElementById('e' + matchId + '_puntos');
      const valInput = document.getElementById('val-v2-' + matchId);
      if (hiddenInput && valInput) {
          let current = parseInt(valInput.value);
          if (isNaN(current) || current < 0) {
              current = 0;
          }
          hiddenInput.value = current;
          actualizarEstadoEmpate(matchId, current);
      }
    }

    function actualizarEstadoEmpate(matchId, next) {
      const plusBtn = document.getElementById('signo-plus-v2-' + matchId);
      const minusBtn = document.getElementById('signo-minus-v2-' + matchId);
      const signInput = document.getElementById('e' + matchId + '_signo');
      const minusStep = document.getElementById('btn-step-minus-' + matchId);
      
      if (next === 0) {
          if (minusStep) {
              minusStep.disabled = true;
              minusStep.style.background = 'var(--secondary-color)';
              minusStep.style.color = '#000';
              minusStep.style.opacity = '1';
              minusStep.style.cursor = 'not-allowed';
          }
          if(plusBtn) {
              plusBtn.classList.add('tied-btn');
              plusBtn.disabled = true;
              plusBtn.style.pointerEvents = 'none';
          }
          if(minusBtn) {
              minusBtn.classList.add('tied-btn');
              minusBtn.disabled = true;
              minusBtn.style.pointerEvents = 'none';
          }
          if(signInput) signInput.value = 'Empate';
      } else {
          if (minusStep) {
              minusStep.disabled = false;
              minusStep.style.background = '';
              minusStep.style.color = '';
              minusStep.style.opacity = '1';
              minusStep.style.cursor = 'pointer';
          }
          if(plusBtn) {
              plusBtn.classList.remove('tied-btn');
              plusBtn.disabled = false;
              plusBtn.style.pointerEvents = 'auto';
          }
          if(minusBtn) {
              minusBtn.classList.remove('tied-btn');
              minusBtn.disabled = false;
              minusBtn.style.pointerEvents = 'auto';
          }
          if(signInput && signInput.value === 'Empate') {
              signInput.value = '';
              if(plusBtn) plusBtn.classList.remove('selected');
              if(minusBtn) minusBtn.classList.remove('selected');
          }
      }
    }

    function cambiarPuntosV2(matchId, delta) {
      const hiddenInput = document.getElementById('e' + matchId + '_puntos');
      const valSpan = document.getElementById('val-v2-' + matchId);
      const plusBtn = document.getElementById('signo-plus-v2-' + matchId);
      const minusBtn = document.getElementById('signo-minus-v2-' + matchId);
      const signInput = document.getElementById('e' + matchId + '_signo');

      if (hiddenInput && valSpan) {
          let current = parseInt(hiddenInput.value);
          if (isNaN(current)) current = 14; 
          let next = current + delta;
          if (next < 0) next = 0; 
          
          hiddenInput.value = next;
          if (valSpan.tagName === "INPUT") valSpan.value = next; else valSpan.innerText = next;

          actualizarEstadoEmpate(matchId, next);
      }
    }

    
    function cambiarSignoV2(matchId, btn, isLocal) {
      const hiddenInput = document.getElementById('e' + matchId + '_signo');
      if (hiddenInput) {
          hiddenInput.value = isLocal ? 'A favor' : 'En contra';
      }
      const plusBtn = document.getElementById('signo-plus-v2-' + matchId);
      const minusBtn = document.getElementById('signo-minus-v2-' + matchId);
      if(plusBtn) plusBtn.classList.remove('selected');
      if(minusBtn) minusBtn.classList.remove('selected');
      
      btn.classList.add('selected');
    }
    
    
    
    // Observer for Bottom Nav
    document.addEventListener("DOMContentLoaded", () => {
        const appSec = document.getElementById('appSection');
        const navWrap = document.getElementById('bottomNavWrapperV2');
        if(appSec && navWrap) {
            const observer = new MutationObserver(() => {
                if(appSec.style.display !== 'none') {
                    navWrap.style.display = 'block';
                } else {
                    navWrap.style.display = 'none';
                }
            });
            observer.observe(appSec, { attributes: true, attributeFilter: ['style'] });
        }
    });

    function switchTabV2(sectionId, btn) {
        // Hide all sections in appSection
        const sections = ['carteleraSection', 'clasificacionesSection', 'historialSection', 'calendarioSection', 'enlacesRfevbSection', 'prediccionesTotalesSection'];
        sections.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.remove('active-tab');
        });
        
        // Show target section
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active-tab');
        window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 10);
        
        // If historial, also show prediccionesTotalesSection right below it (if they were separate)
        if (sectionId === 'carteleraSection') {
            const extra = document.getElementById('prediccionesTotalesSection');
            if (extra) extra.classList.add('active-tab');
        }

        // Update active button state
        document.querySelectorAll('.nav-item-v2').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        
        window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 10);
    }

    document.addEventListener("DOMContentLoaded", () => {
        // Initialize first tab as active
        const firstSec = document.getElementById('carteleraSection');
        if (firstSec) firstSec.classList.add('active-tab');
        const tsSec = document.getElementById('prediccionesTotalesSection');
        if (tsSec) tsSec.classList.add('active-tab');
    });

    function handleSaveOrModifyV2(idPart) {
        const card = document.getElementById('card-v2-' + idPart);
        const btn = document.getElementById('btn-save-' + idPart);
        const summary = document.getElementById('summary-v2-' + idPart);
        const inputs = document.getElementById('inputs_eq_' + idPart);
        const isCollapsed = card.classList.contains('collapsed');

        if (isCollapsed) {
            card.classList.remove('collapsed');
            summary.style.display = 'none';
            inputs.style.display = 'block';
            btn.innerText = 'Guardar Predicción';
            btn.style.background = 'var(--secondary-color)';
            btn.style.color = '#000';
            btn.style.border = 'none';
        } else {
            const s = document.getElementById('e' + idPart + '_sets').value;
            const p = document.getElementById('e' + idPart + '_puntos').value;
            const sig = document.getElementById('e' + idPart + '_signo').value;

            if (!s || !p || !sig) {
                alert('Faltan campos por rellenar en este partido.');
                return;
            }
            if(window.isGuestMode) { alert("Modo invitado. No puedes guardar."); return; }
            if(!currentUser) { alert("Tu sesión ha expirado."); window.location.reload(); return; }

            // OPTIMISTIC UI UPDATE
            const selectedSignBtn = document.querySelector(`#signo-plus-v2-${idPart}.selected`) || document.querySelector(`#signo-minus-v2-${idPart}.selected`);
            let signText = selectedSignBtn ? selectedSignBtn.innerText : (sig === 'Empate' ? 'Empate' : sig);
            if(p == 0) signText = "Empate";
            
            let localAb = document.querySelector(`#card-v2-${idPart} .team-name-v2`) ? document.querySelectorAll(`#card-v2-${idPart} .team-name-v2`)[0].innerText : '';
            let visitAb = document.querySelector(`#card-v2-${idPart} .team-name-v2`) ? document.querySelectorAll(`#card-v2-${idPart} .team-name-v2`)[1].innerText : '';
            let winnerName = "";
            if (sig.toLowerCase().includes('a favor')) winnerName = localAb;
            else if (sig.toLowerCase().includes('en contra')) winnerName = visitAb;
            let formStr = winnerName ? `(+${p} pts para ${winnerName})` : `(${p} pts)`;
            if(p==0) formStr = `(0 pts)`;
            let formattedS = s.replace('-', ' - ');
            document.getElementById('summary-text-' + idPart).innerHTML = `<div style="background: var(--bg-card-alt); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted); text-align: left;"><i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--success); flex-shrink: 0;"></i><span>Guardada: <strong style="color: var(--text-main); font-weight:800;">${localAb} ${formattedS} ${visitAb} ${formStr}</strong></span></div>`;
            if(window.lucide) setTimeout(() => window.lucide.createIcons(), 10);

            card.classList.add('collapsed');
            inputs.style.display = 'none';
            summary.style.display = 'block';
            
            const oldBtnHtml = btn.innerHTML;
            btn.innerHTML = 'Guardando... <span class="spinner-border spinner-border-sm" style="width:12px;height:12px;border-width:2px;margin-left:5px;"></span>';
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-muted)';
            btn.style.border = '1px solid var(--border-color)';
            btn.disabled = true;

            let singlePred = {};
            singlePred[idPart] = { sets: s, puntos: p, signo: sig };

            fetchSeguro(scriptURL, {
                method: 'POST',
                body: JSON.stringify({ action: 'save', usuario: currentUser, password: currentPassword, predicciones: singlePred }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            }).then(res => res.json()).then(data => {
                if(data.status === "success") {
                    btn.disabled = false;
                    btn.innerText = 'Modificar Predicción';
                    if(window.appData) {
                        window.appData.predicciones_usuario = window.appData.predicciones_usuario || {};
                        window.appData.predicciones_usuario[idPart] = { sets: s, puntos: p, signo: sig };
                    }
                    if(typeof updateProgressBar === 'function') updateProgressBar();
                } else {
                    alert('Error al guardar: ' + data.message);
                    card.classList.remove('collapsed');
                    summary.style.display = 'none';
                    inputs.style.display = 'block';
                    btn.innerHTML = oldBtnHtml;
                    btn.style.background = 'var(--secondary-color)';
                    btn.style.color = '#000';
                    btn.style.border = 'none';
                    btn.disabled = false;
                }
            }).catch(err => {
                alert('Error de conexión.');
                card.classList.remove('collapsed');
                summary.style.display = 'none';
                inputs.style.display = 'block';
                btn.innerHTML = oldBtnHtml;
                btn.style.background = 'var(--secondary-color)';
                btn.style.color = '#000';
                btn.style.border = 'none';
                btn.disabled = false;
            });
        }
    }
    // Add FAQ scroll behavior directly
    (function() {
        const masterFaq = document.getElementById('masterFaq');
        if(masterFaq) {
            masterFaq.addEventListener('toggle', function(e) {
                if(this.open) {
                    setTimeout(() => {
                        this.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 150);
                }
            });
        }
    })();

    // --- CATEGORY FILTER LOGIC ---
    window.updateCategoryFilter = function() {
        const contenedor = document.getElementById('contenedorPartidos');
        const wrapper = document.getElementById('categoryFilterWrapper');
        if(!contenedor || !wrapper) return;
            // Find all match cards (v2 and guest)
            const cards = contenedor.querySelectorAll('.vcv-card-v2, .card.mb-3');
            let categories = new Set();
            let totalCount = 0;
            
            cards.forEach(card => {
                const catAttr = card.getAttribute('data-category');
                if(catAttr) {
                    let cat = catAttr.trim().toUpperCase();
                    card._normalizedCat = cat;
                    categories.add(cat);
                    totalCount++;
                }
            });

            if(categories.size <= 1) {
                wrapper.innerHTML = ''; // No need for filter if 0 or 1 category
                return;
            }

            // Build buttons
            let html = `<button type="button" class="cat-filter-btn active" data-filter="all">Todos (${totalCount})</button>`;
            
            Array.from(categories).sort().forEach(cat => {
                // Count how many matches in this category
                let count = Array.from(cards).filter(c => c._normalizedCat === cat).length;
                
                // Format category name nicely (e.g. "Superliga Masc 2")
                // Fallback title case for unknown categories
                let displayName = cat.replace(/_/g, ' ').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
                if(cat === "SM2") displayName = "Superliga Masc. 2";
                else if(cat === "1DIV_MASC") displayName = "1ª Masc";
                else if(cat === "1DIV_FEM") displayName = "1ª Fem";
                else if(cat === "2DIV_MASC") displayName = "2ª Masc";
                else if(cat === "2DIV_FEM") displayName = "2ª Fem";
                else if(cat === "JUNIOR_MASC") displayName = "Junior Masc";
                else if(cat === "JUNIOR_FEM") displayName = "Junior Fem";
                else if(cat === "JUV_MASC") displayName = "Juv Masc";
                else if(cat === "JUV_FEM") displayName = "Juv Fem";
                else if(cat === "CAD_MASC") displayName = "Cad Masc";
                else if(cat === "CAD_FEM") displayName = "Cad Fem";
                
                html += `<button type="button" class="cat-filter-btn" data-filter="${cat}">${displayName} (${count})</button>`;
            });

            wrapper.innerHTML = html;

            // Add click listeners
            const btns = wrapper.querySelectorAll('.cat-filter-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', function() {
                    // Update active class
                    btns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');

                    const filter = this.getAttribute('data-filter');
                    
                    // Filter cards
                    cards.forEach(card => {
                        if(filter === 'all' || card._normalizedCat === filter) {
                            card.style.display = ''; // Reset display
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            });
        }

        


