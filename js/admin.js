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
    if (window.appData && window.appData.modo_mantenimiento !== undefined) {
        if (typeof window.adminActualizarUiMantenimiento === 'function') {
            window.adminActualizarUiMantenimiento(window.appData.modo_mantenimiento);
        }
    }
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
            <div class="admin-match-box alerta-pendiente-resultado" style="background: linear-gradient(to right, rgba(231, 76, 60, 0.12), var(--bg-general)); border: 2px solid #e74c3c; border-radius: 8px; padding: 12px; margin-bottom: 14px; box-shadow: 0 0 15px rgba(231, 76, 60, 0.25); max-width: 100%; box-sizing: border-box; overflow-x: hidden;">
                <div style="background:#e74c3c; color:#fff; font-size:0.72rem; font-weight:900; padding:3px 8px; border-radius:4px; display:inline-flex; align-items:center; gap:5px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px; max-width: 100%; flex-wrap: wrap;">
                    <i class="fas fa-exclamation-triangle"></i> PARTIDO FINALIZADO SIN RESULTADO OFICIAL
                </div>` : `
            <div class="admin-match-box" style="background: var(--bg-general); border: 1px solid rgba(230,126,34,0.3); border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); max-width: 100%; box-sizing: border-box; overflow-x: hidden;">`}
                <div style="font-weight:bold; margin-bottom:8px; color: var(--text-main); font-size: 0.9rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <span style="min-width:0; flex:1 1 180px; word-break:break-word;">${adminLocal} <span style="color:var(--text-muted);">vs</span> ${adminVisit} ${visBadge}</span>
                    <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                        ${jornadaBadge ? `<span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; background:rgba(230,126,34,0.15); color:#e67e22; font-weight:800;">${jornadaBadge}</span>` : ''}
                        <span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; background:var(--bg-card-alt); color:var(--secondary-color); font-weight:800;">${eq.categoria || ''}</span>
                    </div>
                </div>
                
                <!-- SECCIÓN RESULTADOS -->
                <div style="margin-bottom: 8px; border-left: 2px solid var(--vcv-morado); padding-left: 8px;">
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Resultado Final (Sets)</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="number" id="adm_sets_loc_${eq.id_partido}" class="form-control" placeholder="Sets Local" value="${eq.oficial_sets ? eq.oficial_sets.split('-')[0] : ''}" style="flex:1 1 50px; min-width:0; width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); text-align:center;">
                        <span style="color: var(--text-muted);">-</span>
                        <input type="number" id="adm_sets_vis_${eq.id_partido}" class="form-control" placeholder="Sets Visitante" value="${eq.oficial_sets ? (eq.oficial_sets.split('-')[1] || '') : ''}" style="flex:1 1 50px; min-width:0; width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); text-align:center;">
                    </div>
                    <input type="text" id="adm_parc_${eq.id_partido}" class="form-control" placeholder="Parciales (ej: 25-20, 25-22...)" value="${eq.oficial_parciales || ''}" style="width: 100%; max-width: 100%; box-sizing: border-box; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); margin-top: 6px;">
                </div>

                <!-- SECCIÓN STREAMING -->
                <div style="margin-bottom: 8px; border-left: 2px solid #e67e22; padding-left: 8px;">
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Link Streaming Oficial</label>
                    <input type="text" id="adm_stream_${eq.id_partido}" class="form-control" placeholder="URL de YouTube/Twitch/etc." value="${eq.streaming || ''}" style="width: 100%; max-width: 100%; box-sizing: border-box; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main);">
                </div>

                <!-- SECCIÓN ACTA OFICIAL -->
                <div style="margin-bottom: 8px; border-left: 2px solid #3498db; padding-left: 8px;">
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Link Acta Oficial (RFEVB / Federación)</label>
                    <input type="text" id="adm_acta_${eq.id_partido}" class="form-control" placeholder="https://... (enlace al acta oficial)" value="${eq.acta || ''}" style="width: 100%; max-width: 100%; box-sizing: border-box; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main);">
                </div>

                <!-- SECCIÓN ESTADÍSTICAS OFICIALES -->
                <div style="margin-bottom: 8px; border-left: 2px solid #9b59b6; padding-left: 8px;">
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Link Estadísticas Oficiales (DataProject / RFEVB)</label>
                    <input type="text" id="adm_stats_${eq.id_partido}" class="form-control" placeholder="https://... (enlace a estadísticas)" value="${eq.stats_url || ''}" style="width: 100%; max-width: 100%; box-sizing: border-box; padding: 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main);">
                </div>

${eq.actualizado_por ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:6px; display:flex; align-items:center; gap:4px;">
                    <i class="fas fa-user-edit" style="color:#e67e22;"></i>
                    <span>Resultado anotado por <strong style="color:var(--text-main);">@${eq.actualizado_por}</strong>${eq.actualizado_fecha ? ` (${eq.actualizado_fecha})` : ''}</span>
                </div>` : ''}
                <button class="btn" style="width: 100%; padding: 8px; font-size: 0.8rem; background: #e67e22; color: #fff; border: none; border-radius: 6px; font-weight: bold; margin-top: 4px; box-shadow: 0 4px 6px rgba(230,126,34,0.2);" onclick="guardarResultadoAdmin(event, '${eq.id_partido}')">
                    Guardar Cambios
                </button>
                <button type="button" class="btn" id="btn_export_pdf_${eq.id_partido}" style="width: 100%; padding: 7px 10px; font-size: 0.78rem; background: rgba(93, 23, 137, 0.22); color: #dcd6f7; border: 1px solid rgba(142, 68, 173, 0.5); border-radius: 6px; font-weight: 700; margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: all 0.2s;" onclick="window.adminExportarPdfPartido(event, '${eq.id_partido}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#e74c3c;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>Exportar PDF Pronósticos</span>
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
    if (typeof window.adminInicializarSeccionPredicciones === 'function') {
        window.adminInicializarSeccionPredicciones();
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
    // 2. Coincidencia canónica (dorsal numérico / apodo / nombre normalizado)
    if (typeof window.isSameMvpPlayer === 'function') {
        for (let i = 0; i < selectEl.options.length; i++) {
            let optVal = selectEl.options[i].value;
            if (optVal && window.isSameMvpPlayer(optVal, rawVal)) {
                selectEl.selectedIndex = i;
                return;
            }
        }
    }
    // 3. Fallback por dorsal numérico exacto (#X)
    let m = String(rawVal).match(/#(\d+)\b/);
    if (m) {
        let dor = parseInt(m[1], 10);
        for (let i = 0; i < selectEl.options.length; i++) {
            let om = String(selectEl.options[i].value).match(/#(\d+)\b/);
            if (om && parseInt(om[1], 10) === dor) {
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
    d.setHours(12, 0, 0, 0);   // A las 12:00 de la mañana (cierre de votación)
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

window.getMvpFechaDefaultManana15 = function() {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Día siguiente
    d.setHours(15, 0, 0, 0);   // A las 15:00 de la tarde (publicación del ganador)
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

window.guardarSoloHoraPublicacionMvp = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = document.getElementById('btnGuardarHoraMvp');
    const selPart = document.getElementById('directMvpPartidoSelect');
    const idPart = selPart ? selPart.value : '';
    const inputCierre = document.getElementById('adminMvpFechaCierre');
    const inputPub = document.getElementById('adminMvpFechaPublicacion');

    if (!idPart) {
        alert("Por favor selecciona un partido de Superliga.");
        return;
    }

    let targetCierreTs = 0;
    if (inputCierre && inputCierre.value) {
        targetCierreTs = new Date(inputCierre.value).getTime();
    }
    let targetPubTs = 0;
    if (inputPub && inputPub.value) {
        targetPubTs = new Date(inputPub.value).getTime();
    }

    if (!targetCierreTs || isNaN(targetCierreTs)) {
        targetCierreTs = Date.now();
    }
    if (!targetPubTs || isNaN(targetPubTs)) {
        targetPubTs = targetCierreTs + 3 * 3600000; // 3 horas después por defecto
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
    if (typeof window.setLocalMvpCierreTs === 'function') {
        window.setLocalMvpCierreTs(idPart, targetCierreTs);
    }
    if (pObj) {
        pObj.mvp_cierre_votacion_ts = targetCierreTs;
        pObj.mvp_publicacion_ts = targetPubTs;
        pObj.mvp_visible = true;
        pObj.visibilidad = 'MOSTRAR';
    }
    if (Array.isArray(window.appData.todos_partidos)) {
        window.appData.todos_partidos.forEach(p => {
            if (p.id_partido === idPart) {
                p.mvp_cierre_votacion_ts = targetCierreTs;
                p.mvp_publicacion_ts = targetPubTs;
            }
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
            mvp_cierre_votacion_ts: targetCierreTs,
            mvp_publicacion_ts: targetPubTs
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Guardar Horarios de Votación y Publicación"; }
        mostrarToast("¡Horarios de cierre y publicación guardados con éxito!");
        if (typeof window.actualizarBannerEstadoMvp === 'function') {
            window.actualizarBannerEstadoMvp(pObj);
        }
        if (typeof window.renderCarteleraHTML === 'function') {
            window.renderCarteleraHTML(window.appData);
        }
    })
    .catch(err => {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Guardar Horarios de Votación y Publicación"; }
        mostrarToast("Horarios guardados localmente");
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

    // Buscar si el partido ya tiene candidatos o ganador MVP
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

    // Actualizar opciones del ganador MVP para que SOLO salgan los candidatos seleccionados
    window.actualizarOpcionesMvpOficial(matchObj ? matchObj.mvp_oficial : '');

    // Cargar horarios programados: Cierre de votación (12:00) y Publicación (15:00)
    const pad = n => String(n).padStart(2, '0');
    const inputCierre = document.getElementById('adminMvpFechaCierre');
    if (inputCierre) {
        if (matchObj && matchObj.mvp_cierre_votacion_ts && matchObj.mvp_cierre_votacion_ts > 0) {
            const d = new Date(matchObj.mvp_cierre_votacion_ts);
            inputCierre.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } else if (matchObj && matchObj.mvp_publicacion_ts && matchObj.mvp_publicacion_ts > 0) {
            const d = new Date(matchObj.mvp_publicacion_ts - 3 * 3600000);
            inputCierre.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } else {
            inputCierre.value = window.getMvpFechaDefaultManana12();
        }
    }

    const inputPub = document.getElementById('adminMvpFechaPublicacion');
    if (inputPub) {
        if (matchObj && matchObj.mvp_publicacion_ts && matchObj.mvp_publicacion_ts > 0) {
            const d = new Date(matchObj.mvp_publicacion_ts);
            inputPub.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } else {
            inputPub.value = window.getMvpFechaDefaultManana15();
        }
    }

    // Actualizar banner de estado visual de este partido
    window.actualizarBannerEstadoMvp(matchObj);

    // Cargar recuento de votos del partido para uso exclusivo del panel admin
    if (typeof window.cargarRecuentoVotosMvp === 'function') {
        window.cargarRecuentoVotosMvp();
    }
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

    // Fallback: Si s1, s2, s3 aún no tienen valor, buscar en matchObj.mvp_candidatos
    const selPart = document.getElementById('directMvpPartidoSelect');
    const idPart = selPart ? selPart.value : '';
    let matchObj = null;
    if (idPart && window.appData) {
        if (Array.isArray(window.appData.equipos)) matchObj = window.appData.equipos.find(p => p.id_partido === idPart);
        if (!matchObj && Array.isArray(window.appData.todos_partidos)) matchObj = window.appData.todos_partidos.find(p => p.id_partido === idPart);
    }
    if (candidatosActivos.length === 0 && matchObj && Array.isArray(matchObj.mvp_candidatos)) {
        candidatosActivos = matchObj.mvp_candidatos.filter(Boolean);
    }

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

    if (selActual && candidatosActivos.some(c => (typeof window.isSameMvpPlayer === 'function') ? window.isSameMvpPlayer(c, selActual) : c === selActual)) {
        window.setSelectValueSafely(sOficial, selActual);
    } else {
        sOficial.selectedIndex = 0;
    }

    // Actualizar también el selector de ganador para la tarjeta del club (redes/Instagram)
    const sCardWinner = document.getElementById('adminMvpCardWinnerSelect');
    if (sCardWinner) {
        const plantilla = (typeof window.getPlantillaSuperligaActual === 'function') ? window.getPlantillaSuperligaActual() : ((window.appData && window.appData.plantilla_superliga) || []);
        let prevCardVal = sCardWinner.value;
        let hCard = '';

        if (candidatosActivos.length > 0) {
            hCard += '<optgroup label="⭐ Nominados del Partido">';
            candidatosActivos.forEach(cand => {
                let info = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(cand) : { dorsal: '', apodo: cand, posicion: '' };
                let etiqueta = (info.dorsal ? '#' + info.dorsal + ' ' : '') + info.apodo;
                hCard += `<option value="${cand}">👑 ${etiqueta} (Nominado)</option>`;
            });
            hCard += '</optgroup>';

            // Añadir el resto de jugadores de la plantilla para que siempre se pueda elegir cualquiera
            let restPlantilla = plantilla.filter(pj => {
                let dor = pj.dorsal;
                let candFallback = `#${dor} ${pj.nombre || ''}`;
                return !candidatosActivos.some(c => (typeof window.isSameMvpPlayer === 'function')
                    ? window.isSameMvpPlayer(c, candFallback)
                    : (window.parseCandInfo && window.parseCandInfo(c).dorsal === dor));
            });

            if (restPlantilla.length > 0) {
                hCard += '<optgroup label="🏐 Resto de la Plantilla">';
                restPlantilla.forEach(pj => {
                    let valStr = `#${pj.dorsal} ${pj.nombre}${pj.apodo ? ' (' + pj.apodo + ')' : ''}${pj.posicion ? ' [' + pj.posicion + ']' : ''}`;
                    hCard += `<option value="${valStr}">#${pj.dorsal} ${pj.apodo || pj.nombre}</option>`;
                });
                hCard += '</optgroup>';
            }
        } else {
            // No hay nominados activos aún: mostrar toda la plantilla directamente para que nunca esté vacío
            hCard += '<optgroup label="🏐 Jugadores Plantilla Superliga 2">';
            plantilla.forEach(pj => {
                let valStr = `#${pj.dorsal} ${pj.nombre}${pj.apodo ? ' (' + pj.apodo + ')' : ''}${pj.posicion ? ' [' + pj.posicion + ']' : ''}`;
                hCard += `<option value="${valStr}">👑 #${pj.dorsal} ${pj.apodo || pj.nombre}</option>`;
            });
            hCard += '</optgroup>';
        }

        sCardWinner.innerHTML = hCard;

        if (prevCardVal) {
            window.setSelectValueSafely(sCardWinner, prevCardVal);
        } else if (selActual) {
            window.setSelectValueSafely(sCardWinner, selActual);
        } else if (candidatosActivos.length > 0) {
            window.setSelectValueSafely(sCardWinner, candidatosActivos[0]);
        } else if (sCardWinner.options.length > 0) {
            sCardWinner.selectedIndex = 0;
        }
    }

    if (typeof window.renderRecuentoVotosMvpFromCache === 'function' && window._adminMvpRawVotesCache && idPart && window._adminMvpRawVotesCache[idPart] !== undefined) {
        window.renderRecuentoVotosMvpFromCache();
    }
};

window.onMvpCardWinnerSelectChange = function(val) {
    window.currentShareWinnerOverride = val;
};

