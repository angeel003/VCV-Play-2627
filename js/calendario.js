// ==================================================================
// CALENDARIO OFICIAL, FILTROS Y RESULTADOS DE PARTIDOS JUGADOS
// ==================================================================

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            reg.update(); // Forzar actualización siempre
        }).catch(err => console.log('SW Error:', err));
    });
}

const btnForceSyncExcelEl = document.getElementById('btnForceSyncExcel');
if(btnForceSyncExcelEl) btnForceSyncExcelEl.addEventListener('click', function(e) {
    e.preventDefault();
    const btn = this;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Sincronizando...';
    btn.disabled = true;
    
    fetchSeguro(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'fix_timestamps', usuario: currentUser, password: currentPassword }),
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
// CONMUTACIÓN DE SUB-PESTAÑAS (PRÓXIMOS VS RESULTADOS)
// ---------------------------------------------------
window.cambiarSubTabCalendario = function(tab) {
    const btnFuturos = document.getElementById('subtabCalendarioFuturos');
    const btnResultados = document.getElementById('subtabCalendarioResultados');
    const viewFuturos = document.getElementById('calendarioFuturosView');
    const viewResultados = document.getElementById('calendarioResultadosView');

    // Si los datos no están procesados aún, inicializarlos
    if (!window.appData || !window.appData.partidos_jugados || window.appData.partidos_jugados.length === 0) {
        if (typeof window.initCalendar === 'function') {
            window.initCalendar();
        }
    }

    if (tab === 'resultados') {
        if (btnFuturos) {
            btnFuturos.style.background = 'transparent';
            btnFuturos.style.color = 'var(--text-muted)';
            btnFuturos.style.boxShadow = 'none';
        }
        if (btnResultados) {
            btnResultados.style.background = 'var(--vcv-morado)';
            btnResultados.style.color = '#fff';
            btnResultados.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        }
        if (viewFuturos) viewFuturos.style.setProperty('display', 'none', 'important');
        if (viewResultados) viewResultados.style.setProperty('display', 'block', 'important');
        
        if (typeof window.renderResultados === 'function') {
            window.renderResultados();
        }
    } else {
        if (btnFuturos) {
            btnFuturos.style.background = 'var(--vcv-morado)';
            btnFuturos.style.color = '#fff';
            btnFuturos.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        }
        if (btnResultados) {
            btnResultados.style.background = 'transparent';
            btnResultados.style.color = 'var(--text-muted)';
            btnResultados.style.boxShadow = 'none';
        }
        if (viewFuturos) viewFuturos.style.setProperty('display', 'block', 'important');
        if (viewResultados) viewResultados.style.setProperty('display', 'none', 'important');
        
        if (typeof window.renderCalendar === 'function') {
            window.renderCalendar();
        }
    }
    if (window.lucide) window.lucide.createIcons();
};

// ---------------------------------------------------
// HELPER PARA EXTRAER Y FORMATEAR DATOS DE CANDIDATOS A MVP
// ---------------------------------------------------
function formatMvpCandidate(candStr) {
    if (!candStr) return { dorsal: null, nombre: '', apodo: '', posicion: '', photoSrc: '', initials: 'VC' };
    if (typeof window.parseCandInfo === 'function') {
        let p = window.parseCandInfo(candStr);
        if (p && (p.dorsal || p.nombre || p.apodo)) return p;
    }
    let s = String(candStr).trim();
    let dorMatch = s.match(/#(\d+)/);
    let dorsal = dorMatch ? parseInt(dorMatch[1]) : null;
    let posMatch = s.match(/\[([^\]]+)\]/);
    let posicion = posMatch ? posMatch[1].trim() : '';
    let apMatch = s.match(/\(([^)]+)\)/);
    let apodo = apMatch ? apMatch[1].trim() : '';
    let cleaned = s.replace(/#\d+\s*/, '').replace(/\s*\([^)]+\)/, '').replace(/\s*\[[^\]]+\]/, '').trim();
    let nombre = cleaned || apodo || s;
    return {
        dorsal: dorsal,
        nombre: nombre,
        apodo: apodo || nombre,
        posicion: posicion,
        photoSrc: dorsal ? ((typeof window.getJugadorPhotoUrl === 'function') ? window.getJugadorPhotoUrl(dorsal) : 'files/images/jugadores/dorsal_' + dorsal + '.png') : '',
        initials: (apodo || nombre || 'VC').substring(0, 2).toUpperCase()
    };
}

// ---------------------------------------------------
// INICIALIZACIÓN DE CALENDARIO Y RESULTADOS
// ---------------------------------------------------
window.initCalendar = function() {
    if(!window.appData) return;
    
    // Equipos que sigue el usuario actualmente (con fallback a los 5 oficiales)
    let misEquipos = (window.appData.mis_equipos_siguiendo && Array.isArray(window.appData.mis_equipos_siguiendo) && window.appData.mis_equipos_siguiendo.length > 0)
        ? window.appData.mis_equipos_siguiendo
        : ['Universidad de Valladolid VCV', 'VALCYL VCV', 'Valladolid CV Vacceas', 'VCV Maria Molina', 'VCV Meseta'];

    // Obtener conjunto de todos los partidos disponibles
    let pool = Array.isArray(window.appData.todos_partidos) && window.appData.todos_partidos.length > 0 
        ? window.appData.todos_partidos 
        : (Array.isArray(window.appData.equipos) ? window.appData.equipos : []);

    // 1. Partidos futuros por jugar (filtrado estricto por mis equipos seguidos)
    let futuros = pool.filter(p => {
        let deMiEquipo = misEquipos.includes(p.equipo_local) || misEquipos.includes(p.rival);
        let esFuturo = p.estado !== "FINALIZADO" && p.estado !== "CERRADO";
        return deMiEquipo && esFuturo;
    });
    
    futuros.sort((a, b) => {
        let tsA = a.timestamp || Infinity; 
        let tsB = b.timestamp || Infinity;
        return tsA - tsB; 
    });
    
    window.appData.calendario_procesado = futuros;

    let catSelect = document.getElementById('calendarTeamSelect');
    if(catSelect) {
        let equiposSet = new Set();
        futuros.forEach(p => {
            if (p.equipo_local && misEquipos.includes(p.equipo_local)) equiposSet.add(p.equipo_local);
            if (p.rival && misEquipos.includes(p.rival)) equiposSet.add(p.rival);
        });
        let uniqueCats = Array.from(equiposSet).sort();
        
        let currentOptions = '<option value="">-- Todos mis equipos --</option>';
        uniqueCats.forEach(cat => {
            currentOptions += `<option value="${cat}">${cat}</option>`;
        });
        catSelect.innerHTML = currentOptions;
        
        let savedCat = localStorage.getItem('pref_calendario');
        if (savedCat && uniqueCats.includes(savedCat)) {
            catSelect.value = savedCat;
        }
    }

    // 2. Partidos jugados con resultado oficial (filtrado estricto por mis equipos seguidos)
    let jugados = pool.filter(p => {
        let deMiEquipo = misEquipos.includes(p.equipo_local) || misEquipos.includes(p.rival);
        let hasScore = !!(p.oficial_sets && String(p.oficial_sets).trim() !== "");
        return deMiEquipo && (hasScore || p.estado === "FINALIZADO");
    });

    // Ordenar de más reciente a más antiguo (descendente por timestamp)
    jugados.sort((a, b) => {
        let tsA = a.timestamp || 0;
        let tsB = b.timestamp || 0;
        return tsB - tsA;
    });

    window.appData.partidos_jugados = jugados;

    // Actualizar badge con el total de partidos jugados
    let badgeCount = document.getElementById('badgeCountResultados');
    if (badgeCount) {
        badgeCount.textContent = jugados.length;
        badgeCount.style.display = jugados.length > 0 ? 'inline-block' : 'none';
    }

    // Poblar selector de equipos para resultados (únicamente equipos seguidos con partidos jugados)
    let resTeamSelect = document.getElementById('resultadosTeamSelect');
    if (resTeamSelect) {
        let equiposJugadosSet = new Set();
        jugados.forEach(p => {
            if (p.equipo_local && misEquipos.includes(p.equipo_local)) equiposJugadosSet.add(p.equipo_local);
            if (p.rival && misEquipos.includes(p.rival)) equiposJugadosSet.add(p.rival);
        });
        let uniqueEquipos = Array.from(equiposJugadosSet).sort();
        let optionsResHtml = '<option value="">-- Todos mis equipos --</option>';
        uniqueEquipos.forEach(team => {
            optionsResHtml += `<option value="${team}">${team}</option>`;
        });
        resTeamSelect.innerHTML = optionsResHtml;
    }

    // Poblar selector de jornadas para resultados
    let resJornadaSelect = document.getElementById('resultadosJornadaSelect');
    if (resJornadaSelect) {
        let jornadasSet = new Set();
        jugados.forEach(p => {
            if (p.jornada_eq) jornadasSet.add(String(p.jornada_eq).trim());
        });
        let uniqueJornadas = Array.from(jornadasSet).sort((a, b) => {
            let numA = parseInt(a) || 0;
            let numB = parseInt(b) || 0;
            return numB - numA; // Jornada más reciente arriba
        });
        let jOptionsHtml = '<option value="">-- Todas las jornadas --</option>';
        uniqueJornadas.forEach(j => {
            jOptionsHtml += `<option value="${j}">Jornada ${j}</option>`;
        });
        resJornadaSelect.innerHTML = jOptionsHtml;
    }
    
    // Renderizar según la vista que esté visible
    const viewResultados = document.getElementById('calendarioResultadosView');
    if (viewResultados && viewResultados.style.display !== 'none') {
        window.renderResultados();
    } else {
        window.renderCalendar();
    }
};

// ---------------------------------------------------
// RENDERIZADO DE PARTIDO FUTURO (TARJETA)
// ---------------------------------------------------
function renderMatchCardHtml(eq) {
    let fechaFormateada = window.formatMatchDate ? window.formatMatchDate(eq.timestamp) : (eq.timestamp ? new Date(eq.timestamp).toLocaleString() : "Por confirmar");
    
    let localTeamName = (eq.ubicacion === 'LOCAL') ? eq.equipo_local : eq.rival;
    let visitTeamName = (eq.ubicacion === 'LOCAL') ? eq.rival : eq.equipo_local;
    
    let abrevLocalRaw = (eq.ubicacion === 'LOCAL') ? eq.abrev_local : eq.abrev_rival;
    let abrevVisitRaw = (eq.ubicacion === 'LOCAL') ? eq.abrev_rival : eq.abrev_local;
    
    let localAbrev = (abrevLocalRaw || localTeamName.substring(0,3)).toUpperCase();
    let visitAbrev = (abrevVisitRaw || visitTeamName.substring(0,3)).toUpperCase();

    let safeLocalName = localTeamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    let safeVisitName = visitTeamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    let localLogo = `<picture><source srcset="files/images/escudos/${safeLocalName}.webp?v=20261108_v3" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeLocalName}.png?v=20261108_v3" alt="${localTeamName}" onload="this.parentNode.parentNode.style.border='none'; this.parentNode.parentNode.style.background='transparent';" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\'font-weight:900; font-size: 1.2rem;\'>${localAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
    let visitLogo = `<picture><source srcset="files/images/escudos/${safeVisitName}.webp?v=20261108_v3" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeVisitName}.png?v=20261108_v3" alt="${visitTeamName}" onload="this.parentNode.parentNode.style.border='none'; this.parentNode.parentNode.style.background='transparent';" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\'font-weight:900; font-size: 1.2rem;\'>${visitAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
    
    let infoPabellon = eq.pabellon ? `<div style="margin-top:2px; font-size:0.75rem; color:var(--text-muted); word-break:break-word;"><i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-top:-2px; flex-shrink:0;"></i> <span>${eq.pabellon}</span></div>` : '';

    let btnStreaming = eq.streaming 
        ? `<a href="${eq.streaming}" target="_blank" class="btn-streaming-v2 active" style="text-decoration:none;"><i data-lucide="play" style="width:14px;height:14px;"></i> Streaming</a>` 
        : `<button class="btn-streaming-v2 disabled" disabled style="background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-muted); padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:bold; cursor:not-allowed;"><i data-lucide="play-square" style="width:12px;height:12px;"></i> Sin enlace</button>`;

    let catFilename = eq.categoria + ".svg";
    let catLower = (eq.categoria || "").toLowerCase();
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

    let shortCat = window.getShortCategory ? window.getShortCategory(eq.categoria) : (eq.categoria || "").toUpperCase();
    let cleanPab = window.cleanPabellon ? window.cleanPabellon(eq.pabellon) : (eq.pabellon || "");
    let curHeaderStyle = window.getCardHeaderStyle ? window.getCardHeaderStyle() : 'opt1';

    let catLogoHtml = "";
    if (isFvcl) {
        catLogoHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <img loading="lazy" src="files/images/${catFilename}?v=20261108_v1" style="height: 24px; width: auto;" alt="FVCL" onerror="this.style.display='none'">
                <span style="color: var(--secondary-color); font-weight: 800; font-size:0.75rem; white-space:nowrap;">
                  ${shortCat}
                </span>
            </div>`;
    } else {
        catLogoHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <img loading="lazy" src="files/images/logo_esvoley.svg" style="height: 28px; width: auto;" alt="EsVoley" onerror="this.style.display='none'">
                <img loading="lazy" src="files/images/${catFilename}?v=20261108_v1" style="height: 28px; width: auto;" alt="${eq.categoria}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block'; this.previousElementSibling.style.display='none';">
                <span style="color: var(--secondary-color); font-weight: 800; font-size:0.75rem; display: none;">
                  ${shortCat}
                </span>
            </div>`;
    }
        
    let borderColor = eq.es_derby ? 'border-color: var(--secondary-color); box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);' : '';
    
    let localRoleHtml = `<span class="team-role-v2" style="color: var(--success); font-weight:800; display:flex; align-items:center; gap:4px;">🏠 LOCAL</span>`;
    let visitRoleHtml = `<span class="team-role-v2" style="color: var(--text-muted); font-weight:800; display:flex; align-items:center; gap:4px;">✈️ VISITANTE</span>`;

    let headerStripHtml = `
    <div class="match-header-strip-v2 opt4-header" style="display:flex; flex-direction:column; gap:5px; width:100%; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px;">
            <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                ${catLogoHtml}
            </div>
            <div style="text-align: right; color:var(--text-muted); font-size:0.78rem; font-weight:600; white-space:nowrap; flex-shrink:0;">
                <i data-lucide="calendar" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-top:-2px;"></i> ${fechaFormateada}
            </div>
        </div>
        ${(eq.es_derby || cleanPab) ? `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px; font-size:0.73rem;">
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                ${eq.es_derby ? `<div style="background:linear-gradient(90deg, #b06000, #d4af37); color:#fff; padding:2px 7px; border-radius:6px; font-size:0.68rem; font-weight:900; display:inline-flex; align-items:center; gap:4px; box-shadow: 0 2px 6px rgba(212, 175, 55, 0.4);">⚡ DERBY</div>` : ''}
            </div>
            ${cleanPab ? `
            <div style="color:var(--text-muted); text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; flex:1; margin-left:auto;" title="${cleanPab}">
                <i data-lucide="map-pin" style="width: 11px; height: 11px; display: inline-block; vertical-align: middle; margin-top:-2px; opacity:0.8;"></i> <span>${cleanPab}</span>
            </div>` : ''}
        </div>` : ''}
    </div>`;
    
    return `
    <div class="vcv-card-v2" style="margin-bottom:20px; ${borderColor}">
        ${headerStripHtml}

        <div class="teams-versus-container-v2" style="margin-top: 15px;">
            <div class="team-box-v2">
                <div class="team-avatar-v2">${localLogo}</div>
                <span class="team-name-v2">${localTeamName}</span>
                ${localRoleHtml}
            </div>
            <div class="vs-divider-v2" style="display:flex; flex-direction:column; align-items:center; gap:10px;">
                <div style="font-size:0.75rem; color:var(--vcv-dorado); font-weight:900; text-transform:uppercase; letter-spacing:1px; white-space:nowrap; margin-bottom:-4px;">J. ${eq.jornada_eq || '-'}</div>
                <div>VS</div>
                ${btnStreaming}
            </div>
            <div class="team-box-v2">
                <div class="team-avatar-v2">${visitLogo}</div>
                <span class="team-name-v2">${visitTeamName}</span>
                ${visitRoleHtml}
            </div>
        </div>
            </div>`;
}

