// ==================================================================
// PANEL DE ADMINISTRACIÓN E INTRANET
// ==================================================================

// FUNCIONES INTRANET ADMINISTRADOR
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// PLANTILLA INICIAL SUPERLIGA 2 (DORSAL, APODO, NOMBRE)
// ------------------------------------------------------------------
const PLANTILLA_SUPERLIGA_DEFAULT = [
    { dorsal: 1, apodo: "Jorge", nombre: "Jorge Alonso Rivas", posicion: "Colocador", usuario: null },
    { dorsal: 2, apodo: "Samuel", nombre: "Samuel Cabañeros Rodríguez", posicion: "Receptor", usuario: null },
    { dorsal: 3, apodo: "Iker", nombre: "Iker de León Rodríguez", posicion: "Central", usuario: null },
    { dorsal: 6, apodo: "Alonso", nombre: "Sergio Alonso Rivas", posicion: "Líbero", usuario: null },
    { dorsal: 7, apodo: "Álvaro", nombre: "Álvaro Novella Gutiérrez", posicion: "Opuesto", usuario: null },
    { dorsal: 8, apodo: "Manu", nombre: "Manuel Posadas Yenes", posicion: "Receptor", usuario: null },
    { dorsal: 9, apodo: "Alejandro", nombre: "Alejandro Bertrán Catalina", posicion: "Central", usuario: null },
    { dorsal: 10, apodo: "Jany Jr", nombre: "Alejandro González Fernández", posicion: "Colocador", usuario: null },
    { dorsal: 11, apodo: "Nikola", nombre: "Nikola Biserov Nankov", posicion: "Central", usuario: null },
    { dorsal: 16, apodo: "Edu", nombre: "Eduardo Valverde Lorenzo", posicion: "Líbero", usuario: null },
    { dorsal: 18, apodo: "Kike", nombre: "Enrique Carrasco Alvarado", posicion: "Receptor", usuario: null },
    { dorsal: 21, apodo: "Fabián", nombre: "Fabián Corona Mediavilla", posicion: "Opuesto", usuario: null },
    { dorsal: 23, apodo: "Álvaro G.", nombre: "Álvaro García de Castro", posicion: "Receptor", usuario: null },
    { dorsal: 24, apodo: "Kaloyan", nombre: "Kaloyan Biserov Nankov", posicion: "Central", usuario: null }
];

window.getPlantillaSuperligaActual = function() {
    if (!window.appData) window.appData = {};
    if (!Array.isArray(window.appData.plantilla_superliga) || window.appData.plantilla_superliga.length === 0) {
        try {
            const cached = localStorage.getItem('vcv_plantilla_superliga_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Si el cache tiene nombres en orden antiguo (ej: "Alonso Rivas Jorge"), sincronizar con los nombres actualizados
                    parsed.forEach(p => {
                        let def = PLANTILLA_SUPERLIGA_DEFAULT.find(d => d.dorsal === p.dorsal);
                        if (def && p.nombre && p.nombre.includes(' ') && !p.nombre.startsWith(def.nombre.split(' ')[0])) {
                            p.nombre = def.nombre;
                        }
                    });
                    window.appData.plantilla_superliga = parsed;
                }
            }
        } catch(e) {}
    }
    if (!Array.isArray(window.appData.plantilla_superliga) || window.appData.plantilla_superliga.length === 0) {
        window.appData.plantilla_superliga = JSON.parse(JSON.stringify(PLANTILLA_SUPERLIGA_DEFAULT));
    }
    return window.appData.plantilla_superliga;
};

// ------------------------------------------------------------------
// FUNCIONES INTRANET ADMINISTRADOR
// ------------------------------------------------------------------
window.adminVerTodosPartidos = false;
window.adminFiltroJornadaActual = 'todas';

window.adminToggleVerTodosPartidos = function(checked) {
    window.adminVerTodosPartidos = !!checked;
    const contFiltro = document.getElementById('adminContenedorFiltroJornada');
    if (contFiltro) {
        contFiltro.style.display = window.adminVerTodosPartidos ? 'flex' : 'none';
    }
    renderAdminPanel();
};

window.adminCambiarFiltroJornada = function(val) {
    window.adminFiltroJornadaActual = val || 'todas';
    renderAdminPanel();
};

function renderAdminPanel(equiposParam) {
    // Tomar la fuente adecuada: si 'Ver todos' está activo, usar todos_partidos para tener toda la temporada
    let pool = (window.adminVerTodosPartidos && window.appData && Array.isArray(window.appData.todos_partidos) && window.appData.todos_partidos.length > 0)
        ? window.appData.todos_partidos
        : ((equiposParam && Array.isArray(equiposParam)) ? equiposParam : (window.appData && window.appData.equipos ? window.appData.equipos : []));

    // Si está activo ver todos los partidos, asegurar poblar el selector de Jornada
    const selJor = document.getElementById('adminFiltroJornada');
    const contFiltro = document.getElementById('adminContenedorFiltroJornada');
    if (contFiltro) {
        contFiltro.style.display = window.adminVerTodosPartidos ? 'flex' : 'none';
    }

    if (selJor && window.adminVerTodosPartidos) {
        let allPool = (window.appData && Array.isArray(window.appData.todos_partidos) && window.appData.todos_partidos.length > 0)
            ? window.appData.todos_partidos
            : pool;
        
        let jornadasSet = new Set();
        allPool.forEach(p => {
            let jVal = p.jornada_eq || p.ronda_global;
            if (jVal !== undefined && jVal !== null && String(jVal).trim() !== '') {
                jornadasSet.add(String(jVal).trim());
            }
        });

        let sortedJornadas = Array.from(jornadasSet).sort((a, b) => {
            let numA = parseInt(a), numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });

        let curSelected = window.adminFiltroJornadaActual || selJor.value || 'todas';
        let jorHtml = '<option value="todas">Todas las Jornadas</option>';
        sortedJornadas.forEach(j => {
            jorHtml += `<option value="${j}" ${curSelected === j ? 'selected' : ''}>Jornada ${j}</option>`;
        });
        selJor.innerHTML = jorHtml;
    }

    let html = "";
    let now = new Date().getTime();

    pool.forEach(eq => {
        let ts = eq.timestamp || Infinity;
        let isAvailable = eq.estado === "ABIERTO" && eq.visibilidad === "MOSTRAR";
        let endedRecently = (eq.estado === "FINALIZADO" || eq.estado === "BLOQUEADO" || eq.estado === "CERRADO") && (now - (eq.timestamp_bloqueo || ts)) < 48 * 60 * 60 * 1000;
        let catL = (eq.categoria || '').toLowerCase();
        let yaTieneResultado = !!(eq.oficial_sets && String(eq.oficial_sets).trim() !== "");
        let isSuperliga = catL.includes('sm2') || catL.includes('superliga');

        // Comprobar filtro de permisos por equipo para no-admin completo
        let userPermTeams = window._userPermisoResultados || '';
        let canUserSeeThisMatch = true;
        if (userPermTeams && userPermTeams !== 'TODOS' && userPermTeams !== 'X') {
            let allowedTeams = userPermTeams.toLowerCase().split(',').map(s => s.trim());
            let eqLocL = (eq.equipo_local || '').toLowerCase();
            let eqRivL = (eq.rival || '').toLowerCase();
            canUserSeeThisMatch = allowedTeams.some(t => eqLocL.includes(t) || eqRivL.includes(t));
        }

        // Si el partido ya tiene resultado subido, desaparece de la vista rápida salvo que se marque "Ver todos los partidos"
        let shouldShow = false;
        if (window.adminVerTodosPartidos) {
            shouldShow = true;
            // Filtro por jornada si no está en 'todas'
            if (window.adminFiltroJornadaActual && window.adminFiltroJornadaActual !== 'todas') {
                let eqJornada = String(eq.jornada_eq || eq.ronda_global || '').trim();
                if (eqJornada !== String(window.adminFiltroJornadaActual).trim()) {
                    shouldShow = false;
                }
            }
        } else {
            // Mostrar si está abierto o en cartelera o finalizado recientemente sin resultado oficial subido aún
            if (!yaTieneResultado) {
                shouldShow = isAvailable || endedRecently || (ts < now && (now - ts) < 7 * 24 * 60 * 60 * 1000);
            }
        }

        if (canUserSeeThisMatch && shouldShow) {
            let adminLocal = (eq.ubicacion === 'LOCAL') ? eq.equipo_local : eq.rival;
            let adminVisit = (eq.ubicacion === 'LOCAL') ? eq.rival : eq.equipo_local;
            let jornadaBadge = (eq.jornada_eq || eq.ronda_global) ? `J.${eq.jornada_eq || eq.ronda_global}` : '';
            let visBadge = eq.visibilidad === "OCULTAR" ? `<span style="font-size:0.65rem; padding:1px 5px; border-radius:4px; background:rgba(231,76,60,0.2); color:#ff4757; font-weight:bold; margin-left:4px;">Oculto</span>` : '';
            
            html += `
            ${(ts < now && !yaTieneResultado && ts > 0) ? `
            <div class="admin-match-box alerta-pendiente-resultado" style="background: linear-gradient(to right, rgba(231, 76, 60, 0.12), var(--bg-general)); border: 2px solid #e74c3c; border-radius: 8px; padding: 12px; margin-bottom: 14px; box-shadow: 0 0 15px rgba(231, 76, 60, 0.25);">
                <div style="background:#e74c3c; color:#fff; font-size:0.72rem; font-weight:900; padding:3px 8px; border-radius:4px; display:inline-flex; align-items:center; gap:5px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">
                    <i class="fas fa-exclamation-triangle"></i> PARTIDO FINALIZADO SIN RESULTADO OFICIAL
                </div>` : `
            <div class="admin-match-box" style="background: var(--bg-general); border: 1px solid rgba(230,126,34,0.3); border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">`}
                <div style="font-weight:bold; margin-bottom:8px; color: var(--text-main); font-size: 0.9rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                    <span>${adminLocal} <span style="color:var(--text-muted);">vs</span> ${adminVisit} ${visBadge}</span>
                    <div style="display:flex; align-items:center; gap:4px;">
                        ${jornadaBadge ? `<span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; background:rgba(230,126,34,0.15); color:#e67e22; font-weight:800;">${jornadaBadge}</span>` : ''}
                        <span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; background:var(--bg-card-alt); color:var(--secondary-color); font-weight:800;">${eq.categoria || ''}</span>
                    </div>
                </div>
                
                <!-- SECCIÓN RESULTADOS -->
                <div style="margin-bottom: 8px; border-left: 2px solid var(--vcv-morado); padding-left: 8px;">
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Resultado Final (Sets)</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="number" id="adm_sets_loc_${eq.id_partido}" class="form-control" placeholder="Sets Local" value="${eq.oficial_sets ? eq.oficial_sets.split('-')[0] : ''}" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); text-align:center;">
                        <span style="color: var(--text-muted);">-</span>
                        <input type="number" id="adm_sets_vis_${eq.id_partido}" class="form-control" placeholder="Sets Visitante" value="${eq.oficial_sets ? (eq.oficial_sets.split('-')[1] || '') : ''}" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); text-align:center;">
                    </div>
                    <input type="text" id="adm_parc_${eq.id_partido}" class="form-control" placeholder="Parciales (ej: 25-20, 25-22...)" value="${eq.oficial_parciales || ''}" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); margin-top: 6px;">
                </div>

                <!-- SECCIÓN STREAMING -->
                <div style="margin-bottom: 8px; border-left: 2px solid #e67e22; padding-left: 8px;">
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Link Streaming Oficial</label>
                    <input type="text" id="adm_stream_${eq.id_partido}" class="form-control" placeholder="URL de YouTube/Twitch/etc." value="${eq.streaming || ''}" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main);">
                </div>