window.actualizarBannerEstadoMvp = function(matchObj) {
    const badge = document.getElementById('adminMvpEstadoBadge');
    if (!badge) return;
    
    let isVisible = matchObj && matchObj.mvp_visible !== false && matchObj.mvp_visible !== 'OCULTAR';
    let cands = (matchObj && Array.isArray(matchObj.mvp_candidatos)) ? matchObj.mvp_candidatos.filter(Boolean) : [];
    let hasOficial = Boolean(matchObj && matchObj.mvp_oficial);
    
    let targetPubTs = (matchObj && matchObj.mvp_publicacion_ts) ? parseInt(matchObj.mvp_publicacion_ts) : 0;
    let targetCierreTs = (matchObj && matchObj.mvp_cierre_votacion_ts) ? parseInt(matchObj.mvp_cierre_votacion_ts) : 0;
    if (!targetCierreTs && targetPubTs > 0) {
        let d = new Date(targetPubTs);
        if (d.getHours() === 12) targetCierreTs = targetPubTs;
        else { let d12 = new Date(targetPubTs); d12.setHours(12, 0, 0, 0); targetCierreTs = d12.getTime(); }
    }
    let now = Date.now();
    let isPendingPublication = hasOficial && targetPubTs > now;

    const pad = n => String(n).padStart(2, '0');

    if (hasOficial && !isPendingPublication) {
        let winInfo = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(matchObj.mvp_oficial) : { apodo: matchObj.mvp_oficial };
        badge.innerText = `👑 GANADOR MVP PUBLICADO (${winInfo.apodo || matchObj.mvp_oficial})`;
        badge.style.background = 'rgba(46, 204, 113, 0.2)';
        badge.style.color = '#2ecc71';
        badge.style.border = '1px solid #2ecc71';
    } else if (hasOficial && isPendingPublication) {
        const dObj = new Date(targetPubTs);
        const horaStr = `${pad(dObj.getHours())}:${pad(dObj.getMinutes())}`;
        badge.innerText = `⏳ GANADOR PROGRAMADO (se publica a las ${horaStr})`;
        badge.style.background = 'rgba(212, 175, 55, 0.2)';
        badge.style.color = 'var(--secondary-color)';
        badge.style.border = '1px solid var(--secondary-color)';
    } else if (isVisible && (cands.length === 2 || cands.length === 3)) {
        if (targetCierreTs > now) {
            const dCierre = new Date(targetCierreTs);
            const horaCierre = `${pad(dCierre.getHours())}:${pad(dCierre.getMinutes())}`;
            badge.innerText = `🟢 VOTACIÓN ABIERTA (cierra a las ${horaCierre})`;
            badge.style.background = 'rgba(46, 204, 113, 0.2)';
            badge.style.color = '#2ecc71';
            badge.style.border = '1px solid #2ecc71';
        } else {
            const dPub = targetPubTs ? new Date(targetPubTs) : null;
            const horaPub = dPub ? `${pad(dPub.getHours())}:${pad(dPub.getMinutes())}` : '15:00';
            badge.innerText = `🔒 VOTACIÓN CERRADA (Ganador pendiente para las ${horaPub})`;
            badge.style.background = 'rgba(230, 126, 34, 0.2)';
            badge.style.color = '#e67e22';
            badge.style.border = '1px solid #e67e22';
        }
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
        // Leer horarios configurados en pantalla o preestablecer por defecto
        const inputCierreEl = document.getElementById('adminMvpFechaCierre');
        const inputPubEl = document.getElementById('adminMvpFechaPublicacion');
        if (inputCierreEl && inputCierreEl.value) {
            pObj.mvp_cierre_votacion_ts = new Date(inputCierreEl.value).getTime();
        } else if (!pObj.mvp_cierre_votacion_ts || pObj.mvp_cierre_votacion_ts <= 0) {
            const dManana12 = new Date();
            dManana12.setDate(dManana12.getDate() + 1);
            dManana12.setHours(12, 0, 0, 0);
            pObj.mvp_cierre_votacion_ts = dManana12.getTime();
            if (inputCierreEl) inputCierreEl.value = window.getMvpFechaDefaultManana12();
        }
        if (inputPubEl && inputPubEl.value) {
            pObj.mvp_publicacion_ts = new Date(inputPubEl.value).getTime();
        } else if (!pObj.mvp_publicacion_ts || pObj.mvp_publicacion_ts <= 0) {
            const dManana15 = new Date();
            dManana15.setDate(dManana15.getDate() + 1);
            dManana15.setHours(15, 0, 0, 0);
            pObj.mvp_publicacion_ts = dManana15.getTime();
            if (inputPubEl) inputPubEl.value = window.getMvpFechaDefaultManana15();
        }
        if (typeof window.setLocalMvpPubTs === 'function') window.setLocalMvpPubTs(idPart, pObj.mvp_publicacion_ts);
        if (typeof window.setLocalMvpCierreTs === 'function') window.setLocalMvpCierreTs(idPart, pObj.mvp_cierre_votacion_ts);
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
                    p.mvp_cierre_votacion_ts = pObj.mvp_cierre_votacion_ts;
                    p.mvp_publicacion_ts = pObj.mvp_publicacion_ts;
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
            mvp_cierre_votacion_ts: pObj ? pObj.mvp_cierre_votacion_ts : undefined,
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

    const targetMostrarPct = false;
    
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
        pObj.mvp_mostrar_porcentajes = targetMostrarPct;
        pObj.visibilidad = "MOSTRAR";
        pObj.permitido = true;
    }

    // Comprobar si se ha marcado publicar inmediatamente o según la hora programada (por defecto 15:00)
    const chkInmediato = document.getElementById('adminMvpPublicarInmediato');
    const inputPub = document.getElementById('adminMvpFechaPublicacion');
    let targetPubTs = 0;
    if (chkInmediato && chkInmediato.checked) {
        targetPubTs = Date.now();
    } else if (inputPub && inputPub.value) {
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
                    p.mvp_mostrar_porcentajes = targetMostrarPct;
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
            mvp_publicacion_ts: targetPubTs,
            mvp_mostrar_porcentajes: targetMostrarPct
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (btn) { btn.disabled = false; btn.innerText = "👑 Guardar Ganador MVP en BD"; }
        if (d && Array.isArray(d.recuento)) {
            [window.appData.equipos, window.appData.todos_partidos].forEach(arr => {
                if (Array.isArray(arr)) {
                    arr.forEach(p => {
                        if (p.id_partido === idPart) p.mvp_votos_recuento = d.recuento;
                    });
                }
            });
            window._adminMvpRawVotesCache = window._adminMvpRawVotesCache || {};
            window._adminMvpRawVotesCache[idPart] = d.recuento;
            if (typeof window.renderRecuentoVotosMvpFromCache === 'function') {
                window.renderRecuentoVotosMvpFromCache();
            }
        } else if (typeof window.cargarRecuentoVotosMvp === 'function') {
            window.cargarRecuentoVotosMvp();
        }
        if (targetPubTs <= Date.now()) {
            mostrarToast("¡Ganador MVP publicado de inmediato en Cartelera!");
        } else {
            const dPub = new Date(targetPubTs);
            const pad = n => String(n).padStart(2, '0');
            mostrarToast(`¡Ganador MVP guardado! Se publicará a las ${pad(dPub.getHours())}:${pad(dPub.getMinutes())}.`);
        }
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

window._adminMvpRawVotesCache = window._adminMvpRawVotesCache || {};

window.renderRecuentoVotosMvpFromCache = function() {
    const selPart = document.getElementById('directMvpPartidoSelect');
    const idPart = selPart ? selPart.value : '';
    const cont = document.getElementById('adminRecuentoVotosMvp');
    if (!idPart || !cont) return;

    let matchObj = null;
    if (window.appData && Array.isArray(window.appData.equipos)) matchObj = window.appData.equipos.find(p => p.id_partido === idPart);
    if (!matchObj && window.appData && Array.isArray(window.appData.todos_partidos)) matchObj = window.appData.todos_partidos.find(p => p.id_partido === idPart);

    let s1 = document.getElementById('directMvp1')?.value;
    let s2 = document.getElementById('directMvp2')?.value;
    let s3 = document.getElementById('directMvp3')?.value;
    let activeCands = [s1, s2, s3].filter(c => c && c.trim() !== '');
    if (activeCands.length === 0 && matchObj && Array.isArray(matchObj.mvp_candidatos)) {
        activeCands = matchObj.mvp_candidatos.filter(Boolean);
    }

    if (activeCands.length === 0) {
        cont.innerHTML = '<span style="color:var(--text-muted);">Selecciona los nominados a MVP arriba para ver los votos reales recibidos.</span>';
        return;
    }

    const rawVotes = (window._adminMvpRawVotesCache && Array.isArray(window._adminMvpRawVotesCache[idPart]))
        ? window._adminMvpRawVotesCache[idPart]
        : (matchObj && Array.isArray(matchObj.mvp_votos_recuento) ? matchObj.mvp_votos_recuento : []);

    const merged = (typeof window.mergeMvpRecuentoWithCandidates === 'function')
        ? window.mergeMvpRecuentoWithCandidates(rawVotes, activeCands)
        : activeCands.map(c => ({ jugador: c, total: 0 }));

    const exactPcts = (typeof window.calcularPorcentajesExactos === 'function')
        ? window.calcularPorcentajesExactos(merged.map(m => m.total))
        : merged.map(() => 0);

    const totalNominados = merged.reduce((acc, m) => acc + (parseInt(m.total, 10) || 0), 0);
    const unmatchedVotes = rawVotes.filter(v =>
        v && v.jugador && !merged.some(m => (typeof window.isSameMvpPlayer === 'function')
            ? window.isSameMvpPlayer(m.jugador, v.jugador)
            : m.jugador === v.jugador)
    );
    const totalUnmatched = unmatchedVotes.reduce((acc, v) => acc + (parseInt(v.total, 10) || 0), 0);

    const selOficial = document.getElementById('directMvpOficialSelect');
    const winnerVal = selOficial ? selOficial.value : (matchObj ? matchObj.mvp_oficial : '');

    let rowsHtml = merged.map((item, idx) => {
        let candStr = item.jugador;
        let pInfo = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(candStr) : { apodo: candStr, dorsal: '' };
        let count = parseInt(item.total, 10) || 0;
        let pct = exactPcts[idx] || 0;
        let isWinner = Boolean(winnerVal && ((typeof window.isSameMvpPlayer === 'function')
            ? window.isSameMvpPlayer(candStr, winnerVal)
            : candStr === winnerVal));
        let barWidth = pct > 0 ? Math.max(pct, 2) : 0;
        let barBg = isWinner
            ? 'linear-gradient(90deg, #d4af37, #f1c40f)'
            : 'linear-gradient(90deg, rgba(142, 68, 173, 0.7), rgba(186, 104, 200, 0.7))';

        return `
        <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <span style="font-weight: 800; color: ${isWinner ? '#ffd700' : '#fff'}; font-size: 0.76rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;">
                    ${isWinner ? '👑 ' : ''}${pInfo.dorsal ? '#' + pInfo.dorsal + ' ' : ''}${pInfo.apodo}
                </span>
                <span style="font-weight: 800; font-size: 0.74rem; color: ${isWinner ? '#ffd700' : 'var(--secondary-color)'}; flex-shrink: 0;">
                    ${count} ${count === 1 ? 'voto' : 'votos'} · ${pct}%
                </span>
            </div>
            <div style="width: 100%; height: 5px; background: rgba(255, 255, 255, 0.08); border-radius: 999px; overflow: hidden; margin-top: 4px;">
                <div style="width: ${barWidth}%; height: 100%; background: ${barBg}; border-radius: 999px; transition: width 0.3s ease;"></div>
            </div>
        </div>`;
    }).join('');

    let extraNote = totalUnmatched > 0
        ? `<div style="margin-top: 4px; font-size: 0.66rem; color: #f39c12;">⚠️ Hay ${totalUnmatched} ${totalUnmatched === 1 ? 'voto adicional' : 'votos adicionales'} en BD para jugadores distintos a los nominados actuales.</div>`
        : '';

    cont.innerHTML = `
    <div style="margin-top: 4px;">
        ${rowsHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 0.68rem; color: var(--text-muted);">
            <span>Recuento real registrado en base de datos</span>
            <span id="adminMvpTotalVotesRecuento" style="font-weight: 800; color: #fff;">Total: ${totalNominados} votos</span>
        </div>
        ${extraNote}
    </div>`;
};

window.cargarRecuentoVotosMvp = function() {
    const selPart = document.getElementById('directMvpPartidoSelect');
    const idPart = selPart ? selPart.value : '';
    const cont = document.getElementById('adminRecuentoVotosMvp');
    if (!idPart || !cont) return;

    let matchObj = null;
    if (window.appData && Array.isArray(window.appData.equipos)) matchObj = window.appData.equipos.find(p => p.id_partido === idPart);
    if (!matchObj && window.appData && Array.isArray(window.appData.todos_partidos)) matchObj = window.appData.todos_partidos.find(p => p.id_partido === idPart);

    let s1 = document.getElementById('directMvp1')?.value;
    let s2 = document.getElementById('directMvp2')?.value;
    let s3 = document.getElementById('directMvp3')?.value;
    let activeCands = [s1, s2, s3].filter(c => c && c.trim() !== '');
    if (activeCands.length === 0 && matchObj && Array.isArray(matchObj.mvp_candidatos)) {
        activeCands = matchObj.mvp_candidatos.filter(Boolean);
    }

    if (activeCands.length === 0) {
        cont.innerHTML = '<span style="color:var(--text-muted);">Selecciona los nominados a MVP arriba para ver los votos reales recibidos.</span>';
        return;
    }

    cont.innerHTML = '<span style="color:var(--text-muted);">Consultando votos reales en la base de datos...</span>';

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
        const dbVotes = (d && d.status === 'success' && Array.isArray(d.votos)) ? d.votos : [];
        window._adminMvpRawVotesCache = window._adminMvpRawVotesCache || {};
        window._adminMvpRawVotesCache[idPart] = dbVotes;

        const mergedReal = (typeof window.mergeMvpRecuentoWithCandidates === 'function')
            ? window.mergeMvpRecuentoWithCandidates(dbVotes, activeCands)
            : dbVotes;

        if (window.appData) {
            [window.appData.equipos, window.appData.todos_partidos].forEach(arr => {
                if (Array.isArray(arr)) {
                    arr.forEach(p => {
                        if (p.id_partido === idPart) p.mvp_votos_recuento = mergedReal;
                    });
                }
            });
        }

        window.renderRecuentoVotosMvpFromCache();
    })
    .catch(() => {
        cont.innerHTML = '<span style="color:#e74c3c;">No se pudo conectar para obtener los votos.</span>';
    });
};

window.recalcularPorcentajesMvpAdmin = function() {
    if (typeof window.renderRecuentoVotosMvpFromCache === 'function') {
        window.renderRecuentoVotosMvpFromCache();
    }
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
            if (window.renderLucideIcons) window.renderLucideIcons('adminPanelWrapper');
            else if (typeof lucide !== 'undefined') lucide.createIcons();
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
            if(window.renderLucideIcons) window.renderLucideIcons('adminPanelWrapper');
            else if(window.lucide) window.lucide.createIcons();
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
    const elActa = document.getElementById(`adm_acta_${idPart}`);
    const elStats = document.getElementById(`adm_stats_${idPart}`);
    
    let sets = "";
    if (elSetsLoc && elSetsVis && elSetsLoc.value.trim() !== "" && elSetsVis.value.trim() !== "") {
        sets = `${elSetsLoc.value.trim()}-${elSetsVis.value.trim()}`;
    }
    const parc = elParc ? elParc.value.trim() : "";
    const stream = elStream ? elStream.value.trim() : "";
    const acta = elActa ? elActa.value.trim() : "";
    const statsUrl = elStats ? elStats.value.trim() : "";

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
            streaming: stream,
            acta: acta,
            stats: statsUrl
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
                        if (acta !== undefined) eq.acta = acta;
                        if (statsUrl !== undefined) eq.stats_url = statsUrl;
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

window.adminExportarPdfPartido = async function(event, idPartido) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const btn = document.getElementById('btn_export_pdf_' + idPartido) || (event && event.currentTarget);
    const origHtml = btn ? btn.innerHTML : '';
    try {
        if (btn) {
            btn.innerHTML = '<span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span> Obteniendo pronósticos...';
            btn.disabled = true;
        }

        // 1. Obtener los pronósticos reales del backend D1
        const rawRes = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'get_pronosticos_partido_data',
                id_partido: idPartido,
                usuario: (typeof currentUser !== 'undefined') ? currentUser : '',
                password: (typeof currentPassword !== 'undefined') ? currentPassword : ''
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const resp = (rawRes && typeof rawRes.json === 'function') ? await rawRes.json() : rawRes;

        if (!resp || resp.status !== 'success') {
            alert("Error al cargar los pronósticos del partido: " + (resp && resp.message ? resp.message : "Error de respuesta del servidor"));
            if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }
            return;
        }

        const pronosticos = resp.pronosticos || [];
        if (pronosticos.length === 0) {
            alert("Este partido no tiene ningún pronóstico registrado todavía en la base de datos.");
            if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }
            return;
        }

        // 2. Extraer datos del partido teniendo en cuenta Ubicacion (LOCAL o VISITANTE)
        let matchInfo = resp.partido || {};
        if (!matchInfo.Equipo_Local && window.appData) {
            const all = (window.appData.todos_partidos || []).concat(window.appData.equipos || []);
            const f = all.find(m => m.id_partido === idPartido);
            if (f) {
                matchInfo = {
                    Equipo_Local: f.equipo_local,
                    Rival: f.rival,
                    Ubicacion: f.ubicacion,
                    Categoria: f.categoria,
                    Jornada_Eq: f.jornada_eq || f.ronda_global,
                    Fecha: f.fecha
                };
            }
        }

        const rawLoc = matchInfo.Equipo_Local || 'Local';
        const rawRiv = matchInfo.Rival || 'Rival';
        const ubicacion = String(matchInfo.Ubicacion || matchInfo.ubicacion || 'LOCAL').trim().toUpperCase();
        const isMatchLocal = (ubicacion === 'LOCAL' || ubicacion === 'CASA');

        // En la cartelera:
        // teamLocal = el equipo que juega en casa (izquierda de la tarjeta, primer número de los sets y 'A favor')
        // teamVisit = el equipo que juega fuera (derecha de la tarjeta, segundo número de los sets y 'En contra')
        const teamLocal = isMatchLocal ? rawLoc : rawRiv;
        const teamVisit = isMatchLocal ? rawRiv : rawLoc;

        const categoria = matchInfo.Categoria || matchInfo.categoria || '';
        const jornada = matchInfo.Jornada_Eq || matchInfo.jornada_eq || matchInfo.Ronda_Global || matchInfo.ronda_global || '';
        const fechaPartido = matchInfo.Fecha || matchInfo.fecha || '';

        // 3. Asegurar que jsPDF y autoTable están cargados
        if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
            if (btn) btn.innerHTML = '<span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span> Cargando librerías...';
            await new Promise((resolve, reject) => {
                const s1 = document.createElement('script');
                s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                s1.onload = () => {
                    const s2 = document.createElement('script');
                    s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
                    s2.onload = resolve;
                    s2.onerror = reject;
                    document.head.appendChild(s2);
                };
                s1.onerror = reject;
                document.head.appendChild(s1);
            });
        }

        // 4. Formatear filas con fidelidad 100% a la Cartelera y a la BD
        const tableRows = pronosticos.map((p, idx) => {
            const u = '@' + (p.usuario || '').replace(/^@/, '');
            const nom = p.nombre_real || p.usuario || '';
            const sets = p.sets || '-';
            
            // Ganador deducido según los sets (primer número = teamLocal, segundo = teamVisit)
            let ganadorSets = '-';
            if (sets && sets.includes('-')) {
                const parts = sets.split('-');
                const sLoc = parseInt(parts[0]);
                const sVis = parseInt(parts[1]);
                if (!isNaN(sLoc) && !isNaN(sVis)) {
                    ganadorSets = sLoc > sVis ? teamLocal : teamVisit;
                }
            }

            const pts = (p.puntos_dif !== undefined && p.puntos_dif !== null) ? `+${p.puntos_dif} pts` : '-';
            
            // Asignación correcta de 'A favor' y 'En contra' según la ubicación del partido
            let aFavorDe = '-';
            const sigL = (p.signo || '').trim().toLowerCase();
            if (sigL === 'a favor' || sigL.includes('a favor')) {
                aFavorDe = teamLocal;
            } else if (sigL === 'en contra' || sigL.includes('en contra')) {
                aFavorDe = teamVisit;
            } else if (p.puntos_dif === 0 || p.puntos_dif === '0' || sigL === 'empate') {
                aFavorDe = 'Empate (0 pts)';
            } else if (p.signo) {
                aFavorDe = p.signo;
            }
            const ts = p.timestamp || '';
            return [
                idx + 1,
                u,
                nom,
                sets,
                ganadorSets,
                pts,
                aFavorDe,
                ts
            ];
        });

        // 5. Construir documento PDF institucional
        const PDFClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (typeof jsPDF !== 'undefined' ? jsPDF : null);
        if (!PDFClass) {
            throw new Error("Librería jsPDF no disponible.");
        }
        const doc = new PDFClass({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const autoTableConfig = {
            startY: 65,
            head: [['Nº', 'Usuario', 'Nombre Real', 'Sets', 'Ganador (Sets)', 'Diferencia', 'Puntos a Favor de', 'Fecha Predicción']],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [93, 23, 137], // #5D1789 Morado VCV
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center',
                valign: 'middle',
                cellPadding: 4
            },
            styles: {
                fontSize: 7.5,
                cellPadding: 3.5,
                textColor: [34, 34, 34],
                lineColor: [224, 216, 234],
                lineWidth: 0.5,
                valign: 'middle',
                overflow: 'linebreak'
            },
            alternateRowStyles: {
                fillColor: [248, 245, 250] // #F8F5FA
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 22 }, // Nº
                1: { fontStyle: 'bold', cellWidth: 74 }, // Usuario
                2: { cellWidth: 82 }, // Nombre Real
                3: { halign: 'center', fontStyle: 'bold', cellWidth: 36 }, // Sets
                4: { cellWidth: 76 }, // Ganador (Sets)
                5: { halign: 'center', cellWidth: 48 }, // Diferencia
                6: { cellWidth: 95 }, // A Favor de (Puntos)
                7: { halign: 'center', cellWidth: 122 } // Fecha
            },
            didDrawPage: function(data) {
                // Cabecera institucional VCV
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.setTextColor(93, 23, 137);
                doc.text('VCV PLAY — PRONÓSTICOS OFICIALES', 20, 28);

                // Subtítulo con datos del partido respetando quién juega de local
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(30, 30, 30);
                let subTitle = `Partido: ${teamLocal} (Local) vs ${teamVisit} (Visitante)`;
                if (jornada) subTitle += `  |  Jornada ${jornada}`;
                if (categoria) subTitle += `  (${categoria})`;
                doc.text(subTitle, 20, 42);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                let subDetails = `ID Partido: ${idPartido}  |  Total: ${pronosticos.length} pronósticos registrados`;
                if (fechaPartido) subDetails += `  |  Fecha Partido: ${fechaPartido}`;
                doc.text(subDetails, 20, 54);

                // Pie de página con numeración
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(140, 140, 140);
                doc.text(`VCV Play • Página ${data.pageNumber}`, pageWidth - 20, pageHeight - 14, { align: 'right' });
            },
            margin: { top: 62, left: 20, right: 20, bottom: 25 }
        };

        if (typeof doc.autoTable === 'function') {
            doc.autoTable(autoTableConfig);
        } else if (window.jspdf && typeof window.jspdf.autoTable === 'function') {
            window.jspdf.autoTable(doc, autoTableConfig);
        } else {
            throw new Error("No se pudo inicializar el generador de tablas PDF.");
        }

        // 6. Descargar PDF automáticamente
        const safeLoc = (teamLocal || 'Local').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
        const safeRiv = (teamVisit || 'Visitante').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
        const filename = `Pronosticos_${idPartido}_${safeLoc}_vs_${safeRiv}.pdf`;
        doc.save(filename);

        if (btn) {
            btn.innerHTML = '✅ ¡PDF Descargado!';
            setTimeout(() => {
                btn.innerHTML = origHtml;
                btn.disabled = false;
            }, 2500);
        }
    } catch(err) {
        console.error("Error al exportar PDF de pronósticos:", err);
        alert("Ocurrió un error al generar el PDF: " + err.message);
        if (btn) {
            btn.innerHTML = origHtml;
            btn.disabled = false;
        }
    }
};

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
                        <span>⭐ <b>Gestor MVP Superliga</b> (candidatos y ganador)</span>
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

                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px; flex-wrap:wrap;">
                    <button type="button" class="btn" onclick="window.adminRestablecerPasswordUsuario('${u.usuario.replace(/'/g, "\\'")}')" style="padding:6px 12px; font-size:0.75rem; background:rgba(231,76,60,0.12); border:1px solid #e74c3c; color:#e74c3c; font-weight:800; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;" title="Restablecer contraseña de este usuario">
                        🔑 Cambiar Contraseña
                    </button>
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
// ------------------------------------------------------------------
// RESTABLECIMIENTO DE CONTRASEÑA POR EL ADMINISTRADOR
// ------------------------------------------------------------------
window.adminRestablecerPasswordUsuario = function(targetUser) {
    if (!targetUser) return;
    const nuevaClave = prompt(`Introduce la nueva contraseña temporal para @${targetUser} (mínimo 3 caracteres):`, "vcv1234");
    if (nuevaClave === null) return;
    const pwdTrim = nuevaClave.trim();
    if (!pwdTrim || pwdTrim.length < 3) {
        alert("⚠️ La contraseña debe tener al menos 3 caracteres.");
        return;
    }

    if (!confirm(`¿Estás seguro de que deseas cambiar la contraseña de @${targetUser} a "${pwdTrim}"?`)) {
        return;
    }

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'admin_reset_password',
            usuario: currentUser,
            password: currentPassword,
            target_user: targetUser,
            new_password: pwdTrim
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (d.status === 'success') {
            alert(`✅ ¡Contraseña restablecida con éxito!

Usuario: @${targetUser}
Nueva Contraseña: ${pwdTrim}

Ya puedes facilitársela al usuario para que inicie sesión.`);
        } else {
            alert(`❌ Error al restablecer la contraseña:

${d.message || 'Error desconocido'}`);
        }
    })
    .catch(err => {
        alert(`❌ Error de conexión al restablecer contraseña: ${err.message}`);
    });
};

