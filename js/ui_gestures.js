// ==================================================================
// GESTOS TÁCTILES (DRAG/SWIPE) Y PWA PROMPT
// ==================================================================


if(document.getElementById('btnAdminClearCache')){
    document.getElementById('btnAdminClearCache').addEventListener('click', function(e) {
        e.preventDefault();
        let btn = this;
        let oldHTML = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Recalculando...';
        btn.disabled = true;
        fetchSeguro(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'clear_cache', usuario: currentUser, password: currentPassword }), 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            btn.innerHTML = oldHTML;
            btn.disabled = false;
        }).catch(err => {
            alert("Error: " + err);
            btn.innerHTML = oldHTML;
            btn.disabled = false;
        });
    });
}



window.guardarAjusteLigasFreeze = async function(e) {
    if(e) e.preventDefault();
    const btn = document.getElementById('btnSaveLigasFreeze');
    const oldText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Guardando...";

    const cfg = {};
    const cbs = document.querySelectorAll('.chk-liga-freeze');
    cbs.forEach(cb => {
        cfg[cb.value] = cb.checked;
    });

    try {
        let res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ action: 'save_ligas_config', usuario: currentUser, password: currentPassword, config: cfg }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        let d = await res.json();
        alert(d.message || "Ajuste guardado");
        if(d.status === 'success') {
            setTimeout(() => window.location.reload(), 500);
        }
    } catch(err) {
        alert("Error de conexión al guardar ajuste de ligas.");
    } finally {
        btn.disabled = false;
        btn.innerText = oldText;
    }
};

window.cambiarModoCongelacion = async function(modo) {
    var txtConfirm = "¿Confirmas cambiar el modo de congelación a " + modo + "?";
    if (modo === 'UNFREEZE') txtConfirm = "¿Descongelar ahora las clasificaciones? Todo el mundo verá los puntos en directo.";
    if (modo === 'FREEZE') txtConfirm = "¿Congelar manualmente las clasificaciones ahora?";
    if (modo === 'AUTO') txtConfirm = "¿Restablecer al horario automático de fin de semana?";

    if (!confirm(txtConfirm)) return;

    var btnU = document.getElementById('btnAdminUnfreezeNow');
    var btnF = document.getElementById('btnAdminFreezeNow');
    var btnA = document.getElementById('btnAdminAutoFreeze');
    if (btnU) btnU.disabled = true;
    if (btnF) btnF.disabled = true;
    if (btnA) btnA.disabled = true;

    try {
        var res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ action: 'set_freeze_override', usuario: currentUser, password: currentPassword, mode: modo }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        var d = await res.json();
        alert(d.message || "Modo actualizado con éxito");
        if (d.status === 'success') {
            window.location.reload();
        }
    } catch(err) {
        alert("Error de conexión al cambiar el modo de congelación.");
    } finally {
        if (btnU) btnU.disabled = false;
        if (btnF) btnF.disabled = false;
        if (btnA) btnA.disabled = false;
    }
};

window.aplicarIndicesBD = async function(e) {
    if (e) e.preventDefault();
    var btn = document.getElementById('btnApplyDbIndexes');
    var status = document.getElementById('adminDbIndexesStatus');
    var oldText = btn ? btn.innerText : '';
    if (btn) { btn.disabled = true; btn.innerText = '⏳ Aplicando...'; }
    if (status) status.innerHTML = '<span style="color:#e67e22; font-weight:600;">⏳ Creando y optimizando índices en Cloudflare D1...</span>';
    try {
        var res = await fetchSeguro(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ action: 'apply_indexes', usuario: currentUser, password: currentPassword }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        var d = await res.json();
        if (d.status === 'success') {
            if (status) status.innerHTML = '<span style="color:#27ae60; font-weight:bold;">✅ ' + (d.message || '¡Índices aplicados correctamente en D1!') + '</span>';
        } else {
            if (status) status.innerHTML = '<span style="color:#e74c3c;">❌ ' + (d.message || 'Error al aplicar índices.') + '</span>';
        }
    } catch(err) {
        if (status) status.innerHTML = '<span style="color:#e74c3c;">❌ Error de conexión: ' + err.message + '</span>';
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = oldText; }
    }
};