${eq.actualizado_por ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:6px; display:flex; align-items:center; gap:4px;">
                    <i class="fas fa-user-edit" style="color:#e67e22;"></i>
                    <span>Resultado anotado por <strong style="color:var(--text-main);">@${eq.actualizado_por}</strong>${eq.actualizado_fecha ? ` (${eq.actualizado_fecha})` : ''}</span>
                </div>` : ''}
                <button class="btn" style="width: 100%; padding: 8px; font-size: 0.8rem; background: #e67e22; color: #fff; border: none; border-radius: 6px; font-weight: bold; margin-top: 4px; box-shadow: 0 4px 6px rgba(230,126,34,0.2);" onclick="guardarResultadoAdmin(event, '${eq.id_partido}')">
                    Guardar Cambios
                </button>
            </div>`;
        }
    });

    if (html === "") {
        html = window.adminVerTodosPartidos
            ? "<div style='color:var(--text-muted); font-size:0.8rem; text-align:center; padding:12px;'>No se han encontrado partidos con los filtros seleccionados.</div>"
            : "<div style='color:var(--text-muted); font-size:0.8rem; text-align:center; padding:12px;'>No hay partidos pendientes de resultado recientemente. Marca 'Ver todos los partidos' para buscar o corregir cualquier jornada de la temporada.</div>";
    }

    const container = document.getElementById('adminListaPartidos');
    if (container) container.innerHTML = html;

    renderAdminPlantillaMvp();
    if (typeof window.populateDirectMvpBoxes === 'function') {
        window.populateDirectMvpBoxes();
    }
}

window.getJugadorPhotoUrl = function(dorsal) {
    let t = window._imgCacheBust ? `?v=${window._imgCacheBust}` : `?v=${Date.now()}`;
    return `files/images/jugadores/dorsal_${dorsal}.png${t}`;
};

window.handleJugadorImgError = function(imgEl, dorsal, initials) {
    if (!imgEl) return;
    let step = parseInt(imgEl.getAttribute('data-ext-step') || '0');
    let t = window._imgCacheBust ? `?v=${window._imgCacheBust}` : '';
    let extList = ['.jpeg', '.jpg', '.webp'];
    if (step < extList.length) {
        let nextExt = extList[step];
        imgEl.setAttribute('data-ext-step', String(step + 1));
        imgEl.src = `files/images/jugadores/dorsal_${dorsal}${nextExt}${t ? ('?' + t.replace(/^\?/, '')) : ''}`;
    } else {
        imgEl.onerror = null;
        imgEl.outerHTML = `<span style="font-weight:900; color:var(--secondary-color); font-size:1.1rem; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${initials || ('#' + dorsal)}</span>`;
    }
};

window.renderAdminPlantillaMvp = function() {
    const cont = document.getElementById('adminListaPlantillaMvp');
    if (!cont) return;
    const plantilla = (typeof window.getPlantillaSuperligaActual === 'function') ? window.getPlantillaSuperligaActual() : ((window.appData && window.appData.plantilla_superliga) || []);
    if (plantilla.length === 0) {
        cont.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:8px;">No hay jugadores en la plantilla todavía.</div>';
        return;
    }
    let h = '';
    plantilla.forEach((j) => {
        let dorVal = j.dorsal || '';
        let nomVal = j.nombre || '';
        let uVal = j.usuario || '';
        let posVal = j.posicion || '';
        let apodVal = j.apodo || '';
        let photoPath = window.getJugadorPhotoUrl(j.dorsal);
        h += `
        <div style="background:var(--bg-general); border:1px solid var(--border-color); border-radius:8px; padding:8px 12px; font-size:0.8rem; display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                <div style="width:34px; height:34px; border-radius:8px; overflow:hidden; background:var(--bg-card-alt); border:1px solid rgba(212,175,55,0.4); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <img loading="lazy" src="${photoPath}" alt="#${j.dorsal}" style="width:100%; height:100%; object-fit:cover;" onerror="window.handleJugadorImgError(this, ${j.dorsal}, '#${j.dorsal}');">
                </div>
                <div style="display:flex; flex-direction:column; gap:2px; min-width:0; overflow:hidden;">
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span style="font-weight:900; color:var(--secondary-color); font-size:0.85rem;">#${dorVal}</span>
                        <span style="font-weight:700; color:var(--text-main); font-size:0.82rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${nomVal}${apodVal && apodVal !== nomVal ? ' <span style=\"color:var(--text-muted); font-size:0.75rem; font-weight:normal;\">(' + apodVal + ')</span>' : ''}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; font-size:0.72rem; color:var(--text-muted); flex-wrap:wrap;">
                        ${posVal ? `<span style="background:rgba(255,255,255,0.05); padding:1px 6px; border-radius:4px; border:1px solid var(--border-color);">${posVal}</span>` : ''}
                        ${uVal ? `<span style="color:var(--secondary-color); font-weight:600;">@${uVal.replace(/^@/, '')}</span>` : '<span style="font-style:italic; opacity:0.6;">Sin usuario vinculado</span>'}
                    </div>
                </div>
            </div>
        </div>`;
    });
    cont.innerHTML = h;
};

