import React, { useState, useEffect, startTransition } from 'react';
import socket from '../socket';
import I18N from '../i18n';
import LOOT_POOLS from '../loot_pools';
import { playSFX, ensureAudioContext, toggleBGM } from '../audio';
import { getRank, getCardClass, getWeapons } from '../constants';
import AvatarDisplay from '../components/AvatarDisplay';
import ProfileModal from '../components/ProfileModal';
import PrivateChat from '../components/PrivateChat';
import TransferModal from '../components/TransferModal';
import BackgroundEngine from '../components/BackgroundEngine';
import { IconCpu, IconSettings, IconLogOut, IconUpload, IconCart, IconBook, IconStar, IconChevronDown, IconUsers, IconMail, IconGift, IconInbox } from '../components/Icons';
import MailboxModal from '../components/MailboxModal';

const WarpScreen = React.lazy(() => import('./WarpScreen'));

const HexSlot = ({ icon, label, isSelected, onClick, isEmpty }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group" style={{ width: '80px' }}>
        <div style={{ width: '72px', height: '80px', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: isSelected ? 'rgba(0,255,100,0.5)' : 'rgba(0,240,255,0.15)', padding: '3px', transition: 'background 0.2s' }}>
            <div style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: isSelected ? 'rgba(0,30,15,0.95)' : '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: isEmpty ? '18px' : '26px', color: isEmpty ? 'rgba(150,150,170,0.6)' : 'inherit', transition: 'background 0.2s' }}>
                {icon}
            </div>
        </div>
        <span className="text-[10px] font-mono text-center leading-tight truncate w-full text-center" style={{ color: isSelected ? '#00ff64' : isEmpty ? 'rgba(150,150,170,0.5)' : 'rgba(0,240,255,0.8)' }}>{label}</span>
    </button>
);

