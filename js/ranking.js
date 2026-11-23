// ==================================================================
// HISTORIAL, PERFIL Y ESTADÍSTICAS (PESTAÑA PREDICCIONES)
// ==================================================================

function renderHistorialV2(data) {
    window.historialDataCache = data;
    drawHistorialUI('todas');
}

function drawHistorialUI(selectedJornada = 'todas', selectedEquipo = 'todos') {
    const data = window.historialDataCache;
    const container = document.getElementById('historialContentV2');
    if (!container || !data) return;

    const numRule = (v, fb) => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) ? Number(v) : fb;
    let ptsGanador = 3, ptsSets = 5, ptsDiffExacta = 2, maxDistancia = 10, pctMvp = 10;
    if (data.reglas) {
        ptsGanador = numRule(data.reglas.ganador, ptsGanador);
        ptsSets = numRule(data.reglas.sets, ptsSets);
        ptsDiffExacta = numRule(data.reglas.diff_exacta, ptsDiffExacta);
        maxDistancia = numRule(data.reglas.max_dist, maxDistancia);
        pctMvp = numRule(data.reglas.pct_mvp, pctMvp);
    }

    const todosPartidosMap = {};
    if (data.todos_partidos) {
        data.todos_partidos.forEach(p => { todosPartidosMap[p.id_partido] = p; });
    } else if (data.equipos) {
        data.equipos.forEach(p => { todosPartidosMap[p.id_partido] = p; });
    }

    let todosArr = Object.values(todosPartidosMap);
    
    // Filtrar para mostrar solo los partidos que están o han estado disponibles:
    const carteleraMap = {};
    if (data.equipos) {
        data.equipos.forEach(p => carteleraMap[p.id_partido] = true);
    }

    todosArr = todosArr.filter(match => {
        if (data.predicciones_usuario && data.predicciones_usuario[match.id_partido]) return true;
        if (match.estado === "CERRADO" || match.oficial_sets) return true;
        if (carteleraMap[match.id_partido]) return true;
        return false;
    });

    // Extraer jornadas y equipos permitidos del usuario
    let jornadas = new Set();
    let equipos = new Set();
    let misEquiposPermitidos = (data.mis_equipos_siguiendo && Array.isArray(data.mis_equipos_siguiendo) && data.mis_equipos_siguiendo.length > 0)
        ? data.mis_equipos_siguiendo
        : [];

    if (misEquiposPermitidos.length > 0) {
        misEquiposPermitidos.forEach(eq => { if (eq) equipos.add(eq); });
    } else {
        todosArr.forEach(match => {
            if (match.equipo_local) equipos.add(match.equipo_local);
            if (match.rival) equipos.add(match.rival);
        });
    }

    todosArr.forEach(match => {
        if (match.jornada_eq) jornadas.add(match.jornada_eq);
    });
    
    let jornadasArr = Array.from(jornadas).sort((a,b) => parseInt(a) - parseInt(b));
    let equiposArr = Array.from(equipos).sort();

    // Ordenar de más nuevo a más antiguo por timestamp
    todosArr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    let ptsTotales = 0;
    let basePtsTotales = 0;
    let aciertosGanador = 0;
    let plenos = 0;
    let setsExactos = 0;
    let totalPredicciones = 0;
    let partidosEvaluados = [];
    let hasAnyDerbyAvailable = false;

    for (const match of todosArr) {
        if (selectedJornada !== 'todas' && String(match.jornada_eq) !== String(selectedJornada)) continue;
        if (selectedEquipo !== 'todos' && match.equipo_local !== selectedEquipo && match.rival !== selectedEquipo) continue;

        let localName = match.ubicacion === 'LOCAL' ? match.equipo_local : match.rival;
        let visitName = match.ubicacion === 'LOCAL' ? match.rival : match.equipo_local;

        let isDerbyMatch = Boolean(match.es_derby);
        if (!isDerbyMatch && data.mis_equipos_siguiendo && Array.isArray(data.mis_equipos_siguiendo)) {
            let hasLoc = data.mis_equipos_siguiendo.includes(match.equipo_local);
            let hasRiv = data.mis_equipos_siguiendo.includes(match.rival);
            if (hasLoc && hasRiv) isDerbyMatch = true;
        }

        const safeShareId = match.id_partido ? String(match.id_partido).replace(/'/g, "\\'") : '';
        const btnShareHistHtml = safeShareId ? `
        <button type="button" onclick="window.abrirModalCompartirPartido('${safeShareId}')" title="Compartir imagen de este partido" aria-label="Compartir imagen de este partido" class="pred-share-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
        </button>` : '';

        const isMatchClosed = Boolean(match.estado === "CERRADO" || match.estado === "FINALIZADO" || (match.oficial_sets && String(match.oficial_sets).trim() !== ""));

        const pred = (data.predicciones_usuario && data.predicciones_usuario[match.id_partido]) 
            ? data.predicciones_usuario[match.id_partido] 
            : null;

        // Escudos y nombres de los equipos
        let safeLocalName = (window.getEscudoSlug ? window.getEscudoSlug(localName) : localName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
        let safeVisitName = (window.getEscudoSlug ? window.getEscudoSlug(visitName) : visitName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
        let localAbrev = ((match.ubicacion === 'LOCAL' ? match.abrev_local : match.abrev_rival) || localName.substring(0, 3)).toUpperCase();
        let visitAbrev = ((match.ubicacion === 'LOCAL' ? match.abrev_rival : match.abrev_local) || visitName.substring(0, 3)).toUpperCase();

        let localLogo = `<picture><source srcset="files/images/escudos/${safeLocalName}.webp?v=20261115_v1" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeLocalName}.png?v=20261115_v1" alt="${localName}" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\\'font-weight:900; font-size:0.85rem; color:#fff;\\'>${localAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
        let visitLogo = `<picture><source srcset="files/images/escudos/${safeVisitName}.webp?v=20261115_v1" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeVisitName}.png?v=20261115_v1" alt="${visitName}" onerror="this.onerror=null; this.parentNode.outerHTML='<span style=\\'font-weight:900; font-size:0.85rem; color:#fff;\\'>${visitAbrev}</span>';" style="width:100%; height:100%; object-fit:contain;"></picture>`;

        let catBadgeHtml = (typeof window.getCategoryHTML === 'function') ? window.getCategoryHTML(match.categoria) : '';
        let derbyTagHtml = isDerbyMatch ? `<span style="font-size:0.65rem; background:rgba(231,76,60,0.18); color:#ff4757; border:1px solid rgba(231,76,60,0.35); padding:2px 7px; border-radius:6px; font-weight:800; display:inline-flex; align-items:center; gap:3px;">🔥 Derby x2</span>` : '';
        let fechaMatchStr = (typeof window.formatFecha === 'function' && match.timestamp) ? window.formatFecha(match.timestamp) : (match.timestamp ? new Date(match.timestamp).toLocaleDateString() : 'Fecha por confirmar');

        // -------------------------------------------------------------
        // CASO 1: SIN PREDICCIÓN
        // -------------------------------------------------------------
        if (!pred) {
            if (!isMatchClosed) {
                // PARTIDO ABIERTO (Sin pronóstico realizado todavía)
                partidosEvaluados.push(`
                <div class="vcv-card-v2 pred-card" style="border-left: 4px solid var(--vcv-dorado) !important;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:8px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:6px; min-width:0; flex-wrap:wrap;">
                      ${catBadgeHtml}
                      <span style="font-size: 0.72rem; background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.3); padding:3px 8px; border-radius:6px; font-weight: 800; color:var(--vcv-dorado); text-transform:uppercase;">Jornada ${match.jornada_eq || '-'} • Abierto</span>
                      ${derbyTagHtml}
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; margin-left:auto; flex-shrink:0;">
                      ${btnShareHistHtml}
                      <span style="font-size:0.75rem; font-weight:800; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:12px;">- PTS</span>
                    </div>
                  </div>

                  <div class="pred-scoreboard">
                    <div class="pred-team-col">
                      <div class="pred-team-crest">${localLogo}</div>
                      <div class="pred-team-name" title="${localName}">${localName}</div>
                      <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">(Local)</span>
                    </div>

                    <div class="pred-score-center">
                      <div class="pred-score-box">
                        <span style="font-size:0.75rem; font-weight:900; color:var(--vcv-dorado); letter-spacing:1px;">VS</span>
                      </div>
                      <span style="font-size:0.65rem; color:var(--text-muted); font-weight:600; margin-top:2px; text-align:center;">${fechaMatchStr}</span>
                    </div>

                    <div class="pred-team-col">
                      <div class="pred-team-crest">${visitLogo}</div>
                      <div class="pred-team-name" title="${visitName}">${visitName}</div>
                      <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">(Visitante)</span>
                    </div>
                  </div>

                  <div style="margin-top:12px; background:rgba(245,197,66,0.08); border:1px dashed rgba(245,197,66,0.35); border-radius:12px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:8px; color:var(--vcv-dorado); font-size:0.8rem; font-weight:700;">
                      <i data-lucide="alert-circle" style="width:16px; height:16px; flex-shrink:0;"></i>
                      <span>¡Aún no has hecho tu pronóstico para este partido!</span>
                    </div>
                    <button type="button" onclick="if(window.switchTabV2) window.switchTabV2('carteleraSection', document.querySelector('.bottom-nav-v2 button'));" style="background:var(--vcv-dorado); color:#000; border:none; font-size:0.75rem; font-weight:900; padding:6px 14px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 8px rgba(212,175,55,0.3); transition:transform 0.15s ease;">
                      <span>Pronosticar ahora</span> ➔
                    </button>
                  </div>
                </div>`);
            } else {
                // PARTIDO FINALIZADO Y SIN PREDICCIÓN (No penaliza en estadísticas)
                let oDiffStr = "Sin acta";
                let oficialTxt = "Sin acta";
                let oSetsDisp = match.oficial_sets ? match.oficial_sets.split("-") : ["-", "-"];
                if (match.oficial_sets) {
                    if (match.oficial_parciales) {
                        let oDiff = 0;
                        const setsP = String(match.oficial_parciales).split(",");
                        for (const sp of setsP) {
                            const nums = sp.split("-");
                            if (nums.length === 2) oDiff += (parseInt(nums[0]) - parseInt(nums[1]));
                        }
                        oDiffStr = oDiff >= 0 ? `+${oDiff}` : `${oDiff}`;
                        oficialTxt = `${match.oficial_sets} (${oDiffStr} pts local)`;
                    } else {
                        oficialTxt = `${match.oficial_sets}`;
                    }
                }

                partidosEvaluados.push(`
                <div class="vcv-card-v2 pred-card" style="border-left: 4px solid var(--border-color) !important; opacity: 0.72;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:8px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:6px; min-width:0; flex-wrap:wrap;">
                      ${catBadgeHtml}
                      <span style="font-size: 0.72rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); padding:3px 8px; border-radius:6px; font-weight: 700; color:var(--text-muted); text-transform:uppercase;">Jornada ${match.jornada_eq || '-'} • Finalizado</span>
                      ${derbyTagHtml}
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; margin-left:auto; flex-shrink:0;">
                      ${btnShareHistHtml}
                      <span style="font-size:0.75rem; font-weight:800; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:12px;">Sin pronóstico</span>
                    </div>
                  </div>

                  <div class="pred-scoreboard">
                    <div class="pred-team-col">
                      <div class="pred-team-crest">${localLogo}</div>
                      <div class="pred-team-name" title="${localName}">${localName}</div>
                      <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">(Local)</span>
                    </div>

                    <div class="pred-score-center">
                      <div class="pred-score-box">
                        <div style="font-size:1.35rem; font-weight:900; font-family:'Space Grotesk', sans-serif; letter-spacing:1px; color:#fff; line-height:1;">
                          ${oSetsDisp[0]} - ${oSetsDisp[1]}
                        </div>
                        <span style="font-size:0.6rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; margin-top:2px; display:block;">OFICIAL</span>
                      </div>
                    </div>

                    <div class="pred-team-col">
                      <div class="pred-team-crest">${visitLogo}</div>
                      <div class="pred-team-name" title="${visitName}">${visitName}</div>
                      <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">(Visitante)</span>
                    </div>
                  </div>

                  <div class="pred-comparison-box">
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
                      <span style="color:var(--text-muted); font-weight:600;">Tu Pronóstico:</span>
                      <strong style="color:var(--text-muted); font-style:italic;">No participaste</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
                      <span style="color:var(--text-muted); font-weight:600;">Resultado Oficial:</span>
                      <strong style="color:var(--text-main);">${oficialTxt}</strong>
                    </div>
                  </div>

                  <div style="margin-top:8px; font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                    <i data-lucide="info" style="width:13px; height:13px; flex-shrink:0;"></i>
                    <span>No enviaste pronóstico para este partido (no resta en tu promedio).</span>
                  </div>
                </div>`);
            }
            continue;
        }

        // -------------------------------------------------------------
        // CASO 2: PARTIDO PENDIENTE CON PREDICCIÓN (En juego o por jugar)
        // -------------------------------------------------------------
        if (!isMatchClosed || !match.oficial_sets) {
            let uDiff = parseInt(pred.puntos) || 0;
            if (pred.signo && pred.signo.toLowerCase().includes("en contra")) uDiff = -uDiff;
            let uDiffStr = uDiff >= 0 ? `+${uDiff}` : `${uDiff}`;

            let userVotedMvp = (data.mvp_votos && data.mvp_votos[match.id_partido]) ? String(data.mvp_votos[match.id_partido]) : null;

            partidosEvaluados.push(`
            <div class="vcv-card-v2 pred-card" style="border-left: 4px solid var(--border-color) !important;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:8px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:6px; min-width:0; flex-wrap:wrap;">
                  ${catBadgeHtml}
                  <span style="font-size: 0.72rem; background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.3); padding:3px 8px; border-radius:6px; font-weight: 800; color:var(--vcv-dorado); text-transform:uppercase;">Jornada ${match.jornada_eq || '-'} • Pendiente</span>
                  ${derbyTagHtml}
                </div>
                <div style="display:flex; align-items:center; gap:8px; margin-left:auto; flex-shrink:0;">
                  ${btnShareHistHtml}
                  <span style="font-size:0.8rem; font-weight:800; color:var(--vcv-dorado); background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.3); padding:3px 10px; border-radius:12px; font-family:'Space Grotesk', sans-serif;">- PTS</span>
                </div>
              </div>

              <div class="pred-scoreboard">
                <div class="pred-team-col">
                  <div class="pred-team-crest">${localLogo}</div>
                  <div class="pred-team-name" title="${localName}">${localName}</div>
                  <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">(Local)</span>
                </div>

                <div class="pred-score-center">
                  <div class="pred-score-box">
                    <span style="font-size:0.75rem; font-weight:900; color:var(--vcv-dorado); letter-spacing:1px;">VS</span>
                  </div>
                  <span style="font-size:0.65rem; color:var(--text-muted); font-weight:600; margin-top:2px; text-align:center;">${fechaMatchStr}</span>
                </div>

                <div class="pred-team-col">
                  <div class="pred-team-crest">${visitLogo}</div>
                  <div class="pred-team-name" title="${visitName}">${visitName}</div>
                  <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">(Visitante)</span>
                </div>
              </div>

              <div class="pred-comparison-box">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <i data-lucide="check-circle" style="width:14px; height:14px; color:var(--vcv-dorado);"></i>
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Tu Pronóstico:</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <strong style="font-size:1.05rem; font-weight:900; color:var(--vcv-dorado); font-family:'Space Grotesk', sans-serif;">${pred.sets}</strong>
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">(${uDiffStr} pts local)</span>
                  </div>
                </div>

                ${userVotedMvp ? (function(){
                    let vInfo = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(userVotedMvp) : { apodo: userVotedMvp };
                    let vLabel = (vInfo.dorsal ? '#' + vInfo.dorsal + ' ' : '') + (vInfo.apodo || userVotedMvp);
                    return `
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; padding-top:6px; border-top:1px solid rgba(255,255,255,0.06);">
                      <span style="color:var(--text-muted); font-weight:600;">Tu Voto MVP VALCYL:</span>
                      <strong style="color:var(--text-main);">⭐ ${vLabel}</strong>
                    </div>`;
                })() : ''}

                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; padding-top:6px; border-top:1px solid rgba(255,255,255,0.06);">
                  <span style="color:var(--text-muted); font-weight:600;">Estado del partido:</span>
                  <span style="color:var(--text-muted); font-style:italic;">En juego o pendiente de acta oficial</span>
                </div>
              </div>
            </div>`);
            continue;
        }

        // -------------------------------------------------------------
        // CASO 3: PARTIDO FINALIZADO CON PREDICCIÓN (Evaluación de Puntos)
        // -------------------------------------------------------------
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
        let hasOficialParciales = Boolean(match.oficial_parciales && String(match.oficial_parciales).trim() !== '');
        if (hasOficialParciales) {
            const setsP = String(match.oficial_parciales).split(",");
            for (const sp of setsP) {
                const nums = sp.split("-");
                if (nums.length === 2) oDiff += (parseInt(nums[0]) - parseInt(nums[1]));
            }
        }
        let uDiff = parseInt(pred.puntos) || 0;
        if (pred.signo && pred.signo.toLowerCase().includes("en contra")) uDiff = -uDiff;

        const dist = hasOficialParciales ? Math.abs(oDiff - uDiff) : Infinity;
        let diffPtsGained = 0;
        if (hasOficialParciales) {
            if (dist === 0) {
                diffPtsGained = ptsDiffExacta;
                matchPts += ptsDiffExacta;
            } else if (maxDistancia > 0 && dist < maxDistancia) {
                diffPtsGained = Math.round(ptsDiffExacta * ((maxDistancia - dist) / maxDistancia));
                matchPts += diffPtsGained;
            }
        }

        // Bonificación MVP
        let mvpBonusPts = 0;
        let acertoMvp = false;
        if (match.mvp_oficial && matchPts > 0 && pctMvp > 0 && data.mvp_votos && data.mvp_votos[match.id_partido]) {
            const rawVote = data.mvp_votos[match.id_partido];
            if (typeof window.isSameMvpPlayer === 'function') {
                acertoMvp = window.isSameMvpPlayer(match.mvp_oficial, rawVote);
            } else {
                let uMvpVote = String(rawVote).trim().toLowerCase();
                let mOficial = String(match.mvp_oficial).trim().toLowerCase();
                let dorOf = (mOficial.match(/#(\d+)/) || [])[1];
                let dorVo = (uMvpVote.match(/#(\d+)/) || [])[1];
                if (dorOf && dorVo) acertoMvp = (parseInt(dorOf, 10) === parseInt(dorVo, 10));
                else acertoMvp = (mOficial === uMvpVote);
            }
            if (acertoMvp) {
                mvpBonusPts = Math.ceil(matchPts * (pctMvp / 100));
                matchPts += mvpBonusPts;
            }
        }

        if (isDerbyMatch) hasAnyDerbyAvailable = true;
        basePtsTotales += matchPts;

        let ptsForTotal = matchPts;
        if (selectedEquipo === 'todos' && isDerbyMatch) {
            ptsForTotal = matchPts * 2;
        }

        ptsTotales += ptsForTotal;
        if (acertoGanador && acertoSets && dist <= 2) plenos++;

        let oDiffStr = oDiff >= 0 ? `+${oDiff}` : `${oDiff}`;
        let uDiffStr = uDiff >= 0 ? `+${uDiff}` : `${uDiff}`;
        let userVotedMvp = (data.mvp_votos && data.mvp_votos[match.id_partido]) ? String(data.mvp_votos[match.id_partido]) : null;
        let officialMvp = match.mvp_oficial ? String(match.mvp_oficial) : null;

        // Veredicto y colores según aciertos
        let summaryText = "";
        let colorClass = "var(--text-muted)";
        let iconType = "award";
        let cardBorderColor = "var(--border-color)";

        if (matchPts > (ptsGanador + ptsSets)) {
            summaryText = "¡Partidazo! Clavaste la predicción casi perfecta.";
            colorClass = "var(--success)";
            cardBorderColor = "var(--success)";
        } else if (acertoGanador) {
            summaryText = "Acertaste el ganador del encuentro.";
            colorClass = "var(--vcv-dorado)";
            cardBorderColor = "var(--vcv-dorado)";
        } else {
            summaryText = "No hubo suerte en esta predicción.";
            colorClass = "var(--danger)";
            iconType = "x-circle";
            cardBorderColor = "rgba(239, 68, 68, 0.45)";
        }

        // Construir chips con desglose detallado de puntos conseguidos
        let breakdownChips = [];
        if (acertoGanador) {
            breakdownChips.push(`<span style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.35); padding:2px 7px; border-radius:6px; font-size:0.7rem; font-weight:800; display:inline-flex; align-items:center; gap:3px;"><i data-lucide="check" style="width:11px;height:11px;"></i> Ganador (+${ptsGanador})</span>`);
        }
        if (acertoSets) {
            breakdownChips.push(`<span style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.35); padding:2px 7px; border-radius:6px; font-size:0.7rem; font-weight:800; display:inline-flex; align-items:center; gap:3px;"><i data-lucide="check-check" style="width:11px;height:11px;"></i> Sets exactos (+${ptsSets})</span>`);
        }
        if (diffPtsGained > 0) {
            let labelDif = dist === 0 ? `Dif. exacta (+${diffPtsGained})` : `Dif. ajustada (+${diffPtsGained})`;
            breakdownChips.push(`<span style="background:rgba(245,197,66,0.15); color:var(--vcv-dorado); border:1px solid rgba(245,197,66,0.35); padding:2px 7px; border-radius:6px; font-size:0.7rem; font-weight:800; display:inline-flex; align-items:center; gap:3px;"><i data-lucide="crosshair" style="width:11px;height:11px;"></i> ${labelDif}</span>`);
        }
        if (acertoMvp && mvpBonusPts > 0) {
            breakdownChips.push(`<span style="background:rgba(168,85,247,0.18); color:#c084fc; border:1px solid rgba(168,85,247,0.35); padding:2px 7px; border-radius:6px; font-size:0.7rem; font-weight:800; display:inline-flex; align-items:center; gap:3px;">⭐ MVP (+${mvpBonusPts})</span>`);
        }
        if (isDerbyMatch) {
            breakdownChips.push(`<span style="background:rgba(231,76,60,0.18); color:#ff4757; border:1px solid rgba(231,76,60,0.35); padding:2px 7px; border-radius:6px; font-size:0.7rem; font-weight:800; display:inline-flex; align-items:center; gap:3px;">🔥 Derby x2 (+${matchPts})</span>`);
        }
        if (breakdownChips.length === 0) {
            breakdownChips.push(`<span style="background:rgba(239,68,68,0.1); color:#f87171; border:1px solid rgba(239,68,68,0.25); padding:2px 7px; border-radius:6px; font-size:0.7rem; font-weight:700;">Sin aciertos (0 pts)</span>`);
        }

        let ptsBadgeDisplay = "";
        if (matchPts > 0) {
            let ptsTotalMatch = isDerbyMatch ? matchPts * 2 : matchPts;
            ptsBadgeDisplay = `
            <span style="background: linear-gradient(135deg, rgba(212,175,55,0.22), rgba(245,197,66,0.1)); border: 1.5px solid var(--vcv-dorado); color: var(--vcv-dorado); font-size: 0.95rem; font-weight: 900; padding: 4px 12px; border-radius: 20px; font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.3px; box-shadow: 0 2px 10px rgba(212,175,55,0.25);">
                +${ptsTotalMatch} PTS ${isDerbyMatch ? `<span style="font-size:0.68rem; opacity:0.85; font-weight:700;">(x2)</span>` : ''}
            </span>`;
        } else {
            ptsBadgeDisplay = `<span style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); font-size:0.8rem; font-weight:800; padding:4px 10px; border-radius:20px;">0 PTS</span>`;
        }

        // Parciales oficiales en chips elegantes
        let parcialesChipsHtml = "";
        if (match.oficial_parciales && String(match.oficial_parciales).trim() !== "") {
            let rawChips = String(match.oficial_parciales).split(/\s*,\s*|\s*;\s*/);
            let chipsList = rawChips.map(pStr => {
                let parts = pStr.trim().split('-');
                if (parts.length === 2) {
                    let pL = parseInt(parts[0]);
                    let pV = parseInt(parts[1]);
                    let colL = pL > pV ? 'color:var(--vcv-dorado); font-weight:800;' : 'color:var(--text-muted);';
                    let colV = pV > pL ? 'color:var(--vcv-dorado); font-weight:800;' : 'color:var(--text-muted);';
                    return `<span style="display:inline-flex; align-items:center; gap:2px; padding:2px 5px; border-radius:4px; background:rgba(255,255,255,0.05); font-size:0.68rem; border:1px solid rgba(255,255,255,0.08);"><span style="${colL}">${pL}</span><span style="opacity:0.4;">-</span><span style="${colV}">${pV}</span></span>`;
                }
                return `<span style="padding:2px 5px; font-size:0.68rem; color:var(--text-muted);">${pStr}</span>`;
            }).join(' ');
            parcialesChipsHtml = `<div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:4px; margin-top:5px;">${chipsList}</div>`;
        }

        partidosEvaluados.push(`
        <div class="vcv-card-v2 pred-card" style="border-left: 4px solid ${cardBorderColor} !important;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:8px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:6px; min-width:0; flex-wrap:wrap;">
              ${catBadgeHtml}
              <span style="font-size: 0.72rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); padding:3px 8px; border-radius:6px; font-weight: 700; color:var(--text-muted); text-transform:uppercase;">Jornada ${match.jornada_eq || '-'} • Finalizado</span>
              ${derbyTagHtml}
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-left:auto; flex-shrink:0;">
              ${btnShareHistHtml}
              ${ptsBadgeDisplay}
            </div>
          </div>

          <div class="pred-scoreboard">
            <div class="pred-team-col">
              <div class="pred-team-crest">${localLogo}</div>
              <div class="pred-team-name" title="${localName}">${localName}</div>
              <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">(Local)</span>
            </div>

            <div class="pred-score-center">
              <div class="pred-score-box">
                <div style="font-size:1.45rem; font-weight:900; font-family:'Space Grotesk', sans-serif; letter-spacing:1px; color:#fff; line-height:1;">
                  ${oSets[0]} - ${oSets[1]}
                </div>
                <span style="font-size:0.6rem; color:var(--vcv-dorado); font-weight:800; text-transform:uppercase; margin-top:2px; display:block;">OFICIAL</span>
              </div>
              ${parcialesChipsHtml}
            </div>

            <div class="pred-team-col">
              <div class="pred-team-crest">${visitLogo}</div>
              <div class="pred-team-name" title="${visitName}">${visitName}</div>
              <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">(Visitante)</span>
            </div>
          </div>

          <div class="pred-comparison-box">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.72rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Tu Pronóstico:</span>
                <strong style="color:var(--vcv-dorado); font-size:1rem; font-family:'Space Grotesk', sans-serif;">${pred.sets}</strong>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">(${uDiffStr} pts local)</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.72rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Acta Oficial:</span>
                <strong style="color:#fff; font-size:1rem; font-family:'Space Grotesk', sans-serif;">${match.oficial_sets}</strong>
                ${hasOficialParciales ? `<span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">(${oDiffStr} pts local)</span>` : ''}
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.06);">
              ${breakdownChips.join('')}
            </div>

            ${userVotedMvp ? (function(){
                let vInfo = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(userVotedMvp) : { apodo: userVotedMvp };
                let vLabel = (vInfo.dorsal ? '#' + vInfo.dorsal + ' ' : '') + (vInfo.apodo || userVotedMvp);
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; padding-top:6px; border-top:1px solid rgba(255,255,255,0.06);">
                  <span style="color:var(--text-muted); font-weight:600;">Tu Voto MVP VALCYL:</span>
                  <strong style="color:${acertoMvp ? '#10b981' : 'var(--text-main)'}; font-size:0.8rem;">
                    ⭐ ${vLabel} ${acertoMvp ? '✓ (+bonus)' : ''}
                  </strong>
                </div>`;
            })() : ''}

            ${officialMvp ? (function(){
                let oInfo = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(officialMvp) : { apodo: officialMvp };
                let oLabel = (oInfo.dorsal ? '#' + oInfo.dorsal + ' ' : '') + (oInfo.apodo || officialMvp) + (oInfo.posicion ? ' (' + oInfo.posicion + ')' : '');
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; padding-top:4px;">
                  <span style="color:var(--text-muted); font-weight:600;">Ganador MVP Oficial:</span>
                  <strong style="color:var(--vcv-dorado); font-size:0.8rem;">👑 ${oLabel}</strong>
                </div>`;
            })() : ''}
          </div>

          <div style="margin-top:10px; font-size:0.78rem; color:${colorClass}; display:flex; align-items:center; gap:6px; font-weight:700;">
            <i data-lucide="${iconType}" style="width:14px; height:14px; flex-shrink:0;"></i>
            <span>${summaryText}</span>
          </div>
        </div>`);
    }

    let eficacia = totalPredicciones > 0 ? Math.round((aciertosGanador / totalPredicciones) * 100) : 0;
    let promedio = totalPredicciones > 0 ? (basePtsTotales / totalPredicciones).toFixed(1) : 0;
    if (promedio.toString().endsWith('.0')) promedio = parseInt(promedio);
    
    let ptsTxt = totalPredicciones > 0 ? ptsTotales : "-";
    let setsPorcentaje = totalPredicciones > 0 ? Math.round((setsExactos / totalPredicciones) * 100) : 0;
    let setsTxt = totalPredicciones > 0 ? `${setsExactos}` : "-";
    let aciertosTxt = totalPredicciones > 0 ? `${aciertosGanador}` : "-";
    let promedioTxt = totalPredicciones > 0 ? `${promedio}` : "-";

    let derbyAvisoHtml = hasAnyDerbyAvailable ? `
        <span onclick="if(window.showMobileTooltip) showMobileTooltip(event, 'El promedio se calcula sobre los puntos base de cada partido, sin incluir la bonificación doble (x2) de los derbys.');" 
              title="El promedio se calcula sobre los puntos base de los partidos, sin incluir la bonificación doble (x2) de los derbys."
              style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:14px; height:14px; border-radius:50%; background:rgba(255, 71, 87, 0.25); color:#ff4757; border:1px solid rgba(255,71,87,0.5); font-size:0.6rem; font-weight:900; vertical-align:middle; margin-left:3px;">
            !
        </span>` : '';

    let filterOptionsJ = `<option value="todas" ${selectedJornada==='todas' ? 'selected' : ''}>📅 Todas las jornadas</option>`;
    jornadasArr.forEach(j => {
        filterOptionsJ += `<option value="${j}" ${selectedJornada===j ? 'selected' : ''}>Jornada ${j}</option>`;
    });

    let filterOptionsE = `<option value="todos" ${selectedEquipo==='todos' ? 'selected' : ''}>🛡️ Todos los equipos</option>`;
    equiposArr.forEach(eq => {
        filterOptionsE += `<option value="${eq}" ${selectedEquipo===eq ? 'selected' : ''}>${eq}</option>`;
    });

    let topBar = `
      <div style="margin-bottom:14px;">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
           <div>
             <h2 style="font-size: 1.25rem; font-weight: 900; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px; letter-spacing:-0.4px;">
               <i data-lucide="check-circle-2" style="width:20px; height:20px; color:var(--vcv-dorado);"></i>
               <span>Mis Predicciones</span>
             </h2>
             <p style="font-size: 0.8rem; color: var(--text-muted); margin: 3px 0 0 0;">Historial de pronósticos, actas oficiales y puntos ganados.</p>
           </div>
         </div>

         <div class="pred-filter-bar">
             <select id="histFilterJornada" class="pred-select" onchange="drawHistorialUI(this.value, document.getElementById('histFilterEquipo').value)">
                ${filterOptionsJ}
             </select>
             <select id="histFilterEquipo" class="pred-select" onchange="drawHistorialUI(document.getElementById('histFilterJornada').value, this.value)">
                ${filterOptionsE}
             </select>
         </div>
      </div>
    `;

    let statsHTML = `
      <div style="background: linear-gradient(135deg, rgba(34, 10, 48, 0.88) 0%, rgba(18, 5, 27, 0.96) 100%); padding: 16px 14px; border-radius: 16px; margin-bottom: 20px; color: white; border: 1px solid rgba(212,175,55,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.45); backdrop-filter: blur(8px);">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:800; color:var(--vcv-dorado); text-transform:uppercase; letter-spacing:0.6px;">
            <i data-lucide="trending-up" style="width:14px; height:14px;"></i>
            <span>Estadísticas de Precisión</span>
          </div>
          <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">
            ${selectedJornada === 'todas' ? 'Toda la temporada' : 'Jornada ' + selectedJornada}
          </span>
        </div>

        <div class="historial-metrics-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          
          <div style="background: rgba(0, 0, 0, 0.35); padding: 12px 10px; border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.2); text-align: center; display:flex; flex-direction:column; justify-content:space-between;">
            <div style="display:flex; align-items:center; justify-content:center; gap:4px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.4px;">
              <i data-lucide="trophy" style="width:13px; height:13px; color:var(--vcv-dorado);"></i>
              <span>Pts Ganados</span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: var(--vcv-dorado); font-family: 'Space Grotesk', sans-serif; margin: 4px 0 2px 0;">${ptsTxt}</div>
            <span style="font-size:0.68rem; color:var(--text-muted); font-weight:600;">en partidos evaluados</span>
          </div>
          
          <div style="background: rgba(0, 0, 0, 0.35); padding: 12px 10px; border-radius: 12px; border: 1px solid rgba(192, 132, 252, 0.16); text-align: center; display:flex; flex-direction:column; justify-content:space-between;">
            <div style="display:flex; align-items:center; justify-content:center; gap:4px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.4px;">
              <i data-lucide="zap" style="width:13px; height:13px; color:#c084fc;"></i>
              <span>Promedio Base</span>
              ${derbyAvisoHtml}
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: #fff; font-family: 'Space Grotesk', sans-serif; margin: 4px 0 2px 0;">${promedioTxt}</div>
            <span style="font-size:0.68rem; color:var(--text-muted); font-weight:600;">pts / partido</span>
          </div>
          
          <div style="background: rgba(0, 0, 0, 0.35); padding: 12px 10px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2); text-align: center; display:flex; flex-direction:column; justify-content:space-between;">
            <div style="display:flex; align-items:center; justify-content:center; gap:4px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.4px;">
              <i data-lucide="target" style="width:13px; height:13px; color:#38bdf8;"></i>
              <span>Aciertos Ganador</span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: #38bdf8; font-family: 'Space Grotesk', sans-serif; margin: 4px 0 2px 0;">
              ${aciertosTxt} <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">/ ${totalPredicciones}</span>
            </div>
            <div>
              <span style="font-size:0.68rem; font-weight:900; background:rgba(56, 189, 248, 0.15); color:#38bdf8; padding:2px 6px; border-radius:10px;">${eficacia}% efectividad</span>
            </div>
          </div>
          
          <div style="background: rgba(0, 0, 0, 0.35); padding: 12px 10px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2); text-align: center; display:flex; flex-direction:column; justify-content:space-between;">
            <div style="display:flex; align-items:center; justify-content:center; gap:4px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.4px;">
              <i data-lucide="award" style="width:13px; height:13px; color:#10b981;"></i>
              <span>Sets Exactos</span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: #10b981; font-family: 'Space Grotesk', sans-serif; margin: 4px 0 2px 0;">
              ${setsTxt} <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">plenos</span>
            </div>
            <div>
              <span style="font-size:0.68rem; font-weight:900; background:rgba(16, 185, 129, 0.15); color:#10b981; padding:2px 6px; border-radius:10px;">${setsPorcentaje}% precisión</span>
            </div>
          </div>
          
        </div>
      </div>
    `;

    let listHTML = "";
    if (partidosEvaluados.length === 0) {
        listHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); background:var(--bg-card-alt); border-radius:16px; border:1px dashed var(--border-color);">
            <i data-lucide="clock" style="width: 40px; height: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
            <p style="font-weight:700; font-size:0.95rem; margin:0 0 6px 0; color:var(--text-main);">No hay pronósticos ni partidos coincidentes</p>
            <p style="font-size:0.8rem; margin:0; color:var(--text-muted);">Prueba a cambiar los filtros de jornada o equipo seleccionados.</p>
        </div>`;
    } else {
        listHTML = `<div class="historial-matches-grid" style="display: flex; flex-direction: column; gap: 14px;">` + partidosEvaluados.join("") + `</div>`;
    }

    // Botón de salto rápido a la Predicción de Puntos Totales
    const miniBotonTotalesHTML = `
      <div style="display: flex; justify-content: flex-end; margin-top: -8px; margin-bottom: 22px;">
        <button type="button" onclick="window.irAPrediccionTotales && window.irAPrediccionTotales()" style="display: inline-flex; align-items: center; gap: 7px; background: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.45); color: var(--vcv-dorado, #ffd700); padding: 7px 16px; border-radius: 20px; font-size: 0.78rem; font-weight: 800; cursor: pointer; backdrop-filter: blur(4px); box-shadow: 0 2px 10px rgba(0,0,0,0.25); transition: all 0.2s ease;">
          <i data-lucide="target" style="width:14px; height:14px; color:var(--vcv-dorado);"></i>
          <span>Predicción Puntos Totales</span>
          <i data-lucide="arrow-down" style="width:13px; height:13px; opacity:0.85;"></i>
        </button>
      </div>
    `;

    const sectionTitleHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; margin-top:16px;">
        <h3 style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
          <i data-lucide="layers" style="width:17px; height:17px; color:var(--vcv-dorado);"></i>
          <span>Detalle de Partidos</span>
        </h3>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:8px;">
          ${partidosEvaluados.length} ${partidosEvaluados.length === 1 ? 'partido' : 'partidos'}
        </span>
      </div>
    `;

    container.innerHTML = topBar + statsHTML + miniBotonTotalesHTML + sectionTitleHtml + listHTML;
    
    if (typeof window.renderLucideIcons === 'function') {
        window.renderLucideIcons(container);
    } else if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

window.irAPrediccionTotales = function() {
    const sec = document.getElementById('prediccionesTotalesSection');
    if (!sec) return;
    const details = sec.querySelector('details') || document.getElementById('detailsPrediccionesTotales');
    if (details) {
        details.open = true;
    }
    setTimeout(() => {
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
};