window.actualizarCampoJugador = function(idx, field, val) {
    if (!window.appData || !Array.isArray(window.appData.plantilla_superliga)) return;
    if (window.appData.plantilla_superliga[idx]) {
        if (field === 'dorsal') {
            window.appData.plantilla_superliga[idx][field] = parseInt(val) || 0;
        } else {
            window.appData.plantilla_superliga[idx][field] = val.trim();
        }
        try {
            localStorage.setItem('vcv_plantilla_superliga_cache', JSON.stringify(window.appData.plantilla_superliga));
        } catch(e) {}
    }
};

window.agregarJugadorPlantilla = function() {
    const dorInput = document.getElementById('nuevoJugadorDorsal');
    const apodInput = document.getElementById('nuevoJugadorApodo');
    const posInput = document.getElementById('nuevoJugadorPosicion');
    const nomInput = document.getElementById('nuevoJugadorNombre');
    const usrInput = document.getElementById('nuevoJugadorUsuario');
    if (!dorInput || !nomInput) return;
    const dVal = parseInt(dorInput.value);
    const nVal = nomInput.value.trim();
    const aVal = apodInput ? apodInput.value.trim() : "";
    const pVal = posInput ? posInput.value.trim() : "";
    const uVal = usrInput ? usrInput.value.trim() : "";
    if (isNaN(dVal) || !nVal) {
        alert("Por favor introduce un dorsal numérico y un nombre.");
        return;
    }
    if (!window.appData) window.appData = {};
    if (!Array.isArray(window.appData.plantilla_superliga)) {
        window.appData.plantilla_superliga = (typeof window.getPlantillaSuperligaActual === 'function') ? window.getPlantillaSuperligaActual() : [];
    }
    
    // Generar un ID único autoincrementado en el cliente para el nuevo jugador
    let maxId = 0;
    window.appData.plantilla_superliga.forEach(p => {
        let pId = parseInt(p.id);
        if (!isNaN(pId) && pId > maxId) maxId = pId;
    });

    window.appData.plantilla_superliga.push({ 
        id: maxId + 1,
        dorsal: dVal, 
        apodo: aVal || nVal.split(' ')[0], 
        posicion: pVal, 
        nombre: nVal,
        usuario: uVal || null
    });
    window.appData.plantilla_superliga.sort((a, b) => a.dorsal - b.dorsal);
    dorInput.value = '';
    nomInput.value = '';
    if (apodInput) apodInput.value = '';
    if (posInput) posInput.value = '';
    if (usrInput) usrInput.value = '';
    try {
        localStorage.setItem('vcv_plantilla_superliga_cache', JSON.stringify(window.appData.plantilla_superliga));
    } catch(e) {}
    renderAdminPlantillaMvp();
    if (typeof window.populateDirectMvpBoxes === 'function') window.populateDirectMvpBoxes();

    const addBtn = document.getElementById('btnAgregarNuevoJugador');
    if (addBtn) { addBtn.disabled = true; addBtn.innerText = "⏳ Guardando en base de datos..."; }

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'save_plantilla_superliga',
            usuario: currentUser,
            password: currentPassword,
            jugadores: window.appData.plantilla_superliga
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (addBtn) { addBtn.disabled = false; addBtn.innerText = "➕ Guardar Jugador en Plantilla"; }
        if (d && d.status === 'success') {
            mostrarToast("¡Jugador añadido a la plantilla en la base de datos!");
        } else {
            mostrarToast(d && d.message ? d.message : "Guardado localmente.");
        }
        renderAdminPlantillaMvp();
        if (typeof window.populateDirectMvpBoxes === 'function') window.populateDirectMvpBoxes();
    })
    .catch(err => {
        if (addBtn) { addBtn.disabled = false; addBtn.innerText = "➕ Guardar Jugador en Plantilla"; }
        mostrarToast("Jugador guardado localmente.");
    });
};

window.eliminarJugadorPlantilla = function(idx) {
    if (!window.appData || !Array.isArray(window.appData.plantilla_superliga)) return;
    let pj = window.appData.plantilla_superliga[idx];
    if (!confirm(`¿Eliminar a #${pj.dorsal} ${pj.nombre} de la plantilla?`)) return;
    window.appData.plantilla_superliga.splice(idx, 1);
    try {
        localStorage.setItem('vcv_plantilla_superliga_cache', JSON.stringify(window.appData.plantilla_superliga));
    } catch(e) {}
    renderAdminPlantillaMvp();
    if (window.appData.equipos) renderAdminPanel(window.appData.equipos);
};

window.guardarPlantillaSuperligaEnBD = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = document.getElementById('btnGuardarPlantillaMvp');
    if (!window.appData || !Array.isArray(window.appData.plantilla_superliga)) return;
    if (btn) { btn.disabled = true; btn.innerText = "⏳ Guardando en base de datos..."; }
    
    // Guardar siempre una copia local de respaldo inmediato
    try {
        localStorage.setItem('vcv_plantilla_superliga_cache', JSON.stringify(window.appData.plantilla_superliga));
    } catch(err) {}

    let onDone = function() {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Guardar Cambios en Plantilla"; }
        window._imgCacheBust = Date.now();
        if (typeof window.renderAdminPlantillaMvp === 'function') window.renderAdminPlantillaMvp();
        if (typeof window.renderCarteleraHTML === 'function' && window.appData) window.renderCarteleraHTML(window.appData);
    };

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'save_plantilla_superliga',
            usuario: currentUser,
            password: currentPassword,
            jugadores: window.appData.plantilla_superliga
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        onDone();
        if (d.status === 'success') {
            mostrarToast("Plantilla y fotos actualizadas en base de datos con éxito");
        } else {
            // Si el backend remoto aún no tiene la acción activa, guardado local para pruebas
            mostrarToast("Plantilla y fotos actualizadas (modo pruebas)");
        }
    })
    .catch(err => {
        onDone();
        mostrarToast("Plantilla y fotos actualizadas localmente (modo pruebas)");
    });
};



// ------------------------------------------------------------------
// ------------------------------------------------------------------
// GESTOR DIRECTO DE NOMINADOS MVP EN SECCIÓN 6.B
// ------------------------------------------------------------------
window.setSelectValueSafely = function(selectEl, rawVal) {
    if (!selectEl) return;
    if (!rawVal) {
        selectEl.selectedIndex = 0;
        return;
    }
    // 1. Coincidencia exacta de valor
    for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value === rawVal) {
            selectEl.selectedIndex = i;
            return;
        }
    }
    // 2. Coincidencia por dorsal (#X)
    let m = String(rawVal).match(/^#(\d+)\b/);
    if (m) {
        let dor = m[1];
        for (let i = 0; i < selectEl.options.length; i++) {
            if (selectEl.options[i].value.startsWith(`#${dor} `)) {
                selectEl.selectedIndex = i;
                return;
            }
        }
    }
    // 3. Coincidencia por texto o nombre contenido
    let rawClean = String(rawVal).toLowerCase().replace(/[^a-záéíóúüñ]/g, ' ').trim();
    if (rawClean) {
        for (let i = 0; i < selectEl.options.length; i++) {
            let optClean = selectEl.options[i].value.toLowerCase().replace(/[^a-záéíóúüñ]/g, ' ').trim();
            if (optClean && (optClean.includes(rawClean) || rawClean.includes(optClean))) {
                selectEl.selectedIndex = i;
                return;
            }
        }
    }
    selectEl.selectedIndex = 0;
};