window.adminEjecutarResetPasswordRapido = function() {
    const userInp = document.getElementById('adminResetTargetUser');
    const passInp = document.getElementById('adminResetNewPass');
    if (!userInp || !passInp) return;

    let targetUser = (userInp.value || '').trim();
    if (targetUser.startsWith('@')) targetUser = targetUser.substring(1).trim();
    const newPass = (passInp.value || '').trim();

    if (!targetUser) {
        alert("⚠️ Por favor, introduce el nombre de @usuario.");
        userInp.focus();
        return;
    }
    if (!newPass || newPass.length < 3) {
        alert("⚠️ La nueva contraseña debe tener al menos 3 caracteres.");
        passInp.focus();
        return;
    }

    if (!confirm(`¿Restablecer la contraseña de @${targetUser} a "${newPass}"?`)) {
        return;
    }

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'admin_reset_password',
            usuario: currentUser,
            password: currentPassword,
            target_user: targetUser,
            new_password: newPass
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (d.status === 'success') {
            alert(`✅ ¡Contraseña restablecida con éxito!

Usuario: @${targetUser}
Nueva Contraseña: ${newPass}

El usuario ya puede acceder con esta clave.`);
            userInp.value = '';
            passInp.value = 'vcv1234';
        } else {
            alert(`❌ Error: ${d.message || 'No se pudo restablecer la contraseña.'}`);
        }
    })
    .catch(err => {
        alert(`❌ Error de red: ${err.message}`);
    });
};


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

// ==================================================================
// BUZÓN DE SUGERENCIAS Y REPORTE DE ERRORES (USUARIOS Y ADMIN)
// ==================================================================
window.feedbackTipoActivo = 'Sugerencia';

window.setFeedbackType = function(tipo) {
    window.feedbackTipoActivo = tipo;
    const inputHidden = document.getElementById('feedbackTipoValue');
    if (inputHidden) inputHidden.value = tipo;

    const bSug = document.getElementById('btnTipoSugerencia');
    const bErr = document.getElementById('btnTipoError');

    if (tipo === 'Sugerencia') {
        if (bSug) {
            bSug.style.border = '1.5px solid var(--secondary-color)';
            bSug.style.background = 'rgba(212, 175, 55, 0.2)';
            bSug.style.color = '#fff';
            bSug.style.fontWeight = '800';
        }
        if (bErr) {
            bErr.style.border = '1px solid rgba(255, 255, 255, 0.15)';
            bErr.style.background = 'rgba(255, 255, 255, 0.05)';
            bErr.style.color = 'var(--text-muted)';
            bErr.style.fontWeight = '700';
        }
    } else {
        if (bSug) {
            bSug.style.border = '1px solid rgba(255, 255, 255, 0.15)';
            bSug.style.background = 'rgba(255, 255, 255, 0.05)';
            bSug.style.color = 'var(--text-muted)';
            bSug.style.fontWeight = '700';
        }
        if (bErr) {
            bErr.style.border = '1.5px solid #e74c3c';
            bErr.style.background = 'rgba(231, 76, 60, 0.2)';
            bErr.style.color = '#ff6b81';
            bErr.style.fontWeight = '800';
        }
    }
};

window.enviarFeedbackUsuario = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = document.getElementById('btnEnviarFeedback');
    const txtArea = document.getElementById('feedbackMensaje');
    const msgBox = document.getElementById('msgFeedback');
    if (!txtArea || !msgBox) return;

    const mensaje = txtArea.value.trim();
    const tipo = window.feedbackTipoActivo || 'Sugerencia';

    if (!mensaje) {
        msgBox.className = 'alert-box alert-warning';
        msgBox.style.display = 'block';
        msgBox.style.background = 'rgba(243, 156, 18, 0.15)';
        msgBox.style.color = '#f39c12';
        msgBox.style.border = '1px solid #f39c12';
        msgBox.innerText = 'Por favor, escribe un mensaje antes de enviar.';
        return;
    }

    const data = window.appData || {};
    const uName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (data.usuario || 'Invitado');
    const uPwd = (typeof currentPassword !== 'undefined' && currentPassword) ? currentPassword : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Enviando...</span>';
    }
    msgBox.style.display = 'none';

    try {
        let res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'enviar_sugerencia',
                usuario: uName,
                password: uPwd,
                tipo: tipo,
                mensaje: mensaje
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        let resData = await res.json();
        msgBox.style.display = 'block';
        if (resData.status === 'success') {
            msgBox.className = 'alert-box alert-success';
            msgBox.style.background = 'rgba(46, 204, 113, 0.15)';
            msgBox.style.color = '#2ecc71';
            msgBox.style.border = '1px solid #2ecc71';
            msgBox.innerText = resData.message || '¡Gracias! Tu mensaje ha sido enviado correctamente.';
            txtArea.value = '';
        } else {
            msgBox.className = 'alert-box alert-danger';
            msgBox.style.background = 'rgba(231, 76, 60, 0.15)';
            msgBox.style.color = '#e74c3c';
            msgBox.style.border = '1px solid #e74c3c';
            msgBox.innerText = resData.message || 'No se pudo enviar el mensaje. Inténtalo de nuevo.';
        }
    } catch (err) {
        msgBox.style.display = 'block';
        msgBox.className = 'alert-box alert-danger';
        msgBox.style.background = 'rgba(231, 76, 60, 0.15)';
        msgBox.style.color = '#e74c3c';
        msgBox.style.border = '1px solid #e74c3c';
        msgBox.innerText = 'Error al enviar: ' + err.message;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>📨 Enviar a los Administradores</span>';
        }
    }
};

window.cargarSugerenciasAdmin = async function() {
    const box = document.getElementById('adminSugerenciasBox');
    const btn = document.getElementById('btnCargarSugerenciasAdmin');
    if (!box) return;
    if (btn) { btn.disabled = true; btn.innerText = "Cargando..."; }
    box.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:10px;">⏳ Consultando base de datos...</div>';

    try {
        let res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'get_sugerencias',
                usuario: currentUser,
                password: currentPassword
            })
        });
        let data = await res.json();
        if (data.status === 'success') {
            const list = data.sugerencias || [];
            // Filtrar para mostrar en la intranet únicamente las que están pendientes
            const pendientes = list.filter(item => {
                const est = (item.estado || 'PENDIENTE').toUpperCase();
                return est !== 'ARREGLADO' && est !== 'RESUELTO';
            });
            const totalArreglados = list.length - pendientes.length;

            if (pendientes.length === 0) {
                box.innerHTML = `
                    <div style="color:var(--text-muted); text-align:center; padding:16px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                        <div style="font-size:1.1rem; margin-bottom:4px;">🎉</div>
                        <div style="font-weight:700; color:#fff; font-size:0.85rem;">¡Buzón al día!</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">No tienes incidencias ni sugerencias pendientes.</div>
                        ${totalArreglados > 0 ? `<div style="margin-top:8px; font-size:0.7rem; color:rgba(46,204,113,0.8);">(${totalArreglados} resueltos archivados en la base de datos)</div>` : ''}
                    </div>`;
            } else {
                box.innerHTML = pendientes.map(item => `
                    <div id="sug_card_${item.id}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 6px; transition: all 0.3s ease;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span style="font-size: 0.68rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${item.tipo === 'Error' ? 'rgba(231,76,60,0.2)' : 'rgba(212,175,55,0.2)'}; color: ${item.tipo === 'Error' ? '#ff6b81' : 'var(--secondary-color)'};">
                                    ${item.tipo === 'Error' ? '⚠️ Error / Bug' : '💡 Sugerencia'}
                                </span>
                                <strong style="color: #fff; font-size: 0.85rem;">@${item.usuario}</strong>
                                <span id="sug_badge_${item.id}">
                                    <span style="font-size: 0.68rem; font-weight: 800; padding: 2px 7px; border-radius: 4px; background: rgba(243,156,18,0.2); color: #f39c12; border: 1px solid rgba(243,156,18,0.35);">⏳ Pendiente</span>
                                </span>
                            </div>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">${item.fecha_hora || ''}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-main); margin-top: 2px; white-space: pre-wrap; line-height: 1.35; word-break: break-word;">${item.mensaje}</div>
                        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap;">
                            <button type="button" onclick="window.cambiarEstadoSugerencia(${item.id}, 'ARREGLADO')" style="font-size: 0.72rem; padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(46,204,113,0.4); background: rgba(46,204,113,0.15); color: #2ecc71; cursor: pointer; font-weight: bold; transition: all 0.2s;">
                                ✅ Marcar como Arreglado
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            box.innerHTML = `<div style="color:#e74c3c; padding:8px;">Error: ${data.message || 'No se pudieron cargar'}</div>`;
        }
    } catch(err) {
        box.innerHTML = `<div style="color:#e74c3c; padding:8px;">Error: ${err.message}</div>`;
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="refresh-cw" style="width:16px; height:16px; margin-right:5px; vertical-align:middle;"></i> Cargar Mensajes de Usuarios'; }
        if (window.renderLucideIcons) window.renderLucideIcons('adminPanelWrapper');
        else if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

window.cambiarEstadoSugerencia = async function(id, nuevoEstado) {
    if (!id) return;
    const badgeEl = document.getElementById(`sug_badge_${id}`);
    if (badgeEl) {
        badgeEl.innerHTML = '<span style="font-size:0.68rem; color:var(--text-muted);">⏳ Guardando...</span>';
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'marcar_sugerencia_estado',
                usuario: currentUser,
                password: currentPassword,
                id: id,
                nuevo_estado: nuevoEstado
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            mostrarToast(`Mensaje marcado como: ${nuevoEstado}`);
            if (typeof window.cargarSugerenciasAdmin === 'function') {
                window.cargarSugerenciasAdmin();
            }
        } else {
            mostrarToast("Error: " + (data.message || "No se pudo actualizar"));
            if (typeof window.cargarSugerenciasAdmin === 'function') {
                window.cargarSugerenciasAdmin();
            }
        }
    } catch (err) {
        mostrarToast("Error de conexión: " + err.message);
        if (typeof window.cargarSugerenciasAdmin === 'function') {
            window.cargarSugerenciasAdmin();
        }
    }
};

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




// ==================================================================

// ==================================================================
// HERRAMIENTA CM / REDES: TARJETA GANADOR MVP (1080x1080 / 1080x1920)
// ==================================================================
window.syncMvpFormatUi = function(fmt, fromAdminSelect = false) {
    const safeFmt = (fmt === 'story') ? 'story' : 'square';
    if (window.isMvpAdminClubCard || fromAdminSelect) {
        const selAdminFmt = document.getElementById('adminMvpCardFormatSelect');
        if (selAdminFmt && selAdminFmt.value !== safeFmt) selAdminFmt.value = safeFmt;

        const dlLabel = document.getElementById('btnAdminMvpDownloadPngLabel');
        if (dlLabel) {
            dlLabel.innerText = (safeFmt === 'story')
                ? '⬇️ Descargar Tarjeta (PNG 1080×1920)'
                : '⬇️ Descargar Tarjeta (PNG 1080×1080)';
        }
    }

    const dlModalBtn = document.getElementById('btnAdminShareDownloadPng');
    if (dlModalBtn) {
        dlModalBtn.innerText = (safeFmt === 'story')
            ? '⬇️ PNG Stories (1080×1920)'
            : '⬇️ PNG Post (1080×1080)';
    }

    const btnSq = document.getElementById('btnShareFmtSquare');
    const btnSt = document.getElementById('btnShareFmtStory');
    if (btnSq && btnSt) {
        if (safeFmt === 'story') {
            btnSq.style.border = '1px solid var(--border-color)';
            btnSq.style.background = 'var(--bg-input)';
            btnSq.style.color = 'var(--text-muted)';
            btnSt.style.border = '1.5px solid var(--secondary-color)';
            btnSt.style.background = 'rgba(212,175,55,0.2)';
            btnSt.style.color = '#ffd700';
        } else {
            btnSq.style.border = '1.5px solid var(--secondary-color)';
            btnSq.style.background = 'rgba(212,175,55,0.2)';
            btnSq.style.color = '#ffd700';
            btnSt.style.border = '1px solid var(--border-color)';
            btnSt.style.background = 'var(--bg-input)';
            btnSt.style.color = 'var(--text-muted)';
        }
    }
};

window.onMvpCardFormatSelectChange = function(fmt) {
    const safeFmt = (fmt === 'story') ? 'story' : 'square';
    window.currentShareFormat = safeFmt;
    window.syncMvpFormatUi(safeFmt, true);
};

window.cambiarFormatoMvpTarjeta = async function(fmt) {
    const safeFmt = (fmt === 'story') ? 'story' : 'square';
    window.currentShareFormat = safeFmt;
    window.syncMvpFormatUi(safeFmt, Boolean(window.isMvpAdminClubCard));
    if (typeof window.dibujarTarjetaCompartir === 'function') {
        await window.dibujarTarjetaCompartir();
    }
};
window.cambiarFormatoTarjeta = window.cambiarFormatoMvpTarjeta;

window.abrirTarjetaMvpClub = async function(directDownload = false) {
    const pSelect = document.getElementById('directMvpPartidoSelect');
    const idPart = pSelect ? pSelect.value : null;
    if (!idPart) {
        alert('Por favor, selecciona primero un partido en el desplegable.');
        return;
    }

    const data = window.appData || {};
    let match = null;
    if (data.equipos) match = data.equipos.find(m => m.id_partido === idPart);
    if (!match && data.todos_partidos) match = data.todos_partidos.find(m => m.id_partido === idPart);

    // Obtener candidatos seleccionados en la pantalla
    const s1 = document.getElementById('directMvp1');
    const s2 = document.getElementById('directMvp2');
    const s3 = document.getElementById('directMvp3');
    let cands = [s1 ? s1.value : '', s2 ? s2.value : '', s3 ? s3.value : ''].filter(Boolean);
    if (cands.length === 0 && match && Array.isArray(match.mvp_candidatos)) {
        cands = match.mvp_candidatos.filter(Boolean);
    }

    if (cands.length < 2) {
        const plantilla = (typeof window.getPlantillaSuperligaActual === 'function') ? window.getPlantillaSuperligaActual() : [];
        if (plantilla.length >= 2) {
            cands = plantilla.slice(0, 3).map(pj => `#${pj.dorsal} ${pj.apodo || pj.nombre}`);
        } else {
            alert('Por favor selecciona primero los jugadores nominados en la sección superior.');
            return;
        }
    }

    // Ganador seleccionado en el desplegable de tarjeta, ganador guardado o el primero de los candidatos
    const sCardWinner = document.getElementById('adminMvpCardWinnerSelect');
    const sOficial = document.getElementById('directMvpOficialSelect');
    let winner = (sCardWinner && sCardWinner.value) 
        ? sCardWinner.value 
        : ((sOficial && sOficial.value) ? sOficial.value : (match && match.mvp_oficial ? match.mvp_oficial : ''));
    if (!winner && cands.length > 0) {
        winner = cands[0];
    }

    // Estadísticas
    const st1 = document.getElementById('mvpStat1')?.value?.trim();
    const st2 = document.getElementById('mvpStat2')?.value?.trim();
    const st3 = document.getElementById('mvpStat3')?.value?.trim();
    const st4 = document.getElementById('mvpStat4')?.value?.trim();
    let stats = [st1, st2, st3, st4].filter(Boolean);
    if (stats.length === 0 && match && Array.isArray(match.mvp_stats)) {
        stats = match.mvp_stats.filter(Boolean);
    }

    // Formato seleccionado (1080x1080 o 1080x1920)
    const sFmt = document.getElementById('adminMvpCardFormatSelect');
    const fmt = (sFmt && sFmt.value === 'story') ? 'story' : 'square';

    // Parámetros para el canvas de la tarjeta MVP del club
    window.currentShareMode = 'mvp';
    window.currentShareFormat = fmt;
    window.currentShareMatchId = idPart;
    window.isMvpAdminClubCard = true;
    window.currentShareWinnerOverride = winner;
    window.currentShareStatsOverride = stats;
    window.currentShareCandidatesOverride = cands;

    window.syncMvpFormatUi(fmt);

    const ligaSelector = document.getElementById('shareLigaSelectorContainer');
    if (ligaSelector) ligaSelector.style.display = 'none';
    const focusSelector = document.getElementById('shareMvpFocusSelectorContainer');
    if (focusSelector) focusSelector.style.display = 'none';
    window.currentShareMvpFocus = 'winner';

    if (directDownload) {
        await window.dibujarTarjetaCompartir();
        window.descargarTarjetaCanvas();
    } else {
        // Configurar selector de ganador dentro del propio modal
        const winnerSelectorContainer = document.getElementById('shareMvpWinnerSelectorContainer');
        const winnerSelect = document.getElementById('shareMvpWinnerSelect');
        if (winnerSelectorContainer && winnerSelect) {
            winnerSelectorContainer.style.display = 'block';
            let cardOptions = (sCardWinner && sCardWinner.options && sCardWinner.options.length > 0)
                ? Array.from(sCardWinner.options).map(opt => ({ val: opt.value, text: opt.text }))
                : cands.map(cand => {
                    let pInf = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(cand) : { dorsal: '', apodo: cand };
                    return { val: cand, text: `👑 ${pInf.dorsal ? '#' + pInf.dorsal + ' ' : ''}${pInf.apodo}` };
                });

            winnerSelect.innerHTML = cardOptions.map(opt => `<option value="${opt.val}" ${opt.val === winner ? 'selected' : ''}>${opt.text}</option>`).join('');
            if (winner) window.setSelectValueSafely(winnerSelect, winner);
        }

        const formatSelectorContainer = document.getElementById('shareMvpFormatSelectorContainer');
        if (formatSelectorContainer) formatSelectorContainer.style.display = 'block';

        const btnAdminDl = document.getElementById('btnAdminShareDownloadPng');
        if (btnAdminDl) btnAdminDl.style.display = 'flex';

        const modal = document.getElementById('shareCardModal');
        if (modal) modal.style.display = 'flex';
        await window.dibujarTarjetaCompartir();
    }
};

