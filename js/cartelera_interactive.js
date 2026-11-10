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
        
        // Mapear alias amigables de pestañas
        if (sectionId === 'perfil' || sectionId === 'perfilSection') sectionId = 'enlacesRfevbSection';
        if (sectionId === 'partidos' || sectionId === 'cartelera') sectionId = 'carteleraSection';
        if (sectionId === 'ranking' || sectionId === 'clasificaciones') sectionId = 'clasificacionesSection';
        if (sectionId === 'calendario') sectionId = 'calendarioSection';
        if (sectionId === 'predicciones' || sectionId === 'historial') sectionId = 'historialSection';

        // Hide all sections in appSection
        const sections = ['carteleraSection', 'clasificacionesSection', 'historialSection', 'calendarioSection', 'enlacesRfevbSection', 'guestInfoSection', 'patrosGuestSection'];
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

        // Update active button state
        if (!btn) {
            btn = document.querySelector(`.nav-item-v2[onclick*="${sectionId}"]`);
        }
        document.querySelectorAll('.nav-item-v2').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        if (sectionId === 'enlacesRfevbSection') {
            if (typeof window.renderMyProfileCard === 'function') window.renderMyProfileCard();
            if (typeof window.renderUserPushSettings === 'function') window.renderUserPushSettings();
        }
        if (sectionId === 'calendarioSection' || sectionId === 'calendario') {
            if (typeof window.initCalendar === 'function') window.initCalendar();
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
    });

    function handleSaveOrModifyV2(idPart) {
        // Bloqueo preventivo de seguridad: comprobar si el plazo está vencido
        const matchObj = (window.appData && Array.isArray(window.appData.equipos)) ? window.appData.equipos.find(m => m.id_partido === idPart) : null;
        if (matchObj) {
            const nowTs = Date.now();
            const vencido = Boolean((matchObj.timestamp && matchObj.timestamp > 0 && nowTs >= matchObj.timestamp) || matchObj.estado === 'CERRADO' || matchObj.estado === 'FINALIZADO');
            if (vencido) {
                alert("🔒 El plazo para realizar o modificar predicciones de este partido ya ha finalizado.");
                return;
            }
        }
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
                    if (typeof window.vcvHaptic === 'function') window.vcvHaptic('success');
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

    window.renderMvpWidgetContent = function(idPart, cands, myVote, isClosed) {
        if (!Array.isArray(cands) || cands.length < 2 || cands.length > 3) return '';
        
        let votedIdx = -1;
        if (myVote) {
            votedIdx = cands.findIndex(c => (typeof window.isSameMvpPlayer === 'function')
                ? window.isSameMvpPlayer(c, myVote)
                : c === myVote);
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
            if (isClosed) {
                cardStateClass += ' is-closed-state';
            }

            let clickAttr = isClosed 
                ? 'onclick="return false;" style="cursor: default;" title="' + (isThisVoted ? 'Tu voto registrado' : 'Votación cerrada') + '"' 
                : `onclick="votarMvpPartido('${idPart}', '${cand.replace(/'/g, "\\'")}', ${idx}, '${encodeURIComponent(JSON.stringify(cands))}')" title="${isThisVoted ? 'Jugador votado' : 'Votar a ' + info.apodo}"`;

            return `
            <div class="mvp-card-slot" id="mvp-slot-${idPart}-${idx}" data-idx="${idx}" style="${cands.length === 2 ? 'max-width: 220px;' : ''}">
                <div class="mvp-card-btn ${cardStateClass}" id="mvp-cand-${idPart}-${idx}" ${clickAttr}>
                    <div class="mvp-photo-wrapper">
                        <img loading="lazy" src="${info.photoSrc}" alt="${info.apodo}" class="mvp-photo-img" onerror="window.handleJugadorImgError(this, ${info.dorsal || 0}, '${info.initials}');">
                        ${info.dorsal ? `<span class="mvp-dorsal-tag">#${info.dorsal}</span>` : ''}
                    </div>
                    <div class="mvp-name-label" title="${info.nombre || info.apodo}">${info.apodo}</div>
                    ${info.nombre && info.nombre.toLowerCase() !== info.apodo.toLowerCase() ? `<div style="font-size:0.67rem; color:var(--text-muted); text-align:center; line-height:1.2; word-break:normal; overflow-wrap:normal; width:100%; box-sizing:border-box; padding:0 8px; font-weight:600;">${info.nombre}</div>` : ''}
                    ${displayPos ? `<div class="mvp-sub-label">${displayPos}</div>` : ''}
                    ${isThisVoted ? '<span class="mvp-voted-badge">TU MVP VALCYL</span>' : (isClosed && !isVoted ? '<span class="mvp-voted-badge" style="background: rgba(255,255,255,0.15); color: #ccc; border: 1px solid rgba(255,255,255,0.25);">NOMINADO</span>' : '')}
                </div>
            </div>`;
        }).join('');

        let headerText = '⭐ Elige al MVP VALCYL del Partido';
        if (isClosed) {
            headerText = isVoted ? '🔒 Votación Cerrada · Tu Elección' : '🔒 Votación Cerrada · Nominados';
        } else if (isVoted) {
            headerText = '✨ Tu Voto para el MVP VALCYL';
        }

        let bottomPanelHtml = '';
        if (isClosed) {
            if (isVoted) {
                bottomPanelHtml = `
                <div class="mvp-bottom-confirmation-panel is-visible" id="mvp-panel-${idPart}" style="background: rgba(212, 175, 55, 0.08); border-color: rgba(212, 175, 55, 0.3);">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                        <div style="font-size: 1.3rem; flex-shrink: 0;">🔒</div>
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-size: 0.68rem; font-weight: 800; color: var(--secondary-color); text-transform: uppercase; letter-spacing: 0.5px;">
                                VOTACIÓN CERRADA · TU VOTO REGISTRADO
                            </div>
                            <div id="mvp-panel-text-${idPart}" style="font-size: 0.88rem; font-weight: 800; color: #fff; line-height: 1.25; word-break: break-word;">
                                ${votedInfo ? `${votedInfo.dorsal ? '#' + votedInfo.dorsal + ' ' : ''}${votedInfo.apodo && votedInfo.nombre && votedInfo.apodo.toLowerCase() !== votedInfo.nombre.toLowerCase() ? `${votedInfo.apodo} - ${votedInfo.nombre}` : (votedInfo.nombre || votedInfo.apodo)} ${votedInfo.posicion ? `(${votedInfo.posicion})` : ''}` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
            } else {
                bottomPanelHtml = `
                <div class="mvp-bottom-confirmation-panel is-visible" id="mvp-panel-${idPart}" style="background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15);">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                        <div style="font-size: 1.2rem; flex-shrink: 0;">🔒</div>
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-size: 0.68rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
                                PLAZO DE VOTACIÓN FINALIZADO
                            </div>
                            <div style="font-size: 0.82rem; font-weight: 700; color: #ddd; line-height: 1.25;">
                                Las votaciones para este partido han concluido.
                            </div>
                        </div>
                    </div>
                </div>`;
            }
        } else {
            bottomPanelHtml = `
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
        }

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

        // Comprobar si la votación para este partido está cerrada
        let pMatch = null;
        if (window.appData && Array.isArray(window.appData.equipos)) pMatch = window.appData.equipos.find(p => p.id_partido === idPart);
        if (!pMatch && window.appData && Array.isArray(window.appData.todos_partidos)) pMatch = window.appData.todos_partidos.find(p => p.id_partido === idPart);
        if (pMatch) {
            let cierreTs = pMatch.mvp_cierre_votacion_ts ? parseInt(pMatch.mvp_cierre_votacion_ts) : 0;
            let pubTs = pMatch.mvp_publicacion_ts ? parseInt(pMatch.mvp_publicacion_ts) : 0;
            if (!cierreTs && pubTs > 0) {
                let d = new Date(pubTs);
                if (d.getHours() === 12) cierreTs = pubTs;
                else { let d12 = new Date(pubTs); d12.setHours(12, 0, 0, 0); cierreTs = d12.getTime(); }
            }
            if ((cierreTs > 0 && Date.now() >= cierreTs) || (pMatch.mvp_oficial && (pubTs <= 0 || Date.now() >= pubTs))) {
                if (typeof mostrarToast === 'function') mostrarToast("Las votaciones para el MVP ya están cerradas.");
                return;
            }
        }

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
        if (typeof window.vcvHaptic === 'function') window.vcvHaptic('vote');

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
                if (typeof window.vcvHaptic === 'function') window.vcvHaptic('success');
                mostrarToast("¡Voto MVP registrado!");
            } else if (data && data.status === 'error') {
                mostrarToast(data.message || "Las votaciones para el MVP ya están cerradas.");
                if (window.appData && window.appData.mvp_votos) {
                    delete window.appData.mvp_votos[idPart];
                }
                if (typeof window.renderCarteleraHTML === 'function') {
                    window.renderCarteleraHTML(window.appData);
                }
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
        if (!data) return { mediaPuntos, mediaPos, recordJornada, recordPartido, desgloseHtml, numJornadas: (typeof jKeys !== 'undefined' ? jKeys.length : 0) };

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
                    const rawVote = data.mvp_votos[p.id_partido];
                    let isMvpHit = false;
                    if (typeof window.isSameMvpPlayer === 'function') {
                        isMvpHit = window.isSameMvpPlayer(p.mvp_oficial, rawVote);
                    } else {
                        let uMvpVote = String(rawVote).trim().toLowerCase();
                        let mOficial = String(p.mvp_oficial).trim().toLowerCase();
                        let dorOf = (mOficial.match(/#(\d+)/) || [])[1];
                        let dorVo = (uMvpVote.match(/#(\d+)/) || [])[1];
                        if (dorOf && dorVo) isMvpHit = (parseInt(dorOf, 10) === parseInt(dorVo, 10));
                        else isMvpHit = (mOficial === uMvpVote);
                    }
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

                return { mediaPuntos, mediaPos, recordJornada, recordPartido, desgloseHtml, numJornadas: (typeof jornadasJugadas !== 'undefined' ? jornadasJugadas.length : 0) };
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
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 9px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 6px;">
                            <span style="font-size:0.82rem; font-weight:800; color:var(--text-main);">Jornada ${j}</span>
                            <span style="font-weight:900; color:var(--secondary-color); font-size:0.95rem; font-family:'Space Grotesk',sans-serif;">+${ptsJ} pts</span>
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
                return { mediaPuntos, mediaPos, recordJornada, recordPartido: "-", desgloseHtml, numJornadas: (typeof jornadasJugadas !== 'undefined' ? jornadasJugadas.length : 0) };
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
                <button type="button" onclick="window.cerrarSesionApp()" title="Cerrar sesión" style="position: absolute; top: 14px; right: 14px; background: rgba(255, 71, 87, 0.12); border: 1px solid rgba(255, 71, 87, 0.35); color: #ff6b81; border-radius: 50%; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" onmouseover="this.style.background='rgba(255, 71, 87, 0.25)';" onmouseout="this.style.background='rgba(255, 71, 87, 0.12)';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                </button>
                <div style="width:96px; height:96px; border-radius:18px; background:linear-gradient(135deg, var(--vcv-morado), var(--vcv-dorado)); display:flex; align-items:center; justify-content:center; margin: 0 auto 12px; font-size: 2.2rem; font-weight: 900; color: #fff; overflow:hidden;">
                    ${avatarHtml}
                </div>
                <h3 style="margin:0 0 4px; font-size:1.25rem; font-weight:800; color:var(--text-main);">@${jugador}</h3>
                ${(nombreReal && nombreReal !== jugador) ? `<div style="font-size:0.88rem; color:var(--text-muted); margin-bottom:14px; font-weight:600;">${nombreReal}</div>` : `<div style="margin-bottom:14px;"></div>`}
                
                ${ligaSelectorPills}

                <div class="user-profile-stats-grid">
                    <div class="user-profile-stat-box">
                        <div class="user-profile-stat-label">Media Pts</div>
                        <div class="user-profile-stat-val" style="color:#f5c542;">${mediaPuntos}</div>
                    </div>
                    <div class="user-profile-stat-box">
                        <div class="user-profile-stat-label">Media Pos</div>
                        <div class="user-profile-stat-val" style="color:#fcfaff;">${mediaPos}</div>
                    </div>
                    <div class="user-profile-stat-box">
                        <div class="user-profile-stat-label" title="Récord de una jornada">Récord J.</div>
                        <div class="user-profile-stat-val" style="color:#10b981;">${recordJornada}</div>
                    </div>
                    <div class="user-profile-stat-box">
                        <div class="user-profile-stat-label" title="Récord en un partido">Récord Part.</div>
                        <div class="user-profile-stat-val" style="color:#38bdf8;">${recordPartido}</div>
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
        if (typeof window.renderUserPushSettings === 'function') {
            window.renderUserPushSettings();
        }
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
            <div class="user-profile-stats-grid">
                <div class="user-profile-stat-box">
                    <div class="user-profile-stat-label">Media Pts</div>
                    <div class="user-profile-stat-val" style="color:#f5c542;">${mediaPuntos}</div>
                </div>
                <div class="user-profile-stat-box">
                    <div class="user-profile-stat-label">Media Pos</div>
                    <div class="user-profile-stat-val" style="color:#fcfaff;">${mediaPos}</div>
                </div>
                <div class="user-profile-stat-box">
                    <div class="user-profile-stat-label" title="Récord de una jornada">Récord J.</div>
                    <div class="user-profile-stat-val" style="color:#10b981;">${recordJornada}</div>
                </div>
                <div class="user-profile-stat-box">
                    <div class="user-profile-stat-label" title="Récord en un partido">Récord Part.</div>
                    <div class="user-profile-stat-val" style="color:#38bdf8;">${recordPartido}</div>
                </div>
            </div>`;
        } else {
            statsGridHtml = `
            <div class="user-profile-stats-grid" style="grid-template-columns: repeat(3, 1fr);">
                <div class="user-profile-stat-box">
                    <div class="user-profile-stat-label">Media Pts</div>
                    <div class="user-profile-stat-val" style="color:#f5c542; font-size:1.15rem;">${mediaPuntos}</div>
                </div>
                <div class="user-profile-stat-box">
                    <div class="user-profile-stat-label">Media Pos</div>
                    <div class="user-profile-stat-val" style="color:#fcfaff; font-size:1.15rem;">${mediaPos}</div>
                </div>
                <div class="user-profile-stat-box">
                    <div class="user-profile-stat-label" title="Récord de una jornada">Récord J.</div>
                    <div class="user-profile-stat-val" style="color:#10b981; font-size:1.15rem;">${recordJornada}</div>
                </div>
            </div>`;
        }

        let desgloseTitle = isOwn ? `Desglose de Puntos (${ligaName ? 'Liga ' + ligaName : 'General'})` : `Desglose por Jornada (${ligaName ? 'Liga ' + ligaName : 'General'})`;
        let totalJornadasCount = statsResult.numJornadas || 0;
        let scrollIndicatorHtml = (!isOwn && totalJornadasCount > 3) ? `
            <div style="display:flex; align-items:center; justify-content:center; gap:5px; font-size:0.72rem; color:var(--text-muted); margin-top:6px; font-weight:600;">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--secondary-color);"><path d="m6 9 6 6 6-6"/></svg>
                <span>Desliza para ver más jornadas (${totalJornadasCount} en total)</span>
            </div>` : '';

        let htmlStats = `

            ${ligaPillsHtml}
            ${statsGridHtml}
            <div style="text-align: left; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${desgloseTitle}</h4>
                <div class="player-jornadas-scrollable" style="max-height: ${isOwn ? '220px' : '142px'}; overflow-y: auto; padding-right: 4px; box-sizing: border-box; scrollbar-width: thin; scrollbar-color: var(--secondary-color) rgba(255,255,255,0.05); -webkit-overflow-scrolling: touch;">
                    ${desgloseHtml}
                </div>
                ${scrollIndicatorHtml}
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
            let currUser = ranking.find(x => x.jugador === jugador) || ranking[currentArrayIdx];
            if (!prevUser || !currUser) {
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
                        <div style="font-weight: 800; font-size: 0.92rem; word-break:break-word; line-height:1.2;">@${r.jugador}</div>
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
                                <span class="rank-player-name" style="word-break:break-word; overflow-wrap:break-word; line-height:1.2; font-weight:700; color:var(--text-main); font-size:0.86rem;">@${r.jugador}</span>
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
                            card.classList.remove('is-hidden');
                            card.style.removeProperty('display');
                        } else {
                            card.classList.add('is-hidden');
                            card.style.setProperty('display', 'none', 'important');
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
window.currentShareMode = null; // 'match', 'jornada' o 'mvp'
window.currentShareFormat = 'square'; // 'square' (1080x1080) o 'story' (1080x1920)
window.currentShareMatchId = null;
window.currentShareLiga = null;

function ocultarControlesAdminModalTarjeta() {
    const winnerSelectorContainer = document.getElementById('shareMvpWinnerSelectorContainer');
    if (winnerSelectorContainer) winnerSelectorContainer.style.display = 'none';
    const formatSelectorContainer = document.getElementById('shareMvpFormatSelectorContainer');
    if (formatSelectorContainer) formatSelectorContainer.style.display = 'none';
    const btnAdminDl = document.getElementById('btnAdminShareDownloadPng');
    if (btnAdminDl) btnAdminDl.style.display = 'none';
    window.isMvpAdminClubCard = false;
    window.currentShareFormat = 'square';
    window.currentShareWinnerOverride = null;
    window.currentShareStatsOverride = null;
    window.currentShareCandidatesOverride = null;
}

function mostrarSelectorFormatoModalTarjeta(fmtDefault = 'square') {
    const safeFmt = (fmtDefault === 'story') ? 'story' : 'square';
    window.currentShareFormat = safeFmt;
    const formatSelectorContainer = document.getElementById('shareMvpFormatSelectorContainer');
    if (formatSelectorContainer) formatSelectorContainer.style.display = 'block';
    if (typeof window.syncMvpFormatUi === 'function') {
        window.syncMvpFormatUi(safeFmt, false);
    } else {
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
    }
}

if (typeof window.cambiarFormatoTarjeta !== 'function') {
    window.cambiarFormatoTarjeta = async function(fmt) {
        const safeFmt = (fmt === 'story') ? 'story' : 'square';
        window.currentShareFormat = safeFmt;
        if (typeof window.syncMvpFormatUi === 'function') {
            window.syncMvpFormatUi(safeFmt, Boolean(window.isMvpAdminClubCard));
        }
        if (typeof window.dibujarTarjetaCompartir === 'function') {
            await window.dibujarTarjetaCompartir();
        }
    };
}
if (typeof window.cambiarFormatoMvpTarjeta !== 'function') {
    window.cambiarFormatoMvpTarjeta = window.cambiarFormatoTarjeta;
}

window.closeShareCardModal = function() {
    const modal = document.getElementById('shareCardModal');
    if (modal) modal.style.display = 'none';
    ocultarControlesAdminModalTarjeta();
};

window.abrirModalCompartirPartido = function(idPart) {
    ocultarControlesAdminModalTarjeta();
    window.currentShareMode = 'match';
    window.currentShareMatchId = idPart;
    mostrarSelectorFormatoModalTarjeta('square');
    const ligaSelector = document.getElementById('shareLigaSelectorContainer');
    if (ligaSelector) ligaSelector.style.display = 'none';
    const modal = document.getElementById('shareCardModal');
    if (modal) modal.style.display = 'flex';
    window.dibujarTarjetaCompartir();
};

window.abrirModalCompartirMVP = function(idPart) {
    ocultarControlesAdminModalTarjeta();
    window.currentShareMode = 'mvp';
    window.currentShareMatchId = idPart;
    mostrarSelectorFormatoModalTarjeta('square');
    const ligaSelector = document.getElementById('shareLigaSelectorContainer');
    if (ligaSelector) ligaSelector.style.display = 'none';
    const modal = document.getElementById('shareCardModal');
    if (modal) modal.style.display = 'flex';
    window.dibujarTarjetaCompartir();
};

window.abrirModalCompartirJornada = function(ligaDefault) {
    ocultarControlesAdminModalTarjeta();
    window.currentShareMode = 'jornada';
    window.currentShareLiga = ligaDefault || (window.currentLiga || (window.appData && window.appData.ligas ? window.appData.ligas[0] : ''));
    mostrarSelectorFormatoModalTarjeta('square');

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

// Helper para cargar escudo de club (.webp con fallback automático a .png)
async function cargarEscudoCanvas(teamName) {
    const slug = String(teamName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!slug) return null;
    const imWebp = await cargarImagenCanvas(`files/images/escudos/${slug}.webp?v=20261110_v4`);
    if (imWebp) return imWebp;
    return await cargarImagenCanvas(`files/images/escudos/${slug}.png?v=20261110_v4`);
}

// Helper: Atmósfera nocturna full-bleed estilo estudio deportivo (sin cajas rígidas)
function pintarAtmosferaEditorialCanvas(ctx, W, H, opts = {}) {
    const isStory = H > W;
    const baseGrad = ctx.createLinearGradient(0, 0, 0, H);
    baseGrad.addColorStop(0, '#1e0b2b');
    baseGrad.addColorStop(0.42, '#13061c');
    baseGrad.addColorStop(0.76, '#0b0311');
    baseGrad.addColorStop(1, '#060109');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, W, H);

    // Foco dorado superior derecho (efecto estadio)
    const flareGold = ctx.createRadialGradient(W * 0.78, H * 0.14, 20, W * 0.78, H * 0.14, isStory ? 760 : 620);
    flareGold.addColorStop(0, 'rgba(212, 175, 55, 0.22)');
    flareGold.addColorStop(0.45, 'rgba(212, 175, 55, 0.06)');
    flareGold.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = flareGold;
    ctx.fillRect(0, 0, W, H);

    // Foco morado eléctrico izquierdo-central
    const flarePurple = ctx.createRadialGradient(W * 0.18, H * 0.44, 30, W * 0.18, H * 0.44, isStory ? 780 : 620);
    flarePurple.addColorStop(0, 'rgba(138, 43, 182, 0.28)');
    flarePurple.addColorStop(0.55, 'rgba(93, 23, 137, 0.10)');
    flarePurple.addColorStop(1, 'rgba(93, 23, 137, 0)');
    ctx.fillStyle = flarePurple;
    ctx.fillRect(0, 0, W, H);

    if (opts.secondaryAccentRgb) {
        const flareBottom = ctx.createRadialGradient(W * 0.72, H * 0.76, 20, W * 0.72, H * 0.76, isStory ? 620 : 480);
        flareBottom.addColorStop(0, `rgba(${opts.secondaryAccentRgb}, 0.13)`);
        flareBottom.addColorStop(0.55, `rgba(${opts.secondaryAccentRgb}, 0.04)`);
        flareBottom.addColorStop(1, `rgba(${opts.secondaryAccentRgb}, 0)`);
        ctx.fillStyle = flareBottom;
        ctx.fillRect(0, 0, W, H);
    }

    // Bandas diagonales arquitectónicas sutiles (dinamismo deportivo)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.beginPath();
    ctx.moveTo(W * 0.36, 0);
    ctx.lineTo(W * 0.78, 0);
    ctx.lineTo(W * 0.22, H);
    ctx.lineTo(-W * 0.20, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.05)';
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 220, 0);
        ctx.lineTo(i * 220 - (isStory ? 520 : 340), H);
        ctx.stroke();
    }
    ctx.restore();

    // Ticks minimalistas en las 4 esquinas (detalle editorial sin caja cerrada)
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.36)';
    ctx.lineWidth = 2.5;
    const m = isStory ? 34 : 26;
    const tick = 26;
    ctx.beginPath(); ctx.moveTo(m, m + tick); ctx.lineTo(m, m); ctx.lineTo(m + tick, m); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - m - tick, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + tick); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m, H - m - tick); ctx.lineTo(m, H - m); ctx.lineTo(m + tick, H - m); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - m - tick, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - tick); ctx.stroke();
    ctx.restore();
}

function pintarFondoEstadioCanvas(ctx, W, H) {
    pintarAtmosferaEditorialCanvas(ctx, W, H);
}

// Helpers vectoriales nítidos para Canvas (evita emojis borrosos del sistema)
function drawVectorCrown(ctx, cx, cy, w, h, color) {
    ctx.save();
    ctx.fillStyle = color;
    const hw = w / 2, hh = h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy + hh * 0.45);
    ctx.lineTo(cx - hw * 0.92, cy - hh * 0.72);
    ctx.lineTo(cx - hw * 0.42, cy - hh * 0.05);
    ctx.lineTo(cx, cy - hh * 0.95);
    ctx.lineTo(cx + hw * 0.42, cy - hh * 0.05);
    ctx.lineTo(cx + hw * 0.92, cy - hh * 0.72);
    ctx.lineTo(cx + hw, cy + hh * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - hw * 0.88, cy + hh * 0.62, hw * 1.76, Math.max(2, h * 0.18));
    ctx.restore();
}

function drawVectorStar(ctx, cx, cy, outerR, color) {
    ctx.save();
    ctx.fillStyle = color;
    const innerR = outerR * 0.44;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
        const rad = (k % 2 === 0) ? outerR : innerR;
        const ang = -Math.PI / 2 + (k * Math.PI) / 5;
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawVectorTarget(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.8, r * 0.18);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.56, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, r * 0.22), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawVectorTrophy(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.8, size * 0.12);
    const hs = size / 2;
    // Copa
    ctx.beginPath();
    ctx.moveTo(cx - hs * 0.72, cy - hs * 0.72);
    ctx.lineTo(cx + hs * 0.72, cy - hs * 0.72);
    ctx.quadraticCurveTo(cx + hs * 0.66, cy + hs * 0.20, cx, cy + hs * 0.30);
    ctx.quadraticCurveTo(cx - hs * 0.66, cy + hs * 0.20, cx - hs * 0.72, cy - hs * 0.72);
    ctx.fill();
    // Asas
    ctx.beginPath();
    ctx.arc(cx - hs * 0.74, cy - hs * 0.36, hs * 0.28, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + hs * 0.74, cy - hs * 0.36, hs * 0.28, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    // Tallo + Base
    ctx.fillRect(cx - hs * 0.12, cy + hs * 0.28, hs * 0.24, hs * 0.36);
    ctx.fillRect(cx - hs * 0.48, cy + hs * 0.64, hs * 0.96, hs * 0.22);
    ctx.restore();
}

function drawVectorCheck(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, r * 0.20);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.44, cy + r * 0.04);
    ctx.lineTo(cx - r * 0.10, cy + r * 0.38);
    ctx.lineTo(cx + r * 0.46, cy - r * 0.34);
    ctx.stroke();
    ctx.restore();
}

function drawVectorLock(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    const w = size * 0.78, h = size * 0.56;
    ctx.lineWidth = Math.max(1.8, size * 0.14);
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.32, w * 0.30, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h * 0.18, w, h, Math.max(2, size * 0.14));
    ctx.fill();
    ctx.restore();
}

function drawVectorFlame(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    const h = size;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.55);
    ctx.bezierCurveTo(cx + h * 0.48, cy - h * 0.08, cx + h * 0.42, cy + h * 0.45, cx, cy + h * 0.52);
    ctx.bezierCurveTo(cx - h * 0.42, cy + h * 0.45, cx - h * 0.48, cy - h * 0.08, cx, cy - h * 0.55);
    ctx.fill();
    ctx.restore();
}

function drawEditorialHeaderCanvas(ctx, W, H, vcvCrest, rightPrimary, rightSecondary, rightColor = '#f3ce5e') {
    const isStory = H > W;
    const marginX = isStory ? 68 : 56;
    const topY = isStory ? 122 : 48;

    let topBrandX = marginX;
    if (vcvCrest) {
        const crestS = isStory ? 42 : 40;
        drawImageContain(ctx, vcvCrest, marginX - 2, topY, crestS, crestS);
        topBrandX = marginX + crestS + 10;
    }

    ctx.fillStyle = '#d4af37';
    ctx.font = `900 ${isStory ? 25 : 24}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('VCV PLAY', topBrandX, topY + 26);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.font = `700 ${isStory ? 17 : 15}px sans-serif`;
    ctx.fillText('TEMPORADA 2026/2027', topBrandX, topY + (isStory ? 48 : 45));

    if (rightPrimary) {
        ctx.fillStyle = rightColor;
        ctx.textAlign = 'right';
        drawTextFitted(ctx, rightPrimary, W - marginX, topY + (rightSecondary ? 24 : 30), 390, isStory ? 22 : 22, '900 "Space Grotesk", sans-serif', 14);
    }
    if (rightSecondary) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.textAlign = 'right';
        drawTextFitted(ctx, rightSecondary, W - marginX, topY + (isStory ? 47 : 44), 390, isStory ? 16 : 15, '700 sans-serif', 12);
    }
}