window.populateDirectMvpBoxes = function() {
    const selJor = document.getElementById('directMvpJornadaSelect');
    const selPart = document.getElementById('directMvpPartidoSelect');
    if (!selPart) return;
    
    // Obtener partidos de Superliga
    let sm2MatchesMap = {};
    if (window.appData && Array.isArray(window.appData.equipos)) {
        window.appData.equipos.forEach(p => {
            let cat = (p.categoria || '').toLowerCase();
            if (cat.includes('sm2') || cat.includes('superliga')) sm2MatchesMap[p.id_partido] = p;
        });
    }
    if (window.appData && Array.isArray(window.appData.todos_partidos)) {
        window.appData.todos_partidos.forEach(p => {
            let cat = (p.categoria || '').toLowerCase();
            if (cat.includes('sm2') || cat.includes('superliga')) {
                if (!sm2MatchesMap[p.id_partido]) sm2MatchesMap[p.id_partido] = p;
            }
        });
    }
    
    let sm2Matches = Object.values(sm2MatchesMap);
    if (sm2Matches.length === 0) {
        sm2Matches = [{
            id_partido: "DEMO_SM2_MVP",
            equipo_local: "Voleibol Club Valladolid",
            rival: "CyL Palencia 2028",
            categoria: "SM2",
            jornada_eq: "1"
        }];
    }
    
    // Extraer jornadas únicas
    let jornadas = [...new Set(sm2Matches.map(p => String(p.jornada_eq || p.jornada || '1')))];
    jornadas.sort((a, b) => parseInt(a) - parseInt(b));
    
    if (selJor) {
        let curJor = selJor.value;
        selJor.innerHTML = '<option value="todas">Todas las Jornadas</option>';
        jornadas.forEach(j => {
            let opt = document.createElement('option');
            opt.value = j;
            opt.textContent = `Jornada ${j}`;
            selJor.appendChild(opt);
        });
        // Determinar automáticamente la jornada activa o la última jugada de Superliga
        let defaultJor = null;
        let now = Date.now();
        // 1. Buscar el último partido de SM2 jugado o cerrado (resultado oficial o con timestamp pasado)
        let sm2Played = sm2Matches.filter(p => {
            let hasScore = (p.oficial_sets && p.oficial_sets.trim() !== '') || p.estado === 'FINALIZADO' || p.estado === 'CERRADO';
            let isPast = p.timestamp && (p.timestamp <= now);
            return hasScore || isPast;
        });
        if (sm2Played.length > 0) {
            sm2Played.sort((a, b) => (parseInt(b.jornada_eq || b.jornada || '0') - parseInt(a.jornada_eq || a.jornada || '0')) || ((b.timestamp || 0) - (a.timestamp || 0)));
            defaultJor = String(sm2Played[0].jornada_eq || sm2Played[0].jornada || '');
        }
        // 2. Si no hay jugados, buscar según currentJornadaGlobal o el primero disponible
        if (!defaultJor || !jornadas.includes(defaultJor)) {
            if (typeof currentJornadaGlobal !== 'undefined' && jornadas.includes(String(currentJornadaGlobal))) {
                defaultJor = String(currentJornadaGlobal);
            } else if (jornadas.length > 0) {
                defaultJor = jornadas[0];
            }
        }

        if (curJor && (curJor === 'todas' || jornadas.includes(curJor))) {
            selJor.value = curJor;
        } else if (defaultJor && jornadas.includes(defaultJor)) {
            selJor.value = defaultJor;
        } else if (jornadas.length > 0) {
            selJor.value = jornadas[0];
        }
    }
    
    window.onDirectMvpJornadaChange(selJor ? selJor.value : 'todas');
};

window.onDirectMvpJornadaChange = function(jorVal) {
    const selPart = document.getElementById('directMvpPartidoSelect');
    if (!selPart) return;
    
    let sm2MatchesMap = {};
    if (window.appData && Array.isArray(window.appData.equipos)) {
        window.appData.equipos.forEach(p => {
            let cat = (p.categoria || '').toLowerCase();
            if (cat.includes('sm2') || cat.includes('superliga')) sm2MatchesMap[p.id_partido] = p;
        });
    }
    if (window.appData && Array.isArray(window.appData.todos_partidos)) {
        window.appData.todos_partidos.forEach(p => {
            let cat = (p.categoria || '').toLowerCase();
            if (cat.includes('sm2') || cat.includes('superliga')) {
                if (!sm2MatchesMap[p.id_partido]) sm2MatchesMap[p.id_partido] = p;
            }
        });
    }
    let sm2Matches = Object.values(sm2MatchesMap);
    if (sm2Matches.length === 0) {
        sm2Matches = [{ id_partido: "DEMO_SM2_MVP", equipo_local: "Voleibol Club Valladolid", rival: "CyL Palencia 2028", categoria: "SM2", jornada_eq: "1" }];
    }
    
    let filtrados = sm2Matches;
    if (jorVal && jorVal !== 'todas') {
        filtrados = sm2Matches.filter(p => String(p.jornada_eq || p.jornada || '1') === String(jorVal));
        if (filtrados.length === 0) filtrados = sm2Matches;
    }
    
    let curVal = selPart.value;
    selPart.innerHTML = '';
    filtrados.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p.id_partido;
        opt.textContent = `J.${p.jornada_eq || '1'}: ${p.equipo_local || 'VCV'} vs ${p.rival || 'Rival'}`;
        selPart.appendChild(opt);
    });
    if (curVal && filtrados.some(p => p.id_partido === curVal)) {
        selPart.value = curVal;
    } else if (filtrados.length > 0) {
        selPart.value = filtrados[0].id_partido;
    }
    
    window.onDirectMvpPartidoChange(selPart.value);
};

window.getMvpFechaDefaultManana12 = function() {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Día siguiente
    d.setHours(12, 0, 0, 0);   // A las 12:00 de la mañana
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

window.guardarSoloHoraPublicacionMvp = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = document.getElementById('btnGuardarHoraMvp');
    const selPart = document.getElementById('directMvpPartidoSelect');
    const idPart = selPart ? selPart.value : '';
    const inputPub = document.getElementById('adminMvpFechaPublicacion');

    if (!idPart) {
        alert("Por favor selecciona un partido de Superliga.");
        return;
    }
    if (!inputPub || !inputPub.value) {
        alert("Por favor introduce una fecha y hora válida.");
        return;
    }

    const targetPubTs = new Date(inputPub.value).getTime();
    if (!targetPubTs || isNaN(targetPubTs)) {
        alert("Fecha u hora no válida.");
        return;
    }

    // Actualizar en memoria en window.appData
    if (!window.appData) window.appData = {};
    if (!Array.isArray(window.appData.equipos)) window.appData.equipos = [];
    let pObj = window.appData.equipos.find(p => p.id_partido === idPart);
    if (!pObj && window.appData.todos_partidos) {
        pObj = window.appData.todos_partidos.find(p => p.id_partido === idPart);
        if (pObj) window.appData.equipos.unshift(pObj);
    }
    if (typeof window.setLocalMvpPubTs === 'function') {
        window.setLocalMvpPubTs(idPart, targetPubTs);
    }
    if (pObj) {
        pObj.mvp_publicacion_ts = targetPubTs;
        pObj.mvp_visible = true;
        pObj.visibilidad = 'MOSTRAR';
    }
    if (Array.isArray(window.appData.todos_partidos)) {
        window.appData.todos_partidos.forEach(p => {
            if (p.id_partido === idPart) p.mvp_publicacion_ts = targetPubTs;
        });
    }

    if (btn) { btn.disabled = true; btn.innerText = "⏳..."; }

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'set_mvp_publicacion_ts',
            usuario: currentUser,
            password: currentPassword,
            id_partido: idPart,
            mvp_publicacion_ts: targetPubTs
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Guardar Hora"; }
        mostrarToast("¡Hora de publicación del MVP guardada con éxito!");
        if (typeof window.actualizarBannerEstadoMvp === 'function') {
            window.actualizarBannerEstadoMvp(pObj);
        }
        if (typeof window.renderCarteleraHTML === 'function') {
            window.renderCarteleraHTML(window.appData);
        }
    })
    .catch(err => {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Guardar Hora"; }
        mostrarToast("Hora guardada localmente");
        if (typeof window.actualizarBannerEstadoMvp === 'function') {
            window.actualizarBannerEstadoMvp(pObj);
        }
        if (typeof window.renderCarteleraHTML === 'function') {
            window.renderCarteleraHTML(window.appData);
        }
    });
};