// ---------------------------------------------------
// RENDERIZADO DE PARTIDO JUGADO (MARCADOR Y RESULTADO)
// ---------------------------------------------------
function renderMatchResultCardHtml(eq) {
    let fechaFormateada = window.formatMatchDate ? window.formatMatchDate(eq.timestamp) : (eq.timestamp ? new Date(eq.timestamp).toLocaleString() : "Fecha por confirmar");

    let localTeamName = (eq.ubicacion === 'LOCAL') ? eq.equipo_local : eq.rival;
    let visitTeamName = (eq.ubicacion === 'LOCAL') ? eq.rival : eq.equipo_local;
    
    let abrevLocalRaw = (eq.ubicacion === 'LOCAL') ? eq.abrev_local : eq.abrev_rival;
    let abrevVisitRaw = (eq.ubicacion === 'LOCAL') ? eq.abrev_rival : eq.abrev_local;
    
    let localAbrev = (abrevLocalRaw || localTeamName.substring(0,3)).toUpperCase();
    let visitAbrev = (abrevVisitRaw || visitTeamName.substring(0,3)).toUpperCase();

    let safeLocalName = localTeamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    let safeVisitName = visitTeamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    let localLogo = `<picture><source srcset="files/images/escudos/${safeLocalName}.webp?v=20261108_v3" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeLocalName}.png?v=20261108_v3" alt="${localTeamName}" onload="this.parentNode.parentNode.style.border='none'; this.parentNode.parentNode.style.background='transparent';" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\'font-weight:900; font-size: 1.2rem;\'>${localAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
    let visitLogo = `<picture><source srcset="files/images/escudos/${safeVisitName}.webp?v=20261108_v3" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeVisitName}.png?v=20261108_v3" alt="${visitTeamName}" onload="this.parentNode.parentNode.style.border='none'; this.parentNode.parentNode.style.background='transparent';" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\'font-weight:900; font-size: 1.2rem;\'>${visitAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
    
    let infoPabellon = eq.pabellon ? `<div style="margin-top:2px; font-size:0.75rem; color:var(--text-muted); word-break:break-word;"><i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-top:-2px; flex-shrink:0;"></i> <span>${eq.pabellon}</span></div>` : '';

    // Categoría logo
    let catFilename = eq.categoria + ".svg";
    let catLower = (eq.categoria || "").toLowerCase();
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

    let shortCat = window.getShortCategory ? window.getShortCategory(eq.categoria) : (eq.categoria || "").toUpperCase();
    let cleanPab = window.cleanPabellon ? window.cleanPabellon(eq.pabellon) : (eq.pabellon || "");
    let curHeaderStyle = window.getCardHeaderStyle ? window.getCardHeaderStyle() : 'opt1';

    let catLogoHtml = "";
    if (isFvcl) {
        catLogoHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <img loading="lazy" src="files/images/${catFilename}?v=20261108_v1" style="height: 24px; width: auto;" alt="FVCL" onerror="this.style.display='none'">
                <span style="color: var(--secondary-color); font-weight: 800; font-size:0.75rem; white-space:nowrap;">
                  ${shortCat}
                </span>
            </div>`;
    } else {
        catLogoHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <img loading="lazy" src="files/images/logo_esvoley.svg" style="height: 28px; width: auto;" alt="EsVoley" onerror="this.style.display='none'">
                <img loading="lazy" src="files/images/${catFilename}?v=20261108_v1" style="height: 28px; width: auto;" alt="${eq.categoria}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block'; this.previousElementSibling.style.display='none';">
                <span style="color: var(--secondary-color); font-weight: 800; font-size:0.75rem; display: none;">
                  ${shortCat}
                </span>
            </div>`;
    }

    // Puntuación en Sets
    let setsL = 0;
    let setsV = 0;
    if (eq.oficial_sets && String(eq.oficial_sets).includes('-')) {
        let parts = String(eq.oficial_sets).split('-');
        setsL = parseInt(parts[0]) || 0;
        setsV = parseInt(parts[1]) || 0;
    }

    let localGana = setsL > setsV;
    let visitGana = setsV > setsL;

    let misEquipos = (window.appData && Array.isArray(window.appData.mis_equipos_siguiendo) && window.appData.mis_equipos_siguiendo.length > 0)
        ? window.appData.mis_equipos_siguiendo
        : ['Universidad de Valladolid VCV', 'VALCYL VCV', 'Valladolid CV Vacceas', 'VCV Maria Molina', 'VCV Meseta'];

    // Detección rigurosa de Derby (partido entre dos equipos seguidos del club o flag es_derby)
    let isDerby = Boolean(eq.es_derby || (misEquipos.includes(eq.equipo_local) && misEquipos.includes(eq.rival)));

    let isVcvLocal = (eq.ubicacion === 'LOCAL');
    let isVcvWin = (isVcvLocal && localGana) || (!isVcvLocal && visitGana);

    let outcomeBadge = "";
    let cardBorderHighlight = "";

    if (isDerby) {
        let winnerAbrev = localGana ? localAbrev : (visitGana ? visitAbrev : '');
        if (winnerAbrev) {
            outcomeBadge = `<span style="background: rgba(212, 175, 55, 0.16); color: var(--vcv-dorado); border: 1px solid rgba(212, 175, 55, 0.45); padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="trophy" style="width:12px;height:12px;"></i> GANA ${winnerAbrev}</span>`;
        } else {
            outcomeBadge = `<span style="background: rgba(212, 175, 55, 0.16); color: var(--vcv-dorado); border: 1px solid rgba(212, 175, 55, 0.45); padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">DERBY</span>`;
        }
        cardBorderHighlight = 'border-left: 4px solid var(--vcv-dorado); border-color: var(--secondary-color); box-shadow: 0 0 16px rgba(212, 175, 55, 0.25);';
    } else {
        outcomeBadge = isVcvWin
            ? `<span style="background: rgba(46, 204, 113, 0.16); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.35); padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="check" style="width:12px;height:12px;"></i> VICTORIA</span>`
            : `<span style="background: rgba(231, 76, 60, 0.16); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.35); padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">DERROTA</span>`;
        cardBorderHighlight = isVcvWin
            ? 'border-left: 4px solid #2ecc71;'
            : 'border-left: 4px solid rgba(231, 76, 60, 0.5);';
    }

    let localRoleHtml = `<span class="team-role-v2" style="color: var(--success); font-weight:800; display:flex; align-items:center; gap:4px;">🏠 LOCAL${isDerby && localGana ? ' <span style="background:rgba(212,175,55,0.2); color:var(--vcv-dorado); font-size:0.65rem; padding:1px 5px; border-radius:4px; border:1px solid rgba(212,175,55,0.4);">🏆 GANA</span>' : ''}</span>`;
    let visitRoleHtml = `<span class="team-role-v2" style="color: var(--text-muted); font-weight:800; display:flex; align-items:center; gap:4px;">✈️ VISITANTE${isDerby && visitGana ? ' <span style="background:rgba(212,175,55,0.2); color:var(--vcv-dorado); font-size:0.65rem; padding:1px 5px; border-radius:4px; border:1px solid rgba(212,175,55,0.4);">🏆 GANA</span>' : ''}</span>`;

    let btnStreaming = eq.streaming 
        ? `<a href="${eq.streaming}" target="_blank" class="btn-streaming-v2 active" style="text-decoration:none; margin-top:2px;"><i data-lucide="play" style="width:12px;height:12px;"></i> Streaming</a>` 
        : "";

    // Desglose de Parciales y Total de Puntos
    let parcialesHtml = "";

    if (eq.oficial_parciales && String(eq.oficial_parciales).trim() !== "") {
        let rawChips = String(eq.oficial_parciales).split(/\s*,\s*|\s*;\s*/);
        let totalPtsL = 0;
        let totalPtsV = 0;
        let validSetsCount = 0;

        let chipsHtml = rawChips.map((pStr, idx) => {
            let pParts = pStr.trim().split('-');
            if (pParts.length === 2) {
                let pL = parseInt(pParts[0]);
                let pV = parseInt(pParts[1]);
                if (!isNaN(pL) && !isNaN(pV)) {
                    totalPtsL += pL;
                    totalPtsV += pV;
                    validSetsCount++;
                }
                let colL = pL > pV ? 'color: var(--vcv-dorado); font-weight: 800;' : 'color: var(--text-muted); font-weight: 600;';
                let colV = pV > pL ? 'color: var(--vcv-dorado); font-weight: 800;' : 'color: var(--text-muted); font-weight: 600;';
                return `<span title="Set ${idx+1}" style="display:inline-flex; align-items:center; gap:3px; padding:3px 7px; border-radius:6px; background:rgba(255,255,255,0.06); font-size:0.75rem; border:1px solid rgba(255,255,255,0.09);">
                    <span style="${colL}">${pL}</span>
                    <span style="color:var(--text-muted); opacity:0.6; font-size:0.65rem;">-</span>
                    <span style="${colV}">${pV}</span>
                </span>`;
            }
            return `<span style="padding:2px 6px; border-radius:6px; background:rgba(255,255,255,0.05); font-size:0.75rem; color:var(--text-muted);">${pStr}</span>`;
        }).join('');

        let totalBadgeHtml = "";
        if (validSetsCount > 0) {
            let diffOficial = Math.abs(totalPtsL - totalPtsV);
            let ganadorPuntosAbrev = totalPtsL > totalPtsV ? localAbrev : (totalPtsV > totalPtsL ? visitAbrev : '');
            let difLabel = diffOficial === 0 ? 'Empate' : `+${diffOficial}${ganadorPuntosAbrev ? ' ' + ganadorPuntosAbrev : ''}`;
            
            totalBadgeHtml = `
            <span title="Puntos totales oficiales del partido" style="display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:6px; background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.35); font-size:0.75rem; font-weight:800; color:var(--text-main); ">
                <span style="color:var(--vcv-dorado); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px;">Total Puntos:</span>
                <span style="${totalPtsL > totalPtsV ? 'color:var(--vcv-dorado); font-weight:900;' : 'color:var(--text-muted);'}">${totalPtsL}</span>
                <span style="color:var(--text-muted); opacity:0.6; font-size:0.65rem;">-</span>
                <span style="${totalPtsV > totalPtsL ? 'color:var(--vcv-dorado); font-weight:900;' : 'color:var(--text-muted);'}">${totalPtsV}</span>
                <span style="color:var(--vcv-dorado); font-size:0.72rem; font-weight:900;">(${difLabel})</span>
            </span>`;
        }

        parcialesHtml = `
        <div style="margin-top:12px; padding-top:10px; border-top:1px dashed var(--border-color); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center;">
            <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:6px;">
                <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-right:2px;">Parciales:</span>
                ${chipsHtml}
            </div>
            ${totalBadgeHtml ? `<div>${totalBadgeHtml}</div>` : ''}
        </div>`;
    }

    // MVP Oficial (bloque dedicado y limpio, sin el botón de grabación)
    let mvpHtml = "";
    if (eq.mvp_oficial && String(eq.mvp_oficial).trim() !== "") {
        let oInfo = formatMvpCandidate(eq.mvp_oficial);
        let displayName = oInfo.nombre || oInfo.apodo || eq.mvp_oficial;
        let hasPhoto = oInfo.photoSrc && String(oInfo.photoSrc).trim() !== "";
        let photoHtml = hasPhoto
            ? `<div style="position:relative; width:44px; height:44px; min-width:44px; aspect-ratio:1/1; border-radius:10px; border:1.5px solid var(--vcv-dorado); overflow:hidden; background:radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(93,23,137,0.3) 100%); display:flex; align-items:flex-end; justify-content:center; flex-shrink:0;">
                   <img loading="lazy" src="${oInfo.photoSrc}" alt="${oInfo.apodo}" style="width:100%; height:100%; object-fit:contain; object-position:bottom center;" onerror="this.onerror=null; this.outerHTML='<span style=\'font-weight:900; font-size:1rem; color:var(--vcv-dorado);\'>${oInfo.initials || '⭐'}</span>';">
               </div>`
            : `<div style="width:40px; height:40px; min-width:40px; border-radius:10px; background:linear-gradient(135deg, rgba(212,175,55,0.2), rgba(106,44,112,0.3)); border:1.5px solid var(--vcv-dorado); display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">
                   ⭐
               </div>`;

        let calVotingBarsHtml = '';
        let mostrarPct = (eq.mvp_mostrar_porcentajes !== false && eq.mvp_mostrar_porcentajes !== 0 && eq.mvp_mostrar_porcentajes !== '0');
        let recuentoList = Array.isArray(eq.mvp_votos_recuento) ? eq.mvp_votos_recuento.filter(v => v && v.jugador) : [];
        if (mostrarPct && recuentoList.length >= 2) {
            let totalGeneral = recuentoList.reduce((acc, cur) => acc + (parseInt(cur.total) || 0), 0);
            let sortedList = [...recuentoList].map(item => {
                let pInf = formatMvpCandidate(item.jugador);
                let count = parseInt(item.total) || 0;
                let pct = totalGeneral > 0 ? Math.round((count / totalGeneral) * 100) : 0;
                let isWinner = (eq.mvp_oficial && (item.jugador === eq.mvp_oficial || (pInf.dorsal && oInfo.dorsal && pInf.dorsal === oInfo.dorsal) || (pInf.apodo && oInfo.apodo && pInf.apodo.toLowerCase() === oInfo.apodo.toLowerCase())));
                return { ...item, pInf, count, pct, isWinner };
            });
            sortedList.sort((a, b) => (b.isWinner ? 1 : 0) - (a.isWinner ? 1 : 0) || (b.count - a.count));

            let barsRows = sortedList.map(cand => {
                let nameLabel = `${cand.isWinner ? '👑 ' : ''}${cand.pInf.dorsal ? '#' + cand.pInf.dorsal + ' ' : ''}${cand.pInf.apodo || cand.jugador}`;
                let labelColor = cand.isWinner ? '#ffd700' : 'rgba(255, 255, 255, 0.9)';
                let pctColor = cand.isWinner ? '#f1c40f' : 'var(--text-muted)';
                let barBg = cand.isWinner 
                    ? 'linear-gradient(90deg, #d4af37, #f1c40f)' 
                    : 'linear-gradient(90deg, rgba(142, 68, 173, 0.7), rgba(186, 104, 200, 0.7))';
                let barGlow = cand.isWinner ? 'box-shadow: 0 0 6px rgba(241, 196, 15, 0.4);' : '';
                let fontWeight = cand.isWinner ? '800' : '600';

                return `
                <div style="margin-bottom: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; margin-bottom: 2px;">
                        <span style="font-weight: ${fontWeight}; color: ${labelColor}; display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${nameLabel}
                        </span>
                        <span style="font-weight: 800; color: ${pctColor}; font-size: 0.72rem; margin-left: 6px; flex-shrink: 0;">
                            ${cand.pct}%
                        </span>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255, 255, 255, 0.08); border-radius: 999px; overflow: hidden; position: relative;">
                        <div style="width: ${Math.max(cand.pct, 2)}%; height: 100%; background: ${barBg}; border-radius: 999px; ${barGlow} transition: width 0.6s ease;"></div>
                    </div>
                </div>`;
            }).join('');

            calVotingBarsHtml = `
            <div style="margin-top: 4px; padding-top: 6px; border-top: 1px solid rgba(212, 175, 55, 0.2); width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-size: 0.64rem; font-weight: 800; color: var(--vcv-dorado); text-transform: uppercase; letter-spacing: 0.4px;">
                        📊 Votación Popular
                    </span>
                    <span style="font-size: 0.62rem; color: var(--text-muted); font-weight: 700;">
                        ${totalGeneral} votos
                    </span>
                </div>
                ${barsRows}
            </div>`;
        }

        mvpHtml = `
        <div class="calendario-mvp-card" style="margin-top:12px; padding:10px 12px; background:linear-gradient(135deg, rgba(212,175,55,0.12), rgba(106,44,112,0.18)); border:1px solid rgba(212,175,55,0.35); border-radius:12px; display:flex; flex-direction:column; gap:6px; box-sizing:border-box;">
            <div style="display:flex; align-items:center; justify-content:flex-start; text-align:left; gap:12px; width:100%;">
                ${photoHtml}
                <div style="min-width:0; flex:1; text-align:left;">
                    <div style="font-size:0.68rem; font-weight:800; color:var(--vcv-dorado); text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; justify-content:flex-start; gap:5px; flex-wrap:wrap;">
                        <span>👑 MVP VALCYL</span>
                        ${oInfo.posicion ? `<span style="font-size:0.62rem; color:var(--text-muted); font-weight:600; background:rgba(255,255,255,0.08); padding:1px 5px; border-radius:4px; text-transform:none;">${oInfo.posicion}</span>` : ''}
                    </div>
                    <div style="font-size:0.92rem; font-weight:800; color:var(--text-main); line-height:1.25; word-break:break-word; margin-top:3px; text-align:left;">
                        ${oInfo.dorsal ? `<span style="color:var(--vcv-dorado); font-weight:900;">#${oInfo.dorsal}</span> ` : ''}${displayName}
                    </div>
                </div>
            </div>
            ${calVotingBarsHtml}
        </div>`;
    }

    let headerStripHtml = `
    <div class="match-header-strip-v2 opt4-header" style="display:flex; flex-direction:column; gap:5px; width:100%; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px;">
            <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                ${catLogoHtml}
            </div>
            <div style="text-align: right; color:var(--text-muted); font-size:0.78rem; font-weight:600; white-space:nowrap; flex-shrink:0;">
                <i data-lucide="calendar" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-top:-2px;"></i> ${fechaFormateada}
            </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px; font-size:0.73rem;">
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                ${outcomeBadge}
                ${eq.es_derby ? `<div style="background:linear-gradient(90deg, #b06000, #d4af37); color:#fff; padding:2px 7px; border-radius:6px; font-size:0.68rem; font-weight:900; display:inline-flex; align-items:center; gap:4px; box-shadow: 0 2px 6px rgba(212, 175, 55, 0.4);">⚡ DERBY</div>` : ''}
            </div>
            ${cleanPab ? `
            <div style="color:var(--text-muted); text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; flex:1; margin-left:auto;" title="${cleanPab}">
                <i data-lucide="map-pin" style="width: 11px; height: 11px; display: inline-block; vertical-align: middle; margin-top:-2px; opacity:0.8;"></i> <span>${cleanPab}</span>
            </div>` : ''}
        </div>
    </div>`;

    return `
    <div class="vcv-card-v2" style="margin-bottom:20px; ${cardBorderHighlight}">
        ${headerStripHtml}

        <div class="teams-versus-container-v2" style="margin-top: 15px;">
            <div class="team-box-v2">
                <div class="team-avatar-v2">${localLogo}</div>
                <span class="team-name-v2" style="${localGana ? 'font-weight:900; color:var(--text-main);' : 'font-weight:600; opacity:0.85;'}">${localTeamName}</span>
                ${localRoleHtml}
            </div>
            
            <div class="vs-divider-v2" style="display:flex; flex-direction:column; align-items:center; gap:4px; min-width:85px;">
                <div style="font-size:0.7rem; color:var(--vcv-dorado); font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">
                    J. ${eq.jornada_eq || '-'}
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:1.9rem; font-weight:900; color:${localGana ? 'var(--vcv-dorado)' : 'var(--text-muted)'}; line-height:1;">${setsL}</span>
                    <span style="font-size:1.2rem; font-weight:800; color:var(--text-muted); opacity:0.6;">-</span>
                    <span style="font-size:1.9rem; font-weight:900; color:${visitGana ? 'var(--vcv-dorado)' : 'var(--text-muted)'}; line-height:1;">${setsV}</span>
                </div>
                <span style="font-size:0.65rem; font-weight:800; letter-spacing:0.5px; padding:1px 6px; border-radius:4px; background:rgba(255,255,255,0.08); color:var(--text-muted);">
                    FINAL
                </span>
                ${btnStreaming}
            </div>

            <div class="team-box-v2">
                <div class="team-avatar-v2">${visitLogo}</div>
                <span class="team-name-v2" style="${visitGana ? 'font-weight:900; color:var(--text-main);' : 'font-weight:600; opacity:0.85;'}">${visitTeamName}</span>
                ${visitRoleHtml}
            </div>
        </div>

        ${parcialesHtml}
        ${mvpHtml}
            </div>`;
}

// ---------------------------------------------------
// RENDERIZADO DE LA LISTA DE RESULTADOS JUGADOS
// ---------------------------------------------------
window.renderResultados = function() {
    if (!window.appData) return;

    if (!window.appData.partidos_jugados) {
        let misEquipos = (window.appData.mis_equipos_siguiendo && Array.isArray(window.appData.mis_equipos_siguiendo) && window.appData.mis_equipos_siguiendo.length > 0)
            ? window.appData.mis_equipos_siguiendo
            : ['Universidad de Valladolid VCV', 'VALCYL VCV', 'Valladolid CV Vacceas', 'VCV Maria Molina', 'VCV Meseta'];
        let pool = Array.isArray(window.appData.todos_partidos) && window.appData.todos_partidos.length > 0
            ? window.appData.todos_partidos
            : (Array.isArray(window.appData.equipos) ? window.appData.equipos : []);
        window.appData.partidos_jugados = pool.filter(p => {
            let deMiEquipo = misEquipos.includes(p.equipo_local) || misEquipos.includes(p.rival);
            let hasScore = !!(p.oficial_sets && String(p.oficial_sets).trim() !== "");
            return deMiEquipo && (hasScore || p.estado === "FINALIZADO");
        });
        window.appData.partidos_jugados.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    let jugados = window.appData.partidos_jugados || [];
    let teamEl = document.getElementById('resultadosTeamSelect');
    let jorEl = document.getElementById('resultadosJornadaSelect');
    let searchEl = document.getElementById('resultadosSearchInput');

    let selectedTeam = (teamEl && teamEl.value) ? teamEl.value : "";
    let selectedJor = (jorEl && jorEl.value) ? jorEl.value : "";
    let searchQuery = (searchEl && searchEl.value) ? searchEl.value.toLowerCase().trim() : "";

    let filtered = jugados.filter(p => {
        let matchTeam = (!selectedTeam || p.equipo_local === selectedTeam || p.rival === selectedTeam);
        let matchJor = (!selectedJor || String(p.jornada_eq).trim() === selectedJor);
        let matchSearch = (!searchQuery || 
            (p.rival && p.rival.toLowerCase().includes(searchQuery)) || 
            (p.equipo_local && p.equipo_local.toLowerCase().includes(searchQuery)) ||
            (p.categoria && p.categoria.toLowerCase().includes(searchQuery)) ||
            (p.mvp_oficial && p.mvp_oficial.toLowerCase().includes(searchQuery))
        );
        return matchTeam && matchJor && matchSearch;
    });

    let resultsContainer = document.getElementById('resultadosList');
    if (!resultsContainer) return;

    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:35px 20px; color:var(--text-muted); font-weight:bold; background:rgba(0,0,0,0.1); border-radius:12px; border:1px dashed var(--border-color);">No se encontraron resultados jugados con los filtros seleccionados.</div>`;
        return;
    }

    let html_res = "";
    let lastDateLabel = null;

    filtered.forEach(eq => {
        let dateLabel = "Fecha por confirmar";
        if (eq.timestamp && Number(eq.timestamp) > 0) {
            let d = new Date(Number(eq.timestamp));
            dateLabel = d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
        }

        if (dateLabel !== lastDateLabel) {
            html_res += `
            <div class="resultados-date-separator" style="display:flex; align-items:center; gap:10px; margin: 25px 0 10px 0;">
                <div style="flex:1; height:1px; background:linear-gradient(90deg, transparent, var(--border-color));"></div>
                <div style="color: var(--vcv-dorado); font-size: 0.82rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">
                    ${dateLabel}
                </div>
                <div style="flex:1; height:1px; background:linear-gradient(270deg, transparent, var(--border-color));"></div>
            </div>`;
            lastDateLabel = dateLabel;
        }

        html_res += renderMatchResultCardHtml(eq);
    });

    resultsContainer.innerHTML = html_res;

    if (window.lucide) window.lucide.createIcons();
};

