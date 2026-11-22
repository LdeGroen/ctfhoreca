export const API_URL = import.meta.env.VITE_API_URL || 'https://backend.cafetheaterfestival.nl';

// Na het inloggen bewaren we het sessietoken van de backend, niet de pincode
// (audit BE-S-01, 22-11-2026). Een tabblad van vóór die dag heeft nog een
// pincode in de opslag; die gaat tijdens de overgang nog mee als header.
const SESSIE_KEY = 'ctfhoreca_sessie_v1';
const PINCODE_KEY = 'ctfhoreca_pincode_v1';

function lees(sleutel) {
    try { return sessionStorage.getItem(sleutel) || ''; } catch { return ''; }
}
export function isIngelogd() {
    return !!(lees(SESSIE_KEY) || lees(PINCODE_KEY));
}
export function bewaarSessie(sessie) {
    try {
        sessionStorage.setItem(SESSIE_KEY, sessie);
        sessionStorage.removeItem(PINCODE_KEY);
    } catch { /* privévenster zonder opslag */ }
}
export function vergeetSessie() {
    try {
        sessionStorage.removeItem(SESSIE_KEY);
        sessionStorage.removeItem(PINCODE_KEY);
    } catch { /* geen opslag */ }
}

/** De header waarmee de backend weet wie er is: sessietoken, of (oud tabblad) de pincode. */
export function authHeaders() {
    const sessie = lees(SESSIE_KEY);
    if (sessie) return { 'X-Portaal-Sessie': sessie };
    const pin = lees(PINCODE_KEY);
    return pin ? { 'X-Horeca-Pincode': pin } : {};
}

// Event als de pincode niet meer geldt (401 met pincode, bijvoorbeeld na
// het roteren in de Controlekamer). App luistert en gaat terug naar het
// inlogscherm, in plaats van tabbladen leeg te laten (audit POR-10).
export const PINCODE_WEG = 'ctf-pincode-weg';

async function request(path, options = {}) {
    const headers = { Accept: 'application/json', ...authHeaders(), ...(options.headers || {}) };
    const ingelogd = isIngelogd();
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
        if (res.status === 401 && ingelogd) {
            vergeetSessie();
            window.dispatchEvent(new Event(PINCODE_WEG));
        }
        const err = new Error(body?.message || `HTTP ${res.status}`);
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return body;
}

export const api = {
    login: (pincode) => request('/api/horeca/public/login', {
        method: 'POST',
        body: JSON.stringify({ pincode }),
    }),
    // Uitloggen trekt het sessietoken in (audit BE-S-01).
    logout: () => request('/api/horeca/public/logout', { method: 'POST' }),
    bundle: () => request('/api/horeca/public/bundle'),
    // Contracten staan in een afgeschermde map; haal de PDF op mét pincode-header
    // en geef een object-URL terug zodat de browser 'm kan openen/downloaden.
    contractBlobUrl: async (id) => {
        const res = await fetch(`${API_URL}/api/horeca/public/contract/${id}`, {
            headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    },
};