window.onDirectMvpPartidoChange = function(idPart) {
    const s1 = document.getElementById('directMvp1');
    const s2 = document.getElementById('directMvp2');
    const s3 = document.getElementById('directMvp3');
    const sOficial = document.getElementById('directMvpOficialSelect');
    if (!s1 || !s2 || !s3) return;
    
    const plantilla = (typeof window.getPlantillaSuperligaActual === 'function') ? window.getPlantillaSuperligaActual() : ((window.appData && window.appData.plantilla_superliga) || []);
    
    let optsHtml = '<option value="">-- Seleccionar Jugador --</option>';
    plantilla.forEach(pj => {
        let posPart = pj.posicion ? ` [${pj.posicion}]` : '';
        let apodoPart = pj.apodo ? ` (${pj.apodo})` : '';
        let valStr = `#${pj.dorsal} ${pj.nombre}${apodoPart}${posPart}`;
        optsHtml += `<option value="${valStr}">#${pj.dorsal} ${pj.apodo || pj.nombre}${posPart} - ${pj.nombre}</option>`;
    });
    
    s1.innerHTML = optsHtml;
    s2.innerHTML = optsHtml;
    s3.innerHTML = optsHtml;

    // Buscar si el partido ya tiene candidatos u oficial
    let matchObj = null;
    if (window.appData && Array.isArray(window.appData.equipos)) {
        matchObj = window.appData.equipos.find(p => p.id_partido === idPart);
    }
    if (!matchObj && window.appData && Array.isArray(window.appData.todos_partidos)) {
        matchObj = window.appData.todos_partidos.find(p => p.id_partido === idPart);
    }
    let cands = (matchObj && Array.isArray(matchObj.mvp_candidatos)) ? matchObj.mvp_candidatos : [];
    
    window.setSelectValueSafely(s1, cands[0] || '');
    window.setSelectValueSafely(s2, cands[1] || '');
    window.setSelectValueSafely(s3, cands[2] || '');

    // Actualizar opciones del MVP Oficial para que SOLO salgan los candidatos seleccionados
    window.actualizarOpcionesMvpOficial(matchObj ? matchObj.mvp_oficial : '');

    // Cargar fecha programada de publicación (por defecto: 12:00 del día siguiente)
    const inputPub = document.getElementById('adminMvpFechaPublicacion');
    if (inputPub) {
        if (matchObj && matchObj.mvp_publicacion_ts && matchObj.mvp_publicacion_ts > 0) {
            const d = new Date(matchObj.mvp_publicacion_ts);
            const pad = n => String(n).padStart(2, '0');
            inputPub.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } else {
            inputPub.value = window.getMvpFechaDefaultManana12();
        }
    }

    // Actualizar banner de estado visual de este partido
    window.actualizarBannerEstadoMvp(matchObj);
};

window.actualizarOpcionesMvpOficial = function(valorSeleccionadoPrevio) {
    const s1 = document.getElementById('directMvp1');
    const s2 = document.getElementById('directMvp2');
    const s3 = document.getElementById('directMvp3');
    const sOficial = document.getElementById('directMvpOficialSelect');
    if (!sOficial) return;

    let selActual = valorSeleccionadoPrevio !== undefined ? valorSeleccionadoPrevio : sOficial.value;

    const m1 = s1 ? s1.value : '';
    const m2 = s2 ? s2.value : '';
    const m3 = s3 ? s3.value : '';

    let candidatosActivos = [m1, m2, m3].filter(c => c && c.trim() !== '');

    let h = '<option value="">-- Sin MVP asignado --</option>';
    if (candidatosActivos.length === 0) {
        h = '<option value="">-- Primero selecciona los nominados arriba --</option>';
    } else {
        candidatosActivos.forEach(cand => {
            let info = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(cand) : { dorsal: '', apodo: cand, posicion: '' };
            let etiqueta = (info.dorsal ? '#' + info.dorsal + ' ' : '') + info.apodo + (info.posicion ? ' [' + info.posicion + ']' : '');
            h += `<option value="${cand}">${etiqueta}</option>`;
        });
    }
    sOficial.innerHTML = h;

    if (selActual && candidatosActivos.includes(selActual)) {
        window.setSelectValueSafely(sOficial, selActual);
    } else {
        sOficial.selectedIndex = 0;
    }
};

window.actualizarBannerEstadoMvp = function(matchObj) {
    const badge = document.getElementById('adminMvpEstadoBadge');
    if (!badge) return;
    
    let isVisible = matchObj && matchObj.mvp_visible !== false && matchObj.mvp_visible !== 'OCULTAR';
    let cands = (matchObj && Array.isArray(matchObj.mvp_candidatos)) ? matchObj.mvp_candidatos.filter(Boolean) : [];
    let hasOficial = Boolean(matchObj && matchObj.mvp_oficial);
    
    let targetPubTs = (matchObj && matchObj.mvp_publicacion_ts) ? parseInt(matchObj.mvp_publicacion_ts) : 0;
    let isPendingPublication = hasOficial && targetPubTs > Date.now();

    if (hasOficial && !isPendingPublication) {
        badge.innerText = '👑 GANADOR MVP PUBLICADO';
        badge.style.background = 'rgba(46, 204, 113, 0.2)';
        badge.style.color = '#2ecc71';
        badge.style.border = '1px solid #2ecc71';
    } else if (hasOficial && isPendingPublication) {
        const dObj = new Date(targetPubTs);
        const pad = n => String(n).padStart(2, '0');
        const horaStr = `${pad(dObj.getHours())}:${pad(dObj.getMinutes())}`;
        badge.innerText = `⏳ PROGRAMADO (${horaStr})`;
        badge.style.background = 'rgba(212, 175, 55, 0.2)';
        badge.style.color = 'var(--secondary-color)';
        badge.style.border = '1px solid var(--secondary-color)';
    } else if (isVisible && (cands.length === 2 || cands.length === 3)) {
        badge.innerText = `🟢 PUBLICADO (${cands.length} CANDIDATOS)`;
        badge.style.background = 'rgba(46, 204, 113, 0.2)';
        badge.style.color = '#2ecc71';
        badge.style.border = '1px solid #2ecc71';
    } else if (!isVisible && (cands.length === 2 || cands.length === 3)) {
        badge.innerText = '🚫 OCULTO POR EL ADMIN';
        badge.style.background = 'rgba(231, 76, 60, 0.2)';
        badge.style.color = '#e74c3c';
        badge.style.border = '1px solid #e74c3c';
    } else {
        badge.innerText = '⚪ NO PUBLICADO / SIN CANDIDATOS';
        badge.style.background = 'rgba(255, 255, 255, 0.1)';
        badge.style.color = 'var(--text-muted)';
        badge.style.border = '1px solid var(--border-color)';
    }
};

window.cambiarVisibilidadVotacionMvp = function(hacerVisible) {
    const selPart = document.getElementById('directMvpPartidoSelect');
    const idPart = selPart ? selPart.value : '';
    if (!idPart) {
        alert("Por favor selecciona un partido de Superliga.");
        return;
    }
    const s1 = document.getElementById('directMvp1');
    const s2 = document.getElementById('directMvp2');
    const s3 = document.getElementById('directMvp3');
    const m1 = s1 ? s1.value : '';
    const m2 = s2 ? s2.value : '';
    const m3 = s3 ? s3.value : '';
    
    if (hacerVisible) {
        if (!m1 || !m2) {
            alert("Debes seleccionar al menos 2 nominados (Nominado 1 y Nominado 2) para publicar la votación.");
            return;
        }
        if (m1 === m2 || (m3 && (m1 === m3 || m2 === m3))) {
            alert("Los nominados deben ser jugadores diferentes. No puedes repetir al mismo jugador.");
            return;
        }
    }

    let cands = [m1, m2];
    if (m3) cands.push(m3);

    if (!window.appData) window.appData = {};
    if (!Array.isArray(window.appData.equipos)) window.appData.equipos = [];
    
    let pObj = window.appData.equipos.find(p => p.id_partido === idPart);
    if (!pObj && window.appData.todos_partidos) {
        pObj = window.appData.todos_partidos.find(p => p.id_partido === idPart);
        if (pObj) window.appData.equipos.unshift(pObj);
    }
    if (!pObj) {
        pObj = {
            id_partido: idPart,
            equipo_local: "Voleibol Club Valladolid",
            rival: "CyL Palencia 2028",
            abrev_local: "VCV",
            abrev_rival: "PAL",
            categoria: "SM2",
            jornada_eq: "1",
            ubicacion: "LOCAL",
            estado: "CERRADO",
            visibilidad: "MOSTRAR",
            permitido: true,
            timestamp: Date.now() - 3600000,
            pabellon: "Polideportivo Pisuerga",
            oficial_sets: "3-1",
            oficial_parciales: "25-21, 23-25, 25-18, 25-20"
        };
        window.appData.equipos.unshift(pObj);
    }

    if (hacerVisible) {
        pObj.mvp_candidatos = cands;
        pObj.mvp_visible = true;
        pObj.visibilidad = "MOSTRAR";
        pObj.permitido = true;
        if (pObj.estado !== "CERRADO" && pObj.estado !== "FINALIZADO") pObj.estado = "CERRADO";
        if (!pObj.oficial_sets) pObj.oficial_sets = "3-1";
        if (!pObj.oficial_parciales) pObj.oficial_parciales = "25-21, 23-25, 25-18, 25-20";
        // Si no tiene fecha de publicación programada, preestablecer las 12:00 del día siguiente
        if (!pObj.mvp_publicacion_ts || pObj.mvp_publicacion_ts <= 0) {
            const dManana12 = new Date();
            dManana12.setDate(dManana12.getDate() + 1);
            dManana12.setHours(12, 0, 0, 0);
            pObj.mvp_publicacion_ts = dManana12.getTime();
            const inputPubEl = document.getElementById('adminMvpFechaPublicacion');
            if (inputPubEl) inputPubEl.value = window.getMvpFechaDefaultManana12();
        }
    } else {
        pObj.mvp_visible = false;
        // Mantener los candidatos existentes para que no se pierdan al volver a mostrar
        if (cands.length >= 2) {
            pObj.mvp_candidatos = cands;
        }
    }

    // Sincronizar en memoria en equipos y todos_partidos
    [window.appData.equipos, window.appData.todos_partidos].forEach(arr => {
        if (Array.isArray(arr)) {
            arr.forEach(p => {
                if (p.id_partido === idPart) {
                    p.mvp_visible = hacerVisible;
                    if (cands.length >= 2) p.mvp_candidatos = cands;
                }
            });
        }
    });

    // Actualizar indicador de estado en el panel
    window.actualizarBannerEstadoMvp(pObj);

    const btn = document.getElementById(hacerVisible ? 'btnPublicarMvp' : 'btnOcultarMvp');
    const oldText = btn ? btn.innerText : '';
    if (btn) { btn.disabled = true; btn.innerText = "⏳ Guardando..."; }

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'save_resultado_admin',
            usuario: currentUser,
            password: currentPassword,
            id_partido: idPart,
            sets: pObj ? (pObj.oficial_sets || undefined) : undefined,
            parciales: pObj ? (pObj.oficial_parciales || undefined) : undefined,
            mvp_candidatos: (cands.length >= 2 ? cands : (pObj.mvp_candidatos || [])),
            mvp_visible: hacerVisible,
            mvp_publicacion_ts: pObj ? pObj.mvp_publicacion_ts : undefined
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (btn) { btn.disabled = false; btn.innerText = oldText; }
        if (d && d.status === 'success') {
            mostrarToast(hacerVisible ? `¡Votación MVP (${cands.length} jugadores) publicada en Cartelera!` : "Votación MVP ocultada de Cartelera (votos conservados).");
        } else {
            mostrarToast(d && d.message ? ("⚠️ " + d.message) : "Guardado con aviso");
        }
        if (typeof window.renderCarteleraHTML === 'function') {
            window.renderCarteleraHTML(window.appData);
        }
    })
    .catch(err => {
        if (btn) { btn.disabled = false; btn.innerText = oldText; }
        console.error("Error al cambiar visibilidad MVP:", err);
        mostrarToast(hacerVisible ? `Votación MVP (${cands.length} jugadores) guardada localmente.` : "Votación MVP ocultada localmente (votos conservados).");
        if (typeof window.renderCarteleraHTML === 'function') {
            window.renderCarteleraHTML(window.appData);
        }
    });
};

