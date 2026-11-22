// ============================================================================
// SHARED UTILITIES FOR CLOUDFLARE PAGES FUNCTIONS
// ============================================================================

export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json;charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-store"
        }
    });
}

export function getMadridTimestamp(year, month, day, hour, minute) {
    const d = new Date(Date.UTC(year, month, day, hour, minute));
    const formatter = new Intl.DateTimeFormat('en-GB', { 
        timeZone: 'Europe/Madrid', 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit', 
        hour12: false 
    });
    const formatted = formatter.format(d);
    const match = formatted.match(/(\d\d)\/(\d\d)\/(\d{4}), (\d\d):(\d\d):(\d\d)/);
    if (!match) return d.getTime();
    const diffMs = Date.UTC(parseInt(match[3]), parseInt(match[2])-1, parseInt(match[1]), parseInt(match[4])) - Date.UTC(year, month, day, hour);
    return d.getTime() - diffMs;
}

export function formatTsToMadridStr(ts) {
    if (!ts || isNaN(ts)) return 'Sin fecha';
    const d = new Date(Number(ts));
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d);
    const get = (t) => (parts.find(p => p.type === t) || {}).value || '';
    const hh = get('hour') === '24' ? '00' : get('hour');
    return `${get('day')}/${get('month')}/${get('year')} ${hh}:${get('minute')}`;
}

export async function hashPassword(password) {
    if (!password) return "";
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return 'v1$' + saltHex + '$' + hashHex;
}

export async function verifyPasswordHash(password, storedHash) {
    if (!password || !storedHash) return false;
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'v1') return false;
    const saltHex = parts[1];
    const expectedHashHex = parts[2];
    const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    const derivedHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return derivedHex === expectedHashHex;
}

export async function flushBatch(db, stmts, chunkSize = 50) {
    if (!stmts || stmts.length === 0) return;
    if (stmts.length === 1) {
        await stmts[0].run();
        return;
    }
    for (let i = 0; i < stmts.length; i += chunkSize) {
        await db.batch(stmts.slice(i, i + chunkSize));
    }
}

export function runInBg(context, promise) {
    const p = Promise.resolve(promise).catch(e => console.warn("BG task error:", e));
    if (context && typeof context.waitUntil === 'function') {
        context.waitUntil(p);
    }
    return p;
}

export function isSchemaMissingErr(err) {
    return /no such (column|table)/i.test(String(err && err.message || err || ''));
}

export async function runInChunks(items, chunkSize, fn) {
    const out = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const settled = await Promise.allSettled(chunk.map(fn));
        out.push(...settled);
    }
    return out;
}

export function parseReglasPuntuacion(regRows) {
    let ptsSets = 5, ptsGanador = 3, ptsDiffExacta = 2, maxDistancia = 10, pctMvp = 10;
    let hasMvpRuleInDb = false;
    for (const r of regRows || []) {
        const reg = (r.Regla || "").toLowerCase();
        const rawNum = parseFloat(String(r.Puntos !== undefined && r.Puntos !== null ? r.Puntos : "").replace(',', '.'));
        if (!Number.isFinite(rawNum)) continue;
        if (reg.includes("sets")) ptsSets = Math.round(rawNum);
        else if (reg.includes("ganador")) ptsGanador = Math.round(rawNum);
        else if (reg.includes("exacta")) ptsDiffExacta = Math.round(rawNum);
        else if (reg.includes("distancia") || reg.includes("max")) maxDistancia = Math.round(rawNum);
        else if (reg.includes("mvp")) {
            pctMvp = rawNum;
            hasMvpRuleInDb = true;
        }
    }
    const rulesCacheSig = `${ptsSets}|${ptsGanador}|${ptsDiffExacta}|${maxDistancia}|${pctMvp}`;
    return { ptsSets, ptsGanador, ptsDiffExacta, maxDistancia, pctMvp, hasMvpRuleInDb, rulesCacheSig };
}

export async function isModoMantenimientoActivo(db) {
    try {
        const row = await db.prepare("SELECT valor FROM Cache_App WHERE clave = 'MODO_MANTENIMIENTO'").first();
        if (!row) {
            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES ('MODO_MANTENIMIENTO', '1', ?)")
                .bind(Date.now()).run();
            return true;
        }
        return row.valor === '1';
    } catch(e) {
        try {
            await db.prepare('CREATE TABLE IF NOT EXISTS "Cache_App" ("clave" TEXT PRIMARY KEY, "valor" TEXT, "timestamp" INTEGER)').run();
            const rowRetry = await db.prepare("SELECT valor FROM Cache_App WHERE clave = 'MODO_MANTENIMIENTO'").first();
            if (!rowRetry) {
                await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES ('MODO_MANTENIMIENTO', '1', ?)")
                    .bind(Date.now()).run();
                return true;
            }
            return rowRetry.valor === '1';
        } catch(e2) {
            console.error("Error comprobando modo mantenimiento:", e2);
            return true;
        }
    }
}

export async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (VCV-Play/Official-Checker)' },
        ...options
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${url}`);
    return res.json();
}

export async function fetchText(url, options = {}) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (VCV-Play/Official-Checker)' },
        ...options
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${url}`);
    return res.text();
}
