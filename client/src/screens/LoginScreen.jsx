import React, { useState } from 'react';
import socket, { SERVER_URL } from '../socket';
import I18N from '../i18n';
import { ensureAudioContext, toggleBGM, playSFX } from '../audio';
import { IconUser, IconGlobe } from '../components/Icons';

// 构造一个本地匿名访客对象，不会写入服务端数据库
function buildGuestUser() {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const username = `Guest_${suffix}`;
    return {
        id: 'anon_' + Math.random().toString(36).slice(2, 11),
        username,
        isGuest: true,
        stats: { wins: 0, matches: 0 },
        quests: { kills: 0, matches: 0, dmg: 0 },
        economy: {
            credits: 0,
            unlocks: ['stars', 'grid', 'orbs', 'abstract', 'frame_default', 'card_default']
        },
        gacha: { p4: 0, p5: 0 },
        settings: {
            bgTheme: 'stars',
            avatar: '',
            sfx: true,
            bgm: false,
            frame: 'frame_default',
            cardSkin: 'card_default',
            title: '访客',
            ring: 'ring_default',
            chip: '',
            signature: ''
        },
        friends: [],
        friendRequests: [],
        messages: {},
        invites: [],
        status: 'lobby',
        recentPlayers: [],
        inbox: [],
        customRelics: []
    };
}

const LoginScreen = ({ onLogin, lang, setLang, pendingRoomId }) => {
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

    const handleGuestJoin = () => {
        ensureAudioContext();
        const guest = buildGuestUser();
        socket.emit('authenticate_guest', guest.username);
        localStorage.setItem('tactical_user_cache', JSON.stringify(guest));
        localStorage.setItem('tactical_sfx', 'on');
        playSFX('select');
        onLogin(guest);
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
                {pendingRoomId && (
                    <div className="bg-brand-pink/10 border border-brand-pink/50 rounded-lg px-4 py-3 text-xs md:text-sm font-mono text-brand-pink tracking-wide">
                        <div className="font-bold mb-1">
                            {lang === 'zh' ? '检测到房间邀请链接' : 'Room invitation detected'}
                        </div>
                        <div className="text-brand-pink/80 break-all">
                            {lang === 'zh' ? '目标节点：' : 'Target node: '} <span className="text-white">{pendingRoomId}</span>
                        </div>
                        <div className="text-gray-400 text-[10px] md:text-xs mt-1">
                            {lang === 'zh'
                                ? '登录后自动接入；也可作为匿名访客直接进入。'
                                : 'Log in to auto-join, or enter anonymously as a guest.'}
                        </div>
                    </div>
                )}
                {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded text-sm font-mono text-center animate-shake">{error}</div>}
                <input type="text" className="w-full bg-black/50 border border-brand-cyan/20 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-brand-cyan transition font-mono shadow-[inset_0_0_10px_rgba(0,240,255,0.05)]" placeholder={t.login_ph} value={username} onChange={e => setUsername(e.target.value)} />
                <input type="password" className="w-full bg-black/50 border border-brand-cyan/20 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-brand-cyan transition font-mono shadow-[inset_0_0_10px_rgba(0,240,255,0.05)]" placeholder={t.login_pass} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                <button onClick={handleAuth} disabled={loading} className="cyber-btn mt-2 w-full bg-brand-cyan hover:bg-[#00d0e0] text-black font-black tracking-widest py-4 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition transform active:scale-95 flex justify-center gap-2 disabled:opacity-50">
                    {loading ? <span className="animate-pulse">PROCESSING...</span> : <><IconUser /> {isRegisterMode ? t.login_reg : t.login_btn}</>}
                </button>
                <button onClick={() => {setIsRegisterMode(!isRegisterMode); setError('');}} className="text-gray-500 hover:text-brand-cyan text-sm font-mono mt-2 transition">{isRegisterMode ? t.login_toggle_log : t.login_toggle_reg}</button>
                {pendingRoomId && (
                    <>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 tracking-widest uppercase">
                            <div className="flex-1 h-px bg-white/10"></div>
                            <span>{lang === 'zh' ? '或' : 'OR'}</span>
                            <div className="flex-1 h-px bg-white/10"></div>
                        </div>
                        <button
                            onClick={handleGuestJoin}
                            className="cyber-btn w-full bg-brand-pink/20 hover:bg-brand-pink/40 text-brand-pink border border-brand-pink/60 font-black tracking-widest py-3 transition transform active:scale-95">
                            {lang === 'zh' ? '以匿名访客身份加入' : 'Join as Guest'}
                        </button>
                        <div className="text-[10px] md:text-xs font-mono text-gray-500 text-center leading-relaxed">
                            {lang === 'zh'
                                ? '访客模式：仅限本次对局，不保存战绩/CR/模块。'
                                : 'Guest mode: this session only, no stats/CR/modules saved.'}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LoginScreen;
