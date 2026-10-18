
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

        if (sectionId === 'enlacesRfevbSection' && typeof window.renderMyProfileCard === 'function') {
            window.renderMyProfileCard();
        }
        
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
            document.getElementById('summary-text-' + idPart).innerHTML = `<div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; color: var(--text-main); text-align: left; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success);"><i data-lucide="check-circle-2" style="width: 20px; height: 20px; color: var(--success); flex-shrink: 0;"></i><span><strong style="color: var(--success); text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 2px;">Predicción Guardada</strong><strong style="color: var(--text-main); font-weight:900;">${localAb} ${formattedS} ${visitAb} ${formStr}</strong></span></div>`;
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

    
    
    
    window.updateHeaderStats = function() {
        if (!window.appData || !window.appData.clasificaciones || !window.appData.ligas || window.appData.ligas.length === 0) return;
        let loggedUser = window.appData.usuario || (typeof currentUser !== 'undefined' ? currentUser : '');
        let ligaName = window.currentLiga || window.appData.ligas[0];
        
        let rankingList = window.appData.clasificaciones[ligaName] || [];
        
        // Ensure realRank is calculated for the selected league
        rankingList.forEach(r => {
            r.realRank = rankingList.findIndex(x => x.puntos === r.puntos) + 1;
        });
        
        let myUser = rankingList.find(r => r.jugador === loggedUser);
        let rankText = myUser ? `Top ${myUser.realRank}` : "Top -";
        let myPoints = myUser ? myUser.puntos : 0;
        
        let rankEl = document.getElementById('h2-user-rank');
        if(rankEl) rankEl.innerText = rankText;
        let ptsEl = document.getElementById('h2-user-pts');
        if(ptsEl) ptsEl.innerText = myPoints + " pts";
    };

    window.cambiarLiga = function(ligaName) {
        window.currentLiga = ligaName;
        if(typeof window.updateHeaderStats === "function") { window.updateHeaderStats(); }
        if(typeof window.renderRankingV2 === "function") { window.renderRankingV2(); } else { setTimeout(() => { if(typeof window.renderRankingV2 === "function") window.renderRankingV2(); }, 500); }
        if(typeof window.renderMyProfileCard === "function") { window.renderMyProfileCard(); }
    };

    window.calculateUserStatsHelper = function(jugador, ligaName, isViewingOther = false) {
        let data = window.appData;
        let mediaPuntos = "0";
        let mediaPos = "-";
        let recordJornada = "0";
        let recordPartido = "0";
        let desgloseHtml = `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 6px 0;">Aún no hay puntos registrados.</div>`;
        if (!data) return { mediaPuntos, mediaPos, recordJornada, recordPartido, desgloseHtml };

        let loggedUser = data.usuario || (typeof currentUser !== 'undefined' ? currentUser : '');
        let targetUser = jugador || loggedUser;
        if (targetUser !== loggedUser) isViewingOther = true;

        let isFrozenThisLiga = Boolean(data.is_frozen && (data.ligas_congeladas ? data.ligas_congeladas.some(l => String(l).trim().toLowerCase() === String(ligaName).trim().toLowerCase()) : true));

        // 1. Si es el propio usuario logueado y se permite ver partidos: desglose completo por jornada y partido
        if (!isViewingOther && targetUser === loggedUser && data.predicciones_usuario && (data.todos_partidos || data.equipos)) {
            let ptsGanador = 3, ptsSets = 5, ptsDiffExacta = 2, maxDistancia = 10;
            if (data.reglas) {
                ptsGanador = data.reglas.ganador || ptsGanador;
                ptsSets = data.reglas.sets || ptsSets;
                ptsDiffExacta = data.reglas.diff_exacta || ptsDiffExacta;
                maxDistancia = data.reglas.max_dist || maxDistancia;
            }

            let pMap = {};
            (data.todos_partidos || []).forEach(p => { if (p && p.id_partido) pMap[p.id_partido] = p; });
            (data.equipos || []).forEach(p => { if (p && p.id_partido && !pMap[p.id_partido]) pMap[p.id_partido] = p; });
            let partidosList = Object.values(pMap);

            let equiposDeEstaLiga = null;
            if (ligaName && data.ligas_equipos && data.ligas_equipos.length > 0) {
                let eqSet = new Set();
                data.ligas_equipos.forEach(row => {
                    // Formato 1: La fila tiene 'Liga' = ligaName y las columnas son equipos con 'X'
                    if (row.Liga && row.Liga.trim().toLowerCase() === ligaName.trim().toLowerCase()) {
                        for (const col in row) {
                            if (col !== "Liga" && row[col] && (row[col].toString().toUpperCase() === "X" || row[col] === true || row[col] === 1)) {
                                eqSet.add(col.trim().toLowerCase());
                            }
                        }
                    }
                    // Formato 2: La fila tiene 'Equipo' y la columna de la liga tiene 'X'
                    let eqName = row.Equipo || row.equipo;
                    let val = row[ligaName];
                    if (eqName && val && (val.toString().toUpperCase() === "X" || val === true || val === 1)) {
                        eqSet.add(eqName.trim().toLowerCase());
                    }
                });
                if (eqSet.size > 0) equiposDeEstaLiga = eqSet;
            }

            let jMap = {}; // jNum -> { totalPts: 0, matches: [] }
            let maxMatchPts = 0;

            partidosList.forEach(p => {
                if (!p.oficial_sets || !p.oficial_parciales || !p.oficial_sets.includes("-")) return;
                let pred = data.predicciones_usuario[p.id_partido];
                if (!pred || !pred.sets) return;

                let hasLocalInLiga = false;
                let hasRivalInLiga = false;
                if (equiposDeEstaLiga) {
                    let lEq = (p.equipo_local || "").trim().toLowerCase();
                    let rEq = (p.rival || "").trim().toLowerCase();
                    for (let team of equiposDeEstaLiga) {
                        if (lEq.includes(team) || team.includes(lEq)) hasLocalInLiga = true;
                        if (rEq.includes(team) || team.includes(rEq)) hasRivalInLiga = true;
                    }
                    if (!hasLocalInLiga && !hasRivalInLiga) return;
                }

                let isDerbyInLiga = Boolean(equiposDeEstaLiga && hasLocalInLiga && hasRivalInLiga && p.es_derby);

                let jNum = parseInt(p.ronda_global);
                if (isNaN(jNum) || jNum <= 0) jNum = parseInt(p.jornada_eq) || 1;

                const oSets = p.oficial_sets.split("-");
                const oLocalWin = parseInt(oSets[0]) > parseInt(oSets[1]);
                const uSets = pred.sets.split("-");
                const uLocalWin = parseInt(uSets[0]) > parseInt(uSets[1]);

                let mPts = 0;
                if (uLocalWin === oLocalWin) mPts += ptsGanador;
                if (pred.sets === p.oficial_sets) mPts += ptsSets;

                let oDiff = 0;
                const setsP = p.oficial_parciales.split(",");
                for (const sp of setsP) {
                    const nums = sp.split("-");
                    if (nums.length === 2) oDiff += (parseInt(nums[0]) - parseInt(nums[1]));
                }
                let uDiff = parseInt(pred.puntos) || 0;
                if (pred.signo && pred.signo.toLowerCase().includes("en contra")) uDiff = -uDiff;

                const dist = Math.abs(oDiff - uDiff);
                if (dist === 0) mPts += ptsDiffExacta;
                else if (maxDistancia > 0 && dist < maxDistancia) {
                    mPts += Math.round(ptsDiffExacta * ((maxDistancia - dist) / maxDistancia));
                }

                // El récord de puntos en un partido se guarda SIN multiplicador derby
                if (mPts > maxMatchPts) maxMatchPts = mPts;

                const mPtsApplied = isDerbyInLiga ? (mPts * 2) : mPts;

                if (!jMap[jNum]) jMap[jNum] = { totalPts: 0, basePts: 0, matches: [] };
                jMap[jNum].totalPts += mPtsApplied;
                jMap[jNum].basePts += mPts; // Para récord de jornada sin multiplicador derby
                let localName = (p.ubicacion === 'LOCAL') ? p.equipo_local : p.rival;
                let rivalName = (p.ubicacion === 'LOCAL') ? p.rival : p.equipo_local;

                let uPts = parseInt(pred.puntos) || 0;
                let uSig = (pred.signo || "").toLowerCase();
                let localAb = (p.ubicacion === 'LOCAL' ? p.abrev_local : p.abrev_rival) || localName;
                let rivalAb = (p.ubicacion === 'LOCAL' ? p.abrev_rival : p.abrev_local) || rivalName;
                let uFavShort = uPts === 0 ? "" : (uSig.includes("en contra") ? rivalAb : localAb);
                let oFavShort = oDiff === 0 ? "" : (oDiff > 0 ? localAb : rivalAb);
                let predDiffStr = uPts === 0 ? "0 pts (Empate)" : `+${uPts} pts (${uFavShort})`;
                let realDiffStr = (p.oficial_parciales && p.oficial_parciales.includes("-")) ? (oDiff === 0 ? "0 pts" : `+${Math.abs(oDiff)} pts (${oFavShort})`) : "Sin datos";

                jMap[jNum].matches.push({
                    rival: `${localName} vs ${rivalName}`,
                    localName: localName,
                    rivalName: rivalName,
                    pts: mPtsApplied,
                    basePts: mPts,
                    isDerby: isDerbyInLiga,
                    res: p.oficial_sets,
                    predSets: pred.sets,
                    predDiffStr: predDiffStr,
                    realDiffStr: realDiffStr,
                    dist: dist
                });
            });

            let jKeys = Object.keys(jMap).map(Number).sort((a,b)=>b-a);
            if (jKeys.length > 0) {
                desgloseHtml = "";
                let tot = 0;
                let maxJornadaPts = 0;
                jKeys.forEach(j => {
                    let jData = jMap[j];
                    tot += jData.totalPts;
                    // El récord de jornada se evalúa sobre los puntos base sin duplicar
                    if (jData.basePts > maxJornadaPts) maxJornadaPts = jData.basePts;

                    let matchesDetails = jData.matches.map(m => `
                        <div style="padding: 7px 10px; border-left: 3px solid rgba(212,175,55,0.4); background: rgba(255,255,255,0.03); border-radius: 6px; margin-top: 6px;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                                <div style="font-size:0.77rem; font-weight:700; color:var(--text-main); line-height:1.25; word-break:break-word;">
                                    🏐 ${m.localName} <span style="font-size:0.68rem; color:var(--text-muted); font-weight:400;">vs</span> ${m.rivalName}
                                    ${m.isDerby ? `<span style="font-size:0.62rem; background:rgba(231,76,60,0.18); color:#ff4757; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">🔥 Derby x2</span>` : ''}
                                </div>
                                <span style="font-weight:800; font-size:0.78rem; color:${m.pts > 0 ? '#4caf50' : 'var(--text-muted)'}; white-space:nowrap; background:${m.pts > 0 ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255,255,255,0.05)'}; padding:2px 7px; border-radius:4px; flex-shrink:0;">
                                    +${m.pts} pts
                                </span>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px; margin-top:4px; font-size:0.7rem; color:var(--text-muted); flex-wrap:wrap;">
                                <span>Sets: <b style="color:var(--text-main); font-weight:700;">${m.predSets}</b></span>
                                <span style="opacity:0.3;">|</span>
                                <span>Oficial: <b style="color:var(--secondary-color); font-weight:700;">${m.res}</b></span>
                                ${m.predSets === m.res ? `<span style="font-size:0.62rem; background:rgba(46,204,113,0.18); color:#2ecc71; padding:1px 5px; border-radius:4px; font-weight:800;">Sets Exactos</span>` : ''}
                            </div>
                            <div style="display:flex; align-items:center; gap:8px; margin-top:3px; font-size:0.68rem; color:var(--text-muted); flex-wrap:wrap;">
                                <span>Pts a favor: <b style="color:var(--text-main); font-weight:700;">${m.predDiffStr}</b></span>
                                <span style="opacity:0.3;">|</span>
                                <span>Real: <b style="color:var(--secondary-color); font-weight:700;">${m.realDiffStr}</b></span>
                                ${m.dist === 0 ? `<span style="font-size:0.62rem; background:rgba(212,175,55,0.2); color:var(--vcv-dorado); padding:1px 5px; border-radius:4px; font-weight:800;">Dif. Exacta</span>` : (m.dist <= 2 ? `<span style="font-size:0.62rem; background:rgba(52,152,219,0.15); color:#3498db; padding:1px 5px; border-radius:4px; font-weight:700;">Margen ±${m.dist}p</span>` : '')}
                            </div>
                        </div>
                    `).join('');

                    desgloseHtml += `
                        <div style="padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.82rem; font-weight:800; color:var(--text-main);">Jornada ${j}</span>
                                <span style="font-weight:800; color:var(--secondary-color); font-size:0.92rem;">+${jData.totalPts} pts</span>
                            </div>
                            <div style="margin-top:4px;">
                                ${matchesDetails}
                            </div>
                        </div>
                    `;
                });
                mediaPuntos = (tot / jKeys.length).toFixed(1);
                recordJornada = maxJornadaPts.toString();
                recordPartido = maxMatchPts.toString();

                // Calcular Media de Posición real en la liga analizando el histórico acumulado por jornada
                if (ligaName && data.stats_ligas) {
                    let posiciones = [];
                    let jSet = new Set();
                    // Obtener los miembros que pertenecen a ESTA liga concreta
                    let ligaMembers = new Set();
                    if (data.clasificaciones && data.clasificaciones[ligaName]) {
                        data.clasificaciones[ligaName].forEach(r => ligaMembers.add(r.jugador));
                    }
                    if (ligaMembers.size === 0) {
                        for (let u in data.stats_ligas) {
                            if (data.stats_ligas[u][ligaName]) ligaMembers.add(u);
                        }
                    }

                    for (let u of ligaMembers) {
                        if (data.stats_ligas[u] && data.stats_ligas[u][ligaName] && data.stats_ligas[u][ligaName].porJornada) {
                            Object.keys(data.stats_ligas[u][ligaName].porJornada).forEach(j => jSet.add(Number(j)));
                        }
                    }
                    let todasJ = Array.from(jSet).sort((a,b)=>a-b);
                    todasJ.forEach(j => {
                        let rnkJ = [];
                        let targetParticipated = false;
                        for (let u of ligaMembers) {
                            if (!data.stats_ligas[u] || !data.stats_ligas[u][ligaName] || !data.stats_ligas[u][ligaName].porJornada) continue;
                            let ptsUpToJ = 0;
                            for (let x = 1; x <= j; x++) {
                                ptsUpToJ += (data.stats_ligas[u][ligaName].porJornada[x] || 0);
                            }
                            if (u === targetUser && data.stats_ligas[u][ligaName].porJornada[j] !== undefined) targetParticipated = true;
                            rnkJ.push({ u: u, pts: ptsUpToJ });
                        }
                        if (targetParticipated && rnkJ.length > 0) {
                            rnkJ.sort((a,b) => b.pts - a.pts);
                            let myObj = rnkJ.find(x => x.u === targetUser);
                            if (myObj) {
                                let realRank = rnkJ.findIndex(x => x.pts === myObj.pts) + 1;
                                posiciones.push(realRank);
                            }
                        }
                    });

                    if (posiciones.length > 0) {
                        let sumPos = posiciones.reduce((a,b)=>a+b, 0);
                        mediaPos = (sumPos / posiciones.length).toFixed(1) + "º";
                    } else if (data.clasificaciones && data.clasificaciones[ligaName]) {
                        let rnk = data.clasificaciones[ligaName];
                        let myIndex = rnk.findIndex(r => r.jugador === targetUser);
                        if (myIndex !== -1) mediaPos = (myIndex + 1) + "º";
                    }
                } else if (ligaName && data.clasificaciones && data.clasificaciones[ligaName]) {
                    let rnk = data.clasificaciones[ligaName];
                    let myIndex = rnk.findIndex(r => r.jugador === targetUser);
                    if (myIndex !== -1) mediaPos = (myIndex + 1) + "º";
                }

                return { mediaPuntos, mediaPos, recordJornada, recordPartido, desgloseHtml };
            }
        }

        // 2. Si hay stats_ligas desde backend (o para otros perfiles): sólo jornada a jornada
        if (ligaName && data.stats_ligas && data.stats_ligas[targetUser] && data.stats_ligas[targetUser][ligaName] && data.stats_ligas[targetUser][ligaName].porJornada) {
            let uStats = data.stats_ligas[targetUser][ligaName];
            let jornadasJugadas = Object.keys(uStats.porJornada).map(Number).sort((a,b)=>b-a);
            if (jornadasJugadas.length > 0) {
                desgloseHtml = "";
                let totalPuntos = 0;
                let maxPVal = 0;
                let countJ = 0;
                jornadasJugadas.forEach(j => {
                    let ptsJ = uStats.porJornada[j];
                    // Si se está viendo otro perfil y esta liga está congelada en esta jornada activa, no desvelar puntos
                    if (isViewingOther && isFrozenThisLiga && String(j) === String(data.jornada)) {
                        desgloseHtml += `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                                <span style="font-size:0.8rem; font-weight:700;">Jornada ${j}</span>
                                <div style="display:flex; gap:12px; align-items:center;">
                                    <span style="font-weight:700; color:#3498db; font-size:0.82rem;">❄️ Puntos congelados</span>
                                </div>
                            </div>
                        `;
                        return;
                    }

                    totalPuntos += ptsJ;
                    countJ++;
                    if (ptsJ > maxPVal) maxPVal = ptsJ;
                    desgloseHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                            <span style="font-size:0.8rem; font-weight:700;">Jornada ${j}</span>
                            <div style="display:flex; gap:12px; align-items:center;">
                                <span style="font-weight:800; color:var(--secondary-color); font-size:0.9rem;">+${ptsJ} pts</span>
                            </div>
                        </div>
                    `;
                });
                mediaPuntos = countJ > 0 ? (totalPuntos / countJ).toFixed(1) : "0";
                recordJornada = maxPVal.toString();

                // Calcular Media de Posición real
                let posiciones = [];
                let jSet = new Set();
                let ligaMembers = new Set();
                if (data.clasificaciones && data.clasificaciones[ligaName]) {
                    data.clasificaciones[ligaName].forEach(r => ligaMembers.add(r.jugador));
                }
                if (ligaMembers.size === 0) {
                    for (let u in data.stats_ligas) {
                        if (data.stats_ligas[u][ligaName]) ligaMembers.add(u);
                    }
                }

                for (let u of ligaMembers) {
                    if (data.stats_ligas[u] && data.stats_ligas[u][ligaName] && data.stats_ligas[u][ligaName].porJornada) {
                        Object.keys(data.stats_ligas[u][ligaName].porJornada).forEach(j => jSet.add(Number(j)));
                    }
                }
                let todasJ = Array.from(jSet).sort((a,b)=>a-b);
                todasJ.forEach(j => {
                    let rnkJ = [];
                    let targetParticipated = false;
                    for (let u of ligaMembers) {
                        if (!data.stats_ligas[u] || !data.stats_ligas[u][ligaName] || !data.stats_ligas[u][ligaName].porJornada) continue;
                        let ptsUpToJ = 0;
                        for (let x = 1; x <= j; x++) {
                            ptsUpToJ += (data.stats_ligas[u][ligaName].porJornada[x] || 0);
                        }
                        if (u === targetUser && data.stats_ligas[u][ligaName].porJornada[j] !== undefined) targetParticipated = true;
                        rnkJ.push({ u: u, pts: ptsUpToJ });
                    }
                    if (targetParticipated && rnkJ.length > 0) {
                        rnkJ.sort((a,b) => b.pts - a.pts);
                        let myObj = rnkJ.find(x => x.u === targetUser);
                        if (myObj) {
                            let realRank = rnkJ.findIndex(x => x.pts === myObj.pts) + 1;
                            posiciones.push(realRank);
                        }
                    }
                });

                if (posiciones.length > 0) {
                    let sumPos = posiciones.reduce((a,b)=>a+b, 0);
                    mediaPos = (sumPos / posiciones.length).toFixed(1) + "º";
                } else if (data.clasificaciones && data.clasificaciones[ligaName]) {
                    let rnk = data.clasificaciones[ligaName];
                    let myIndex = rnk.findIndex(r => r.jugador === targetUser);
                    if (myIndex !== -1) mediaPos = (myIndex + 1) + "º";
                }
                return { mediaPuntos, mediaPos, recordJornada, recordPartido: "-", desgloseHtml };
            }
        }

        // 3. Fallback de clasificación general (respeta puntos congelados)
        if (ligaName && data.clasificaciones && data.clasificaciones[ligaName]) {
            let rnk = data.clasificaciones[ligaName];
            let pObj = rnk.find(r => r.jugador === targetUser);
            if (pObj && pObj.puntos > 0) {
                let pts = pObj.puntos;
                mediaPuntos = pts.toString();
                recordJornada = pts.toString();
                let myIdx = rnk.findIndex(r => r.jugador === targetUser);
                if (myIdx !== -1) mediaPos = (myIdx + 1) + "º";
                let freezeBadge = (isViewingOther && isFrozenThisLiga) ? `<span style="font-size:0.75rem; color:#3498db; font-weight:600; margin-left:6px;">❄️ (Congelado)</span>` : "";
                desgloseHtml = `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                        <span style="font-size:0.8rem; font-weight:700;">Puntos acumulados ${freezeBadge}</span>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <span style="font-weight:800; color:var(--secondary-color); font-size:0.9rem;">+${pts} pts</span>
                        </div>
                    </div>
                `;
            }
        }

        return { mediaPuntos, mediaPos, recordJornada, recordPartido: "-", desgloseHtml };
    };

    window.renderMyProfileCard = function() {
        let container = document.getElementById('myProfileCardContainer');
        if(!container) return;
        if(!window.appData) { container.innerHTML = ''; return; }
        let data = window.appData;
        let jugador = data.usuario || (typeof currentUser !== 'undefined' ? currentUser : '');
        if(!jugador || jugador === 'lectura') {
            container.innerHTML = '';
            return;
        }

        let uBadges = (data.insignias && data.insignias[jugador]) ? data.insignias[jugador] : [];
        let avatarBadge = uBadges.find(b => b.type === 'avatar');
        let customBadge = uBadges.find(b => b.type === 'custom');
        
        let avatarHtml = jugador.substring(0,2).toUpperCase();
        if (avatarBadge && avatarBadge.emoji) {
            let icon = sanitizeImgUrl(avatarBadge.emoji.trim());
            if (icon.toLowerCase().endsWith('.png') || icon.toLowerCase().endsWith('.jpg') || icon.toLowerCase().endsWith('.jpeg') || icon.toLowerCase().endsWith('.svg') || icon.toLowerCase().endsWith('.gif') || icon.startsWith('http')) {
                avatarHtml = `<img loading="lazy" src="${icon}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
            } else {
                avatarHtml = `<span style="font-size:2.5rem; line-height:1; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${icon}</span>`;
            }
        } else if (customBadge) {
            let icon = sanitizeImgUrl((customBadge.emoji || '✨').trim());
            if (icon.toLowerCase().endsWith('.png') || icon.toLowerCase().endsWith('.jpg') || icon.toLowerCase().endsWith('.svg') || icon.toLowerCase().endsWith('.gif') || icon.startsWith('http')) {
                let src = icon.includes('/') || icon.startsWith('http') ? icon : 'files/images/' + icon;
                avatarHtml = `<img loading="lazy" src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
            } else {
                avatarHtml = `<span style="font-size:2.5rem; line-height:1;">${icon}</span>`;
            }
        }

        let nombreReal = data.nombre_real || jugador;
        let ligaName = window.currentLiga || (data.ligas && data.ligas.length > 0 ? data.ligas[0] : null);
        if (ligaName && data.clasificaciones && data.clasificaciones[ligaName]) {
            let pObj = data.clasificaciones[ligaName].find(r => r.jugador === jugador);
            if (pObj && pObj.nombre_real) nombreReal = pObj.nombre_real;
        }

        let statsResult = window.calculateUserStatsHelper(jugador, ligaName);
        let mediaPuntos = statsResult.mediaPuntos;
        let mediaPos = statsResult.mediaPos;
        let recordJornada = statsResult.recordJornada;
        let recordPartido = statsResult.recordPartido;
        let desgloseHtml = statsResult.desgloseHtml;

        let displayBadges = uBadges.filter(b => b.type !== 'avatar');
        let badgesHtml = "";
        if(displayBadges.length === 0) {
            badgesHtml = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 10px;">Sin insignias adicionales</div>`;
        } else {
            displayBadges.forEach(b => {
                badgesHtml += renderBadgeItemHtml(b, "24px");
            });
        }

        let ligaSelectorPills = "";
        if (data.ligas && data.ligas.length > 1) {
            ligaSelectorPills = `<div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin-bottom:14px;">` +
                data.ligas.map(l => {
                    let isAct = (l === ligaName);
                    return `<button type="button" onclick="cambiarLiga('${l}')" style="font-size:0.75rem; padding:4px 10px; border-radius:20px; border:1px solid ${isAct ? 'var(--secondary-color)' : 'var(--border-color)'}; background:${isAct ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.05)'}; color:${isAct ? 'var(--secondary-color)' : 'var(--text-muted)'}; font-weight:${isAct ? '700' : '500'}; cursor:pointer;">${l}</button>`;
                }).join('') +
            `</div>`;
        }

        container.innerHTML = `
            <div style="background:var(--bg-card); border-radius:16px; padding:24px 20px; box-shadow:0 8px 32px rgba(0,0,0,0.25); border: 1px solid var(--border-color); text-align: center;">
                <div style="width:96px; height:96px; border-radius:18px; background:linear-gradient(135deg, var(--vcv-morado), var(--vcv-dorado)); display:flex; align-items:center; justify-content:center; margin: 0 auto 12px; font-size: 2.2rem; font-weight: 900; color: #fff; overflow:hidden;">
                    ${avatarHtml}
                </div>
                <h3 style="margin:0 0 4px; font-size:1.25rem; font-weight:800; color:var(--text-main);">@${jugador}</h3>
                ${(nombreReal && nombreReal !== jugador) ? `<div style="font-size:0.88rem; color:var(--text-muted); margin-bottom:14px; font-weight:600;">${nombreReal}</div>` : `<div style="margin-bottom:14px;"></div>`}
                
                ${ligaSelectorPills}

                <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 4px; background:rgba(255,255,255,0.05); padding:12px 6px; border-radius:12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); text-align:center;">
                    <div style="border-right:1px solid rgba(255,255,255,0.08); padding:0 2px;">
                        <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;">Media Pts</div>
                        <div style="font-weight:900; color:var(--secondary-color); font-size:1.05rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${mediaPuntos}</div>
                    </div>
                    <div style="border-right:1px solid rgba(255,255,255,0.08); padding:0 2px;">
                        <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;">Media Pos</div>
                        <div style="font-weight:900; color:#fff; font-size:1.05rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${mediaPos}</div>
                    </div>
                    <div style="border-right:1px solid rgba(255,255,255,0.08); padding:0 2px;">
                        <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;" title="Récord de una jornada">Récord J.</div>
                        <div style="font-weight:900; color:#4caf50; font-size:1.05rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${recordJornada}</div>
                    </div>
                    <div style="padding:0 2px;">
                        <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;" title="Récord en un partido">Récord Part.</div>
                        <div style="font-weight:900; color:#00d2d3; font-size:1.05rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${recordPartido}</div>
                    </div>
                </div>

                <div style="text-align: left; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 8px; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Desglose de Puntos (Jornadas y Partidos)</h4>
                    <div style="max-height: 220px; overflow-y: auto; padding-right: 5px; scrollbar-width: thin;">
                        ${desgloseHtml}
                    </div>
                </div>

                <div style="text-align: left; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <h4 style="margin: 0 0 12px; font-size: 0.9rem; color: var(--vcv-dorado); text-transform: uppercase; letter-spacing: 0.5px;">Insignias Conseguidas</h4>
                    <div style="display:flex; flex-direction:column; gap: 12px;">
                        ${badgesHtml}
                    </div>
                </div>
            </div>
        `;
    };

    
    window.closePlayerInfo = function() {
        let modal = document.getElementById('playerInfoModal');
        if(modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    };

    window.openPlayerInfo = function(jugador, selectedLiga = null) {
        if(!window.appData || !window.appData.insignias) return;
        let data = window.appData;
        let uBadges = data.insignias[jugador] || [];
        
        let modal = document.getElementById('playerInfoModal');
        let initialsEl = document.getElementById('playerInfoInitials');
        let nameEl = document.getElementById('playerInfoName');
        let roleEl = document.getElementById('playerInfoRole');
        let badgesList = document.getElementById('playerInfoBadgesList');
        
        if(!modal) return;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        let avatarBadge = uBadges.find(b => b.type === 'avatar');
        let customBadge = uBadges.find(b => b.type === 'custom');
        
        if (avatarBadge && avatarBadge.emoji) {
            let icon = sanitizeImgUrl(avatarBadge.emoji.trim());
            if (icon.toLowerCase().endsWith('.png') || icon.toLowerCase().endsWith('.jpg') || icon.toLowerCase().endsWith('.jpeg') || icon.toLowerCase().endsWith('.svg') || icon.toLowerCase().endsWith('.gif') || icon.startsWith('http')) {
                initialsEl.innerHTML = `<img loading="lazy" src="${icon}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
            } else {
                initialsEl.innerHTML = `<span style="font-size:2.5rem; line-height:1; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${icon}</span>`;
            }
        } else if (customBadge) {
            let icon = sanitizeImgUrl((customBadge.emoji || '✨').trim());
            if (icon.toLowerCase().endsWith('.png') || icon.toLowerCase().endsWith('.jpg') || icon.toLowerCase().endsWith('.svg') || icon.toLowerCase().endsWith('.gif') || icon.startsWith('http')) {
                let src = icon.includes('/') || icon.startsWith('http') ? icon : 'files/images/' + icon;
                initialsEl.innerHTML = `<img loading="lazy" src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
            } else {
                initialsEl.innerHTML = `<span style="font-size:2.5rem; line-height:1;">${icon}</span>`;
            }
        } else {
            initialsEl.innerHTML = jugador.substring(0,2).toUpperCase();
        }
        nameEl.innerText = "@" + jugador;
        
        // Determinar liga concreta activa (la pasada por parámetro, o window.currentLiga, o primera liga donde esté)
        let playerLigas = [];
        if (data.clasificaciones) {
            for (let l in data.clasificaciones) {
                if (data.clasificaciones[l].some(r => r.jugador === jugador)) {
                    playerLigas.push(l);
                }
            }
        }
        if (playerLigas.length === 0 && data.ligas) playerLigas = [...data.ligas];

        let ligaName = selectedLiga || window.currentLiga;
        if (!ligaName || !playerLigas.includes(ligaName)) {
            ligaName = playerLigas[0] || (data.ligas && data.ligas[0]) || null;
        }

        // Use nombre_real instead of role under the username
        let nombreReal = jugador;
        if (ligaName && data.clasificaciones && data.clasificaciones[ligaName]) {
            let pObj = data.clasificaciones[ligaName].find(r => r.jugador === jugador);
            if (pObj && pObj.nombre_real) nombreReal = pObj.nombre_real;
        }
        roleEl.innerText = (nombreReal !== jugador) ? nombreReal : "";
        if (nombreReal === jugador) {
            roleEl.style.display = 'none';
        } else {
            roleEl.style.display = 'block';
        }
        
        // --- CALCULO DE ESTADISTICAS HISTORICAS PARA LA LIGA CONCRETA ---
        let loggedUser = data.usuario || (typeof currentUser !== 'undefined' ? currentUser : '');
        let isOwn = (jugador === loggedUser);
        let statsResult = window.calculateUserStatsHelper(jugador, ligaName, !isOwn);
        let mediaPuntos = statsResult.mediaPuntos;
        let mediaPos = statsResult.mediaPos;
        let recordJornada = statsResult.recordJornada;
        let recordPartido = statsResult.recordPartido;
        let desgloseHtml = statsResult.desgloseHtml;
        
        // Selector / Pastillas de liga en caso de que el jugador esté en más de una liga
        let ligaPillsHtml = "";
        if (playerLigas.length > 1) {
            ligaPillsHtml = `<div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin-bottom:14px;">` +
                playerLigas.map(l => {
                    let isAct = (l === ligaName);
                    return `<button type="button" onclick="openPlayerInfo('${jugador}', '${l}')" style="font-size:0.75rem; padding:4px 10px; border-radius:20px; border:1px solid ${isAct ? 'var(--secondary-color)' : 'var(--border-color)'}; background:${isAct ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.05)'}; color:${isAct ? 'var(--secondary-color)' : 'var(--text-muted)'}; font-weight:${isAct ? '700' : '500'}; cursor:pointer;">${l}</button>`;
                }).join('') +
            `</div>`;
        } else if (ligaName) {
            ligaPillsHtml = `<div style="display:flex; justify-content:center; margin-bottom:12px;"><span style="font-size:0.75rem; padding:3px 10px; border-radius:20px; background:rgba(212,175,55,0.12); color:var(--secondary-color); font-weight:700; border:1px solid rgba(212,175,55,0.3);">Liga ${ligaName}</span></div>`;
        }

        let statsGridHtml = "";
        if (isOwn) {
            statsGridHtml = `
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 4px; background:rgba(255,255,255,0.05); padding:12px 6px; border-radius:12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); text-align:center;">
                <div style="border-right:1px solid rgba(255,255,255,0.08); padding:0 2px;">
                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;">Media Pts</div>
                    <div style="font-weight:900; color:var(--secondary-color); font-size:1.05rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${mediaPuntos}</div>
                </div>
                <div style="border-right:1px solid rgba(255,255,255,0.08); padding:0 2px;">
                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;">Media Pos</div>
                    <div style="font-weight:900; color:#fff; font-size:1.05rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${mediaPos}</div>
                </div>
                <div style="border-right:1px solid rgba(255,255,255,0.08); padding:0 2px;">
                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;" title="Récord de una jornada">Récord J.</div>
                    <div style="font-weight:900; color:#4caf50; font-size:1.05rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${recordJornada}</div>
                </div>
                <div style="padding:0 2px;">
                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;" title="Récord en un partido">Récord Part.</div>
                    <div style="font-weight:900; color:#00d2d3; font-size:1.05rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${recordPartido}</div>
                </div>
            </div>`;
        } else {
            statsGridHtml = `
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background:rgba(255,255,255,0.05); padding:12px 10px; border-radius:12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); text-align:center;">
                <div style="border-right:1px solid rgba(255,255,255,0.08); padding:0 5px;">
                    <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;">Media Pts</div>
                    <div style="font-weight:900; color:var(--secondary-color); font-size:1.1rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${mediaPuntos}</div>
                </div>
                <div style="border-right:1px solid rgba(255,255,255,0.08); padding:0 5px;">
                    <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;">Media Pos</div>
                    <div style="font-weight:900; color:#fff; font-size:1.1rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${mediaPos}</div>
                </div>
                <div style="padding:0 5px;">
                    <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; white-space:nowrap;" title="Récord de una jornada">Récord J.</div>
                    <div style="font-weight:900; color:#4caf50; font-size:1.1rem; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${recordJornada}</div>
                </div>
            </div>`;
        }

        let desgloseTitle = isOwn ? `Desglose de Puntos (${ligaName ? 'Liga ' + ligaName : 'General'})` : `Desglose por Jornada (${ligaName ? 'Liga ' + ligaName : 'General'})`;

        htmlStats = `
            ${ligaPillsHtml}
            ${statsGridHtml}
            <div style="text-align: left; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${desgloseTitle}</h4>
                <div style="max-height: 220px; overflow-y: auto; padding-right: 5px; scrollbar-width: thin;">
                    ${desgloseHtml}
                </div>
            </div>
        `;

        
        // --- INSIGNIAS ---
        let displayBadges = uBadges.filter(b => b.type !== 'avatar');
        let badgesHtml = "";
        if(displayBadges.length === 0) {
            badgesHtml = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 10px;">Sin insignias adicionales</div>`;
        } else {
            displayBadges.forEach(b => {
                badgesHtml += renderBadgeItemHtml(b, "24px");
            });
        }
        badgesList.innerHTML = badgesHtml;
        
        // Insert stats before badges
        let existingStats = document.getElementById('playerInfoStats');
        if(existingStats) existingStats.remove();
        
        if (htmlStats !== "") {
            let statsDiv = document.createElement('div');
            statsDiv.id = 'playerInfoStats';
            statsDiv.innerHTML = htmlStats;
            roleEl.parentNode.insertBefore(statsDiv, roleEl.nextSibling);
        }
        
        modal.style.display = 'flex';
    };
window.renderRankingV2 = function() {
        let savedScroll = 0;
        let oldSlider = document.getElementById('league-slider-container');
        if (oldSlider) {
            savedScroll = oldSlider.scrollLeft;
        }
        
        const data = window.appData;
        let loggedUser = (data && data.usuario) ? data.usuario : (typeof currentUser !== 'undefined' ? currentUser : '');
        
        let container = document.getElementById('tablasClasificacionContainer');
        let enConstruccion = document.getElementById('rankingEnConstruccion');
        
        if (enConstruccion) enConstruccion.style.display = 'none';
        if (container) container.style.display = 'block';
        
        if(!container) return;
        if(!data || !data.ligas || data.ligas.length === 0) {
            container.innerHTML = `<div class="alert-box alert-warning" style="display:block;">No estás asignado a ninguna liga privada todavía.</div>`;
            return;
        }

        let ligaName = window.currentLiga || data.ligas[0];
        let ranking = (data.clasificaciones && data.clasificaciones[ligaName]) ? [...data.clasificaciones[ligaName]] : [];
        let totalJugadores = ranking.length;

        // Determinar si esta liga específica participa en el apagón de fin de semana
        let isLigaFrozen = Boolean(data.is_frozen && (!data.ligas_congeladas || data.ligas_congeladas.some(l => String(l).trim().toLowerCase() === String(ligaName).trim().toLowerCase())));

        // Si esta liga NO está congelada pero tenía puntos pendientes calculados por el fin de semana, sumarlos en vivo
        if (!isLigaFrozen && ranking.length > 0) {
            ranking.forEach(r => {
                if (r.puntos_pendientes && r.puntos_pendientes > 0) {
                    r.puntos = (r.puntos || 0) + r.puntos_pendientes;
                    r.puntos_pendientes = 0;
                }
            });
            ranking.sort((a, b) => b.puntos - a.puntos);
        }
        
        let maxJornada = 1;
        let maxJornadaJugada = 0;
        if (data.stats_ligas) {
            ranking.forEach(r => {
                let u = r.jugador;
                if (data.stats_ligas[u] && data.stats_ligas[u][ligaName] && data.stats_ligas[u][ligaName].porJornada) {
                    for (let j in data.stats_ligas[u][ligaName].porJornada) {
                        let jNum = parseInt(j);
                        if (jNum > maxJornadaJugada && data.stats_ligas[u][ligaName].porJornada[j] > 0) {
                            maxJornadaJugada = jNum;
                        }
                    }
                }
            });
        }
        if (maxJornadaJugada > 0) maxJornada = maxJornadaJugada;
        
        // Calcular Ranking Previo para flechas de tendencia (estrictamente dentro de esta liga)
        let previousRanking = [];
        if (maxJornada > 1 && data.stats_ligas) {
            ranking.forEach(r => {
                let u = r.jugador;
                let ptsUpToPrev = 0;
                if (data.stats_ligas[u] && data.stats_ligas[u][ligaName] && data.stats_ligas[u][ligaName].porJornada) {
                    for (let x = 1; x < maxJornada; x++) {
                        ptsUpToPrev += (data.stats_ligas[u][ligaName].porJornada[x] || 0);
                    }
                }
                previousRanking.push({ jugador: u, pts: ptsUpToPrev });
            });
            previousRanking.sort((a,b) => b.pts - a.pts);
            // Asignar realRank para empates
            previousRanking.forEach(r => {
                r.realRank = previousRanking.findIndex(x => x.pts === r.pts) + 1;
            });
        }
        
        // Asignar realRank al ranking actual
        ranking.forEach(r => {
            r.realRank = ranking.findIndex(x => x.puntos === r.puntos) + 1;
        });
        
        const getTrendHtml = (jugador, currentArrayIdx) => {
            if (isLigaFrozen) {
                return `<span style="color:#3498db; font-size:0.95rem; font-weight:800; display:flex; align-items:center;">❄️</span>`;
            }
            let hasAnyPrevPts = previousRanking.some(x => x.pts > 0);
            if (maxJornadaJugada <= 1 || previousRanking.length === 0 || !hasAnyPrevPts) {
                return `<span style="color:var(--text-muted); font-size:0.8rem; display:flex; align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg></span>`;
            }
            let prevUser = previousRanking.find(x => x.jugador === jugador);
            let currUser = ranking[currentArrayIdx];
            if (!prevUser) {
                return `<span style="color:var(--text-muted); font-size:0.8rem; display:flex; align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg></span>`;
            }
            let diff = prevUser.realRank - currUser.realRank; 
            if (diff > 0) {
                return `<span style="color:var(--success); font-size:0.8rem; font-weight:800; display:flex; align-items:center; gap:2px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>${diff}</span>`;
            } else if (diff < 0) {
                return `<span style="color:#ff4757; font-size:0.8rem; font-weight:800; display:flex; align-items:center; gap:2px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>${Math.abs(diff)}</span>`;
            } else {
                return `<span style="color:var(--text-muted); font-size:0.8rem; font-weight:800; display:flex; align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg></span>`;
            }
        };

        const buildBadgesInline = (jugador) => {
            let uBadges = data.insignias[jugador] || [];
            let displayBadges = uBadges.filter(b => b.type !== 'avatar');
            if(displayBadges.length === 0) return "";
            let html = "";
            displayBadges.forEach(b => {
                let cssColorClass = window.getBadgeCSS ? window.getBadgeCSS(b.type) : '';
                html += renderBadgeIcon(b, "badge-icon", "width:16px; height:16px; margin-left:4px; display:inline-block; vertical-align:middle;");
            });
            return html;
        };

                // ---------- CAJA 1: Título, Botones y Podio ----------
        let html = '';
        if (isLigaFrozen) {
            html += `<style>
            
            .ranking-frozen-bg {
                position: relative;
                border: 1px solid rgba(52, 152, 219, 0.5) !important;
                box-shadow: 0 4px 25px rgba(52, 152, 219, 0.2) !important;
            }
            .ranking-frozen-bg::after {
                content: '';
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(52,152,219,0.08) 100%);
                pointer-events: none;
                z-index: 10;
                border-radius: inherit;
            }
            @keyframes snowFall {
                0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
                15% { opacity: 0.7; }
                85% { opacity: 0.7; }
                100% { transform: translateY(2000px) rotate(360deg); opacity: 0; }
            }
            .snow-flake {
                position: absolute;
                color: rgba(200, 230, 255, 0.4);
                pointer-events: none;
                z-index: 1;
                animation: snowFall linear infinite;
            }
            .ranking-frozen-bg .user-row {
                background: rgba(10, 20, 35, 0.4) !important;
                border-bottom: 1px solid rgba(52, 152, 219, 0.15) !important;
            }
            </style>`;
            
            let snowHtml = '';
            for(let i=0; i<25; i++) {
                let left = Math.random() * 95;
                let dur = 5 + Math.random() * 7;
                let del = Math.random() * 5;
                let size = 8 + Math.random() * 12;
                snowHtml += `<div class="snow-flake" style="left: ${left}%; font-size: ${size}px; animation-duration: ${dur}s; animation-delay: -${del}s;">❄</div>`;
            }

            html += `<div class="vcv-card-v2 ranking-frozen-bg" style="margin-bottom: 20px; margin-top: 0px; padding-bottom: 16px; overflow:hidden;">
                        ${snowHtml}
                        <div style="padding: 16px 16px 0 16px; position:relative; z-index:2;">`;
        } else {
            html += `<div class="vcv-card-v2" style="margin-bottom: 20px; margin-top: 0px; padding-bottom: 16px;">`;
            html += `<div style="padding: 16px 16px 0 16px;">`;
        }
        
        // Cabecera y Jornada
        html += `<div class="card-title-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h2 style="font-size: 1.15rem; font-weight: 800; margin:0; color:var(--text-main); display:flex; align-items:center; gap:6px;">Clasificación de Ligas <svg onclick="document.getElementById('ayudaRankingModal').style.display='flex'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted); cursor:pointer;"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></h2>
                    <span style="font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase; letter-spacing: 0.4px; background: rgba(106, 44, 112, 0.4); color: #e2a6ea; border: 1px solid rgba(144, 60, 152, 0.6);">Jornada ${maxJornada}</span>
                 </div>`;

        if (isLigaFrozen) {
            let unfreezeDate = new Date(data.unfreeze_time);
            
            // Format time remaining
            let now = new Date();
            let diffMs = unfreezeDate - now;
            let msg = '';
            if (diffMs > 0) {
                let diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                let diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                msg = `Faltan ${diffHrs}h ${diffMins}m`;
            } else {
                msg = 'Actualizando pronto...';
            }

            html += `<div style="background: rgba(52, 152, 219, 0.1); border: 1px solid rgba(52, 152, 219, 0.3); border-radius: 8px; padding: 10px; margin-bottom: 15px; display: flex; align-items: flex-start; gap: 8px;">
                <div style="flex: 1;">
                    <strong style="color: #3498db; font-size: 0.85rem; display: block; margin-bottom: 2px;">Ranking Congelado ❄️</strong>
                    <p style="color: var(--text-muted); font-size: 0.75rem; margin: 0 0 8px 0; line-height: 1.3;">Los resultados de este fin de semana están ocultos temporalmente en el ranking. ¡Se sumarán todos de golpe el lunes a las 18:00!</p>
                    <div style="display: inline-block; background: #3498db; color: #fff; font-size: 0.75rem; font-weight: 900; padding: 4px 10px; border-radius: 6px; white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">${msg}</div>
                </div>
            </div>`;
        }


        // Botones de Liga SIN EMOJI
        html += `<div id="league-slider-container" style="display: flex; gap: 8px; overflow-x: auto; margin-bottom: 12px; padding-bottom: 4px; scrollbar-width: none;">`;
        data.ligas.forEach(l => {
            let activeClass = l === ligaName ? 'active' : '';
            html += `<button class="cat-filter-btn ${activeClass}" onclick="cambiarLiga('${l}')">Liga ${l}</button>`;
        });
        html += `</div>`;
        
        let equiposQuePuntuan = [];
        if (data.ligas_equipos) {
            let rowLiga = data.ligas_equipos.find(r => r.Liga === ligaName);
            if (rowLiga) {
                for (let k in rowLiga) {
                    if (k !== 'Liga' && rowLiga[k] && rowLiga[k].toString().toUpperCase() === 'X') {
                        equiposQuePuntuan.push(k);
                    }
                }
            }
        }
        let textoEquipos = equiposQuePuntuan.length > 0 ? "Aquí puntúan: " + equiposQuePuntuan.join(", ") : "Esta clasificación no tiene equipos asignados.";
        html += `<div style="text-align:center; font-size: 0.75rem; color: var(--text-muted); margin-top: 5px; margin-bottom: 20px; font-style: italic;">${textoEquipos}</div>`;

        // PODIUM
        if (ranking.length > 0) {
            html += `<div class="podium-container">`;
            const renderSlot = (rankIndex, slotClass) => {
                if(rankIndex >= ranking.length) return `<div class="podium-slot ${slotClass}"></div>`;
                let r = ranking[rankIndex];
                let uBadges = window.appData && window.appData.insignias ? (window.appData.insignias[r.jugador] || []) : [];
                let avatarBadge = uBadges.find(b => b.type === 'avatar');
                let customBadge = uBadges.find(b => b.type === 'custom');
                let initials = r.jugador.substring(0,2).toUpperCase();
                
                let isAvatarCustom = false;
                if (avatarBadge && avatarBadge.emoji) {
                    let icon = sanitizeImgUrl(avatarBadge.emoji.trim());
                    if (icon.toLowerCase().endsWith('.png') || icon.toLowerCase().endsWith('.jpg') || icon.toLowerCase().endsWith('.jpeg') || icon.toLowerCase().endsWith('.svg') || icon.toLowerCase().endsWith('.gif') || icon.startsWith('http')) {
                        initials = `<img loading="lazy" src="${icon}" style="width:100%; height:100%; object-fit:cover; border-radius:14px;">`;
                    } else {
                        initials = `<span style="font-size: 2.2rem; line-height:1; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${icon}</span>`;
                    }
                    isAvatarCustom = true;
                } else if (customBadge) {
                    let icon = sanitizeImgUrl((customBadge.emoji || '✨').trim());
                    if (icon.toLowerCase().endsWith('.png') || icon.toLowerCase().endsWith('.jpg') || icon.toLowerCase().endsWith('.jpeg') || icon.toLowerCase().endsWith('.svg') || icon.toLowerCase().endsWith('.gif') || icon.startsWith('http')) {
                        let src = icon.includes('/') || icon.startsWith('http') ? icon : 'files/images/' + icon;
                        initials = `<img loading="lazy" src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:14px;">`;
                    } else {
                        initials = `<span style="font-size: 2.2rem; line-height:1;">${icon}</span>`;
                    }
                    isAvatarCustom = true;
                }

                let isFirst = rankIndex === 0;
                let rankNum = r.realRank;
                
                let avatarContent = isFirst ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown crown-icon" style="width: 22px; height: 22px;"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path><path d="M5 21h14"></path></svg>${initials}` : initials;
                let textColor = isFirst ? 'var(--secondary-color)' : (rankIndex === 1 ? '#ced6e0' : '#e58e26');
                
                let customStyle = isAvatarCustom ? 'background: transparent; border: none; box-shadow: none;' : '';

                return `
                <div class="podium-slot ${slotClass}">
                    <div class="podium-avatar" style="${customStyle}">${avatarContent}</div>
                    <div class="podium-bar">
                        <div style="display:flex; align-items:center; margin-bottom: 2px;">
                            <span style="font-weight: ${isFirst ? '900' : '800'}; font-size: ${isFirst ? '1rem' : '0.9rem'}; color: ${textColor};">${rankNum}º</span>
                        </div>
                        <span class="player-handle" style="cursor:pointer; font-size:0.75rem; word-break:break-all; max-width:100%; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; white-space:normal; line-height:1.1;" onclick="openPlayerInfo('${r.jugador}', '${ligaName}')">@${r.jugador}</span>
                        <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                            ${getTrendHtml(r.jugador, rankIndex)}
                            <span class="player-pts" style="margin-top:0;">${r.puntos} pts</span>
                        </div>
                    </div>
                </div>`;
            };
            html += renderSlot(1, 'rank-2');
            html += renderSlot(0, 'rank-1');
            html += renderSlot(2, 'rank-3');
            html += `</div>`;
        }
        html += `</div></div>`; // Cierra CAJA 1

        // ---------- CAJA 2: MI POSICION (Current user) SEPARADA ----------
        let myIndex = ranking.findIndex(r => r.jugador === (data.usuario || loggedUser));
        if (myIndex !== -1) {
            let r = ranking[myIndex];
            let pos = r.realRank;

            let pendingHtml = '';
            if (isLigaFrozen && r.puntos_pendientes > 0) {
                pendingHtml = `<span style="color: #e67e22; font-size: 0.95rem; margin-left: 6px; text-shadow:none;">+${r.puntos_pendientes} 🔥</span>`;
            }

            let c2_class = isLigaFrozen ? "vcv-card-v2 ranking-frozen-bg" : "vcv-card-v2";
            let c2_bg = isLigaFrozen ? "" : "background: rgba(106, 44, 112, 0.4);";
            let c2_snow = '';
            if (isLigaFrozen) {
                for(let i=0; i<10; i++) {
                    let left = Math.random() * 95;
                    let dur = 3 + Math.random() * 7;
                    let del = Math.random() * 5;
                    let size = 8 + Math.random() * 12;
                    c2_snow += `<div class="snow-flake" style="left: ${left}%; font-size: ${size}px; animation-duration: ${dur}s; animation-delay: -${del}s;">❄</div>`;
                }
            }

            html += `
            <div class="${c2_class}" style="${c2_bg} border-color: var(--secondary-color); margin-bottom: 20px; padding:16px; position:relative; overflow:hidden;">
                ${c2_snow}
                <div style="display: flex; justify-content: space-between; align-items: center; position:relative; z-index:2;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isLigaFrozen ? '#3498db' : 'var(--secondary-color)'}; color: #140818; display: flex; flex-direction:column; align-items: center; justify-content: center;">
                        <span style="font-weight: 900;">${pos}º</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="font-weight: 800; font-size: 0.95rem; margin-top:2px;">@${r.jugador} <span class="role-badge" style="background: var(--secondary-color); color: #140818; border:none; margin-left: 4px;">TÚ</span></div>
                    </div>
                </div>
                <div style="text-align: right; display:flex; align-items:center; gap:8px;">
                    ${getTrendHtml(r.jugador, myIndex)}
                    <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.2rem; font-weight: 800; color: var(--secondary-color); margin-top:2px;">${r.puntos} pts${pendingHtml}</div>
                </div>
                </div>
            </div>`;
        }

        // ---------- CAJA 3: TABLA COMPLETA ----------
        if (ranking.length > 3) {
            let c3_class = isLigaFrozen ? "vcv-card-v2 ranking-table-card ranking-frozen-bg" : "vcv-card-v2 ranking-table-card";
            let c3_snow = '';
            if (isLigaFrozen) {
                for(let i=0; i<30; i++) {
                    let left = Math.random() * 95;
                    let dur = 8 + Math.random() * 10;
                    let del = Math.random() * 5;
                    let size = 8 + Math.random() * 12;
                    c3_snow += `<div class="snow-flake" style="left: ${left}%; font-size: ${size}px; animation-duration: ${dur}s; animation-delay: -${del}s;">❄</div>`;
                }
            }

            html += `
            <div class="${c3_class}" style="margin-bottom: 20px; padding: 0; position:relative; overflow:hidden;">
                ${c3_snow}
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 0.85rem; color: var(--text-muted); display: flex; justify-content: space-between; position:relative; z-index:2; background: inherit;">
                <span>TABLA COMPLETA (${totalJugadores} JUGADORES)</span>
                <span>PUNTOS</span>
                </div>
                <div id="ranking-list-body" style="position:relative; z-index:2;">`;
            
            for(let i=3; i<ranking.length; i++) {
                let r = ranking[i];
                let isMe = r.jugador === (data.usuario || loggedUser);
                let meClass = isMe ? 'is-current-user' : '';
                let badges = buildBadgesInline(r.jugador); 
                // ROLE BADGE ELIMINADO AQUI COMO PIDIÓ EL USUARIO

                html += `
                <div class="ranking-list-item ${meClass}" style="cursor:pointer;" onclick="openPlayerInfo('${r.jugador}', '${ligaName}')">
                    <div class="rank-left">
                        <div style="display:flex; flex-direction:column; align-items:center; min-width:24px;">
                            <span class="rank-num" style="margin:0;">${r.realRank}</span>
                        </div>
                        <div class="rank-user-info" style="margin-left:12px;">
                            <div class="name">@${r.jugador} ${badges}</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        ${getTrendHtml(r.jugador, i)}
                        <span class="rank-pts">${r.puntos}</span>
                    </div>
                </div>`;
            }
            html += `</div></div>`; // Cierra CAJA 3
        }

        container.innerHTML = html;
        let newSlider = document.getElementById('league-slider-container');
        if (newSlider) {
            newSlider.scrollLeft = savedScroll;
        }
        if(window.lucide) setTimeout(() => window.lucide.createIcons(), 10);
    };
window.updateProgressBar = function() {
        if(!window.appData) return;
        let totalOpen = 0;
        let predictedOpen = 0;
        if(window.appData.equipos) {
            window.appData.equipos.forEach(eq => {
                if(eq.estado === "ABIERTO" && eq.visibilidad === "MOSTRAR" && eq.permitido) {
                    totalOpen++;
                    let savedVal = (window.appData.predicciones_usuario && window.appData.predicciones_usuario[eq.id_partido]) ? window.appData.predicciones_usuario[eq.id_partido] : null;
                    let hasSaved = (savedVal && savedVal.sets);
                    
                    let elSet = document.getElementById(`e${eq.id_partido}_sets`);
                    let hasInput = elSet && elSet.value.trim() !== "";
                    
                    if(hasSaved || hasInput) predictedOpen++;
                }
            });
        }
        let porcentaje = totalOpen > 0 ? Math.round((predictedOpen / totalOpen) * 100) : 100;
        let bar = document.getElementById('user-progress-bar');
        let lbl = document.getElementById('user-progress-label');
        if(bar) bar.style.width = porcentaje + '%';
        if(lbl) lbl.innerText = porcentaje + '% Listo';
    };
    
    // Alias for the scattered calls
    function updateProgressBar() {
        window.updateProgressBar();
    }
    
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
                wrapper.style.display = 'none';
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
            wrapper.style.display = 'flex';

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

        


// ---------------------------------------------------
// LOGICA DE CALENDARIO
// ---------------------------------------------------



// LOGICA DE INSIGNIAS
function loadInsigniasUI() {
    if(!window.appData) return;
    
    // Mostrar solo los equipos a los que el usuario tiene permiso para apostar
    let teamsArray = window.appData.mis_equipos_siguiendo || [];

    let catMap = {};
    if (window.appData && window.appData.todos_partidos) {
        window.appData.todos_partidos.forEach(p => {
            if (p.equipo_local && p.categoria) catMap[p.equipo_local] = p.categoria;
            if (p.rival && p.categoria) catMap[p.rival] = p.categoria;
        });
    }

    let chkHtmlJug = '';
    let chkHtmlEnt = '';
    teamsArray.forEach(t => {
        let cat = catMap[t];
        let displayStr = cat ? `${t} - ${cat}` : t;
        chkHtmlJug += `<label style="display:block; font-size:0.85rem; color:var(--text-main); padding: 4px 0;"><input type="checkbox" value="${displayStr}" class="chk-jugador" style="margin-right:6px;"> ${displayStr}</label>`;
        chkHtmlEnt += `<label style="display:block; font-size:0.85rem; color:var(--text-main); padding: 4px 0;"><input type="checkbox" value="${displayStr}" class="chk-entrenador" style="margin-right:6px;"> ${displayStr}</label>`;
    });

    const divJug = document.getElementById('insJugadorList');
    const divEnt = document.getElementById('insEntrenadorList');
    if(divJug) divJug.innerHTML = chkHtmlJug;
    if(divEnt) divEnt.innerHTML = chkHtmlEnt;

    // Load current values
    let raw = window.appData.mi_insignia_raw;
    if(raw) {
        if(raw["Genero"] === "F") { document.querySelector('input[name="ins_genero"][value="F"]').checked = true; }
        
        let rawJugador = raw["Jugador de"] || "";
        let rawEntrenador = raw["Entrenador de"] || "";
        
        teamsArray.forEach(t => {
            let cat = catMap[t];
            if (cat) {
                rawJugador = rawJugador.replace(`${t}, ${cat}`, `${t} - ${cat}`);
                rawEntrenador = rawEntrenador.replace(`${t}, ${cat}`, `${t} - ${cat}`);
            }
        });

        let jTeams = rawJugador ? rawJugador.split(',').map(s => s.trim()) : [];
        let jExternos = [];
        let validJ = [];
        document.querySelectorAll('.chk-jugador').forEach(chk => {
            validJ.push(chk.value);
            if(jTeams.includes(chk.value)) chk.checked = true;
        });
        jTeams.forEach(t => { if(!validJ.includes(t) && t !== "") jExternos.push(t); });
        document.getElementById('insOtroJugador').value = jExternos.join(', ');

        let eTeams = rawEntrenador ? rawEntrenador.split(',').map(s => s.trim()) : [];
        let eExternos = [];
        let validE = [];
        document.querySelectorAll('.chk-entrenador').forEach(chk => {
            validE.push(chk.value);
            if(eTeams.includes(chk.value)) chk.checked = true;
        });
        eTeams.forEach(t => { if(!validE.includes(t) && t !== "") eExternos.push(t); });
        document.getElementById('insOtroEntrenador').value = eExternos.join(', ');

        document.getElementById('insExjugador').checked = (raw["Exjugador"] === "X");
        document.getElementById('insStaff').value = raw["Directiva / Staff"] || '';

          if(document.getElementById('insLesionado')) {
              document.getElementById('insLesionado').checked = (raw["Lesionado"] === "X");
              if(raw["Lesionado"] === "X") document.getElementById('insLesionadoDesc').style.display = 'block';
              document.getElementById('insLesionadoDesc').value = raw["Lesion_Desc"] || '';
              
              document.getElementById('insCustom').checked = (raw["Custom_Badge"] === "X");
              if(raw["Custom_Badge"] === "X") {
                  document.getElementById('insCustomContainer').style.display = 'block';
                  if(document.getElementById('btnDeleteCustom')) document.getElementById('btnDeleteCustom').style.display = 'block';
              } else {
                  if(document.getElementById('btnDeleteCustom')) document.getElementById('btnDeleteCustom').style.display = 'none';
              }
              document.getElementById('insCustomEmoji').value = raw["Custom_Emoji"] || '';
              document.getElementById('insCustomDesc').value = raw["Custom_Desc"] || '';

              
              
              if(document.getElementById('insAvatar')) {
                  document.getElementById('insAvatar').checked = (raw["Avatar"] === "X");
                  if(raw["Avatar"] === "X") {
                      document.getElementById('insAvatarContainer').style.display = 'block';
                      if(document.getElementById('btnDeleteAvatar')) document.getElementById('btnDeleteAvatar').style.display = 'block';
                  } else {
                      if(document.getElementById('btnDeleteAvatar')) document.getElementById('btnDeleteAvatar').style.display = 'none';
                  }
                  document.getElementById('insAvatarUrl').value = raw["Avatar_Url"] || '';
              }

          }

    }
}

document.getElementById('btnRequestInsignias').addEventListener('click', function() {
    let btn = this;
    let msgBox = document.getElementById('msgRequestInsignias');
    
    let lastReq = localStorage.getItem('lastBadgeRequestTime');
    let now = Date.now();
    if (lastReq && (now - parseInt(lastReq)) < 60000) {
        let remaining = Math.ceil((60000 - (now - parseInt(lastReq))) / 1000);
        msgBox.style.display = "block";
        msgBox.className = "alert-box alert-error";
        msgBox.style.background = "#ffcccb";
        msgBox.style.color = "#c0392b";
        msgBox.innerText = `Por favor, espera ${remaining} segundos antes de enviar otra petición.`;
        return;
    }
    
    let gen = document.querySelector('input[name="ins_genero"]:checked').value;
    
    let jChecked = Array.from(document.querySelectorAll('.chk-jugador:checked')).map(c => c.value);
    let jOtro = document.getElementById('insOtroJugador').value.trim();
    if(jOtro) jChecked.push(jOtro);
    let finalJugadorDe = jChecked.join(', ');

    let eChecked = Array.from(document.querySelectorAll('.chk-entrenador:checked')).map(c => c.value);
    let eOtro = document.getElementById('insOtroEntrenador').value.trim();
    if(eOtro) eChecked.push(eOtro);
    let finalEntrenadorDe = eChecked.join(', ');

    let exj = document.getElementById('insExjugador').checked;
    let stf = document.getElementById('insStaff').value.trim();

      let les = document.getElementById('insLesionado').checked;
      let lesDesc = document.getElementById('insLesionadoDesc').value.trim();
      let custom = document.getElementById('insCustom').checked;
      let customEmoji = sanitizeImgUrl(document.getElementById('insCustomEmoji').value.trim());
      let customDesc = document.getElementById('insCustomDesc').value.trim();
      let avatar = document.getElementById('insAvatar') ? document.getElementById('insAvatar').checked : false;
      let avatarUrl = document.getElementById('insAvatarUrl') ? sanitizeImgUrl(document.getElementById('insAvatarUrl').value.trim()) : '';


    let payload = {
        genero: gen,
        jugador_de: finalJugadorDe,
        entrenador_de: finalEntrenadorDe,
        exjugador: exj ? 'X' : '',
        staff: stf,
        lesionado: les ? 'X' : '',
        lesionado_desc: lesDesc,
        custom: custom ? 'X' : '',
        custom_emoji: customEmoji,
        custom_desc: customDesc,
        avatar: avatar ? 'X' : '',
        avatar_url: avatarUrl
    };

    btn.disabled = true; msgBox.style.display = "none";
    localStorage.setItem('lastBadgeRequestTime', Date.now().toString());
    fetchSeguro(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'request_badge_update', usuario: currentUser, password: currentPassword, payload: JSON.stringify(payload) }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    }).then(res => res.json()).then(data => {
        msgBox.style.display = "block";
        if(data.status === "success") {
            msgBox.className = "alert-box alert-success"; msgBox.innerText = "¡Petición enviada! Un administrador revisará y aprobará tus nuevas insignias pronto.";
        } else {
            msgBox.className = "alert-box alert-danger"; msgBox.innerText = data.message;
        }
    }).catch(err => { msgBox.className = "alert-box alert-danger"; msgBox.innerText = "Error: " + err.message; msgBox.style.display = "block"; })
    .finally(() => { btn.disabled = false; });
});

