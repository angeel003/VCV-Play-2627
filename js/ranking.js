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

        // Mini escudos integrados junto al nombre (discretos, 22px, sin bloques aparatosos)
        let safeLocalName = (window.getEscudoSlug ? window.getEscudoSlug(localName) : localName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
        let safeVisitName = (window.getEscudoSlug ? window.getEscudoSlug(visitName) : visitName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));

        let localLogoSmall = `<picture style="display:inline-flex; vertical-align:middle; width:22px; height:22px; flex-shrink:0;"><source srcset="files/images/escudos/${safeLocalName}.webp?v=20261124_v1" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeLocalName}.png?v=20261124_v1" alt="" onerror="this.style.display='none';" style="width:100%; height:100%; object-fit:contain;"></picture>`;
        let visitLogoSmall = `<picture style="display:inline-flex; vertical-align:middle; width:22px; height:22px; flex-shrink:0;"><source srcset="files/images/escudos/${safeVisitName}.webp?v=20261124_v1" type="image/webp"><img loading="lazy" src="files/images/escudos/${safeVisitName}.png?v=20261124_v1" alt="" onerror="this.style.display='none';" style="width:100%; height:100%; object-fit:contain;"></picture>`;

        let derbyTagHtml = isDerbyMatch ? `<span style="font-size:0.65rem; background:rgba(231,76,60,0.18); color:#ff4757; border:1px solid rgba(231,76,60,0.35); padding:2px 6px; border-radius:4px; font-weight:800;">🔥 Derby x2</span>` : '';

        // Título limpio con los nombres de equipos y escudos en la misma línea
        let equiposHeaderHtml = `
        <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 10px; color:var(--text-main); display:flex; align-items:center; gap:8px; flex-wrap:wrap; line-height:1.3;">
          <span style="display:inline-flex; align-items:center; gap:6px;">
            ${localLogoSmall}
            <span>${localName}</span>
          </span>
          <span style="color:var(--text-muted); font-weight:400; font-size:0.88rem;">vs</span>
          <span style="display:inline-flex; align-items:center; gap:6px;">
            ${visitLogoSmall}
            <span>${visitName}</span>
          </span>
        </div>`;

        // -------------------------------------------------------------
        // CASO 1: SIN PREDICCIÓN
        // -------------------------------------------------------------
        if (!pred) {
            if (!isMatchClosed) {
                // PARTIDO ABIERTO (Sin pronóstico todavía)
                partidosEvaluados.push(`
                <div class="vcv-card-v2" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--vcv-dorado); margin-bottom:12px; border-left:4px solid var(--vcv-dorado); box-shadow:0 4px 10px rgba(212,175,55,0.1);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; gap:8px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:6px; min-width:0; flex-wrap:wrap;">
                      <span style="font-size: 0.75rem; background:rgba(212,175,55,0.12); padding:3px 8px; border-radius:6px; font-weight: 700; color:var(--vcv-dorado);">Jornada ${match.jornada_eq || '-'} • Abierto</span>
                      ${derbyTagHtml}
                    </div>
                    <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-left:auto; flex-shrink:0;">
                      ${btnShareHistHtml}
                      <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 900;">- PTS</span>
                    </div>
                  </div>

                  ${equiposHeaderHtml}

                  <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-main); display: flex; align-items: center; justify-content:space-between; gap: 8px; font-weight:600; background:rgba(212,175,55,0.06); border:1px dashed rgba(212,175,55,0.35); padding:10px 12px; border-radius:8px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:6px; color:var(--vcv-dorado);">
                      <i data-lucide="alert-triangle" style="width: 15px; height: 15px;"></i>
                      <span>Aún no has hecho tu predicción</span>
                    </div>
                    <button type="button" onclick="if(window.switchTabV2) window.switchTabV2('carteleraSection', document.querySelector('.bottom-nav-v2 button'));" style="background:var(--vcv-dorado); color:#000; border:none; padding:5px 12px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">
                      Pronosticar en Partidos ➔
                    </button>
                  </div>
                </div>`);
            } else {
                // PARTIDO FINALIZADO Y SIN PREDICCIÓN (No penaliza en estadísticas)
                let oDiffStr = "Sin acta";
                let oficialTxt = "Sin acta";
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
                <div class="vcv-card-v2" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px; border-left:4px solid var(--text-muted); opacity: 0.7; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; gap:8px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:6px; min-width:0; flex-wrap:wrap;">
                      <span style="font-size: 0.75rem; background:var(--bg-card-alt); padding:3px 8px; border-radius:6px; font-weight: 700; color:var(--text-muted);">Jornada ${match.jornada_eq || '-'} • Finalizado</span>
                      ${derbyTagHtml}
                    </div>
                    <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-left:auto; flex-shrink:0;">
                      ${btnShareHistHtml}
                      <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 900;">- PTS</span>
                    </div>
                  </div>

                  ${equiposHeaderHtml}

                  <div style="background: var(--bg-card-alt); padding: 12px; border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px; border:1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-muted);">Tu Pronóstico:</span>
                      <strong style="color: var(--text-muted); font-style:italic;">No participaste</strong>
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

        // -------------------------------------------------------------
        // CASO 2: PARTIDO PENDIENTE CON PREDICCIÓN (En juego o por jugar)
        // -------------------------------------------------------------
        if (!isMatchClosed || !match.oficial_sets) {
            let uDiff = parseInt(pred.puntos) || 0;
            if (pred.signo && pred.signo.toLowerCase().includes("en contra")) uDiff = -uDiff;
            let uDiffStr = uDiff >= 0 ? `+${uDiff}` : `${uDiff}`;
            let userVotedMvp = (data.mvp_votos && data.mvp_votos[match.id_partido]) ? String(data.mvp_votos[match.id_partido]) : null;

            partidosEvaluados.push(`
            <div class="vcv-card-v2" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px; border-left:4px solid var(--vcv-dorado); box-shadow:0 4px 6px rgba(0,0,0,0.05);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; gap:8px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:6px; min-width:0; flex-wrap:wrap;">
                  <span style="font-size: 0.75rem; background:rgba(212,175,55,0.1); padding:3px 8px; border-radius:6px; font-weight: 700; color:var(--vcv-dorado);">Jornada ${match.jornada_eq || '-'} • Pendiente</span>
                  ${derbyTagHtml}
                </div>
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-left:auto; flex-shrink:0;">
                  ${btnShareHistHtml}
                  <span style="font-size: 0.95rem; color: var(--vcv-dorado); font-weight: 900; font-family:'Space Grotesk', sans-serif;">- PTS</span>
                </div>
              </div>

              ${equiposHeaderHtml}

              <div style="background: var(--bg-card-alt); padding: 12px; border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px; border:1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Tu Pronóstico:</span>
                  <strong style="color: var(--secondary-color); font-family:'Space Grotesk', sans-serif;">${pred.sets} (${uDiffStr} pts local)</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Acta Oficial:</span>
                  <strong style="color: var(--text-muted); font-style:italic;">En juego / Sin acta</strong>
                </div>
                ${userVotedMvp ? `
                <div style="display: flex; justify-content: space-between; align-items:center; padding-top:4px; border-top:1px solid rgba(255,255,255,0.06);">
                  <span style="color: var(--text-muted);">Tu Voto MVP VALCYL:</span>
                  <strong style="color: var(--text-main); font-size: 0.82rem;">⭐ ${userVotedMvp}</strong>
                </div>` : ''}
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
        let oficialScoreDisplay = hasOficialParciales ? `${match.oficial_sets} (${oDiffStr} pts local)` : `${match.oficial_sets}`;
        let uDiffStr = uDiff >= 0 ? `+${uDiff}` : `${uDiff}`;
        let userVotedMvp = (data.mvp_votos && data.mvp_votos[match.id_partido]) ? String(data.mvp_votos[match.id_partido]) : null;
        let officialMvp = match.mvp_oficial ? String(match.mvp_oficial) : null;

        let summaryText = "";
        let colorClass = "var(--text-muted)";
        let iconType = "award";
        if (matchPts > (ptsGanador + ptsSets)) { summaryText = "¡Partidazo! Clavaste la predicción casi perfecta."; colorClass = "var(--success)"; }
        else if (acertoGanador) { summaryText = "Acertaste el ganador del partido."; colorClass = "var(--text-gold)"; }
        else { summaryText = "No hubo suerte en este partido."; colorClass = "var(--vcv-rojo)"; iconType = "x-circle"; }
        if (acertoMvp && mvpBonusPts > 0) {
            summaryText += ` <span style="color:var(--secondary-color); font-weight:800;">(⭐ +${mvpBonusPts} pts extra por acertar el MVP VALCYL)</span>`;
        }

        let ptsCardDisplay = isDerbyMatch ? `+${matchPts * 2} PTS <span style="font-size:0.7rem; font-weight:700; color:var(--text-muted);">(base ${matchPts}x2)</span>` : `+${matchPts} PTS`;

        // Chips discretos con desglose de puntos conseguidos
        let breakdownBadges = [];
        if (acertoGanador) {
            breakdownBadges.push(`<span style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:800;">✓ Ganador (+${ptsGanador})</span>`);
        }
        if (acertoSets) {
            breakdownBadges.push(`<span style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:800;">✓ Sets (+${ptsSets})</span>`);
        }
        if (diffPtsGained > 0) {
            breakdownBadges.push(`<span style="background:rgba(245,197,66,0.15); color:var(--vcv-dorado); border:1px solid rgba(245,197,66,0.3); padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:800;">✓ Dif. (+${diffPtsGained})</span>`);
        }
        if (acertoMvp && mvpBonusPts > 0) {
            breakdownBadges.push(`<span style="background:rgba(168,85,247,0.18); color:#c084fc; border:1px solid rgba(168,85,247,0.3); padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:800;">⭐ MVP (+${mvpBonusPts})</span>`);
        }
        if (breakdownBadges.length === 0) {
            breakdownBadges.push(`<span style="background:rgba(255,255,255,0.05); color:var(--text-muted); padding:2px 6px; border-radius:4px; font-size:0.7rem;">0 aciertos</span>`);
        }

        partidosEvaluados.push(`
        <!-- Tarjeta Historial Limpia -->
        <div class="vcv-card-v2" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px; border-left:4px solid ${colorClass}; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; gap:8px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:6px; min-width:0; flex-wrap:wrap;">
              <span style="font-size: 0.75rem; background:var(--bg-card-alt); padding:3px 8px; border-radius:6px; font-weight: 700; color:var(--text-muted);">Jornada ${match.jornada_eq || '-'} • Finalizado</span>
              ${derbyTagHtml}
            </div>
            <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-left:auto; flex-shrink:0;">
              ${btnShareHistHtml}
              <span style="font-size: 0.95rem; color: ${colorClass}; font-weight: 900; font-family:'Space Grotesk', sans-serif;">${ptsCardDisplay}</span>
            </div>
          </div>

          ${equiposHeaderHtml}

          <div style="background: var(--bg-card-alt); padding: 12px; border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 7px; border:1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items:center;">
              <span style="color: var(--text-muted);">Tu Pronóstico:</span>
              <strong style="color: var(--secondary-color); font-family:'Space Grotesk', sans-serif;">${pred.sets} <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">(${uDiffStr} pts local)</span></strong>
            </div>

            <div style="display: flex; justify-content: space-between; align-items:center;">
              <span style="color: var(--text-muted);">Acta Oficial:</span>
              <strong style="color: var(--text-main); font-family:'Space Grotesk', sans-serif;">${oficialScoreDisplay}</strong>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:5px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.06);">
              ${breakdownBadges.join('')}
            </div>

            ${userVotedMvp ? (function(){
                let vInfo = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(userVotedMvp) : { apodo: userVotedMvp };
                let vLabel = (vInfo.dorsal ? '#' + vInfo.dorsal + ' ' : '') + (vInfo.apodo || userVotedMvp);
                return `
            <div style="display: flex; justify-content: space-between; align-items:flex-start; gap:8px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.06);">
              <span style="color: var(--text-muted); flex-shrink:0;">Tu Voto MVP VALCYL:</span>
              <strong style="color: ${acertoMvp ? '#2ecc71' : 'var(--text-main)'}; font-size: 0.8rem; text-align:right; word-break:break-word;">
                ⭐ ${vLabel} ${acertoMvp ? '✓' : ''}
              </strong>
            </div>`;
            })() : ''}

            ${officialMvp ? (function(){
                let oInfo = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(officialMvp) : { apodo: officialMvp };
                let oLabel = (oInfo.dorsal ? '#' + oInfo.dorsal + ' ' : '') + (oInfo.apodo || officialMvp) + (oInfo.posicion ? ' (' + oInfo.posicion + ')' : '');
                return `
            <div style="display: flex; justify-content: space-between; align-items:flex-start; gap:8px;">
              <span style="color: var(--text-muted); flex-shrink:0;">Ganador MVP VALCYL:</span>
              <strong style="color: var(--vcv-dorado); font-size: 0.8rem; text-align:right; word-break:break-word;">
                👑 ${oLabel}
              </strong>
            </div>`;
            })() : ''}
          </div>

          <div style="margin-top: 10px; font-size: 0.8rem; color: ${colorClass}; display: flex; align-items: center; gap: 6px; font-weight:600;">
            <i data-lucide="${iconType}" style="width: 14px; height: 14px;"></i>
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

    let filterOptionsJ = `<option value="todas" ${selectedJornada==='todas' ? 'selected' : ''}>Todas las jornadas</option>`;
    jornadasArr.forEach(j => {
        filterOptionsJ += `<option value="${j}" ${selectedJornada===j ? 'selected' : ''}>Jornada ${j}</option>`;
    });

    let filterOptionsE = `<option value="todos" ${selectedEquipo==='todos' ? 'selected' : ''}>Todos los equipos</option>`;
    equiposArr.forEach(eq => {
        filterOptionsE += `<option value="${eq}" ${selectedEquipo===eq ? 'selected' : ''}>${eq}</option>`;
    });

    let topBar = `
      <div style="margin-bottom:14px;">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
           <h2 style="font-size: 1.15rem; font-weight: 900; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
             <i data-lucide="bar-chart-2" style="width:18px; height:18px; color:var(--vcv-dorado);"></i>
             <span>Estadísticas</span>
           </h2>
         </div>

         <div class="pred-filter-bar" style="margin-bottom:14px;">
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
      <div style="background: linear-gradient(135deg, rgba(28, 8, 38, 0.85) 0%, rgba(14, 4, 20, 0.95) 100%); padding: 14px 12px; border-radius: 14px; margin-bottom: 20px; color: white; border: 1px solid rgba(212,175,55,0.25); box-shadow: 0 4px 18px rgba(0,0,0,0.35); backdrop-filter: blur(8px);">
        <div class="historial-metrics-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          
          <div style="background: rgba(0, 0, 0, 0.32); padding: 12px 10px; border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.2); min-width: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.25); text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 0.7rem; color: #c4b3cf; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <i data-lucide="trophy" style="width: 13px; height: 13px; color: var(--vcv-dorado);"></i>
              <span>Pts Ganados</span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: var(--vcv-dorado); font-family: 'Space Grotesk', sans-serif; margin: 4px 0 2px 0; line-height: 1;">${ptsTxt}</div>
            <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 600;">acumulados</div>
          </div>
          
          <div style="background: rgba(0, 0, 0, 0.32); padding: 12px 10px; border-radius: 12px; border: 1px solid rgba(192, 132, 252, 0.16); min-width: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.25); text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 0.7rem; color: #c4b3cf; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <i data-lucide="zap" style="width: 13px; height: 13px; color: #c084fc;"></i>
              <span>Promedio Base</span>
              ${derbyAvisoHtml}
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: #fcfaff; font-family: 'Space Grotesk', sans-serif; margin: 4px 0 2px 0; line-height: 1;">${promedioTxt}</div>
            <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 600;">por partido</div>
          </div>
          
          <div style="background: rgba(0, 0, 0, 0.32); padding: 12px 10px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2); min-width: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.25); text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 0.7rem; color: #c4b3cf; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <i data-lucide="target" style="width: 13px; height: 13px; color: #38bdf8;"></i>
              <span>Aciertos Ganador</span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: #38bdf8; font-family: 'Space Grotesk', sans-serif; margin: 4px 0 2px 0; line-height: 1;">
              ${aciertosTxt} ${totalPredicciones > 0 ? `<span style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">/ ${totalPredicciones}</span>` : ''}
            </div>
            <div>
              <span style="font-size: 0.65rem; font-weight: 800; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 7px; border-radius: 8px;">${totalPredicciones > 0 ? eficacia + '% éxito' : '-'}</span>
            </div>
          </div>
          
          <div style="background: rgba(0, 0, 0, 0.32); padding: 12px 10px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2); min-width: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.25); text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 0.7rem; color: #c4b3cf; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <i data-lucide="award" style="width: 13px; height: 13px; color: #10b981;"></i>
              <span>Sets Exactos</span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: #10b981; font-family: 'Space Grotesk', sans-serif; margin: 4px 0 2px 0; line-height: 1;">${setsTxt}</div>
            <div>
              <span style="font-size: 0.65rem; font-weight: 800; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 7px; border-radius: 8px;">${totalPredicciones > 0 ? setsPorcentaje + '% precisión' : '-'}</span>
            </div>
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
        listHTML = `<div class="historial-matches-grid" style="display: flex; flex-direction: column; gap: 12px;">` + partidosEvaluados.join("") + `</div>`;
    }

    // Mini botón para avanzar a la Predicción de Puntos Totales
    const miniBotonTotalesHTML = `
      <div style="display: flex; justify-content: flex-end; margin-top: -10px; margin-bottom: 22px;">
        <button type="button" onclick="window.irAPrediccionTotales && window.irAPrediccionTotales()" style="display: inline-flex; align-items: center; gap: 7px; background: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.45); color: var(--vcv-dorado, #ffd700); padding: 6px 14px; border-radius: 20px; font-size: 0.76rem; font-weight: 800; cursor: pointer; backdrop-filter: blur(4px); box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: all 0.2s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--vcv-dorado, #ffd700);"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <span>Predicción Puntos Totales</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.85;"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        </button>
      </div>
    `;

    container.innerHTML = topBar + statsHTML + miniBotonTotalesHTML + `<h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:12px; margin-top:15px;">Desglose de Partidos</h3>` + listHTML;
    
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