window.guardarMvpOficial = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = document.getElementById('btnGuardarMvpOficial');
    const selPart = document.getElementById('directMvpPartidoSelect');
    const idPart = selPart ? selPart.value : '';
    const selOficial = document.getElementById('directMvpOficialSelect');
    const valOficial = selOficial ? selOficial.value : '';
    
    if (!idPart) {
        alert("Por favor selecciona un partido de Superliga.");
        return;
    }
    if (!valOficial) {
        alert("Por favor selecciona qué jugador es el Ganador MVP.");
        return;
    }

    // Recoger hasta 4 estadísticas ingresadas por el usuario
    let collectedStats = [];
    for (let k = 1; k <= 4; k++) {
        let el = document.getElementById(`mvpStat${k}`);
        if (el && el.value.trim()) {
            collectedStats.push(el.value.trim());
        }
    }
    
    if (!window.appData) window.appData = {};
    if (!Array.isArray(window.appData.equipos)) window.appData.equipos = [];
    
    let pObj = window.appData.equipos.find(p => p.id_partido === idPart);
    if (!pObj && window.appData.todos_partidos) {
        pObj = window.appData.todos_partidos.find(p => p.id_partido === idPart);
        if (pObj) window.appData.equipos.unshift(pObj);
    }
    if (pObj) {
        pObj.mvp_oficial = valOficial;
        pObj.mvp_stats = collectedStats;
        pObj.visibilidad = "MOSTRAR";
        pObj.permitido = true;
    }

    // Obtener timestamp de publicación programada (si se indicó en el input)
    const inputPub = document.getElementById('adminMvpFechaPublicacion');
    let targetPubTs = 0;
    if (inputPub && inputPub.value) {
        targetPubTs = new Date(inputPub.value).getTime();
    }
    if (!targetPubTs || isNaN(targetPubTs)) {
        targetPubTs = Date.now();
    }

    if (pObj) {
        pObj.mvp_publicacion_ts = targetPubTs;
        if (typeof window.setLocalMvpPubTs === 'function' && targetPubTs > 0) {
            window.setLocalMvpPubTs(idPart, targetPubTs);
        }
    }

    // Sincronizar únicamente en el partido seleccionado en memoria
    let proclamadoNow = (valOficial && valOficial.trim() !== '') ? Date.now() : 0;
    [window.appData.equipos, window.appData.todos_partidos].forEach(arr => {
        if (Array.isArray(arr)) {
            arr.forEach(p => {
                if (p.id_partido === idPart) {
                    p.mvp_oficial = valOficial;
                    p.mvp_stats = collectedStats;
                    p.mvp_proclamado_ts = proclamadoNow;
                    p.mvp_publicacion_ts = targetPubTs;
                    p.visibilidad = "MOSTRAR";
                }
            });
        }
    });
    
    if (btn) { btn.disabled = true; btn.innerText = "⏳ Guardando..."; }
    
    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'set_mvp_oficial',
            usuario: currentUser,
            password: currentPassword,
            id_partido: idPart,
            mvp_oficial: valOficial,
            mvp_stats: collectedStats,
            mvp_publicacion_ts: targetPubTs
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (btn) { btn.disabled = false; btn.innerText = "👑 Guardar Ganador MVP en BD"; }
        mostrarToast("¡Ganador MVP y estadísticas guardadas con éxito!");
        if (typeof window.recalcularInsigniasMvpLocal === 'function') {
            window.recalcularInsigniasMvpLocal();
        }
        if (typeof window.actualizarBannerEstadoMvp === 'function') {
            window.actualizarBannerEstadoMvp(pObj);
        }
        if (typeof window.renderCarteleraHTML === 'function') {
            window.renderCarteleraHTML(window.appData);
        }
    })
    .catch(err => {
        if (btn) { btn.disabled = false; btn.innerText = "👑 Guardar Ganador MVP en BD"; }
        mostrarToast("Ganador MVP guardado localmente");
        if (typeof window.recalcularInsigniasMvpLocal === 'function') {
            window.recalcularInsigniasMvpLocal();
        }
        if (typeof window.actualizarBannerEstadoMvp === 'function') {
            window.actualizarBannerEstadoMvp(pObj);
        }
        if (typeof window.renderCarteleraHTML === 'function') {
            window.renderCarteleraHTML(window.appData);
        }
    });
};

window.quitarMvpOficial = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const selPart = document.getElementById('directMvpPartidoSelect');
    const idPart = selPart ? selPart.value : '';
    if (!idPart) return;
    
    let pObj = null;
    if (window.appData && Array.isArray(window.appData.equipos)) {
        pObj = window.appData.equipos.find(p => p.id_partido === idPart);
        window.appData.equipos.forEach(p => {
            let cat = (p.categoria || '').toLowerCase();
            if (cat.includes('sm2') || cat.includes('superliga')) {
                p.mvp_oficial = '';
                p.mvp_stats = [];
                p.mvp_publicacion_ts = 0;
            }
        });
    }
    
    const selOficial = document.getElementById('directMvpOficialSelect');
    if (selOficial) selOficial.selectedIndex = 0;
    for (let k = 1; k <= 4; k++) {
        let el = document.getElementById(`mvpStat${k}`);
        if (el) el.value = '';
    }
    
    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'set_mvp_oficial',
            usuario: currentUser,
            password: currentPassword,
            id_partido: idPart,
            mvp_oficial: '',
            mvp_stats: []
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }).catch(e => {});
    
    mostrarToast("Ganador MVP retirado. ¡Vuelve a mostrarse la votación!");
    if (typeof window.recalcularInsigniasMvpLocal === 'function') {
        window.recalcularInsigniasMvpLocal();
    }
    if (typeof window.actualizarBannerEstadoMvp === 'function') {
        window.actualizarBannerEstadoMvp(pObj);
    }
    if (typeof window.renderCarteleraHTML === 'function') {
        window.renderCarteleraHTML(window.appData);
    }
};

