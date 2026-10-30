// ==================================================================
// RENDERIZADO DE CARTELERA Y TEMPORIZADORES
// ==================================================================

// LOGICA DE RENDERIZADO GLOBAL DE CARTELERA V2
// ------------------------------------------------------------------
window.renderCarteleraHTML = function(data) {
    if (!data || !data.equipos) return;
    if (typeof window.aplicarHorasMvpLocales === 'function') window.aplicarHorasMvpLocales(data);

    nowMs = Date.now();

    // Helper: determinar si un partido ya se ha jugado, se ha cerrado o han pasado horas desde su inicio
    const isPartidoTerminado = (eq) => {
        if (!eq) return false;
        if (eq.estado === 'CERRADO' || eq.estado === 'FINALIZADO') return true;
        if (eq.oficial_sets && String(eq.oficial_sets).trim() !== '') return true;
        // Si han pasado más de 2.5 horas (150 min) desde el inicio del partido
        if (eq.timestamp && (nowMs - eq.timestamp > 2.5 * 60 * 60 * 1000)) return true;
        return false;
    };

    // Reordenar partidos:
    // 1º Los que no se hayan jugado o se estén jugando (más próximos primero)
    // 2º Debajo, los partidos cerrados o de los que ya hayan pasado horas (en el mismo orden cronológico)
    data.equipos.sort((a, b) => {
        let termA = isPartidoTerminado(a);
        let termB = isPartidoTerminado(b);
        if (termA !== termB) {
            return termA ? 1 : -1;
        }
        let tsA = a.timestamp || Infinity; 
        let tsB = b.timestamp || Infinity;
        return tsA - tsB; 
    });
    
    equiposTotalesInfo = data.equipos;

    let htmlPartidos = ``;
    let equiposPermitidos = 0;
    let equiposCerrados = 0;
    nowMs = Date.now();
    data.equipos.forEach(eq => {
        if ((eq.permitido || window.isGuestMode) && eq.visibilidad === "MOSTRAR") {
            equiposPermitidos++;
            
            let isPredicted = false;
            let pSets = "", pPts = "", pSig = "";
            let ptsText = "", formStr = "";
            let savedLocalName = "", savedVisitName = "", formattedSets = "";
            
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
            
            let categoryHtml = getCategoryHTML(eq.categoria);
            let destacadoHtml = "";

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
                let localLogo = `<picture><source srcset="files/images/escudos/${safeLocalName}.webp?v=20261030_v4" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeLocalName}.png?v=20261030_v4" alt="${localTeamName}" onload="this.parentNode.parentNode.style.border='none'; this.parentNode.parentNode.style.background='transparent';" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\\'font-weight:900; font-size: 1.2rem;\\'>${localAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
                let visitLogo = `<picture><source srcset="files/images/escudos/${safeVisitName}.webp?v=20261030_v4" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeVisitName}.png?v=20261030_v4" alt="${visitTeamName}" onload="this.parentNode.parentNode.style.border='none'; this.parentNode.parentNode.style.background='transparent';" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\\'font-weight:900; font-size: 1.2rem;\\'>${visitAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
                
                let infoPabellon = eq.pabellon ? `<div style="margin-top:2px; word-break:break-word; overflow-wrap:break-word; line-height:1.25;"><i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-top:-2px; flex-shrink:0;"></i> <span>${eq.pabellon}</span></div>` : '';

                let btnStreaming = eq.streaming 
                    ? `<a href="${eq.streaming}" target="_blank" class="btn-streaming-v2 active" style="text-decoration:none;"><i data-lucide="play" style="width:14px;height:14px;"></i> Streaming</a>` 
                    : `<button class="btn-streaming-v2 disabled" disabled><i data-lucide="play-square" style="width:14px;height:14px;"></i> Sin enlace</button>`;

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

                // MVP VALCYL: Calcular bloque para mostrar en cartelera (tanto en partidos cerrados como si ya se han subido nominados/programado)
                let catL = (eq.categoria || '').toLowerCase();
                let isSuperliga = catL.includes('sm2') || catL.includes('superliga');
                let mvpCands = Array.isArray(eq.mvp_candidatos) ? eq.mvp_candidatos.filter(Boolean) : [];
                let myMvpVote = (window.appData && window.appData.mvp_votos) ? window.appData.mvp_votos[eq.id_partido] : null;
                let mvpOficial = eq.mvp_oficial || '';
                let mvpHtml = '';
                let isMvpVisible = eq.mvp_visible !== false && eq.mvp_visible !== 'OCULTAR';
                let pubTs = eq.mvp_publicacion_ts ? parseInt(eq.mvp_publicacion_ts) : 0;
                let nowMs = Date.now();
                let isCountdownActive = pubTs > 0 && nowMs < pubTs;
                let isDeadlineReachedWithoutWinner = pubTs > 0 && nowMs >= pubTs && !mvpOficial;

                if (isSuperliga && isMvpVisible && (pubTs > 0 || mvpCands.length >= 2 || mvpOficial)) {
                    if (isCountdownActive) {
                        // 1. Cuenta atrás activa (con o sin ganador ya subido en el sistema)
                        let widgetHtml = (mvpCands.length >= 2 && mvpCands.length <= 3 && typeof window.renderMvpWidgetContent === 'function') 
                            ? `<div id="mvp-widget-${eq.id_partido}" style="margin-top: 10px; width: 100%;">${window.renderMvpWidgetContent(eq.id_partido, mvpCands, myMvpVote)}</div>` 
                            : '';
                        mvpHtml = `
                        <div class="reloj-mvp-card" style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 8px; padding: 5px 10px; margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: var(--text-muted);">
                                <span style="color: var(--secondary-color); font-weight: 800;">👑 MVP:</span>
                                <span>El ganador se revela en</span>
                                <span class="reloj-mvp" data-target="${pubTs}" style="font-size: 0.75rem; font-weight: 800; color: var(--secondary-color); font-family: 'Space Grotesk', monospace;">...</span>
                            </div>
                            <span style="font-size: 0.85rem; opacity: 0.8;">⏳</span>
                        </div>
                        ${widgetHtml}`;
                    } else if (isSuperliga && isMvpVisible && isDeadlineReachedWithoutWinner) {
                        // 2. La hora ya llegó pero el admin todavía no ha subido el MVP oficial definitivo
                        let widgetHtml = (mvpCands.length >= 2 && mvpCands.length <= 3 && typeof window.renderMvpWidgetContent === 'function') 
                            ? `<div id="mvp-widget-${eq.id_partido}" style="margin-top: 10px; width: 100%;">${window.renderMvpWidgetContent(eq.id_partido, mvpCands, myMvpVote)}</div>` 
                            : '';
                        mvpHtml = `
                        <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 8px; padding: 5px 10px; margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: var(--text-muted);">
                                <span style="color: var(--secondary-color); font-weight: 800;">👑 MVP:</span>
                                <span style="color: #fff; font-weight: 700;">El ganador se publicará en breves</span>
                            </div>
                            <span style="font-size: 0.85rem; opacity: 0.8;">📢</span>
                        </div>
                        ${widgetHtml}`;
                    } else if (isSuperliga && mvpOficial && isMvpVisible && !isCountdownActive) {
                        let oInfo = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(mvpOficial) : { apodo: mvpOficial, photoSrc: '', initials: 'VC' };
                        let myVoteNote = myMvpVote ? `<div style="font-size:0.68rem; color:var(--text-muted); margin-top:3px; word-break:break-word;">Tu voto en la jornada: <strong style="color:var(--text-main);">${(typeof window.parseCandInfo === 'function') ? window.parseCandInfo(myMvpVote).apodo : myMvpVote}</strong></div>` : '';
                        mvpHtml = `
                        <div class="mvp-winner-proclaimed-card" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(93, 23, 137, 0.25)); border: 1.5px solid var(--secondary-color); border-radius: 14px; padding: 10px 12px; margin-top: 12px; box-shadow: 0 4px 18px rgba(212, 175, 55, 0.25); display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; box-sizing: border-box; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 auto; overflow: hidden;">
                                <div class="mvp-photo-wrapper mvp-winner-photo" style="position: relative; width: 58px; height: 58px; min-width: 58px; min-height: 58px; aspect-ratio: 1 / 1; border-radius: 10px; flex-shrink: 0; border: 2px solid var(--secondary-color); box-shadow: 0 0 12px rgba(212, 175, 55, 0.45); overflow: hidden; display: flex; align-items: flex-end; justify-content: center; background: radial-gradient(circle at 50% 80%, rgba(212, 175, 55, 0.25) 0%, rgba(93, 23, 137, 0.4) 60%, rgba(17, 5, 25, 0.9) 100%);">
                                    <img loading="lazy" src="${oInfo.photoSrc}" alt="${oInfo.apodo}" class="mvp-photo-img" style="width: 100%; height: 100%; object-fit: contain; object-position: bottom center;" onerror="this.onerror=null; this.outerHTML='<span style=\'font-weight:900; font-size:1.15rem; color:var(--secondary-color);\'>${oInfo.initials}</span>';">
                                </div>
                                <div style="min-width: 0; flex: 1 1 auto; overflow: hidden;">
                                    <div style="font-size: 0.68rem; font-weight: 800; color: var(--secondary-color); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 5px; margin-bottom: 2px;">
                                        <span>👑 MVP VALCYL</span>
                                        <button type="button" onclick="window.mostrarInfoBonusMvp(event)" title="Información sobre la bonificación y elección del MVP" style="background: rgba(212,175,55,0.2); border: 1px solid var(--secondary-color); color: var(--secondary-color); width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 900; cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0;">
                                            ?
                                        </button>
                                    </div>
                                    <div style="font-size: clamp(0.92rem, 3.5vw, 1.05rem); font-weight: 900; color: #fff; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; line-height: 1.2;">
                                        <span style="word-break: break-word;">${oInfo.dorsal ? '#' + oInfo.dorsal + ' ' : ''}${oInfo.apodo}</span>
                                        ${oInfo.posicion ? `<span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; background:rgba(255,255,255,0.08); padding:1px 5px; border-radius:4px; flex-shrink: 0;">${oInfo.posicion}</span>` : ''}
                                    </div>
                                    ${(function() {
                                        let statsList = Array.isArray(eq.mvp_stats) ? eq.mvp_stats.filter(Boolean) : [];
                                        if (statsList.length === 0) return '';
                                        let badges = statsList.map(st => `
                                            <span style="display:inline-flex; align-items:center; gap:3px; font-size:0.68rem; font-weight:700; color:#fff; background:rgba(0,0,0,0.4); border:1px solid rgba(212,175,55,0.35); padding:2px 6px; border-radius:6px; max-width: 100%; word-break: break-word;">
                                                <span style="color:var(--secondary-color); flex-shrink:0;">⚡</span> <span>${st}</span>
                                            </span>
                                        `).join('');
                                        return `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:5px;">${badges}</div>`;
                                    })()}
                                    ${myVoteNote}
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; flex-shrink: 0;">
                                <div style="font-size: 1.5rem; line-height: 1; filter: drop-shadow(0 0 8px rgba(212,175,55,0.7));">
                                    🏆
                                </div>
                                <button type="button" onclick="window.abrirModalCompartirMVP('${eq.id_partido}')" title="Compartir MVP" style="background: rgba(212,175,55,0.18); border: 1px solid var(--secondary-color); color: var(--secondary-color); border-radius: 8px; padding: 4px 6px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-size: 0.68rem; font-weight: 800; cursor: pointer; transition: all 0.2s ease; white-space: nowrap;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                                    Compartir
                                </button>
                            </div>
                        </div>`;
                    } else if (mvpCands.length >= 2 && mvpCands.length <= 3) {
                        if (typeof window.renderMvpWidgetContent === 'function') {
                            mvpHtml = `
                            <div id="mvp-widget-${eq.id_partido}" style="margin-top: 10px; width: 100%;">
                                ${window.renderMvpWidgetContent(eq.id_partido, mvpCands, myMvpVote)}
                            </div>`;
                        } else {
                            mvpHtml = `<div id="mvp-widget-${eq.id_partido}" style="margin-top: 10px; width: 100%;"></div>`;
                        }
                    }
                }

                if (eq.estado === "CERRADO") {
                    let miPronSets = isPredicted ? (pSets || '-').replace('-', ' - ') : (window.isGuestMode ? 'Solo lectura' : 'Sin datos');
                    let miPronDetalle = window.isGuestMode ? '<span>Modo Invitado</span>' : 'Sin predicción';
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
                                    <source srcset="files/images/escudos/${winnerSafe}.webp?v=20261030_v4" type="image/webp">
                                    <img loading="lazy" src="files/images/escudos/${winnerSafe}.png?v=20261030_v4" alt="" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\\'font-weight:800; font-size:0.75rem;\\'>${winnerAbrev}</span>';" style="width:22px; height:22px; object-fit:contain;">
                                </picture>
                            </div>`;
                        } else {
                            miPronDetalle = `<span>Dif: ${pPts} pts</span>`;
                        }
                    }

                    let cajaTuPronosticoHtml = window.isGuestMode ? `
                        <div style="background: var(--bg-card-alt); border: 1px dashed var(--border-color); border-radius: 10px; padding: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; min-width: 0; box-sizing: border-box; overflow: hidden;">
                            <div style="font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                MODO INVITADO
                            </div>
                            <div style="font-size: 0.85rem; font-weight: 800; color: var(--secondary-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                🔒 ¡Únete!
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; word-break: break-word; line-height: 1.15;">
                                Regístrate para puntuar
                            </div>
                        </div>` : `
                        <div style="background: ${isPredicted ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card-alt)'}; border: 1px solid ${isPredicted ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-color)'}; border-radius: 10px; padding: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; min-width: 0; box-sizing: border-box; overflow: hidden;">
                            <div style="font-size: 0.65rem; font-weight: 800; color: ${isPredicted ? 'var(--success)' : 'var(--text-muted)'}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; display: flex; align-items: center; justify-content: center; gap: 4px; word-break: break-word; line-height: 1.15;">
                                <i data-lucide="${isPredicted ? 'check-circle-2' : 'help-circle'}" style="width: 12px; height: 12px; flex-shrink: 0;"></i> TU PREDICCIÓN
                            </div>
                            <div style="font-size: clamp(1.05rem, 4vw, 1.25rem); font-weight: 900; color: ${isPredicted ? 'var(--text-main)' : 'var(--text-muted)'}; font-family: 'Space Grotesk', sans-serif;">
                                ${miPronSets}
                            </div>
                            <div style="font-size: 0.72rem; color: ${isPredicted ? 'var(--text-main)' : 'var(--text-muted)'}; font-weight: 700; margin-top: 2px; word-break: break-word; line-height: 1.15;">
                                ${miPronDetalle}
                            </div>
                        </div>`;

                    htmlPartidos += `
                    <div class="vcv-card-v2" id="card-v2-${eq.id_partido}" data-category="${eq.categoria}" style="padding: 16px; margin-bottom: 12px; ${eq.es_derby ? 'box-shadow: 0 0 20px rgba(212, 175, 55, 0.4); border-color: var(--secondary-color);' : ''}">
                        <div class="match-header-strip-v2" style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid var(--border-color);">
                            <div style="display:flex; flex-direction:column; align-items:flex-start; gap:6px;">
                                ${catLogoHtml}
                                ${eq.es_derby ? `<div style="background:linear-gradient(90deg, #b06000, #d4af37); color:#fff; padding:2px 8px; border-radius:8px; font-size:0.72rem; font-weight:900; display:inline-flex; align-items:center; gap:6px; box-shadow: 0 2px 8px rgba(212, 175, 55, 0.5);">🔥 DERBY <span onclick="document.getElementById('infoDerbyModal').style.display='flex'; event.stopPropagation();" style="display:flex; align-items:center; justify-content:center; width:16px; height:16px; background:rgba(255,255,255,0.2); border-radius:50%; cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5"/><circle cx="12" cy="12" r="10"/></svg></span></div>` : ''}
                            </div>
                            <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px; margin-left:auto; flex:1; min-width:0;">
                                <button onclick="window.abrirModalCompartirPartido('${eq.id_partido}')" title="Compartir este partido" style="background:transparent; border:none; color:#c794ce; width:26px; height:26px; min-width:26px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; padding:0; flex-shrink:0; opacity:0.85; transition:all 0.2s ease;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';" onmouseout="this.style.opacity='0.85'; this.style.transform='none';">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                                </button>
                                <div style="text-align: right; color:var(--text-muted); font-size:0.78rem; min-width:0; max-width:100%; word-break:break-word;">
                                    <div style="white-space:nowrap;"><i data-lucide="calendar" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-top:-2px; flex-shrink:0;"></i> ${fechaFormateada}</div>
                                    ${infoPabellon}
                                </div>
                            </div>
                        </div>

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

                        <div class="match-results-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 10px; width: 100%; box-sizing: border-box;">
                            <div style="background: var(--bg-card-alt); border: 1px solid var(--border-color); border-radius: 10px; padding: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; min-width: 0; box-sizing: border-box; overflow: hidden;">
                                <div style="font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    RESULTADO OFICIAL
                                </div>
                                <div style="font-size: clamp(1.05rem, 4vw, 1.25rem); font-weight: 900; color: var(--text-main); font-family: 'Space Grotesk', sans-serif;">
                                    ${(eq.oficial_sets || 'Sin resultado').replace('-', ' - ')}
                                </div>
                                <div style="font-size: 0.70rem; color: var(--text-muted); margin-top: 2px; word-break: break-word; line-height: 1.15;" title="${eq.oficial_parciales || ''}">
                                    ${eq.oficial_parciales || 'Parciales pendientes'}
                                </div>
                            </div>
                            ${cajaTuPronosticoHtml}
                        </div>
                        ${mvpHtml}
                    </div>`;
                } else {
                    // PARTIDO ABIERTO / PROXIMO
                    let inputsControlHtml = "";
                    if (window.isGuestMode) {
                        inputsControlHtml = `
                        <div style="text-align:center; padding: 12px; background: rgba(212, 175, 55, 0.08); border: 1px dashed rgba(212, 175, 55, 0.35); border-radius: 12px; margin-top: 10px;">
                            <span style="font-size: 0.82rem; color: var(--secondary-color); font-weight: 800; display: block; margin-bottom: 2px;">🔒 Pronósticos disponibles para usuarios registrados</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Pásate por la pestaña <b>¡Únete!</b> para solicitar tu cuenta gratuita.</span>
                        </div>`;
                    } else {
                        inputsControlHtml = `
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
                        </button>`;
                    }

                    htmlPartidos += `
                    <div class="vcv-card-v2 ${isPredicted ? 'collapsed' : ''}" id="card-v2-${eq.id_partido}" data-category="${eq.categoria}" ${eq.es_derby ? 'style="box-shadow: 0 0 20px rgba(212, 175, 55, 0.4); border-color: var(--secondary-color);"' : ''}>
                        <div class="match-header-strip-v2" style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                            <div style="display:flex; flex-direction:column; align-items:flex-start; gap:6px;">
                                ${catLogoHtml}
                                ${eq.es_derby ? `<div style="background:linear-gradient(90deg, #b06000, #d4af37); color:#fff; padding:2px 8px; border-radius:8px; font-size:0.72rem; font-weight:900; display:inline-flex; align-items:center; gap:6px; box-shadow: 0 2px 8px rgba(212, 175, 55, 0.5);">🔥 DERBY <span onclick="document.getElementById('infoDerbyModal').style.display='flex'; event.stopPropagation();" style="display:flex; align-items:center; justify-content:center; width:16px; height:16px; background:rgba(255,255,255,0.2); border-radius:50%; cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5"/><circle cx="12" cy="12" r="10"/></svg></span></div>` : ''}
                            </div>
                            <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px; margin-left:auto; flex:1; min-width:0;">
                                <button onclick="window.abrirModalCompartirPartido('${eq.id_partido}')" title="Compartir este partido" style="background:transparent; border:none; color:#c794ce; width:26px; height:26px; min-width:26px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; padding:0; flex-shrink:0; opacity:0.85; transition:all 0.2s ease;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';" onmouseout="this.style.opacity='0.85'; this.style.transform='none';">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                                </button>
                                <div style="text-align: right; min-width:0; max-width:100%; word-break:break-word;">
                                    <div style="white-space:nowrap;"><i data-lucide="calendar" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-top:-2px; flex-shrink:0;"></i> ${fechaFormateada}</div>
                                    ${infoPabellon}
                                </div>
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

                        ${inputsControlHtml}
                        ${mvpHtml}
                        ${destacadoHtml}
                    </div>`;
                }
            }
        }
    });

    if (equiposPermitidos === 0) {
        htmlPartidos = `<div class="alert-box alert-warning" style="display:block;">No hay partidos pendientes de predecir o en curso en este momento.</div>`;
        const bSub = document.getElementById('btnSubmit');
        if (bSub) bSub.style.display = "none";
    } else if (equiposPermitidos === equiposCerrados || window.isGuestMode) {
        const bSub = document.getElementById('btnSubmit');
        if (bSub) bSub.style.display = "none";
    }
    
    if (window.isGuestMode) {
        htmlPartidos += `
        <div style="text-align:center; margin-top:24px; padding:16px 12px; border-top:1px dashed var(--border-color);">
            <button type="button" onclick="window.cerrarSesionApp()" style="background:transparent; color:var(--text-muted); border:1px solid var(--border-color); padding:10px 18px; border-radius:12px; font-size:0.85rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Volver al inicio de sesión</span>
            </button>
        </div>`;
    }

    // Bloque de acceso directo / aviso de votación MVP VALCYL disponible
    let bannerContainer = document.getElementById('mvpBannerAviso');
    if (!bannerContainer) {
        const perfilTop = document.getElementById('perfilUsuarioTop');
        if (perfilTop && perfilTop.parentNode) {
            bannerContainer = document.createElement('div');
            bannerContainer.id = 'mvpBannerAviso';
            perfilTop.parentNode.insertBefore(bannerContainer, perfilTop.nextSibling);
        }
    }

    if (bannerContainer) {
        let activeMvpMatch = null;
        const matchesPool = (Array.isArray(data.equipos) && data.equipos.length > 0) 
            ? data.equipos 
            : ((Array.isArray(data.todos_partidos)) ? data.todos_partidos : []);

        activeMvpMatch = matchesPool.find(eq => {
            let catL = (eq.categoria || '').toLowerCase();
            let isSuperliga = catL.includes('sm2') || catL.includes('superliga');
            let mvpCands = Array.isArray(eq.mvp_candidatos) ? eq.mvp_candidatos.filter(Boolean) : [];
            let isMvpVisible = eq.mvp_visible !== false && eq.mvp_visible !== 'OCULTAR';
            return isSuperliga && isMvpVisible && mvpCands.length >= 2 && !eq.mvp_oficial;
        });

        if (activeMvpMatch) {
            let myVote = (data.mvp_votos && data.mvp_votos[activeMvpMatch.id_partido]) ? data.mvp_votos[activeMvpMatch.id_partido] : null;
            let rivalName = (activeMvpMatch.ubicacion === 'LOCAL') ? activeMvpMatch.rival : activeMvpMatch.equipo_local;
            let matchLabel = rivalName ? ` vs ${rivalName}` : '';
            let subtitleText = myVote
                ? `Ya has emitido tu voto. Toca aquí para ver o cambiar tu elección 👇`
                : `¡Ya está disponible la votación del MVP VALCYL! Toca aquí para votar 👇`;
            let btnLabel = myVote ? 'Ver voto ✨' : 'Votar MVP 👑';

            bannerContainer.innerHTML = `
            <div class="mvp-aviso-banner" onclick="window.scrollToMvpWidget('${activeMvpMatch.id_partido}')" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.18), rgba(93, 23, 137, 0.32)); border: 1.5px solid var(--secondary-color); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; box-shadow: 0 4px 18px rgba(212, 175, 55, 0.22); transition: transform 0.15s ease, box-shadow 0.15s ease;" onmouseenter="this.style.transform='scale(1.01)';" onmouseleave="this.style.transform='none';">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                    <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(212, 175, 55, 0.22); border: 1px solid var(--secondary-color); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0;">
                        👑
                    </div>
                    <div style="min-width: 0; text-align: left;">
                        <div style="font-size: 0.88rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 6px;">
                            <span>¡Votación MVP VALCYL disponible!</span>
                            <span style="font-size: 0.68rem; background: var(--secondary-color); color: #000; font-weight: 800; padding: 1px 6px; border-radius: 6px; text-transform: uppercase;">Activa</span>
                        </div>
                        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${subtitleText}
                        </div>
                    </div>
                </div>
                <div style="background: var(--secondary-color); color: #000; font-weight: 900; font-size: 0.75rem; padding: 7px 12px; border-radius: 8px; white-space: nowrap; flex-shrink: 0; display: flex; align-items: center; gap: 4px;">
                    <span>${btnLabel}</span>
                </div>
            </div>`;
            bannerContainer.style.display = 'block';
        } else {
            bannerContainer.innerHTML = '';
            bannerContainer.style.display = 'none';
        }
    }

    document.getElementById('contenedorPartidos').innerHTML = htmlPartidos;
    const appMsg = document.getElementById('appMessage');
    if (appMsg && window.isGuestMode) appMsg.style.display = 'none';
    if(window.updateCategoryFilter) window.updateCategoryFilter();
    if(typeof iniciarRelojes === 'function') iniciarRelojes();
    if(window.lucide) setTimeout(() => lucide.createIcons(), 50);
};