// ---------------------------------------------------
// RENDERIZADO DE LA LISTA DE PARTIDOS FUTUROS
// ---------------------------------------------------
window.renderCalendar = function() {
    if(!window.appData || !window.appData.calendario_procesado) return;
    
    let futuros = window.appData.calendario_procesado;
    let catEl = document.getElementById('calendarTeamSelect');
    let searchEl = document.getElementById('calendarSearchInput');
    if(!catEl || !searchEl) return;
    
    let cat = (catEl && catEl.value) ? catEl.value : "";
    let search = (searchEl && searchEl.value) ? searchEl.value.toLowerCase().trim() : "";
    
    localStorage.setItem('pref_calendario', cat);
    
    let filtered = futuros.filter(p => {
        let matchCat = (!cat || p.equipo_local === cat || p.rival === cat);
        let matchSearch = (!search || p.rival.toLowerCase().includes(search) || p.equipo_local.toLowerCase().includes(search));
        return matchCat && matchSearch;
    });
    
    let ahora = Date.now();
    let partidos24h = filtered.filter(p => {
        if (!p.timestamp) return false;
        let ts = parseInt(p.timestamp);
        let horasFaltan = (ts - ahora) / (1000 * 60 * 60);
        return horasFaltan > -12 && horasFaltan <= 24; // Estrictamente proximas 24h
    });
    
    let ids24h = new Set(partidos24h.map(p => p.id_partido));
    
    let topHtml = "";
    if (partidos24h.length > 0) {
        topHtml = `
        <div style="background: linear-gradient(135deg, rgba(212,175,55,0.1), rgba(106,44,112,0.1)); border: 2px solid var(--vcv-dorado); border-radius: 12px; padding: 16px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(212,175,55,0.15);">
            <div style="text-align:center; color:var(--vcv-dorado); font-size:0.9rem; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:20px; display:flex; justify-content:center; align-items:center; gap:6px;">
                <i data-lucide="flame" style="width:18px; height:18px;"></i> PRÓXIMAS 24 HORAS
            </div>
        `;
        
        partidos24h.forEach(pm => {
            topHtml += `
                <div style="margin-bottom: 20px;">
                    ${renderMatchCardHtml(pm)}
                    <div style="text-align: center; margin-top: 10px;">
                        <div class="reloj-partido" data-ts="${pm.timestamp}" data-eq="${pm.id_partido}" style="display:inline-block; font-size:1.1rem; padding:8px 16px; background:rgba(0,0,0,0.3); border-radius:8px; border:1px solid rgba(255,255,255,0.1); color:#fff; font-weight:bold; letter-spacing:1px;"></div>
                    </div>
                </div>
            `;
        });
        
        topHtml += `</div>`;
    }
    const nextMatchHighlightedEl = document.getElementById('nextMatchHighlighted');
    if (nextMatchHighlightedEl) nextMatchHighlightedEl.innerHTML = topHtml;

    let html_res = "";
    if (filtered.length === 0) {
        html_res = `<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:var(--text-muted); font-weight:bold; background:rgba(0,0,0,0.1); border-radius:12px; border:1px dashed var(--border-color);">No hay partidos programados.</div>`;
    } else {
        let lastDateLabel = null;
        
        filtered.forEach(eq => {
            if (ids24h.has(eq.id_partido)) return;
            
            let dateLabel = "Fecha por confirmar";
        if (eq.timestamp && Number(eq.timestamp) > 0) {
            let d = new Date(Number(eq.timestamp));
            dateLabel = d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
        }
            
            if (dateLabel !== lastDateLabel) {
                html_res += `
                <div class="calendar-date-separator" style="display:flex; align-items:center; gap:10px; margin: 30px 0 15px 0;">
                    <div style="flex:1; height:1px; background:linear-gradient(90deg, transparent, var(--border-color));"></div>
                    <div style="color: var(--vcv-dorado); font-size: 0.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">
                        ${dateLabel}
                    </div>
                    <div style="flex:1; height:1px; background:linear-gradient(270deg, transparent, var(--border-color));"></div>
                </div>`;
                lastDateLabel = dateLabel;
            }
            
            html_res += renderMatchCardHtml(eq);
        });
    }
    
    const calResultsEl = document.getElementById('calendarResults');
    if (calResultsEl) calResultsEl.innerHTML = html_res;

    if (window.lucide) window.lucide.createIcons();
    if (typeof iniciarRelojes === 'function') iniciarRelojes();
};