window.cambiarGanadorMvpTarjeta = async function(cand) {
    if (!cand) return;
    window.currentShareWinnerOverride = cand;
    const sCardWinner = document.getElementById('adminMvpCardWinnerSelect');
    if (sCardWinner && typeof window.setSelectValueSafely === 'function') {
        window.setSelectValueSafely(sCardWinner, cand);
    }
    if (typeof window.dibujarTarjetaCompartir === 'function') {
        await window.dibujarTarjetaCompartir();
    }
};

// ------------------------------------------------------------------
// MODO MANTENIMIENTO: CONTROL Y ESTADO PARA ADMINISTRADORES
// ------------------------------------------------------------------
window.adminActualizarUiMantenimiento = function(activo) {
    const badge = document.getElementById('badgeEstadoMantenimientoAdmin');
    const btn = document.getElementById('btnToggleMantenimientoAdmin');
    const desc = document.getElementById('descMantenimientoAdmin');
    if (!badge || !btn) return;

    if (activo) {
        badge.style.background = '#e74c3c';
        badge.style.color = '#fff';
        badge.innerText = 'ACTIVO';
        btn.innerText = 'Desactivar Mantenimiento';
        btn.style.background = 'rgba(39, 174, 96, 0.2)';
        btn.style.borderColor = '#27ae60';
        btn.style.color = '#27ae60';
        if (desc) desc.innerHTML = '⚠️ El modo mantenimiento está actualmente <b>ACTIVADO</b>. Los usuarios no administradores ven un aviso y no pueden iniciar sesión.';
    } else {
        badge.style.background = '#27ae60';
        badge.style.color = '#fff';
        badge.innerText = 'DESACTIVADO';
        btn.innerText = 'Activar Mantenimiento';
        btn.style.background = 'rgba(231, 76, 60, 0.2)';
        btn.style.borderColor = '#e74c3c';
        btn.style.color = '#e74c3c';
        if (desc) desc.innerHTML = '✅ El modo mantenimiento está <b>DESACTIVADO</b>. La plataforma está abierta con total normalidad para todos los usuarios.';
    }
};

window.adminToggleMantenimiento = function() {
    const badge = document.getElementById('badgeEstadoMantenimientoAdmin');
    const isCurrentlyActive = badge ? (badge.innerText === 'ACTIVO') : false;
    const nuevoEstado = !isCurrentlyActive;

    const actionText = nuevoEstado ? 'ACTIVAR' : 'DESACTIVAR';
    if (!confirm(`¿Estás seguro de que deseas ${actionText} el Modo Mantenimiento en toda la web?`)) {
        return;
    }

    const btn = document.getElementById('btnToggleMantenimientoAdmin');
    if (btn) btn.disabled = true;

    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'toggle_modo_mantenimiento',
            usuario: currentUser,
            password: currentPassword,
            activo: nuevoEstado
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(r => r.json())
    .then(d => {
        if (btn) btn.disabled = false;
        if (d.status === 'success') {
            window.adminActualizarUiMantenimiento(d.activo);
            if (window.appData) window.appData.modo_mantenimiento = d.activo;
            alert(`✅ ${d.message}`);
        } else {
            alert(`❌ Error: ${d.message || 'No se pudo cambiar el modo mantenimiento'}`);
        }
    })
    .catch(err => {
        if (btn) btn.disabled = false;
        alert(`❌ Error de red: ${err.message}`);
    });
};

// ==================================================================
// CONSULTA DE PREDICCIONES POR PARTIDO PARA ADMINISTRADORES
// ==================================================================

window._adminLoadedPronosticos = [];
window._adminCurrentSelectedMatch = null;

window.adminInicializarSeccionPredicciones = function() {
    const selEq = document.getElementById('adminPredEquipoSelect');
    if (!selEq) return;

    // Equipos del club por defecto (los mismos a los que se otorgan permisos)
    const clubTeams = [
        { team: 'Universidad de Valladolid VCV', label: 'Univ. de Valladolid (SM2)' },
        { team: 'VALCYL VCV', label: 'VALCYL VCV (1ª Nac. Masc.)' },
        { team: 'Valladolid CV Vacceas', label: 'VCV Vacceas (1ª Nac. Fem.)' },
        { team: 'CD San José', label: 'CD San José (1ª Nac. Fem.)' },
        { team: 'VCV Meseta', label: 'VCV Meseta (2ª Masc.)' },
        { team: 'Pegamo Abanto', label: 'Pegamo Abanto (2ª Masc.)' },
        { team: 'VCV Maria Molina', label: 'VCV Maria Molina (2ª Fem.)' }
    ];

    // Detectar si hay más equipos en appData (equipos_totales_publicos o partidos)
    const dynamicSet = new Set(clubTeams.map(c => c.team));
    if (window.appData && Array.isArray(window.appData.equipos_totales_publicos)) {
        window.appData.equipos_totales_publicos.forEach(t => {
            if (t && !dynamicSet.has(t)) {
                clubTeams.push({ team: t, label: t });
                dynamicSet.add(t);
            }
        });
    }

    const curVal = selEq.value;
    if (selEq.options.length !== clubTeams.length) {
        selEq.innerHTML = '';
        clubTeams.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.team;
            opt.textContent = c.label;
            selEq.appendChild(opt);
        });

        if (curVal && dynamicSet.has(curVal)) {
            selEq.value = curVal;
        } else {
            selEq.selectedIndex = 0;
        }
    }

    window.adminOnPredEquipoChange(selEq.value, true);
};

function adminNormString(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

window.adminOnPredEquipoChange = function(eq, autoLoad = true) {
    const selJor = document.getElementById('adminPredJornadaSelect');
    if (!selJor) return;

    if (!eq) {
        const selEq = document.getElementById('adminPredEquipoSelect');
        if (selEq && selEq.value) eq = selEq.value;
        else eq = 'Universidad de Valladolid VCV';
    }

    const normEq = adminNormString(eq);
    const pool = (window.appData && Array.isArray(window.appData.todos_partidos) && window.appData.todos_partidos.length > 0)
        ? window.appData.todos_partidos
        : ((window.appData && Array.isArray(window.appData.equipos)) ? window.appData.equipos : []);

    const matchesEq = pool.filter(p => {
        const loc = adminNormString(p.equipo_local);
        const riv = adminNormString(p.rival);
        const cat = adminNormString(p.categoria);
        return loc === normEq || riv === normEq || cat === normEq || loc.includes(normEq) || normEq.includes(loc);
    });

    const jornadasSet = new Set();
    matchesEq.forEach(p => {
        const j = String(p.jornada_eq || p.ronda_global || '').trim();
        if (j) jornadasSet.add(j);
    });

    let sortedJornadas = Array.from(jornadasSet).sort((a, b) => {
        const nA = parseInt(a), nB = parseInt(b);
        if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
        return a.localeCompare(b);
    });

    // Si por cualquier motivo no hay jornadas en memoria (ej. appData aún cargando o equipo con partidos solo en BD),
    // generar jornadas estándar de la liga (1..22 para SM2/1ª Nac, 1..14 para 2ª Div) para que el admin NUNCA vea "Sin jornadas"
    if (sortedJornadas.length === 0) {
        const isSegunda = normEq.includes('2a') || normEq.includes('segunda') || normEq.includes('meseta') || normEq.includes('abanto') || normEq.includes('molina');
        const totalJor = isSegunda ? 14 : 22;
        for (let i = 1; i <= totalJor; i++) {
            sortedJornadas.push(String(i));
        }
    }

    const curSelectedJor = selJor.value;
    selJor.innerHTML = '';
    sortedJornadas.forEach(j => {
        const opt = document.createElement('option');
        opt.value = j;
        opt.textContent = `Jornada ${j}`;
        selJor.appendChild(opt);
    });

    if (curSelectedJor && sortedJornadas.includes(curSelectedJor)) {
        selJor.value = curSelectedJor;
    } else {
        // Seleccionar por defecto la jornada más próxima o actual
        let selectedJor = sortedJornadas[0] || '1';
        const now = Date.now();
        const upcoming = matchesEq.find(p => p.timestamp && p.timestamp >= now);
        if (upcoming && sortedJornadas.includes(String(upcoming.jornada_eq || upcoming.ronda_global))) {
            selectedJor = String(upcoming.jornada_eq || upcoming.ronda_global);
        } else {
            const played = matchesEq.filter(p => p.timestamp && p.timestamp < now);
            if (played.length > 0) {
                played.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                selectedJor = String(played[0].jornada_eq || played[0].ronda_global || sortedJornadas[0]);
            }
        }
        selJor.value = selectedJor;
    }

    if (autoLoad) {
        window.adminCargarPrediccionesPartido();
    }
};

window.adminOnPredJornadaChange = function(jor) {
    window.adminCargarPrediccionesPartido();
};

window.adminCargarPrediccionesPartido = async function() {
    const selEq = document.getElementById('adminPredEquipoSelect');
    const selJor = document.getElementById('adminPredJornadaSelect');
    const infoCont = document.getElementById('adminPredInfoPartido');
    const listCont = document.getElementById('adminPredListaCont');
    const controlesCont = document.getElementById('adminPredControles');
    if (!selEq || !selJor || !infoCont || !listCont) return;

    const eq = selEq.value;
    const jor = selJor.value;
    if (!eq || !jor) {
        infoCont.innerHTML = '<div style="color:var(--text-muted); text-align:center;">Selecciona equipo y jornada.</div>';
        listCont.innerHTML = '';
        if (controlesCont) controlesCont.style.display = 'none';
        return;
    }

    const normEq = adminNormString(eq);
    const pool = (window.appData && Array.isArray(window.appData.todos_partidos) && window.appData.todos_partidos.length > 0)
        ? window.appData.todos_partidos
        : ((window.appData && Array.isArray(window.appData.equipos)) ? window.appData.equipos : []);

    let partido = pool.find(p => {
        const loc = adminNormString(p.equipo_local);
        const riv = adminNormString(p.rival);
        const cat = adminNormString(p.categoria);
        const j = String(p.jornada_eq || p.ronda_global || '').trim();
        return (loc === normEq || riv === normEq || cat === normEq || loc.includes(normEq) || normEq.includes(loc)) && j === jor;
    });

    function renderMatchHeader(m) {
        const locClub = (m.equipo_local || m.Equipo_Local || 'Local').trim();
        const rivClub = (m.rival || m.Rival || 'Rival').trim();
        const ubi = (m.ubicacion || m.Ubicacion || 'LOCAL').toUpperCase();
        const isLocal = (ubi === 'LOCAL' || ubi === 'CASA');
        const teamCasa = isLocal ? locClub : rivClub;
        const teamFuera = isLocal ? rivClub : locClub;

        const fecha = m.fecha || m.Fecha || (m.timestamp ? new Date(m.timestamp).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : 'Por definir');
        const pab = m.pabellon || m.Pabellon || 'Por definir';
        const setsOficial = m.oficial_sets ? String(m.oficial_sets).trim() : (m.Sets_Oficiales || '');
        const estado = m.estado || m.Estado || 'ABIERTO';
        const idP = m.id_partido || m.ID_Partido || '';

        infoCont.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
                <div style="font-weight:800; color:var(--text-main); font-size:0.92rem;">
                    <span style="${isLocal ? 'color:var(--secondary-color); font-weight:800;' : ''}">${teamCasa}</span>
                    <span style="color:var(--text-muted); font-weight:normal; font-size:0.8rem; margin:0 4px;">(Local) vs</span>
                    <span style="${!isLocal ? 'color:var(--secondary-color); font-weight:800;' : ''}">${teamFuera}</span>
                    <span style="color:var(--text-muted); font-weight:normal; font-size:0.8rem; margin-left:4px;">(Visitante)</span>
                </div>
                <div style="display:flex; gap:4px; align-items:center;">
                    <span style="font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; background:${isLocal ? 'rgba(46,204,113,0.15); color:#2ecc71;' : 'rgba(52,152,219,0.15); color:#3498db;'}">
                        ${isLocal ? `🏠 ${locClub} juega en Casa` : `✈️ ${locClub} juega Fuera`}
                    </span>
                    <span style="font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; background:${setsOficial ? 'rgba(52,152,219,0.15); color:#3498db;' : (estado === 'CERRADO' ? 'rgba(231,76,60,0.15); color:#e74c3c;' : 'rgba(46,204,113,0.15); color:#2ecc71;')}">
                        ${setsOficial ? `FINAL: ${setsOficial}` : estado}
                    </span>
                </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:12px; font-size:0.72rem; color:var(--text-muted);">
                <span>📅 ${fecha}</span>
                <span>📍 ${pab}</span>
                <span style="font-family:monospace; opacity:0.7;">ID: ${idP}</span>
            </div>
        `;
    }

    if (partido) {
        window._adminCurrentSelectedMatch = partido;
        renderMatchHeader(partido);
    } else {
        infoCont.innerHTML = `<div style="text-align:center; padding:10px; color:var(--text-muted); font-size:0.8rem;">
            <span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span> Localizando partido en el servidor...
        </div>`;
    }

    listCont.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">
            <span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span> Cargando pronósticos registrados...
        </div>
    `;

    try {
        const rawRes = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'get_pronosticos_partido_data',
                id_partido: partido ? (partido.id_partido || partido.ID_Partido) : '',
                equipo: eq,
                categoria: partido ? (partido.categoria || partido.Categoria || '') : '',
                jornada: jor,
                usuario: (typeof currentUser !== 'undefined') ? currentUser : '',
                password: (typeof currentPassword !== 'undefined') ? currentPassword : ''
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const resp = (rawRes && typeof rawRes.json === 'function') ? await rawRes.json() : rawRes;
        if (!resp || resp.status !== 'success') {
            infoCont.innerHTML = `<div style="color:var(--text-muted); text-align:center;">No se encontró partido para ${eq} - Jornada ${jor}.</div>`;
            listCont.innerHTML = `<div style="color:#e74c3c; font-size:0.78rem; text-align:center; padding:12px;">${resp && resp.message ? resp.message : 'No se pudo encontrar el partido o los pronósticos.'}</div>`;
            if (controlesCont) controlesCont.style.display = 'none';
            return;
        }

        if (resp.partido) {
            partido = resp.partido;
            if (!partido.equipo_local && partido.Equipo_Local) partido.equipo_local = partido.Equipo_Local;
            if (!partido.rival && partido.Rival) partido.rival = partido.Rival;
            if (!partido.ubicacion && partido.Ubicacion) partido.ubicacion = partido.Ubicacion;
            if (!partido.fecha && partido.Fecha) partido.fecha = partido.Fecha;
            if (!partido.pabellon && partido.Pabellon) partido.pabellon = partido.Pabellon;
            if (!partido.estado && partido.Estado) partido.estado = partido.Estado;
            if (!partido.id_partido && partido.ID_Partido) partido.id_partido = partido.ID_Partido;
            window._adminCurrentSelectedMatch = partido;
            renderMatchHeader(partido);
        }

        window._adminLoadedPronosticos = resp.pronosticos || [];
        if (controlesCont) controlesCont.style.display = window._adminLoadedPronosticos.length > 0 ? 'block' : 'none';

        const buscador = document.getElementById('adminPredBuscador');
        if (buscador) buscador.value = '';

        window.adminRenderizarListaPredicciones(window._adminLoadedPronosticos);
    } catch(err) {
        listCont.innerHTML = `<div style="color:#e74c3c; font-size:0.78rem; text-align:center; padding:12px;">Error de conexión: ${err.message}</div>`;
    }
};

window.adminFiltrarPredicciones = function(query) {
    const q = (query || '').toLowerCase().trim();
    if (!window._adminLoadedPronosticos) return;
    if (!q) {
        window.adminRenderizarListaPredicciones(window._adminLoadedPronosticos);
        return;
    }
    const filtrados = window._adminLoadedPronosticos.filter(p => {
        const u = (p.usuario || '').toLowerCase();
        const n = (p.nombre_real || '').toLowerCase();
        return u.includes(q) || n.includes(q);
    });
    window.adminRenderizarListaPredicciones(filtrados, q);
};

window.adminRenderizarListaPredicciones = function(list, filtro = '') {
    const listCont = document.getElementById('adminPredListaCont');
    const resumenCont = document.getElementById('adminPredResumen');
    if (!listCont) return;

    const totalGlobal = (window._adminLoadedPronosticos || []).length;
    const partido = window._adminCurrentSelectedMatch || {};

    const locClub = (partido.equipo_local || 'Local').trim();
    const rivClub = (partido.rival || 'Rival').trim();
    const ubi = (partido.ubicacion || 'LOCAL').toUpperCase();
    const isLocal = (ubi === 'LOCAL');
    const teamCasa = isLocal ? locClub : rivClub;
    const teamFuera = isLocal ? rivClub : locClub;

    if (!list || list.length === 0) {
        listCont.innerHTML = filtro
            ? `<div style="color:var(--text-muted); font-size:0.78rem; text-align:center; padding:16px;">No se encontraron usuarios que coincidan con "${filtro}".</div>`
            : `<div style="color:var(--text-muted); font-size:0.78rem; text-align:center; padding:20px; background:rgba(255,255,255,0.02); border-radius:8px;">
                Ningún usuario ha registrado pronóstico para este partido todavía.
               </div>`;
        if (resumenCont) resumenCont.innerHTML = `<span>Total registrados: <b>0</b></span>`;
        return;
    }

    // Helper para determinar el equipo ganador pronosticado
    function getWinnerTeam(p) {
        if (p.sets && p.sets.includes('-')) {
            const [s1, s2] = p.sets.split('-').map(x => parseInt(x));
            if (!isNaN(s1) && !isNaN(s2)) {
                if (s1 > s2) return teamCasa;
                if (s2 > s1) return teamFuera;
            }
        }
        const s = (p.signo || '').toLowerCase();
        if (s.includes('favor')) return teamCasa;
        if (s.includes('contra')) return teamFuera;
        return teamCasa;
    }

    let votosCasa = 0;
    let votosFuera = 0;
    (window._adminLoadedPronosticos || []).forEach(p => {
        const w = getWinnerTeam(p);
        if (w === teamCasa) votosCasa++;
        else if (w === teamFuera) votosFuera++;
    });

    const pctCasa = totalGlobal > 0 ? Math.round((votosCasa / totalGlobal) * 100) : 0;
    const pctFuera = totalGlobal > 0 ? Math.round((votosFuera / totalGlobal) * 100) : 0;

    const colorCasa = (teamCasa === locClub) ? '#2ecc71' : '#e67e22';
    const colorFuera = (teamFuera === locClub) ? '#2ecc71' : '#e67e22';

    if (resumenCont) {
        resumenCont.innerHTML = `
            <span>Mostrando <b>${list.length}</b> de <b>${totalGlobal}</b> pronósticos</span>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <span style="color:${colorCasa}; font-weight:700;">Gana ${teamCasa}: ${votosCasa} (${pctCasa}%)</span>
                <span style="color:${colorFuera}; font-weight:700;">Gana ${teamFuera}: ${votosFuera} (${pctFuera}%)</span>
            </div>
        `;
    }

    const oficialSets = partido.oficial_sets ? String(partido.oficial_sets).trim() : null;

    let html = '';
    list.forEach(p => {
        const u = p.usuario || '';
        const n = p.nombre_real || '';
        const hasDiffName = n && n.toLowerCase() !== u.toLowerCase();
        const sets = p.sets || '-';
        const winnerTeam = getWinnerTeam(p);
        const isClubWinner = (winnerTeam === locClub);
        const colorWinner = isClubWinner ? '#2ecc71' : '#e67e22';
        const ptsDif = (p.puntos_dif !== undefined && p.puntos_dif !== null && p.puntos_dif !== '') ? `+${p.puntos_dif} pts dif.` : '';
        const ts = p.timestamp || 'Hora no registrada';

        let aciertoBadge = '';
        if (oficialSets && sets && sets.includes('-') && oficialSets.includes('-')) {
            const [predS1, predS2] = sets.split('-').map(x => parseInt(x));
            const [ofS1, ofS2] = oficialSets.split('-').map(x => parseInt(x));
            const exacto = (predS1 === ofS1 && predS2 === ofS2);
            const mismoGanador = ((predS1 > predS2 && ofS1 > ofS2) || (predS1 < predS2 && ofS1 < ofS2));
            if (exacto) {
                aciertoBadge = `<span style="font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; background:rgba(46,204,113,0.2); color:#2ecc71; border:1px solid #2ecc71;">🎯 Pleno (+5 pts)</span>`;
            } else if (mismoGanador) {
                aciertoBadge = `<span style="font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; background:rgba(52,152,219,0.2); color:#3498db; border:1px solid #3498db;">✔ Acertó Ganador (+3 pts)</span>`;
            } else {
                aciertoBadge = `<span style="font-size:0.68rem; font-weight:600; padding:2px 6px; border-radius:4px; background:rgba(231,76,60,0.12); color:#e74c3c;">Falló resultado</span>`;
            }
        }

        html += `
            <div style="background:var(--bg-general); border:1px solid var(--border-color); border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:6px; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, var(--vcv-morado), #e67e22); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.75rem;">
                            ${(u.charAt(0) || 'U').toUpperCase()}
                        </div>
                        <div>
                            <span style="font-weight:800; color:var(--text-main); font-size:0.84rem;">@${u}</span>
                            ${hasDiffName ? `<span style="font-size:0.72rem; color:var(--text-muted); margin-left:4px;">(${n})</span>` : ''}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${aciertoBadge}
                        <span style="font-size:0.82rem; font-weight:900; padding:3px 8px; border-radius:6px; background:rgba(230,126,34,0.15); color:#e67e22; border:1px solid rgba(230,126,34,0.3);">
                            ${sets}
                        </span>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; font-size:0.72rem; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.06);">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-weight:800; color:${colorWinner}; font-size:0.76rem;">
                            🏆 Gana ${winnerTeam}
                        </span>
                        ${ptsDif ? `<span style="color:var(--text-muted); font-size:0.72rem;">(${ptsDif})</span>` : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:4px; color:var(--text-muted);">
                        <i class="fas fa-clock" style="font-size:0.7rem; color:var(--secondary-color);"></i>
                        <span style="font-family:monospace; font-size:0.72rem; color:var(--text-main); font-weight:600;">${ts}</span>
                    </div>
                </div>
            </div>
        `;
    });

    listCont.innerHTML = html;
};

// Auto-inicializar la sección de predicciones al cargar el DOM si existe el panel
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.adminInicializarSeccionPredicciones === 'function') {
            try { window.adminInicializarSeccionPredicciones(); } catch(e) {}
        }
    });
}