function drawEditorialFooterCanvas(ctx, W, H, vcvCrest) {
    const isStory = H > W;
    const midX = W / 2;
    const footY = isStory ? 1726 : 1034;
    const footerTxt = 'VALLADOLID CLUB VOLEIBOL   ·   VCVPLAY.COM';
    ctx.font = `800 ${isStory ? 19 : 17}px "Space Grotesk", sans-serif`;
    const footW = ctx.measureText(footerTxt).width;
    if (vcvCrest) {
        const iconSize = isStory ? 24 : 21;
        const footTotal = iconSize + 11 + footW;
        const footStart = midX - footTotal / 2;
        ctx.save();
        ctx.globalAlpha = 0.65;
        drawImageContain(ctx, vcvCrest, footStart, footY - (iconSize * 0.76), iconSize, iconSize);
        ctx.restore();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.56)';
        ctx.textAlign = 'left';
        ctx.fillText(footerTxt, footStart + iconSize + 11, footY);
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.56)';
        ctx.textAlign = 'center';
        ctx.fillText(footerTxt, midX, footY);
    }
}

window.dibujarTarjetaCompartir = async function() {
    const canvas = document.getElementById('shareCardCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const isStory = (window.currentShareFormat === 'story');
    const W = 1080;
    const H = isStory ? 1920 : 1080;
    canvas.width = W;
    canvas.height = H;

    const data = window.appData || {};

    let uName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (window.currentUser || (data.usuario || ''));
    if (!uName || uName === 'Invitado') {
        try {
            const ses = JSON.parse(localStorage.getItem('vcv_saved_session') || '{}');
            if (ses.usuario) uName = ses.usuario;
        } catch(e) {}
    }
    if (!uName) uName = 'Jugador';
    const nReal = data.nombre_real || (uName !== 'Jugador' && uName !== 'Invitado' ? uName : '');

    if (window.currentShareMode === 'match') {
        await dibujarTarjetaPartidoCanvas(ctx, W, H, uName, nReal, data);
    } else if (window.currentShareMode === 'mvp') {
        if (isStory) {
            await dibujarTarjetaMvpStoryCanvas(ctx, W, H, data, uName, nReal);
        } else {
            await dibujarTarjetaMvpCanvas(ctx, W, H, uName, nReal, data);
        }
    } else {
        await dibujarTarjetaJornadaCanvas(ctx, W, H, uName, nReal, data);
    }
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

// Helper para dibujar recortes de jugadores alineados abajo (object-position: bottom center)
function drawImageContainBottom(ctx, img, x, y, maxW, maxH) {
    if (!img) return;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const nw = img.width * ratio;
    const nh = img.height * ratio;
    const nx = x + (maxW - nw) / 2;
    const ny = y + (maxH - nh);
    ctx.drawImage(img, nx, ny, nw, nh);
}

// Helper para dibujar recortes de jugadores disolviendo suavemente solo su borde inferior (sin rectángulos oscuros sobre el fondo)
function drawImageContainBottomFaded(ctx, img, x, y, maxW, maxH, fadeStartRatio = 0.70, fadeEndRatio = 0.97) {
    if (!img) return;
    const iw = img.naturalWidth || img.width || 0;
    const ih = img.naturalHeight || img.height || 0;
    if (!iw || !ih) return;
    const ratio = Math.min(maxW / iw, maxH / ih);
    const nw = Math.round(iw * ratio);
    const nh = Math.round(ih * ratio);
    const nx = Math.round(x + (maxW - nw) / 2);
    const ny = Math.round(y + (maxH - nh));

    try {
        const off = document.createElement('canvas');
        off.width = Math.max(1, nw);
        off.height = Math.max(1, nh);
        const octx = off.getContext('2d');
        octx.clearRect(0, 0, off.width, off.height);
        octx.drawImage(img, 0, 0, off.width, off.height);

        octx.globalCompositeOperation = 'destination-out';
        const fadeY1 = Math.floor(off.height * fadeStartRatio);
        const fadeY2 = Math.max(fadeY1 + 2, Math.ceil(off.height * fadeEndRatio));
        const maskGrad = octx.createLinearGradient(0, fadeY1, 0, fadeY2);
        maskGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        maskGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.22)');
        maskGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.68)');
        maskGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
        octx.fillStyle = maskGrad;
        octx.fillRect(0, fadeY1, off.width, off.height - fadeY1);
        octx.globalCompositeOperation = 'source-over';

        ctx.drawImage(off, nx, ny, nw, nh);
    } catch (e) {
        ctx.drawImage(img, nx, ny, nw, nh);
    }
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

function drawEditorialRule(ctx, x1, x2, y, alphaMid = 0.45, lineWidth = 1.5, alphaEdge = 0) {
    const grad = ctx.createLinearGradient(x1, 0, x2, 0);
    grad.addColorStop(0, `rgba(212, 175, 55, ${alphaEdge})`);
    grad.addColorStop(0.5, `rgba(212, 175, 55, ${alphaMid})`);
    grad.addColorStop(1, `rgba(212, 175, 55, ${alphaEdge})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
}

function drawTextWrappedCentered(ctx, text, cx, startY, maxW, lineH, baseFontSize, fontSpec = '900 "Space Grotesk", sans-serif', minFontSize = 14, maxLines = 2) {
    const raw = String(text || '').trim();
    if (!raw) return 0;
    let weight = 'normal', family = fontSpec;
    const parts = fontSpec.trim().split(/\s+/);
    if (parts.length > 1 && (/^(normal|bold|bolder|lighter|[1-9]00)$/i.test(parts[0]))) {
        weight = parts[0];
        family = parts.slice(1).join(' ');
    }
    ctx.textAlign = 'center';
    ctx.font = `${weight} ${baseFontSize}px ${family}`;
    if (ctx.measureText(raw).width <= maxW || maxLines <= 1) {
        drawTextFitted(ctx, raw, cx, startY, maxW, baseFontSize, fontSpec, minFontSize);
        return 1;
    }

    const words = raw.split(/\s+/);
    if (words.length >= 2 && maxLines >= 2) {
        let bestSplit = -1;
        let bestDiff = Infinity;
        for (let i = 1; i < words.length; i++) {
            const l1 = words.slice(0, i).join(' ');
            const l2 = words.slice(i).join(' ');
            const w1 = ctx.measureText(l1).width;
            const w2 = ctx.measureText(l2).width;
            const diff = Math.abs(w1 - w2) + Math.max(0, Math.max(w1, w2) - maxW) * 3;
            if (diff < bestDiff) {
                bestDiff = diff;
                bestSplit = i;
            }
        }
        if (bestSplit > 0) {
            const line1 = words.slice(0, bestSplit).join(' ');
            const line2 = words.slice(bestSplit).join(' ');
            // Fit font so both lines look harmonious
            let sz = baseFontSize;
            ctx.font = `${weight} ${sz}px ${family}`;
            while (sz > minFontSize && (ctx.measureText(line1).width > maxW || ctx.measureText(line2).width > maxW)) {
                sz -= 1;
                ctx.font = `${weight} ${sz}px ${family}`;
            }
            const usedFontSpec = `${weight} ${family}`;
            drawTextFitted(ctx, line1, cx, startY, maxW, sz, usedFontSpec, minFontSize);
            drawTextFitted(ctx, line2, cx, startY + lineH, maxW, sz, usedFontSpec, minFontSize);
            return 2;
        }
    }
    drawTextFitted(ctx, raw, cx, startY, maxW, baseFontSize, fontSpec, minFontSize);
    return 1;
}

async function loadUserAvatarEntry(data, targetUser) {
    const cleanUser = String(targetUser || 'J').trim();
    const initials = (cleanUser.substring(0, 2) || 'VC').toUpperCase();
    const badges = (data && data.insignias && data.insignias[cleanUser]) ? data.insignias[cleanUser] : [];
    const avatarBadge = badges.find(b => b && b.type === 'avatar' && b.emoji);
    const customBadge = badges.find(b => b && b.type === 'custom' && b.emoji);
    const picked = avatarBadge || customBadge;
    if (!picked || !picked.emoji) return { img: null, emoji: null, initials };

    let raw = String(picked.emoji).trim();
    if (typeof sanitizeImgUrl === 'function') raw = sanitizeImgUrl(raw);
    const lower = raw.toLowerCase();
    const isImageRef = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.svg') || lower.endsWith('.gif') || lower.startsWith('http') || lower.startsWith('data:image/');
    if (isImageRef) {
        const src = (raw.includes('/') || raw.startsWith('http') || raw.startsWith('data:image/')) ? raw : ('files/images/' + raw);
        const img = await cargarImagenCanvas(src);
        return { img, emoji: null, initials };
    }
    return { img: null, emoji: raw, initials };
}

function createTintedLogoCanvas(img, color) {
    if (!img) return null;
    try {
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if (!w || !h) return null;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const octx = off.getContext('2d');
        octx.clearRect(0, 0, w, h);
        octx.drawImage(img, 0, 0, w, h);
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = color;
        octx.fillRect(0, 0, w, h);
        octx.globalCompositeOperation = 'source-over';
        return off;
    } catch (e) {
        return img;
    }
}

function drawArcedText(ctx, text, cx, cy, textRadius, isTop, font, color, extraTrackingPx = 1.6) {
    const str = String(text || '');
    if (!str) return;
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = Array.from(str);
    const widths = chars.map(ch => ctx.measureText(ch).width);
    const totalLen = widths.reduce((a, b) => a + b, 0) + extraTrackingPx * Math.max(0, chars.length - 1);
    const totalTheta = totalLen / Math.max(1, textRadius);

    if (isTop) {
        let theta = -Math.PI / 2 - totalTheta / 2;
        for (let i = 0; i < chars.length; i++) {
            const w = widths[i];
            theta += (w / 2) / textRadius;
            const px = cx + Math.cos(theta) * textRadius;
            const py = cy + Math.sin(theta) * textRadius;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(theta + Math.PI / 2);
            ctx.fillText(chars[i], 0, 0);
            ctx.restore();
            theta += (w / 2 + extraTrackingPx) / textRadius;
        }
    } else {
        let theta = Math.PI / 2 + totalTheta / 2;
        for (let i = 0; i < chars.length; i++) {
            const w = widths[i];
            theta -= (w / 2) / textRadius;
            const px = cx + Math.cos(theta) * textRadius;
            const py = cy + Math.sin(theta) * textRadius;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(theta - Math.PI / 2);
            ctx.fillText(chars[i], 0, 0);
            ctx.restore();
            theta -= (w / 2 + extraTrackingPx) / textRadius;
        }
    }
    ctx.restore();
}

function drawValcylMvpStamp(ctx, cx, cy, r, angleDeg, valcylCleanImg, rawCat) {
    const k = r / 80;
    const cleanWhiteLogo = createTintedLogoCanvas(valcylCleanImg, '#ffffff') || valcylCleanImg;
    const catUpper = String(rawCat || 'SUPERLIGA 2').toUpperCase();
    const bottomTxt = (catUpper.includes('SM2') || catUpper.includes('SUPERLIGA') || catUpper === 'VOLEIBOL')
        ? 'SUPERLIGA 2'
        : catUpper.slice(0, 16);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angleDeg * Math.PI) / 180);

    // Base oscura traslúcida con sombra proyectada sobre el jugador
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
    ctx.shadowBlur = Math.round(22 * k);
    ctx.shadowOffsetY = Math.round(6 * k);
    ctx.fillStyle = 'rgba(14, 4, 24, 0.88)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Brillo radial metálico interior
    const innerSheen = ctx.createRadialGradient(-r * 0.28, -r * 0.28, r * 0.05, 0, 0, r);
    innerSheen.addColorStop(0, 'rgba(243, 206, 94, 0.16)');
    innerSheen.addColorStop(0.55, 'rgba(93, 23, 137, 0.12)');
    innerSheen.addColorStop(1, 'rgba(10, 3, 16, 0.06)');
    ctx.fillStyle = innerSheen;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Anillo exterior metálico dorado
    const ringGrad = ctx.createLinearGradient(-r, -r, r, r);
    ringGrad.addColorStop(0, '#ffe694');
    ringGrad.addColorStop(0.35, '#d4af37');
    ringGrad.addColorStop(0.7, '#9c7310');
    ringGrad.addColorStop(1, '#f3ce5e');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = Math.max(2.4, 2.8 * k);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Pista fina exterior e interior
    const rTrackOuter = r - 5.5 * k;
    const rIn = r * 0.63;
    ctx.strokeStyle = 'rgba(243, 206, 94, 0.34)';
    ctx.lineWidth = Math.max(1, 1.1 * k);
    ctx.beginPath();
    ctx.arc(0, 0, rTrackOuter, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(22, 7, 38, 0.56)';
    ctx.beginPath();
    ctx.arc(0, 0, rIn, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(243, 206, 94, 0.72)';
    ctx.lineWidth = Math.max(1.2, 1.5 * k);
    ctx.beginPath();
    ctx.arc(0, 0, rIn, 0, Math.PI * 2);
    ctx.stroke();

    // Estrellas separadoras en el ecuador del anillo
    const textR = (rTrackOuter + rIn) * 0.5;
    drawVectorStar(ctx, -textR, 0, 4.2 * k, '#ffd700');
    drawVectorStar(ctx, textR, 0, 4.2 * k, '#ffd700');

    // Tipografía curva superior e inferior
    drawArcedText(
        ctx,
        'PREMIO MVP',
        0,
        0,
        textR,
        true,
        `900 ${Math.round(12 * k)}px "Space Grotesk", sans-serif`,
        '#ffd700',
        2.1 * k
    );
    drawArcedText(
        ctx,
        bottomTxt,
        0,
        0,
        textR,
        false,
        `900 ${Math.round(10.5 * k)}px "Space Grotesk", sans-serif`,
        'rgba(255, 255, 255, 0.92)',
        1.7 * k
    );

    // Logotipo central VALCYL en blanco nítido (ligero ajuste óptico arriba por el ancho inferior de VALVULERÍA)
    if (cleanWhiteLogo) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 215, 0, 0.25)';
        ctx.shadowBlur = Math.round(10 * k);
        const logoW = rIn * 1.32;
        const logoH = rIn * 1.15;
        drawImageContain(ctx, cleanWhiteLogo, -logoW / 2, -logoH / 2 - rIn * 0.05, logoW, logoH);
        ctx.restore();
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.round(18 * k)}px "Space Grotesk", sans-serif`;
        ctx.fillText('VALCYL', 0, -4 * k);
        ctx.fillStyle = '#f3ce5e';
        ctx.font = `800 ${Math.round(8.5 * k)}px "Space Grotesk", sans-serif`;
        ctx.fillText('VALVULERÍA', 0, 14 * k);
    }

    ctx.restore();
}

async function dibujarTarjetaMvpCanvas(ctx, W, H, uName, nReal, data) {
    const idPart = window.currentShareMatchId;
    let match = null;
    if (data.equipos) match = data.equipos.find(m => m.id_partido === idPart);
    if (!match && data.todos_partidos) match = data.todos_partidos.find(m => m.id_partido === idPart);
    if (!match) return;

    const midX = W / 2;
    const locName = (match.ubicacion === 'LOCAL') ? match.equipo_local : match.rival;
    const visName = (match.ubicacion === 'LOCAL') ? match.rival : match.equipo_local;
    const cat = (match.categoria || 'SUPERLIGA 2').toUpperCase();
    const jNum = match.jornada_eq || match.ronda_global || '-';
    const isClubCard = Boolean(window.isMvpAdminClubCard);

    const cands = (isClubCard && Array.isArray(window.currentShareCandidatesOverride) && window.currentShareCandidatesOverride.length > 0)
        ? window.currentShareCandidatesOverride
        : (Array.isArray(match.mvp_candidatos) ? match.mvp_candidatos.filter(Boolean) : []);
    const myVote = isClubCard ? null : ((data.mvp_votos && data.mvp_votos[idPart]) ? data.mvp_votos[idPart] : null);
    const isProclaimed = isClubCard ? true : !!match.mvp_oficial;
    const winnerOficial = (isClubCard && window.currentShareWinnerOverride)
        ? window.currentShareWinnerOverride
        : (match.mvp_oficial || (cands.length > 0 ? cands[0] : null));

    let primaryInfo = null;
    let isHit = false;
    if (isProclaimed) {
        primaryInfo = window.parseCandInfo(winnerOficial || match.mvp_oficial || (cands.length > 0 ? cands[0] : ''));
        if (myVote && !isClubCard) {
            const targetWinner = winnerOficial || match.mvp_oficial;
            if (typeof window.isSameMvpPlayer === 'function') {
                isHit = window.isSameMvpPlayer(targetWinner, myVote);
            } else {
                const dorOf = (String(targetWinner).match(/#(\d+)/) || [])[1];
                const dorVo = (String(myVote).match(/#(\d+)/) || [])[1];
                isHit = (dorOf && dorVo) ? (parseInt(dorOf, 10) === parseInt(dorVo, 10)) : (String(targetWinner).trim().toLowerCase() === String(myVote).trim().toLowerCase());
            }
        }
    } else if (myVote) {
        primaryInfo = window.parseCandInfo(myVote);
    } else if (cands.length > 0) {
        primaryInfo = window.parseCandInfo(cands[0]);
    }

    const rawStats = (isClubCard && Array.isArray(window.currentShareStatsOverride) && window.currentShareStatsOverride.length > 0)
        ? window.currentShareStatsOverride
        : (Array.isArray(match.mvp_stats) ? match.mvp_stats : []);
    const statsToShow = isProclaimed ? rawStats.filter(s => s && String(s).trim() !== '').slice(0, 4) : [];
    const statsCount = statsToShow.length;

    const candInfos = cands.slice(0, 3).map(c => ({ raw: c, info: window.parseCandInfo(c) }));
    const [valcylLogoImg, valcylCleanLogoImg, vcvCrestPrimary, vcvCrestFallback, imgLoc, imgVis, mainImgRaw, mainImgFallback, ...candImgs] = await Promise.all([
        cargarImagenCanvas('files/images/valcyl_logo.png'),
        cargarImagenCanvas('files/images/valcyl_logo_lavender.png'),
        cargarImagenCanvas('files/images/escudos/valcyl_vcv.webp'),
        cargarImagenCanvas('files/images/logo_vcv_circle.png'),
        cargarEscudoCanvas(locName),
        cargarEscudoCanvas(visName),
        primaryInfo ? cargarImagenCanvas(primaryInfo.photoSrc) : Promise.resolve(null),
        (primaryInfo && primaryInfo.dorsal) ? cargarImagenCanvas(`files/images/jugadores/dorsal_${primaryInfo.dorsal}.jpeg`) : Promise.resolve(null),
        ...candInfos.map(async (ci) => {
            let im = await cargarImagenCanvas(ci.info.photoSrc);
            if (!im && ci.info.dorsal) im = await cargarImagenCanvas(`files/images/jugadores/dorsal_${ci.info.dorsal}.jpeg`);
            return im;
        })
    ]);
    const valcylStampLogo = valcylCleanLogoImg || valcylLogoImg;
    const mainImg = mainImgRaw || mainImgFallback;
    const vcvCrest = vcvCrestPrimary || vcvCrestFallback;

    // 1. ATMÓSFERA FULL-BLEED + CABECERA
    pintarAtmosferaEditorialCanvas(ctx, W, H, { secondaryAccentRgb: isHit ? '46, 204, 113' : null });
    const rightHdr1 = isClubCard ? `${cat}  ·  JORNADA ${jNum}` : ((uName && uName !== 'Invitado' && uName !== 'Jugador') ? '@' + uName : `${cat}  ·  JORNADA ${jNum}`);
    const rightHdr2 = isClubCard ? 'PREMIO MVP VALCYL' : ((uName && uName !== 'Invitado' && uName !== 'Jugador') ? `${cat}  ·  JORNADA ${jNum}` : '');
    drawEditorialHeaderCanvas(ctx, W, H, vcvCrest, rightHdr1, rightHdr2);

    // 2. ESCUDOS EN EL FONDO DEL RESULTADO + MARCADOR FLOTANTE (Y = 104..234)
    const crestSize = 148;
    const crestY = 102;
    if (imgLoc) {
        ctx.save(); ctx.globalAlpha = 0.14;
        drawImageContain(ctx, imgLoc, 56, crestY, crestSize, crestSize);
        ctx.restore();
    }
    if (imgVis) {
        ctx.save(); ctx.globalAlpha = 0.14;
        drawImageContain(ctx, imgVis, W - 56 - crestSize, crestY, crestSize, crestSize);
        ctx.restore();
    }

    const hasScore = Boolean(match.oficial_sets && String(match.oficial_sets).trim() !== '');
    const scoreY = 172;
    const locShort = String(locName || 'VCV').trim().toUpperCase();
    const visShort = String(visName || 'RIVAL').trim().toUpperCase();

    ctx.save();
    ctx.shadowColor = 'rgba(9, 2, 14, 0.96)';
    ctx.shadowBlur = 22;
    if (hasScore) {
        const cleanScore = String(match.oficial_sets).replace(/\s*-\s*/, ' – ');
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        drawTextFitted(ctx, cleanScore, midX, scoreY + 6, 190, 56, '900 "Space Grotesk", sans-serif', 36);
        const halfW = Math.min(95, Math.ceil(ctx.measureText(cleanScore).width / 2));
        const off = halfW + 30;
        const maxTW = midX - off - 58;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.textAlign = 'right';
        drawTextFitted(ctx, locShort, midX - off, scoreY - 2, maxTW, 24, '900 "Space Grotesk", sans-serif', 14);
        ctx.textAlign = 'left';
        drawTextFitted(ctx, visShort, midX + off, scoreY - 2, maxTW, 24, '900 "Space Grotesk", sans-serif', 14);

        if (match.oficial_parciales && String(match.oficial_parciales).trim() !== '') {
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(243, 206, 94, 0.88)';
            ctx.textAlign = 'center';
            const cleanParcs = String(match.oficial_parciales).split(/\s*,\s*/).join('   ·   ');
            drawTextFitted(ctx, cleanParcs, midX, scoreY + 34, 620, 15, '700 "Space Grotesk", sans-serif', 11);
        }
    } else {
        ctx.fillStyle = '#d4af37';
        ctx.textAlign = 'center';
        ctx.font = '900 38px "Space Grotesk", sans-serif';
        ctx.fillText('VS', midX, scoreY + 2);
        const halfW = Math.ceil(ctx.measureText('VS').width / 2);
        const off = halfW + 28;
        const maxTW = midX - off - 58;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.textAlign = 'right';
        drawTextFitted(ctx, locShort, midX - off, scoreY - 2, maxTW, 24, '900 "Space Grotesk", sans-serif', 14);
        ctx.textAlign = 'left';
        drawTextFitted(ctx, visShort, midX + off, scoreY - 2, maxTW, 24, '900 "Space Grotesk", sans-serif', 14);

        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
        ctx.textAlign = 'center';
        drawTextFitted(ctx, isProclaimed ? 'MVP VALCYL DE LA JORNADA' : 'VOTACIÓN MVP VALCYL ABIERTA', midX, scoreY + 32, 520, 14, '700 "Space Grotesk", sans-serif', 11);
    }
    ctx.restore();

    // Regla dorada tras marcador
    const topRuleGrad = ctx.createLinearGradient(56, 0, W - 56, 0);
    topRuleGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    topRuleGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.45)');
    topRuleGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.strokeStyle = topRuleGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(56, 228); ctx.lineTo(W - 56, 228); ctx.stroke();

    // 3. ESCENARIO HERO ASIMÉTRICO: JUGADOR SIN RECUADRO (IZQ) + EDITORIAL (DER)
    const heroZoneTop = 236;
    const heroFadeBottom = 772;
    const heroBoxH = heroFadeBottom - heroZoneTop;
    const leftCenterX = 272;

    // Tipografía fantasma gigante detrás del jugador
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 205px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.fillText('MVP', leftCenterX, 428);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeText('MVP', leftCenterX, 428);

    if (primaryInfo && primaryInfo.dorsal) {
        ctx.font = '900 235px "Space Grotesk", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(212, 175, 55, 0.032)';
        ctx.fillText('#' + primaryInfo.dorsal, 512, 650);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.13)';
        ctx.lineWidth = 2;
        ctx.strokeText('#' + primaryInfo.dorsal, 512, 650);
    }
    ctx.restore();

    // Foco luminoso tras la silueta
    const heroGlow = ctx.createRadialGradient(leftCenterX, heroZoneTop + heroBoxH * 0.44, 20, leftCenterX, heroZoneTop + heroBoxH * 0.46, 320);
    heroGlow.addColorStop(0, 'rgba(212, 175, 55, 0.28)');
    heroGlow.addColorStop(0.45, 'rgba(138, 43, 182, 0.26)');
    heroGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = heroGlow;
    ctx.fillRect(0, heroZoneTop, 560, heroBoxH);

    if (mainImg) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 26;
        ctx.shadowOffsetY = 6;
        drawImageContainBottomFaded(ctx, mainImg, 18, heroZoneTop + 8, 502, heroBoxH - 8, 0.72, 0.99);
        ctx.restore();
    } else if (primaryInfo) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.font = '900 210px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(primaryInfo.initials, leftCenterX, heroZoneTop + 340);
    }

    // Sello inclinado MVP VALCYL sobre el borde del jugador
    drawValcylMvpStamp(ctx, 424, 666, 80, -13, valcylStampLogo, cat);

    // COLUMNA EDITORIAL DERECHA (X = 540..1024)
    const colX = 540;
    const colW = W - 56 - colX; // 484px

    // Eyebrow vectorial + título
    const eyebrowY = 282;
    const eyebrowText = isProclaimed
        ? 'MVP VALCYL DE LA JORNADA'
        : (myVote ? 'MI ELECCIÓN MVP VALCYL' : 'CANDIDATOS MVP VALCYL');
    if (isProclaimed) {
        drawVectorCrown(ctx, colX + 11, eyebrowY - 6, 20, 13, '#d4af37');
    } else {
        drawVectorStar(ctx, colX + 9, eyebrowY - 6, 9, '#ffd700');
    }
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'left';
    drawTextFitted(ctx, eyebrowText, colX + 30, eyebrowY, colW - 32, 17, '900 "Space Grotesk", sans-serif', 13);

    // Nombre hero gigante (APODO)
    const displayApodo = String(primaryInfo ? primaryInfo.apodo : 'JUGADOR').toUpperCase();
    const apodoY = 368;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    drawTextFitted(ctx, displayApodo, colX, apodoY, colW, 76, '900 "Space Grotesk", sans-serif', 36);
    ctx.restore();

    // Sublínea #DORSAL · NOMBRE · POSICIÓN
    const subParts = [];
    if (primaryInfo && primaryInfo.dorsal) subParts.push('#' + primaryInfo.dorsal);
    if (primaryInfo && primaryInfo.nombre && primaryInfo.nombre.toLowerCase() !== String(primaryInfo.apodo || '').toLowerCase()) {
        subParts.push(primaryInfo.nombre.toUpperCase());
    }
    if (primaryInfo && primaryInfo.posicion) subParts.push(String(primaryInfo.posicion).toUpperCase());
    const subLine = subParts.join('  ·  ');
    if (subLine) {
        ctx.fillStyle = 'rgba(229, 214, 240, 0.85)';
        ctx.textAlign = 'left';
        drawTextFitted(ctx, subLine, colX, apodoY + 38, colW, 18, '700 "Space Grotesk", sans-serif', 12);
    }

    // Separador fino en columna derecha
    const rRuleGrad = ctx.createLinearGradient(colX, 0, W - 56, 0);
    rRuleGrad.addColorStop(0, 'rgba(212, 175, 55, 0.55)');
    rRuleGrad.addColorStop(1, 'rgba(212, 175, 55, 0.08)');
    ctx.strokeStyle = rRuleGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(colX, 434); ctx.lineTo(W - 56, 434); ctx.stroke();

    // Bloque abierto de estadísticas y/o estado de votación en columna derecha (Y = 446..726)
    let kpiTop = 446;
    const kpiBottom = 736;
    const pctMvpVal = (data.reglas && data.reglas.pct_mvp !== undefined) ? data.reglas.pct_mvp : 10;

    if (!isClubCard) {
        // Estado fan abierto (acento lateral vertical fino sin caja cerrada)
        let fanMain = '', fanAccent = '#f3ce5e', fanIcon = 'star';
        if (isProclaimed) {
            if (isHit) {
                fanMain = `¡MVP ACERTADO!  ·  +${pctMvpVal}% BONUS EXTRA`;
                fanAccent = '#2ecc71';
                fanIcon = 'check';
            } else if (myVote) {
                const vInf = window.parseCandInfo(myVote);
                fanMain = `TU VOTO: ${vInf.dorsal ? '#' + vInf.dorsal + ' ' : ''}${vInf.apodo}  ·  ¡BUEN INTENTO!`;
                fanAccent = '#d8b4fe';
                fanIcon = 'star';
            } else {
                fanMain = 'SIN VOTO REGISTRADO EN ESTE PARTIDO';
                fanAccent = 'rgba(243, 206, 94, 0.85)';
                fanIcon = 'star';
            }
        } else {
            if (myVote) {
                fanMain = `VOTO ASEGURADO  ·  +${pctMvpVal}% BONUS SI GANA`;
                fanAccent = '#2ecc71';
                fanIcon = 'lock';
            } else {
                fanMain = `VOTACIÓN ABIERTA  ·  GANA UN +${pctMvpVal}% EXTRA`;
                fanAccent = '#ffd700';
                fanIcon = 'star';
            }
        }

        const stStripY = kpiTop + 6;
        ctx.fillStyle = fanAccent;
        ctx.fillRect(colX, stStripY + 4, 3.5, 34);
        if (fanIcon === 'check') drawVectorCheck(ctx, colX + 24, stStripY + 21, 9, fanAccent);
        else if (fanIcon === 'lock') drawVectorLock(ctx, colX + 24, stStripY + 21, 14, fanAccent);
        else drawVectorStar(ctx, colX + 24, stStripY + 21, 8, fanAccent);

        ctx.fillStyle = fanAccent;
        ctx.textAlign = 'left';
        drawTextFitted(ctx, fanMain, colX + 42, stStripY + 27, colW - 44, 17, '900 "Space Grotesk", sans-serif', 12);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(colX, stStripY + 52); ctx.lineTo(W - 56, stStripY + 52); ctx.stroke();
        kpiTop = stStripY + 62;
    }

    const drawSplitKpiCell = (st, cx, cyCenter, cellW, compact) => {
        const raw = String(st).trim();
        const colonIdx = raw.indexOf(':');
        if (colonIdx > 0 && colonIdx < raw.length - 1) {
            const labelPart = raw.slice(0, colonIdx).trim().toUpperCase();
            const valPart = raw.slice(colonIdx + 1).trim();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, valPart, cx, cyCenter + (compact ? 2 : 5), cellW - 22, compact ? 32 : 40, '900 "Space Grotesk", sans-serif', 16);
            ctx.fillStyle = '#d4af37';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, labelPart, cx, cyCenter + (compact ? 25 : 33), cellW - 22, compact ? 13 : 15, '800 sans-serif', 10);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, raw, cx, cyCenter + 10, cellW - 22, compact ? 24 : 28, '900 "Space Grotesk", sans-serif', 13);
        }
    };

    const kpiH = kpiBottom - kpiTop;
    if (statsCount === 0) {
        const cyMid = kpiTop + Math.round(kpiH / 2);
        drawVectorStar(ctx, colX + colW / 2, cyMid - 38, 12, '#ffd700');
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        const emptyTitle = isProclaimed ? 'JUGADOR MÁS VALORADO' : 'ELIGE AL MVP DEL PARTIDO';
        drawTextFitted(ctx, emptyTitle, colX + colW / 2, cyMid + 4, colW - 20, 23, '900 "Space Grotesk", sans-serif', 15);
        ctx.fillStyle = '#d4af37';
        drawTextFitted(ctx, isProclaimed ? 'ELEGIDO POR EL CLUB Y LA AFICIÓN' : `ACIERTO = +${pctMvpVal}% DE BONUS EN TUS PUNTOS`, colX + colW / 2, cyMid + 34, colW - 20, 14, '800 "Space Grotesk", sans-serif', 11);
    } else if (statsCount === 1) {
        drawSplitKpiCell(statsToShow[0], colX + colW / 2, kpiTop + Math.round(kpiH / 2) - 8, colW, false);
    } else if (statsCount === 2) {
        const halfColW = colW / 2;
        const cyMid = kpiTop + Math.round(kpiH / 2) - 8;
        drawSplitKpiCell(statsToShow[0], colX + halfColW * 0.5, cyMid, halfColW, false);
        drawSplitKpiCell(statsToShow[1], colX + halfColW * 1.5, cyMid, halfColW, false);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(colX + halfColW, kpiTop + 26); ctx.lineTo(colX + halfColW, kpiBottom - 26); ctx.stroke();
    } else if (statsCount === 3) {
        // 3 filas editoriales limpias separadas por hairlines (etiqueta izquierda, dato gigante derecha)
        const rowH = Math.floor(kpiH / 3);
        statsToShow.forEach((st, idx) => {
            const ry = kpiTop + idx * rowH;
            const cy = ry + rowH / 2;
            const raw = String(st).trim();
            const cIdx = raw.indexOf(':');
            if (cIdx > 0 && cIdx < raw.length - 1) {
                const lbl = raw.slice(0, cIdx).trim().toUpperCase();
                const val = raw.slice(cIdx + 1).trim();
                ctx.fillStyle = '#d4af37';
                ctx.textAlign = 'left';
                drawTextFitted(ctx, lbl, colX + 4, cy + 5, colW * 0.44, 15, '900 "Space Grotesk", sans-serif', 11);
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'right';
                drawTextFitted(ctx, val, colX + colW - 4, cy + 9, colW * 0.52, 30, '900 "Space Grotesk", sans-serif', 16);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'left';
                drawTextFitted(ctx, raw, colX + 4, cy + 7, colW - 8, 24, '900 "Space Grotesk", sans-serif', 14);
            }
            if (idx < 2) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(colX, ry + rowH); ctx.lineTo(colX + colW, ry + rowH); ctx.stroke();
            }
        });
    } else {
        // 4 stats: cuadrícula abierta Swiss 2x2 en cruz (+)
        const halfColW = colW / 2;
        const midRowY = kpiTop + Math.round(kpiH / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(colX + 8, midRowY); ctx.lineTo(colX + colW - 8, midRowY);
        ctx.moveTo(colX + halfColW, kpiTop + 10); ctx.lineTo(colX + halfColW, kpiBottom - 10);
        ctx.stroke();

        const r1Cy = kpiTop + Math.round(kpiH * 0.25) - 8;
        const r2Cy = kpiTop + Math.round(kpiH * 0.75) - 8;
        statsToShow.forEach((st, idx) => {
            const c = idx % 2;
            const r = Math.floor(idx / 2);
            drawSplitKpiCell(st, colX + halfColW * c + halfColW / 2, r === 0 ? r1Cy : r2Cy, halfColW, true);
        });
    }

    // 4. TIRA INFERIOR DE NOMINADOS CIRCULARES EN REJILLA (Y = 776..972)
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 15px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    const nomLabel = 'CANDIDATOS NOMINADOS EN ESTE PARTIDO';
    ctx.fillText(nomLabel, 56, 796);
    const nomLabelW = ctx.measureText(nomLabel).width;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(56 + nomLabelW + 16, 791);
    ctx.lineTo(W - 56, 791);
    ctx.stroke();

    const listCands = candInfos;
    const nCands = listCands.length || 1;
    const stripW = W - 112;
    const colSlotW = stripW / nCands;
    const nomCenterY = 890;
    const avR = nCands === 3 ? 42 : 46;
    const targetOfficialStr = (isClubCard && winnerOficial) ? winnerOficial : (winnerOficial || match.mvp_oficial);

    for (let i = 0; i < listCands.length; i++) {
        const cItem = listCands[i];
        const cInf = cItem.info;
        const cImg = candImgs[i];
        const slotCenterX = 56 + colSlotW * i + colSlotW / 2;

        const isOfficialThis = Boolean(isProclaimed && targetOfficialStr && (
            (typeof window.isSameMvpPlayer === 'function')
                ? window.isSameMvpPlayer(cItem.raw, targetOfficialStr)
                : (cItem.raw === targetOfficialStr || (cInf.dorsal && primaryInfo && cInf.dorsal === primaryInfo.dorsal))
        ));
        const isUserVoteThis = Boolean(!isClubCard && myVote && (
            (typeof window.isSameMvpPlayer === 'function')
                ? window.isSameMvpPlayer(cItem.raw, myVote)
                : (myVote === cItem.raw || (cInf.dorsal && window.parseCandInfo(myVote).dorsal === cInf.dorsal))
        ));

        const badgeTxt = isOfficialThis ? 'GANADOR MVP' : (isUserVoteThis ? 'TU VOTO MVP' : 'NOMINADO');
        const badgeCol = isOfficialThis ? '#ffd700' : (isUserVoteThis ? '#d8b4fe' : 'rgba(255, 255, 255, 0.48)');
        const nameTxt = (cInf.dorsal ? '#' + cInf.dorsal + ' ' : '') + cInf.apodo;
        const posTxt = cInf.posicion || cInf.nombre || '';

        const maxAllowedTxtW = colSlotW - (avR * 2 + 26);
        ctx.font = '900 13px "Space Grotesk", sans-serif';
        const w1 = ctx.measureText(badgeTxt).width;
        ctx.font = `900 ${nCands === 3 ? 23 : 26}px "Space Grotesk", sans-serif`;
        const w2 = ctx.measureText(nameTxt).width;
        ctx.font = '600 15px sans-serif';
        const w3 = posTxt ? ctx.measureText(posTxt).width : 0;
        const measuredTxtW = Math.min(maxAllowedTxtW, Math.max(w1, w2, w3, 80));
        const unitTotalW = avR * 2 + 14 + measuredTxtW;

        const cx = Math.round(slotCenterX - unitTotalW / 2 + avR);
        const cy = nomCenterY;

        ctx.save();
        const avGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, avR);
        avGrad.addColorStop(0, isOfficialThis ? 'rgba(212, 175, 55, 0.34)' : (isUserVoteThis ? 'rgba(168, 85, 247, 0.38)' : 'rgba(93, 23, 137, 0.35)'));
        avGrad.addColorStop(1, 'rgba(15, 5, 22, 0.92)');
        ctx.fillStyle = avGrad;
        ctx.beginPath(); ctx.arc(cx, cy, avR, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, avR - 2, 0, Math.PI * 2); ctx.clip();
        if (valcylLogoImg) {
            ctx.save(); ctx.globalAlpha = 0.20;
            const wmD = (avR - 2) * 1.75;
            drawImageContain(ctx, valcylLogoImg, cx - wmD / 2, cy - wmD / 2, wmD, wmD);
            ctx.restore();
        }
        if (cImg) {
            const boxD = (avR - 1) * 2;
            drawImageContainBottom(ctx, cImg, cx - (avR - 1), cy - (avR - 1), boxD, boxD);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${Math.round(avR * 0.72)}px "Space Grotesk", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(cInf.initials, cx, cy + Math.round(avR * 0.24));
        }
        ctx.restore();

        ctx.strokeStyle = isOfficialThis ? '#ffd700' : (isUserVoteThis ? '#c084fc' : 'rgba(255, 255, 255, 0.24)');
        ctx.lineWidth = (isOfficialThis || isUserVoteThis) ? 3 : 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, avR, 0, Math.PI * 2); ctx.stroke();

        if (isOfficialThis || isUserVoteThis) {
            const bx = cx + avR * 0.72;
            const by = cy - avR * 0.72;
            ctx.fillStyle = isOfficialThis ? '#ffd700' : '#c084fc';
            ctx.beginPath(); ctx.arc(bx, by, 13, 0, Math.PI * 2); ctx.fill();
            if (isOfficialThis) drawVectorCrown(ctx, bx, by + 1, 13, 9, '#16071f');
            else drawVectorStar(ctx, bx, by, 7, '#16071f');
        }
        ctx.restore();

        const txtX = cx + avR + 14;
        const txtMaxW = (56 + colSlotW * (i + 1) - 8) - txtX;
        ctx.textAlign = 'left';
        ctx.fillStyle = badgeCol;
        drawTextFitted(ctx, badgeTxt, txtX, cy - 22, txtMaxW, 13, '900 "Space Grotesk", sans-serif', 10);
        ctx.fillStyle = '#ffffff';
        drawTextFitted(ctx, nameTxt, txtX, cy + 5, txtMaxW, nCands === 3 ? 23 : 26, '900 "Space Grotesk", sans-serif', 14);
        if (posTxt) {
            ctx.fillStyle = 'rgba(205, 190, 216, 0.74)';
            drawTextFitted(ctx, posTxt, txtX, cy + 28, txtMaxW, 15, '600 sans-serif', 11);
        }
    }

    drawEditorialFooterCanvas(ctx, W, H, vcvCrest);
}