// ---------------------------------------------------
// LISTENERS DE FILTROS Y BOTONES
// ---------------------------------------------------
function setupCalendarListeners() {
    const calTeamSelectEl = document.getElementById('calendarTeamSelect');
    if (calTeamSelectEl) calTeamSelectEl.addEventListener('change', window.renderCalendar);
    const calSearchInputEl = document.getElementById('calendarSearchInput');
    if (calSearchInputEl) calSearchInputEl.addEventListener('input', window.renderCalendar);

    const resTeamSelectEl = document.getElementById('resultadosTeamSelect');
    if (resTeamSelectEl) resTeamSelectEl.addEventListener('change', window.renderResultados);
    const resJornadaSelectEl = document.getElementById('resultadosJornadaSelect');
    if (resJornadaSelectEl) resJornadaSelectEl.addEventListener('change', window.renderResultados);
    const resSearchInputEl = document.getElementById('resultadosSearchInput');
    if (resSearchInputEl) resSearchInputEl.addEventListener('input', window.renderResultados);

    const btnFut = document.getElementById('subtabCalendarioFuturos');
    if (btnFut) {
        btnFut.onclick = function(e) {
            if (e) e.preventDefault();
            window.cambiarSubTabCalendario('futuros');
        };
    }
    const btnRes = document.getElementById('subtabCalendarioResultados');
    if (btnRes) {
        btnRes.onclick = function(e) {
            if (e) e.preventDefault();
            window.cambiarSubTabCalendario('resultados');
        };
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCalendarListeners);
} else {
    setupCalendarListeners();
}