// ==============================================================================
// 📝 GESTIÓN DE SOLICITUDES DE REGISTRO (ADMIN)
// ==============================================================================

window.abrirSolicitudesAdmin = function() {
    // 1. Cambiar a la pestaña de administración/perfil
    if (typeof window.switchTabV2 === 'function') {
        const navBtn = document.querySelector('.nav-item-v2[onclick*="enlacesRfevbSection"]');
        window.switchTabV2('enlacesRfevbSection', navBtn);
    } else if (typeof window.switchTab === 'function') {
        window.switchTab('enlacesRfevbSection');
    }

    // 2. Abrir el details principal de Admin
    const mainDet = document.getElementById('adminMainDetails');
    if (mainDet) mainDet.open = true;

    // 2.5 Cambiar a la categoría 'usuarios'
    if (typeof window.cambiarAdminCategoria === 'function') {
        window.cambiarAdminCategoria('usuarios');
    }

    // 3. Abrir la sección de solicitudes de registro
    const sec = document.getElementById('secAdminSolicitudesRegistro');
    if (sec) {
        sec.open = true;
        setTimeout(() => {
            sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    }

    // 4. Cargar la lista actualizada de solicitudes
    if (typeof window.cargarSolicitudesRegistroAdmin === 'function') {
        window.cargarSolicitudesRegistroAdmin();
    }
};

window.cargarSolicitudesRegistroAdmin = async function(silent = false) {
    const box = document.getElementById('adminSolicitudesRegistroBox');
    const badge = document.getElementById('badgeAdminSolicitudes');
    if (!box && !silent) return;

    if (!silent && box) {
        box.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:16px;">⏳ Cargando solicitudes de registro...</div>';
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'get_solicitudes_registro',
                usuario: currentUser,
                password: currentPassword
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();

        if (data && data.status === 'success') {
            const solicitudes = data.solicitudes || [];
            const ligasDisponibles = data.ligas_disponibles || [];
            const pendientes = data.pendientes !== undefined ? data.pendientes : solicitudes.filter(s => s.Estado === 'PENDIENTE').length;

            if (badge) {
                badge.innerText = pendientes;
                if (pendientes > 0) {
                    badge.style.background = '#e67e22';
                    badge.style.color = '#fff';
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.background = 'rgba(255,255,255,0.1)';
                    badge.style.color = 'var(--text-muted)';
                }
            }

            const catBadge = document.getElementById('badgeAdminCatUsuarios');
            if (catBadge) {
                if (pendientes > 0) {
                    catBadge.innerText = pendientes;
                    catBadge.style.display = 'inline-block';
                } else {
                    catBadge.style.display = 'none';
                }
            }

            if (silent) return;

            window._adminSolicitudesTab = window._adminSolicitudesTab || 'pendientes';
            const tabActual = window._adminSolicitudesTab;
            const resueltasCount = solicitudes.length - pendientes;

            const tabsHeaderHtml = `
                <div style="display:flex; gap:8px; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
                    <button type="button" onclick="window.cambiarTabSolicitudes('pendientes')" style="padding:6px 14px; font-size:0.78rem; font-weight:800; border-radius:20px; border:1px solid ${tabActual === 'pendientes' ? '#f39c12' : 'transparent'}; background:${tabActual === 'pendientes' ? 'rgba(243,156,18,0.2)' : 'rgba(255,255,255,0.06)'}; color:${tabActual === 'pendientes' ? '#f39c12' : 'var(--text-muted)'}; cursor:pointer; transition:all 0.2s;">
                        ⏳ Pendientes (${pendientes})
                    </button>
                    <button type="button" onclick="window.cambiarTabSolicitudes('historial')" style="padding:6px 14px; font-size:0.78rem; font-weight:800; border-radius:20px; border:1px solid ${tabActual === 'historial' ? '#3498db' : 'transparent'}; background:${tabActual === 'historial' ? 'rgba(52,152,219,0.2)' : 'rgba(255,255,255,0.06)'}; color:${tabActual === 'historial' ? '#3498db' : 'var(--text-muted)'}; cursor:pointer; transition:all 0.2s;">
                        📜 Historial / Resueltas (${resueltasCount})
                    </button>
                </div>
            `;

            const listToShow = solicitudes.filter(s => {
                if (tabActual === 'pendientes') return s.Estado === 'PENDIENTE';
                return s.Estado !== 'PENDIENTE';
            });

            if (listToShow.length === 0) {
                if (tabActual === 'pendientes') {
                    box.innerHTML = `
                        ${tabsHeaderHtml}
                        <div style="text-align:center; padding:24px 12px; background:rgba(0,0,0,0.15); border-radius:10px; border:1px dashed var(--border-color);">
                            <span style="font-size:2rem; display:block; margin-bottom:6px;">✅</span>
                            <b style="color:var(--text-main); font-size:0.92rem;">No hay solicitudes pendientes de revisión</b>
                            <p style="margin:4px 0 0 0; font-size:0.75rem; color:var(--text-muted);">
                                Todas las solicitudes han sido resueltas. Cuando un nuevo usuario solicite cuenta, aparecerá aquí.
                            </p>
                        </div>
                    `;
                } else {
                    box.innerHTML = `
                        ${tabsHeaderHtml}
                        <div style="text-align:center; padding:24px 12px; background:rgba(0,0,0,0.15); border-radius:10px; border:1px dashed var(--border-color);">
                            <span style="font-size:1.8rem; display:block; margin-bottom:6px;">📜</span>
                            <b style="color:var(--text-main); font-size:0.9rem;">Historial de solicitudes vacío</b>
                            <p style="margin:4px 0 0 0; font-size:0.75rem; color:var(--text-muted);">
                                Aún no hay solicitudes resueltas previamente en el sistema.
                            </p>
                        </div>
                    `;
                }
                return;
            }

            let html = tabsHeaderHtml;
            listToShow.forEach(sol => {
                const isPendiente = sol.Estado === 'PENDIENTE';
                const isAprobada = sol.Estado === 'APROBADA';
                const isRechazada = sol.Estado === 'RECHAZADA';

                let estadoBadge = '';
                let borderColor = 'var(--border-color)';
                let bgCard = 'rgba(0,0,0,0.2)';

                if (isPendiente) {
                    estadoBadge = '<span style="font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:6px; background:rgba(243, 156, 18, 0.2); color:#f39c12; border:1px solid rgba(243, 156, 18, 0.4);">⏳ Pendiente de Aprobación</span>';
                    borderColor = 'rgba(243, 156, 18, 0.45)';
                    bgCard = 'rgba(243, 156, 18, 0.05)';
                } else if (isAprobada) {
                    estadoBadge = '<span style="font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:6px; background:rgba(46, 204, 113, 0.2); color:#2ecc71; border:1px solid rgba(46, 204, 113, 0.4);">✅ Aprobada / Verificada</span>';
                    borderColor = 'rgba(46, 204, 113, 0.3)';
                } else if (isRechazada) {
                    estadoBadge = '<span style="font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:6px; background:rgba(231, 76, 60, 0.2); color:#e74c3c; border:1px solid rgba(231, 76, 60, 0.4);">❌ Rechazada</span>';
                    borderColor = 'rgba(231, 76, 60, 0.3)';
                }

                let ligasPedidasArr = [];
                try {
                    ligasPedidasArr = sol.Ligas_Solicitadas ? JSON.parse(sol.Ligas_Solicitadas) : [];
                } catch(e) {
                    ligasPedidasArr = [];
                }

                let fechaSol = '';
                if (sol.Fecha_Solicitud) {
                    try {
                        fechaSol = new Date(sol.Fecha_Solicitud).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' });
                    } catch(e) { fechaSol = String(sol.Fecha_Solicitud); }
                }

                let camposEdicionHtml = '';
                let ligasCheckboxesHtml = '';
                if (isPendiente) {
                    camposEdicionHtml = `
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
                            <div>
                                <label style="font-size:0.72rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:3px;">Nombre de Usuario (@usuario):</label>
                                <input type="text" id="sol_usuario_${sol.id}" value="${sol.Usuario || ''}" placeholder="usuario" style="width:100%; padding:8px 10px; border-radius:6px; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-main); font-size:0.8rem; box-sizing:border-box; font-weight:700;">
                            </div>
                            <div>
                                <label style="font-size:0.72rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:3px;">Nombre Completo / Apodo:</label>
                                <input type="text" id="sol_nombre_${sol.id}" value="${sol.Nombre_Real || ''}" style="width:100%; padding:8px 10px; border-radius:6px; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-main); font-size:0.8rem; box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
                            <div>
                                <label style="font-size:0.72rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:3px;">Equipo / Vinculación con el club:</label>
                                <input type="text" id="sol_equipo_${sol.id}" value="${sol.Equipo_Club || ''}" placeholder="Ej. Superliga 2, Juvenil, Aficionado..." style="width:100%; padding:8px 10px; border-radius:6px; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-main); font-size:0.8rem; box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size:0.72rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:3px;">Aviso al usuario en pantalla (opcional):</label>
                                <input type="text" id="sol_aviso_${sol.id}" placeholder="Ej. Nombre modificado por no cumplir normas..." style="width:100%; padding:8px 10px; border-radius:6px; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-main); font-size:0.8rem; box-sizing:border-box;">
                            </div>
                        </div>
                    `;

                    ligasCheckboxesHtml = `
                        <div style="margin-top:10px; padding:10px; background:rgba(0,0,0,0.25); border-radius:8px; border:1px solid var(--border-color);">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:4px;">
                                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">
                                    Asignar a Ligas al aprobar (actualiza partidos y predicciones):
                                </div>
                                <span style="font-size:0.68rem; color:#f39c12; font-weight:600;">(Global por defecto)</span>
                            </div>
                            <div id="sol_ligas_${sol.id}" style="display:flex; gap:6px; flex-wrap:wrap;">
                                ${ligasDisponibles.map(liga => {
                                    const isGlobal = liga === 'Global';
                                    const checked = (isGlobal || ligasPedidasArr.includes(liga)) ? 'checked' : '';
                                    return `
                                        <label style="margin:0; cursor:pointer; font-size:0.76rem; background:var(--bg-input); padding:5px 10px; border-radius:6px; border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:5px; user-select:none;">
                                            <input type="checkbox" value="${liga}" ${checked} style="accent-color:var(--secondary-color); cursor:pointer;">
                                            <span>${liga}</span>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }

                html += `
                    <div style="background:${bgCard}; border:1px solid ${borderColor}; border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
                            <div>
                                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                    <strong style="color:var(--text-main); font-size:0.95rem;">@${sol.Usuario}</strong>
                                    ${sol.Usuario_Original ? `<span style="font-size:0.72rem; color:var(--text-muted);">(Original: @${sol.Usuario_Original})</span>` : ''}
                                    ${estadoBadge}
                                </div>
                                <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
                                    👤 <b>${sol.Nombre_Real}</b> &nbsp;|&nbsp; ✉️ <a href="mailto:${sol.Email}" style="color:var(--secondary-color); text-decoration:none;">${sol.Email}</a>
                                </div>
                                ${sol.Motivo_Rechazo ? `<div style="font-size:0.74rem; color:#e74c3c; margin-top:2px;">❌ <b>Motivo:</b> ${sol.Motivo_Rechazo}</div>` : ''}
                            </div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-align:right;">
                                📅 ${fechaSol}
                            </div>
                        </div>

                        ${isPendiente ? camposEdicionHtml : `
                            <div style="font-size:0.76rem; color:var(--text-muted); display:flex; gap:12px; flex-wrap:wrap; margin-top:4px;">
                                <span>🏐 <b>Equipo:</b> ${sol.Equipo_Club || 'No especificado'}</span>
                                ${ligasPedidasArr.length > 0 ? `<span>🏆 <b>Ligas:</b> ${ligasPedidasArr.join(', ')}</span>` : ''}
                            </div>
                        `}

                        ${isPendiente ? ligasCheckboxesHtml : ''}

                        ${isPendiente ? `
                            <div style="display:flex; gap:8px; margin-top:6px; flex-wrap:wrap;">
                                <button type="button" class="btn" onclick="window.adminResolverSolicitud(${sol.id}, 'APROBAR')" style="flex:1; min-width:160px; padding:9px 14px; font-size:0.8rem; font-weight:800; border-radius:8px; background:#27ae60; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 8px rgba(39,174,96,0.3);">
                                    <span>✅</span> <span>Aprobar y Asignar Ligas</span>
                                </button>
                                <button type="button" class="btn" onclick="window.adminResolverSolicitud(${sol.id}, 'RECHAZAR')" style="padding:9px 14px; font-size:0.8rem; font-weight:800; border-radius:8px; background:rgba(231,76,60,0.15); color:#e74c3c; border:1px solid #e74c3c; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                                    <span>❌</span> <span>Rechazar</span>
                                </button>
                            </div>
                        ` : `
                            <div style="font-size:0.7rem; color:var(--text-muted); border-top:1px dashed rgba(255,255,255,0.08); padding-top:6px; margin-top:2px;">
                                ${sol.Revisado_Por ? `Revisado por <b>@${sol.Revisado_Por}</b>` : ''}
                                ${sol.Fecha_Resolucion ? `el ${new Date(sol.Fecha_Resolucion).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' })}` : ''}
                            </div>
                        `}
                    </div>
                `;
            });

            box.innerHTML = html;
        } else {
            if (!silent && box) {
                box.innerHTML = `<div style="text-align:center; color:#e74c3c; padding:12px;">❌ Error al cargar solicitudes: ${(data && data.message) || 'Error desconocido'}</div>`;
            }
        }
    } catch(err) {
        if (!silent && box) {
            box.innerHTML = '<div style="text-align:center; color:#e74c3c; padding:12px;">❌ Error de conexión al cargar solicitudes.</div>';
        }
    }
};

window.adminResolverSolicitud = async function(id, decision) {
    if (!id || !decision) return;

    let ligasSel = [];
    let nombreReal = '';
    let equipoClub = '';
    let nuevoUsuario = '';
    let avisoModeracion = '';
    let motivoRechazo = '';

    if (decision === 'APROBAR') {
        const cont = document.getElementById(`sol_ligas_${id}`);
        if (cont) {
            const cbs = cont.querySelectorAll('input[type="checkbox"]:checked');
            ligasSel = Array.from(cbs).map(cb => cb.value);
        }
        if (!ligasSel.includes('Global')) {
            ligasSel.unshift('Global');
        }

        const inputUsr = document.getElementById(`sol_usuario_${id}`);
        if (inputUsr) nuevoUsuario = inputUsr.value.trim().replace(/^@/, '');

        const inputNom = document.getElementById(`sol_nombre_${id}`);
        if (inputNom) nombreReal = inputNom.value.trim();

        const inputEq = document.getElementById(`sol_equipo_${id}`);
        if (inputEq) equipoClub = inputEq.value.trim();

        const inputAv = document.getElementById(`sol_aviso_${id}`);
        if (inputAv) avisoModeracion = inputAv.value.trim();

        const usrText = nuevoUsuario ? `@${nuevoUsuario}` : 'este usuario';
        const confirmMsg = `¿Confirmas la verificación y aprobación de ${usrText} con acceso a ${ligasSel.length} liga(s) (${ligasSel.join(', ')})?`;
        if (!confirm(confirmMsg)) return;
    } else {
        const mot = prompt('¿Estás seguro de que deseas rechazar esta solicitud de registro?\n\nIndica el motivo del rechazo (opcional, se le mostrará al usuario si intenta acceder):', 'No cumple los requisitos de registro del club');
        if (mot === null) return;
        motivoRechazo = mot.trim();
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'resolver_solicitud_registro',
                usuario: currentUser,
                password: currentPassword,
                id: id,
                decision: decision,
                nuevo_usuario: nuevoUsuario,
                nombre_real: nombreReal,
                equipo_club: equipoClub,
                aviso_moderacion: avisoModeracion,
                motivo_rechazo: motivoRechazo,
                ligas_seleccionadas: ligasSel
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();

        if (data && data.status === 'success') {
            if (typeof mostrarToast === 'function') {
                mostrarToast(data.message || 'Solicitud resuelta con éxito');
            } else {
                alert(data.message);
            }
            window.cargarSolicitudesRegistroAdmin();
            if (typeof window.adminCargarUsuariosLigas === 'function') {
                window.adminCargarUsuariosLigas();
            }
        } else {
            alert('Error: ' + ((data && data.message) || 'No se pudo resolver la solicitud'));
        }
    } catch(err) {
        alert('Error de conexión al resolver la solicitud.');
    }
};

window.cambiarTabSolicitudes = function(tab) {
    window._adminSolicitudesTab = tab;
    window.cargarSolicitudesRegistroAdmin();
};

// ==============================================================================
// 🏆 GESTIÓN INTEGRAL DE PERFIL Y LIGAS POR USUARIO (ADMIN)
// ==============================================================================

window.adminCargarUsuariosLigas = async function() {
    const sel = document.getElementById('selAdminGestionLigasUsuario');
    if (!sel) return;

    const prevVal = sel.value;
    sel.innerHTML = '<option value="">⏳ Cargando usuarios...</option>';

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'get_usuarios_ligas_admin',
                usuario: currentUser,
                password: currentPassword
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();

        if (data && data.status === 'success') {
            window._adminUsuariosLigasCache = data;
            window.adminRenderizarOpcionesUsuariosLigas(data.usuarios || [], prevVal);
        } else {
            sel.innerHTML = '<option value="">❌ Error al cargar usuarios</option>';
        }
    } catch(err) {
        sel.innerHTML = '<option value="">❌ Error de conexión</option>';
    }
};

window.adminRenderizarOpcionesUsuariosLigas = function(usuarios, selectVal) {
    const sel = document.getElementById('selAdminGestionLigasUsuario');
    if (!sel) return;

    let opts = '<option value="">-- Elige un usuario (' + usuarios.length + ' usuarios) --</option>';
    usuarios.forEach(u => {
        const ligasCount = (u.ligas || []).length;
        opts += `<option value="${u.usuario}">@${u.usuario} (${u.nombre_real}) [${ligasCount} ligas]</option>`;
    });
    sel.innerHTML = opts;

    if (selectVal && usuarios.some(u => u.usuario === selectVal)) {
        sel.value = selectVal;
        window.adminOnSelectUsuarioLigas();
    } else {
        const pCont = document.getElementById('adminGestionPerfilFormContainer');
        if (pCont) pCont.style.display = 'none';
    }
};

window.adminFiltrarUsuariosLigas = function(q) {
    if (!window._adminUsuariosLigasCache || !window._adminUsuariosLigasCache.usuarios) return;
    const term = (q || '').trim().toLowerCase();
    const sel = document.getElementById('selAdminGestionLigasUsuario');
    const prev = sel ? sel.value : '';

    const filtrados = window._adminUsuariosLigasCache.usuarios.filter(u => {
        return (u.usuario || '').toLowerCase().includes(term) || (u.nombre_real || '').toLowerCase().includes(term);
    });
    window.adminRenderizarOpcionesUsuariosLigas(filtrados, prev);
};

window.adminOnSelectUsuarioLigas = async function() {
    const sel = document.getElementById('selAdminGestionLigasUsuario');
    const pCont = document.getElementById('adminGestionPerfilFormContainer');
    if (!sel || !pCont) return;

    const targetUser = sel.value;
    if (!targetUser) {
        pCont.style.display = 'none';
        return;
    }

    pCont.style.display = 'block';
    pCont.style.opacity = '0.5';
    pCont.style.pointerEvents = 'none';

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_get_user_full_profile',
                usuario: currentUser,
                password: currentPassword,
                target_usuario: targetUser
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();

        if (data && data.status === 'success' && data.perfil) {
            const p = data.perfil;
            window._adminCurrentEditingUser = p.usuario;

            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            const setChk = (id, chk) => { const el = document.getElementById(id); if (el) el.checked = Boolean(chk); };

            setVal('adminEditUsuario', p.usuario);
            setVal('adminEditNombreReal', p.nombre_real);
            setVal('adminEditCorreo', p.correo);
            setVal('adminEditPassword', '');
            setVal('adminEditEquipoClub', p.equipo_club);
            setVal('adminEditJugadorDe', p.jugador_de);
            setVal('adminEditEntrenadorDe', p.entrenador_de);
            setVal('adminEditExjugador', p.exjugador);
            setVal('adminEditStaff', p.staff);
            setVal('adminEditVerificado', p.verificado || 'APROBADO');
            setVal('adminEditPermisoResultados', p.permiso_resultados);
            setVal('adminEditAvatarUrl', p.avatar_url);
            setVal('adminEditAvisoModeracion', p.aviso_moderacion);
            setVal('adminEditBorrarAvatarFlag', '0');

            setVal('adminEditGenero', p.genero || 'M');
            setVal('adminEditLesionDesc', p.lesion_desc || '');
            setVal('adminEditCustomEmoji', p.custom_emoji || '');
            setVal('adminEditCustomDesc', p.custom_desc || '');
            setVal('adminEditMotivoBaneo', p.motivo_baneo || '');

            setChk('adminEditLesionado', p.lesionado === 'X');
            setChk('adminEditBaneado', Boolean(p.baneado));
            if (typeof window.adminToggleBaneoInputs === 'function') {
                window.adminToggleBaneoInputs(Boolean(p.baneado));
            }

            setChk('adminEditAdminWeb', p.admin_web === 'X');
            setChk('adminEditPermisoMvp', p.permiso_mvp === 'X');

            // Render avatar preview
            const avPrev = document.getElementById('adminEditAvatarPreview');
            if (avPrev) {
                if (p.avatar_url) {
                    avPrev.innerHTML = `<img src="${p.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
                } else if (p.avatar && p.avatar.startsWith('data:image')) {
                    avPrev.innerHTML = `<img src="${p.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    avPrev.innerHTML = `<span style="font-size:1.4rem;">👤</span>`;
                }
            }

            // Render ligas checkboxes
            const chkCont = document.getElementById('adminGestionLigasCheckboxes');
            if (chkCont) {
                const ligasDisp = data.ligas_disponibles || [];
                const activeLigas = p.ligas || [];
                chkCont.innerHTML = ligasDisp.map(liga => {
                    const isChecked = activeLigas.includes(liga) ? 'checked' : '';
                    return `
                        <label style="margin:0; cursor:pointer; font-size:0.8rem; background:var(--bg-input); padding:7px 12px; border-radius:8px; border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:7px; user-select:none; transition:all 0.2s;">
                            <input type="checkbox" class="chk-admin-user-liga" value="${liga}" ${isChecked} style="accent-color:var(--secondary-color); cursor:pointer; width:16px; height:16px;">
                            <span style="font-weight:700;">${liga}</span>
                        </label>
                    `;
                }).join('');
            }
        } else {
            alert('Error al cargar perfil del usuario: ' + ((data && data.message) || 'Error desconocido'));
        }
    } catch(err) {
        alert('Error de conexión al cargar datos del usuario.');
    } finally {
        pCont.style.opacity = '1';
        pCont.style.pointerEvents = 'auto';
    }
};