// =========================================================================
// DISEÑO VERTICAL INSTAGRAM STORIES (1080 x 1920) EDITORIAL MODERNO - MVP
// =========================================================================
async function dibujarTarjetaMvpStoryCanvas(ctx, W, H, data, uName, nReal) {
    const idPart = window.currentShareMatchId;
    let match = null;
    if (data.equipos) match = data.equipos.find(m => m.id_partido === idPart);
    if (!match && data.todos_partidos) match = data.todos_partidos.find(m => m.id_partido === idPart);
    if (!match) return;

    const midX = W / 2;
    const locName = (match.ubicacion === 'LOCAL') ? match.equipo_local : match.rival;
    const visName = (match.ubicacion === 'LOCAL') ? match.rival : match.equipo_local;
    const cat = (match.categoria || 'SUPERLIGA 2').toUpperCase();
    const jNum = match.jornada_eq || match.ronda_global || '-';
    const isClubCard = Boolean(window.isMvpAdminClubCard);

    const cands = (isClubCard && Array.isArray(window.currentShareCandidatesOverride) && window.currentShareCandidatesOverride.length > 0)
        ? window.currentShareCandidatesOverride
        : (Array.isArray(match.mvp_candidatos) ? match.mvp_candidatos.filter(Boolean) : []);
    const myVote = isClubCard ? null : ((data.mvp_votos && data.mvp_votos[idPart]) ? data.mvp_votos[idPart] : null);
    const isProclaimed = isClubCard ? true : !!match.mvp_oficial;
    const winnerStr = (isClubCard && window.currentShareWinnerOverride)
        ? window.currentShareWinnerOverride
        : (match.mvp_oficial || (cands.length > 0 ? cands[0] : ''));

    let primaryInfo = null;
    let isHit = false;
    if (isProclaimed) {
        primaryInfo = winnerStr ? window.parseCandInfo(winnerStr) : null;
        if (myVote && !isClubCard && winnerStr) {
            if (typeof window.isSameMvpPlayer === 'function') {
                isHit = window.isSameMvpPlayer(winnerStr, myVote);
            } else {
                const dorOf = (String(winnerStr).match(/#(\d+)/) || [])[1];
                const dorVo = (String(myVote).match(/#(\d+)/) || [])[1];
                isHit = (dorOf && dorVo) ? (parseInt(dorOf, 10) === parseInt(dorVo, 10)) : (String(winnerStr).trim().toLowerCase() === String(myVote).trim().toLowerCase());
            }
        }
    } else if (myVote) {
        primaryInfo = window.parseCandInfo(myVote);
    } else if (cands.length > 0) {
        primaryInfo = window.parseCandInfo(cands[0]);
    }

    const rawStats = (isClubCard && Array.isArray(window.currentShareStatsOverride) && window.currentShareStatsOverride.length > 0)
        ? window.currentShareStatsOverride
        : (Array.isArray(match.mvp_stats) ? match.mvp_stats : []);
    const statsToShow = isProclaimed ? rawStats.filter(s => s && String(s).trim() !== '').slice(0, 4) : [];
    const statsCount = statsToShow.length;

    const candInfos = cands.slice(0, 3).map(c => ({ raw: c, info: window.parseCandInfo(c) }));
    const [valcylLogoImg, valcylCleanLogoImg, vcvCrestPrimary, vcvCrestFallback, imgLoc, imgVis, mainImgRaw, mainImgFallback, ...candImgs] = await Promise.all([
        cargarImagenCanvas('files/images/valcyl_logo.png'),
        cargarImagenCanvas('files/images/valcyl_logo_lavender.png'),
        cargarImagenCanvas('files/images/escudos/valcyl_vcv.webp'),
        cargarImagenCanvas('files/images/logo_vcv_circle.png'),
        cargarEscudoCanvas(locName),
        cargarEscudoCanvas(visName),
        primaryInfo ? cargarImagenCanvas(primaryInfo.photoSrc) : Promise.resolve(null),
        (primaryInfo && primaryInfo.dorsal) ? cargarImagenCanvas(`files/images/jugadores/dorsal_${primaryInfo.dorsal}.jpeg`) : Promise.resolve(null),
        ...candInfos.map(async (ci) => {
            let im = await cargarImagenCanvas(ci.info.photoSrc);
            if (!im && ci.info.dorsal) {
                im = await cargarImagenCanvas(`files/images/jugadores/dorsal_${ci.info.dorsal}.jpeg`);
            }
            return im;
        })
    ]);
    const valcylStampLogo = valcylCleanLogoImg || valcylLogoImg;
    const mainImg = mainImgRaw || mainImgFallback;
    const vcvCrest = vcvCrestPrimary || vcvCrestFallback;

    // CAPA 0: ATMÓSFERA NOCTURNA FULL-BLEED + CABECERA EDITORIAL
    pintarAtmosferaEditorialCanvas(ctx, W, H, { secondaryAccentRgb: isHit ? '46, 204, 113' : null });
    const hasValidUser = !isClubCard && uName && uName !== 'Invitado' && uName !== 'Jugador';
    const rightHdr1 = hasValidUser ? '@' + uName : `${cat}  ·  JORNADA ${jNum}`;
    const rightHdr2 = hasValidUser ? `${cat}  ·  JORNADA ${jNum}` : (isClubCard ? 'PREMIO MVP VALCYL' : '');
    drawEditorialHeaderCanvas(ctx, W, H, vcvCrest, rightHdr1, rightHdr2);

    // CAPA 1: ESCUDOS GIGANTES EN EL FONDO DEL RESULTADO (Y = 186..422)
    const bgCrestSize = 236;
    const bgCrestY = 186;
    if (imgLoc) {
        ctx.save(); ctx.globalAlpha = 0.14;
        drawImageContain(ctx, imgLoc, 62, bgCrestY, bgCrestSize, bgCrestSize);
        ctx.restore();
    }
    if (imgVis) {
        ctx.save(); ctx.globalAlpha = 0.14;
        drawImageContain(ctx, imgVis, W - 62 - bgCrestSize, bgCrestY, bgCrestSize, bgCrestSize);
        ctx.restore();
    }

    // Tipografía fantasma gigante tras el jugador ("MVP" y "#DORSAL")
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 295px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.024)';
    ctx.fillText('MVP', midX, 645);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.11)';
    ctx.lineWidth = 2.5;
    ctx.strokeText('MVP', midX, 645);

    if (primaryInfo && primaryInfo.dorsal) {
        ctx.font = '900 325px "Space Grotesk", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(212, 175, 55, 0.032)';
        ctx.fillText('#' + primaryInfo.dorsal, W - 52, 928);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
        ctx.lineWidth = 2;
        ctx.strokeText('#' + primaryInfo.dorsal, W - 52, 928);
    }
    ctx.restore();

    // CAPA 2: MARCADOR PROTAGONISTA FLOTANTE (Sin cajas)
    const hasScore = Boolean(match.oficial_sets && String(match.oficial_sets).trim() !== '');
    const scoreY = 304;
    const locShort = String(locName || 'VCV').trim().toUpperCase();
    const visShort = String(visName || 'RIVAL').trim().toUpperCase();

    ctx.save();
    ctx.shadowColor = 'rgba(9, 2, 14, 0.96)';
    ctx.shadowBlur = 24;

    if (hasScore) {
        const cleanScore = String(match.oficial_sets).replace(/\s*-\s*/, ' – ');
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        drawTextFitted(ctx, cleanScore, midX, scoreY + 6, 210, 68, '900 "Space Grotesk", sans-serif', 44);
        const scoreHalfW = Math.min(105, Math.ceil(ctx.measureText(cleanScore).width / 2));
        const teamEdgeOffset = scoreHalfW + 36;
        const maxTeamW = midX - teamEdgeOffset - 64;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.textAlign = 'right';
        drawTextFitted(ctx, locShort, midX - teamEdgeOffset, scoreY - 4, maxTeamW, 28, '900 "Space Grotesk", sans-serif', 16);

        ctx.textAlign = 'left';
        drawTextFitted(ctx, visShort, midX + teamEdgeOffset, scoreY - 4, maxTeamW, 28, '900 "Space Grotesk", sans-serif', 16);

        if (match.oficial_parciales && String(match.oficial_parciales).trim() !== '') {
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(243, 206, 94, 0.88)';
            ctx.textAlign = 'center';
            const cleanParcs = String(match.oficial_parciales).split(/\s*,\s*/).join('   ·   ');
            drawTextFitted(ctx, cleanParcs, midX, scoreY + 42, 680, 17, '700 "Space Grotesk", sans-serif', 12);
        }
    } else {
        ctx.fillStyle = '#d4af37';
        ctx.textAlign = 'center';
        ctx.font = '900 44px "Space Grotesk", sans-serif';
        ctx.fillText('VS', midX, scoreY);
        const vsHalfW = Math.ceil(ctx.measureText('VS').width / 2);
        const teamEdgeOffset = vsHalfW + 34;
        const maxTeamW = midX - teamEdgeOffset - 64;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.textAlign = 'right';
        drawTextFitted(ctx, locShort, midX - teamEdgeOffset, scoreY - 4, maxTeamW, 28, '900 "Space Grotesk", sans-serif', 15);

        ctx.textAlign = 'left';
        drawTextFitted(ctx, visShort, midX + teamEdgeOffset, scoreY - 4, maxTeamW, 28, '900 "Space Grotesk", sans-serif', 15);
    }
    ctx.restore();

    drawEditorialRule(ctx, 68, W - 68, 370, 0.45, 1.5, 0);

    // CAPA 3: JUGADOR HEROICO FUERA DE RECUADRO Y EN GRANDE
    const heroBoxTop = 376;
    const heroBoxH = isClubCard
        ? (statsCount === 0 ? 872 : 832)
        : (statsCount === 0 ? 824 : 788);
    const heroFadeBottom = heroBoxTop + heroBoxH;

    const heroGlow = ctx.createRadialGradient(midX, heroBoxTop + heroBoxH * 0.40, 30, midX, heroBoxTop + heroBoxH * 0.44, 460);
    heroGlow.addColorStop(0, 'rgba(212, 175, 55, 0.27)');
    heroGlow.addColorStop(0.45, 'rgba(138, 43, 182, 0.26)');
    heroGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = heroGlow;
    ctx.fillRect(0, heroBoxTop - 16, W, heroBoxH + 36);

    if (mainImg) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 8;
        drawImageContainBottomFaded(ctx, mainImg, midX - 420, heroBoxTop, 840, heroBoxH, 0.68, 0.96);
        ctx.restore();
    } else if (primaryInfo) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.font = '900 280px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(primaryInfo.initials, midX, heroBoxTop + 490);
    }

    // Sello inclinado MVP VALCYL sobre el jugador
    drawValcylMvpStamp(ctx, 796, isClubCard ? 934 : 906, 96, -13, valcylStampLogo, cat);

    // CAPA 4: TIPOGRAFÍA EDITORIAL PROTAGONISTA Y STATS ABIERTAS
    const typoStartY = isClubCard
        ? (statsCount === 0 ? 1166 : 1126)
        : (statsCount === 0 ? 1120 : 1084);

    ctx.font = '900 20px "Space Grotesk", sans-serif';
    const eyebrowLabel = isProclaimed
        ? 'MVP VALCYL DE LA JORNADA'
        : (myVote ? 'MI ELECCIÓN MVP VALCYL' : 'CANDIDATOS MVP VALCYL');
    const ebLabelW = ctx.measureText(eyebrowLabel).width;
    const iconW = isProclaimed ? 22 : 18, iconGap = 10;
    const ebTotalW = iconW + iconGap + ebLabelW;
    const ebLeft = midX - ebTotalW / 2;

    if (isProclaimed) {
        drawVectorCrown(ctx, ebLeft + iconW / 2, typoStartY - 7, iconW, 15, '#d4af37');
    } else {
        drawVectorStar(ctx, ebLeft + iconW / 2, typoStartY - 7, 9, '#ffd700');
    }
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'left';
    ctx.fillText(eyebrowLabel, ebLeft + iconW + iconGap, typoStartY);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1.8;
    const sideGap = 24;
    if (ebLeft - sideGap > 72) {
        ctx.beginPath();
        ctx.moveTo(72, typoStartY - 6);
        ctx.lineTo(ebLeft - sideGap, typoStartY - 6);
        ctx.moveTo(midX + ebTotalW / 2 + sideGap, typoStartY - 6);
        ctx.lineTo(W - 72, typoStartY - 6);
        ctx.stroke();
    }

    const displayApodo = String(primaryInfo ? primaryInfo.apodo : 'JUGADOR').toUpperCase();
    const apodoY = typoStartY + (isClubCard ? 92 : 86);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.90)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawTextFitted(ctx, displayApodo, midX, apodoY, W - 120, isClubCard ? 96 : 90, '900 "Space Grotesk", sans-serif', 44);
    ctx.restore();

    const subMetaParts = [];
    if (primaryInfo && primaryInfo.dorsal) subMetaParts.push('#' + primaryInfo.dorsal);
    if (primaryInfo && primaryInfo.nombre && primaryInfo.nombre.toLowerCase() !== String(primaryInfo.apodo || '').toLowerCase()) {
        subMetaParts.push(primaryInfo.nombre.toUpperCase());
    }
    if (primaryInfo && primaryInfo.posicion) subMetaParts.push(String(primaryInfo.posicion).toUpperCase());

    const subMetaLine = subMetaParts.join('   ·   ');
    const subMetaY = apodoY + (isClubCard ? 42 : 40);
    if (subMetaLine) {
        ctx.fillStyle = 'rgba(229, 214, 240, 0.84)';
        ctx.textAlign = 'center';
        drawTextFitted(ctx, subMetaLine, midX, subMetaY, W - 140, 21, '700 "Space Grotesk", sans-serif', 13);
    }

    let kpiTopY = subMetaY + 32;
    const kpiBottomY = 1482;
    const pctMvpVal = (data.reglas && data.reglas.pct_mvp !== undefined) ? data.reglas.pct_mvp : 10;

    if (!isClubCard) {
        let fanMain = '', fanAccent = '#f3ce5e', fanIcon = 'star';
        if (isProclaimed) {
            if (isHit) {
                fanMain = `¡MVP ACERTADO!   ·   +${pctMvpVal}% BONUS EXTRA`;
                fanAccent = '#2ecc71';
                fanIcon = 'check';
            } else if (myVote) {
                const vInf = window.parseCandInfo(myVote);
                fanMain = `TU VOTO: ${vInf.dorsal ? '#' + vInf.dorsal + ' ' : ''}${vInf.apodo}   ·   ¡BUEN INTENTO!`;
                fanAccent = '#d8b4fe';
                fanIcon = 'star';
            } else {
                fanMain = 'SIN VOTO REGISTRADO EN ESTE PARTIDO';
                fanAccent = 'rgba(243, 206, 94, 0.88)';
                fanIcon = 'star';
            }
        } else {
            if (myVote) {
                fanMain = `VOTO ASEGURADO   ·   +${pctMvpVal}% BONUS SI GANA`;
                fanAccent = '#2ecc71';
                fanIcon = 'lock';
            } else {
                fanMain = `VOTACIÓN ABIERTA   ·   GANA UN +${pctMvpVal}% EXTRA`;
                fanAccent = '#ffd700';
                fanIcon = 'star';
            }
        }

        const fanBandTop = subMetaY + 22;
        drawEditorialRule(ctx, 72, W - 72, fanBandTop, 0.45, 1.5, 0.08);
        const fanTextY = fanBandTop + 34;
        ctx.font = '900 20px "Space Grotesk", sans-serif';
        const fTxtW = Math.min(W - 200, ctx.measureText(fanMain).width);
        const fIconW = 22;
        const fStart = midX - (fIconW + 12 + fTxtW) / 2;
        if (fanIcon === 'check') drawVectorCheck(ctx, fStart + fIconW / 2, fanTextY - 6, 10, fanAccent);
        else if (fanIcon === 'lock') drawVectorLock(ctx, fStart + fIconW / 2, fanTextY - 6, 16, fanAccent);
        else drawVectorStar(ctx, fStart + fIconW / 2, fanTextY - 6, 9, fanAccent);

        ctx.fillStyle = fanAccent;
        ctx.textAlign = 'left';
        drawTextFitted(ctx, fanMain, fStart + fIconW + 12, fanTextY, W - 200, 20, '900 "Space Grotesk", sans-serif', 13);

        kpiTopY = fanBandTop + 54;
    }

    drawEditorialRule(ctx, 72, W - 72, kpiTopY, 0.50, 1.5, 0.08);
    drawEditorialRule(ctx, 72, W - 72, kpiBottomY, 0.50, 1.5, 0.08);

    const drawOpenKpi = (st, cx, cyCenter, colW, isCompact) => {
        const raw = String(st).trim();
        const colonIdx = raw.indexOf(':');
        if (colonIdx > 0 && colonIdx < raw.length - 1) {
            const labelPart = raw.slice(0, colonIdx).trim().toUpperCase();
            const valPart = raw.slice(colonIdx + 1).trim();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, valPart, cx, cyCenter + (isCompact ? 4 : 6), colW - 28, isCompact ? 34 : 44, '900 "Space Grotesk", sans-serif', 18);

            ctx.fillStyle = '#d4af37';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, labelPart, cx, cyCenter + (isCompact ? 29 : 38), colW - 28, isCompact ? 14 : 17, '800 sans-serif', 11);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, raw, cx, cyCenter + 12, colW - 28, isCompact ? 25 : 30, '900 "Space Grotesk", sans-serif', 14);
        }
    };

    const kpiAreaH = kpiBottomY - kpiTopY;
    if (statsCount === 0) {
        const midKpiY = kpiTopY + Math.round(kpiAreaH / 2);
        const headlineTxt = isProclaimed ? 'JUGADOR MÁS VALORADO DEL PARTIDO' : 'ELIGE AL MVP DE ESTA JORNADA';
        ctx.font = '900 22px "Space Grotesk", sans-serif';
        const hw = Math.min(W - 220, ctx.measureText(headlineTxt).width);
        const starR = 10;
        const starTotalW = starR * 2 + 12 + hw;
        const hlStart = midX - starTotalW / 2;

        drawVectorStar(ctx, hlStart + starR, midKpiY - 12, starR, '#ffd700');
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        drawTextFitted(ctx, headlineTxt, hlStart + starR * 2 + 12, midKpiY - 5, W - 220, 22, '900 "Space Grotesk", sans-serif', 14);

        ctx.fillStyle = '#d4af37';
        ctx.textAlign = 'center';
        const subEmpty = isProclaimed
            ? 'ELEGIDO POR EL CLUB Y LA AFICIÓN   ·   TEMPORADA 2026/2027'
            : `ACIERTO = +${pctMvpVal}% DE BONUS EN TUS PUNTOS   ·   VCVPLAY.COM`;
        drawTextFitted(ctx, subEmpty, midX, midKpiY + 26, W - 180, 16, '800 "Space Grotesk", sans-serif', 11);
    } else if (statsCount <= 3) {
        const colW = (W - 144) / statsCount;
        const centerY = kpiTopY + Math.round(kpiAreaH / 2) - 10;
        statsToShow.forEach((st, idx) => {
            const cx = 72 + colW * idx + colW / 2;
            drawOpenKpi(st, cx, centerY, colW, false);
            if (idx < statsCount - 1) {
                const divX = 72 + colW * (idx + 1);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(divX, kpiTopY + 24);
                ctx.lineTo(divX, kpiBottomY - 24);
                ctx.stroke();
            }
        });
    } else {
        const halfW = (W - 144) / 2;
        const midRowY = kpiTopY + Math.round(kpiAreaH / 2);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(72 + 24, midRowY);
        ctx.lineTo(W - 72 - 24, midRowY);
        ctx.moveTo(midX, kpiTopY + 14);
        ctx.lineTo(midX, kpiBottomY - 14);
        ctx.stroke();

        const row1Cy = kpiTopY + Math.round(kpiAreaH * 0.25) - 6;
        const row2Cy = kpiTopY + Math.round(kpiAreaH * 0.75) - 6;
        statsToShow.forEach((st, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const cx = 72 + halfW * col + halfW / 2;
            const cy = row === 0 ? row1Cy : row2Cy;
            drawOpenKpi(st, cx, cy, halfW, true);
        });
    }

    // CAPA 5: TIRA EDITORIAL DE NOMINADOS EN REJILLA + PIE LIMPIO (Y = 1506..1745)
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 16px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    const nomLabel = 'CANDIDATOS NOMINADOS EN ESTE PARTIDO';
    ctx.fillText(nomLabel, 72, 1520);
    const nomLabelW = ctx.measureText(nomLabel).width;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(72 + nomLabelW + 18, 1515);
    ctx.lineTo(W - 72, 1515);
    ctx.stroke();

    const listCands = candInfos;
    const nCands = listCands.length || 1;
    const stripW = W - 144;
    const colSlotW = stripW / nCands;
    const nomCenterY = 1606;
    const avR = nCands === 3 ? 43 : 48;
    const targetOfficialStr = (isClubCard && winnerStr) ? winnerStr : (winnerStr || match.mvp_oficial);

    for (let i = 0; i < listCands.length; i++) {
        const cItem = listCands[i];
        const cInf = cItem.info;
        const cImg = candImgs[i];
        const slotCenterX = 72 + colSlotW * i + colSlotW / 2;

        const isOfficialThis = Boolean(isProclaimed && targetOfficialStr && (
            (typeof window.isSameMvpPlayer === 'function')
                ? window.isSameMvpPlayer(cItem.raw, targetOfficialStr)
                : (cItem.raw === targetOfficialStr || (cInf.dorsal && primaryInfo && cInf.dorsal === primaryInfo.dorsal))
        ));
        const isUserVoteThis = Boolean(!isClubCard && myVote && (
            (typeof window.isSameMvpPlayer === 'function')
                ? window.isSameMvpPlayer(cItem.raw, myVote)
                : (myVote === cItem.raw || (cInf.dorsal && window.parseCandInfo(myVote).dorsal === cInf.dorsal))
        ));

        const badgeTxt = isOfficialThis ? 'GANADOR MVP' : (isUserVoteThis ? 'TU VOTO MVP' : 'NOMINADO');
        const badgeCol = isOfficialThis ? '#ffd700' : (isUserVoteThis ? '#d8b4fe' : 'rgba(255, 255, 255, 0.48)');
        const nameTxt = (cInf.dorsal ? '#' + cInf.dorsal + ' ' : '') + cInf.apodo;
        const posTxt = cInf.posicion || cInf.nombre || '';

        const maxAllowedTxtW = colSlotW - (avR * 2 + 28);
        ctx.font = '900 13px "Space Grotesk", sans-serif';
        const w1 = ctx.measureText(badgeTxt).width;
        ctx.font = `900 ${nCands === 3 ? 23 : 27}px "Space Grotesk", sans-serif`;
        const w2 = ctx.measureText(nameTxt).width;
        ctx.font = '600 15px sans-serif';
        const w3 = posTxt ? ctx.measureText(posTxt).width : 0;
        const measuredTxtW = Math.min(maxAllowedTxtW, Math.max(w1, w2, w3, 80));
        const unitTotalW = avR * 2 + 14 + measuredTxtW;

        const cx = Math.round(slotCenterX - unitTotalW / 2 + avR);
        const cy = nomCenterY;

        ctx.save();
        const avGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, avR);
        avGrad.addColorStop(0, isOfficialThis ? 'rgba(212, 175, 55, 0.34)' : (isUserVoteThis ? 'rgba(168, 85, 247, 0.38)' : 'rgba(93, 23, 137, 0.35)'));
        avGrad.addColorStop(1, 'rgba(15, 5, 22, 0.92)');
        ctx.fillStyle = avGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, avR, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, avR - 2, 0, Math.PI * 2);
        ctx.clip();

        if (valcylLogoImg) {
            ctx.save();
            ctx.globalAlpha = 0.20;
            const wmD = (avR - 2) * 1.75;
            drawImageContain(ctx, valcylLogoImg, cx - wmD / 2, cy - wmD / 2, wmD, wmD);
            ctx.restore();
        }
        if (cImg) {
            const boxD = (avR - 1) * 2;
            drawImageContainBottom(ctx, cImg, cx - (avR - 1), cy - (avR - 1), boxD, boxD);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${Math.round(avR * 0.72)}px "Space Grotesk", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(cInf.initials, cx, cy + Math.round(avR * 0.24));
        }
        ctx.restore();

        ctx.strokeStyle = isOfficialThis ? '#ffd700' : (isUserVoteThis ? '#c084fc' : 'rgba(255, 255, 255, 0.24)');
        ctx.lineWidth = (isOfficialThis || isUserVoteThis) ? 3 : 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, avR, 0, Math.PI * 2);
        ctx.stroke();

        if (isOfficialThis || isUserVoteThis) {
            const bx = cx + avR * 0.72;
            const by = cy - avR * 0.72;
            ctx.fillStyle = isOfficialThis ? '#ffd700' : '#c084fc';
            ctx.beginPath();
            ctx.arc(bx, by, 14, 0, Math.PI * 2);
            ctx.fill();
            if (isOfficialThis) drawVectorCrown(ctx, bx, by + 1, 14, 10, '#16071f');
            else drawVectorStar(ctx, bx, by, 7, '#16071f');
        }
        ctx.restore();

        const txtX = cx + avR + 14;
        const txtMaxW = (72 + colSlotW * (i + 1) - 8) - txtX;
        ctx.textAlign = 'left';

        ctx.fillStyle = badgeCol;
        drawTextFitted(ctx, badgeTxt, txtX, cy - 22, txtMaxW, 13, '900 "Space Grotesk", sans-serif', 10);

        ctx.fillStyle = '#ffffff';
        drawTextFitted(ctx, nameTxt, txtX, cy + 5, txtMaxW, nCands === 3 ? 23 : 27, '900 "Space Grotesk", sans-serif', 14);

        if (posTxt) {
            ctx.fillStyle = 'rgba(205, 190, 216, 0.74)';
            drawTextFitted(ctx, posTxt, txtX, cy + 29, txtMaxW, 15, '600 sans-serif', 11);
        }
    }

    drawEditorialFooterCanvas(ctx, W, H, vcvCrest);
}