const ModulesScreen = ({ user, onClose, lang }) => {
    const t = I18N[lang];
    const [selectedChip, setSelectedChip] = useState(user.settings?.chip || '');
    const unl = user.economy?.unlocks || [];
    const unlockedChips = [...LOOT_POOLS[4], ...LOOT_POOLS[5]].filter(i=>i.type==='chip' && unl.includes(i.id));

    const saveModule = () => {
        socket.emit('update_settings', { chip: selectedChip }, null, null, () => {
            playSFX('heal'); onClose();
        });
    };

    const chipData = unlockedChips.find(c => c.id === selectedChip);
    const allSlots = [{ id: '', icon: '✕', n: '—', desc: '', isEmpty: true }, ...unlockedChips];

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="glass-panel-heavy p-4 md:p-8 rounded-3xl modal-responsive animate-float-up" style={{ animation: 'none', transform: 'none' }}>
                <div className="flex justify-between items-center border-b border-brand-cyan/30 pb-4 shrink-0">
                    <h2 className="text-xl md:text-3xl font-black text-brand-cyan tracking-widest flex items-center gap-3"><IconCpu/> {t.mod_title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mt-4 flex-1">
                    {/* Left panel: avatar + equipped chip name */}
                    <div className="w-full md:w-[140px] shrink-0 flex flex-col items-center gap-3 pt-2">
                        <AvatarDisplay avatar={user.settings?.avatar} name={user.username} frame={user.settings?.frame} className="w-[60px] h-[60px] rounded-full border-2 border-brand-cyan shadow-[0_0_18px_#00f0ff]" />
                        <div className="text-center">
                            <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-1">equipped</div>
                            {chipData ? (
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-2xl">{chipData.icon}</span>
                                    <span className="text-xs font-bold text-brand-cyan tracking-wide text-center leading-tight">{chipData.n}</span>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-600 font-mono">未装备</span>
                            )}
                        </div>
                    </div>

                    {/* Right panel: hex grid + description */}
                    <div className="flex-1 flex flex-col gap-4">
                        {/* Hex grid */}
                        <div className="flex flex-wrap gap-3 justify-start">
                            {allSlots.map(c => (
                                <HexSlot
                                    key={c.id}
                                    icon={c.icon}
                                    label={c.isEmpty ? 'NONE' : c.n}
                                    isSelected={selectedChip === c.id}
                                    isEmpty={c.isEmpty}
                                    onClick={() => { setSelectedChip(c.id); playSFX('select'); }}
                                />
                            ))}
                            {unlockedChips.length === 0 && (
                                <div className="text-xs text-gray-600 font-mono mt-2 w-full">{t.mod_empty}</div>
                            )}
                        </div>

                        {/* Selected chip description */}
                        <div className="border-t border-white/10 pt-3 mt-auto">
                            {selectedChip && chipData ? (
                                <div className="flex flex-col gap-1">
                                    <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">selected module</div>
                                    <div className="text-sm font-bold text-brand-cyan tracking-wide">{chipData.n}</div>
                                    <div className="text-xs font-mono text-gray-300 leading-relaxed">{chipData.desc}</div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">selected module</div>
                                    <div className="text-xs font-mono text-gray-600">无芯片 — 你的底层逻辑未被篡改。</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/10 shrink-0 mt-4">
                    <button onClick={saveModule} className="cyber-btn w-full bg-brand-cyan text-black font-black px-12 py-3 hover:bg-white transition tracking-widest">{t.mod_equip}</button>
                </div>
            </div>
        </div>
    );
};

const LobbyScreen = ({ user, onJoinRoom, onLogout, lang, setLang }) => {
    const t = I18N[lang];
    const [rooms, setRooms] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false); const [createSettings, setCreateSettings] = useState({ max: 2, hp: 10 });
    const [showProfile, setShowProfile] = useState(false); const [showSettings, setShowSettings] = useState(false); const [settingsTab, setSettingsTab] = useState('basic');
    const [showMarket, setShowMarket] = useState(false); const [marketCat, setMarketCat] = useState('frame'); const [showDB, setShowDB] = useState(false);
    const [showWarp, setShowWarp] = useState(false); const [showMods, setShowMods] = useState(false);
    const [showMailbox, setShowMailbox] = useState(false); const [hasUnreadMail, setHasUnreadMail] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState('quests');

    const [editAvatar, setEditAvatar] = useState(user.settings?.avatar || ''); const [editBg, setEditBg] = useState(user.settings?.bgTheme || 'stars');
    const [editFrame, setEditFrame] = useState(user.settings?.frame || 'frame_default'); const [editCard, setEditCard] = useState(user.settings?.cardSkin || 'card_default');
    const [editTitle, setEditTitle] = useState(user.settings?.title || ''); const [editRing, setEditRing] = useState(user.settings?.ring || 'ring_default');
    const [editSfx, setEditSfx] = useState(user.settings?.sfx ?? true); const [editBgm, setEditBgm] = useState(user.settings?.bgm ?? false);
    const [editSignature, setEditSignature] = useState(user.settings?.signature || '');
    const [oldPass, setOldPass] = useState(''); const [newPass, setNewPass] = useState(''); const [setMsg, setSetMsg] = useState({ text: '', type: '' });

    const [previewBg, setPreviewBg] = useState(user.settings?.bgTheme || 'stars');
    const [previewFrame, setPreviewFrame] = useState(user.settings?.frame || 'frame_default');
    const [previewCard, setPreviewCard] = useState(user.settings?.cardSkin || 'card_default');

    const [selectedProfileTarget, setSelectedProfileTarget] = useState(null);
    const [pmTarget, setPmTarget] = useState(null);
    const [transferTarget, setTransferTarget] = useState(null);
    const [expandedFriendMenu, setExpandedFriendMenu] = useState(null);

    // 连接 Socket 监听大厅房间 + 邮件通知
    useEffect(() => {
        socket.on('lobby_rooms_update', (updatedRooms) => { setRooms(updatedRooms); });
        // 检查未读邮件
        socket.emit('get_inbox', (mails) => {
            setHasUnreadMail((mails || []).some(m => !m.read));
        });
        const onNewMail = () => { setHasUnreadMail(true); playSFX('heal'); };
        socket.on('new_mail', onNewMail);
        return () => {
            socket.off('lobby_rooms_update');
            socket.off('new_mail', onNewMail);
        }
    }, []);

    const confirmCreate = () => {
        socket.emit('create_room', { user, max: createSettings.max, hp: createSettings.hp });
        setShowCreateModal(false);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image(); img.onload = () => {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = 120; canvas.height = 120;
                const size = Math.min(img.width, img.height); const sx = (img.width - size)/2; const sy = (img.height - size)/2;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, 120, 120); setEditAvatar(canvas.toDataURL('image/jpeg', 0.8));
            }; img.src = ev.target.result;
        }; reader.readAsDataURL(file);
    };

    const saveSettings = () => {
        const newSettings = { avatar: editAvatar, bgTheme: editBg, frame: editFrame, cardSkin: editCard, title: editTitle, ring: editRing, sfx: editSfx, bgm: editBgm, signature: editSignature.slice(0,20) };
        socket.emit('update_settings', newSettings, newPass, oldPass, (res) => {
            if (res.err) { setSetMsg({text: res.err, type: 'err'}); return; }
            localStorage.setItem('tactical_sfx', editSfx ? 'on' : 'off');
            ensureAudioContext(); toggleBGM(editBgm);
            setSetMsg({text: 'Protocol Saved.', type: 'suc'});
            setTimeout(() => { setSetMsg({text:'', type:''}); setShowSettings(false); setOldPass(''); setNewPass(''); }, 1000);
        });
    };

    const buyItem = (itemId, cost) => { socket.emit('buy_item', itemId, cost); playSFX('select'); };
    const acceptReq = (reqName) => { socket.emit('accept_friend_req', reqName); playSFX('heal'); };
    const removeFriend = (fName) => { socket.emit('remove_friend', fName); setExpandedFriendMenu(null); };

    const acceptInvite = (roomId, fromUser) => {
        // Optional: tell server to remove invite, but let's just join room
        socket.emit('join_room', {roomId, user});
    };
    const declineInvite = (fromUser) => {
        // Clear local invite state
        user.invites = user.invites.filter(inv => inv.from !== fromUser);
    };

    const handlePreview = (item) => { if(item.type==='bg') setPreviewBg(item.id); if(item.type==='frame') setPreviewFrame(item.id); if(item.type==='card') setPreviewCard(item.id); };

    const marketItems = [ { id:'frame_neon', n:t.frame_neon, c:300, type:'frame', icon:'🖼️' }, { id:'frame_inferno', n:t.frame_inferno, c:500, type:'frame', icon:'🔥' }, { id:'frame_gold', n:t.frame_gold, c:800, type:'frame', icon:'👑' }, { id:'card_matrix', n:t.card_matrix, c:300, type:'card', icon:'💻' }, { id:'card_blood', n:t.card_blood, c:400, type:'card', icon:'🩸' } ];
    const renderProgress = (val, max) => (<div className="w-full bg-gray-900 h-1.5 rounded-full mt-3 overflow-hidden border border-white/5 relative"><div className="h-full bg-gradient-to-r from-brand-pink to-brand-cyan transition-all duration-700 ease-out" style={{ width: `${Math.min((val/max)*100, 100)}%` }}></div></div>);

    const unl = user.economy?.unlocks || [];
    const unlockedTitles = [...LOOT_POOLS[3], ...LOOT_POOLS[4], ...LOOT_POOLS[5]].filter(i=>i.type==='title' && unl.includes(i.id));
    const unlockedRings = [...LOOT_POOLS[5]].filter(i=>i.type==='ring' && unl.includes(i.id));
    const rank = getRank(user.stats.wins);

    return (
        <div className="min-h-screen flex flex-col p-4 md:p-8 z-10 relative max-w-7xl mx-auto w-full">
            {showWarp && <WarpScreen user={user} onClose={()=>setShowWarp(false)} lang={lang} />}
            {showMods && <ModulesScreen user={user} onClose={()=>setShowMods(false)} lang={lang} />}
            {showMailbox && <MailboxModal user={user} onClose={()=>{ setShowMailbox(false); setHasUnreadMail(false); }} lang={lang} />}
            {selectedProfileTarget && <ProfileModal targetName={selectedProfileTarget} currentUser={user} onClose={()=>setSelectedProfileTarget(null)} t={t} />}
            {pmTarget && <PrivateChat friendName={pmTarget} user={user} onClose={()=>setPmTarget(null)} />}
            {transferTarget && <TransferModal friendName={transferTarget} user={user} onClose={()=>setTransferTarget(null)} t={t} />}

            {/* Floating Invites */}
            <div className="fixed top-24 right-4 md:right-8 flex flex-col gap-2 z-50 pointer-events-none">
                {user.invites?.map((inv, i) => (
                    <div key={i} className="glass-panel-heavy p-4 rounded-xl border border-brand-pink shadow-[0_0_20px_rgba(255,0,127,0.3)] animate-fade-in-up w-56 md:w-64 pointer-events-auto">
                        <div className="text-xs font-mono text-brand-pink mb-2 font-bold tracking-widest">INCOMING DRAFT</div>
                        <div className="text-sm font-bold truncate mb-3"><span className="text-brand-cyan">{inv.from}</span> invites you to <span className="text-brand-gold">{inv.roomId}</span></div>
                        <div className="flex gap-2">
                            <button onClick={()=>acceptInvite(inv.roomId, inv.from)} className="flex-1 bg-green-500/20 text-green-400 text-xs py-1.5 rounded font-bold border border-green-500/50 hover:bg-green-500/40 transition">{t.soc_accept}</button>
                            <button onClick={()=>declineInvite(inv.from)} className="flex-1 bg-red-500/20 text-red-400 text-xs py-1.5 rounded font-bold border border-red-500/50 hover:bg-red-500/40 transition">{t.soc_decline}</button>
                        </div>
                    </div>
                ))}
            </div>

            <header className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 glass-panel px-4 md:px-8 py-4 rounded-2xl relative z-[60] gap-4">
                <div className="text-xl md:text-2xl font-black tracking-tighter flex items-center gap-6">
                    TACTICAL<span className="text-brand-cyan">_ARENA</span>
                </div>
                <div className="flex flex-wrap justify-center gap-4 items-center">
                    <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="text-xs font-mono border border-gray-600 px-2 py-1 rounded hover:text-brand-cyan">{lang === 'zh' ? 'EN' : '中'}</button>
                    <div className="flex items-center gap-2">
                        <div className="bg-black/50 border border-brand-gold/30 px-3 md:px-4 py-1.5 rounded-full font-mono text-xs md:text-sm text-brand-gold flex items-center gap-2 shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                            <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse"></span> {user.economy?.credits || 0} CR
                        </div>
                    </div>
                    {/* 邮箱按钮 */}
                    <button onClick={() => setShowMailbox(true)} className="glass-panel px-3 py-2 rounded-full relative hover:bg-brand-cyan/10 transition">
                        <IconInbox />
                        {hasUnreadMail && <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-pink rounded-full animate-pulse border border-black"></span>}
                    </button>
                    <div className="relative">
                        <button onClick={() => setShowProfile(!showProfile)} className="glass-panel px-3 md:px-4 py-2 rounded-full flex items-center gap-2 md:gap-3 hover:bg-white/10 transition" onContextMenu={e=>{e.preventDefault(); setSelectedProfileTarget(user.username);}}>
                            <div className="flex flex-col items-end">
                                <div className={`text-[9px] font-bold px-1.5 rounded-sm border ${rank.bg}`} style={{color: rank.c}}>{rank.n}</div>
                                <span className="font-mono text-xs md:text-sm font-bold tracking-wider">{user.username}</span>
                            </div>
                            <AvatarDisplay avatar={user.settings?.avatar} name={user.username} frame={user.settings?.frame} className="w-8 h-8 rounded-full ml-1" />
                        </button>
                        {showProfile && (
                            <div className="absolute right-0 top-full mt-4 w-56 md:w-64 glass-panel-heavy rounded-xl p-4 md:p-6 z-50 animate-fade-in-up" style={{animationDuration: '0.3s'}}>
                                <div className="text-xs font-mono text-brand-purple mb-4 uppercase border-b border-white/10 pb-2 tracking-widest">{t.lobby_dossier}</div>
                                <div className="flex justify-between mb-2"><span className="text-gray-400 text-sm">{t.lobby_wins}</span><span className="font-mono text-brand-cyan">{Math.max(0, Math.round((user.stats.wins/Math.max(user.stats.matches,1))*100))||0}%</span></div>
                                <div className="flex justify-between mb-6"><span className="text-gray-400 text-sm">{t.lobby_matches}</span><span className="font-mono">{user.stats.matches}</span></div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => {setShowSettings(true); setShowProfile(false); setSettingsTab('basic');}} className="w-full text-brand-cyan text-sm flex items-center justify-center gap-2 hover:bg-brand-cyan/20 transition bg-brand-cyan/10 py-3 rounded-lg font-bold tracking-widest border border-brand-cyan/30"><IconSettings /> {t.lobby_settings}</button>
                                    <button onClick={onLogout} className="w-full text-red-400 text-sm flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition bg-red-500/10 py-3 rounded-lg font-bold tracking-widest"><IconLogOut /> {t.lobby_logout}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {showSettings && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="glass-panel-heavy p-4 md:p-8 rounded-3xl modal-responsive animate-float-up" style={{ animation: 'none', transform: 'none' }}>
                        <div className="flex justify-between items-center border-b border-brand-cyan/30 pb-4 shrink-0">
                            <h2 className="text-xl md:text-2xl font-black text-brand-cyan tracking-widest flex items-center gap-2"><IconSettings/> {t.set_title}</h2>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        {setMsg.text && <div className={`p-2 mt-2 text-center text-sm font-mono rounded shrink-0 ${setMsg.type==='err'?'bg-red-500/20 text-red-400':'bg-green-500/20 text-green-400'}`}>{setMsg.text}</div>}

                        <div className="flex gap-2 border-b border-white/10 pb-4 shrink-0 mt-4">
                            <button onClick={()=>setSettingsTab('basic')} className={`flex-1 py-2 text-xs font-bold font-mono rounded-lg transition ${settingsTab==='basic'?'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan':'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t.tab_basic}</button>
                            <button onClick={()=>setSettingsTab('cosmetics')} className={`flex-1 py-2 text-xs font-bold font-mono rounded-lg transition ${settingsTab==='cosmetics'?'bg-brand-pink/20 text-brand-pink border border-brand-pink':'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t.tab_cosmetics}</button>
                            <button onClick={()=>setSettingsTab('security')} className={`flex-1 py-2 text-xs font-bold font-mono rounded-lg transition ${settingsTab==='security'?'bg-brand-purple/20 text-brand-purple border border-brand-purple':'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t.tab_security}</button>
                        </div>

                        <div className="overflow-y-auto hide-scroll flex flex-col gap-6 flex-1 py-4">
                            {settingsTab === 'basic' && (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-mono text-gray-400 tracking-wider">{t.set_avatar}</label>
                                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                                            <AvatarDisplay avatar={editAvatar} name={user.username} frame={editFrame} className="w-16 h-16 rounded-full shrink-0 mx-auto md:mx-0" />
                                            <div className="flex flex-wrap gap-2 flex-1 justify-center md:justify-start">
                                                {['👽','🤖','💀','💠', ...LOOT_POOLS[3].filter(i=>i.type==='avatar'&&unl.includes(i.id)).map(i=>i.val)].map(em => <button key={em} onClick={()=>setEditAvatar(em)} className={`w-10 h-10 rounded-lg text-2xl bg-white/5 hover:bg-white/20 transition ${editAvatar===em?'border border-brand-cyan':''}`}>{em}</button>)}
                                                <label className="w-10 h-10 rounded-lg bg-white/5 hover:bg-brand-pink/50 border border-dashed border-gray-500 flex items-center justify-center cursor-pointer transition text-gray-400 hover:text-white"><IconUpload/><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/></label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                                        <label className="text-xs font-mono text-brand-cyan tracking-wider">{t.set_sig}</label>
                                        <input type="text" maxLength="20" placeholder="Type here..." value={editSignature} onChange={e=>setEditSignature(e.target.value)} className="bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-brand-cyan outline-none font-mono text-sm w-full" />
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                                        <label className="text-sm font-mono text-gray-300 tracking-wider">{t.set_sfx}</label>
                                        <button onClick={()=>setEditSfx(!editSfx)} className={`w-12 h-6 rounded-full transition relative ${editSfx ? 'bg-brand-cyan':'bg-gray-600'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${editSfx?'translate-x-6':'translate-x-0.5'}`}></div></button>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                                        <label className="text-sm font-mono text-gray-300 tracking-wider">{t.set_bgm}</label>
                                        <button onClick={()=>setEditBgm(!editBgm)} className={`w-12 h-6 rounded-full transition relative ${editBgm ? 'bg-brand-pink':'bg-gray-600'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${editBgm?'translate-x-6':'translate-x-0.5'}`}></div></button>
                                    </div>
                                </>
                            )}

                            {settingsTab === 'cosmetics' && (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-mono text-brand-cyan tracking-wider">{t.cat_bg}</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {[ {id:'stars', n:t.bg_stars}, {id:'grid', n:t.bg_grid}, {id:'orbs', n:t.bg_orbs}, {id:'abstract', n:t.bg_abstract}, {id:'chaos', n:t.bg_chaos}, {id:'quantum', n:t.bg_quantum} ].map(bg => {
                                                const isUnlocked = unl.includes(bg.id) || unl.includes('bg_' + bg.id);
                                                return (<button key={bg.id} onClick={()=>{if(isUnlocked) setEditBg(bg.id); else playSFX('error');}} className={`py-2 px-1 rounded-lg font-bold text-xs tracking-wider transition border ${!isUnlocked?'opacity-30 cursor-not-allowed border-gray-700 bg-black/50': editBg===bg.id ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}>{bg.n} {!isUnlocked && '🔒'}</button>)
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                                        <label className="text-xs font-mono text-brand-gold tracking-wider">{t.set_title_opt}</label>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={()=>setEditTitle('')} className={`px-3 py-1.5 rounded text-xs border ${editTitle===''?'bg-gray-500/20 border-gray-500':'bg-white/5 border-transparent'}`}>[无]</button>
                                            {unlockedTitles.map(tt => (
                                                <button key={tt.id} onClick={()=>setEditTitle(tt.n)} className={`px-3 py-1.5 rounded text-xs font-bold transition border ${editTitle===tt.n?'border-current shadow-[0_0_5px_currentColor]':'border-transparent bg-white/5 hover:bg-white/10'}`} style={{color: tt.c}}>{tt.n}</button>
                                            ))}
                                            {unlockedTitles.length===0 && <span className="text-xs text-gray-600 italic px-2 py-1">前往星空祈愿获取</span>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-mono text-brand-pink tracking-wider">{t.cat_frame}</label>
                                            <div className="flex flex-col gap-2">
                                                {[{id:'frame_default', n:t.frame_default}, {id:'frame_neon', n:t.frame_neon}, {id:'frame_inferno', n:t.frame_inferno}, {id:'frame_gold', n:t.frame_gold}].map(f => {
                                                    const isUnl = user.economy?.unlocks?.includes(f.id);
                                                    return <button key={f.id} onClick={()=>{if(isUnl) setEditFrame(f.id); else playSFX('error');}} className={`py-1.5 px-3 text-left rounded text-sm transition border ${!isUnl?'opacity-30 cursor-not-allowed': editFrame===f.id?'bg-brand-pink/20 border-brand-pink text-brand-pink shadow-[0_0_10px_rgba(255,0,127,0.3)]':'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}>{f.n} {!isUnl && '🔒'}</button>
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-mono text-brand-purple tracking-wider">{t.cat_card}</label>
                                            <div className="flex flex-col gap-2">
                                                {[{id:'card_default', n:t.card_default}, {id:'card_matrix', n:t.card_matrix}, {id:'card_blood', n:t.card_blood}].map(c => {
                                                    const isUnl = user.economy?.unlocks?.includes(c.id);
                                                    return <button key={c.id} onClick={()=>{if(isUnl) setEditCard(c.id); else playSFX('error');}} className={`py-1.5 px-3 text-left rounded text-sm transition border ${!isUnl?'opacity-30 cursor-not-allowed': editCard===c.id?'bg-brand-purple/20 border-brand-purple text-brand-purple shadow-[0_0_10px_rgba(138,43,226,0.3)]':'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}>{c.n} {!isUnl && '🔒'}</button>
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                                        <label className="text-xs font-mono text-brand-cyan tracking-wider">{t.set_ring}</label>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={()=>setEditRing('ring_default')} className={`px-3 py-1.5 rounded text-sm border ${editRing==='ring_default'?'bg-brand-cyan/20 border-brand-cyan text-brand-cyan':'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}>标准指引</button>
                                            {unlockedRings.map(rr => (
                                                <button key={rr.id} onClick={()=>setEditRing(rr.id)} className={`px-3 py-1.5 rounded text-sm transition border ${editRing===rr.id?'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-[0_0_10px_currentColor]':'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}>{rr.n}</button>
                                            ))}
                                            {unlockedRings.length===0 && <span className="text-xs text-gray-600 italic px-2 py-1">前往星空祈愿获取</span>}
                                        </div>
                                    </div>
                                </>
                            )}

                            {settingsTab === 'security' && (
                                <div className="flex flex-col gap-3">
                                    <label className="text-xs font-mono text-brand-purple tracking-wider">{t.set_sec}</label>
                                    <input type="password" placeholder={t.set_oldp} value={oldPass} onChange={e=>setOldPass(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-brand-purple outline-none font-mono text-sm" />
                                    <input type="password" placeholder={t.set_newp} value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-brand-purple outline-none font-mono text-sm" />
                                </div>
                            )}
                        </div>

                        <button onClick={saveSettings} className="cyber-btn shrink-0 mt-4 bg-brand-pink text-white font-black py-4 hover:bg-[#ff3399] transition tracking-widest shadow-[0_0_20px_rgba(255,0,127,0.4)]">{t.set_save}</button>
                    </div>
                </div>
            )}

            {showMarket && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="glass-panel-heavy p-4 md:p-8 rounded-3xl modal-responsive animate-float-up" style={{ animation: 'none', transform: 'none' }}>
                        <div className="flex justify-between items-center border-b border-brand-gold/30 pb-4 shrink-0">
                            <h2 className="text-xl md:text-3xl font-black text-brand-gold tracking-widest flex items-center gap-3"><IconCart/> {t.bm_title}</h2>
                            <button onClick={() => setShowMarket(false)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 mt-4 flex-1">
                            {/* Left Preview Pane */}
                            <div className="w-full md:w-[280px] h-[200px] md:h-auto border border-white/10 rounded-2xl relative overflow-hidden bg-[#030305] shrink-0 flex flex-col shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
                                <div className="absolute inset-0 opacity-40 z-0 pointer-events-none"><BackgroundEngine theme={previewBg} /></div>
                                <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
                                    <div className="text-brand-cyan/70 text-[10px] md:text-xs font-mono mb-6 md:mb-12 uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full border border-brand-cyan/20 backdrop-blur-md">{t.preview}</div>
                                    <div className="scale-75 md:scale-100 transform-origin-center">
                                        <div className={`relative flex gap-5 items-center justify-center p-2 rounded-3xl`}>
                                            <div className={`holo-slot ${getCardClass(previewCard)} w-[70px] h-[90px] rounded-xl flex flex-col items-center justify-center`}>
                                                <span className="text-3xl font-mono font-black drop-shadow-md relative z-10">5</span><span className="absolute bottom-1 opacity-80 text-xl z-10">🗡️</span>
                                            </div>
                                            <div className={`w-[80px] h-[80px] bg-black/80 rounded-full border-[3px] flex items-center justify-center z-10 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.9)] relative ${!previewFrame?.startsWith('frame_') ? 'border-brand-cyan' : 'border-transparent'}`}>
                                                <AvatarDisplay avatar={user.settings?.avatar} name={user.username} frame={previewFrame} className="w-[85px] h-[85px] rounded-full" />
                                            </div>
                                            <div className={`holo-slot ${getCardClass(previewCard)} w-[70px] h-[90px] rounded-xl flex flex-col items-center justify-center`}>
                                                <span className="text-3xl font-mono font-black drop-shadow-md relative z-10">4</span><span className="absolute bottom-1 opacity-80 text-xl z-10">🛡️</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Items Pane */}
                            <div className="flex-1 flex flex-col gap-4 overflow-y-auto hide-scroll pb-4">
                                <div className="flex justify-between items-center bg-brand-gold/10 p-3 rounded-xl border border-brand-gold/20 shrink-0">
                                    <span className="font-mono text-brand-gold/70 text-[10px] md:text-sm">{t.bm_desc}</span>
                                    <span className="font-black text-xl md:text-2xl text-brand-gold tracking-widest">{user.economy?.credits || 0} CR</span>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={()=>setMarketCat('frame')} className={`flex-1 py-2 text-sm font-bold font-mono rounded-lg transition ${marketCat==='frame'?'bg-brand-pink/20 text-brand-pink border border-brand-pink':'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t.cat_frame}</button>
                                    <button onClick={()=>setMarketCat('card')} className={`flex-1 py-2 text-sm font-bold font-mono rounded-lg transition ${marketCat==='card'?'bg-brand-purple/20 text-brand-purple border border-brand-purple':'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t.cat_card}</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {marketItems.filter(i=>i.type===marketCat).map(item => {
                                        const isUnl = user.economy?.unlocks?.includes(item.id);
                                        return (
                                            <div key={item.id} onMouseEnter={()=>handlePreview(item)} className={`bg-black/60 border border-gray-700 p-4 md:p-5 rounded-xl flex flex-col items-center gap-2 md:gap-3 relative overflow-hidden group transition ${!isUnl?'hover:border-brand-gold/50 cursor-pointer':'opacity-50'}`}>
                                                <div className="absolute inset-0 bg-brand-gold/5 opacity-0 group-hover:opacity-100 transition pointer-events-none"></div>
                                                <div className="text-2xl md:text-3xl pointer-events-none">{item.icon}</div>
                                                <div className="text-xs md:text-sm font-bold tracking-widest text-center pointer-events-none">{item.n}</div>
                                                {isUnl ? (
                                                    <button disabled className="w-full py-1.5 bg-green-500/20 text-green-400 font-mono text-[10px] md:text-xs tracking-widest border border-green-500/30 rounded">{t.bm_unlocked}</button>
                                                ) : (
                                                    <button onClick={()=>buyItem(item.id, item.c)} className="w-full py-1.5 cyber-btn bg-brand-gold text-black font-black tracking-widest hover:bg-yellow-400 transition hover:shadow-[0_0_15px_rgba(255,215,0,0.5)] text-[10px] md:text-xs z-10 relative">
                                                        {t.bm_buy} {item.c} CR
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDB && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="glass-panel-heavy p-4 md:p-8 rounded-3xl modal-responsive animate-float-up" style={{ animation: 'none', transform: 'none' }}>
                        <div className="flex justify-between items-center border-b border-brand-cyan/30 pb-4">
                            <h2 className="text-xl md:text-2xl font-black text-brand-cyan tracking-widest flex items-center gap-2"><IconBook/> {t.db_title}</h2>
                            <button onClick={() => setShowDB(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <p className="font-mono text-gray-400 text-xs md:text-sm mt-4">{t.db_desc}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4">
                            {[3,4,5,6,7,8,9,0].map(num => {
                                const w = getWeapons(t)[num];
                                return (
                                    <div key={num} className="bg-black/40 border border-white/10 p-2 md:p-3 rounded-lg flex items-center gap-4 hover:border-brand-cyan/30 transition">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded flex items-center justify-center text-xl md:text-2xl font-black text-brand-cyan">{num}</div>
                                        <div>
                                            <div className="font-bold text-sm md:text-base flex items-center gap-2">{w.icon} {w.name}</div>
                                            <div className="text-[10px] md:text-xs font-mono text-gray-400 mt-0.5 md:mt-1">{w.desc}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-6 border-t border-brand-purple/30 pt-4 pb-4">
                            <div className="text-brand-purple font-mono text-xs md:text-sm tracking-widest mb-3 uppercase">Hidden Protocols (Combos)</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-black/40 p-3 rounded-lg border border-brand-purple/20 text-xs md:text-sm"><span className="text-brand-cyan font-bold">4 + 5</span> = {t.c_forge}</div>
                                <div className="bg-black/40 p-3 rounded-lg border border-brand-purple/20 text-xs md:text-sm"><span className="text-brand-cyan font-bold">8 + 8</span> = {t.c_power}</div>
                                <div className="bg-black/40 p-3 rounded-lg border border-brand-purple/20 text-xs md:text-sm"><span className="text-brand-cyan font-bold">9 + 9</span> = {t.c_heal}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="glass-panel-heavy p-6 md:p-8 rounded-2xl w-[90vw] md:w-[400px] flex flex-col gap-6 animate-float-up" style={{ animation: 'none', transform: 'none' }}>
                        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-brand-cyan tracking-widest"><IconSettings/> {t.create_title}</h2>
                        <div>
                            <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-mono">{t.create_max}</label>
                            <div className="flex gap-3">
                                <button className={`cyber-btn flex-1 py-2 md:py-3 font-bold transition text-xs md:text-sm ${createSettings.max===2 ? 'bg-brand-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`} onClick={()=>setCreateSettings({...createSettings, max:2})}>1 v 1</button>
                                <button className={`cyber-btn flex-1 py-2 md:py-3 font-bold transition text-xs md:text-sm ${createSettings.max===4 ? 'bg-brand-purple text-white shadow-[0_0_15px_rgba(138,43,226,0.5)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`} onClick={()=>setCreateSettings({...createSettings, max:4})}>4 Players</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-mono">{t.create_hp}</label>
                            <input type="range" min="5" max="20" step="1" value={createSettings.hp} onChange={e=>setCreateSettings({...createSettings, hp: parseInt(e.target.value)})} className="w-full accent-brand-pink" />
                            <div className="text-center font-mono mt-2 text-xl md:text-2xl font-black text-brand-pink drop-shadow-[0_0_10px_rgba(255,0,127,0.5)]">{createSettings.hp} HP</div>
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button className="flex-1 bg-white/5 py-2 md:py-3 rounded-lg hover:bg-white/10 text-gray-400 transition font-mono text-xs md:text-sm" onClick={()=>setShowCreateModal(false)}>{t.create_cancel}</button>
                            <button className="cyber-btn flex-[2] bg-brand-cyan text-black font-black py-2 md:py-3 hover:bg-white transition tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)] text-xs md:text-sm" onClick={confirmCreate}>{t.create_confirm}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between flex-1 gap-6 md:gap-8 z-10 relative">
                {/* 侧边栏 */}
                <div className="w-full md:w-80 flex flex-col gap-4">
                    <div className="grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-3 shrink-0">
                        <button onClick={() => setShowMarket(true)} className="glass-panel py-3 md:py-5 rounded-xl flex flex-col items-center justify-center hover:bg-brand-gold/10 hover:border-brand-gold/50 transition group">
                            <div className="text-brand-gold mb-1 md:mb-2 transform group-hover:scale-125 transition text-lg md:text-2xl"><IconCart /></div>
                            <span className="text-[10px] md:text-xs font-bold tracking-widest text-brand-gold">{t.btn_market}</span>
                        </button>
                        <button onClick={() => startTransition(() => setShowWarp(true))} className="glass-panel py-3 md:py-5 rounded-xl flex flex-col items-center justify-center hover:bg-brand-pink/10 hover:border-brand-pink/50 transition group relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-shimmer pointer-events-none"></div>
                            <div className="text-brand-pink mb-1 md:mb-2 relative z-10 transform group-hover:scale-125 transition text-lg md:text-2xl"><IconStar /></div>
                            <span className="text-[10px] md:text-xs font-bold tracking-widest text-brand-pink relative z-10">{t.btn_warp}</span>
                        </button>
                        <button onClick={() => setShowMods(true)} className="glass-panel py-3 md:py-5 rounded-xl flex flex-col items-center justify-center hover:bg-green-500/10 hover:border-green-500/50 transition group">
                            <div className="text-green-500 mb-1 md:mb-2 transform group-hover:scale-125 transition text-lg md:text-2xl"><IconCpu /></div>
                            <span className="text-[10px] md:text-xs font-bold tracking-widest text-green-500">{t.btn_modules}</span>
                        </button>
                        <button onClick={() => setShowDB(true)} className="glass-panel py-3 md:py-5 rounded-xl flex flex-col items-center justify-center hover:bg-brand-cyan/10 hover:border-brand-cyan/50 transition group">
                            <div className="text-brand-cyan mb-1 md:mb-2 transform group-hover:scale-125 transition text-lg md:text-2xl"><IconBook /></div>
                            <span className="text-[10px] md:text-xs font-bold tracking-widest text-brand-cyan">{t.btn_db}</span>
                        </button>
                    </div>

                    {/* Accordions */}
                    <div className="glass-panel rounded-xl flex-1 flex flex-col overflow-hidden max-h-[40vh] md:max-h-none">
                        <div className="overflow-y-auto hide-scroll p-2 space-y-2">
                            <div className="bg-black/40 rounded-lg overflow-hidden border border-brand-purple/20">
                                <div onClick={() => setActiveAccordion(activeAccordion==='quests'?'':'quests')} className="bg-brand-purple/10 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-brand-purple/20 transition">
                                    <span className="text-xs font-mono text-brand-purple font-bold tracking-widest">{t.lobby_daily}</span><IconChevronDown className={`text-brand-purple transition-transform ${activeAccordion==='quests'?'rotate-180':''}`}/>
                                </div>
                                {activeAccordion === 'quests' && (
                                    <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                                        <div className="bg-black/60 p-2 md:p-3 rounded-lg border border-gray-800"><div className="text-xs md:text-sm font-bold text-brand-pink tracking-widest">{t.quest1}</div><div className="text-[10px] md:text-xs text-gray-500 font-mono mt-1 flex justify-between"><span>{t.quest1_desc}</span><span className="text-brand-cyan">({user.quests?.kills||0}/3)</span></div>{renderProgress(user.quests?.kills||0, 3)}</div>
                                        <div className="bg-black/60 p-2 md:p-3 rounded-lg border border-gray-800"><div className="text-xs md:text-sm font-bold text-brand-cyan tracking-widest">{t.quest2}</div><div className="text-[10px] md:text-xs text-gray-500 font-mono mt-1 flex justify-between"><span>{t.quest2_desc}</span><span className="text-brand-cyan">({user.quests?.matches||0}/5)</span></div>{renderProgress(user.quests?.matches||0, 5)}</div>
                                        <div className="bg-black/60 p-2 md:p-3 rounded-lg border border-gray-800"><div className="text-xs md:text-sm font-bold text-brand-purple tracking-widest">{t.quest3}</div><div className="text-[10px] md:text-xs text-gray-500 font-mono mt-1 flex justify-between"><span>{t.quest3_desc}</span><span className="text-brand-cyan">({user.quests?.dmg||0}/20)</span></div>{renderProgress(user.quests?.dmg||0, 20)}</div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-black/40 rounded-lg overflow-hidden border border-brand-cyan/20">
                                <div onClick={() => setActiveAccordion(activeAccordion==='friends'?'':'friends')} className="bg-brand-cyan/10 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-brand-cyan/20 transition">
                                    <span className="text-xs font-mono text-brand-cyan font-bold tracking-widest flex items-center gap-2"><IconUsers/> {t.lobby_social} ({user.friends?.length||0})</span><IconChevronDown className={`text-brand-cyan transition-transform ${activeAccordion==='friends'?'rotate-180':''}`}/>
                                </div>
                                {activeAccordion === 'friends' && (
                                    <div className="p-2 space-y-2">
                                        {user.friendRequests?.length > 0 && (
                                            <div className="mb-2 pb-2 border-b border-white/10">
                                                <div className="text-[10px] text-gray-500 font-mono mb-2">{t.soc_reqs}</div>
                                                {user.friendRequests.map((req, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-black/60 p-2 rounded border border-gray-800">
                                                        <span className="text-xs font-bold text-gray-300">{req.from}</span>
                                                        <button onClick={()=>acceptReq(req.from)} className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded hover:bg-green-500/40">{t.soc_accept}</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {user.friends?.map((fname) => {
                                            // This will be properly mapped now if we had presence via socket
                                            // For now, assume offline unless we can fetch it. Let's just show standard UI
                                            const stat = 'offline';
                                            const isExp = expandedFriendMenu === fname;
                                            return (
                                                <div key={fname} className="bg-black/60 rounded-lg border border-gray-800 overflow-hidden">
                                                    <div onClick={()=>setExpandedFriendMenu(isExp?null:fname)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 transition" onContextMenu={e=>{e.preventDefault(); setSelectedProfileTarget(fname);}}>
                                                        <span className="text-xs md:text-sm font-bold text-gray-200">{fname}</span>
                                                        {stat === 'playing' || stat === 'in_room' ? <span className="text-[9px] md:text-[10px] text-brand-pink font-mono animate-pulse">{t.soc_status_ingame}</span> : <span className="text-[9px] md:text-[10px] text-green-400 font-mono">{t.soc_status_online}</span>}
                                                    </div>
                                                    {isExp && (
                                                        <div className="grid grid-cols-2 gap-px bg-gray-800 border-t border-gray-800">
                                                            <button onClick={()=>setPmTarget(fname)} className="bg-black/80 py-2 text-[10px] text-brand-cyan hover:bg-brand-cyan/20 flex justify-center items-center gap-1 transition"><IconMail className="w-3 h-3"/> PM</button>
                                                            <button onClick={()=>setTransferTarget(fname)} className="bg-black/80 py-2 text-[10px] text-brand-gold hover:bg-brand-gold/20 flex justify-center items-center gap-1 transition"><IconGift className="w-3 h-3"/> Transfer</button>
                                                            <button onClick={()=>setSelectedProfileTarget(fname)} className="bg-black/80 py-2 text-[10px] text-gray-400 hover:bg-white/10 flex justify-center items-center gap-1 transition col-span-1">Profile</button>
                                                            <button onClick={()=>removeFriend(fname)} className="bg-black/80 py-2 text-[10px] text-red-500 hover:bg-red-500/20 flex justify-center items-center gap-1 transition col-span-1">Remove</button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {(!user.friends || user.friends.length === 0) && <div className="text-xs text-gray-600 text-center py-4 font-mono">No active links found.</div>}
                                    </div>
                                )}
                            </div>
                            <div className="bg-black/40 rounded-lg overflow-hidden border border-gray-700/50">
                                <div onClick={() => setActiveAccordion(activeAccordion==='recent'?'':'recent')} className="bg-gray-800/30 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-800/50 transition">
                                    <span className="text-xs font-mono text-gray-400 font-bold tracking-widest">{t.lobby_recent}</span><IconChevronDown className={`text-gray-400 transition-transform ${activeAccordion==='recent'?'rotate-180':''}`}/>
                                </div>
                                {activeAccordion === 'recent' && (
                                    <div className="p-2 space-y-2">
                                        {user.recentPlayers?.map((rname, i) => (
                                            <div key={i} className="p-3 bg-black/60 rounded border border-gray-800 flex justify-between items-center cursor-pointer hover:border-brand-cyan/30 transition" onClick={()=>setSelectedProfileTarget(rname)}>
                                                <span className="text-xs font-bold text-gray-300">{rname}</span><span className="text-[9px] text-gray-600 font-mono">PROFILE &gt;</span>
                                            </div>
                                        ))}
                                        {(!user.recentPlayers || user.recentPlayers.length === 0) && <div className="text-xs text-gray-600 text-center py-4 font-mono">No recent combat data.</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 主大厅：房间列表 */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg md:text-xl font-bold tracking-widest">{t.lobby_active}</h2>
                        <button onClick={() => setShowCreateModal(true)} className="cyber-btn text-xs md:text-sm bg-brand-cyan text-black hover:bg-white font-black px-6 md:px-8 py-2 md:py-3 transition shadow-[0_0_15px_rgba(0,240,255,0.4)] tracking-widest">+ {t.lobby_create}</button>
                    </div>
                    <div className="flex-1 overflow-y-auto hide-scroll flex flex-col gap-3 md:gap-4 pb-10">
                    {rooms.length === 0 ? <div className="text-gray-500 text-center py-20 font-mono text-sm md:text-lg">{t.lobby_empty}</div> :
                        rooms.map(room => (
                            <div key={room.id} className="glass-panel p-4 md:p-6 rounded-xl flex flex-col md:flex-row justify-between md:items-center hover:border-brand-cyan/50 transition group cursor-pointer gap-4 md:gap-0" onClick={() => {socket.emit('join_room', {roomId: room.id, user});}}>
                                <div>
                                    <div className="text-[10px] md:text-xs font-mono text-brand-cyan mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>{room.id} | {room.hp} HP</div>
                                    <div className="text-lg md:text-xl font-bold group-hover:text-brand-cyan transition truncate">{room.name}</div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6">
                                    <div className="font-mono bg-black/60 border border-gray-700 px-3 md:px-4 py-1.5 rounded text-sm">{room.players.length}<span className="text-gray-600">/{room.max}</span></div>
                                    <button className="bg-white/10 group-hover:bg-brand-cyan group-hover:text-black text-white px-6 md:px-8 py-2 rounded-lg font-bold transition tracking-widest text-sm">{t.lobby_join}</button>
                                </div>
                            </div>
                        ))
                    }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LobbyScreen;