window.adminBorrarAvatarUsuario = function() {
    const flag = document.getElementById('adminEditBorrarAvatarFlag');
    const avPrev = document.getElementById('adminEditAvatarPreview');
    const avUrl = document.getElementById('adminEditAvatarUrl');
    if (flag) flag.value = '1';
    if (avUrl) avUrl.value = '';
    if (avPrev) avPrev.innerHTML = `<span style="font-size:1.4rem;">👤</span>`;
    if (typeof mostrarToast === 'function') {
        mostrarToast('Foto de perfil marcada para eliminar. Pulsa "Guardar Cambios" para confirmar.');
    }
};

window.adminGuardarPerfilCompleto = async function() {
    const targetUser = window._adminCurrentEditingUser;
    if (!targetUser) {
        alert('No hay ningún usuario seleccionado.');
        return;
    }

    const nuevoUsuario = (document.getElementById('adminEditUsuario')?.value || '').trim().replace(/^@/, '');
    const nombreReal = (document.getElementById('adminEditNombreReal')?.value || '').trim();
    const correo = (document.getElementById('adminEditCorreo')?.value || '').trim();
    const newPassword = (document.getElementById('adminEditPassword')?.value || '').trim();
    const equipoClub = (document.getElementById('adminEditEquipoClub')?.value || '').trim();
    const jugadorDe = (document.getElementById('adminEditJugadorDe')?.value || '').trim();
    const entrenadorDe = (document.getElementById('adminEditEntrenadorDe')?.value || '').trim();
    const exjugador = (document.getElementById('adminEditExjugador')?.value || '').trim();
    const staff = (document.getElementById('adminEditStaff')?.value || '').trim();
    const verificado = document.getElementById('adminEditVerificado')?.value || 'APROBADO';
    const permisoResultados = (document.getElementById('adminEditPermisoResultados')?.value || '').trim();
    const avatarUrl = (document.getElementById('adminEditAvatarUrl')?.value || '').trim();
    const avisoModeracion = (document.getElementById('adminEditAvisoModeracion')?.value || '').trim();
    const borrarAvatar = document.getElementById('adminEditBorrarAvatarFlag')?.value === '1';

    const adminWeb = document.getElementById('adminEditAdminWeb')?.checked ? 'X' : '';
    const permisoMvp = document.getElementById('adminEditPermisoMvp')?.checked ? 'X' : '';

    const genero = document.getElementById('adminEditGenero')?.value || 'M';
    const lesionado = document.getElementById('adminEditLesionado')?.checked ? 'X' : '';
    const lesionDesc = (document.getElementById('adminEditLesionDesc')?.value || '').trim();
    const customEmoji = (document.getElementById('adminEditCustomEmoji')?.value || '').trim();
    const customDesc = (document.getElementById('adminEditCustomDesc')?.value || '').trim();
    const baneado = Boolean(document.getElementById('adminEditBaneado')?.checked);
    const motivoBaneo = (document.getElementById('adminEditMotivoBaneo')?.value || '').trim();

    const cbs = document.querySelectorAll('.chk-admin-user-liga:checked');
    const selectedLigas = Array.from(cbs).map(cb => cb.value);

    const btn = document.getElementById('btnAdminGuardarPerfilCompleto');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> <span>Guardando todos los cambios...</span>';
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_save_user_full_profile',
                usuario: currentUser,
                password: currentPassword,
                target_usuario: targetUser,
                nuevo_usuario: nuevoUsuario,
                nombre_real: nombreReal,
                correo: correo,
                new_password: newPassword,
                equipo_club: equipoClub,
                jugador_de: jugadorDe,
                entrenador_de: entrenadorDe,
                exjugador: exjugador,
                staff: staff,
                genero: genero,
                lesionado: lesionado,
                lesion_desc: lesionDesc,
                custom_emoji: customEmoji,
                custom_desc: customDesc,
                baneado: baneado,
                motivo_baneo: motivoBaneo,
                admin_web: adminWeb,
                permiso_mvp: permisoMvp,
                permiso_resultados: permisoResultados,
                verificado: verificado,
                borrar_avatar: borrarAvatar,
                avatar_url: avatarUrl,
                aviso_moderacion: avisoModeracion,
                ligas_seleccionadas: selectedLigas
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();

        if (data && data.status === 'success') {
            const canonicalUser = data.usuario || nuevoUsuario || targetUser;
            window._adminCurrentEditingUser = canonicalUser;
            if (typeof mostrarToast === 'function') {
                mostrarToast(data.message || `Perfil de @${canonicalUser} actualizado correctamente`);
            } else {
                alert(data.message);
            }
            await window.adminCargarUsuariosLigas();
            const sel = document.getElementById('selAdminGestionLigasUsuario');
            if (sel) {
                sel.value = canonicalUser;
                window.adminOnSelectUsuarioLigas();
            }
        } else {
            alert('Error: ' + ((data && data.message) || 'No se pudo guardar el perfil'));
        }
    } catch(err) {
        alert('Error de conexión al guardar el perfil.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>💾</span> <span>Guardar Todos los Cambios del Perfil</span>';
        }
    }
};

window.adminToggleBaneoInputs = function(isBanned) {
    const box = document.getElementById('adminBaneoMotivoContainer');
    const badge = document.getElementById('badgeEstadoBaneo');
    if (box) {
        box.style.display = isBanned ? 'block' : 'none';
    }
    if (badge) {
        if (isBanned) {
            badge.innerText = '🚫 SUSPENDIDO (BANEADO)';
            badge.style.background = 'rgba(231, 76, 60, 0.25)';
            badge.style.color = '#e74c3c';
        } else {
            badge.innerText = '✅ ACTIVO';
            badge.style.background = 'rgba(46, 204, 113, 0.2)';
            badge.style.color = '#2ecc71';
        }
    }
};

window.adminGuardarLigasUsuario = function() {
    window.adminGuardarPerfilCompleto();
};

window.adminEliminarUsuarioDefinitivo = async function() {
    const targetUser = window._adminCurrentEditingUser;
    if (!targetUser) {
        alert('No hay ningún usuario seleccionado.');
        return;
    }

    if (currentUser && targetUser.toLowerCase() === currentUser.toLowerCase()) {
        alert('No puedes eliminar tu propia cuenta de administrador.');
        return;
    }

    const conf = confirm(`⚠️ ATENCIÓN: ¿Estás completamente seguro de que deseas ELIMINAR al usuario @${targetUser}?\n\nEsta acción borrará definitivamente su cuenta, credenciales, pronósticos, votos y permisos de todas las tablas de la base de datos. Esta acción no se puede deshacer.`);
    if (!conf) return;

    const conf2 = prompt(`Escribe el nombre de usuario "@${targetUser}" (o "${targetUser}") para confirmar la eliminación definitiva:`);
    if (!conf2 || conf2.trim().replace(/^@/, '').toLowerCase() !== targetUser.toLowerCase()) {
        alert('Operación cancelada. El nombre de confirmación no coincide.');
        return;
    }

    const btn = document.getElementById('btnAdminEliminarUsuarioDefinitivo');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> <span>Eliminando usuario y datos...</span>';
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_delete_user',
                usuario: currentUser,
                password: currentPassword,
                target_usuario: targetUser
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();
        if (data && data.status === 'success') {
            alert(data.message || `Usuario @${targetUser} eliminado con éxito.`);
            const card = document.getElementById('adminCardEdicionUsuarioLigas');
            if (card) card.style.display = 'none';
            window._adminCurrentEditingUser = null;
            await window.adminCargarUsuariosLigas();
        } else {
            alert('Error al eliminar usuario: ' + ((data && data.message) || 'Error desconocido'));
        }
    } catch(err) {
        alert('Error de conexión al eliminar usuario: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>🗑️</span> <span>Eliminar Usuario Definitivamente de la Base de Datos</span>';
        }
    }
};