// =========================================================================
// PARTIDOS Y PRONÓSTICOS — EDITORIAL MODERNO (1080x1080 & 1080x1920)
// =========================================================================
async function dibujarTarjetaPartidoCanvas(ctx, W, H, uName, nReal, data) {
    const idPart = window.currentShareMatchId;
    let match = null;
    if (data.equipos) match = data.equipos.find(m => m.id_partido === idPart);
    if (!match && data.todos_partidos) match = data.todos_partidos.find(m => m.id_partido === idPart);
    if (!match) return;

    const isStory = H > W;
    const midX = W / 2;
    const marginX = isStory ? 68 : 56;
    const locName = (match.ubicacion === 'LOCAL') ? match.equipo_local : match.rival;
    const visName = (match.ubicacion === 'LOCAL') ? match.rival : match.equipo_local;
    const cat = (match.categoria || 'VOLEIBOL').toUpperCase();
    const jNum = match.jornada_eq || match.ronda_global || '-';

    const nowMs = Date.now();
    const hasOficialSets = Boolean(match.oficial_sets && String(match.oficial_sets).trim() !== '');
    const yaJugado = Boolean(hasOficialSets || match.estado === 'FINALIZADO' || (match.estado === 'CERRADO' && hasOficialSets));
    const isPastDeadline = Boolean(match.timestamp && (nowMs >= match.timestamp));
    const isCerrado = Boolean(yaJugado || match.estado === 'CERRADO' || match.estado === 'BLOQUEADO' || isPastDeadline);
    const pUser = (data.predicciones_usuario && data.predicciones_usuario[idPart])
        ? data.predicciones_usuario[idPart]
        : ((data.mis_predicciones && data.mis_predicciones[idPart]) ? data.mis_predicciones[idPart] : null);
    const uVote = (data.mvp_votos && match.id_partido) ? data.mvp_votos[match.id_partido] : null;
    const mvpCands = Array.isArray(match.mvp_candidatos) ? match.mvp_candidatos.filter(Boolean) : [];
    const hasMvpFeature = Boolean(match.mvp_oficial || uVote || mvpCands.length > 0);

    const mvpFocusStr = match.mvp_oficial || uVote || '';
    const mvpFocusInfo = mvpFocusStr ? window.parseCandInfo(mvpFocusStr) : null;
    const candListInfo = (!mvpFocusStr && mvpCands.length > 0) ? mvpCands.slice(0, 3).map(c => ({ raw: c, info: window.parseCandInfo(c) })) : [];

    const [valcylLogoImg, vcvCrestPrimary, vcvCrestFallback, imgLoc, imgVis, mvpImgRaw, mvpImgFallback, ...candImgs] = await Promise.all([
        cargarImagenCanvas('files/images/valcyl_logo.png'),
        cargarImagenCanvas('files/images/escudos/valcyl_vcv.webp'),
        cargarImagenCanvas('files/images/logo_vcv_circle.png'),
        cargarEscudoCanvas(locName),
        cargarEscudoCanvas(visName),
        mvpFocusInfo ? cargarImagenCanvas(mvpFocusInfo.photoSrc) : Promise.resolve(null),
        (mvpFocusInfo && mvpFocusInfo.dorsal) ? cargarImagenCanvas(`files/images/jugadores/dorsal_${mvpFocusInfo.dorsal}.jpeg`) : Promise.resolve(null),
        ...candListInfo.map(async (ci) => {
            let im = await cargarImagenCanvas(ci.info.photoSrc);
            if (!im && ci.info.dorsal) im = await cargarImagenCanvas(`files/images/jugadores/dorsal_${ci.info.dorsal}.jpeg`);
            return im;
        })
    ]);
    const vcvCrest = vcvCrestPrimary || vcvCrestFallback;
    const mvpFocusImg = mvpImgRaw || mvpImgFallback;

    // 1. ATMÓSFERA EDITORIAL FULL-BLEED + CABECERA
    const hasPred = Boolean(pUser && pUser.sets);
    pintarAtmosferaEditorialCanvas(ctx, W, H, { secondaryAccentRgb: (yaJugado && hasPred) ? '46, 204, 113' : null });

    const hasValidUser = Boolean(uName && uName !== 'Invitado' && uName !== 'Jugador');
    const hdrRight1 = hasValidUser ? '@' + uName : `${cat}  ·  JORNADA ${jNum}`;
    const hdrRight2 = hasValidUser ? `${cat}  ·  JORNADA ${jNum}` : '';
    drawEditorialHeaderCanvas(ctx, W, H, vcvCrest, hdrRight1, hdrRight2);

    // 2. CINTA EDITORIAL DE ESTADO + FECHA (Sin cajas pesadas)
    const metaY = isStory ? 226 : 122;
    let statusLabel = 'ABIERTA';
    let statusColor = '#2ecc71';
    if (yaJugado) {
        statusLabel = 'FINALIZADO';
        statusColor = '#2ecc71';
    } else if (isCerrado) {
        statusLabel = isPastDeadline ? 'EN JUEGO / CERRADA' : 'CERRADA';
        statusColor = '#ff6b81';
    }

    let matchDateStr = 'HORARIO POR CONFIRMAR';
    if (match.timestamp) {
        try {
            matchDateStr = new Date(match.timestamp).toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            }).replace(',', ' ·').toUpperCase();
        } catch(e) {
            matchDateStr = new Date(match.timestamp).toLocaleDateString().toUpperCase();
        }
    }

    const metaTokens = [];
    if (match.es_derby) metaTokens.push({ text: 'DERBY', color: '#ff6b81', icon: 'flame' });
    metaTokens.push({ text: statusLabel, color: statusColor, icon: (isCerrado && !yaJugado) ? 'lock' : 'dot' });
    metaTokens.push({ text: matchDateStr, color: 'rgba(229, 214, 240, 0.78)', icon: null });

    ctx.font = `900 ${isStory ? 17 : 15}px "Space Grotesk", sans-serif`;
    let metaTotalW = 0;
    metaTokens.forEach((tk, idx) => {
        if (tk.icon) tk.iconW = 20;
        else tk.iconW = 0;
        tk.txtW = ctx.measureText(tk.text).width;
        metaTotalW += tk.iconW + tk.txtW + (idx < metaTokens.length - 1 ? 34 : 0);
    });
    let mxCur = midX - metaTotalW / 2;
    metaTokens.forEach((tk, idx) => {
        if (tk.icon === 'flame') {
            drawVectorFlame(ctx, mxCur + 8, metaY - 5, 16, tk.color);
        } else if (tk.icon === 'lock') {
            drawVectorLock(ctx, mxCur + 8, metaY - 5, 13, tk.color);
        } else if (tk.icon === 'dot') {
            ctx.fillStyle = tk.color;
            ctx.beginPath(); ctx.arc(mxCur + 7, metaY - 5, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = tk.color;
        ctx.textAlign = 'left';
        ctx.fillText(tk.text, mxCur + tk.iconW, metaY);
        mxCur += tk.iconW + tk.txtW;
        if (idx < metaTokens.length - 1) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillText('·', mxCur + 13, metaY);
            mxCur += 34;
        }
    });
    drawEditorialRule(ctx, marginX, W - marginX, metaY + (isStory ? 26 : 20), 0.35, 1.2, 0);

    // 3. ESCENARIO DE ENFRENTAMIENTO (Escudos fantasma + Focos + Escudos Hero + Marcador)
    const crestCenterY = isStory ? 445 : 246;
    const crestSize = isStory ? 196 : 146;
    const locX = isStory ? 218 : 204;
    const visX = W - locX;

    // Escudos gigantes fantasma de fondo
    const bgCrestSize = isStory ? 350 : 260;
    const bgCrestY = crestCenterY - bgCrestSize / 2;
    if (imgLoc) {
        ctx.save(); ctx.globalAlpha = 0.08;
        drawImageContain(ctx, imgLoc, isStory ? -20 : 12, bgCrestY, bgCrestSize, bgCrestSize);
        ctx.restore();
    }
    if (imgVis) {
        ctx.save(); ctx.globalAlpha = 0.08;
        drawImageContain(ctx, imgVis, W - (isStory ? -20 : 12) - bgCrestSize, bgCrestY, bgCrestSize, bgCrestSize);
        ctx.restore();
    }

    // Halos oscuros violetas tras cada escudo para máximo contraste (resalta logos blancos como Galdakao)
    const drawTeamHaloAndCrest = (cx, cy, img, labelFallback) => {
        const g = ctx.createRadialGradient(cx, cy, 12, cx, cy, isStory ? 148 : 112);
        g.addColorStop(0, 'rgba(138, 43, 182, 0.36)');
        g.addColorStop(0.55, 'rgba(93, 23, 137, 0.14)');
        g.addColorStop(1, 'rgba(9, 2, 14, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, isStory ? 148 : 112, 0, Math.PI * 2); ctx.fill();

        if (img) {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
            ctx.shadowBlur = 18;
            drawImageContain(ctx, img, cx - crestSize / 2, cy - crestSize / 2, crestSize, crestSize);
            ctx.restore();
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.38)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, crestSize * 0.44, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${isStory ? 44 : 34}px "Space Grotesk", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(String(labelFallback || 'VCV').substring(0, 3).toUpperCase(), cx, cy + 12);
        }
    };
    drawTeamHaloAndCrest(locX, crestCenterY, imgLoc, locName);
    drawTeamHaloAndCrest(visX, crestCenterY, imgVis, visName);

    // Marcador central / VS monumental sin caja
    ctx.save();
    ctx.shadowColor = 'rgba(9, 2, 14, 0.96)';
    ctx.shadowBlur = 24;
    if (yaJugado && hasOficialSets) {
        ctx.fillStyle = 'rgba(243, 206, 94, 0.78)';
        ctx.font = `900 ${isStory ? 15 : 13}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('MARCADOR OFICIAL', midX, crestCenterY - (isStory ? 54 : 44));

        const cleanScore = String(match.oficial_sets).replace(/\s*-\s*/, ' – ');
        ctx.fillStyle = '#ffffff';
        drawTextFitted(ctx, cleanScore, midX, crestCenterY + (isStory ? 34 : 26), isStory ? 340 : 280, isStory ? 124 : 92, '900 "Space Grotesk", sans-serif', 54);

        if (match.oficial_parciales && String(match.oficial_parciales).trim() !== '') {
            ctx.fillStyle = '#f3ce5e';
            const cleanParcs = String(match.oficial_parciales).split(/\s*,\s*/).join('   ·   ');
            drawTextFitted(ctx, cleanParcs, midX, crestCenterY + (isStory ? 74 : 58), isStory ? 430 : 390, isStory ? 18 : 15, '700 "Space Grotesk", sans-serif', 11);
        }
    } else {
        ctx.fillStyle = 'rgba(243, 206, 94, 0.72)';
        ctx.font = `900 ${isStory ? 16 : 13}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(isCerrado ? 'EN CUESTIÓN DE SETS' : 'ENFRENTAMIENTO', midX, crestCenterY - (isStory ? 46 : 38));

        ctx.fillStyle = '#d4af37';
        ctx.font = `900 ${isStory ? 104 : 78}px "Space Grotesk", sans-serif`;
        ctx.fillText('VS', midX, crestCenterY + (isStory ? 32 : 24));

        ctx.fillStyle = 'rgba(229, 214, 240, 0.80)';
        drawTextFitted(ctx, matchDateStr, midX, crestCenterY + (isStory ? 70 : 54), isStory ? 360 : 300, isStory ? 17 : 14, '700 "Space Grotesk", sans-serif', 11);
    }
    ctx.restore();

    // Nombres de equipo debajo de sus escudos + tags LOCAL / VISITANTE
    const teamNameY = isStory ? 592 : 344;
    const teamMaxW = isStory ? 360 : 310;
    ctx.fillStyle = '#ffffff';
    drawTextWrappedCentered(ctx, String(locName || 'VCV').toUpperCase(), locX, teamNameY, teamMaxW, isStory ? 32 : 27, isStory ? 26 : 23, '900 "Space Grotesk", sans-serif', 14, 2);
    drawTextWrappedCentered(ctx, String(visName || 'RIVAL').toUpperCase(), visX, teamNameY, teamMaxW, isStory ? 32 : 27, isStory ? 26 : 23, '900 "Space Grotesk", sans-serif', 14, 2);

    const roleTagY = isStory ? 664 : 412;
    ctx.font = `900 ${isStory ? 15 : 13}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2ecc71';
    ctx.fillText('LOCAL', locX, roleTagY);
    ctx.fillStyle = 'rgba(183, 164, 190, 0.85)';
    ctx.fillText('VISITANTE', visX, roleTagY);

    const sepMatchY = isStory ? 726 : 440;
    drawEditorialRule(ctx, marginX, W - marginX, sepMatchY, 0.50, 1.5, 0);

    // 4. SECCIÓN DE PRONÓSTICO DEL USUARIO (Split Swiss o Display Abierto)
    const predHeaderY = isStory ? 776 : 478;
    const predHeaderTxt = 'MI PRONÓSTICO EN VCV PLAY';
    ctx.font = `900 ${isStory ? 19 : 16}px "Space Grotesk", sans-serif`;
    const phW = ctx.measureText(predHeaderTxt).width;
    const targetR = isStory ? 9 : 8;
    const phTotalW = targetR * 2 + 12 + phW;
    const phStart = midX - phTotalW / 2;
    drawVectorTarget(ctx, phStart + targetR, predHeaderY - 5, targetR, '#d4af37');
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'left';
    ctx.fillText(predHeaderTxt, phStart + targetR * 2 + 12, predHeaderY);

    if (isStory) {
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
        ctx.lineWidth = 1.4;
        if (phStart - 22 > marginX) {
            ctx.beginPath();
            ctx.moveTo(marginX, predHeaderY - 5); ctx.lineTo(phStart - 22, predHeaderY - 5);
            ctx.moveTo(midX + phTotalW / 2 + 22, predHeaderY - 5); ctx.lineTo(W - marginX, predHeaderY - 5);
            ctx.stroke();
        }
    }

    // Cálculo completo de puntuación si ya se ha jugado y hay pronóstico
    let ptsGanador = (data.reglas && data.reglas.ganador) || 3;
    let ptsSets = (data.reglas && data.reglas.sets) || 5;
    let ptsDiffExacta = (data.reglas && data.reglas.diff_exacta) || 2;
    let maxDistancia = (data.reglas && data.reglas.max_dist) || 10;
    let pctMvp = (data.reglas && data.reglas.pct_mvp !== undefined) ? data.reglas.pct_mvp : 10;

    let ptsConseguidos = 0;
    let earnedGanador = 0;
    let earnedSets = 0;
    let earnedDiff = 0;
    let isMvpHit = false;
    let bonusMvpVal = 0;

    if (pUser && pUser.sets && yaJugado) {
        const oSets = String(match.oficial_sets || '').split('-');
        const uSets = String(pUser.sets || '').split('-');
        if (oSets.length === 2 && uSets.length === 2) {
            const oLocalWin = parseInt(oSets[0], 10) > parseInt(oSets[1], 10);
            const uLocalWin = parseInt(uSets[0], 10) > parseInt(uSets[1], 10);
            if (oLocalWin === uLocalWin) {
                earnedGanador = ptsGanador;
                ptsConseguidos += ptsGanador;
            }
            if (String(pUser.sets).replace(/\s+/g, '') === String(match.oficial_sets).replace(/\s+/g, '')) {
                earnedSets = ptsSets;
                ptsConseguidos += ptsSets;
            }
        }
        if (match.oficial_parciales) {
            let oDiff = 0;
            const setsP = String(match.oficial_parciales).split(',');
            for (const sp of setsP) {
                const nums = sp.split('-');
                if (nums.length === 2) oDiff += (parseInt(nums[0], 10) - parseInt(nums[1], 10));
            }
            let uDiff = parseInt(pUser.puntos, 10) || 0;
            if (pUser.signo && String(pUser.signo).toLowerCase().includes('en contra')) uDiff = -uDiff;
            const dist = Math.abs(oDiff - uDiff);
            if (dist === 0) {
                earnedDiff = ptsDiffExacta;
                ptsConseguidos += ptsDiffExacta;
            } else if (maxDistancia > 0 && dist < maxDistancia) {
                earnedDiff = Math.round(ptsDiffExacta * ((maxDistancia - dist) / maxDistancia));
                ptsConseguidos += earnedDiff;
            }
        }
        if (match.mvp_oficial && ptsConseguidos > 0 && pctMvp > 0 && uVote) {
            if (typeof window.isSameMvpPlayer === 'function') {
                isMvpHit = window.isSameMvpPlayer(match.mvp_oficial, uVote);
            } else {
                let dorOf = (String(match.mvp_oficial).match(/#(\d+)/) || [])[1];
                let dorVo = (String(uVote).match(/#(\d+)/) || [])[1];
                isMvpHit = (dorOf && dorVo) ? (parseInt(dorOf, 10) === parseInt(dorVo, 10)) : (String(match.mvp_oficial).trim().toLowerCase() === String(uVote).trim().toLowerCase());
            }
            if (isMvpHit) {
                bonusMvpVal = Math.ceil(ptsConseguidos * (pctMvp / 100));
                ptsConseguidos += bonusMvpVal;
            }
        }
    } else if (match.mvp_oficial && uVote) {
        if (typeof window.isSameMvpPlayer === 'function') {
            isMvpHit = window.isSameMvpPlayer(match.mvp_oficial, uVote);
        } else {
            let dorOf = (String(match.mvp_oficial).match(/#(\d+)/) || [])[1];
            let dorVo = (String(uVote).match(/#(\d+)/) || [])[1];
            isMvpHit = (dorOf && dorVo) ? (parseInt(dorOf, 10) === parseInt(dorVo, 10)) : (String(match.mvp_oficial).trim().toLowerCase() === String(uVote).trim().toLowerCase());
        }
    }

    const predEndSepY = isStory ? 1316 : 746;

    if (hasPred) {
        const cleanPredSets = String(pUser.sets).replace(/\s*-\s*/, ' – ');
        const signoTxt = pUser.signo || '';
        const diffTxt = pUser.puntos !== undefined
            ? `Diferencia estimada: ${pUser.puntos} pts${signoTxt ? ' · ' + signoTxt : ''}`
            : signoTxt;

        if (!isStory) {
            // SQUARE (1080x1080): Split Swiss izquierdo (Pronóstico) | derecho (Veredicto)
            const leftMid = Math.round((marginX + midX) / 2);
            const rightMid = Math.round((midX + (W - marginX)) / 2);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(midX, 514); ctx.lineTo(midX, 718); ctx.stroke();

            ctx.fillStyle = 'rgba(229, 214, 240, 0.72)';
            ctx.font = '800 14px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('RESULTADO PRONOSTICADO', leftMid, 536);

            ctx.save();
            ctx.shadowColor = 'rgba(212, 175, 55, 0.25)';
            ctx.shadowBlur = 22;
            ctx.fillStyle = '#ffffff';
            drawTextFitted(ctx, cleanPredSets, leftMid, 636, 400, 96, '900 "Space Grotesk", sans-serif', 54);
            ctx.restore();

            ctx.fillStyle = '#f3ce5e';
            drawTextFitted(ctx, diffTxt, leftMid, 686, 430, 18, '700 "Space Grotesk", sans-serif', 12);

            if (yaJugado) {
                ctx.fillStyle = 'rgba(229, 214, 240, 0.72)';
                ctx.font = '800 14px "Space Grotesk", sans-serif';
                ctx.fillText('PUNTOS EN ESTE PARTIDO', rightMid, 536);

                const ptsCol = ptsConseguidos > 0 ? '#2ecc71' : '#b7a4be';
                ctx.save();
                ctx.shadowColor = ptsConseguidos > 0 ? 'rgba(46, 204, 113, 0.25)' : 'rgba(0,0,0,0.4)';
                ctx.shadowBlur = 22;
                ctx.fillStyle = ptsCol;
                drawTextFitted(ctx, (ptsConseguidos > 0 ? '+' : '') + ptsConseguidos + ' PTS', rightMid, 634, 420, 84, '900 "Space Grotesk", sans-serif', 44);
                ctx.restore();

                const brkTxt = `Ganador ${earnedGanador > 0 ? '+' + earnedGanador : '0'}   ·   Sets ${earnedSets > 0 ? '+' + earnedSets : '0'}   ·   Dif ${earnedDiff > 0 ? '+' + earnedDiff : '0'}`;
                ctx.fillStyle = 'rgba(229, 214, 240, 0.86)';
                drawTextFitted(ctx, brkTxt, rightMid, 686, 440, 16, '700 "Space Grotesk", sans-serif', 11);
            } else {
                drawVectorLock(ctx, rightMid, 578, 28, '#2ecc71');
                ctx.fillStyle = '#2ecc71';
                drawTextFitted(ctx, 'PRONÓSTICO SELLADO', rightMid, 634, 420, 28, '900 "Space Grotesk", sans-serif', 18);
                ctx.fillStyle = 'rgba(229, 214, 240, 0.78)';
                drawTextFitted(ctx, '¡Listo para sumar puntos en esta jornada!', rightMid, 672, 420, 16, '600 sans-serif', 12);
            }
        } else {
            // STORY (1080x1920): Display vertical monumental + Veredicto Swiss 3-col
            ctx.fillStyle = 'rgba(229, 214, 240, 0.72)';
            ctx.font = '800 17px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('RESULTADO PRONOSTICADO', midX, 838);

            ctx.save();
            ctx.shadowColor = 'rgba(212, 175, 55, 0.26)';
            ctx.shadowBlur = 28;
            ctx.fillStyle = '#ffffff';
            drawTextFitted(ctx, cleanPredSets, midX, 958, 520, 128, '900 "Space Grotesk", sans-serif', 72);
            ctx.restore();

            ctx.fillStyle = '#f3ce5e';
            drawTextFitted(ctx, diffTxt, midX, 1012, W - 180, 22, '700 "Space Grotesk", sans-serif', 14);

            drawEditorialRule(ctx, 120, W - 120, 1054, 0.25, 1.2, 0.05);

            if (yaJugado) {
                ctx.fillStyle = 'rgba(229, 214, 240, 0.72)';
                ctx.font = '800 16px "Space Grotesk", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('PUNTUACIÓN CONSEGUIDA', midX, 1094);

                ctx.save();
                ctx.shadowColor = ptsConseguidos > 0 ? 'rgba(46, 204, 113, 0.28)' : 'rgba(0,0,0,0.4)';
                ctx.shadowBlur = 24;
                ctx.fillStyle = ptsConseguidos > 0 ? '#2ecc71' : '#b7a4be';
                drawTextFitted(ctx, (ptsConseguidos > 0 ? '+' : '') + ptsConseguidos + ' PTS', midX, 1178, 600, 88, '900 "Space Grotesk", sans-serif', 46);
                ctx.restore();

                // 3-column Swiss breakdown
                const brkCols = [
                    { lbl: 'GANADOR', val: earnedGanador > 0 ? `+${earnedGanador} pts` : '0 pts', col: earnedGanador > 0 ? '#2ecc71' : 'rgba(255,255,255,0.42)' },
                    { lbl: 'SETS EXACTOS', val: earnedSets > 0 ? `+${earnedSets} pts` : '0 pts', col: earnedSets > 0 ? '#2ecc71' : 'rgba(255,255,255,0.42)' },
                    { lbl: 'DIF. PUNTOS', val: earnedDiff > 0 ? `+${earnedDiff} pts` : '0 pts', col: earnedDiff > 0 ? '#2ecc71' : 'rgba(255,255,255,0.42)' }
                ];
                const slotW = (W - marginX * 2) / 3;
                brkCols.forEach((bc, idx) => {
                    const bx = marginX + slotW * idx + slotW / 2;
                    ctx.fillStyle = 'rgba(205, 190, 216, 0.72)';
                    ctx.textAlign = 'center';
                    drawTextFitted(ctx, bc.lbl, bx, 1234, slotW - 24, 14, '800 "Space Grotesk", sans-serif', 11);
                    ctx.fillStyle = bc.col;
                    drawTextFitted(ctx, bc.val, bx, 1272, slotW - 24, 26, '900 "Space Grotesk", sans-serif', 16);
                    if (idx < 2) {
                        const dx = marginX + slotW * (idx + 1);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                        ctx.lineWidth = 1.2;
                        ctx.beginPath(); ctx.moveTo(dx, 1218); ctx.lineTo(dx, 1284); ctx.stroke();
                    }
                });
            } else {
                drawVectorLock(ctx, midX, 1138, 34, '#2ecc71');
                ctx.fillStyle = '#2ecc71';
                ctx.textAlign = 'center';
                drawTextFitted(ctx, 'PRONÓSTICO REGISTRADO Y ASEGURADO', midX, 1202, W - 160, 30, '900 "Space Grotesk", sans-serif', 18);
                ctx.fillStyle = 'rgba(229, 214, 240, 0.80)';
                drawTextFitted(ctx, 'Acumularás tus puntos automáticamente al terminar el partido', midX, 1246, W - 160, 19, '600 sans-serif', 13);
            }
        }
    } else {
        // Sin predicción registrada
        const emptyCy = isStory ? 1020 : 608;
        ctx.save();
        ctx.font = `900 ${isStory ? 200 : 140}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.028)';
        ctx.fillText('?', midX, emptyCy + (isStory ? 60 : 40));
        ctx.restore();

        const msgTitle = yaJugado
            ? 'SIN PRONÓSTICO REGISTRADO EN ESTE PARTIDO'
            : (isCerrado ? 'PLAZO DE PRONÓSTICOS CERRADO' : 'SIN PRONÓSTICO REGISTRADO AÚN');
        const msgSub = yaJugado
            ? '¡Entra en VCV Play y consulta las clasificaciones actualizadas!'
            : (isCerrado ? '¡Sigue el encuentro en directo en VCV Play!' : '¡Entra en VCV Play y haz tu pronóstico antes del inicio!');

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        drawTextFitted(ctx, msgTitle, midX, emptyCy - 14, W - marginX * 2 - 40, isStory ? 30 : 25, '900 "Space Grotesk", sans-serif', 16);

        ctx.fillStyle = '#f3ce5e';
        drawTextFitted(ctx, msgSub, midX, emptyCy + (isStory ? 34 : 26), W - marginX * 2 - 40, isStory ? 21 : 18, '700 sans-serif', 13);

        ctx.fillStyle = 'rgba(205, 190, 216, 0.68)';
        const rulesHint = `GANADOR +${ptsGanador} PTS   ·   SETS EXACTOS +${ptsSets} PTS   ·   DIF. EXACTA +${ptsDiffExacta} PTS`;
        drawTextFitted(ctx, rulesHint, midX, emptyCy + (isStory ? 84 : 68), W - marginX * 2 - 40, isStory ? 16 : 14, '800 "Space Grotesk", sans-serif', 11);
    }

    drawEditorialRule(ctx, marginX, W - marginX, predEndSepY, 0.44, 1.5, 0);

    // 5. SECCIÓN INFERIOR: SPOTLIGHT MVP VALCYL Ó REGLAS DE PUNTUACIÓN (Si la liga no tiene MVP)
    const botEyeY = isStory ? 1368 : 782;
    const botLabel = hasMvpFeature ? 'SEGUIMIENTO MVP VALCYL' : 'SISTEMA DE PUNTUACIÓN VCV PLAY';
    ctx.fillStyle = '#d4af37';
    ctx.font = `900 ${isStory ? 16 : 15}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(botLabel, marginX, botEyeY);
    const botLblW = ctx.measureText(botLabel).width;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(marginX + botLblW + 16, botEyeY - 5); ctx.lineTo(W - marginX, botEyeY - 5); ctx.stroke();

    if (mvpFocusInfo) {
        const avCy = isStory ? 1512 : 886;
        const avR = isStory ? 76 : 56;
        const avCx = marginX + avR + (isStory ? 18 : 10);

        ctx.save();
        const avGrad = ctx.createRadialGradient(avCx, avCy, 4, avCx, avCy, avR);
        avGrad.addColorStop(0, match.mvp_oficial ? 'rgba(212, 175, 55, 0.36)' : 'rgba(168, 85, 247, 0.38)');
        avGrad.addColorStop(1, 'rgba(15, 5, 22, 0.94)');
        ctx.fillStyle = avGrad;
        ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.beginPath(); ctx.arc(avCx, avCy, avR - 2, 0, Math.PI * 2); ctx.clip();
        if (valcylLogoImg) {
            ctx.save(); ctx.globalAlpha = 0.22;
            const wmD = (avR - 2) * 1.75;
            drawImageContain(ctx, valcylLogoImg, avCx - wmD / 2, avCy - wmD / 2, wmD, wmD);
            ctx.restore();
        }
        if (mvpFocusImg) {
            const boxD = (avR - 1) * 2;
            drawImageContainBottom(ctx, mvpFocusImg, avCx - (avR - 1), avCy - (avR - 1), boxD, boxD);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${Math.round(avR * 0.7)}px "Space Grotesk", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(mvpFocusInfo.initials, avCx, avCy + Math.round(avR * 0.24));
        }
        ctx.restore();

        const ringCol = match.mvp_oficial ? '#ffd700' : '#c084fc';
        ctx.strokeStyle = ringCol;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2); ctx.stroke();

        const bx = avCx + avR * 0.72;
        const by = avCy - avR * 0.72;
        ctx.fillStyle = ringCol;
        ctx.beginPath(); ctx.arc(bx, by, isStory ? 18 : 15, 0, Math.PI * 2); ctx.fill();
        if (match.mvp_oficial) drawVectorCrown(ctx, bx, by + 1, isStory ? 18 : 15, isStory ? 12 : 10, '#16071f');
        else drawVectorStar(ctx, bx, by, isStory ? 9 : 8, '#16071f');
        ctx.restore();

        const txX = avCx + avR + (isStory ? 34 : 26);
        const txMaxW = (W - marginX) - txX;
        let topEyebrow = match.mvp_oficial ? 'GANADOR OFICIAL MVP VALCYL' : 'MI CANDIDATO A MVP VALCYL';
        let playerLine = `${mvpFocusInfo.dorsal ? '#' + mvpFocusInfo.dorsal + ' ' : ''}${String(mvpFocusInfo.apodo || '').toUpperCase()}`;
        let verdictLine = '';
        let verdictColor = '#f3ce5e';

        if (match.mvp_oficial) {
            if (isMvpHit) {
                verdictLine = bonusMvpVal > 0
                    ? `¡Acertaste tu voto! (+${bonusMvpVal} pts bonus aplicados)`
                    : `¡Acertaste tu voto! (+${pctMvp}% bonus sobre tus puntos)`;
                verdictColor = '#2ecc71';
            } else if (uVote) {
                const vInf = window.parseCandInfo(uVote);
                verdictLine = `Tu voto fue para ${vInf.dorsal ? '#' + vInf.dorsal + ' ' : ''}${vInf.apodo}`;
                verdictColor = '#d8b4fe';
            } else {
                verdictLine = `${mvpFocusInfo.posicion ? mvpFocusInfo.posicion + ' · ' : ''}Elegido por el club y la afición`;
            }
        } else {
            verdictLine = `Voto registrado · Si gana sumas un +${pctMvp}% extra`;
            verdictColor = '#2ecc71';
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = match.mvp_oficial ? '#ffd700' : '#d8b4fe';
        drawTextFitted(ctx, topEyebrow, txX, avCy - (isStory ? 36 : 28), txMaxW, isStory ? 17 : 15, '900 "Space Grotesk", sans-serif', 12);

        ctx.fillStyle = '#ffffff';
        drawTextFitted(ctx, playerLine, txX, avCy + (isStory ? 12 : 10), txMaxW, isStory ? 46 : 38, '900 "Space Grotesk", sans-serif', 22);

        ctx.fillStyle = verdictColor;
        drawTextFitted(ctx, verdictLine, txX, avCy + (isStory ? 48 : 38), txMaxW, isStory ? 21 : 18, '700 sans-serif', 13);
    } else if (candListInfo.length > 0) {
        // Sin oficial ni voto del usuario: mostrar los medallones de los candidatos
        const nC = candListInfo.length;
        const slotW = (W - marginX * 2) / nC;
        const avCy = isStory ? 1512 : 886;
        const avR = isStory ? 44 : 38;
        for (let i = 0; i < candListInfo.length; i++) {
            const cIt = candListInfo[i];
            const cInf = cIt.info;
            const cIm = candImgs[i];
            const nameTxt = (cInf.dorsal ? '#' + cInf.dorsal + ' ' : '') + cInf.apodo;
            const posTxt = cInf.posicion || cInf.nombre || '';
            const maxTxtW = slotW - (avR * 2 + 24);
            ctx.font = `900 ${isStory ? 22 : 20}px "Space Grotesk", sans-serif`;
            const mw = Math.min(maxTxtW, Math.max(ctx.measureText(nameTxt).width, 76));
            const cx = Math.round(marginX + slotW * i + slotW / 2 - (avR * 2 + 12 + mw) / 2 + avR);

            ctx.save();
            const gAv = ctx.createRadialGradient(cx, avCy, 3, cx, avCy, avR);
            gAv.addColorStop(0, 'rgba(93, 23, 137, 0.35)');
            gAv.addColorStop(1, 'rgba(15, 5, 22, 0.92)');
            ctx.fillStyle = gAv;
            ctx.beginPath(); ctx.arc(cx, avCy, avR, 0, Math.PI * 2); ctx.fill();
            ctx.save();
            ctx.beginPath(); ctx.arc(cx, avCy, avR - 2, 0, Math.PI * 2); ctx.clip();
            if (valcylLogoImg) {
                ctx.save(); ctx.globalAlpha = 0.20;
                drawImageContain(ctx, valcylLogoImg, cx - avR * 0.85, avCy - avR * 0.85, avR * 1.7, avR * 1.7);
                ctx.restore();
            }
            if (cIm) drawImageContainBottom(ctx, cIm, cx - (avR - 1), avCy - (avR - 1), (avR - 1) * 2, (avR - 1) * 2);
            else {
                ctx.fillStyle = '#fff';
                ctx.font = `900 ${Math.round(avR * 0.7)}px "Space Grotesk", sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(cInf.initials, cx, avCy + 9);
            }
            ctx.restore();
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, avCy, avR, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();

            const tx = cx + avR + 12;
            const tw = (marginX + slotW * (i + 1) - 8) - tx;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#d4af37';
            drawTextFitted(ctx, 'NOMINADO MVP', tx, avCy - 16, tw, 12, '900 "Space Grotesk", sans-serif', 10);
            ctx.fillStyle = '#ffffff';
            drawTextFitted(ctx, nameTxt, tx, avCy + 8, tw, isStory ? 22 : 20, '900 "Space Grotesk", sans-serif', 13);
            if (posTxt) {
                ctx.fillStyle = 'rgba(205, 190, 216, 0.72)';
                drawTextFitted(ctx, posTxt, tx, avCy + 28, tw, 13, '600 sans-serif', 10);
            }
        }
    } else {
        // Liga sin MVP VALCYL: 3 columnas abiertas Swiss de puntuación
        const kpis = [
            { val: `+${ptsGanador}`, lbl: 'ACIERTO GANADOR', col: '#ffffff' },
            { val: `+${ptsSets}`, lbl: 'MARCADOR EXACTO', col: '#f3ce5e' },
            { val: `+${ptsDiffExacta}`, lbl: 'DIF. PUNTOS EXACTA', col: '#2ecc71' }
        ];
        const colW = (W - marginX * 2) / 3;
        const rowCy = isStory ? 1512 : 886;
        kpis.forEach((kp, idx) => {
            const cx = marginX + colW * idx + colW / 2;
            ctx.fillStyle = kp.col;
            ctx.textAlign = 'center';
            drawTextFitted(ctx, kp.val, cx, rowCy + 2, colW - 24, isStory ? 54 : 44, '900 "Space Grotesk", sans-serif', 24);
            ctx.fillStyle = '#d4af37';
            drawTextFitted(ctx, kp.lbl, cx, rowCy + (isStory ? 38 : 32), colW - 24, isStory ? 15 : 13, '800 "Space Grotesk", sans-serif', 10);
            if (idx < 2) {
                const dx = marginX + colW * (idx + 1);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
                ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.moveTo(dx, rowCy - 38); ctx.lineTo(dx, rowCy + 42); ctx.stroke();
            }
        });
    }

    drawEditorialFooterCanvas(ctx, W, H, vcvCrest);
}