// --- SOPORTE DE DESPLAZAMIENTO HORIZONTAL EN PC (RUEDA DEL RATÓN + CLICK & DRAG + DIFUMINADO) ---
(function() {
    let activeDragSlider = null;
    let dragStartX = 0;
    let dragInitialScroll = 0;
    let didDrag = false;

    function getSlider(target) {
        if (!target || !target.closest) return null;
        return target.closest('.category-filter-strip, #league-slider-container, .horizontal-drag-scroll, .ranking-badges-wrap, .user-badges-scroll-track');
    }

    function updateBadgeScrollFade(el) {
        if (!el) return;
        const scrollWidth = el.scrollWidth;
        const clientWidth = el.clientWidth;
        const scrollLeft = el.scrollLeft;

        if (clientWidth === 0 || scrollWidth <= clientWidth + 2) {
            el.style.maskImage = 'none';
            el.style.webkitMaskImage = 'none';
            return;
        }

        const isRanking = el.classList.contains('ranking-badges-wrap');
        const fadePx = isRanking ? '14px' : '22px';
        const atStart = scrollLeft <= 2;
        const atEnd = Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 2;

        if (atStart && !atEnd) {
            const m = 'linear-gradient(to right, black calc(100% - ' + fadePx + '), transparent 100%)';
            el.style.maskImage = m;
            el.style.webkitMaskImage = m;
        } else if (atEnd && !atStart) {
            const m = 'linear-gradient(to right, transparent 0%, black ' + fadePx + ', black 100%)';
            el.style.maskImage = m;
            el.style.webkitMaskImage = m;
        } else if (!atStart && !atEnd) {
            const m = 'linear-gradient(to right, transparent 0%, black ' + fadePx + ', black calc(100% - ' + fadePx + '), transparent 100%)';
            el.style.maskImage = m;
            el.style.webkitMaskImage = m;
        } else {
            el.style.maskImage = 'none';
            el.style.webkitMaskImage = 'none';
        }
    }

    function updateAllBadgeScrollFades() {
        const list = document.querySelectorAll('.ranking-badges-wrap, .user-badges-scroll-track, .horizontal-drag-scroll');
        list.forEach(updateBadgeScrollFade);
    }

    window.updateBadgeScrollFade = updateBadgeScrollFade;
    window.updateAllBadgeScrollFades = updateAllBadgeScrollFades;

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.target) updateBadgeScrollFade(entry.target);
            }
        });
        window._badgeResizeObserver = resizeObserver;
    }

    window.observeBadgeScrollContainers = function() {
        if (!resizeObserver) return;
        document.querySelectorAll('.ranking-badges-wrap, .user-badges-scroll-track').forEach(el => {
            try { resizeObserver.observe(el); } catch(e) {}
        });
    };

    // 1. Rueda del ratón horizontal
    window.addEventListener('wheel', function(e) {
        const slider = getSlider(e.target);
        if (slider && slider.scrollWidth > slider.clientWidth) {
            // Si la rueda se mueve en vertical y no en horizontal
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                slider.scrollLeft += e.deltaY;
                updateBadgeScrollFade(slider);
            }
        }
    }, { passive: false });

    // 2. Click & Drag (Arrastrar con el cursor)
    window.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return; // Solo clic izquierdo
        const slider = getSlider(e.target);
        if (slider && slider.scrollWidth > slider.clientWidth) {
            activeDragSlider = slider;
            didDrag = false;
            dragStartX = e.pageX;
            dragInitialScroll = slider.scrollLeft;
            slider.classList.add('is-dragging');
        }
    });

    window.addEventListener('mousemove', function(e) {
        if (!activeDragSlider) return;
        const walk = e.pageX - dragStartX;
        if (Math.abs(walk) > 10) {
            didDrag = true;
        }
        activeDragSlider.scrollLeft = dragInitialScroll - walk;
        updateBadgeScrollFade(activeDragSlider);
    });

    window.addEventListener('mouseup', function() {
        if (activeDragSlider) {
            activeDragSlider.classList.remove('is-dragging');
            activeDragSlider = null;
            setTimeout(function() { didDrag = false; }, 60);
        }
    });

    // 3. Prevenir clic accidental en botones si el usuario ha arrastrado
    window.addEventListener('click', function(e) {
        if (didDrag) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);

    // 4. Escuchar evento scroll para actualizar difuminados en tiempo real (móvil y PC)
    window.addEventListener('scroll', function(e) {
        if (e.target && e.target.classList && (
            e.target.classList.contains('ranking-badges-wrap') ||
            e.target.classList.contains('user-badges-scroll-track') ||
            e.target.classList.contains('horizontal-drag-scroll')
        )) {
            updateBadgeScrollFade(e.target);
        }
    }, true);

    window.addEventListener('resize', updateAllBadgeScrollFades);
    window.addEventListener('orientationchange', updateAllBadgeScrollFades);
})();