// -------------------------------------------------------------

function iniciarRelojes() {
    if(intervalCountdown) clearInterval(intervalCountdown);
    intervalCountdown = setInterval(() => {
        const now = new Date().getTime();

        // Actualizar cuentas atrás de publicación del MVP VALCYL
        document.querySelectorAll('.reloj-mvp').forEach(el => {
            const targetTs = parseInt(el.getAttribute('data-target'));
            if (!targetTs) return;
            const diffMvp = targetTs - now;
            if (diffMvp <= 0) {
                el.innerText = "⏳ Se publicará en breves...";
                el.style.color = "var(--secondary-color)";
                if (!el.getAttribute('data-refreshed')) {
                    el.setAttribute('data-refreshed', 'true');
                    setTimeout(() => {
                        if (typeof window.renderCarteleraHTML === 'function') {
                            window.renderCarteleraHTML(window.appData);
                        }
                    }, 1500);
                }
            } else {
                const h = Math.floor(diffMvp / (1000 * 60 * 60));
                const m = Math.floor((diffMvp % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diffMvp % (1000 * 60)) / 1000);
                const pad = n => String(n).padStart(2, '0');
                if (h > 0) {
                    el.innerText = `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
                } else {
                    el.innerText = `${pad(m)}m ${pad(s)}s`;
                }
            }
        });
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
            el.innerHTML = "";
            el.style.display = "none";
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

window.iniciarRelojes = iniciarRelojes;


// Acceso directo con desplazamiento suave hacia el widget de votación de MVP
window.scrollToMvpWidget = function(idPart) {
    let target = document.getElementById('mvp-widget-' + idPart) || document.getElementById('card-v2-' + idPart);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.transition = 'box-shadow 0.4s ease, border-color 0.4s ease';
        let oldShadow = target.style.boxShadow;
        let oldBorder = target.style.borderColor;
        target.style.boxShadow = '0 0 25px rgba(212, 175, 55, 0.85)';
        target.style.borderColor = 'var(--secondary-color)';
        setTimeout(() => {
            target.style.boxShadow = oldShadow;
            target.style.borderColor = oldBorder;
        }, 2200);
    }
};