// =========================================================================
// CLASIFICACIÓN DE LIGA — EDITORIAL MODERNO (1080x1080 & 1080x1920)
// =========================================================================
async function dibujarTarjetaJornadaCanvas(ctx, W, H, uName, nReal, data) {
    const isStory = H > W;
    const midX = W / 2;
    const marginX = isStory ? 68 : 56;
    const liga = window.currentShareLiga || (data.ligas ? data.ligas[0] : 'General');
    const ranking = (data.clasificaciones && data.clasificaciones[liga]) ? data.clasificaciones[liga] : [];

    let pos = '-';
    let realRankNum = 0;
    let pts = 0;
    const userIndex = ranking.findIndex(r => r.jugador === uName);
    if (userIndex !== -1) {
        const entry = ranking[userIndex];
        realRankNum = ranking.findIndex(x => x.puntos === entry.puntos) + 1;
        pos = '#' + realRankNum;
        pts = entry.puntos || 0;
    }

    const top3Entries = ranking.slice(0, 3).map((r) => ({
        jugador: r.jugador,
        puntos: r.puntos || 0,
        realRank: ranking.findIndex(x => x.puntos === r.puntos) + 1
    }));

    // Cargar escudo VCV + avatar real del jugador y avatares del Top 3
    const [vcvCrestPrimary, vcvCrestFallback, myAvatar, ...topAvatars] = await Promise.all([
        cargarImagenCanvas('files/images/escudos/valcyl_vcv.webp'),
        cargarImagenCanvas('files/images/logo_vcv_circle.png'),
        loadUserAvatarEntry(data, uName),
        ...top3Entries.map(t => (t.jugador === uName ? Promise.resolve(null) : loadUserAvatarEntry(data, t.jugador)))
    ]);
    const vcvCrest = vcvCrestPrimary || vcvCrestFallback;
    top3Entries.forEach((t, idx) => {
        t.avatar = (t.jugador === uName) ? myAvatar : (topAvatars[idx] || { img: null, emoji: null, initials: String(t.jugador || 'VC').substring(0, 2).toUpperCase() });
    });

    // Helper para pintar medallón de usuario (foto real / emoji / monograma VCV)
    const drawUserMedallion = (cx, cy, r, avEntry, ringColor = '#d4af37', lineWidth = 3, isLeader = false) => {
        ctx.save();
        const bgGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        bgGrad.addColorStop(0, '#6a2c70');
        bgGrad.addColorStop(1, '#2d103d');
        ctx.fillStyle = bgGrad;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

        if (avEntry && avEntry.img) {
            ctx.save();
            ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.clip();
            const ratio = Math.max((r * 2) / avEntry.img.width, (r * 2) / avEntry.img.height);
            const nw = avEntry.img.width * ratio;
            const nh = avEntry.img.height * ratio;
            ctx.drawImage(avEntry.img, cx - nw / 2, cy - nh / 2, nw, nh);
            ctx.restore();
        } else if (avEntry && avEntry.emoji) {
            ctx.font = `${Math.round(r * 1.05)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(avEntry.emoji, cx, cy + 2);
            ctx.textBaseline = 'alphabetic';
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${Math.round(r * 0.78)}px "Space Grotesk", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText((avEntry && avEntry.initials) || 'VC', cx, cy + Math.round(r * 0.27));
        }

        ctx.strokeStyle = ringColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

        if (isLeader) {
            const bx = cx + r * 0.72;
            const by = cy - r * 0.72;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(bx, by, Math.max(12, Math.round(r * 0.28)), 0, Math.PI * 2); ctx.fill();
            drawVectorCrown(ctx, bx, by + 1, Math.max(12, Math.round(r * 0.28)), Math.max(8, Math.round(r * 0.19)), '#16071f');
        }
        ctx.restore();
    };

    // 1. ATMÓSFERA FULL-BLEED + CABECERA
    pintarAtmosferaEditorialCanvas(ctx, W, H, { secondaryAccentRgb: '212, 175, 55' });
    drawEditorialHeaderCanvas(ctx, W, H, vcvCrest, 'LIGA ' + liga.toUpperCase(), 'JORNADA ' + (data.jornada || 'ACTUAL'));

    // Tipografía fantasma gigante + Escudo VCV marca de agua sutil
    ctx.save();
    if (vcvCrest) {
        ctx.save();
        ctx.globalAlpha = 0.055;
        const wmSize = isStory ? 380 : 280;
        drawImageContain(ctx, vcvCrest, W - marginX - wmSize + 40, isStory ? 230 : 120, wmSize, wmSize);
        ctx.restore();
    }
    ctx.font = `900 ${isStory ? 340 : 250}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'left';
    const ghostTag = realRankNum > 0 ? ('#' + realRankNum) : 'TOP';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.022)';
    ctx.fillText(ghostTag, marginX - 16, isStory ? 560 : 415);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.11)';
    ctx.lineWidth = 2;
    ctx.strokeText(ghostTag, marginX - 16, isStory ? 560 : 415);
    ctx.restore();

    // Calcular stats históricas y bonus MVP
    let stats = (typeof window.calculateUserStatsHelper === 'function') ? window.calculateUserStatsHelper(uName, liga) : null;
    let mPts = stats ? stats.mediaPuntos : '-';
    let mPos = stats ? stats.mediaPos : '-';
    let recJ = stats ? stats.recordJornada : '-';

    let matchesToCheck = data.equipos || data.todos_partidos || [];
    let mvpHitsInLiga = 0;
    matchesToCheck.forEach(m => {
        if (m.mvp_oficial && data.mvp_votos && data.mvp_votos[m.id_partido]) {
            const rawVote = data.mvp_votos[m.id_partido];
            let isHit = false;
            if (typeof window.isSameMvpPlayer === 'function') {
                isHit = window.isSameMvpPlayer(m.mvp_oficial, rawVote);
            } else {
                let dorOf = (String(m.mvp_oficial).match(/#(\d+)/) || [])[1];
                let dorVo = (String(rawVote).match(/#(\d+)/) || [])[1];
                isHit = (dorOf && dorVo) ? (parseInt(dorOf, 10) === parseInt(dorVo, 10)) : (String(m.mvp_oficial).trim().toLowerCase() === String(rawVote).trim().toLowerCase());
            }
            if (isHit) mvpHitsInLiga++;
        }
    });
    let pctMvpVal = (data.reglas && data.reglas.pct_mvp !== undefined) ? data.reglas.pct_mvp : 10;

    // 2. ZONA HERO PERFIL + IDENTIDAD DEL JUGADOR
    if (!isStory) {
        // SQUARE (1080x1080)
        const avR = 64;
        const avCx = marginX + avR + 24;
        const avCy = 228;
        const halo = ctx.createRadialGradient(avCx, avCy, 14, avCx, avCy, 118);
        halo.addColorStop(0, 'rgba(212, 175, 55, 0.30)');
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(avCx, avCy, 118, 0, Math.PI * 2); ctx.fill();

        drawUserMedallion(avCx, avCy, avR, myAvatar, realRankNum === 1 ? '#ffd700' : '#d4af37', 3.5, realRankNum === 1);

        const infoX = avCx + avR + 34;
        const infoMaxW = (W - marginX) - infoX;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#d4af37';
        const partCountTxt = ranking.length > 0 ? `CLASIFICACIÓN OFICIAL  ·  ${ranking.length} PARTICIPANTES` : 'CLASIFICACIÓN OFICIAL VCV PLAY';
        drawTextFitted(ctx, partCountTxt, infoX, avCy - 28, infoMaxW, 16, '900 "Space Grotesk", sans-serif', 12);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';
        drawTextFitted(ctx, '@' + uName, infoX, avCy + 24, infoMaxW, 56, '900 "Space Grotesk", sans-serif', 28);
        ctx.restore();

        const subIdentity = (nReal && nReal !== uName) ? `${nReal.toUpperCase()}  ·  LIGA ${liga.toUpperCase()}` : `LIGA ${liga.toUpperCase()}`;
        ctx.fillStyle = 'rgba(229, 214, 240, 0.80)';
        drawTextFitted(ctx, subIdentity, infoX, avCy + 56, infoMaxW, 18, '700 "Space Grotesk", sans-serif', 12);

        drawEditorialRule(ctx, marginX, W - marginX, 336, 0.48, 1.5, 0);

        // 3. DISPLAY GEMELO MONUMENTAL: POSICIÓN | PUNTOS (Y = 356..584)
        const leftMid = Math.round((marginX + midX) / 2);
        const rightMid = Math.round((midX + (W - marginX)) / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(midX, 372); ctx.lineTo(midX, 574); ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(229, 214, 240, 0.72)';
        ctx.font = '800 16px "Space Grotesk", sans-serif';
        ctx.fillText('POSICIÓN EN LIGA', leftMid, 396);

        ctx.save();
        ctx.shadowColor = 'rgba(212, 175, 55, 0.25)';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#f3ce5e';
        drawTextFitted(ctx, pos, leftMid, 520, 400, 128, '900 "Space Grotesk", sans-serif', 64);
        ctx.restore();

        const topPctTxt = (realRankNum > 0 && ranking.length > 0)
            ? `TOP ${Math.max(1, Math.round((realRankNum / ranking.length) * 100))}% DE LA LIGA`
            : 'CLASIFICACIÓN PENDIENTE';
        ctx.fillStyle = '#d4af37';
        drawTextFitted(ctx, topPctTxt, leftMid, 562, 380, 15, '800 "Space Grotesk", sans-serif', 11);

        ctx.fillStyle = 'rgba(229, 214, 240, 0.72)';
        ctx.font = '800 16px "Space Grotesk", sans-serif';
        ctx.fillText('PUNTOS TOTALES', rightMid, 396);

        ctx.save();
        ctx.shadowColor = 'rgba(46, 204, 113, 0.25)';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#2ecc71';
        drawTextFitted(ctx, String(pts), rightMid, 520, 400, 128, '900 "Space Grotesk", sans-serif', 64);
        ctx.restore();

        ctx.fillStyle = 'rgba(46, 204, 113, 0.85)';
        drawTextFitted(ctx, 'PUNTOS ACUMULADOS', rightMid, 562, 380, 15, '800 "Space Grotesk", sans-serif', 11);

        drawEditorialRule(ctx, marginX, W - marginX, 602, 0.45, 1.5, 0);

        // 4. RENDIMIENTO SWISS 3 COLUMNAS (Y = 626..788)
        ctx.fillStyle = '#d4af37';
        ctx.font = '900 15px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        const perfTitle = 'RENDIMIENTO DESTACADO EN LA TEMPORADA';
        ctx.fillText(perfTitle, marginX, 640);
        const ptW = ctx.measureText(perfTitle).width;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(marginX + ptW + 16, 635); ctx.lineTo(W - marginX, 635); ctx.stroke();

        const kpiData = [
            { label: 'MEDIA / JORNADA', val: mPts + ' pts', col: '#f3ce5e' },
            { label: 'POSICIÓN MEDIA', val: '#' + mPos, col: '#ffffff' },
            { label: 'RÉCORD JORNADA', val: recJ + ' pts', col: '#2ecc71' }
        ];
        const colW = (W - marginX * 2) / 3;
        const kpiCy = 720;
        kpiData.forEach((kp, idx) => {
            const cx = marginX + colW * idx + colW / 2;
            ctx.fillStyle = kp.col;
            ctx.textAlign = 'center';
            drawTextFitted(ctx, kp.val, cx, kpiCy + 4, colW - 24, 48, '900 "Space Grotesk", sans-serif', 22);
            ctx.fillStyle = 'rgba(205, 190, 216, 0.78)';
            drawTextFitted(ctx, kp.label, cx, kpiCy + 38, colW - 24, 14, '800 "Space Grotesk", sans-serif', 10);
            if (idx < 2) {
                const dx = marginX + colW * (idx + 1);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
                ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.moveTo(dx, kpiCy - 40); ctx.lineTo(dx, kpiCy + 44); ctx.stroke();
            }
        });

        drawEditorialRule(ctx, marginX, W - marginX, 792, 0.38, 1.4, 0);

        // 5. TIRA INFERIOR: BONUS MVP (SI APLICA) + PODIO TOP 3 ABIERTO (Y = 812..978)
        let podioRowY = mvpHitsInLiga > 0 ? 928 : 900;
        if (mvpHitsInLiga > 0) {
            const bonusY = 842;
            const bonusTxt = `BONUS MVP ACTIVO: ¡+${pctMvpVal}% EXTRA SUMADO POR ACIERTO MVP!`;
            ctx.font = '900 17px "Space Grotesk", sans-serif';
            const bw = Math.min(W - marginX * 2 - 40, ctx.measureText(bonusTxt).width);
            const starStart = midX - (18 + 10 + bw) / 2;
            drawVectorStar(ctx, starStart + 9, bonusY - 5, 9, '#ffd700');
            ctx.fillStyle = '#f3ce5e';
            ctx.textAlign = 'left';
            drawTextFitted(ctx, bonusTxt, starStart + 28, bonusY, W - marginX * 2 - 40, 17, '900 "Space Grotesk", sans-serif', 12);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(marginX + 60, 868); ctx.lineTo(W - marginX - 60, 868); ctx.stroke();
        } else {
            ctx.fillStyle = '#d4af37';
            ctx.font = '900 14px "Space Grotesk", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('LÍDERES DE LA LIGA', marginX, 834);
        }

        if (top3Entries.length > 0) {
            const podCols = top3Entries.length;
            const podSlotW = (W - marginX * 2) / podCols;
            top3Entries.forEach((tp, idx) => {
                const slotCx = marginX + podSlotW * idx + podSlotW / 2;
                const rankCol = tp.realRank === 1 ? '#ffd700' : (tp.realRank === 2 ? '#e2e8f0' : '#f59e0b');
                const isMe = tp.jugador === uName;
                const avR2 = 24;
                const unitW = avR2 * 2 + 12 + 195;
                const cx = Math.round(slotCx - Math.min(podSlotW - 16, unitW) / 2 + avR2);

                drawUserMedallion(cx, podioRowY, avR2, tp.avatar, rankCol, isMe ? 3 : 2, false);

                const tx = cx + avR2 + 12;
                const tw = (marginX + podSlotW * (idx + 1) - 10) - tx;
                ctx.textAlign = 'left';
                ctx.fillStyle = rankCol;
                ctx.font = '900 13px "Space Grotesk", sans-serif';
                ctx.fillText(`${tp.realRank}º PUESTO`, tx, podioRowY - 12);

                ctx.fillStyle = isMe ? '#2ecc71' : '#ffffff';
                drawTextFitted(ctx, '@' + tp.jugador, tx, podioRowY + 12, tw, 20, '900 "Space Grotesk", sans-serif', 12);

                ctx.fillStyle = 'rgba(229, 214, 240, 0.80)';
                drawTextFitted(ctx, `${tp.puntos} pts`, tx, podioRowY + 32, tw, 15, '700 "Space Grotesk", sans-serif', 11);
            });
        }
    } else {
        // STORY (1080x1920)
        const avR = 90;
        const avCy = 342;
        const halo = ctx.createRadialGradient(midX, avCy, 18, midX, avCy, 170);
        halo.addColorStop(0, 'rgba(212, 175, 55, 0.34)');
        halo.addColorStop(0.55, 'rgba(138, 43, 182, 0.24)');
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(midX, avCy, 170, 0, Math.PI * 2); ctx.fill();

        drawUserMedallion(midX, avCy, avR, myAvatar, realRankNum === 1 ? '#ffd700' : '#d4af37', 4, realRankNum === 1);

        ctx.fillStyle = '#d4af37';
        ctx.textAlign = 'center';
        const catSub = ranking.length > 0 ? `LIGA ${liga.toUpperCase()}  ·  ${ranking.length} PARTICIPANTES` : `LIGA ${liga.toUpperCase()}`;
        drawTextFitted(ctx, catSub, midX, 472, W - 140, 19, '900 "Space Grotesk", sans-serif', 13);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
        ctx.shadowBlur = 22;
        ctx.fillStyle = '#ffffff';
        drawTextFitted(ctx, '@' + uName, midX, 536, W - 140, 68, '900 "Space Grotesk", sans-serif', 32);
        ctx.restore();

        if (nReal && nReal !== uName) {
            ctx.fillStyle = 'rgba(229, 214, 240, 0.82)';
            drawTextFitted(ctx, nReal.toUpperCase(), midX, 576, W - 180, 21, '700 "Space Grotesk", sans-serif', 13);
        }

        drawEditorialRule(ctx, marginX, W - marginX, 616, 0.50, 1.5, 0);

        // 3. DISPLAY GEMELO MONUMENTAL VERTICAL (Y = 640..960)
        const leftMid = Math.round((marginX + midX) / 2);
        const rightMid = Math.round((midX + (W - marginX)) / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(midX, 666); ctx.lineTo(midX, 940); ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(229, 214, 240, 0.74)';
        ctx.font = '800 18px "Space Grotesk", sans-serif';
        ctx.fillText('POSICIÓN ACTUAL', leftMid, 696);

        ctx.save();
        ctx.shadowColor = 'rgba(212, 175, 55, 0.28)';
        ctx.shadowBlur = 28;
        ctx.fillStyle = '#f3ce5e';
        drawTextFitted(ctx, pos, leftMid, 856, 410, 160, '900 "Space Grotesk", sans-serif', 74);
        ctx.restore();

        const topPctTxt = (realRankNum > 0 && ranking.length > 0)
            ? `TOP ${Math.max(1, Math.round((realRankNum / ranking.length) * 100))}% EN LIGA`
            : 'SIN CLASIFICAR';
        ctx.fillStyle = '#d4af37';
        drawTextFitted(ctx, topPctTxt, leftMid, 912, 390, 17, '800 "Space Grotesk", sans-serif', 12);

        ctx.fillStyle = 'rgba(229, 214, 240, 0.74)';
        ctx.font = '800 18px "Space Grotesk", sans-serif';
        ctx.fillText('PUNTOS TOTALES', rightMid, 696);

        ctx.save();
        ctx.shadowColor = 'rgba(46, 204, 113, 0.28)';
        ctx.shadowBlur = 28;
        ctx.fillStyle = '#2ecc71';
        drawTextFitted(ctx, String(pts), rightMid, 856, 410, 160, '900 "Space Grotesk", sans-serif', 74);
        ctx.restore();

        ctx.fillStyle = 'rgba(46, 204, 113, 0.88)';
        drawTextFitted(ctx, 'PUNTOS ACUMULADOS', rightMid, 912, 390, 17, '800 "Space Grotesk", sans-serif', 12);

        drawEditorialRule(ctx, marginX, W - marginX, 968, 0.45, 1.5, 0);

        // 4. RENDIMIENTO SWISS 3 COLUMNAS + BONUS MVP (Y = 995..1265)
        ctx.fillStyle = '#d4af37';
        ctx.font = '900 17px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        const perfLbl = 'RENDIMIENTO DESTACADO EN LA TEMPORADA';
        ctx.fillText(perfLbl, marginX, 1018);
        const plW = ctx.measureText(perfLbl).width;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(marginX + plW + 18, 1012); ctx.lineTo(W - marginX, 1012); ctx.stroke();

        const kpiData = [
            { label: 'MEDIA / JORNADA', val: mPts + ' pts', col: '#f3ce5e' },
            { label: 'POSICIÓN MEDIA', val: '#' + mPos, col: '#ffffff' },
            { label: 'RÉCORD JORNADA', val: recJ + ' pts', col: '#2ecc71' }
        ];
        const colW = (W - marginX * 2) / 3;
        const kpiCy = 1112;
        kpiData.forEach((kp, idx) => {
            const cx = marginX + colW * idx + colW / 2;
            ctx.fillStyle = kp.col;
            ctx.textAlign = 'center';
            drawTextFitted(ctx, kp.val, cx, kpiCy + 6, colW - 26, 54, '900 "Space Grotesk", sans-serif', 24);
            ctx.fillStyle = 'rgba(205, 190, 216, 0.78)';
            drawTextFitted(ctx, kp.label, cx, kpiCy + 42, colW - 26, 15, '800 "Space Grotesk", sans-serif', 11);
            if (idx < 2) {
                const dx = marginX + colW * (idx + 1);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(dx, kpiCy - 46); ctx.lineTo(dx, kpiCy + 48); ctx.stroke();
            }
        });

        let podioStartY = 1234;
        if (mvpHitsInLiga > 0) {
            drawEditorialRule(ctx, marginX + 40, W - marginX - 40, 1188, 0.25, 1.2, 0.05);
            const bonusTxt = `BONUS MVP ACTIVO: ¡+${pctMvpVal}% EXTRA SUMADO POR ACIERTO MVP!`;
            ctx.font = '900 18px "Space Grotesk", sans-serif';
            const bw = Math.min(W - marginX * 2 - 40, ctx.measureText(bonusTxt).width);
            const bStart = midX - (18 + 12 + bw) / 2;
            drawVectorStar(ctx, bStart + 9, 1230 - 5, 9, '#ffd700');
            ctx.fillStyle = '#f3ce5e';
            ctx.textAlign = 'left';
            drawTextFitted(ctx, bonusTxt, bStart + 30, 1230, W - marginX * 2 - 40, 18, '900 "Space Grotesk", sans-serif', 13);
            podioStartY = 1284;
        }

        drawEditorialRule(ctx, marginX, W - marginX, podioStartY, 0.45, 1.5, 0);

        // 5. PODIO TOP 3 ABIERTO DE LA LIGA (Y = podioStartY+40..1670)
        const podTitleY = podioStartY + 52;
        drawVectorTrophy(ctx, marginX + 14, podTitleY - 6, 24, '#d4af37');
        ctx.fillStyle = '#d4af37';
        ctx.font = '900 18px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        const podLbl = `PODIO ACTUAL  ·  LIGA ${liga.toUpperCase()}`;
        ctx.fillText(podLbl, marginX + 38, podTitleY);
        const podW = ctx.measureText(podLbl).width;
        if (marginX + 38 + podW + 24 < W - marginX) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(marginX + 38 + podW + 18, podTitleY - 6); ctx.lineTo(W - marginX, podTitleY - 6); ctx.stroke();
        }

        if (top3Entries.length > 0) {
            const rowStartY = podTitleY + 34;
            const rowH = 104;
            top3Entries.forEach((tp, idx) => {
                const ry = rowStartY + idx * rowH;
                const cy = ry + rowH / 2;
                const isMe = tp.jugador === uName;
                const rankCol = tp.realRank === 1 ? '#ffd700' : (tp.realRank === 2 ? '#e2e8f0' : '#f59e0b');

                if (isMe) {
                    const hlGrad = ctx.createLinearGradient(marginX, 0, W - marginX, 0);
                    hlGrad.addColorStop(0, 'rgba(46, 204, 113, 0.14)');
                    hlGrad.addColorStop(1, 'rgba(46, 204, 113, 0)');
                    ctx.fillStyle = hlGrad;
                    ctx.fillRect(marginX, ry + 6, W - marginX * 2, rowH - 12);
                    ctx.fillStyle = '#2ecc71';
                    ctx.fillRect(marginX, ry + 6, 4, rowH - 12);
                }

                // Rank number
                ctx.fillStyle = rankCol;
                ctx.font = '900 38px "Space Grotesk", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${tp.realRank}º`, marginX + 42, cy + 13);

                // Circular user medallion
                drawUserMedallion(marginX + 124, cy, 32, tp.avatar, rankCol, 2.5, tp.realRank === 1);

                // Handle + optional tag
                ctx.fillStyle = isMe ? '#2ecc71' : '#ffffff';
                ctx.textAlign = 'left';
                drawTextFitted(ctx, '@' + tp.jugador, marginX + 180, cy + (isMe ? -2 : 9), 520, 32, '900 "Space Grotesk", sans-serif', 18);
                if (isMe) {
                    ctx.fillStyle = 'rgba(46, 204, 113, 0.90)';
                    ctx.font = '800 14px "Space Grotesk", sans-serif';
                    ctx.fillText('TU POSICIÓN EN EL PODIO', marginX + 180, cy + 22);
                }

                // Points right aligned
                ctx.fillStyle = rankCol;
                ctx.textAlign = 'right';
                drawTextFitted(ctx, `${tp.puntos} PTS`, W - marginX - 10, cy + 11, 210, 34, '900 "Space Grotesk", sans-serif', 18);

                if (idx < top3Entries.length - 1) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath(); ctx.moveTo(marginX, ry + rowH); ctx.lineTo(W - marginX, ry + rowH); ctx.stroke();
                }
            });
        } else {
            ctx.fillStyle = 'rgba(229, 214, 240, 0.72)';
            ctx.textAlign = 'center';
            drawTextFitted(ctx, 'Aún no hay puntuaciones registradas en esta liga', midX, podTitleY + 120, W - 160, 24, '700 sans-serif', 14);
        }
    }

    drawEditorialFooterCanvas(ctx, W, H, vcvCrest);
}

function getShareCardFilename() {
    const suffix = (window.currentShareFormat === 'story') ? '_story_1080x1920.png' : '_1080x1080.png';
    if (window.currentShareMode === 'mvp') {
        if (window.isMvpAdminClubCard) return 'mvp_valcyl_ganador' + suffix;
        return 'vcv_play_mvp' + suffix;
    }
    if (window.currentShareMode === 'match') {
        return 'vcv_play_partido' + suffix;
    }
    return 'vcv_play_clasificacion' + suffix;
}

window.ejecutarCompartirTarjeta = async function() {
    const canvas = document.getElementById('shareCardCanvas');
    if (!canvas) return;

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

        if (window.isMvpAdminClubCard) {
            let winOv = window.currentShareWinnerOverride || (match && match.mvp_oficial) || 'Jugador';
            let oInf = window.parseCandInfo(winOv);
            shareText = `👑 ¡MVP VALCYL! ${oInf.apodo} ha sido elegido como el Jugador Más Valioso en el partido ${locName} vs ${visName}. ¡Consulta los detalles en VCV Play!`;
            shareTitle = `👑 MVP VALCYL: ${oInf.apodo} | ${locName} vs ${visName}`;
        } else if (match && match.mvp_oficial) {
            let oInf = window.parseCandInfo(match.mvp_oficial);
            let isHit = false;
            if (uVote) {
                if (typeof window.isSameMvpPlayer === 'function') {
                    isHit = window.isSameMvpPlayer(match.mvp_oficial, uVote);
                } else {
                    let dorOf = (String(match.mvp_oficial).match(/#(\d+)/) || [])[1];
                    let dorVo = (String(uVote).match(/#(\d+)/) || [])[1];
                    if (dorOf && dorVo) isHit = (parseInt(dorOf, 10) === parseInt(dorVo, 10));
                    else isHit = (String(match.mvp_oficial).trim().toLowerCase() === String(uVote).trim().toLowerCase());
                }
            }

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
            const ranking = data.clasificaciones[liga];
            const row = ranking.find(r => r.jugador === uName);
            if (row) {
                const realRank = ranking.findIndex(x => x.puntos === row.puntos) + 1;
                pos = '#' + realRank;
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
        const dlFilename = getShareCardFilename();
        const file = new File([blob], dlFilename, { type: 'image/png' });

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
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl
                });
            } catch(e) {}
        } else {
            window.descargarTarjetaCanvas();
        }
    }, 'image/png');
};

window.descargarTarjetaCanvas = function() {
    const canvas = document.getElementById('shareCardCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = getShareCardFilename();
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
