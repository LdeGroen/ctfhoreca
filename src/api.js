export const API_URL = process.env.REACT_APP_API_URL || 'https://backend.cafetheaterfestival.nl';

const PINCODE_KEY = 'ctfhoreca_pincode_v1';

export function getStoredPincode() {
    try { return sessionStorage.getItem(PINCODE_KEY) || ''; } catch { return ''; }
}
export function setStoredPincode(pin) {
    try { sessionStorage.setItem(PINCODE_KEY, pin); } catch {}
}
export function clearStoredPincode() {
    try { sessionStorage.removeItem(PINCODE_KEY); } catch {}
}

async function request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const pin = getStoredPincode();
    if (pin) headers['X-Horeca-Pincode'] = pin;
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
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
    bundle: () => request('/api/horeca/public/bundle'),
    // Contracten staan in een afgeschermde map; haal de PDF op mét pincode-header
    // en geef een object-URL terug zodat de browser 'm kan openen/downloaden.
    contractBlobUrl: async (id) => {
        const pin = getStoredPincode();
        const res = await fetch(`${API_URL}/api/horeca/public/contract/${id}`, {
            headers: { 'X-Horeca-Pincode': pin },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    },
};
