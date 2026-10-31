// ==================================================================
// HISTORIAL, PERFIL Y ESTADÍSTICAS
// ==================================================================

function renderHistorialV2(data) {
    window.historialDataCache = data;
    drawHistorialUI('todas');
}

function drawHistorialUI(selectedJornada = 'todas', selectedEquipo = 'todos') {
    const data = window.historialDataCache;
    const container = document.getElementById('historialContentV2');
    if (!container || !data) return;

    let ptsGanador = 3, ptsSets = 5, ptsDiffExacta = 2, maxDistancia = 10, pctMvp = 10;
    if (data.reglas) {
        ptsGanador = data.reglas.ganador || ptsGanador;
        ptsSets = data.reglas.sets || ptsSets;
        ptsDiffExacta = data.reglas.diff_exacta || ptsDiffExacta;
        maxDistancia = data.reglas.max_dist || maxDistancia;
        if (data.reglas.pct_mvp !== undefined) pctMvp = data.reglas.pct_mvp;
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

    // Extraer jornadas y equipos permitidos del usuario
    let jornadas = new Set();
    let equipos = new Set();
    let misEquiposPermitidos = (data.mis_equipos_siguiendo && Array.isArray(data.mis_equipos_siguiendo) && data.mis_equipos_siguiendo.length > 0)
        ? data.mis_equipos_siguiendo
        : [];

    if (misEquiposPermitidos.length > 0) {
        misEquiposPermitidos.forEach(eq => { if (eq) equipos.add(eq); });
    } else {
        // Fallback en caso de que no viniera la lista (ej: admin sin filtros)
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
        // Filtrar por jornada y equipo (un partido coincide si el equipo es equipo_local o rival)
        if (selectedJornada !== 'todas' && String(match.jornada_eq) !== String(selectedJornada)) continue;
        if (selectedEquipo !== 'todos' && match.equipo_local !== selectedEquipo && match.rival !== selectedEquipo) continue;

        let localName = match.ubicacion === 'LOCAL' ? match.equipo_local : match.rival;
        let visitName = match.ubicacion === 'LOCAL' ? match.rival : match.equipo_local;

        // Comprobar si para este usuario es un Derby (asignado a ambos equipos)
        let isDerbyMatch = Boolean(match.es_derby);
        if (!isDerbyMatch && data.mis_equipos_siguiendo && Array.isArray(data.mis_equipos_siguiendo)) {
            let hasLoc = data.mis_equipos_siguiendo.includes(match.equipo_local);
            let hasRiv = data.mis_equipos_siguiendo.includes(match.rival);
            if (hasLoc && hasRiv) isDerbyMatch = true;
        }

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
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size: 0.75rem; background:rgba(212,175,55,0.1); padding:3px 8px; border-radius:4px; font-weight: 700; color:var(--vcv-dorado);">Jornada ${match.jornada_eq || '-'} • Pendiente</span>
                      ${isDerbyMatch ? `<span style="font-size:0.65rem; background:rgba(231,76,60,0.18); color:#ff4757; padding:2px 6px; border-radius:4px; font-weight:800;">🔥 Derby x2</span>` : ''}
                    </div>
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
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size: 0.75rem; background:var(--bg-card-alt); padding:3px 8px; border-radius:4px; font-weight: 700; color:var(--text-muted);">Jornada ${match.jornada_eq || '-'} • Finalizado</span>
                      ${isDerbyMatch ? `<span style="font-size:0.65rem; background:rgba(231,76,60,0.18); color:#ff4757; padding:2px 6px; border-radius:4px; font-weight:800;">🔥 Derby x2</span>` : ''}
                    </div>
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
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size: 0.75rem; background:var(--bg-card-alt); padding:3px 8px; border-radius:4px; font-weight: 700; color:var(--text-muted);">Jornada ${match.jornada_eq || '-'} • Pendiente</span>
                  ${isDerbyMatch ? `<span style="font-size:0.65rem; background:rgba(231,76,60,0.18); color:#ff4757; padding:2px 6px; border-radius:4px; font-weight:800;">🔥 Derby x2</span>` : ''}
                </div>
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

        // Bonificación MVP (+pctMvp% redondeado hacia arriba si acertó el MVP oficial)
        let mvpBonusPts = 0;
        let acertoMvp = false;
        if (match.mvp_oficial && matchPts > 0 && pctMvp > 0 && data.mvp_votos && data.mvp_votos[match.id_partido]) {
            let uMvpVote = String(data.mvp_votos[match.id_partido]).trim().toLowerCase();
            let mOficial = String(match.mvp_oficial).trim().toLowerCase();
            let dorOf = (mOficial.match(/#(\d+)/) || [])[1];
            let dorVo = (uMvpVote.match(/#(\d+)/) || [])[1];
            if (dorOf && dorVo && dorOf === dorVo) {
                acertoMvp = true;
            } else if (mOficial === uMvpVote || mOficial.includes(uMvpVote) || uMvpVote.includes(mOficial)) {
                acertoMvp = true;
            }
            if (acertoMvp) {
                mvpBonusPts = Math.ceil(matchPts * (pctMvp / 100));
                matchPts += mvpBonusPts;
            }
        }

        // Si se filtra por un equipo concreto, NO se duplican los puntos por derby para las estadísticas de ese equipo
        // Si se ven todas las ligas / general, el valor derby se comenta y se muestra en la tarjeta
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

        let summaryText = "";
        let colorClass = "var(--text-muted)";
        let iconType = "award";
        if (matchPts > (ptsGanador + ptsSets)) { summaryText = "¡Partidazo! Clavaste la predicción casi perfecta."; colorClass = "var(--success)"; }
        else if (acertoGanador) { summaryText = "Acertaste el ganador del partido."; colorClass = "var(--text-gold)"; }
        else { summaryText = "No hubo suerte en este partido."; colorClass = "var(--vcv-rojo)"; iconType = "x-circle"; }
        if (acertoMvp && mvpBonusPts > 0) {
            summaryText += ` <span style="color:var(--secondary-color); font-weight:800;">(⭐ +${mvpBonusPts} pts extra por acertar el MVP VALCYL)</span>`;
        }

        let derbyBadgeHtml = isDerbyMatch ? `<span style="font-size:0.65rem; background:rgba(231,76,60,0.18); color:#ff4757; padding:2px 6px; border-radius:4px; font-weight:800;">🔥 Derby x2</span>` : '';
        let ptsCardDisplay = isDerbyMatch ? `+${matchPts * 2} PTS <span style="font-size:0.7rem; font-weight:700; color:var(--text-muted);">(base ${matchPts}x2)</span>` : `+${matchPts} PTS`;

        partidosEvaluados.push(`
        <!-- Tarjeta Historial -->
        <div class="vcv-card-v2" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px; border-left:4px solid ${colorClass}; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size: 0.75rem; background:var(--bg-card-alt); padding:3px 8px; border-radius:4px; font-weight: 700; color:var(--text-muted);">Jornada ${match.jornada_eq || '-'} • Finalizado</span>
              ${derbyBadgeHtml}
            </div>
            <span style="font-size: 0.95rem; color: ${colorClass}; font-weight: 900;">${ptsCardDisplay}</span>
          </div>
          <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 10px; color:var(--text-main);">${localName} <span style="color:var(--text-muted); font-weight:400;">vs</span> ${visitName}</div>
          <div style="background: var(--bg-card-alt); padding: 12px; border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px; border:1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Tu Pronóstico:</span>
              <strong style="color: var(--secondary-color);">${pred.sets} (${uDiffStr} pts local)</strong>
            </div>
            ${userVotedMvp ? (function(){
                let vInfo = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(userVotedMvp) : { apodo: userVotedMvp };
                let vLabel = (vInfo.dorsal ? '#' + vInfo.dorsal + ' ' : '') + (vInfo.apodo || userVotedMvp);
                return `
            <div style="display: flex; justify-content: space-between; align-items:flex-start; gap:8px;">
              <span style="color: var(--text-muted); flex-shrink:0;">Tu Voto MVP VALCYL:</span>
              <strong style="color: ${acertoMvp ? '#2ecc71' : 'var(--text-main)'}; font-size: 0.8rem; text-align:right; word-break:break-word;">
                ⭐ ${vLabel} ${acertoMvp ? '✓' : ''}
              </strong>
            </div>`;
            })() : ''}
            <div style="display: flex; justify-content: space-between; align-items:center;">
              <span style="color: var(--text-muted);">Acta Oficial:</span>
              <strong style="color: var(--text-main);">${match.oficial_sets} (${oDiffStr} pts local)</strong>
            </div>
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
    // El promedio se calcula sobre los puntos base de cada partido (sin el multiplicador x2 de los derbys)
    let promedio = totalPredicciones > 0 ? (basePtsTotales / totalPredicciones).toFixed(1) : 0;
    if (promedio.toString().endsWith('.0')) promedio = parseInt(promedio);
    
    let ptsTxt = totalPredicciones > 0 ? ptsTotales : "-";
    let setsPorcentaje = totalPredicciones > 0 ? Math.round((setsExactos / totalPredicciones) * 100) : 0;
    let setsTxt = totalPredicciones > 0 ? `${setsExactos} <span style="font-size:0.9rem; font-weight:900; color:#55efc4; float:right; margin-top:8px;">${setsPorcentaje}%</span>` : "-";
    let aciertosTxt = totalPredicciones > 0 ? `${aciertosGanador} <span style="font-size:0.8rem; font-weight:normal; color:#ccc;">/ ${totalPredicciones}</span> <span style="font-size:0.9rem; font-weight:900; color:#55efc4; float:right; margin-top:8px;">${eficacia}%</span>` : "-";
    let promedioTxt = totalPredicciones > 0 ? `${promedio} <span style="font-size:0.8rem; font-weight:normal; color:#ccc;">/ part.</span>` : "-";

    // Si el usuario tiene disponible algún derby, mostrar aviso explicativo junto a la métrica de promedio
    let derbyAvisoHtml = hasAnyDerbyAvailable ? `
        <span onclick="showMobileTooltip(event, 'El promedio de puntos se calcula sobre los puntos base de los partidos, sin incluir la bonificación doble (x2) de los derbys.')" 
              title="El promedio de puntos se calcula sobre los puntos base de los partidos, sin incluir la bonificación doble (x2) de los derbys."
              style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:15px; height:15px; border-radius:50%; background:rgba(255, 71, 87, 0.25); color:#ff4757; border:1px solid rgba(255,71,87,0.5); font-size:0.65rem; font-weight:900; vertical-align:middle; margin-left:4px;">
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
      <div style="margin-bottom:15px;">
         <h2 style="font-size: 1.15rem; font-weight: 900; color:var(--text-main); margin:0 0 10px 0;">
            <i data-lucide="bar-chart-2" style="width:18px;height:18px;display:inline-block;vertical-align:text-bottom; color:var(--vcv-dorado);"></i> Estadísticas
         </h2>
         <div style="display:flex; gap:8px; flex-wrap:wrap;">
             <select id="histFilterJornada" onchange="drawHistorialUI(this.value, document.getElementById('histFilterEquipo').value)" style="flex:1 1 130px; min-width:0; width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-main); font-weight:bold; font-size:0.82rem; outline:none;">
                ${filterOptionsJ}
             </select>
             <select id="histFilterEquipo" onchange="drawHistorialUI(document.getElementById('histFilterJornada').value, this.value)" style="flex:1 1 170px; min-width:0; width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-main); font-weight:bold; font-size:0.82rem; outline:none;">
                ${filterOptionsE}
             </select>
         </div>
      </div>
    `;

    let statsHTML = `
      <!-- Resumen Métricas (Oscuro y alto contraste) -->
      <div style="background: linear-gradient(180deg, #180622 0%, #0d0314 100%); padding: 15px; border-radius:14px; margin-bottom:20px; color:white; border:1px solid rgba(212,175,55,0.4); box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        <div class="historial-metrics-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          
          <div style="background: #1f0729; padding: 12px 10px; border-radius: 10px; border: 1px solid rgba(192, 132, 252, 0.16); min-width: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.35);">
            <div class="metric-label" style="font-size: 0.72rem; color: #bfa9c9; text-transform: uppercase; font-weight:700; line-height:1.2; word-break: break-word; letter-spacing: 0.4px;">Pts Ganados</div>
            <div class="metric-val" style="font-size: 1.45rem; font-weight: 900; color: #f5c542; font-family: 'Space Grotesk', sans-serif; margin-top: 3px;">${ptsTxt}</div>
          </div>
          
          <div style="background: #1f0729; padding: 12px 10px; border-radius: 10px; border: 1px solid rgba(192, 132, 252, 0.16); min-width: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.35);">
            <div class="metric-label" style="font-size: 0.72rem; color: #bfa9c9; text-transform: uppercase; font-weight:700; display:flex; align-items:center; flex-wrap:wrap; gap:4px; line-height:1.2; word-break: break-word; letter-spacing: 0.4px;">
                <span>Promedio</span>
                ${derbyAvisoHtml}
            </div>
            <div class="metric-val" style="font-size: 1.45rem; font-weight: 900; color: #fcfaff; font-family: 'Space Grotesk', sans-serif; margin-top: 3px;">${promedioTxt}</div>
          </div>
          
          <div style="background: #1f0729; padding: 12px 10px; border-radius: 10px; border: 1px solid rgba(192, 132, 252, 0.16); min-width: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.35);">
            <div class="metric-label" style="font-size: 0.72rem; color: #bfa9c9; text-transform: uppercase; font-weight:700; line-height:1.2; word-break: break-word; letter-spacing: 0.4px;">Aciertos (Part.)</div>
            <div class="metric-val" style="font-size: 1.45rem; font-weight: 900; color: #38bdf8; font-family: 'Space Grotesk', sans-serif; margin-top: 3px;">${aciertosTxt}</div>
          </div>
          
          <div style="background: #1f0729; padding: 12px 10px; border-radius: 10px; border: 1px solid rgba(192, 132, 252, 0.16); min-width: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.35);">
            <div class="metric-label" style="font-size: 0.72rem; color: #bfa9c9; text-transform: uppercase; font-weight:700; line-height:1.2; word-break: break-word; letter-spacing: 0.4px;">Sets Exactos</div>
            <div class="metric-val" style="font-size: 1.45rem; font-weight: 900; color: #10b981; font-family: 'Space Grotesk', sans-serif; margin-top: 3px;">${setsTxt}</div>
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
    
    if(window.lucide) setTimeout(() => window.lucide.createIcons(), 10);
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

const prediccionFormEl = document.getElementById('prediccionForm');
if (prediccionFormEl) prediccionFormEl.addEventListener('submit', function(e) {
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
        if (typeof window.vcvHaptic === "function") window.vcvHaptic("success");
          updateProgressBar();
        if (data.status === "success") { msgBox.className = "alert-box alert-success"; msgBox.innerText = "✅ " + data.message; } 
        else { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "❌ " + data.message; }
    })
    .catch(() => { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Error: " + err.message + " | " + (err.stack || ""); msgBox.style.display = "block";
        if (typeof window.vcvHaptic === "function") window.vcvHaptic("success");
          updateProgressBar(); })
    .finally(() => { btnSubmit.disabled = false; btnSubmit.innerText = "💾 Guardar Mis Predicciones"; });
});

const btnToggleSortEl = document.getElementById('btnToggleSort');
if (btnToggleSortEl) btnToggleSortEl.addEventListener('click', function(e) {
    e.preventDefault();
    isSortDesc = !isSortDesc;
    this.innerText = isSortDesc ? "⬇️ Orden Descendente (Nuevos primero)" : "⬆️ Orden Ascendente (Viejos primero)";
    renderizarHistorial();
});

const btnHistoryEl = document.getElementById('btnHistory');
if (btnHistoryEl) btnHistoryEl.addEventListener('click', function(e) {
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
        if (typeof window.vcvHaptic === "function") window.vcvHaptic("success");
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
