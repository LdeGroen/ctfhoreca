import React, { useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { api, clearStoredPincode, getStoredPincode, setStoredPincode } from './api';
import { disablePush, enablePush, getPushState } from './push';
import { UI } from './i18n';

const TAB_ORDER = ['voorstellingen', 'contact', 'wieiswie', 'playtimes', 'rehearsals', 'contracts', 'notulen', 'infosheet', 'safety'];

export default function App() {
    const [lang, setLang] = useState(() => localStorage.getItem('ctfhoreca_lang') || 'nl');
    const [loggedIn, setLoggedIn] = useState(() => !!getStoredPincode());
    const [bundle, setBundle] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('voorstellingen');

    const t = UI[lang];

    useEffect(() => { localStorage.setItem('ctfhoreca_lang', lang); }, [lang]);

    const loadBundle = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await api.bundle();
            setBundle(data);
        } catch (e) {
            if (e.status === 401 || e.status === 403) {
                clearStoredPincode();
                setLoggedIn(false);
                setBundle(null);
            } else {
                setError(e.message || 'Onbekende fout');
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (loggedIn && !bundle) loadBundle();
    }, [loggedIn, bundle, loadBundle]);

    const handleLogin = async (pincode) => {
        setError('');
        try {
            setStoredPincode(pincode);
            await api.login(pincode);
            setLoggedIn(true);
        } catch (e) {
            clearStoredPincode();
            setError(t.login_failed);
            throw e;
        }
    };

    const handleLogout = () => {
        clearStoredPincode();
        setLoggedIn(false);
        setBundle(null);
    };

    if (!loggedIn) {
        return (
            <>
                <LoginScreen onLogin={handleLogin} lang={lang} setLang={setLang} error={error} />
                <InstallPrompt t={t} />
            </>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header lang={lang} setLang={setLang} onLogout={handleLogout} t={t} name={bundle?.location?.name} />
            <InstallPrompt t={t} />
            {loading && <div className="text-center text-gray-500 py-12">{t.loading}</div>}
            {error && <div className="max-w-3xl mx-auto m-4 p-4 bg-red-50 text-red-700 rounded">{error}</div>}

            {bundle && (
                <>
                    <TabBar tabs={TAB_ORDER} active={activeTab} onChange={setActiveTab} t={t} />
                    <NotificationToggle vapidPublicKey={bundle.vapid_public_key} lang={lang} t={t} />
                    <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
                        {activeTab === 'voorstellingen' && <VoorstellingenTab items={bundle.voorstellingen} lang={lang} t={t} />}
                        {activeTab === 'contact' && <ContactTab contact={bundle.contact} t={t} />}
                        {activeTab === 'wieiswie' && <WieIsWieTab teams={bundle.teams} t={t} />}
                        {activeTab === 'playtimes' && <PlaytimesTab playtimes={bundle.playtimes} lang={lang} t={t} />}
                        {activeTab === 'rehearsals' && <RehearsalsTab rehearsals={bundle.rehearsals} lang={lang} t={t} />}
                        {activeTab === 'contracts' && <ContractsTab contracts={bundle.contracts} t={t} />}
                        {activeTab === 'notulen' && <NotulenTab notulen={bundle.notulen} t={t} />}
                        {activeTab === 'infosheet' && <InfosheetTab infosheet={bundle.infosheet} lang={lang} t={t} />}
                        {activeTab === 'safety' && <SafetyTab veiligheid={bundle.veiligheid} lang={lang} t={t} />}
                    </main>
                </>
            )}

            <footer className="text-center text-xs text-gray-400 py-6">© Café Theater Festival</footer>
        </div>
    );
}

// =====================================================================
// Header & tabs
// =====================================================================
function Header({ lang, setLang, onLogout, t, name }) {
    return (
        <header className="bg-ctf-primary text-white shadow">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">{name ? `${t.welcome}, ${name}` : t.title}</h1>
                    <p className="text-xs md:text-sm opacity-80">{t.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                    <LangSwitch lang={lang} setLang={setLang} />
                    <button onClick={onLogout} className="text-xs px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded">{t.logout}</button>
                </div>
            </div>
        </header>
    );
}

function LangSwitch({ lang, setLang }) {
    return (
        <div className="flex rounded-full bg-white/15 text-xs overflow-hidden">
            <button onClick={() => setLang('nl')} className={`px-3 py-1.5 ${lang === 'nl' ? 'bg-white text-ctf-primary' : 'text-white'}`}>NL</button>
            <button onClick={() => setLang('en')} className={`px-3 py-1.5 ${lang === 'en' ? 'bg-white text-ctf-primary' : 'text-white'}`}>EN</button>
        </div>
    );
}

function TabBar({ tabs, active, onChange, t }) {
    const labels = {
        voorstellingen: t.tab_voorstellingen,
        contact: t.tab_contact,
        wieiswie: t.tab_wieiswie,
        playtimes: t.tab_playtimes,
        rehearsals: t.tab_rehearsals,
        contracts: t.tab_contracts,
        notulen: t.tab_notulen,
        infosheet: t.tab_infosheet,
        safety: t.safety,
    };
    return (
        <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-2 flex flex-wrap justify-center">
                {tabs.map(id => (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${active === id ? 'border-ctf-primary text-ctf-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                    >{labels[id]}</button>
                ))}
            </div>
        </nav>
    );
}

// =====================================================================
// Login screen
// =====================================================================
function LoginScreen({ onLogin, lang, setLang, error }) {
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState(false);
    const t = UI[lang];

    const submit = async (e) => {
        e.preventDefault();
        if (!pin) return;
        setBusy(true);
        try { await onLogin(pin); } catch {} finally { setBusy(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-ctf-primary/20 to-purple-100">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <div className="flex justify-end mb-4"><LangSwitch lang={lang} setLang={setLang} /></div>
                <h1 className="text-2xl font-bold text-ctf-primary">{t.title}</h1>
                <p className="text-sm text-gray-500 mb-6">{t.subtitle}</p>
                <p className="text-sm text-gray-600 mb-4">{t.login_intro}</p>
                <form onSubmit={submit} className="space-y-3">
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder={t.pincode}
                        className="w-full border rounded p-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-ctf-primary/40"
                        autoFocus
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button
                        type="submit"
                        disabled={busy || pin.length < 4}
                        className="w-full bg-ctf-primary text-white py-2.5 rounded font-medium hover:bg-ctf-primary/90 disabled:opacity-50"
                    >{t.login}</button>
                </form>
            </div>
        </div>
    );
}

// =====================================================================
// Tabs
// =====================================================================
function VoorstellingenTab({ items, lang, t }) {
    const [open, setOpen] = useState(null);
    if (!items?.length) return <EmptyState text={t.v_none} />;
    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map(v => (
                    <button key={v.performance_id} onClick={() => setOpen(v)}
                            className="text-left bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
                        <div className="font-semibold">{v.title}</div>
                        {v.company && <div className="text-sm text-gray-500 mt-0.5">{v.company}</div>}
                        <div className="text-xs text-ctf-primary mt-2">{t.v_more} →</div>
                    </button>
                ))}
            </div>
            {open && <VoorstellingModal v={open} lang={lang} t={t} onClose={() => setOpen(null)} />}
        </>
    );
}

function VoorstellingModal({ v, lang, t, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const text = v.has_marketing
        ? ((lang === 'en' && v.marketing_text_en) ? v.marketing_text_en : v.marketing_text)
        : v.programmer_text;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {v.has_marketing && v.image && (
                    <img src={v.image} alt={v.title} className="w-full max-h-64 object-cover rounded-t-2xl" />
                )}
                <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-ctf-primary">{v.title}</h2>
                            {v.company && <p className="text-sm text-gray-500">{v.company}</p>}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
                    </div>
                    {text ? (
                        <p className="mt-4 text-gray-700 whitespace-pre-line">{text}</p>
                    ) : (
                        <p className="mt-4 text-gray-400">{t.v_no_info}</p>
                    )}
                    {!v.has_marketing && v.programmer_text && (
                        <p className="mt-3 text-xs text-gray-400">{t.v_programmer_note}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function ContactTab({ contact, t }) {
    const hasAny = (contact?.programmers?.length || 0) + (contact?.producers?.length || 0) + (contact?.companies?.length || 0) > 0;
    if (!hasAny) return <EmptyState text={t.no_items} />;
    return (
        <div className="space-y-6">
            {contact.programmers?.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.c_programmer}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {contact.programmers.map(p => <PersonCard key={p.id} p={p} />)}
                    </div>
                </section>
            )}
            {contact.producers?.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.c_producer}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {contact.producers.map(p => <PersonCard key={p.id} p={p} />)}
                    </div>
                </section>
            )}
            {contact.companies?.map((g, i) => (
                <section key={i}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.c_company}: {g.company}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {g.contacts.map(p => <PersonCard key={p.id} p={p} />)}
                    </div>
                </section>
            ))}
        </div>
    );
}

function WieIsWieTab({ teams, t }) {
    if (!teams?.length) return <EmptyState text={t.no_items} />;
    return (
        <div className="space-y-6">
            {teams.map(team => (
                <section key={team.id}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{team.naam}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {team.members.map(p => <PersonCard key={p.id} p={p} />)}
                    </div>
                </section>
            ))}
        </div>
    );
}

function PlaytimesTab({ playtimes, lang, t }) {
    if (!playtimes?.length) return <EmptyState text={t.playtimes_none} />;
    return (
        <div className="bg-white rounded-xl shadow-sm divide-y">
            {playtimes.map((p, i) => (
                <div key={i} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="font-semibold">{p.title}</div>
                        {p.company && <div className="text-sm text-gray-500">{p.company}</div>}
                    </div>
                    <div className="text-sm text-ctf-primary font-medium whitespace-nowrap">{formatDateTime(p.datetime, lang)}</div>
                </div>
            ))}
        </div>
    );
}

function RehearsalsTab({ rehearsals, lang, t }) {
    if (!rehearsals?.length) return <EmptyState text={t.reh_none} />;
    return (
        <div className="bg-white rounded-xl shadow-sm divide-y">
            {rehearsals.map(r => (
                <div key={r.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="font-semibold">{r.company || t.reh_company}</div>
                        {r.note && <div className="text-sm text-gray-500">{r.note}</div>}
                    </div>
                    <div className="text-sm text-ctf-primary font-medium whitespace-nowrap">
                        {formatDateTime(r.starts_at, lang)}
                        {r.ends_at ? ` – ${new Date(r.ends_at).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'nl-NL', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ContractsTab({ contracts, t }) {
    const [busyId, setBusyId] = useState(null);
    if (!contracts?.length) return <EmptyState text={t.no_items} />;
    const openContract = async (id) => {
        setBusyId(id);
        try {
            const url = await api.contractBlobUrl(id);
            window.open(url, '_blank', 'noopener');
        } catch { /* negeer */ } finally { setBusyId(null); }
    };
    return (
        <div className="bg-white rounded-xl shadow-sm divide-y">
            {contracts.map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="font-medium truncate">{c.title || c.filename}</div>
                    </div>
                    <button onClick={() => openContract(c.id)} disabled={busyId === c.id}
                            className="text-sm font-medium text-ctf-primary hover:underline whitespace-nowrap disabled:opacity-50">
                        {busyId === c.id ? '…' : `${t.contract_open} →`}
                    </button>
                </div>
            ))}
        </div>
    );
}

function NotulenTab({ notulen, t }) {
    if (!notulen?.length) return <EmptyState text={t.notulen_none} />;
    return (
        <div className="bg-white rounded-xl shadow-sm divide-y">
            {notulen.map(n => (
                <a key={n.year} href={n.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50 transition">
                    <div className="min-w-0">
                        <div className="font-medium">{t.notulen_title} {n.year}</div>
                        <div className="text-sm text-gray-500 truncate">{n.filename}</div>
                    </div>
                    <span className="text-sm font-medium text-ctf-primary whitespace-nowrap">{t.contract_open} →</span>
                </a>
            ))}
        </div>
    );
}

function InfosheetTab({ infosheet, lang, t }) {
    const html = infosheet?.[lang] || infosheet?.nl || '';
    if (!html.trim()) return <EmptyState text={t.infosheet_none} />;
    return (
        <article className="bg-white rounded-xl shadow-sm p-6">
            <div className="ctf-prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { ADD_TAGS: ['img'], ADD_ATTR: ['style', 'src', 'alt'] }) }} />
        </article>
    );
}

function SafetyTab({ veiligheid, lang, t }) {
    const subs = [
        { id: 'spelen', label: t.safety_spelen },
        { id: 'algemeen', label: t.safety_algemeen },
    ];
    const [activeSub, setActiveSub] = useState('algemeen');
    const html = veiligheid?.[activeSub]?.[lang] || veiligheid?.[activeSub]?.nl || '';

    return (
        <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
                {subs.map(s => (
                    <button key={s.id} onClick={() => setActiveSub(s.id)}
                            className={`px-4 py-2 text-sm rounded-full border transition ${activeSub === s.id ? 'bg-ctf-primary text-white border-ctf-primary' : 'bg-white text-gray-700 border-gray-200 hover:border-ctf-primary/40'}`}
                    >{s.label}</button>
                ))}
            </div>
            <article className="bg-white rounded-xl shadow-sm p-6">
                {html
                    ? <div className="ctf-prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
                    : <div className="text-gray-400 text-center py-8">{t.no_items}</div>}
            </article>
        </div>
    );
}

function PersonCard({ p, withPhoto = true }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
                {withPhoto && (p.photo ? (
                    <img src={p.photo} alt={p.name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-ctf-primary/20 text-ctf-primary flex items-center justify-center font-bold">
                        {(p.name || '?').slice(0, 1)}
                    </div>
                ))}
                <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    {p.function && <div className="text-xs text-gray-500 truncate">{p.function}</div>}
                </div>
            </div>
            {(p.email || p.phone) && (
                <div className="mt-3 text-xs text-gray-600 space-y-1">
                    {p.email && <div><a className="text-ctf-primary hover:underline" href={`mailto:${p.email}`}>{p.email}</a></div>}
                    {p.phone && <div><a className="text-ctf-primary hover:underline" href={`tel:${p.phone}`}>{p.phone}</a></div>}
                </div>
            )}
        </div>
    );
}

// =====================================================================
// Install hint + push toggle
// =====================================================================
function InstallPrompt({ t }) {
    const [show, setShow] = useState(false);
    const [platform, setPlatform] = useState('android');
    const [deferred, setDeferred] = useState(null);

    useEffect(() => {
        const ua = navigator.userAgent || '';
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isAndroid = /Android/i.test(ua);
        const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
        let seen = false;
        try { seen = localStorage.getItem('ctfhoreca_install_hint_v1') === '1'; } catch {}
        if ((isIOS || isAndroid) && !standalone && !seen) {
            setPlatform(isIOS ? 'ios' : 'android');
            setShow(true);
        }
        const onBeforeInstall = (e) => { e.preventDefault(); setDeferred(e); };
        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    }, []);

    const dismiss = () => {
        try { localStorage.setItem('ctfhoreca_install_hint_v1', '1'); } catch {}
        setShow(false);
    };

    const install = async () => {
        if (!deferred) return;
        deferred.prompt();
        try { await deferred.userChoice; } catch {}
        setDeferred(null);
        dismiss();
    };

    if (!show) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="install-title">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <h2 id="install-title" className="text-lg font-bold text-ctf-primary">{t.install_title}</h2>
                <p className="text-sm text-gray-600 mt-1">{t.install_intro}</p>
                {platform === 'ios' ? (
                    <ol className="text-sm text-gray-700 mt-4 space-y-2 list-decimal list-inside">
                        <li>{t.install_ios_1}</li>
                        <li>{t.install_ios_2}</li>
                    </ol>
                ) : deferred ? (
                    <button onClick={install} className="w-full mt-4 bg-ctf-primary text-white py-2.5 rounded font-medium hover:bg-ctf-primary/90">{t.install_button}</button>
                ) : (
                    <ol className="text-sm text-gray-700 mt-4 space-y-2 list-decimal list-inside">
                        <li>{t.install_android_1}</li>
                        <li>{t.install_android_2}</li>
                    </ol>
                )}
                <button onClick={dismiss} className="w-full mt-3 text-sm text-gray-500 py-2 hover:text-gray-700">{t.install_later}</button>
            </div>
        </div>
    );
}

function NotificationToggle({ vapidPublicKey, lang, t }) {
    const [state, setState] = useState('loading');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getPushState().then(s => { if (!cancelled) setState(s); });
        return () => { cancelled = true; };
    }, []);

    if (!vapidPublicKey || state === 'loading' || state === 'unsupported') return null;

    const enable = async () => {
        setBusy(true);
        try {
            await enablePush(vapidPublicKey, lang);
            setState('subscribed');
        } catch {
            setState((window.Notification && Notification.permission === 'denied') ? 'denied' : 'default');
        } finally { setBusy(false); }
    };
    const disable = async () => {
        setBusy(true);
        try { await disablePush(); setState('default'); } catch { /* negeer */ } finally { setBusy(false); }
    };

    return (
        <div className="max-w-4xl mx-auto w-full px-4 mt-3">
            {state === 'subscribed' ? (
                <div className="bg-ctf-primary/10 text-ctf-primary rounded-lg px-4 py-2 text-sm flex items-center justify-between gap-3">
                    <span>🔔 {t.notif_enabled}</span>
                    <button onClick={disable} disabled={busy} className="underline hover:no-underline disabled:opacity-50">{t.notif_disable}</button>
                </div>
            ) : state === 'denied' ? (
                <div className="bg-amber-50 text-amber-800 rounded-lg px-4 py-2 text-sm">{t.notif_denied}</div>
            ) : (
                <div className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700">{t.notif_intro}</div>
                    <button onClick={enable} disabled={busy} className="whitespace-nowrap bg-ctf-primary text-white text-sm px-3 py-1.5 rounded font-medium hover:bg-ctf-primary/90 disabled:opacity-50">{t.notif_enable}</button>
                </div>
            )}
        </div>
    );
}

function EmptyState({ text }) {
    return <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">{text}</div>;
}

function formatDateTime(iso, lang) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(lang === 'en' ? 'en-GB' : 'nl-NL', { dateStyle: 'medium', timeStyle: 'short' });
}
