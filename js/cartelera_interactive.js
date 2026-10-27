// ==================================================================
// CARTELERA V2 INTERACTIVA, PRONÓSTICOS Y MODALES
// ==================================================================


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
        if (typeof window.ocultarOverlayAutoLogin === 'function') window.ocultarOverlayAutoLogin();
        // Hide all sections in appSection
        const sections = ['carteleraSection', 'clasificacionesSection', 'historialSection', 'calendarioSection', 'enlacesRfevbSection', 'prediccionesTotalesSection', 'guestInfoSection', 'patrosGuestSection'];
        sections.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.remove('active-tab');
        });
        
        // Show target section
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.add('active-tab');
        }
        window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 10);
        
        // If cartelera, also show prediccionesTotalesSection right below it (only for normal registered users, never for guest)
        if (sectionId === 'carteleraSection' && !window.isGuestMode) {
            const extra = document.getElementById('prediccionesTotalesSection');
            if (extra && extra.style.display !== 'none') extra.classList.add('active-tab');
        }

        // Update active button state
        document.querySelectorAll('.nav-item-v2').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        if (sectionId === 'enlacesRfevbSection' && typeof window.renderMyProfileCard === 'function') {
            window.renderMyProfileCard();
        }
        
        if (window.lucide) setTimeout(() => lucide.createIcons(), 30);
        if (typeof window.updateAllBadgeScrollFades === 'function') setTimeout(window.updateAllBadgeScrollFades, 40);
        if (typeof window.observeBadgeScrollContainers === 'function') setTimeout(window.observeBadgeScrollContainers, 40);
        window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 10);
    }
    window.switchTabV2 = switchTabV2;

    // --- PULL TO REFRESH ENGINE (DESACTIVADO) ---
    window.recargarDatosAppSilencioso = async function() {
        if (!currentUser || !currentPassword) return;
        try {
            const res = await fetchSeguro(scriptURL, {
                method: 'POST',
                body: JSON.stringify({ action: 'login', usuario: currentUser, password: currentPassword }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const data = await res.json();
            if (data && data.status === 'success') {
                if (typeof window.aplicarHorasMvpLocales === 'function') window.aplicarHorasMvpLocales(data);
                window.appData = data;
                if (Array.isArray(data.plantilla_superliga) && data.plantilla_superliga.length > 0) {
                    try { localStorage.setItem('vcv_plantilla_superliga_cache', JSON.stringify(data.plantilla_superliga)); } catch(e) {}
                }
                if (typeof window.renderCarteleraHTML === 'function') window.renderCarteleraHTML(data);
                if (typeof window.initCalendar === 'function') window.initCalendar();
                if (typeof window.renderHistorialV2 === 'function') window.renderHistorialV2(data);
                if (typeof window.renderRankingV2 === 'function') window.renderRankingV2();
                if (typeof window.updateHeaderStats === 'function') window.updateHeaderStats();
                if (typeof window.renderMyProfileCard === 'function') window.renderMyProfileCard();
                if (typeof mostrarToast === 'function') mostrarToast('✓ Datos actualizados', 1800);
            }
        } catch(e) {
            console.error("Error al recargar silenciosamente:", e);
        }
    };

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

                    // Micro-animación: Destello dorado y confeti
                    card.classList.add('save-success-glow');
                    setTimeout(() => card.classList.remove('save-success-glow'), 1200);
                    if (typeof confetti === 'function') {
                        confetti({
                            particleCount: 45,
                            spread: 60,
                            origin: { y: 0.75 },
                            colors: ['#d4af37', '#7b3382', '#ffffff', '#f3ce5e']
                        });
                    }
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
    
    // --- VOTACIÓN MVP SUPERLIGA CON ATENUACIÓN Y CENTRADO SUAVE ---
    window.parseCandInfo = function(candStr) {
        if (!candStr) return { dorsal: null, nombre: '', apodo: 'Jugador', posicion: '', photoSrc: 'files/images/jugadores/dorsal_0.png', initials: 'VC', raw: '' };
        
        let dorsal = null;
        let nombre = '';
        let apodo = '';
        let posicion = '';
        
        let s = String(candStr).trim();
        let dorMatch = s.match(/#(\d+)/);
        if (dorMatch) dorsal = parseInt(dorMatch[1]);
        
        let posMatch = s.match(/\[([^\]]+)\]/);
        if (posMatch) posicion = posMatch[1].trim();

        let apMatch = s.match(/\(([^)]+)\)/);
        if (apMatch) apodo = apMatch[1].trim();
        
        let cleaned = s.replace(/#\d+\s*/, '').replace(/\s*\([^)]+\)/, '').replace(/\s*\[[^\]]+\]/, '').trim();
        if (cleaned) nombre = cleaned;
        
        // Consultar la plantilla oficial para enriquecer datos del dorsal exacto
        let plantilla = (typeof window.getPlantillaSuperligaActual === 'function') ? window.getPlantillaSuperligaActual() : ((window.appData && window.appData.plantilla_superliga) || []);
        if (dorsal && Array.isArray(plantilla) && plantilla.length > 0) {
            let found = plantilla.find(p => parseInt(p.dorsal) === dorsal);
            if (found) {
                if (found.nombre) nombre = found.nombre;
                if (found.apodo) apodo = found.apodo;
                if (found.posicion) posicion = found.posicion;
            }
        } else if (!dorsal && Array.isArray(plantilla) && plantilla.length > 0) {
            let normS = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let found = plantilla.find(p => {
                let pAp = (p.apodo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                let pNom = (p.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return (pAp && (normS.includes(pAp) || pAp.includes(normS))) ||
                       (pNom && (normS.includes(pNom) || pNom.includes(normS))) ||
                       (normS.includes('novella') && parseInt(p.dorsal) === 7) ||
                       (normS.includes('fabian') && parseInt(p.dorsal) === 21);
            });
            if (found) {
                dorsal = parseInt(found.dorsal);
                if (found.nombre) nombre = found.nombre;
                if (found.apodo) apodo = found.apodo;
                if (found.posicion) posicion = found.posicion;
            }
        }
        
        if (!apodo) apodo = (nombre ? nombre.split(' ')[0] : 'Jugador');
        if (!nombre) nombre = apodo;
        
        let dorKey = dorsal || 0;
        let photoSrc = (typeof window.getJugadorPhotoUrl === 'function') ? window.getJugadorPhotoUrl(dorKey) : `files/images/jugadores/dorsal_${dorKey}.png`;
        let initials = apodo.substring(0, 2).toUpperCase();

        return { dorsal, nombre, apodo, posicion, photoSrc, initials, raw: candStr };
    };

    window.renderMvpWidgetContent = function(idPart, cands, myVote) {
        if (!Array.isArray(cands) || cands.length < 2 || cands.length > 3) return '';
        
        let votedIdx = -1;
        if (myVote) {
            let voteInfo = window.parseCandInfo(myVote);
            votedIdx = cands.findIndex((c, i) => {
                let cInfo = window.parseCandInfo(c);
                if (c === myVote) return true;
                if (voteInfo.dorsal && cInfo.dorsal && voteInfo.dorsal === cInfo.dorsal) return true;
                if (voteInfo.apodo && cInfo.apodo && voteInfo.apodo.toLowerCase() === cInfo.apodo.toLowerCase()) return true;
                return false;
            });
            if (votedIdx < 0 && cands.length > 0) votedIdx = 0;
        }

        let isVoted = (votedIdx >= 0);
        let votedCand = isVoted ? cands[votedIdx] : null;
        let votedInfo = votedCand ? window.parseCandInfo(votedCand) : null;

        let slotsHtml = cands.map((cand, idx) => {
            let info = window.parseCandInfo(cand);
            let displayPos = (info.posicion && info.posicion.toLowerCase() !== 'jugador') ? info.posicion : '';
            let isThisVoted = (idx === votedIdx);
            
            let cardStateClass = '';
            
            if (isVoted) {
                if (isThisVoted) {
                    cardStateClass = 'is-voted-state';
                } else {
                    cardStateClass = 'is-dimmed-state';
                }
            }

            return `
            <div class="mvp-card-slot" id="mvp-slot-${idPart}-${idx}" data-idx="${idx}" style="${cands.length === 2 ? 'max-width: 220px;' : ''}">
                <div class="mvp-card-btn ${cardStateClass}" id="mvp-cand-${idPart}-${idx}" onclick="votarMvpPartido('${idPart}', '${cand.replace(/'/g, "\\'")}', ${idx}, '${encodeURIComponent(JSON.stringify(cands))}')" title="${isThisVoted ? 'Jugador votado' : 'Votar a ' + info.apodo}">
                    <div class="mvp-photo-wrapper">
                        <img src="files/images/valcyl_logo.png" alt="VALCYL" class="mvp-valcyl-watermark">
                        <img loading="lazy" src="${info.photoSrc}" alt="${info.apodo}" class="mvp-photo-img" onerror="window.handleJugadorImgError(this, ${info.dorsal || 0}, '${info.initials}');">
                        ${info.dorsal ? `<span class="mvp-dorsal-tag">#${info.dorsal}</span>` : ''}
                    </div>
                    <div class="mvp-name-label" title="${info.nombre || info.apodo}">${info.apodo}</div>
                    ${info.nombre && info.nombre.toLowerCase() !== info.apodo.toLowerCase() ? `<div style="font-size:0.67rem; color:var(--text-muted); text-align:center; line-height:1.2; word-break:normal; overflow-wrap:normal; width:100%; box-sizing:border-box; padding:0 8px; font-weight:600;">${info.nombre}</div>` : ''}
                    ${displayPos ? `<div class="mvp-sub-label">${displayPos}</div>` : ''}
                    ${isThisVoted ? '<span class="mvp-voted-badge">TU MVP VALCYL</span>' : ''}
                </div>
            </div>`;
        }).join('');

        let headerText = isVoted ? '✨ Tu Voto para el MVP VALCYL' : '⭐ Elige al MVP VALCYL del Partido';

        let bottomPanelHtml = `
        <div class="mvp-bottom-confirmation-panel ${isVoted ? 'is-visible' : ''}" id="mvp-panel-${idPart}">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                <div style="font-size: 1.3rem; flex-shrink: 0;">🏆</div>
                <div style="min-width: 0; flex: 1;">
                    <div style="font-size: 0.68rem; font-weight: 800; color: var(--secondary-color); text-transform: uppercase; letter-spacing: 0.5px;">
                        HAS VOTADO POR (MVP VALCYL)
                    </div>
                    <div id="mvp-panel-text-${idPart}" style="font-size: 0.88rem; font-weight: 800; color: #fff; line-height: 1.25; word-break: break-word;">
                        ${votedInfo ? `${votedInfo.dorsal ? '#' + votedInfo.dorsal + ' ' : ''}${votedInfo.apodo && votedInfo.nombre && votedInfo.apodo.toLowerCase() !== votedInfo.nombre.toLowerCase() ? `${votedInfo.apodo} - ${votedInfo.nombre}` : (votedInfo.nombre || votedInfo.apodo)} ${votedInfo.posicion ? `(${votedInfo.posicion})` : ''}` : ''}
                    </div>
                </div>
            </div>
        </div>`;

        return `
        <div style="background: linear-gradient(180deg, rgba(37, 11, 54, 0.45) 0%, rgba(20, 6, 30, 0.6) 100%); border: 1.5px solid rgba(212, 175, 55, 0.35); border-radius: 14px; padding: 12px 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); position:relative;">
            <div style="font-size:0.75rem; font-weight:900; color:var(--secondary-color); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:12px; display:flex; align-items:center; justify-content:center; gap:6px;">
                <span id="mvp-header-${idPart}">${headerText}</span>
                <button type="button" onclick="window.mostrarInfoBonusMvp(event)" title="Información sobre la bonificación de puntos por MVP y elección" style="background: rgba(212,175,55,0.18); border: 1px solid var(--secondary-color); color: var(--secondary-color); width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 900; cursor: pointer; padding: 0; line-height: 1;">
                    ?
                </button>
                <button type="button" onclick="window.abrirModalCompartirMVP('${idPart}')" title="Compartir MVP" style="background: rgba(212,175,55,0.18); border: 1px solid var(--secondary-color); color: var(--secondary-color); border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; margin-left: 2px; transition: all 0.2s ease;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                </button>
            </div>
            <div class="mvp-candidates-grid" id="mvp-grid-${idPart}" style="${cands.length === 2 ? 'justify-content: center; gap: 16px;' : ''}">
                ${slotsHtml}
            </div>
            ${bottomPanelHtml}
        </div>`;
    };

    window.mostrarInfoBonusMvp = function(e) {
        if (e) e.stopPropagation();
        const data = window.appData || {};
        let pctMvpVal = (data.reglas && data.reglas.pct_mvp !== undefined) ? data.reglas.pct_mvp : 10;
        const elMvpPctModal = document.getElementById('infoMvpBonusPct');
        if (elMvpPctModal) elMvpPctModal.innerText = `+${pctMvpVal}%`;
        const elMvpEjemploModal = document.getElementById('infoMvpBonusEjemplo');
        if (elMvpEjemploModal) {
            let bonusEj = Math.ceil(12 * (pctMvpVal / 100));
            elMvpEjemploModal.innerHTML = `El cálculo se redondea siempre hacia arriba. Por ejemplo, si logras 12 puntos y aciertas el MVP, ganas <b>+${bonusEj} pts extra</b> (total ${12 + bonusEj} pts).`;
        }
        const m = document.getElementById('infoMvpBonusModal');
        if (m) m.style.display = 'flex';
    };

    window.cambiarVotoMvp = function(idPart, candsEncoded, prevVoteEncoded) {
        let cands = [];
        try { cands = JSON.parse(decodeURIComponent(candsEncoded)); } catch(e) {}
        
        const widget = document.getElementById('mvp-widget-' + idPart);
        if (!widget) return;

        const allCards = widget.querySelectorAll('.mvp-card-btn');
        allCards.forEach(c => {
            c.classList.remove('is-dimmed-state');
            c.classList.remove('is-voted-state');
            const badge = c.querySelector('.mvp-voted-badge');
            if (badge) badge.remove();
        });

        const panel = document.getElementById(`mvp-panel-${idPart}`);
        if (panel) panel.classList.remove('is-visible');

        const header = document.getElementById(`mvp-header-${idPart}`);
        if (header) header.innerText = '⭐ Elige al MVP VALCYL del Partido';

        if (window.appData && window.appData.mvp_votos) {
            delete window.appData.mvp_votos[idPart];
        }
    };

    window._mvpVoteCooldowns = window._mvpVoteCooldowns || {};

    window.votarMvpPartido = function(idPart, jugador, selectedIdx, candsEncoded) {
        if(window.isGuestMode) { alert("Modo invitado. Inicia sesión para votar."); return; }
        if(!currentUser) { alert("Tu sesión ha expirado."); window.location.reload(); return; }
        if(!idPart || !jugador) return;

        // Si ya ha votado a este mismo jugador, no hacer nada
        if (window.appData && window.appData.mvp_votos && window.appData.mvp_votos[idPart] === jugador) {
            return;
        }

        // Cooldown de 5 segundos entre cambios de voto por partido para evitar spam
        const now = Date.now();
        const lastVoteTime = window._mvpVoteCooldowns[idPart] || 0;
        const cooldownRemaining = Math.ceil((5000 - (now - lastVoteTime)) / 1000);
        if (cooldownRemaining > 0) {
            if (typeof mostrarToast === 'function') {
                mostrarToast(`Espera ${cooldownRemaining}s para volver a cambiar tu voto`, 2500);
            }
            return;
        }
        window._mvpVoteCooldowns[idPart] = now;

        let cands = [];
        try { cands = JSON.parse(decodeURIComponent(candsEncoded)); } catch(e) {}

        const info = (typeof window.parseCandInfo === 'function') ? window.parseCandInfo(jugador) : { apodo: jugador };

        const widget = document.getElementById('mvp-widget-' + idPart);
        if (widget) {
            const allCards = widget.querySelectorAll('.mvp-card-btn');
            allCards.forEach((c, idx) => {
                let badge = c.querySelector('.mvp-voted-badge');
                if (idx !== selectedIdx) {
                    c.classList.remove('is-voted-state');
                    c.classList.add('is-dimmed-state');
                    if (badge) badge.remove();
                } else {
                    c.classList.remove('is-dimmed-state');
                    c.classList.add('is-voted-state');
                    if (!badge) {
                        const newBadge = document.createElement('span');
                        newBadge.className = 'mvp-voted-badge';
                        newBadge.innerText = 'TU MVP VALCYL';
                        c.appendChild(newBadge);
                    }
                }
            });
            
            const header = document.getElementById(`mvp-header-${idPart}`);
            if (header) header.innerText = '✨ Tu Voto para el MVP VALCYL';

            const panel = document.getElementById(`mvp-panel-${idPart}`);
            const panelText = document.getElementById(`mvp-panel-text-${idPart}`);
            if (panel && panelText) {
                panelText.innerText = `${info.dorsal ? '#' + info.dorsal + ' ' : ''}${info.apodo && info.nombre && info.apodo.toLowerCase() !== info.nombre.toLowerCase() ? `${info.apodo} - ${info.nombre}` : (info.nombre || info.apodo)} ${info.posicion ? `(${info.posicion})` : ''}`;
                panel.classList.add('is-visible');
            }
        }

        if(!window.appData) window.appData = {};
        if(!window.appData.mvp_votos) window.appData.mvp_votos = {};
        window.appData.mvp_votos[idPart] = jugador;

        fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'vote_mvp',
                usuario: currentUser,
                password: currentPassword,
                id_partido: idPart,
                jugador: jugador
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            if(data && data.status === 'success') {
                mostrarToast("¡Voto MVP registrado!");
            } else {
                mostrarToast("¡Voto MVP registrado (modo pruebas)!");
            }
        })
        .catch(err => {
            mostrarToast("¡Voto MVP registrado localmente (modo pruebas)!");
        });
    };

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
            let ptsGanador = 3, ptsSets = 5, ptsDiffExacta = 2, maxDistancia = 10, pctMvp = 10;
            if (data.reglas) {
                ptsGanador = data.reglas.ganador || ptsGanador;
                ptsSets = data.reglas.sets || ptsSets;
                ptsDiffExacta = data.reglas.diff_exacta || ptsDiffExacta;
                maxDistancia = data.reglas.max_dist || maxDistancia;
                if (data.reglas.pct_mvp !== undefined) pctMvp = data.reglas.pct_mvp;
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

                // Bonificación MVP (+pctMvp% redondeado hacia arriba si acertó el MVP oficial)
                let mvpBonusPts = 0;
                if (p.mvp_oficial && mPts > 0 && pctMvp > 0 && data.mvp_votos && data.mvp_votos[p.id_partido]) {
                    let uMvpVote = String(data.mvp_votos[p.id_partido]).trim().toLowerCase();
                    let mOficial = String(p.mvp_oficial).trim().toLowerCase();
                    let dorOf = (mOficial.match(/#(\d+)/) || [])[1];
                    let dorVo = (uMvpVote.match(/#(\d+)/) || [])[1];
                    let isMvpHit = false;
                    if (dorOf && dorVo && dorOf === dorVo) isMvpHit = true;
                    else if (mOficial === uMvpVote || mOficial.includes(uMvpVote) || uMvpVote.includes(mOficial)) isMvpHit = true;
                    if (isMvpHit) {
                        mvpBonusPts = Math.ceil(mPts * (pctMvp / 100));
                        mPts += mvpBonusPts;
                    }
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
                    dist: dist,
                    mvpBonusPts: mvpBonusPts,
                    uMvpVote: (data.mvp_votos && data.mvp_votos[p.id_partido]) ? String(data.mvp_votos[p.id_partido]) : null,
                    mvpOficial: p.mvp_oficial ? String(p.mvp_oficial) : null
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
                                    ${m.mvpBonusPts > 0 ? `<span style="font-size:0.62rem; background:rgba(212,175,55,0.22); color:var(--vcv-dorado); padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">⭐ MVP VALCYL +${m.mvpBonusPts}p</span>` : ''}
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
        let podioBadges = (typeof window.getPodioBadgesForUser === 'function')
            ? window.getPodioBadgesForUser(jugador, ligaName)
            : [];
        let allBadges = [...podioBadges, ...displayBadges];
        let badgesHtml = "";
        if(allBadges.length === 0) {
            badgesHtml = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 10px;">Sin insignias adicionales</div>`;
        } else {
            allBadges.forEach(b => {
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
            <div style="background:var(--bg-card); border-radius:16px; padding:24px 20px; box-shadow:0 8px 32px rgba(0,0,0,0.25); border: 1px solid var(--border-color); text-align: center; position: relative;">
                <button type="button" onclick="window.cerrarSesionApp()" title="Cerrar sesión" style="position: absolute; top: 14px; right: 14px; background: rgba(255, 71, 87, 0.12); border: 1px solid rgba(255, 71, 87, 0.35); color: #ff6b81; border-radius: 20px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 700; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" onmouseover="this.style.background='rgba(255, 71, 87, 0.25)';" onmouseout="this.style.background='rgba(255, 71, 87, 0.12)';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                    <span>Cerrar sesión</span>
                </button>
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

    
    // --- CALCULADOR DE INSIGNIAS TEMPORALES DE PODIO (ORO, PLATA, BRONCE), CUCHARA (🥄) Y DIANA (🎯) ---
// Pre-calculador optimizado con memoización en memoria del podio y dianas por liga
function getLeaguePodioCache(l, data) {
    if (!data) return null;
    if (!data._podioLeagueCache) data._podioLeagueCache = {};
    if (data._podioLeagueCache[l]) return data._podioLeagueCache[l];

    const rankingLiga = data.clasificaciones && data.clasificaciones[l];
    if (!rankingLiga || !Array.isArray(rankingLiga)) return null;

    const sorted = [...rankingLiga].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
    const active = sorted.filter(x => (x.puntos || 0) > 0);
    const userSummary = {};

    if (active.length > 0) {
        const topPts = active[0].puntos || 0;
        const tiedTop = active.filter(x => x.puntos === topPts).length > 1;
        active.filter(x => x.puntos === topPts).forEach(x => {
            if (!userSummary[x.jugador]) userSummary[x.jugador] = {};
            userSummary[x.jugador].oro = { pts: topPts, tied: tiedTop };
        });

        // 2º puesto
        const p2 = active.find(x => x.puntos < topPts);
        if (p2) {
            const pts2 = p2.puntos;
            const tied2 = active.filter(x => x.puntos === pts2).length > 1;
            active.filter(x => x.puntos === pts2).forEach(x => {
                if (!userSummary[x.jugador]) userSummary[x.jugador] = {};
                userSummary[x.jugador].plata = { pts: pts2, tied: tied2 };
            });

            // 3º puesto
            const p3 = active.find(x => x.puntos < pts2);
            if (p3) {
                const pts3 = p3.puntos;
                const tied3 = active.filter(x => x.puntos === pts3).length > 1;
                active.filter(x => x.puntos === pts3).forEach(x => {
                    if (!userSummary[x.jugador]) userSummary[x.jugador] = {};
                    userSummary[x.jugador].bronce = { pts: pts3, tied: tied3 };
                });
            }
        }

        // Cuchara de madera (mínimo 3 jugadores activos y puntuación inferior al líder)
        if (active.length >= 3) {
            const minPts = active[active.length - 1].puntos || 0;
            if (topPts > minPts) {
                const tiedLast = active.filter(x => x.puntos === minPts).length > 1;
                active.filter(x => x.puntos === minPts).forEach(x => {
                    if (!userSummary[x.jugador]) userSummary[x.jugador] = {};
                    userSummary[x.jugador].cuchara = { pts: minPts, tied: tiedLast };
                });
            }
        }
    }

    // Diana de jornada (estrictamente temporal: última jornada disputada por miembros de esta liga)
    if (data.stats_ligas) {
        const leagueUsers = new Set(rankingLiga.map(r => r.jugador));
        const jornadasSet = new Set();
        leagueUsers.forEach(u => {
            if (data.stats_ligas[u] && data.stats_ligas[u][l] && data.stats_ligas[u][l].porJornada) {
                Object.keys(data.stats_ligas[u][l].porJornada).forEach(j => {
                    const jNum = Number(j);
                    if (!isNaN(jNum)) jornadasSet.add(jNum);
                });
            }
        });

        const jornadasList = Array.from(jornadasSet).sort((a, b) => a - b);
        if (jornadasList.length > 0) {
            const lastJ = jornadasList[jornadasList.length - 1];
            let maxPtsInJ = 0;
            let winnersInJ = [];
            leagueUsers.forEach(u => {
                if (data.stats_ligas[u] && data.stats_ligas[u][l] && data.stats_ligas[u][l].porJornada) {
                    const ptsJ = data.stats_ligas[u][l].porJornada[lastJ] || 0;
                    if (ptsJ > maxPtsInJ) {
                        maxPtsInJ = ptsJ;
                        winnersInJ = [u];
                    } else if (ptsJ === maxPtsInJ && maxPtsInJ > 0) {
                        winnersInJ.push(u);
                    }
                }
            });

            if (maxPtsInJ > 0) {
                winnersInJ.forEach(w => {
                    if (!userSummary[w]) userSummary[w] = {};
                    userSummary[w].diana = { pts: maxPtsInJ, jornada: lastJ, tied: winnersInJ.length > 1 };
                });
            }
        }
    }

    data._podioLeagueCache[l] = userSummary;
    return userSummary;
}

window.getPodioBadgesForUser = function(targetUser, currentLigaContext = null) {
    if (!window.appData || !window.appData.clasificaciones || !targetUser) return [];
    const data = window.appData;
    let viewerUser = (data && data.usuario) || (typeof currentUser !== 'undefined' ? currentUser : '') || window.currentUser || '';
    if (!viewerUser) {
        try {
            const saved = localStorage.getItem('vcv_saved_user');
            if (saved) viewerUser = saved;
        } catch(e) {}
    }
    if (!viewerUser) viewerUser = 'Invitado';

    // Ligas a las que pertenece el visor (el usuario que está usando la app)
    const viewerLigas = new Set(data.ligas || []);
    if (data.clasificaciones) {
        for (const l in data.clasificaciones) {
            if (viewerUser && data.clasificaciones[l].some(r => r.jugador === viewerUser)) {
                viewerLigas.add(l);
            }
        }
    }
    // Si el usuario es invitado o sus ligas están vacías, permitir ver las clasificaciones globales y la activa
    if (viewerUser === 'Invitado' || viewerLigas.size === 0) {
        if (data.clasificaciones['Global']) viewerLigas.add('Global');
        if (data.clasificaciones['General']) viewerLigas.add('General');
        (data.ligas || []).forEach(l => viewerLigas.add(l));
        if (currentLigaContext && data.clasificaciones[currentLigaContext]) {
            viewerLigas.add(currentLigaContext);
        }
    }
    if (currentLigaContext && data.clasificaciones[currentLigaContext]) {
        if (currentLigaContext === 'Global' || currentLigaContext === 'General' || viewerUser === 'Invitado' || viewerLigas.has(currentLigaContext)) {
            viewerLigas.add(currentLigaContext);
        }
    }

    const ligasEvaluadas = [];
    if (currentLigaContext && viewerLigas.has(currentLigaContext)) {
        ligasEvaluadas.push(currentLigaContext);
    }
    viewerLigas.forEach(l => {
        if (!ligasEvaluadas.includes(l)) ligasEvaluadas.push(l);
    });

    const oroEntries = [];
    const plataEntries = [];
    const bronceEntries = [];
    const cucharaEntries = [];
    const dianaEntries = [];

    // Consulta O(1) ultra-rápida desde la memoria caché por liga
    ligasEvaluadas.forEach(l => {
        const leagueCache = getLeaguePodioCache(l, data);
        if (!leagueCache) return;
        const uSummary = leagueCache[targetUser];
        if (!uSummary) return;

        if (uSummary.oro) oroEntries.push({ liga: l, ...uSummary.oro });
        if (uSummary.plata) plataEntries.push({ liga: l, ...uSummary.plata });
        if (uSummary.bronce) bronceEntries.push({ liga: l, ...uSummary.bronce });
        if (uSummary.cuchara) cucharaEntries.push({ liga: l, ...uSummary.cuchara });
        if (uSummary.diana) dianaEntries.push({ liga: l, ...uSummary.diana });
    });

    const podioBadges = [];

    // --- AGRUPACIÓN ORO (🥇) ---
    if (oroEntries.length === 1) {
        const e = oroEntries[0];
        const tieSuffix = e.tied ? ' (Empate)' : '';
        const tieDesc = e.tied ? ' (compartido)' : '';
        podioBadges.push({
            type: 'podio_oro',
            subType: 'oro',
            pos: 1,
            liga: e.liga,
            emoji: '🥇',
            roleTitle: `1º Puesto - Oro${tieSuffix} - Liga ${e.liga}`,
            text: `Líder actual${tieDesc} de la Liga ${e.liga} (${e.pts} pts)`,
            title: `1º Puesto - Oro${tieSuffix} (${e.liga})`,
            desc: `Líder actual${tieDesc} de la Liga ${e.liga} con ${e.pts} pts`,
            border: 'rgba(255, 215, 0, 0.45)',
            bg: 'rgba(255, 215, 0, 0.1)',
            color: '#ffd700'
        });
    } else if (oroEntries.length > 1) {
        const leaguesListStr = oroEntries.map(e => `Liga ${e.liga}`).join(', ');
        podioBadges.push({
            type: 'podio_oro',
            subType: 'oro',
            pos: 1,
            emoji: '🥇',
            roleTitle: `1º Puesto - Oro (${oroEntries.length} ligas):`,
            text: `Líder actual en ${leaguesListStr}`,
            title: `1º Puesto - Oro (${oroEntries.length} ligas)`,
            desc: `Líder actual en ${leaguesListStr}`,
            items: oroEntries.map(e => `Liga ${e.liga} (${e.pts} pts${e.tied ? ' - Empate' : ''})`),
            border: 'rgba(255, 215, 0, 0.45)',
            bg: 'rgba(255, 215, 0, 0.1)',
            color: '#ffd700'
        });
    }

    // --- AGRUPACIÓN PLATA (🥈) ---
    if (plataEntries.length === 1) {
        const e = plataEntries[0];
        const tieSuffix = e.tied ? ' (Empate)' : '';
        const tieDesc = e.tied ? ' (compartido)' : '';
        podioBadges.push({
            type: 'podio_plata',
            subType: 'plata',
            pos: 2,
            liga: e.liga,
            emoji: '🥈',
            roleTitle: `2º Puesto - Plata${tieSuffix} - Liga ${e.liga}`,
            text: `2º clasificado${tieDesc} en Liga ${e.liga} (${e.pts} pts)`,
            title: `2º Puesto - Plata${tieSuffix} (${e.liga})`,
            desc: `2º clasificado${tieDesc} en Liga ${e.liga} con ${e.pts} pts`,
            border: 'rgba(206, 214, 224, 0.45)',
            bg: 'rgba(206, 214, 224, 0.1)',
            color: '#ced6e0'
        });
    } else if (plataEntries.length > 1) {
        const leaguesListStr = plataEntries.map(e => `Liga ${e.liga}`).join(', ');
        podioBadges.push({
            type: 'podio_plata',
            subType: 'plata',
            pos: 2,
            emoji: '🥈',
            roleTitle: `2º Puesto - Plata (${plataEntries.length} ligas):`,
            text: `2º clasificado en ${leaguesListStr}`,
            title: `2º Puesto - Plata (${plataEntries.length} ligas)`,
            desc: `2º clasificado en ${leaguesListStr}`,
            items: plataEntries.map(e => `Liga ${e.liga} (${e.pts} pts${e.tied ? ' - Empate' : ''})`),
            border: 'rgba(206, 214, 224, 0.45)',
            bg: 'rgba(206, 214, 224, 0.1)',
            color: '#ced6e0'
        });
    }

    // --- AGRUPACIÓN BRONCE (🥉) ---
    if (bronceEntries.length === 1) {
        const e = bronceEntries[0];
        const tieSuffix = e.tied ? ' (Empate)' : '';
        const tieDesc = e.tied ? ' (compartido)' : '';
        podioBadges.push({
            type: 'podio_bronce',
            subType: 'bronce',
            pos: 3,
            liga: e.liga,
            emoji: '🥉',
            roleTitle: `3º Puesto - Bronce${tieSuffix} - Liga ${e.liga}`,
            text: `3º clasificado${tieDesc} en Liga ${e.liga} (${e.pts} pts)`,
            title: `3º Puesto - Bronce${tieSuffix} (${e.liga})`,
            desc: `3º clasificado${tieDesc} en Liga ${e.liga} con ${e.pts} pts`,
            border: 'rgba(229, 142, 38, 0.45)',
            bg: 'rgba(229, 142, 38, 0.1)',
            color: '#e58e26'
        });
    } else if (bronceEntries.length > 1) {
        const leaguesListStr = bronceEntries.map(e => `Liga ${e.liga}`).join(', ');
        podioBadges.push({
            type: 'podio_bronce',
            subType: 'bronce',
            pos: 3,
            emoji: '🥉',
            roleTitle: `3º Puesto - Bronce (${bronceEntries.length} ligas):`,
            text: `3º clasificado en ${leaguesListStr}`,
            title: `3º Puesto - Bronce (${bronceEntries.length} ligas)`,
            desc: `3º clasificado en ${leaguesListStr}`,
            items: bronceEntries.map(e => `Liga ${e.liga} (${e.pts} pts${e.tied ? ' - Empate' : ''})`),
            border: 'rgba(229, 142, 38, 0.45)',
            bg: 'rgba(229, 142, 38, 0.1)',
            color: '#e58e26'
        });
    }

    // --- AGRUPACIÓN CUCHARA DE MADERA (🥄🪵) ---
    if (cucharaEntries.length === 1) {
        const e = cucharaEntries[0];
        const tieLastSuffix = e.tied ? ' (Empate)' : '';
        podioBadges.push({
            type: 'podio_cuchara',
            subType: 'cuchara',
            liga: e.liga,
            emoji: '🥄🪵',
            roleTitle: `Cuchara de Madera - Liga ${e.liga}`,
            text: `Cuchara de Madera - Liga ${e.liga} (${e.pts} pts${tieLastSuffix})`,
            title: `Cuchara de Madera - Liga ${e.liga} (${e.pts} pts)`,
            desc: `Cuchara de Madera en Liga ${e.liga} con ${e.pts} pts`,
            border: 'rgba(184, 115, 51, 0.5)',
            bg: 'rgba(184, 115, 51, 0.12)',
            color: '#d38c52'
        });
    } else if (cucharaEntries.length > 1) {
        const leaguesListStr = cucharaEntries.map(e => `Liga ${e.liga}`).join(', ');
        podioBadges.push({
            type: 'podio_cuchara',
            subType: 'cuchara',
            emoji: '🥄🪵',
            roleTitle: `Cuchara de Madera (${cucharaEntries.length} ligas):`,
            text: `Cuchara de Madera en ${leaguesListStr}`,
            title: `Cuchara de Madera (${cucharaEntries.length} ligas)`,
            desc: `Cuchara de Madera en ${leaguesListStr}`,
            items: cucharaEntries.map(e => `Liga ${e.liga} (${e.pts} pts${e.tied ? ' - Empate' : ''})`),
            border: 'rgba(184, 115, 51, 0.5)',
            bg: 'rgba(184, 115, 51, 0.12)',
            color: '#d38c52'
        });
    }

    // --- AGRUPACIÓN DIANA (🎯) - TEMPORAL JORNADA ANTERIOR ---
    if (dianaEntries.length === 1) {
        const e = dianaEntries[0];
        const tieSuffix = e.tied ? ' (Empate)' : '';
        podioBadges.push({
            type: 'podio_diana',
            subType: 'diana',
            liga: e.liga,
            emoji: '🎯',
            roleTitle: `Máxima Puntuación de Jornada - J${e.jornada} - Liga ${e.liga}`,
            text: `Top anotador de la J${e.jornada} en Liga ${e.liga} (${e.pts} pts${tieSuffix})`,
            title: `Máxima Puntuación J${e.jornada} (${e.liga})`,
            desc: `Top anotador de la J${e.jornada} en Liga ${e.liga} con ${e.pts} pts`,
            border: 'rgba(231, 76, 60, 0.45)',
            bg: 'rgba(231, 76, 60, 0.08)',
            color: '#e74c3c',
            isTemporal: true
        });
    } else if (dianaEntries.length > 1) {
        const leaguesListStr = dianaEntries.map(e => `Liga ${e.liga}`).join(', ');
        podioBadges.push({
            type: 'podio_diana',
            subType: 'diana',
            emoji: '🎯',
            roleTitle: `Máxima Puntuación de la Última Jornada (${dianaEntries.length} ligas):`,
            text: `Top anotador de la última jornada en ${leaguesListStr}`,
            title: `Máxima Puntuación Última Jornada (${dianaEntries.length} ligas)`,
            desc: `Top anotador de la última jornada en ${leaguesListStr}`,
            items: dianaEntries.map(e => `Liga ${e.liga}: J${e.jornada} (${e.pts} pts${e.tied ? ' - Empate' : ''})`),
            border: 'rgba(231, 76, 60, 0.45)',
            bg: 'rgba(231, 76, 60, 0.08)',
            color: '#e74c3c',
            isTemporal: true
        });
    }

    return podioBadges;
};window.closePlayerInfo = function() {
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

        let htmlStats = `

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
        let podioBadges = (typeof window.getPodioBadgesForUser === 'function')
            ? window.getPodioBadgesForUser(jugador, ligaName)
            : [];
        let allBadges = [...podioBadges, ...displayBadges];
        let badgesHtml = "";
        if(allBadges.length === 0) {
            badgesHtml = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 10px;">Sin insignias adicionales</div>`;
        } else {
            allBadges.forEach(b => {
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
            let podioBadges = (typeof window.getPodioBadgesForUser === 'function')
                ? window.getPodioBadgesForUser(jugador, ligaName)
                : [];
            let allBadges = [...podioBadges, ...displayBadges];
            if(allBadges.length === 0) return "";
            let html = "";
            allBadges.forEach(b => {
                let tooltipText = (b.items && b.items.length > 0)
                    ? `${b.title || b.text}: ${b.items.join(' • ')}`
                    : (b.title || b.text || '');
                let safeText = tooltipText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                let iconHtml = renderBadgeIcon(b, "badge-icon", "width:15px; height:15px; display:inline-block; vertical-align:middle; flex-shrink:0;");
                if (iconHtml) {
                    html += `<span class="ranking-badge-item" title="${safeText}" onclick="event.stopPropagation(); if(typeof showMobileTooltip==='function') showMobileTooltip(event, '${safeText}');" onmouseenter="if(typeof showMobileTooltip==='function') showMobileTooltip(event, '${safeText}');" onmouseleave="if(typeof hideMobileTooltip==='function') hideMobileTooltip();" style="display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer;">${iconHtml}</span>`;
                }
            });
            return `<div class="ranking-badges-wrap horizontal-drag-scroll" onclick="event.stopPropagation();" style="display:inline-flex; align-items:center; gap:3px; flex:1 1 auto; min-width:0; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; -webkit-overflow-scrolling:touch; cursor:grab; padding:1px 0;">${html}</div>`;
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
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button onclick="window.abrirModalCompartirJornada('${ligaName}')" title="Compartir mi posición en esta liga" style="background:transparent; border:none; color:#c794ce; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; padding:0; opacity:0.85; transition:all 0.2s ease;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';" onmouseout="this.style.opacity='0.85'; this.style.transform='none';">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                        </button>
                        <span style="font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase; letter-spacing: 0.4px; background: rgba(106, 44, 112, 0.4); color: #e2a6ea; border: 1px solid rgba(144, 60, 152, 0.6);">Jornada ${maxJornada}</span>
                    </div>
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
                        <span class="player-handle" style="cursor:pointer;" onclick="openPlayerInfo('${r.jugador}', '${ligaName}')" title="@${r.jugador}">@${r.jugador}</span>
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
            <div class="${c2_class}" style="${c2_bg} border-color: var(--secondary-color); margin-bottom: 20px; padding:14px; position:relative; overflow:hidden;">
                ${c2_snow}
                <div style="display: flex; justify-content: space-between; align-items: center; position:relative; z-index:2; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 auto;">
                    <div style="width: 34px; height: 34px; min-width:34px; border-radius: 50%; background: ${isLigaFrozen ? '#3498db' : 'var(--secondary-color)'}; color: #140818; display: flex; flex-direction:column; align-items: center; justify-content: center; flex-shrink: 0;">
                        <span style="font-weight: 900; font-size: 0.9rem;">${pos}º</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; min-width:0; overflow:hidden;">
                        <div style="font-weight: 800; font-size: 0.92rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">@${r.jugador}</div>
                        <span class="role-badge" style="background: var(--secondary-color); color: #140818; border:none; flex-shrink:0;">TÚ</span>
                    </div>
                </div>
                <div style="text-align: right; display:flex; align-items:center; gap:6px; flex-shrink:0;">
                    ${getTrendHtml(r.jugador, myIndex)}
                    <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--secondary-color); white-space:nowrap;">${r.puntos} pts${pendingHtml}</div>
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
                <div style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between; position:relative; z-index:2; background: inherit;">
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
                        <div style="display:flex; flex-direction:column; align-items:center; min-width:20px; flex-shrink:0;">
                            <span class="rank-num" style="margin:0;">${r.realRank}</span>
                        </div>
                        <div class="rank-user-info" style="margin-left:6px; min-width:0; flex:1 1 auto;">
                            <div class="name" style="display:flex; align-items:center; gap:6px; min-width:0; width:100%;">
                                <span class="rank-player-name" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex-shrink:0; max-width:70%;">@${r.jugador}</span>
                                ${badges}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0; margin-left:6px;">
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
        if (typeof window.updateAllBadgeScrollFades === 'function') setTimeout(window.updateAllBadgeScrollFades, 20);
        if (typeof window.observeBadgeScrollContainers === 'function') setTimeout(window.observeBadgeScrollContainers, 20);
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

const btnRequestInsigniasEl = document.getElementById('btnRequestInsignias');
if (btnRequestInsigniasEl) btnRequestInsigniasEl.addEventListener('click', function() {
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

// ==========================================
// LOGICA DE COMPARTIR TARJETA CANVAS
// ==========================================
window.currentShareMode = null; // 'match' o 'jornada'
window.currentShareMatchId = null;
window.currentShareLiga = null;

window.closeShareCardModal = function() {
    const modal = document.getElementById('shareCardModal');
    if (modal) modal.style.display = 'none';
};

window.abrirModalCompartirPartido = function(idPart) {
    window.currentShareMode = 'match';
    window.currentShareMatchId = idPart;
    const ligaSelector = document.getElementById('shareLigaSelectorContainer');
    if (ligaSelector) ligaSelector.style.display = 'none';
    const modal = document.getElementById('shareCardModal');
    if (modal) modal.style.display = 'flex';
    window.dibujarTarjetaCompartir();
};

window.abrirModalCompartirMVP = function(idPart) {
    window.currentShareMode = 'mvp';
    window.currentShareMatchId = idPart;
    const ligaSelector = document.getElementById('shareLigaSelectorContainer');
    if (ligaSelector) ligaSelector.style.display = 'none';
    const modal = document.getElementById('shareCardModal');
    if (modal) modal.style.display = 'flex';
    window.dibujarTarjetaCompartir();
};

window.abrirModalCompartirJornada = function(ligaDefault) {
    window.currentShareMode = 'jornada';
    window.currentShareLiga = ligaDefault || (window.currentLiga || (window.appData && window.appData.ligas ? window.appData.ligas[0] : ''));
    
    const ligaSelector = document.getElementById('shareLigaSelectorContainer');
    const select = document.getElementById('shareLigaSelect');
    if (select && window.appData && window.appData.ligas) {
        select.innerHTML = window.appData.ligas.map(l => `<option value="${l}" ${l === window.currentShareLiga ? 'selected' : ''}>Liga ${l}</option>`).join('');
    }
    if (ligaSelector) ligaSelector.style.display = 'block';

    const modal = document.getElementById('shareCardModal');
    if (modal) modal.style.display = 'flex';
    window.dibujarTarjetaCompartir();
};

window.cambiarLigaCompartir = function(nuevaLiga) {
    window.currentShareLiga = nuevaLiga;
    window.dibujarTarjetaCompartir();
};

// Helper para cargar imagen asíncrona en Canvas
function cargarImagenCanvas(src) {
    return new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// Helper: Pintar fondo con malla y resplandores dorados/morados
function pintarFondoEstadioCanvas(ctx, W, H) {
    // Fondo base degradado profundo
    const bgGrad = ctx.createRadialGradient(W / 2, H / 3, 50, W / 2, H / 2, Math.max(W, H) * 0.8);
    bgGrad.addColorStop(0, '#2d1437');
    bgGrad.addColorStop(0.5, '#190a1e');
    bgGrad.addColorStop(1, '#0b040e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Resplandor superior dorado
    const glowGold = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, 500);
    glowGold.addColorStop(0, 'rgba(212, 175, 55, 0.22)');
    glowGold.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = glowGold;
    ctx.fillRect(0, 0, W, H);

    // Resplandor inferior morado intenso
    const glowMorado = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, 600);
    glowMorado.addColorStop(0, 'rgba(123, 51, 130, 0.28)');
    glowMorado.addColorStop(1, 'rgba(123, 51, 130, 0)');
    ctx.fillStyle = glowMorado;
    ctx.fillRect(0, 0, W, H);

    // Líneas diagonales de estilo deportivo (sutil marca de agua)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1.5;
    for (let x = -H; x < W + H; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + H, H);
        ctx.stroke();
    }
    ctx.restore();

    // Marco exterior Glassmorphism
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(24, 24, W - 48, H - 48, 28);
    ctx.stroke();

    // Acentos dorados en las 4 esquinas
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    const cornerSize = 40;
    // Top-left
    ctx.beginPath(); ctx.moveTo(24, 24 + cornerSize); ctx.lineTo(24, 24); ctx.lineTo(24 + cornerSize, 24); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(W - 24 - cornerSize, 24); ctx.lineTo(W - 24, 24); ctx.lineTo(W - 24, 24 + cornerSize); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(24, H - 24 - cornerSize); ctx.lineTo(24, H - 24); ctx.lineTo(24 + cornerSize, H - 24); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(W - 24 - cornerSize, H - 24); ctx.lineTo(W - 24, H - 24); ctx.lineTo(W - 24, H - 24 - cornerSize); ctx.stroke();
    ctx.restore();
}

window.dibujarTarjetaCompartir = async function() {
    const canvas = document.getElementById('shareCardCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    pintarFondoEstadioCanvas(ctx, W, H);

    // Cabecera Oficial VCV PLAY
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 46px "Space Grotesk", sans-serif, system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('VCV PLAY', 70, 95);

    ctx.fillStyle = '#b7a4be';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('VALLADOLID CLUB VOLEIBOL • 2026/2027', 70, 130);

    // Línea separadora
    const lineGrad = ctx.createLinearGradient(70, 0, W - 70, 0);
    lineGrad.addColorStop(0, 'rgba(212, 175, 55, 0.8)');
    lineGrad.addColorStop(0.5, 'rgba(123, 51, 130, 0.6)');
    lineGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(70, 155);
    ctx.lineTo(W - 70, 155);
    ctx.stroke();

    const data = window.appData || {};
    const uName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (data.usuario || 'Jugador');
    const nReal = data.nombre_real || uName;

    if (window.currentShareMode === 'match') {
        await dibujarTarjetaPartidoCanvas(ctx, W, H, uName, nReal, data);
    } else if (window.currentShareMode === 'mvp') {
        await dibujarTarjetaMvpCanvas(ctx, W, H, uName, nReal, data);
    } else {
        await dibujarTarjetaJornadaCanvas(ctx, W, H, uName, nReal, data);
    }

    // Pie de tarjeta limpio
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '700 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏐 Juega gratis y pronostica en vcvplay.com', W / 2, H - 55);
};

// Helper para dibujar imagen preservando proporciones (object-fit: contain)
function drawImageContain(ctx, img, x, y, maxW, maxH) {
    if (!img) return;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const nw = img.width * ratio;
    const nh = img.height * ratio;
    const nx = x + (maxW - nw) / 2;
    const ny = y + (maxH - nh) / 2;
    ctx.drawImage(img, nx, ny, nw, nh);
}

// Helper para auto-ajustar tamaño de fuente y que nunca se desborde del ancho máximo permitido
function drawTextFitted(ctx, text, x, y, maxW, baseFontSize, fontSpec = 'sans-serif', minFontSize = 14) {
    if (!text) return;
    let size = baseFontSize;
    
    // Extraer peso si viene incluido (ej: '900 sans-serif' o '800 "Space Grotesk"')
    let weight = 'normal';
    let family = fontSpec;
    const parts = fontSpec.trim().split(/\s+/);
    if (parts.length > 1 && (/^(normal|bold|bolder|lighter|[1-9]00)$/i.test(parts[0]))) {
        weight = parts[0];
        family = parts.slice(1).join(' ');
    }

    ctx.font = `${weight} ${size}px ${family}`;
    let measured = ctx.measureText(text).width;
    while (measured > maxW && size > minFontSize) {
        size -= 1;
        ctx.font = `${weight} ${size}px ${family}`;
        measured = ctx.measureText(text).width;
    }
    // Si aún con minFontSize sobrepasa, recortar con elipsis
    let displayText = String(text);
    if (measured > maxW) {
        while (displayText.length > 3 && ctx.measureText(displayText + '...').width > maxW) {
            displayText = displayText.slice(0, -1);
        }
        displayText = displayText + '...';
    }
    ctx.fillText(displayText, x, y);
}

async function dibujarTarjetaMvpCanvas(ctx, W, H, uName, nReal, data) {
    const idPart = window.currentShareMatchId;
    let match = null;
    if (data.equipos) match = data.equipos.find(m => m.id_partido === idPart);
    if (!match && data.todos_partidos) match = data.todos_partidos.find(m => m.id_partido === idPart);
    if (!match) return;

    const locName = (match.ubicacion === 'LOCAL') ? match.equipo_local : match.rival;
    const visName = (match.ubicacion === 'LOCAL') ? match.rival : match.equipo_local;
    const cat = (match.categoria || 'SUPERLIGA 2').toUpperCase();
    const jNum = match.jornada_eq || match.ronda_global || '-';

    // Candidatos y votos
    const cands = Array.isArray(match.mvp_candidatos) ? match.mvp_candidatos : [];
    const myVote = (data.mvp_votos && data.mvp_votos[idPart]) ? data.mvp_votos[idPart] : null;
    const isProclaimed = !!match.mvp_oficial;

    // Determinar qué jugador destacar como principal
    let primaryInfo = null;
    let isHit = false;

    if (isProclaimed) {
        primaryInfo = window.parseCandInfo(match.mvp_oficial);
        if (myVote) {
            let uMvpVote = String(myVote).trim().toLowerCase();
            let mOficial = String(match.mvp_oficial).trim().toLowerCase();
            let dorOf = (mOficial.match(/#(\d+)/) || [])[1];
            let dorVo = (uMvpVote.match(/#(\d+)/) || [])[1];
            if (dorOf && dorVo && dorOf === dorVo) isHit = true;
            else if (mOficial === uMvpVote || mOficial.includes(uMvpVote) || uMvpVote.includes(mOficial)) isHit = true;
        }
    } else if (myVote) {
        primaryInfo = window.parseCandInfo(myVote);
    } else if (cands.length > 0) {
        primaryInfo = window.parseCandInfo(cands[0]);
    }

    // Cargar imagen del jugador principal
    let mainImg = null;
    if (primaryInfo) {
        mainImg = await cargarImagenCanvas(primaryInfo.photoSrc);
        if (!mainImg && primaryInfo.dorsal) {
            mainImg = await cargarImagenCanvas(`files/images/jugadores/dorsal_${primaryInfo.dorsal}.jpeg`);
        }
    }

    // 1. BARRA SUPERIOR DE METADATOS
    // Badge 1: Categoría
    ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(70, 180, 240, 46, 12);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    drawTextFitted(ctx, cat, 190, 210, 215, 20, '900 "Space Grotesk", sans-serif', 14);

    // Badge 2: Partido
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(325, 180, 360, 46, 12);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawTextFitted(ctx, `${locName} vs ${visName}`, 505, 210, 335, 19, '800 sans-serif', 13);

    // Badge 3: Jornada (Derecha)
    ctx.fillStyle = '#b7a4be';
    ctx.font = '800 24px "Space Grotesk", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('JORNADA ' + jNum, W - 70, 210);

    // ========================================================
    // POSTER CENTRAL UNIFICADO: MVP CARD
    // ========================================================
    const posterY = 245;
    const posterH = 730;

    // Fondo Glassmorphism unificado
    const cardGrad = ctx.createLinearGradient(0, posterY, 0, posterY + posterH);
    cardGrad.addColorStop(0, 'rgba(39, 19, 48, 0.90)');
    cardGrad.addColorStop(1, 'rgba(18, 8, 24, 0.97)');
    ctx.fillStyle = cardGrad;
    ctx.strokeStyle = isProclaimed ? 'rgba(212, 175, 55, 0.65)' : 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = isProclaimed ? 3 : 2.5;
    ctx.beginPath();
    ctx.roundRect(70, posterY, W - 140, posterH, 28);
    ctx.fill(); ctx.stroke();

    const midX = W / 2;

    // 2. ENCABEZADO DE LA CARD (Título y Usuario)
    const topBannerY = posterY + 25;
    let cardTitle = isProclaimed ? '👑 MVP VALCYL' : (myVote ? '⭐ MI VOTO MVP VALCYL' : '⭐ CANDIDATOS MVP VALCYL');
    ctx.fillStyle = isProclaimed ? '#ffd700' : '#f3ce5e';
    ctx.textAlign = 'left';
    drawTextFitted(ctx, cardTitle, 110, topBannerY + 24, 450, 30, '900 "Space Grotesk", sans-serif', 20);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    let userHeaderTxt = '@' + uName + (nReal && nReal !== uName ? ' (' + nReal + ')' : '');
    drawTextFitted(ctx, userHeaderTxt, W - 110, topBannerY + 24, 380, 24, '800 sans-serif', 16);

    // Separador sutil bajo el banner
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(110, topBannerY + 45);
    ctx.lineTo(W - 110, topBannerY + 45);
    ctx.stroke();

    // 3. SECCIÓN HERO: FOTO Y DATOS DEL JUGADOR DESTACADO
    const heroY = topBannerY + 65;
    const photoBoxW = 270;
    const photoBoxH = 270;
    const photoX = 110;
    const photoY = heroY;

    // Marco exterior con resplandor dorado para la foto
    ctx.save();
    ctx.fillStyle = 'radial-gradient(circle at 50% 80%, rgba(212, 175, 55, 0.25) 0%, rgba(93, 23, 137, 0.4) 60%, rgba(17, 5, 25, 0.9) 100%)';
    const bgRad = ctx.createRadialGradient(photoX + (photoBoxW / 2), photoY + (photoBoxH / 2), 20, photoX + (photoBoxW / 2), photoY + (photoBoxH / 2), 160);
    bgRad.addColorStop(0, 'rgba(212, 175, 55, 0.25)');
    bgRad.addColorStop(0.7, 'rgba(93, 23, 137, 0.4)');
    bgRad.addColorStop(1, 'rgba(17, 5, 25, 0.95)');
    ctx.fillStyle = bgRad;
    ctx.beginPath();
    ctx.roundRect(photoX, photoY, photoBoxW, photoBoxH, 22);
    ctx.fill();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dibujar foto o iniciales
    if (mainImg) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(photoX + 4, photoY + 4, photoBoxW - 8, photoBoxH - 8, 18);
        ctx.clip();
        drawImageContain(ctx, mainImg, photoX + 4, photoY + 4, photoBoxW - 8, photoBoxH - 8);
        ctx.restore();
    } else if (primaryInfo) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 80px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(primaryInfo.initials, photoX + (photoBoxW / 2), photoY + (photoBoxH / 2) + 28);
    }
    ctx.restore();

    // Dorsal Badge flotante sobre la foto
    if (primaryInfo && primaryInfo.dorsal) {
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.roundRect(photoX + 14, photoY + 14, 62, 38, 10);
        ctx.fill();
        ctx.fillStyle = '#170624';
        ctx.font = '900 22px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('#' + primaryInfo.dorsal, photoX + 45, photoY + 41);
    }

    // Columna de información a la derecha de la foto (X = 415 a W - 110)
    const infoX = photoX + photoBoxW + 35;
    const infoW = (W - 110) - infoX;

    // Etiqueta superior
    ctx.fillStyle = '#d4af37';
    ctx.font = '800 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(isProclaimed ? 'PROCLAMADO POR EL CLUB' : 'MI ELECCIÓN DESTACADA', infoX, heroY + 30);

    // Apodo en tipografía grande con auto-ajuste
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    let displayApodo = primaryInfo ? primaryInfo.apodo : 'Jugador';
    drawTextFitted(ctx, displayApodo, infoX, heroY + 86, infoW - 20, 52, '900 "Space Grotesk", sans-serif', 28);

    // Nombre completo con auto-ajuste
    if (primaryInfo && primaryInfo.nombre && primaryInfo.nombre.toLowerCase() !== displayApodo.toLowerCase()) {
        ctx.fillStyle = '#b7a4be';
        ctx.textAlign = 'left';
        drawTextFitted(ctx, primaryInfo.nombre, infoX, heroY + 125, infoW - 20, 24, '700 sans-serif', 16);
    }

    // Posición
    if (primaryInfo && primaryInfo.posicion) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(infoX, heroY + 145, 180, 36, 10);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        drawTextFitted(ctx, primaryInfo.posicion, infoX + 90, heroY + 169, 160, 18, '800 sans-serif', 13);
    }

    // Estadísticas destacadas de MVP (si el partido ya terminó y tiene mvp_stats)
    if (isProclaimed && Array.isArray(match.mvp_stats) && match.mvp_stats.length > 0) {
        let stY = heroY + 198;
        let validStats = match.mvp_stats.filter(Boolean);
        validStats.slice(0, 3).forEach((st, i) => {
            let badgeX = infoX + (i * 155);
            if (badgeX + 145 <= W - 110) {
                ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(badgeX, stY, 145, 42, 10);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                drawTextFitted(ctx, '⚡ ' + st, badgeX + 72, stY + 27, 130, 17, '800 sans-serif', 12);
            }
        });
    }

    // 4. BANNER DE ESTADO DEL USUARIO (Centro)
    let pctMvpVal = (window.appData && window.appData.reglas && window.appData.reglas.pct_mvp !== undefined) ? window.appData.reglas.pct_mvp : 10;
    const bannerBoxY = heroY + photoBoxH + 28;
    const bannerMaxW = W - 260; // margen dentro del recuadro
    if (isProclaimed) {
        if (isHit) {
            // Acierto en verde/oro
            ctx.fillStyle = 'rgba(46, 204, 113, 0.18)';
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(110, bannerBoxY, W - 220, 68, 16);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#2ecc71';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, `🎯 ¡HAS ACERTADO EL MVP VALCYL! • +${pctMvpVal}% BONUS EN TUS PUNTOS`, midX, bannerBoxY + 44, bannerMaxW, 30, '900 sans-serif', 18);
        } else if (myVote) {
            // Voto por otro candidato
            let vInf = window.parseCandInfo(myVote);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(110, bannerBoxY, W - 220, 68, 16);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#b7a4be';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, `Tu voto fue para ${vInf.dorsal ? '#' + vInf.dorsal + ' ' : ''}${vInf.apodo} • ¡Buen intento!`, midX, bannerBoxY + 43, bannerMaxW, 24, '800 sans-serif', 16);
        } else {
            ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(110, bannerBoxY, W - 220, 68, 16);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#f3ce5e';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, 'No registraste voto de MVP VALCYL para este partido', midX, bannerBoxY + 43, bannerMaxW, 24, '800 sans-serif', 16);
        }
    } else {
        // En votación abierta
        ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(110, bannerBoxY, W - 220, 68, 16);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        if (myVote) {
            drawTextFitted(ctx, `🔒 Voto asegurado • ¡Si es elegido ganarás un +${pctMvpVal}% de bonus!`, midX, bannerBoxY + 43, bannerMaxW, 26, '900 sans-serif', 16);
        } else {
            drawTextFitted(ctx, `⭐ Votación Abierta • ¡Elige tu MVP VALCYL y gana un +${pctMvpVal}% de bonus!`, midX, bannerBoxY + 43, bannerMaxW, 26, '900 sans-serif', 16);
        }
    }

    // 5. SECCIÓN INFERIOR: OTROS CANDIDATOS NOMINADOS (Mini Cards)
    const othersY = bannerBoxY + 95;
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 22px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('👥 CANDIDATOS NOMINADOS EN ESTE PARTIDO', 110, othersY + 10);

    const miniY = othersY + 28;
    const numCands = cands.length || 1;
    const miniW = (W - 220 - ((numCands - 1) * 20)) / numCands;
    const miniH = 150;

    for (let i = 0; i < cands.length; i++) {
        const cStr = cands[i];
        const cInf = window.parseCandInfo(cStr);
        const mx = 110 + i * (miniW + 20);

        const isUserVoteThis = (myVote && (myVote === cStr || (cInf.dorsal && window.parseCandInfo(myVote).dorsal === cInf.dorsal)));
        const isOfficialThis = (isProclaimed && match.mvp_oficial && (match.mvp_oficial === cStr || (cInf.dorsal && window.parseCandInfo(match.mvp_oficial).dorsal === cInf.dorsal)));

        // Fondo mini card
        ctx.fillStyle = isOfficialThis ? 'rgba(212, 175, 55, 0.22)' : (isUserVoteThis ? 'rgba(123, 51, 130, 0.35)' : 'rgba(255, 255, 255, 0.04)');
        ctx.strokeStyle = isOfficialThis ? '#d4af37' : (isUserVoteThis ? '#ffd700' : 'rgba(255, 255, 255, 0.12)');
        ctx.lineWidth = (isOfficialThis || isUserVoteThis) ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(mx, miniY, miniW, miniH, 16);
        ctx.fill(); ctx.stroke();

        // Mini foto o avatar
        let miniImg = await cargarImagenCanvas(cInf.photoSrc);
        if (!miniImg && cInf.dorsal) {
            miniImg = await cargarImagenCanvas(`files/images/jugadores/dorsal_${cInf.dorsal}.jpeg`);
        }
        const mPhotoSize = 95;
        const mPhotoX = mx + 16;
        const mPhotoY = miniY + (miniH - mPhotoSize) / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.roundRect(mPhotoX, mPhotoY, mPhotoSize, mPhotoSize, 12);
        ctx.fill();
        ctx.strokeStyle = (isOfficialThis || isUserVoteThis) ? '#d4af37' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (miniImg) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(mPhotoX + 2, mPhotoY + 2, mPhotoSize - 4, mPhotoSize - 4, 10);
            ctx.clip();
            drawImageContain(ctx, miniImg, mPhotoX + 2, mPhotoY + 2, mPhotoSize - 4, mPhotoSize - 4);
            ctx.restore();
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 32px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cInf.initials, mPhotoX + (mPhotoSize / 2), mPhotoY + (mPhotoSize / 2) + 12);
        }
        ctx.restore();

        // Textos mini card a la derecha de la miniatura
        const mInfoX = mPhotoX + mPhotoSize + 16;
        const mMaxW = (mx + miniW - 14) - mInfoX;
        ctx.textAlign = 'left';

        // Badge indicador (OFICIAL / TU VOTO / NOMINADO)
        if (isOfficialThis) {
            ctx.fillStyle = '#ffd700';
            drawTextFitted(ctx, '👑 MVP VALCYL', mInfoX, miniY + 40, mMaxW, 16, '900 sans-serif', 12);
        } else if (isUserVoteThis) {
            ctx.fillStyle = '#f3ce5e';
            drawTextFitted(ctx, '⭐ TU VOTO', mInfoX, miniY + 40, mMaxW, 16, '900 sans-serif', 12);
        } else {
            ctx.fillStyle = '#b7a4be';
            drawTextFitted(ctx, 'NOMINADO', mInfoX, miniY + 40, mMaxW, 15, '800 sans-serif', 12);
        }

        // Nombre
        ctx.fillStyle = '#ffffff';
        drawTextFitted(ctx, (cInf.dorsal ? '#' + cInf.dorsal + ' ' : '') + cInf.apodo, mInfoX, miniY + 75, mMaxW, 24, '900 "Space Grotesk", sans-serif', 15);

        // Subtítulo (Nombre real o Posición)
        ctx.fillStyle = '#b7a4be';
        drawTextFitted(ctx, cInf.posicion || cInf.nombre || '', mInfoX, miniY + 105, mMaxW, 17, '600 sans-serif', 12);
    }
}

async function dibujarTarjetaPartidoCanvas(ctx, W, H, uName, nReal, data) {
    const idPart = window.currentShareMatchId;
    let match = null;
    if (data.equipos) match = data.equipos.find(m => m.id_partido === idPart);
    if (!match && data.todos_partidos) match = data.todos_partidos.find(m => m.id_partido === idPart);
    if (!match) return;

    const locName = (match.ubicacion === 'LOCAL') ? match.equipo_local : match.rival;
    const visName = (match.ubicacion === 'LOCAL') ? match.rival : match.equipo_local;
    const cat = (match.categoria || 'VOLEIBOL').toUpperCase();
    const jNum = match.jornada_eq || match.ronda_global || '-';

    // Cargar escudos WebP de ambos equipos
    const safeLoc = locName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const safeVis = visName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const [imgLoc, imgVis] = await Promise.all([
        cargarImagenCanvas(`files/images/escudos/${safeLoc}.webp`),
        cargarImagenCanvas(`files/images/escudos/${safeVis}.webp`)
    ]);

    const nowMs = Date.now();
    const hasOficialSets = Boolean(match.oficial_sets && String(match.oficial_sets).trim() !== '');
    const yaJugado = Boolean(hasOficialSets || match.estado === 'FINALIZADO' || (match.estado === 'CERRADO' && hasOficialSets));
    const isPastDeadline = Boolean(match.timestamp && (nowMs >= match.timestamp));
    const isCerrado = Boolean(yaJugado || match.estado === 'CERRADO' || match.estado === 'BLOQUEADO' || isPastDeadline);
    const pUser = (data.predicciones_usuario && data.predicciones_usuario[idPart]) ? data.predicciones_usuario[idPart] : ((data.mis_predicciones && data.mis_predicciones[idPart]) ? data.mis_predicciones[idPart] : null);

    // --- BARRA SUPERIOR DE METADATOS (Pills redondeadas en una fila equilibrada) ---
    // Badge 1: Categoría
    ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(70, 180, 240, 46, 12);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 20px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cat, 190, 210);

    // Badge 2: Derby (si aplica)
    if (match.es_derby) {
        ctx.fillStyle = 'rgba(255, 71, 87, 0.2)';
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(325, 180, 150, 46, 12);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff6b81';
        ctx.font = '900 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 DERBY', 400, 210);
    }

    // Badge 3: Estado de Predicción
    let statusText = '';
    let statusColor = '';
    let statusBg = '';
    if (yaJugado) {
        statusText = 'FINALIZADO';
        statusColor = '#2ecc71';
        statusBg = 'rgba(46, 204, 113, 0.2)';
    } else if (isCerrado) {
        statusText = '🔒 CERRADA';
        statusColor = '#ff4757';
        statusBg = 'rgba(255, 71, 87, 0.2)';
    } else {
        statusText = '🟢 ABIERTA';
        statusColor = '#2ecc71';
        statusBg = 'rgba(46, 204, 113, 0.2)';
    }
    const statusX = match.es_derby ? 490 : 330;
    const statusW = 200;
    ctx.fillStyle = statusBg;
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(statusX, 180, statusW, 46, 12);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = statusColor;
    ctx.font = '900 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, statusX + (statusW / 2), 210);

    // Badge 4: Jornada (Extremo derecho)
    ctx.fillStyle = '#b7a4be';
    ctx.font = '800 24px "Space Grotesk", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('JORNADA ' + jNum, W - 70, 210);

    // ========================================================
    // POSTER CENTRAL UNIFICADO: ENFRENTAMIENTO Y PRONÓSTICO
    // ========================================================
    const posterY = 245;
    const posterH = 730;
    
    // Fondo de tarjeta con Glassmorphism profundo
    const cardGrad = ctx.createLinearGradient(0, posterY, 0, posterY + posterH);
    cardGrad.addColorStop(0, 'rgba(39, 19, 48, 0.85)');
    cardGrad.addColorStop(1, 'rgba(20, 10, 26, 0.95)');
    ctx.fillStyle = cardGrad;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(70, posterY, W - 140, posterH, 28);
    ctx.fill(); ctx.stroke();

    // 1. ZONA LOCAL (Mitad Izquierda X = 250)
    const locCenter = 260;
    // Círculo suave detrás del escudo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath(); ctx.arc(locCenter, posterY + 140, 95, 0, Math.PI * 2); ctx.fill();
    if (imgLoc) {
        drawImageContain(ctx, imgLoc, locCenter - 85, posterY + 55, 170, 170);
    }
    // Nombre Local con auto-ajuste para que nunca se desborde ni tape el centro
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawTextFitted(ctx, locName, locCenter, posterY + 265, 290, 32, '900 sans-serif', 16);
    // Badge Local
    ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(locCenter - 55, posterY + 285, 110, 32, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2ecc71';
    ctx.font = '900 16px sans-serif';
    ctx.fillText('LOCAL', locCenter, posterY + 307);

    // 2. ZONA CENTRAL (Marcador o VS)
    const midX = W / 2;
    if (yaJugado) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 84px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(match.oficial_sets, midX, posterY + 155);

        if (match.oficial_parciales) {
            ctx.fillStyle = '#b7a4be';
            ctx.font = '700 22px sans-serif';
            ctx.fillText(match.oficial_parciales, midX, posterY + 205);
        }

        ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(midX - 80, posterY + 235, 160, 38, 10);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f3ce5e';
        ctx.font = '900 17px sans-serif';
        ctx.fillText('OFICIAL', midX, posterY + 260);
    } else {
        ctx.fillStyle = '#d4af37';
        ctx.font = '900 68px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VS', midX, posterY + 160);

        ctx.fillStyle = '#b7a4be';
        ctx.font = '700 22px sans-serif';
        let matchDateStr = match.timestamp ? new Date(match.timestamp).toLocaleDateString() : 'Por disputar';
        if (isCerrado && isPastDeadline) {
            ctx.fillText(matchDateStr + ' • En juego', midX, posterY + 215);
        } else if (isCerrado) {
            ctx.fillText(matchDateStr + ' • Cerrado', midX, posterY + 215);
        } else {
            ctx.fillText(matchDateStr, midX, posterY + 215);
        }
    }

    // 3. ZONA VISITANTE (Mitad Derecha X = W - 260)
    const visCenter = W - 260;
    // Círculo suave detrás del escudo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath(); ctx.arc(visCenter, posterY + 140, 95, 0, Math.PI * 2); ctx.fill();
    if (imgVis) {
        drawImageContain(ctx, imgVis, visCenter - 85, posterY + 55, 170, 170);
    }
    // Nombre Visitante con auto-ajuste para equipos de nombres largos
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawTextFitted(ctx, visName, visCenter, posterY + 265, 290, 32, '900 sans-serif', 16);
    // Badge Visitante
    ctx.fillStyle = 'rgba(183, 164, 190, 0.15)';
    ctx.strokeStyle = '#b7a4be';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(visCenter - 70, posterY + 285, 140, 32, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b7a4be';
    ctx.font = '900 16px sans-serif';
    ctx.fillText('VISITANTE', visCenter, posterY + 307);

    // 4. DIVISIÓN INTERIOR ELEGANTE (Línea con resplandor)
    const sepY = posterY + 355;
    const sepGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
    sepGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    sepGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.7)');
    sepGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.strokeStyle = sepGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, sepY);
    ctx.lineTo(W - 120, sepY);
    ctx.stroke();

    // 5. SECCIÓN INFERIOR: PRONÓSTICO DEL JUGADOR
    const userBlockY = sepY + 25;

    // Header del pronóstico: Icono + Título + Usuario
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 24px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎯 PRONÓSTICO REGISTRADO', 120, userBlockY + 20);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    let matchUserHeader = '@' + uName + (nReal && nReal !== uName ? ' (' + nReal + ')' : '');
    drawTextFitted(ctx, matchUserHeader, W - 120, userBlockY + 20, 380, 24, '800 sans-serif', 16);

    if (pUser && pUser.sets) {
        // Caja de Sets Pronosticados (Diseño tipo display)
        const predBoxW = 280;
        const predBoxH = 105;
        const predBoxX = midX - (predBoxW / 2);
        const predBoxY = userBlockY + 50;

        ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(predBoxX, predBoxY, predBoxW, predBoxH, 18);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 78px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pUser.sets, midX, predBoxY + 80);

        // Diferencia de puntos pronosticada
        ctx.fillStyle = '#f3ce5e';
        ctx.textAlign = 'center';
        let signoTxt = pUser.signo || '';
        let diffTxt = pUser.puntos !== undefined ? `Diferencia de sets: ${pUser.puntos} pts (${signoTxt})` : signoTxt;
        drawTextFitted(ctx, diffTxt, midX, predBoxY + 150, W - 280, 26, '700 sans-serif', 18);

        // Mensaje de Resultado / Puntos
        if (yaJugado) {
            let ptsGanador = (data.reglas && data.reglas.ganador) || 3;
            let ptsSets = (data.reglas && data.reglas.sets) || 5;
            let ptsDiffExacta = (data.reglas && data.reglas.diff_exacta) || 2;
            let maxDistancia = (data.reglas && data.reglas.max_dist) || 10;
            let pctMvp = (data.reglas && data.reglas.pct_mvp !== undefined) ? data.reglas.pct_mvp : 10;

            let ptsConseguidos = 0;
            const oSets = match.oficial_sets.split("-");
            const uSets = pUser.sets.split("-");
            if (oSets.length === 2 && uSets.length === 2) {
                const oLocalWin = parseInt(oSets[0]) > parseInt(oSets[1]);
                const uLocalWin = parseInt(uSets[0]) > parseInt(uSets[1]);
                if (oLocalWin === uLocalWin) ptsConseguidos += ptsGanador;
                if (pUser.sets === match.oficial_sets) ptsConseguidos += ptsSets;
            }

            if (match.oficial_parciales) {
                let oDiff = 0;
                const setsP = match.oficial_parciales.split(",");
                for (const sp of setsP) {
                    const nums = sp.split("-");
                    if (nums.length === 2) oDiff += (parseInt(nums[0]) - parseInt(nums[1]));
                }
                let uDiff = parseInt(pUser.puntos) || 0;
                if (pUser.signo && pUser.signo.toLowerCase().includes("en contra")) uDiff = -uDiff;
                const dist = Math.abs(oDiff - uDiff);
                if (dist === 0) ptsConseguidos += ptsDiffExacta;
                else if (maxDistancia > 0 && dist < maxDistancia) {
                    ptsConseguidos += Math.round(ptsDiffExacta * ((maxDistancia - dist) / maxDistancia));
                }
            }

            // Bonificación MVP (+pctMvp% redondeado hacia arriba si acertó el MVP oficial)
            let isMvpHit = false;
            let bonusMvpVal = 0;
            if (match.mvp_oficial && ptsConseguidos > 0 && pctMvp > 0 && data.mvp_votos && data.mvp_votos[match.id_partido]) {
                let uMvpVote = String(data.mvp_votos[match.id_partido]).trim().toLowerCase();
                let mOficial = String(match.mvp_oficial).trim().toLowerCase();
                let dorOf = (mOficial.match(/#(\d+)/) || [])[1];
                let dorVo = (uMvpVote.match(/#(\d+)/) || [])[1];
                if (dorOf && dorVo && dorOf === dorVo) isMvpHit = true;
                else if (mOficial === uMvpVote || mOficial.includes(uMvpVote) || uMvpVote.includes(mOficial)) isMvpHit = true;
                if (isMvpHit) {
                    bonusMvpVal = Math.ceil(ptsConseguidos * (pctMvp / 100));
                    ptsConseguidos += bonusMvpVal;
                }
            }

            // Banner verde de Puntos Ganados
            ctx.fillStyle = 'rgba(46, 204, 113, 0.16)';
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(140, predBoxY + 180, W - 280, 56, 16);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#2ecc71';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, '🔥 ¡Conseguidos +' + ptsConseguidos + ' pts en este partido!', midX, predBoxY + 218, W - 320, 30, '900 sans-serif', 18);

            // Mención MVP si el partido tiene MVP
            if (match.mvp_oficial || (match.mvp_candidatos && match.mvp_candidatos.length > 0)) {
                let mvpTxt = '';
                let uVote = data.mvp_votos ? data.mvp_votos[match.id_partido] : null;
                if (match.mvp_oficial) {
                    let oInf = window.parseCandInfo(match.mvp_oficial);
                    if (isMvpHit) {
                        mvpTxt = `👑 MVP VALCYL: ${oInf.apodo} • ¡Acertaste tu voto! (+${bonusMvpVal} pts bonus)`;
                    } else if (uVote) {
                        let vInf = window.parseCandInfo(uVote);
                        mvpTxt = `👑 MVP VALCYL: ${oInf.apodo} • Votaste por ${vInf.apodo}`;
                    } else {
                        mvpTxt = `👑 MVP VALCYL: ${oInf.apodo}`;
                    }
                } else if (uVote) {
                    let vInf = window.parseCandInfo(uVote);
                    mvpTxt = `⭐ Mi voto a MVP VALCYL: ${vInf.dorsal ? '#' + vInf.dorsal + ' ' : ''}${vInf.apodo}`;
                }
                if (mvpTxt) {
                    ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';
                    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.roundRect(140, predBoxY + 248, W - 280, 42, 12);
                    ctx.fill(); ctx.stroke();

                    ctx.fillStyle = '#f3ce5e';
                    ctx.textAlign = 'center';
                    drawTextFitted(ctx, mvpTxt, midX, predBoxY + 276, W - 320, 20, '800 sans-serif', 13);
                }
            }
        } else {
            // Banner de pronóstico asegurado
            ctx.fillStyle = 'rgba(46, 204, 113, 0.12)';
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(140, predBoxY + 180, W - 280, 54, 16);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#2ecc71';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, '🔒 Predicción registrada • ¡A por los puntos!', midX, predBoxY + 216, W - 320, 24, '800 sans-serif', 16);

            // Mención MVP si el usuario ya votó
            let uVote = data.mvp_votos ? data.mvp_votos[match.id_partido] : null;
            if (uVote) {
                let vInf = window.parseCandInfo(uVote);
                ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(140, predBoxY + 246, W - 280, 42, 12);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#f3ce5e';
                ctx.textAlign = 'center';
                drawTextFitted(ctx, `⭐ Mi candidato a MVP: ${vInf.dorsal ? '#' + vInf.dorsal + ' ' : ''}${vInf.apodo}`, midX, predBoxY + 274, W - 320, 20, '800 sans-serif', 13);
            }
        }
    } else {
        ctx.fillStyle = '#b7a4be';
        ctx.font = '700 30px sans-serif';
        ctx.textAlign = 'center';
        if (yaJugado) {
            ctx.fillText('Sin predicción registrada para este partido', midX, userBlockY + 120);
            ctx.fillStyle = '#f3ce5e';
            ctx.font = '700 24px sans-serif';
            ctx.fillText('¡Entra en vcvplay.com y consulta las clasificaciones!', midX, userBlockY + 175);
        } else if (isCerrado) {
            ctx.fillText('El plazo de predicciones para este partido ha finalizado', midX, userBlockY + 120);
            ctx.fillStyle = '#f3ce5e';
            ctx.font = '700 24px sans-serif';
            ctx.fillText('¡Entra en vcvplay.com y sigue la jornada en directo!', midX, userBlockY + 175);
        } else {
            ctx.fillText('Sin predicción registrada aún para este partido', midX, userBlockY + 120);
            ctx.fillStyle = '#f3ce5e';
            ctx.font = '700 24px sans-serif';
            ctx.fillText('¡Entra en vcvplay.com y pronostica antes de que empiece!', midX, userBlockY + 175);
        }
    }
}

async function dibujarTarjetaJornadaCanvas(ctx, W, H, uName, nReal, data) {
    const liga = window.currentShareLiga || (data.ligas ? data.ligas[0] : '');
    const ranking = (data.clasificaciones && data.clasificaciones[liga]) ? data.clasificaciones[liga] : [];

    let pos = '-';
    let pts = 0;
    const userIndex = ranking.findIndex(r => r.jugador === uName);
    if (userIndex !== -1) {
        pos = '#' + (userIndex + 1);
        pts = ranking[userIndex].puntos || 0;
    }

    // --- BARRA SUPERIOR DE METADATOS ---
    // Badge 1: Liga
    ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(70, 180, 360, 46, 12);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    drawTextFitted(ctx, 'LIGA ' + liga.toUpperCase(), 250, 210, 335, 20, '900 "Space Grotesk", sans-serif', 14);

    // Badge 2: Jornada (Derecha)
    ctx.fillStyle = '#b7a4be';
    ctx.font = '800 24px "Space Grotesk", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('JORNADA ' + (data.jornada || 'ACTUAL'), W - 70, 210);

    // ========================================================
    // POSTER CENTRAL UNIFICADO: RANKING Y ESTADÍSTICAS
    // ========================================================
    const posterY = 245;
    const posterH = 730;

    // Fondo Glassmorphism unificado
    const cardGrad = ctx.createLinearGradient(0, posterY, 0, posterY + posterH);
    cardGrad.addColorStop(0, 'rgba(39, 19, 48, 0.85)');
    cardGrad.addColorStop(1, 'rgba(20, 10, 26, 0.95)');
    ctx.fillStyle = cardGrad;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(70, posterY, W - 140, posterH, 28);
    ctx.fill(); ctx.stroke();

    // 1. ZONA SUPERIOR: PERFIL DE JUGADOR (Avatar grande + Nombre)
    const midX = W / 2;
    const avatarY = posterY + 95;

    // Halo circular suave
    ctx.fillStyle = 'rgba(212, 175, 55, 0.08)';
    ctx.beginPath(); ctx.arc(midX, avatarY, 75, 0, Math.PI * 2); ctx.fill();

    // Círculo Avatar con degradado morado-dorado
    ctx.save();
    const avatarGrad = ctx.createLinearGradient(midX - 55, avatarY - 55, midX + 55, avatarY + 55);
    avatarGrad.addColorStop(0, '#7b3382');
    avatarGrad.addColorStop(1, '#d4af37');
    ctx.fillStyle = avatarGrad;
    ctx.beginPath();
    ctx.arc(midX, avatarY, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(uName.substring(0, 2).toUpperCase(), midX, avatarY + 16);
    ctx.restore();

    // Nombre y Usuario con auto-ajuste
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawTextFitted(ctx, '@' + uName, midX, posterY + 195, W - 200, 40, '900 sans-serif', 24);

    if (nReal && nReal !== uName) {
        ctx.fillStyle = '#b7a4be';
        ctx.textAlign = 'center';
        drawTextFitted(ctx, nReal, midX, posterY + 230, W - 200, 24, '700 sans-serif', 16);
    }

    // 2. ZONA MEDIA: DOS CAJAS GEMELAS DISPLAY (Posición y Puntos)
    const statsBoxY = posterY + 265;
    const halfW = (W - 140 - 70) / 2; // ~400px cada caja

    // Caja 1: Posición
    ctx.fillStyle = 'rgba(212, 175, 55, 0.08)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(105, statsBoxY, halfW, 170, 20);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#b7a4be';
    ctx.font = '800 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POSICIÓN EN LIGA', 105 + (halfW / 2), statsBoxY + 45);

    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    drawTextFitted(ctx, pos, 105 + (halfW / 2), statsBoxY + 135, halfW - 40, 84, '900 "Space Grotesk", sans-serif', 40);

    // Caja 2: Puntos
    ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(W - 105 - halfW, statsBoxY, halfW, 170, 20);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#b7a4be';
    ctx.font = '800 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PUNTOS TOTALES', (W - 105 - halfW) + (halfW / 2), statsBoxY + 45);

    ctx.fillStyle = '#2ecc71';
    ctx.textAlign = 'center';
    drawTextFitted(ctx, pts + ' pts', (W - 105 - halfW) + (halfW / 2), statsBoxY + 135, halfW - 40, 84, '900 "Space Grotesk", sans-serif', 40);

    // 3. DIVISIÓN INTERIOR ELEGANTE
    const sepY = statsBoxY + 205;
    const sepGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
    sepGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    sepGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.7)');
    sepGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.strokeStyle = sepGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, sepY);
    ctx.lineTo(W - 120, sepY);
    ctx.stroke();

    // 4. SECCIÓN INFERIOR: RENDIMIENTO DESTACADO
    const histY = sepY + 30;
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 24px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📊 RENDIMIENTO DESTACADO', 120, histY + 15);

    let stats = (typeof window.calculateUserStatsHelper === 'function') ? window.calculateUserStatsHelper(uName, liga) : null;
    let mPts = stats ? stats.mediaPuntos : '-';
    let mPos = stats ? stats.mediaPos : '-';
    let recJ = stats ? stats.recordJornada : '-';

    // 3 Pastillas horizontales estilizadas
    const pW = (W - 240 - 30) / 3;
    const pY = histY + 45;
    const pillH = 110;

    const histData = [
        { label: 'MEDIA / JORNADA', val: mPts + ' pts', col: '#f3ce5e' },
        { label: 'POSICIÓN MEDIA', val: '#' + mPos, col: '#ffffff' },
        { label: 'RÉCORD JORNADA', val: recJ + ' pts', col: '#2ecc71' }
    ];

    histData.forEach((it, idx) => {
        const px = 120 + idx * (pW + 15);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(px, pY, pW, pillH, 16);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#b7a4be';
        ctx.textAlign = 'center';
        drawTextFitted(ctx, it.label, px + (pW / 2), pY + 38, pW - 20, 17, '800 sans-serif', 12);

        ctx.fillStyle = it.col;
        ctx.textAlign = 'center';
        drawTextFitted(ctx, it.val, px + (pW / 2), pY + 85, pW - 20, 34, '900 "Space Grotesk", sans-serif', 20);
    });

    // Mención a Bonus MVP si en esta jornada/liga hubo acierto de MVP
    let matchesToCheck = data.equipos || data.todos_partidos || [];
    let mvpHitsInLiga = 0;
    matchesToCheck.forEach(m => {
        if (m.mvp_oficial && data.mvp_votos && data.mvp_votos[m.id_partido]) {
            let uMvpVote = String(data.mvp_votos[m.id_partido]).trim().toLowerCase();
            let mOficial = String(m.mvp_oficial).trim().toLowerCase();
            let dorOf = (mOficial.match(/#(\d+)/) || [])[1];
            let dorVo = (uMvpVote.match(/#(\d+)/) || [])[1];
            let isHit = false;
            if (dorOf && dorVo && dorOf === dorVo) isHit = true;
            else if (mOficial === uMvpVote || mOficial.includes(uMvpVote) || uMvpVote.includes(mOficial)) isHit = true;
            if (isHit) {
                mvpHitsInLiga++;
            }
        }
    });

    let pctMvpVal = (window.appData && window.appData.reglas && window.appData.reglas.pct_mvp !== undefined) ? window.appData.reglas.pct_mvp : 10;
    if (mvpHitsInLiga > 0) {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(120, pY + pillH + 16, W - 240, 38, 10);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#f3ce5e';
        ctx.textAlign = 'center';
        drawTextFitted(ctx, `⭐ Bonus MVP Activo: ¡+${pctMvpVal}% extra sumado a tu puntuación por acertar el MVP!`, W / 2, pY + pillH + 41, W - 260, 18, '800 sans-serif', 12);
    }
}

window.ejecutarCompartirTarjeta = async function() {
    const canvas = document.getElementById('shareCardCanvas');
    if (!canvas) return;

    // Construir texto descriptivo y URL según el modo
    const data = window.appData || {};
    const uName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (data.usuario || 'Jugador');
    let shareTitle = 'VCV Play 26/27';
    let shareText = '';
    const shareUrl = window.location.origin.includes('http') ? window.location.origin : 'https://vcvplay.com';
    let pctMvpVal = (data.reglas && data.reglas.pct_mvp !== undefined) ? data.reglas.pct_mvp : 10;

    if (window.currentShareMode === 'match') {
        const idPart = window.currentShareMatchId;
        let match = null;
        if (data.equipos) match = data.equipos.find(m => m.id_partido === idPart);
        if (!match && data.todos_partidos) match = data.todos_partidos.find(m => m.id_partido === idPart);

        if (match) {
            const locName = (match.ubicacion === 'LOCAL') ? match.equipo_local : match.rival;
            const visName = (match.ubicacion === 'LOCAL') ? match.rival : match.equipo_local;
            const pUser = (data.predicciones_usuario && data.predicciones_usuario[match.id_partido]) 
                       ? data.predicciones_usuario[match.id_partido] 
                       : ((data.mis_predicciones && data.mis_predicciones[match.id_partido]) || null);

            const hasOficialSets = Boolean(match.oficial_sets && String(match.oficial_sets).trim() !== '');
            const yaJugado = Boolean(hasOficialSets || match.estado === 'FINALIZADO' || (match.estado === 'CERRADO' && hasOficialSets));

            if (yaJugado) {
                if (pUser && pUser.sets) {
                    shareText = `🏐 Resultado final ${match.oficial_sets} en el ${locName} vs ${visName}. ¡Mi pronóstico fue ${pUser.sets}! Consulta el ranking en VCV Play:`;
                } else {
                    shareText = `🏐 Resultado final ${match.oficial_sets} en el ${locName} vs ${visName}. ¡Sigue las clasificaciones en VCV Play!`;
                }
            } else if (pUser && pUser.sets) {
                shareText = `🏐 ¡Mi pronóstico para el ${locName} vs ${visName} en VCV Play es ${pUser.sets}! ¿Te atreves a competir conmigo? 🏆 Regístrate gratis en:`;
            } else {
                shareText = `🏐 ¡Sigue el ${locName} vs ${visName} en VCV Play! Pronostica los resultados de los partidos del club y compite en el ranking:`;
            }
            shareTitle = `${locName} vs ${visName} | VCV Play`;
        } else {
            shareText = `🏐 ¡Echa un vistazo a mi pronóstico en VCV Play! Únete a la liga y compite con nosotros:`;
        }
    } else if (window.currentShareMode === 'mvp') {
        const idPart = window.currentShareMatchId;
        let match = null;
        if (data.equipos) match = data.equipos.find(m => m.id_partido === idPart);
        if (!match && data.todos_partidos) match = data.todos_partidos.find(m => m.id_partido === idPart);

        const locName = match ? ((match.ubicacion === 'LOCAL') ? match.equipo_local : match.rival) : 'VCV';
        const visName = match ? ((match.ubicacion === 'LOCAL') ? match.rival : match.equipo_local) : 'Rival';
        const uVote = (data.mvp_votos && idPart) ? data.mvp_votos[idPart] : null;

        if (match && match.mvp_oficial) {
            let oInf = window.parseCandInfo(match.mvp_oficial);
            let uMvpVote = String(uVote || '').trim().toLowerCase();
            let mOficial = String(match.mvp_oficial).trim().toLowerCase();
            let dorOf = (mOficial.match(/#(\d+)/) || [])[1];
            let dorVo = (uMvpVote.match(/#(\d+)/) || [])[1];
            let isHit = false;
            if (dorOf && dorVo && dorOf === dorVo) isHit = true;
            else if (mOficial === uMvpVote || mOficial.includes(uMvpVote) || uMvpVote.includes(mOficial)) isHit = true;

            if (isHit) {
                shareText = `👑 ¡Acerté el MVP VALCYL del partido ${locName} vs ${visName}! El ganador ha sido ${oInf.apodo} (+${pctMvpVal}% bonus ganado). ¡Juega tú también en VCV Play!`;
            } else {
                shareText = `👑 El MVP VALCYL del partido ${locName} vs ${visName} es ${oInf.apodo}. ¡Descubre todas las estadísticas y compite en VCV Play!`;
            }
            shareTitle = `MVP VALCYL: ${oInf.apodo} | ${locName} vs ${visName}`;
        } else if (uVote) {
            let vInf = window.parseCandInfo(uVote);
            shareText = `⭐ ¡Mi candidato a MVP VALCYL en el ${locName} vs ${visName} es ${vInf.dorsal ? '#' + vInf.dorsal + ' ' : ''}${vInf.apodo}! ¿Cuál es el tuyo? Vota en VCV Play:`;
            shareTitle = `Mi Voto MVP VALCYL: ${vInf.apodo} | VCV Play`;
        } else {
            shareText = `⭐ ¡Vota al MVP VALCYL del partido ${locName} vs ${visName} en VCV Play y llévate un +${pctMvpVal}% de bonus en tus puntos! Regístrate gratis en:`;
            shareTitle = `Vota al MVP VALCYL | ${locName} vs ${visName}`;
        }
    } else {
        const liga = window.currentShareLiga || (data.ligas ? data.ligas[0] : 'General');
        let pos = '-';
        let pts = '0';
        if (data.clasificaciones && data.clasificaciones[liga]) {
            const row = data.clasificaciones[liga].find(r => r.usuario === uName);
            if (row) {
                pos = '#' + row.posicion;
                pts = row.puntos;
            }
        }
        shareText = `🏆 ¡Voy ${pos} con ${pts} puntos en la Liga ${liga} de VCV Play! ¿Podrás superarme? Entra y juega gratis:`;
        shareTitle = `Ranking Liga ${liga} | VCV Play`;
    }

    canvas.toBlob(async function(blob) {
        if (!blob) {
            alert('No se pudo generar la imagen.');
            return;
        }
        const file = new File([blob], 'vcv_play_tarjeta.png', { type: 'image/png' });

        // Comprobar si el navegador soporta compartir archivos
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl,
                    files: [file]
                });
            } catch(e) {
                // Cancelado por el usuario o navegador
            }
        } else if (navigator.share) {
            // Si el navegador no soporta enviar archivo pero sí texto y URL
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl
                });
            } catch(e) {}
        } else {
            // Fallback en PC / navegador sin Web Share API: descargar imagen directamente
            window.descargarTarjetaCanvas();
        }
    }, 'image/png');
};

window.descargarTarjetaCanvas = function() {
    const canvas = document.getElementById('shareCardCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'vcv_play_tarjeta.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
};


window.seleccionarSetV2 = seleccionarSetV2;
window.sincronizarPuntosV2 = sincronizarPuntosV2;
window.actualizarEstadoEmpate = actualizarEstadoEmpate;
window.cambiarPuntosV2 = cambiarPuntosV2;
window.cambiarSignoV2 = cambiarSignoV2;
window.handleSaveOrModifyV2 = handleSaveOrModifyV2;
window.updateProgressBar = updateProgressBar;
if (typeof loadInsigniasUI === 'function') window.loadInsigniasUI = loadInsigniasUI;