window.cargarRecuentoVotosMvp = function() {
    const selPart = document.getElementById('directMvpPartidoSelect');
    const idPart = selPart ? selPart.value : '';
    const cont = document.getElementById('adminRecuentoVotosMvp');
    if (!idPart || !cont) return;
    
    cont.innerHTML = '<span style="color:var(--text-muted);">Consultando votos en la base de datos...</span>';
    
    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'get_mvp_votos_summary',
            usuario: currentUser,
            password: currentPassword,
            id_partido: idPart
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (d && d.status === 'success' && Array.isArray(d.votos) && d.votos.length > 0) {
            let totalGeneral = d.votos.reduce((acc, cur) => acc + (parseInt(cur.total) || 0), 0);
            let items = d.votos.map(v => {
                let pInfo = window.parseCandInfo(v.jugador);
                let pct = totalGeneral > 0 ? Math.round((v.total / totalGeneral) * 100) : 0;
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="font-weight:700; color:#fff;">${pInfo.dorsal ? '#' + pInfo.dorsal + ' ' : ''}${pInfo.apodo}:</span>
                    <span style="font-weight:800; color:var(--secondary-color);">${v.total} votos (${pct}%)</span>
                </div>`;
            }).join('');
            cont.innerHTML = `<div style="margin-top:4px;">${items}<div style="text-align:right; margin-top:4px; font-weight:800; color:var(--text-muted); font-size:0.7rem;">Total: ${totalGeneral} votos</div></div>`;
        } else {
            cont.innerHTML = '<span style="color:var(--text-muted);">Aún no hay votos registrados por aficionados para este partido.</span>';
        }
    })
    .catch(() => {
        cont.innerHTML = '<span style="color:#e74c3c;">No se pudo conectar para obtener los votos.</span>';
    });
};

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
        body: JSON.stringify({ 
            action: 'save_resultado_admin', 
            usuario: currentUser, 
            password: currentPassword, 
            id_partido: idPart, 
            sets: sets, 
            parciales: parc, 
            streaming: stream
        }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    })
    .then(res => res.json())
    .then(d => {
        btn.disabled = false; btn.innerText = "Guardar Cambios";
        if(window.appData) {
            ['equipos', 'todos_partidos'].forEach(arrKey => {
                if (Array.isArray(window.appData[arrKey])) {
                    let eq = window.appData[arrKey].find(p => p.id_partido === idPart);
                    if (eq) {
                        if (sets) {
                            eq.oficial_sets = sets;
                            eq.estado = 'CERRADO';
                        }
                        if (parc) eq.oficial_parciales = parc;
                        if (stream) eq.streaming = stream;
                        eq.actualizado_por = currentUser;
                        eq.actualizado_fecha = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
                    }
                }
            });
        }
        if (typeof window.renderCarteleraHTML === 'function' && window.appData) {
            window.renderCarteleraHTML(window.appData);
        }
        if(d.status === "success") { 
            mostrarToast("Guardado correctamente en la BD"); 
            if (window.appData && Array.isArray(window.appData.equipos) && typeof renderAdminPanel === 'function') {
                renderAdminPanel(window.appData.equipos);
            }
        } else { 
            mostrarToast("⚠️ " + (d.message || "Error al guardar en el servidor")); 
        }
    })
    .catch(err => {
        console.error("Error al guardar resultado:", err);
        btn.disabled = false; btn.innerText = "Guardar Cambios";
        mostrarToast("❌ Error de red: " + (err.message || "No se pudo conectar"));
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
// GESTOR DE PERMISOS (MVP Y RESULTADOS POR EQUIPO)
// ------------------------------------------------------------------
window.cargarListaPermisosUsuarios = function() {
    const box = document.getElementById('adminListaUsuariosPermisos');
    const btn = document.getElementById('btnCargarPermisosUsuarios');
    if (!box) return;
    box.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding:10px;">⏳ Cargando usuarios y permisos...</div>';
    if (btn) btn.disabled = true;

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'get_usuarios_permisos',
            usuario: currentUser,
            password: currentPassword
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (btn) btn.disabled = false;
        if (d.status !== 'success' || !Array.isArray(d.usuarios)) {
            box.innerHTML = `<div style="color:#e74c3c; font-size:0.75rem; padding:8px;">${d.message || 'Error al cargar usuarios.'}</div>`;
            return;
        }

        const buscadorCont = document.getElementById('adminBuscadorPermisosCont');
        if (buscadorCont) buscadorCont.style.display = 'block';
        const txtFiltro = document.getElementById('filtroPermisosUsuarios');
        if (txtFiltro) txtFiltro.value = '';

        if (d.usuarios.length === 0) {
            box.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem; padding:8px;">No hay usuarios registrados.</div>';
            return;
        }

        let h = '';
        let availableTeams = (Array.isArray(d.equipos_disponibles) && d.equipos_disponibles.length > 0)
            ? d.equipos_disponibles
            : ((window.appData && Array.isArray(window.appData.equipos_totales_publicos)) ? window.appData.equipos_totales_publicos : ['VCV', 'CyL Palencia 2028']);

        // Guardar referencia en memoria para el buscador o selección
        window._adminEquiposDisponibles = availableTeams;

        d.usuarios.forEach((u, idx) => {
            let isMvp = (u.permiso_mvp === 'X');
            let resVal = (u.permiso_resultados || '').trim();
            let isRoot = (u.admin_web === 'X');

            // Parsear equipos que ya tiene asignados
            let assignedList = resVal.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            let hasAll = (resVal === 'TODOS' || resVal === 'X');

            let teamPills = availableTeams.map((team, tIdx) => {
                let isChecked = hasAll || assignedList.includes(team.toLowerCase());
                return `
                <label style="display:inline-flex; align-items:center; gap:4px; background:var(--bg-card); border:1px solid var(--border-color); padding:3px 7px; border-radius:12px; font-size:0.7rem; cursor:pointer; user-select:none;">
                    <input type="checkbox" class="team_chk_${idx}" value="${team.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:12px; height:12px;">
                    <span>${team}</span>
                </label>`;
            }).join('');

            let searchAttr = `${(u.usuario || '').toLowerCase()} ${(u.nombre_real || '').toLowerCase()}`;

            h += `
            <div class="user-perm-card" data-search="${searchAttr}" style="background:var(--bg-general); border:1px solid var(--border-color); border-radius:8px; padding:12px; font-size:0.78rem; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:var(--secondary-color); font-size:0.85rem;">@${u.usuario}</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted); margin-left:6px;">${u.nombre_real}</span>
                    </div>
                    ${isRoot ? '<span style="font-size:0.65rem; background:#e67e22; color:#fff; padding:2px 6px; border-radius:4px; font-weight:800;">ADMIN ROOT</span>' : ''}
                </div>
                
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; cursor:pointer; margin:0; background:rgba(230,126,34,0.1); border:1px solid rgba(230,126,34,0.3); padding:4px 8px; border-radius:6px;">
                        <input type="checkbox" id="perm_mvp_${idx}" ${isMvp ? 'checked' : ''} style="cursor:pointer;">
                        <span>⭐ <b>Gestor MVP Superliga</b> (candidatos y oficial)</span>
                    </label>
                </div>

                <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                        <span style="font-size:0.72rem; font-weight:700; color:var(--text-main);">🏐 Equipos para Resultados y Links:</span>
                        <div style="display:flex; gap:6px;">
                            <button type="button" onclick="window.toggleAllUserTeams(${idx}, true)" class="btn" style="padding:2px 6px; font-size:0.65rem; background:transparent; border:1px solid var(--border-color); border-radius:4px; cursor:pointer; color:var(--text-muted);">
                                Marcar Todos
                            </button>
                            <button type="button" onclick="window.toggleAllUserTeams(${idx}, false)" class="btn" style="padding:2px 6px; font-size:0.65rem; background:transparent; border:1px solid var(--border-color); border-radius:4px; cursor:pointer; color:var(--text-muted);">
                                Desmarcar
                            </button>
                        </div>
                    </div>

                    <div style="display:flex; flex-wrap:wrap; gap:5px; max-height:130px; overflow-y:auto; padding:6px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:6px;">
                        ${teamPills}
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end; margin-top:4px;">
                    <button type="button" id="btn_save_perm_${idx}" class="btn" onclick="window.guardarPermisosUsuarioEspecifico('${u.usuario.replace(/'/g, "\\'")}', ${idx})" style="padding:6px 14px; font-size:0.75rem; background:rgba(230,126,34,0.15); border:1px solid #e67e22; color:#e67e22; font-weight:800; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                        💾 Guardar Permisos
                    </button>
                </div>
            </div>`;
        });

        box.innerHTML = h;
    })
    .catch(err => {
        if (btn) btn.disabled = false;
        box.innerHTML = '<div style="color:#e74c3c; font-size:0.75rem; padding:8px;">Error de conexión.</div>';
    });
};

window.filtrarUsuariosPermisos = function(query) {
    const q = (query || '').toLowerCase().trim();
    const cards = document.querySelectorAll('.user-perm-card');
    cards.forEach(card => {
        const s = card.getAttribute('data-search') || '';
        if (!q || s.includes(q)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};

window.toggleAllUserTeams = function(idx, checkAll) {
    const cbs = document.querySelectorAll(`.team_chk_${idx}`);
    cbs.forEach(cb => { cb.checked = Boolean(checkAll); });
};

window.guardarPermisosUsuarioEspecifico = function(targetUser, idx) {
    const chkMvp = document.getElementById(`perm_mvp_${idx}`);
    const btn = document.getElementById(`btn_save_perm_${idx}`);
    if (!chkMvp) return;

    const valMvp = chkMvp.checked ? 'X' : '';

    // Recoger equipos seleccionados
    const cbs = document.querySelectorAll(`.team_chk_${idx}:checked`);
    const allCbs = document.querySelectorAll(`.team_chk_${idx}`);
    let valRes = '';
    
    if (cbs.length > 0) {
        if (allCbs.length > 0 && cbs.length === allCbs.length) {
            valRes = 'TODOS';
        } else {
            valRes = Array.from(cbs).map(cb => cb.value.trim()).join(', ');
        }
    }

    const oldBtnText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerText = "⏳ Guardando..."; }

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'save_usuario_permisos',
            usuario: currentUser,
            password: currentPassword,
            target_usuario: targetUser,
            permiso_mvp: valMvp,
            permiso_resultados: valRes
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (btn) { btn.disabled = false; btn.innerHTML = oldBtnText; }
        if (d.status === 'success') {
            mostrarToast(d.message || "Permisos guardados con éxito.");
        } else {
            alert("Error: " + (d.message || "No se pudieron guardar los permisos."));
        }
    })
    .catch(err => {
        if (btn) { btn.disabled = false; btn.innerHTML = oldBtnText; }
        alert("Error de conexión al guardar permisos.");
    });
};
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


const btnChangePwdEl = document.getElementById('btnChangePwd');
if (btnChangePwdEl) btnChangePwdEl.addEventListener('click', function(e) {
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
const btnReqNameEl = document.getElementById('btnReqName');
if (btnReqNameEl) btnReqNameEl.addEventListener('click', function(e) {
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

// FUNCIONES DEL MONITOR SILENCIOSO DE ACCESOS (ADMIN)
// -------------------------------------------------------------
window.cargarDatosMonitor = function(selectedUser) {
    const cont = document.getElementById('adminMonitorContenido');
    if (!cont) return;
    cont.innerHTML = '<div style="text-align:center; padding:10px;">⏳ Consultando accesos en la base de datos...</div>';

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'get_monitor_data',
            usuario: currentUser,
            password: currentPassword,
            target_user: selectedUser || ''
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (d.status !== 'success') {
            cont.innerHTML = `<div style="color:#e74c3c; padding:8px;">${d.message || 'Error al cargar monitor'}</div>`;
            return;
        }

        const vigilados = d.vigilados || [];
        const logs = d.logs || [];

        if (vigilados.length === 0) {
            cont.innerHTML = '<div style="background:rgba(255,255,255,0.03); border:1px dashed var(--border-color); border-radius:8px; padding:12px; text-align:center;">No hay usuarios en seguimiento actualmente. Añade el usuario de la persona que quieras supervisar arriba.</div>';
            return;
        }

        let activeTarget = selectedUser || (vigilados[0] ? vigilados[0].usuario : '');

        let h = '<div style="margin-bottom:10px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">';
        h += '<span style="font-weight:bold; color:var(--text-muted); font-size:0.75rem;">Vigilados:</span>';
        vigilados.forEach(v => {
            let isCurrent = (v.usuario === activeTarget);
            h += `<button type="button" onclick="window.cargarDatosMonitor('${v.usuario}')" style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:bold; cursor:pointer; border:1px solid ${isCurrent ? '#2ecc71' : 'var(--border-color)'}; background:${isCurrent ? 'rgba(46,204,113,0.2)' : 'var(--bg-input)'}; color:${isCurrent ? '#2ecc71' : 'var(--text-main)'};">
                @${v.usuario}
            </button>`;
        });
        h += '</div>';

        // Detalle del usuario seleccionado
        h += `<div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:8px; padding:10px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-weight:900; color:#2ecc71; font-size:0.82rem;">📊 Accesos de @${activeTarget} (${logs.length} registrados)</span>
                <button type="button" onclick="window.eliminarUsuarioMonitor('${activeTarget}')" style="background:transparent; color:#e74c3c; border:1px solid rgba(231,76,60,0.3); border-radius:4px; padding:2px 6px; font-size:0.68rem; cursor:pointer;">
                    Dejar de vigilar
                </button>
            </div>`;

        if (logs.length === 0) {
            h += '<div style="color:var(--text-muted); font-size:0.72rem; padding:8px 0;">No se han registrado inicios de sesión aún para este usuario desde que se activó el seguimiento.</div>';
        } else {
            h += '<div style="max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; padding-right:4px;">';
            logs.forEach(l => {
                let dispTexto = l.dispositivo || 'Desconocido';
                if (dispTexto.startsWith('Mozilla/5.0')) {
                    if (dispTexto.includes('iPhone')) {
                        let m = dispTexto.match(/OS (\d+[_.\d]+)/i);
                        dispTexto = `📱 iPhone (${m ? 'iOS ' + m[1].replace(/_/g, '.') : 'iOS'})`;
                    } else if (dispTexto.includes('Android')) {
                        let m = dispTexto.match(/Android\s*([0-9.]+)/i);
                        dispTexto = `📱 Android (${m ? 'v' + m[1] : ''})`;
                    } else if (dispTexto.includes('Windows')) {
                        dispTexto = '💻 PC Windows';
                    } else if (dispTexto.includes('Macintosh')) {
                        dispTexto = '💻 Mac';
                    } else {
                        dispTexto = dispTexto.includes('Mobile') ? '📱 Móvil' : '💻 Ordenador';
                    }
                }
                h += `<div style="background:var(--bg-general); border:1px solid var(--border-color); border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <div>
                        <div style="font-weight:bold; color:var(--text-main); font-size:0.75rem;">${l.fecha_hora || 'Fecha desconocida'}</div>
                        <div style="color:var(--text-muted); font-size:0.65rem;" title="${(l.dispositivo || '').replace(/"/g, '&quot;')}">${l.origen || 'Acceso'} • <span style="color:var(--text-main); font-weight:600;">${dispTexto}</span></div>
                    </div>
                    <span style="font-size:0.65rem; background:rgba(46,204,113,0.15); color:#2ecc71; padding:2px 6px; border-radius:4px; font-weight:800;">OK</span>
                </div>`;
            });
            h += '</div>';
        }
        h += '</div>';

        cont.innerHTML = h;
    })
    .catch(err => {
        cont.innerHTML = `<div style="color:#e74c3c; padding:8px;">Error: ${err.message}</div>`;
    });
};

window.agregarUsuarioMonitor = function() {
    const input = document.getElementById('inputMonitorNuevoUsuario');
    if (!input) return;
    const target = input.value.trim().replace(/^@/, '');
    if (!target) { alert('Introduce el nombre de usuario'); return; }

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'toggle_monitor_user',
            usuario: currentUser,
            password: currentPassword,
            target_user: target,
            activo: 1
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (d.status === 'success') {
            mostrarToast(d.message);
            input.value = '';
            window.cargarDatosMonitor(target);
        } else {
            alert(d.message || 'Error');
        }
    });
};

window.eliminarUsuarioMonitor = function(user) {
    if (!confirm(`¿Seguro que deseas dejar de registrar los accesos de @${user}?`)) return;

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'toggle_monitor_user',
            usuario: currentUser,
            password: currentPassword,
            target_user: user,
            remove: true
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (d.status === 'success') {
            mostrarToast(d.message);
            window.cargarDatosMonitor();
        } else {
            alert(d.message || 'Error');
        }
    });
};

