import React, { useState } from 'react';
import socket, { SERVER_URL } from '../socket';
import I18N from '../i18n';
import { ensureAudioContext, toggleBGM, playSFX } from '../audio';
import { IconUser, IconGlobe } from '../components/Icons';

const LoginScreen = ({ onLogin, lang, setLang }) => {
    const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
    const [isRegisterMode, setIsRegisterMode] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
    const t = I18N[lang];

    const handleAuth = async () => {
        setError(''); if (!username.trim() || !password.trim()) { playSFX('error'); setError(t.err_empty); return; }
        setLoading(true);
        try {
            ensureAudioContext();
            const endpoint = isRegisterMode ? '/api/register' : '/api/login';
            const res = await fetch(SERVER_URL + endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            socket.emit('authenticate', data.user.username);

            localStorage.setItem('tactical_user_cache', JSON.stringify(data.user));
            localStorage.setItem('tactical_sfx', data.user.settings.sfx ? 'on' : 'off');
            if(data.user.settings.bgm) setTimeout(()=>toggleBGM(true), 200);
            playSFX('select'); onLogin(data.user);
        } catch (err) { playSFX('error'); setError(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen z-10 relative p-4">
            <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="absolute top-6 right-6 glass-panel px-4 py-2 rounded-full text-xs font-mono flex gap-2 items-center hover:text-brand-cyan transition"><IconGlobe/> {lang === 'zh' ? 'EN' : '中'}</button>
            <div className="mb-8 md:mb-12 text-center relative">
                <div className="inline-block px-3 py-1 mb-4 rounded-full border border-brand-cyan/30 text-brand-cyan text-xs font-mono font-bold tracking-widest bg-brand-cyan/10">v17.0 Full Core Protocol</div>
                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight"><span className="text-gradient">{t.login_title}</span></h1>
                <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-lg font-mono">{t.login_sub}</p>
            </div>
            <div className="glass-panel p-6 md:p-8 rounded-2xl w-full max-w-md flex flex-col gap-5">
                {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded text-sm font-mono text-center animate-shake">{error}</div>}
                <input type="text" className="w-full bg-black/50 border border-brand-cyan/20 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-brand-cyan transition font-mono shadow-[inset_0_0_10px_rgba(0,240,255,0.05)]" placeholder={t.login_ph} value={username} onChange={e => setUsername(e.target.value)} />
                <input type="password" className="w-full bg-black/50 border border-brand-cyan/20 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-brand-cyan transition font-mono shadow-[inset_0_0_10px_rgba(0,240,255,0.05)]" placeholder={t.login_pass} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                <button onClick={handleAuth} disabled={loading} className="cyber-btn mt-2 w-full bg-brand-cyan hover:bg-[#00d0e0] text-black font-black tracking-widest py-4 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition transform active:scale-95 flex justify-center gap-2 disabled:opacity-50">
                    {loading ? <span className="animate-pulse">PROCESSING...</span> : <><IconUser /> {isRegisterMode ? t.login_reg : t.login_btn}</>}
                </button>
                <button onClick={() => {setIsRegisterMode(!isRegisterMode); setError('');}} className="text-gray-500 hover:text-brand-cyan text-sm font-mono mt-2 transition">{isRegisterMode ? t.login_toggle_log : t.login_toggle_reg}</button>
            </div>
        </div>
    );
};

export default LoginScreen;
