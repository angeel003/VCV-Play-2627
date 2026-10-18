
        // Registrar Service Worker para PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').then(reg => {
                    reg.update(); // Forzar actualizacin siempre
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
// LOGICA DE CALENDARIO / PROXIMOS PARTIDOS
// ---------------------------------------------------
window.initCalendar = function() {
    if(!window.appData || !window.appData.todos_partidos) return;
    
    let misEquipos = window.appData.mis_equipos_siguiendo || [];
    let ahora = Date.now();
    
    let futuros = window.appData.todos_partidos.filter(p => {
        let esFuturo = p.estado !== "FINALIZADO" && p.estado !== "CERRADO";
        return esFuturo;
    });
    
    futuros.sort((a, b) => {
        let tsA = a.timestamp || Infinity; 
        let tsB = b.timestamp || Infinity;
        return tsA - tsB; 
    });
    
    window.appData.calendario_procesado = futuros;

    let catSelect = document.getElementById('calendarTeamSelect');
    if(!catSelect) return;
    
    let equiposSet = new Set();
    futuros.forEach(p => {
        if (p.equipo_local && misEquipos.includes(p.equipo_local)) equiposSet.add(p.equipo_local);
        if (p.rival && misEquipos.includes(p.rival)) equiposSet.add(p.rival);
    });
    let uniqueCats = Array.from(equiposSet).sort();
    
    let currentOptions = '<option value="">-- Todos los equipos --</option>';
    uniqueCats.forEach(cat => {
        currentOptions += `<option value="${cat}">${cat}</option>`;
    });
    catSelect.innerHTML = currentOptions;
    
    let savedCat = localStorage.getItem('pref_calendario');
    if (savedCat && uniqueCats.includes(savedCat)) {
        catSelect.value = savedCat;
    }
    
    window.renderCalendar();
};

function renderMatchCardHtml(eq) {
    let dt = new Date(eq.timestamp);
    let fechaFormateada = isNaN(dt) ? "Por confirmar" : `${dt.toLocaleDateString()} ${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;
    
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
    
    let infoPabellon = eq.pabellon ? `<div style="margin-top:2px; font-size:0.75rem; color:var(--text-muted);"><i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-top:-2px;"></i> ${eq.pabellon}</div>` : '';

    let btnStreaming = eq.streaming 
        ? `<a href="${eq.streaming}" target="_blank" class="btn-streaming-v2 active" style="text-decoration:none;"><i data-lucide="play" style="width:14px;height:14px;"></i> Streaming</a>` 
        : `<button class="btn-streaming-v2 disabled" disabled style="background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-muted); padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:bold; cursor:not-allowed;"><i data-lucide="play-square" style="width:12px;height:12px;"></i> Sin enlace</button>`;

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
        
    let borderColor = eq.es_derby ? 'border-color: var(--secondary-color); box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);' : '';
    
    let localRoleHtml = `<span class="team-role-v2" style="color: var(--success); font-weight:800; display:flex; align-items:center; gap:4px;">🏠 LOCAL</span>`;
    let visitRoleHtml = `<span class="team-role-v2" style="color: var(--text-muted); font-weight:800; display:flex; align-items:center; gap:4px;">✈️ VISITANTE</span>`;
    
    return `
    <div class="vcv-card-v2" style="margin-bottom:20px; ${borderColor}">
        <div class="match-header-strip-v2" style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                ${catLogoHtml}
                ${eq.es_derby ? `<div style="background:linear-gradient(90deg, #b06000, #d4af37); color:#fff; padding:2px 8px; border-radius:8px; font-size:0.75rem; font-weight:900; display:inline-flex; align-items:center; gap:6px; box-shadow: 0 2px 8px rgba(212, 175, 55, 0.5);">⚡ DERBY</div>` : ''}
            </div>
            <div style="text-align: right; color:var(--text-muted); font-size:0.85rem; font-weight:600;">
                <div><i data-lucide="calendar" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-top:-2px;"></i> ${fechaFormateada}</div>
                ${infoPabellon}
            </div>
        </div>

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

window.renderCalendar = function() {
    if(!window.appData || !window.appData.calendario_procesado) return;
    
    let futuros = window.appData.calendario_procesado;
    let catEl = document.getElementById('calendarTeamSelect');
    let searchEl = document.getElementById('calendarSearchInput');
    if(!catEl || !searchEl) return;
    
    let cat = catEl.value;
    let search = searchEl.value.toLowerCase().trim();
    
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
    document.getElementById('nextMatchHighlighted').innerHTML = topHtml;

    let html_res = "";
    if (filtered.length === 0) {
        html_res = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-weight:bold;">No hay partidos programados.</div>`;
    } else {
        let lastDateLabel = null;
        
        filtered.forEach(eq => {
            if (ids24h.has(eq.id_partido)) return;
            
            let dateLabel = "Fecha por confirmar";
            if (eq.timestamp) {
                let d = new Date(eq.timestamp);
                dateLabel = d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                // Capitalizar primera letra
                dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
            }
            
            if (dateLabel !== lastDateLabel) {
                html_res += `
                <div style="display:flex; align-items:center; gap:10px; margin: 30px 0 15px 0;">
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
    
    document.getElementById('calendarResults').innerHTML = html_res;
    if (window.lucide) window.lucide.createIcons();
    if (typeof iniciarRelojes === 'function') iniciarRelojes();
};

document.getElementById('calendarTeamSelect').addEventListener('change', window.renderCalendar);
document.getElementById('calendarSearchInput').addEventListener('input', window.renderCalendar);