// ==========================================================================
// ORGANIZACIÓN POR TEMAS Y BÚSQUEDA RÁPIDA DE LA INTRANET ADMIN
// ==========================================================================
window.cambiarAdminCategoria = function(catName, keepSearch = false) {
    if (!keepSearch) {
        const searchInput = document.getElementById('adminQuickSearch');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            const clearBtn = document.getElementById('adminQuickSearchClear');
            if (clearBtn) clearBtn.style.display = 'none';
        }
        const noResultsMsg = document.getElementById('adminSearchNoResults');
        if (noResultsMsg) noResultsMsg.style.display = 'none';
    }

    try { sessionStorage.setItem('vcv_admin_tab', catName); } catch(e) {}

    // Botones de pestañas
    const navBtns = document.querySelectorAll('.admin-tab-btn');
    navBtns.forEach(btn => {
        if (btn.getAttribute('data-admin-cat') === catName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Paneles de categoría
    const catPanels = document.querySelectorAll('.admin-category-panel');
    catPanels.forEach(panel => {
        const pCat = panel.getAttribute('data-admin-cat');
        const header = panel.querySelector('.admin-category-header');
        if (catName === 'todas') {
            panel.style.display = 'block';
            if (header) header.classList.add('show-header');
            const tools = panel.querySelectorAll('.admin-collapsible, .admin-card-block');
            tools.forEach(t => t.style.display = '');
        } else if (pCat === catName) {
            panel.style.display = 'block';
            if (header) header.classList.remove('show-header');
            const tools = panel.querySelectorAll('.admin-collapsible, .admin-card-block');
            tools.forEach(t => t.style.display = '');
        } else {
            panel.style.display = 'none';
            if (header) header.classList.remove('show-header');
        }
    });

    // Mensaje explicativo
    const infoText = document.getElementById('adminCatInfoText');
    if (infoText) {
        const descMap = {
            'usuarios': '👥 <b>Usuarios y Accesos:</b> Registro de cuentas, ligas asignadas, creación manual, contraseñas, permisos especiales y buzón de sugerencias.',
            'partidos': '🏐 <b>Partidos y Competición:</b> Subir resultados de jornadas, gestión de plantilla y MVP de Superliga 2, porras de aficionados y comprobación de horarios oficiales (RFEVB y FVCyL).',
            'rankings': '❄️ <b>Rankings y Clasificaciones:</b> Control de congelación de fin de semana, descongelado inmediato y configuración de ligas activas.',
            'sistema': '⚙️ <b>Servidor y Sistema:</b> Modo mantenimiento web, monitor silencioso de accesos, sincronizaciones de servidor, pruebas push y optimización D1.',
            'todas': '📋 <b>Todas las herramientas:</b> Vista completa desplegada y agrupada por categorías temáticas.'
        };
        infoText.innerHTML = descMap[catName] || '';
    }
};

window.filtrarHerramientasAdmin = function(query) {
    const q = (query || '').trim().toLowerCase();
    const clearBtn = document.getElementById('adminQuickSearchClear');
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

    const catPanels = document.querySelectorAll('.admin-category-panel');
    const noResultsMsg = document.getElementById('adminSearchNoResults');
    const infoText = document.getElementById('adminCatInfoText');

    if (!q) {
        if (noResultsMsg) noResultsMsg.style.display = 'none';
        if (infoText) infoText.style.display = 'block';
        let savedTab = 'usuarios';
        try { savedTab = sessionStorage.getItem('vcv_admin_tab') || 'usuarios'; } catch(e) {}
        window.cambiarAdminCategoria(savedTab, true);
        return;
    }

    if (infoText) infoText.style.display = 'none';

    let totalMatches = 0;
    catPanels.forEach(panel => {
        let panelMatches = 0;
        const tools = panel.querySelectorAll('.admin-collapsible, .admin-card-block');
        tools.forEach(tool => {
            const summary = tool.querySelector('summary');
            const titleText = (summary ? (summary.textContent || summary.innerText) : '') || '';
            const fullText = (tool.textContent || tool.innerText) || '';
            const matches = titleText.toLowerCase().includes(q) || fullText.toLowerCase().includes(q);
            if (matches) {
                tool.style.display = '';
                panelMatches++;
                totalMatches++;
            } else {
                tool.style.display = 'none';
            }
        });

        const header = panel.querySelector('.admin-category-header');
        if (panelMatches > 0) {
            panel.style.display = 'block';
            if (header) header.classList.add('show-header');
        } else {
            panel.style.display = 'none';
            if (header) header.classList.remove('show-header');
        }
    });

    // Desactivar pestaña activa para indicar modo búsqueda
    const navBtns = document.querySelectorAll('.admin-tab-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));

    if (noResultsMsg) {
        if (totalMatches === 0) {
            noResultsMsg.style.display = 'block';
            noResultsMsg.innerHTML = `🔍 No se encontraron herramientas que coincidan con "<b>${query.replace(/</g, '&lt;')}</b>"`;
        } else {
            noResultsMsg.style.display = 'none';
        }
    }
};

// Escuchar mensajes push enviados desde el Service Worker
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data && event.data.action === 'abrirSolicitudesAdmin') {
            if (typeof window.abrirSolicitudesAdmin === 'function') {
                window.abrirSolicitudesAdmin();
            }
        }
    });
}

// ============================================================================
// VERIFICADOR DE HORARIOS OFICIALES (RFEVB EsVoley + FVCyL Leverade)
// ============================================================================
window._adminHorariosCache = [];

function _escHorarioHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _actualizarBadgeYBotonHorarios() {
    const pendientes = (window._adminHorariosCache || []).filter(c => !c._applied && (c.cambio_fecha_hora || c.cambio_pabellon || c.campo_invertido));
    const aplicablesAuto = pendientes.filter(c => !c.fed_finalizado);
    const badge = document.getElementById('badgeCambiosHorariosAdmin');
    const btnAll = document.getElementById('btnAplicarTodosHorariosFed');

    if (badge) {
        badge.style.display = 'inline-block';
        if (pendientes.length > 0) {
            badge.textContent = pendientes.length === 1 ? '1 cambio' : `${pendientes.length} cambios`;
            badge.style.background = 'rgba(243, 156, 18, 0.25)';
            badge.style.color = '#f5c542';
            badge.style.border = '1px solid #f39c12';
        } else {
            badge.textContent = 'Al día';
            badge.style.background = 'rgba(46, 204, 113, 0.2)';
            badge.style.color = '#2ecc71';
            badge.style.border = '1px solid #2ecc71';
        }
    }
    if (btnAll) {
        btnAll.style.display = aplicablesAuto.length > 0 ? 'flex' : 'none';
    }
}

window._renderListaCambiosHorarios = function() {
    const lista = document.getElementById('adminHorariosLista');
    if (!lista) return;

    const cambios = window._adminHorariosCache || [];
    _actualizarBadgeYBotonHorarios();

    if (cambios.length === 0) {
        lista.innerHTML = `
            <div style="background: rgba(46, 204, 113, 0.12); border: 1px solid rgba(46, 204, 113, 0.4); border-radius: 10px; padding: 14px; text-align: center; color: #2ecc71; font-size: 0.82rem; font-weight: 700;">
                ✅ Todo al día: los horarios y pabellones coinciden con RFEVB y FVCyL.
            </div>`;
        return;
    }

    lista.innerHTML = cambios.map((c, idx) => {
        const safeId = _escHorarioHtml(c.id_partido);
        const fedColor = c.federacion === 'RFEVB' ? '#9b59b6' : '#3498db';
        const isApplied = Boolean(c._applied);
        const isFedFinished = Boolean(c.fed_finalizado);
        const isSwapped = Boolean(c.campo_invertido);
        const borderCol = isApplied
            ? 'rgba(46, 204, 113, 0.5)'
            : (isFedFinished ? 'rgba(231, 76, 60, 0.65)' : (isSwapped ? 'rgba(155, 89, 182, 0.65)' : 'rgba(243, 156, 18, 0.45)'));
        const bgCol = isApplied ? 'rgba(46, 204, 113, 0.08)' : (isFedFinished ? 'rgba(231, 76, 60, 0.08)' : 'rgba(0, 0, 0, 0.28)');

        const tags = [];
        tags.push(`<span style="background:${fedColor}22; color:${fedColor}; border:1px solid ${fedColor}66; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">${_escHorarioHtml(c.federacion)}</span>`);
        if (c.categoria) tags.push(`<span style="background:rgba(255,255,255,0.08); color:var(--text-main); padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:700;">${_escHorarioHtml(c.categoria)}</span>`);
        if (c.jornada) tags.push(`<span style="background:rgba(255,255,255,0.06); color:var(--text-muted); padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:700;">J.${_escHorarioHtml(c.jornada)}</span>`);
        if (c.es_canarias) tags.push(`<span style="background:rgba(241,196,15,0.18); color:#f1c40f; border:1px solid rgba(241,196,15,0.4); padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">Canarias (+1h peninsular)</span>`);
        if (isSwapped) tags.push(`<span style="background:rgba(155,89,182,0.22); color:#d2a8ff; border:1px solid #9b59b6; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">CAMPO INVERTIDO</span>`);
        if (isFedFinished) tags.push(`<span style="background:rgba(231,76,60,0.24); color:#ff7675; border:1px solid #e74c3c; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">FINALIZADO EN FEDERACIÓN</span>`);
        if (c.postponed) tags.push(`<span style="background:rgba(231,76,60,0.2); color:#ff6b6b; border:1px solid #e74c3c; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">APLAZADO</span>`);
        if (c.canceled) tags.push(`<span style="background:rgba(231,76,60,0.25); color:#ff6b6b; border:1px solid #e74c3c; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">CANCELADO</span>`);

        const warnFinishedHtml = isFedFinished ? `
            <div style="margin-top:6px; padding:7px 9px; border-radius:6px; background:rgba(231,76,60,0.14); border:1px solid rgba(231,76,60,0.4); color:#ffb3b3; font-size:0.72rem; line-height:1.35;">
                ⚠️ <b>Atención:</b> Este partido ya figura como <b>finalizado</b> en la federación. Las casillas están desmarcadas por seguridad; revisa si ya se jugó o si se invirtió el orden de campo antes de aplicar.
            </div>` : '';

        const ubiRow = isSwapped ? `
            <div style="background:rgba(155,89,182,0.14); border:1px solid rgba(155,89,182,0.4); border-radius:6px; padding:7px 9px; margin-top:6px; font-size:0.75rem;">
                <label style="display:flex; align-items:flex-start; gap:7px; cursor:${isApplied ? 'default' : 'pointer'}; margin:0;">
                    <input type="checkbox" id="chkHorarioUbi_${idx}" ${!isFedFinished ? 'checked' : ''} ${isApplied ? 'disabled' : ''} style="margin-top:2px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:800; color:#d2a8ff; margin-bottom:2px;">Cambio de campo (Local / Visitante)</div>
                        <div style="color:var(--text-muted);">BD actual: <span style="text-decoration:line-through; color:#e74c3c;">${_escHorarioHtml(c.db_ubicacion || '')}</span></div>
                        <div style="color:var(--text-main);">Federación: <b style="color:#2ecc71;">${_escHorarioHtml(c.fed_ubicacion || '')}</b></div>
                    </div>
                </label>
            </div>` : '';

        const fechaRow = c.cambio_fecha_hora ? `
            <div style="background:rgba(243,156,18,0.1); border:1px solid rgba(243,156,18,0.3); border-radius:6px; padding:7px 9px; margin-top:6px; font-size:0.75rem;">
                <label style="display:flex; align-items:flex-start; gap:7px; cursor:${isApplied ? 'default' : 'pointer'}; margin:0;">
                    <input type="checkbox" id="chkHorarioFecha_${idx}" ${c.cambio_fecha_hora && !isFedFinished ? 'checked' : ''} ${isApplied ? 'disabled' : ''} style="margin-top:2px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:800; color:#f5c542; margin-bottom:2px;">Cambio de fecha / hora</div>
                        <div style="color:var(--text-muted);">BD actual: <span style="text-decoration:line-through; color:#e74c3c;">${_escHorarioHtml(c.db_fecha)}</span></div>
                        <div style="color:var(--text-main);">Federación: <b style="color:#2ecc71;">${_escHorarioHtml(c.fed_fecha)}</b></div>
                    </div>
                </label>
            </div>` : `
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:5px;">
                Fecha y hora sin cambios: <b>${_escHorarioHtml(c.db_fecha)}</b>
            </div>`;

        const pabRow = c.cambio_pabellon ? `
            <div style="background:rgba(52,152,219,0.1); border:1px solid rgba(52,152,219,0.3); border-radius:6px; padding:7px 9px; margin-top:6px; font-size:0.75rem;">
                <label style="display:flex; align-items:flex-start; gap:7px; cursor:${isApplied ? 'default' : 'pointer'}; margin:0;">
                    <input type="checkbox" id="chkHorarioPab_${idx}" ${c.cambio_pabellon && !isFedFinished ? 'checked' : ''} ${isApplied ? 'disabled' : ''} style="margin-top:2px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:800; color:#5dade2; margin-bottom:2px;">Cambio de pabellón</div>
                        <div style="color:var(--text-muted);">BD actual: <span style="text-decoration:line-through; color:#e74c3c;">${_escHorarioHtml(c.db_pabellon)}</span></div>
                        <div style="color:var(--text-main);">Federación: <b style="color:#2ecc71;">${_escHorarioHtml(c.fed_pabellon)}</b></div>
                    </div>
                </label>
            </div>` : `
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
                Pabellón sin cambios: <b>${_escHorarioHtml(c.db_pabellon)}</b>
            </div>`;

        const hasApplicable = c.cambio_fecha_hora || c.cambio_pabellon || isSwapped;
        const actionBtnHtml = isApplied
            ? `<div style="margin-top:8px; padding:6px 10px; border-radius:6px; background:rgba(46,204,113,0.18); color:#2ecc71; font-size:0.75rem; font-weight:800; text-align:center;">✅ Actualizado en la base de datos</div>`
            : (hasApplicable ? `
                <div style="margin-top:8px; display:flex; justify-content:flex-end;">
                    <button type="button" id="btnApplyHorario_${idx}" onclick="window.adminAplicarCambioHorario(${idx})" style="padding:7px 13px; border-radius:7px; border:none; background:linear-gradient(135deg, #27ae60, #2ecc71); color:#000; font-size:0.76rem; font-weight:800; cursor:pointer;">
                        Aplicar cambio
                    </button>
                </div>` : '');

        return `
            <div style="background:${bgCol}; border:1px solid ${borderCol}; border-radius:10px; padding:11px 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:5px;">
                    <div style="display:flex; flex-wrap:wrap; gap:5px; align-items:center;">${tags.join('')}</div>
                    <code style="font-size:0.68rem; color:var(--text-muted);">${safeId}</code>
                </div>
                <div style="font-size:0.86rem; font-weight:800; color:var(--text-main);">${_escHorarioHtml(c.partido)}</div>
                ${warnFinishedHtml}
                ${ubiRow}
                ${fechaRow}
                ${pabRow}
                ${c.updated_at ? `<div style="font-size:0.66rem; color:var(--text-muted); margin-top:5px;">Última modificación en federación: ${_escHorarioHtml(c.updated_at)}</div>` : ''}
                ${actionBtnHtml}
            </div>`;
    }).join('');
};

window.adminComprobarHorariosOficiales = async function() {
    const btn = document.getElementById('btnComprobarHorariosFed');
    const lista = document.getElementById('adminHorariosLista');
    const resumen = document.getElementById('adminHorariosResumen');
    const chkPasados = document.getElementById('chkHorariosIncluirPasados');
    const incluirPasados = Boolean(chkPasados && chkPasados.checked);

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Consultando RFEVB y FVCyL...';
    }
    if (lista) {
        lista.innerHTML = '<div style="text-align:center; padding:16px; font-size:0.78rem; color:var(--text-muted);">Consultando APIs oficiales de EsVoley (RFEVB) y Leverade (FVCyL)...</div>';
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_check_official_schedules',
                usuario: currentUser,
                password: currentPassword,
                incluir_pasados: incluirPasados
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();

        if (!data || data.status !== 'success') {
            throw new Error((data && data.message) || 'No se pudieron consultar las federaciones.');
        }

        window._adminHorariosCache = Array.isArray(data.changes) ? data.changes : [];
        const s = data.summary || {};

        if (resumen) {
            resumen.style.display = 'block';
            const errHtml = (s.errors && s.errors.length > 0)
                ? `<div style="margin-top:6px; color:#f39c12; font-size:0.72rem;">⚠️ Avisos de fuente: ${_escHorarioHtml(s.errors.join(' | '))}</div>`
                : '';
            resumen.innerHTML = `
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; align-items:center;">
                    <span>Revisados <b>${s.total_checked || 0}</b> partidos (RFEVB: <b>${s.rfevb_checked || 0}</b> · FVCyL: <b>${s.fvcl_checked || 0}</b>)</span>
                    <span style="color:var(--text-muted); font-size:0.7rem;">${_escHorarioHtml(data.checked_at || '')}</span>
                </div>
                ${errHtml}`;
        }

        window._renderListaCambiosHorarios();
    } catch (err) {
        if (lista) {
            lista.innerHTML = `<div style="background:rgba(231,76,60,0.14); border:1px solid #e74c3c; border-radius:8px; padding:12px; color:#ff6b6b; font-size:0.78rem;">Error al comprobar horarios: ${_escHorarioHtml(err.message)}</div>`;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🔍 Comprobar RFEVB + FVCyL ahora';
        }
    }
};

window.adminAplicarCambioHorario = async function(idx) {
    const item = (window._adminHorariosCache || [])[idx];
    if (!item || item._applied) return;

    const chkF = document.getElementById(`chkHorarioFecha_${idx}`);
    const chkP = document.getElementById(`chkHorarioPab_${idx}`);
    const chkU = document.getElementById(`chkHorarioUbi_${idx}`);
    const aplicarFecha = Boolean(chkF ? chkF.checked : (item.cambio_fecha_hora && !item.fed_finalizado));
    const aplicarPab = Boolean(chkP ? chkP.checked : (item.cambio_pabellon && !item.fed_finalizado));
    const aplicarUbi = Boolean(chkU ? chkU.checked : (item.campo_invertido && !item.fed_finalizado));

    if (!aplicarFecha && !aplicarPab && !aplicarUbi) {
        alert('Marca al menos Fecha/Hora, Pabellón o Campo para aplicar el cambio.');
        return;
    }

    const btn = document.getElementById(`btnApplyHorario_${idx}`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Guardando...';
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_apply_official_schedule_changes',
                usuario: currentUser,
                password: currentPassword,
                cambios: [{
                    id_partido: item.id_partido,
                    fecha: item.fed_fecha,
                    timestamp: item.fed_timestamp,
                    pabellon: item.fed_pabellon,
                    ubicacion: item.fed_ubicacion,
                    aplicar_fecha: aplicarFecha,
                    aplicar_pabellon: aplicarPab,
                    aplicar_ubicacion: aplicarUbi
                }]
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();
        if (!data || data.status !== 'success') {
            throw new Error((data && data.message) || 'Error guardando el cambio.');
        }

        item._applied = true;
        // Sincronizar también en memoria local si los partidos están cargados
        if (window.appData) {
            const syncArr = (arr) => {
                if (!Array.isArray(arr)) return;
                arr.forEach(p => {
                    if (p.id_partido === item.id_partido) {
                        if (aplicarFecha && item.fed_timestamp > 0) p.timestamp = item.fed_timestamp;
                        if (aplicarPab && item.fed_pabellon) p.pabellon = item.fed_pabellon;
                        if (aplicarUbi && item.fed_ubicacion) p.ubicacion = item.fed_ubicacion;
                    }
                });
            };
            syncArr(window.appData.todos_partidos);
            syncArr(window.appData.equipos);
        }

        window._renderListaCambiosHorarios();
    } catch (err) {
        alert('Error aplicando cambio: ' + err.message);
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Aplicar cambio';
        }
    }
};

window.adminAplicarTodosCambiosHorarios = async function() {
    const cache = window._adminHorariosCache || [];
    const payload = [];
    const idxs = [];

    cache.forEach((item, idx) => {
        if (item._applied) return;
        const chkF = document.getElementById(`chkHorarioFecha_${idx}`);
        const chkP = document.getElementById(`chkHorarioPab_${idx}`);
        const chkU = document.getElementById(`chkHorarioUbi_${idx}`);
        const aplicarFecha = Boolean(chkF ? chkF.checked : (item.cambio_fecha_hora && !item.fed_finalizado));
        const aplicarPab = Boolean(chkP ? chkP.checked : (item.cambio_pabellon && !item.fed_finalizado));
        const aplicarUbi = Boolean(chkU ? chkU.checked : (item.campo_invertido && !item.fed_finalizado));
        if (aplicarFecha || aplicarPab || aplicarUbi) {
            idxs.push({ idx, aplicarFecha, aplicarPab, aplicarUbi });
            payload.push({
                id_partido: item.id_partido,
                fecha: item.fed_fecha,
                timestamp: item.fed_timestamp,
                pabellon: item.fed_pabellon,
                ubicacion: item.fed_ubicacion,
                aplicar_fecha: aplicarFecha,
                aplicar_pabellon: aplicarPab,
                aplicar_ubicacion: aplicarUbi
            });
        }
    });

    if (payload.length === 0) return;

    const btnAll = document.getElementById('btnAplicarTodosHorariosFed');
    if (btnAll) {
        btnAll.disabled = true;
        btnAll.textContent = `⏳ Aplicando (${payload.length})...`;
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_apply_official_schedule_changes',
                usuario: currentUser,
                password: currentPassword,
                cambios: payload
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();
        if (!data || data.status !== 'success') {
            throw new Error((data && data.message) || 'Error aplicando cambios.');
        }

        idxs.forEach(({ idx, aplicarFecha, aplicarPab, aplicarUbi }) => {
            const item = cache[idx];
            item._applied = true;
            if (window.appData) {
                const syncArr = (arr) => {
                    if (!Array.isArray(arr)) return;
                    arr.forEach(p => {
                        if (p.id_partido === item.id_partido) {
                            if (aplicarFecha && item.fed_timestamp > 0) p.timestamp = item.fed_timestamp;
                            if (aplicarPab && item.fed_pabellon) p.pabellon = item.fed_pabellon;
                            if (aplicarUbi && item.fed_ubicacion) p.ubicacion = item.fed_ubicacion;
                        }
                    });
                };
                syncArr(window.appData.todos_partidos);
                syncArr(window.appData.equipos);
            }
        });

        window._renderListaCambiosHorarios();
    } catch (err) {
        alert('Error aplicando cambios: ' + err.message);
    } finally {
        if (btnAll) {
            btnAll.disabled = false;
            btnAll.innerHTML = '✅ Aplicar todos los cambios';
        }
    }
};

// ========================================================================
// VERIFICADOR DE RESULTADOS OFICIALES (RFEVB EsVoley + FVCyL Leverade)
// ========================================================================
window._adminResultadosCache = [];

function _actualizarBadgeYBotonResultados() {
    const pendientes = (window._adminResultadosCache || []).filter(r => !r._applied);
    const badge = document.getElementById('badgeResultadosAdmin');
    const btnAll = document.getElementById('btnAplicarTodosResultadosFed');

    if (badge) {
        badge.style.display = 'inline-block';
        if (pendientes.length > 0) {
            badge.textContent = pendientes.length === 1 ? '1 pendiente' : `${pendientes.length} pendientes`;
            badge.style.background = 'rgba(46, 204, 113, 0.25)';
            badge.style.color = '#2ecc71';
            badge.style.border = '1px solid #2ecc71';
        } else {
            badge.textContent = 'Al día';
            badge.style.background = 'rgba(255, 255, 255, 0.08)';
            badge.style.color = 'var(--text-muted)';
            badge.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        }
    }
    if (btnAll) {
        btnAll.style.display = pendientes.length > 0 ? 'flex' : 'none';
        if (pendientes.length > 0) {
            btnAll.innerHTML = `⚡ Aplicar todos los resultados (${pendientes.length})`;
        }
    }
}

window._renderListaResultadosOficiales = function() {
    const lista = document.getElementById('adminResultadosLista');
    if (!lista) return;

    const items = window._adminResultadosCache || [];
    _actualizarBadgeYBotonResultados();

    if (items.length === 0) {
        lista.innerHTML = `
            <div style="background: rgba(46, 204, 113, 0.12); border: 1px solid rgba(46, 204, 113, 0.4); border-radius: 10px; padding: 14px; text-align: center; color: #2ecc71; font-size: 0.82rem; font-weight: 700;">
                ✅ Todos los resultados coinciden o no hay partidos finalizados pendientes de anotar.
            </div>`;
        return;
    }

    lista.innerHTML = items.map((r, idx) => {
        const safeId = _escHorarioHtml(r.id_partido);
        const fedColor = r.federacion === 'RFEVB' ? '#9b59b6' : '#3498db';
        const isApplied = Boolean(r._applied);
        const isNuevo = r.tipo_diferencia === 'NUEVO';
        const isCorrec = r.tipo_diferencia === 'CORRECCION';
        const isActa = r.tipo_diferencia === 'ACTA';
        const isSwapped = Boolean(r.campo_invertido);

        const borderCol = isApplied
            ? 'rgba(46, 204, 113, 0.5)'
            : (isNuevo ? 'rgba(46, 204, 113, 0.45)' : (isActa ? 'rgba(52, 152, 219, 0.45)' : 'rgba(243, 156, 18, 0.45)'));
        const bgCol = isApplied ? 'rgba(46, 204, 113, 0.08)' : 'rgba(0, 0, 0, 0.28)';

        const tags = [];
        tags.push(`<span style="background:${fedColor}22; color:${fedColor}; border:1px solid ${fedColor}66; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">${_escHorarioHtml(r.federacion)}</span>`);
        if (r.categoria) tags.push(`<span style="background:rgba(255,255,255,0.08); color:var(--text-main); padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:700;">${_escHorarioHtml(r.categoria)}</span>`);
        if (r.jornada) tags.push(`<span style="background:rgba(255,255,255,0.06); color:var(--text-muted); padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:700;">J.${_escHorarioHtml(r.jornada)}</span>`);
        if (isNuevo) tags.push(`<span style="background:rgba(46,204,113,0.2); color:#2ecc71; border:1px solid #2ecc71; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">NUEVO RESULTADO</span>`);
        if (isCorrec) tags.push(`<span style="background:rgba(243,156,18,0.22); color:#f5c542; border:1px solid #f39c12; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">CORRECCIÓN</span>`);
        if (isActa) tags.push(`<span style="background:rgba(52,152,219,0.22); color:#5dade2; border:1px solid #3498db; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">ACTA DISPONIBLE</span>`);
        if (isSwapped) tags.push(`<span style="background:rgba(155,89,182,0.22); color:#d2a8ff; border:1px solid #9b59b6; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800;">CAMPO INVERTIDO</span>`);

        const setsComparisonHtml = `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 10px; margin-top:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Resultado (Sets):</span>
                    <span style="font-size:0.88rem; font-weight:900; color:#2ecc71; background:rgba(46,204,113,0.15); padding:2px 8px; border-radius:6px; border:1px solid rgba(46,204,113,0.3);">${_escHorarioHtml(r.fed_sets)}</span>
                </div>
                ${r.db_sets ? (r.sets_diferentes
                    ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px;">BD actual: <span style="text-decoration:line-through; color:#e74c3c; font-weight:700;">${_escHorarioHtml(r.db_sets)}</span> <span style="color:#e74c3c; font-weight:800;">(Difiere)</span></div>`
                    : `<div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px;">BD actual: <span style="color:#2ecc71; font-weight:800;">${_escHorarioHtml(r.db_sets)}</span> <span style="color:#2ecc71; font-weight:700;">(Coincide ✅)</span></div>`
                ) : '<div style="font-size:0.7rem; color:#f39c12; margin-bottom:4px;">BD actual: Sin resultado registrado</div>'}
                
                <div style="margin-top:6px;">
                    <div style="font-size:0.73rem; color:var(--text-muted); font-weight:600; margin-bottom:2px;">Parciales:</div>
                    <div style="font-size:0.78rem; color:var(--text-main); font-weight:700; word-break:break-word;">${_escHorarioHtml(r.fed_parciales)}</div>
                    ${r.db_parciales && r.parciales_diferentes
                        ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">BD actual: <span style="text-decoration:line-through; color:#e74c3c; font-weight:700;">${_escHorarioHtml(r.db_parciales)}</span> <span style="color:#e74c3c; font-weight:800;">(Difieren)</span></div>`
                        : (r.db_parciales ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">BD actual: <span style="color:#2ecc71; font-weight:800;">${_escHorarioHtml(r.db_parciales)}</span> <span style="color:#2ecc71; font-weight:700;">(Coinciden ✅)</span></div>` : '')
                    }
                </div>
                ${isActa ? `<div style="margin-top:6px; font-size:0.72rem; color:#5dade2; background:rgba(52,152,219,0.12); border:1px dashed rgba(52,152,219,0.35); padding:5px 8px; border-radius:6px;">ℹ️ Marcador correcto en BD. La federación ha publicado el acta oficial para vincular.</div>` : ''}
            </div>`;

        const linksHtml = [];
        if (r.acta_url) {
            linksHtml.push(`<a href="${_escHorarioHtml(r.acta_url)}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; color:#5dade2; text-decoration:none; padding:3px 7px; border-radius:4px; background:rgba(52,152,219,0.15); border:1px solid rgba(52,152,219,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Ver Acta Oficial</a>`);
        }
        if (r.streaming) {
            linksHtml.push(`<a href="${_escHorarioHtml(r.streaming)}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; color:#e67e22; text-decoration:none; padding:3px 7px; border-radius:4px; background:rgba(230,126,34,0.15); border:1px solid rgba(230,126,34,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Streaming</a>`);
        }

        const btnLabel = isActa ? 'Guardar Acta Oficial' : (isCorrec ? 'Corregir resultado' : 'Aplicar resultado');
        const appliedLabel = isActa ? '✅ Acta oficial guardada' : '✅ Resultado aplicado y partido cerrado';

        const actionBtnHtml = isApplied
            ? `<div style="margin-top:8px; padding:6px 10px; border-radius:6px; background:rgba(46,204,113,0.18); color:#2ecc71; font-size:0.75rem; font-weight:800; text-align:center;">${appliedLabel}</div>`
            : `
                <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">${linksHtml.join('')}</div>
                    <button type="button" id="btnApplyRes_${idx}" onclick="window.adminAplicarResultadoOficial(${idx})" style="padding:7px 13px; border-radius:7px; border:none; background:linear-gradient(135deg, #1abc9c, #2ecc71); color:#000; font-size:0.76rem; font-weight:800; cursor:pointer; box-shadow: 0 2px 6px rgba(46,204,113,0.3);">
                        ${btnLabel}
                    </button>
                </div>`;

        return `
            <div style="background:${bgCol}; border:1px solid ${borderCol}; border-radius:10px; padding:11px 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:5px;">
                    <div style="display:flex; flex-wrap:wrap; gap:5px; align-items:center;">${tags.join('')}</div>
                    <code style="font-size:0.68rem; color:var(--text-muted);">${safeId}</code>
                </div>
                <div style="font-size:0.86rem; font-weight:800; color:var(--text-main);">${_escHorarioHtml(r.partido)}</div>
                ${setsComparisonHtml}
                ${actionBtnHtml}
            </div>`;
    }).join('');
};

window.adminComprobarResultadosOficiales = async function() {
    const btn = document.getElementById('btnComprobarResultadosFed');
    const lista = document.getElementById('adminResultadosLista');
    const resumen = document.getElementById('adminResultadosResumen');
    const chkSoloPend = document.getElementById('chkResultadosSoloPendientes');
    const soloPendientes = Boolean(chkSoloPend ? chkSoloPend.checked : true);

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Comprobando actas y marcadores...';
    }
    if (lista) {
        lista.innerHTML = '<div style="text-align:center; padding:16px; font-size:0.78rem; color:var(--text-muted);">Consultando marcadores y actas oficiales de EsVoley (RFEVB) y Leverade (FVCyL)...</div>';
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_check_official_results',
                usuario: currentUser,
                password: currentPassword,
                solo_pendientes: soloPendientes
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();

        if (!data || data.status !== 'success') {
            throw new Error((data && data.message) || 'No se pudieron consultar los resultados oficiales.');
        }

        window._adminResultadosCache = Array.isArray(data.results) ? data.results : [];
        const s = data.summary || {};

        if (resumen) {
            resumen.style.display = 'block';
            const errHtml = (s.errors && s.errors.length > 0)
                ? `<div style="margin-top:6px; color:#f39c12; font-size:0.72rem;">⚠️ Avisos de fuente: ${_escHorarioHtml(s.errors.join(' | '))}</div>`
                : '';
            const actaText = s.acta_count ? ` · ${s.acta_count} actas` : '';
            resumen.innerHTML = `
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; align-items:center;">
                    <span>Revisados <b>${s.total_checked || 0}</b> partidos · Encontrados <b>${s.results_found || 0}</b> resultados (${s.new_count || 0} nuevos · ${s.correction_count || 0} correcciones${actaText})</span>
                    <span style="color:var(--text-muted); font-size:0.7rem;">${_escHorarioHtml(data.checked_at || '')}</span>
                </div>
                ${errHtml}`;
        }

        window._renderListaResultadosOficiales();
    } catch (err) {
        if (lista) {
            lista.innerHTML = `<div style="background:rgba(231,76,60,0.14); border:1px solid #e74c3c; border-radius:8px; padding:12px; color:#ff6b6b; font-size:0.78rem;">Error al comprobar resultados oficiales: ${_escHorarioHtml(err.message)}</div>`;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🔍 Comprobar Resultados Oficiales ahora';
        }
    }
};

window.adminSincronizarActasOficiales = async function() {
    const btn = document.getElementById('btnSyncActasFed');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Sincronizando actas...';
    }
    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_sync_actas',
                usuario: currentUser,
                password: currentPassword
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();
        if (!data || data.status !== 'success') {
            throw new Error((data && data.message) || 'Error al sincronizar actas');
        }
        if (data.actas_added > 0) {
            alert(`✅ ${data.message}`);
        } else {
            alert(`ℹ️ ${data.message}`);
        }
    } catch(e) {
        alert('Error al sincronizar actas oficiales: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '📄 Sincronizar Actas Oficiales';
        }
    }
};

window.adminAplicarResultadoOficial = async function(idx) {
    const item = (window._adminResultadosCache || [])[idx];
    if (!item || item._applied) return;

    const btn = document.getElementById(`btnApplyRes_${idx}`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Guardando...';
    }

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_apply_official_results',
                usuario: currentUser,
                password: currentPassword,
                resultados: [{
                    id_partido: item.id_partido,
                    sets: item.fed_sets,
                    parciales: item.fed_parciales,
                    streaming: item.streaming || '',
                    acta_url: item.acta_url || '',
                    cerrar_partido: true
                }]
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();
        if (!data || data.status !== 'success') {
            throw new Error((data && data.message) || 'Error guardando el resultado oficial.');
        }

        item._applied = true;

        // Actualizar en memoria local para sincronizar cartelera y panel sin recargar
        if (window.appData) {
            ['equipos', 'todos_partidos'].forEach(arrKey => {
                if (Array.isArray(window.appData[arrKey])) {
                    let eq = window.appData[arrKey].find(p => p.id_partido === item.id_partido);
                    if (eq) {
                        eq.oficial_sets = item.fed_sets;
                        eq.oficial_parciales = item.fed_parciales;
                        eq.estado = 'CERRADO';
                        if (item.streaming && !eq.streaming) eq.streaming = item.streaming;
                        if (item.acta_url) eq.acta = item.acta_url;
                        eq.actualizado_por = currentUser;
                        eq.actualizado_fecha = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
                    }
                }
            });
            if (typeof window.renderCarteleraHTML === 'function') {
                window.renderCarteleraHTML(window.appData);
            }
        }

        mostrarToast(`✅ Resultado oficial guardado para ${item.id_partido}`);
        window._renderListaResultadosOficiales();
    } catch (err) {
        alert('Error aplicando resultado: ' + err.message);
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Aplicar resultado';
        }
    }
};

window.adminAplicarTodosResultadosOficiales = async function() {
    const cache = window._adminResultadosCache || [];
    const pendientes = cache.filter(r => !r._applied);
    if (pendientes.length === 0) return;

    if (!confirm(`¿Quieres aplicar los ${pendientes.length} resultados oficiales a la vez? Se cerrarán los partidos y se actualizarán automáticamente las clasificaciones.`)) {
        return;
    }

    const btnAll = document.getElementById('btnAplicarTodosResultadosFed');
    if (btnAll) {
        btnAll.disabled = true;
        btnAll.innerHTML = `⏳ Aplicando (${pendientes.length})...`;
    }

    const payload = pendientes.map(item => ({
        id_partido: item.id_partido,
        sets: item.fed_sets,
        parciales: item.fed_parciales,
        streaming: item.streaming || '',
        acta_url: item.acta_url || '',
        cerrar_partido: true
    }));

    try {
        const res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'admin_apply_official_results',
                usuario: currentUser,
                password: currentPassword,
                resultados: payload
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await res.json();
        if (!data || data.status !== 'success') {
            throw new Error((data && data.message) || 'Error aplicando los resultados oficiales.');
        }

        pendientes.forEach(item => {
            item._applied = true;
            if (window.appData) {
                ['equipos', 'todos_partidos'].forEach(arrKey => {
                    if (Array.isArray(window.appData[arrKey])) {
                        let eq = window.appData[arrKey].find(p => p.id_partido === item.id_partido);
                        if (eq) {
                            eq.oficial_sets = item.fed_sets;
                            eq.oficial_parciales = item.fed_parciales;
                            eq.estado = 'CERRADO';
                            if (item.streaming && !eq.streaming) eq.streaming = item.streaming;
                            if (item.acta_url) eq.acta = item.acta_url;
                            eq.actualizado_por = currentUser;
                            eq.actualizado_fecha = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
                        }
                    }
                });
            }
        });

        if (window.appData && typeof window.renderCarteleraHTML === 'function') {
            window.renderCarteleraHTML(window.appData);
        }

        mostrarToast(data.message || `✅ Se han aplicado ${pendientes.length} resultados oficiales.`);
        window._renderListaResultadosOficiales();
    } catch (err) {
        alert('Error aplicando resultados: ' + err.message);
    } finally {
        if (btnAll) {
            btnAll.disabled = false;
            btnAll.innerHTML = '⚡ Aplicar todos los resultados';
        }
    }
};
