import React, { useState, useEffect, useRef, useMemo } from 'react';
import socket from '../socket';
import I18N from '../i18n';
import LOOT_POOLS from '../loot_pools';
import { getWeapons, getRank, getCardClass, getRingClass } from '../constants';
import { playSFX } from '../audio';
import AvatarDisplay from '../components/AvatarDisplay';
import ProfileModal from '../components/ProfileModal';
import { IconLogOut, IconCrosshair, IconSend, IconMessageCircle, IconMinimize, IconUserPlus } from '../components/Icons';
import { getRelicVFX } from '../relics/index';
// ==========================================  
// 自定义圣遗物 VFX 动态渲染器  
// ==========================================  
  
const VFX_COLOR_MAP = {  
    red:    { text: 'text-red-400',    border: 'border-red-500/50',    shadow: 'rgba(255,0,0,0.3)',    glow: 'rgba(255,0,0,VAR)' },  
    orange: { text: 'text-orange-400', border: 'border-orange-500/50', shadow: 'rgba(255,102,0,0.3)',  glow: 'rgba(255,102,0,VAR)' },  
    yellow: { text: 'text-yellow-400', border: 'border-yellow-500/50', shadow: 'rgba(255,215,0,0.3)',  glow: 'rgba(255,215,0,VAR)' },  
    green:  { text: 'text-green-400',  border: 'border-green-500/50',  shadow: 'rgba(0,255,0,0.3)',    glow: 'rgba(0,255,0,VAR)' },  
    cyan:   { text: 'text-cyan-400',   border: 'border-cyan-500/50',   shadow: 'rgba(0,240,255,0.3)',  glow: 'rgba(0,240,255,VAR)' },  
    blue:   { text: 'text-blue-400',   border: 'border-blue-500/50',   shadow: 'rgba(0,102,255,0.3)',  glow: 'rgba(0,102,255,VAR)' },  
    purple: { text: 'text-purple-400', border: 'border-purple-500/50', shadow: 'rgba(138,43,226,0.3)', glow: 'rgba(138,43,226,VAR)' },  
    pink:   { text: 'text-pink-400',   border: 'border-pink-500/50',   shadow: 'rgba(255,0,127,0.3)',  glow: 'rgba(255,0,127,VAR)' },  
};  
  
// 发光积木的颜色是 hex 值，需要转换  
const HEX_TO_NAME = {  
    '#ff0000': 'red', '#ff6600': 'orange', '#ffd700': 'yellow', '#00ff00': 'green',  
    '#00f0ff': 'cyan', '#0066ff': 'blue', '#8a2be2': 'purple', '#ff007f': 'pink', '#ffffff': 'cyan',  
};  
  
// 粒子动画 CSS keyframe 名称映射  
const PARTICLE_ANIM = {  
    float:    'hackerDigitFloat',   // 复用已有的上浮动画  
    orbit:    'customOrbit',  
    pulse:    'customPulse',  
    drift:    'customDrift',  
    fountain: 'customFountain',  
    swing:    'customSwing',  
};  
  
function buildCustomVFX(relicState) {  
    const vfxConfig = relicState?._vfxConfig;  
    if (!vfxConfig || !Array.isArray(vfxConfig) || vfxConfig.length === 0) return null;  
  
    return {  
        // ① 发光效果 → 返回 inline style 用的 CSS 类名（用 style 代替，避免预定义大量 CSS）  
        getPlayerClasses(player, rs) {  
            const glow = vfxConfig.find(v => v.vfxType === 'glow');  
            if (!glow) return '';  
            // 条件变量为空字符串 = 始终生效；否则检查 relicState 中该变量是否为 truthy  
            if (glow.conditionVar && !rs?.[glow.conditionVar]) return '';  
            return 'custom-relic-glow';  
        },  
  
        // ② 粒子效果 → 头像叠加层  
        renderOverlay(player, rs) {  
            const particles = vfxConfig.find(v => v.vfxType === 'particles');  
            if (!particles) return null;  
            if (particles.conditionVar && !rs?.[particles.conditionVar]) return null;  
            const count = Math.min(Number(particles.count) || 5, 12);  
            const animName = PARTICLE_ANIM[particles.animation] || 'hackerDigitFloat';  
            return (  
                <div style={{  
                    position: 'absolute', inset: '-20px', pointerEvents: 'none', zIndex: 40,  
                    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',  
                    gap: '2px', overflow: 'hidden', borderRadius: '50%'  
                }}>  
                    {[...Array(count)].map((_, i) => (  
                        <span key={i} style={{  
                            fontSize: '14px', opacity: 0,  
                            animation: `${animName} ${1.5 + Math.random()}s infinite ${i * 0.2}s ease-in-out`,  
                        }}>{particles.emoji || '✨'}</span>  
                    ))}  
                </div>  
            );  
        },  
  
        // ③ 特殊卡牌覆盖  
        getHandOverride(handValue, rs) {  
            const card = vfxConfig.find(v =>  
                v.vfxType === 'cardOverride' && Number(v.handValue) === handValue  
            );  
            if (!card) return null;  
            if (card.conditionVar && !rs?.[card.conditionVar]) return null;  
            const c = VFX_COLOR_MAP[card.color] || VFX_COLOR_MAP.cyan;  
            return {  
                icon: card.icon || '🔥',  
                name: card.name || '特殊牌',  
                className: '',  
                // BattleArena 渲染时会读 className，但自定义卡牌用不到预定义 CSS  
                // 如果需要卡牌发光，可以在这里加 style（但当前渲染代码只用 className）  
            };  
        },  
  
        // ④ 状态栏  
        renderStatusBar(player, rs) {  
            const bar = vfxConfig.find(v => v.vfxType === 'statusBar');  
            if (!bar) return null;  
            const c = VFX_COLOR_MAP[bar.color] || VFX_COLOR_MAP.cyan;  
            // 将 {varName} 替换为 relicState 中的实际值  
            const text = (bar.template || '').replace(/\{(\w+)\}/g, (_, key) =>  
                rs?.[key] !== undefined ? rs[key] : '?'  
            );  
            return (  
                <div className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 border ${c.border} px-2 py-0.5 rounded text-[8px] md:text-[10px] font-mono ${c.text} whitespace-nowrap z-30`}  
                     style={{ boxShadow: `0 0 10px ${c.shadow}` }}>  
                    {text}  
                </div>  
            );  
        }  
    };  
}

const BattleArena = ({ user, lang, onLeave, onUpdateUser, initialRoom }) => {
    const t = I18N[lang];
    const WEAPONS = getWeapons(t);

    const [roomState, setRoomState] = useState(initialRoom);
    const [gameStarted, setGameStarted] = useState(initialRoom?.status === 'playing');

    const [selectedOwn, setSelectedOwn] = useState(null);
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);

    const [activeEmotes, setActiveEmotes] = useState({});
    const [showEmoteWheel, setShowEmoteWheel] = useState(false);
    const [chatBubbles, setChatBubbles] = useState({});

    const [logs, setLogs] = useState([{ id: 0, text: t.log_init, type: 'system' }]);
    const [chatInput, setChatInput] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadMsg, setUnreadMsg] = useState(0);

    const [vfx, setVfx] = useState([]);
    const [projectiles, setProjectiles] = useState([]);
    const [shake, setShake] = useState(false);
    const [hackerUltVFX, setHackerUltVFX] = useState(false);
    const [hackerBacklash, setHackerBacklash] = useState(null); // targetId

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedProfileTarget, setSelectedProfileTarget] = useState(null);
    const [questRewards, setQuestRewards] = useState({base:0, bonus:0});
    const [shareCopied, setShareCopied] = useState(false);

    const logsEndRef = useRef(null);
    const seatRefs = useRef({});

    useEffect(() => {
        // 监听所有的房间和对战 Socket 事件
        const handlers = {
            'room_state_update': (room) => {
                setRoomState(room);
                if(room.status === 'playing') setGameStarted(true);
            },
            'game_started': (room) => {
                setRoomState(room);
                setGameStarted(true);
            },
            'phase_changed': (gameState) => {
                setRoomState(prev => prev ? {...prev, gameState} : null);
                setSelectedOwn(null);
                setSelectedTarget(null);
                setPendingAction(null);
            },
            'math_executed': (data) => {
                setRoomState(prev => {
                    if(!prev || !prev.gameState) return prev;
                    return {...prev, gameState: {...prev.gameState, players: data.players}};
                });
            },
            'tnt_executed': (data) => {
                setRoomState(prev => {
                    if(!prev || !prev.gameState) return prev;
                    return {...prev, gameState: {...prev.gameState, players: data.players}};
                });
                triggerShake();
            },
            'state_update': (gameState) => {
                setRoomState(prev => prev ? {...prev, gameState} : null);
            },
            'vfx_trigger': (data) => {
                triggerVFX(data.type, data.targetId, data.text, data.color);
            },
            'play_projectile': (data) => {
                triggerProjectile(data.attackerId, data.targetId, data.type);
            },
            'system_log': (log) => {
                addLog(log.text, log.type);
            },
            'chat_message_broadcast': (msg) => {
                setLogs(p => [...p, msg]);
                if (!isChatOpen) setUnreadMsg(p => p + 1);
                if (msg.type === 'chat' && msg.username) {
                    const bubbleId = Date.now();
                    setChatBubbles(prev => ({...prev, [msg.username]: { text: msg.text, id: bubbleId }}));
                    setTimeout(() => {
                        setChatBubbles(prev => {
                            if (prev[msg.username]?.id === bubbleId) {
                                const n = {...prev}; delete n[msg.username]; return n;
                            }
                            return prev;
                        });
                    }, 8000);
                }
            },
            'game_over_state': (data) => {
                setRoomState(prev => {
                    if(!prev) return prev;
                    return {...prev, status: 'game_over', gameState: {...prev.gameState, phase: 'GAME_OVER', matchStats: data.stats, players: data.players}};
                });
            },
            'quest_rewards': (rewards) => {
                setQuestRewards(rewards);
            },
            'hacker_ultimate_vfx': () => {
                setHackerUltVFX(true);
                setTimeout(() => setHackerUltVFX(false), 2000);
            },
            'hacker_backlash_vfx': (data) => {
                setHackerBacklash(data.targetId);
                setTimeout(() => setHackerBacklash(null), 1200);
            }
        };

        Object.keys(handlers).forEach(event => socket.on(event, handlers[event]));

        return () => {
            Object.keys(handlers).forEach(event => socket.off(event, handlers[event]));
        };
    }, [isChatOpen]);

    const addBot = () => { socket.emit('add_bot', roomState.id); };
    const startGame = () => { socket.emit('start_game', roomState.id); };
    const doLeave = () => { socket.emit('leave_room', roomState.id); onLeave(); };

    const buildShareUrl = () => {
        if (!roomState?.id) return '';
        const base = `${window.location.origin}${window.location.pathname}`;
        return `${base}?room=${encodeURIComponent(roomState.id)}`;
    };

    const copyShareLink = async () => {
        const url = buildShareUrl();
        if (!url) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
            } else {
                const ta = document.createElement('textarea');
                ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setShareCopied(true);
            playSFX('select');
            setTimeout(() => setShareCopied(false), 1800);
        } catch (e) {
            window.prompt(lang === 'zh' ? '复制以下链接分享' : 'Copy link to share', url);
        }
    };

    const addLog = (text, type = 'info') => {
        setLogs(prev => [...prev, { id: Date.now()+Math.random(), text, time: new Date().toLocaleTimeString(), type }]);
        if (!isChatOpen) setUnreadMsg(p => p + 1);
    };
    useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs, isChatOpen]);

    const triggerVFX = (type, targetId, text, color) => {
        const el = seatRefs.current[targetId]; if (!el) return;
        const rect = el.getBoundingClientRect(); setVfx(prev => [...prev, { id: Date.now()+Math.random(), type, x: rect.left + rect.width/2, y: rect.top + rect.height/2, text, color }]);
        setTimeout(() => setVfx(prev => prev.slice(1)), 1000);
    };

    const triggerEmote = (pId, emote) => {
        const eId = Date.now();
        setActiveEmotes(prev => ({...prev, [pId]: { e: emote, id: eId }}));
        playSFX('emote');
        setTimeout(() => { setActiveEmotes(prev => { if(prev[pId]?.id === eId) { const n={...prev}; delete n[pId]; return n; } return prev; }); }, 2000);
    };

    const triggerProjectile = (attackerId, targetId, type) => {
        const el1 = seatRefs.current[attackerId]; const el2 = seatRefs.current[targetId]; if (!el1 || !el2) return;
        const r1 = el1.getBoundingClientRect(); const r2 = el2.getBoundingClientRect();
        const x1 = r1.left + r1.width/2; const y1 = r1.top + r1.height/2; const x2 = r2.left + r2.width/2; const y2 = r2.top + r2.height/2;
        const dx = x2 - x1; const dy = y2 - y1; const angle = Math.atan2(dy, dx) + Math.PI/2;
        const id = Date.now() + Math.random(); setProjectiles(prev => [...prev, { id, type, x1, y1, dx, dy, angle }]);
        setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== id)), 400);
    };

    const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

    const handleAvatarClick = (pId) => {
        if (pId === user.id) setShowEmoteWheel(!showEmoteWheel);
        else {
            if (!gameStarted || !roomState?.gameState) return;
            const state = roomState.gameState;
            if (state.phase === 'GAME_OVER' || state.phase === 'ANIMATING') return;

            const currentPlayer = state.players[state.turnIndex];
            if (currentPlayer?.id !== user.id || currentPlayer.isDead) return;

            if (state.phase === 'SELECT_ACTION_TARGET' && pendingAction) {
                socket.emit('execute_action', { roomId: roomState.id, userId: user.id, action: pendingAction, targetId: pId });
            }
            else if (state.phase === 'SELECT_TNT_TARGET') {
                socket.emit('execute_tnt', { roomId: roomState.id, userId: user.id, targetId: pId });
            }
        }
    };

    const handleRightClickAvatar = (pName) => { setSelectedProfileTarget(pName); };

    const handleHandClick = (clickedPlayerId, handIndex) => {
        setShowEmoteWheel(false);
        if (!gameStarted || !roomState?.gameState) return;
        const state = roomState.gameState;
        if (state.phase === 'GAME_OVER' || state.phase === 'ANIMATING') return;

        const currentPlayer = state.players[state.turnIndex];
        if (currentPlayer?.id !== user.id || currentPlayer.isDead) return;

        playSFX('select');
        if (state.phase === 'SELECT_OWN' || state.phase === 'SELECT_TARGET' || state.phase === 'CONFIRM') {
            if (clickedPlayerId === user.id) {
                setSelectedOwn({ handIndex });
                if (selectedTarget) { /* Wait for confirm button */ }
            }
            else {
                const tgtPlayer = state.players.find(p => p.id === clickedPlayerId);
                if (tgtPlayer && tgtPlayer.hands[handIndex] !== 0) {
                    if (selectedOwn) {
                        setSelectedTarget({ playerId: clickedPlayerId, handIndex });
                    }
                }
                else { playSFX('error'); }
            }
        }
    };

    const handleConfirmProtocol = () => {
        socket.emit('execute_math', {
            roomId: roomState.id,
            userId: user.id,
            myHandIdx: selectedOwn.handIndex,
            targetId: selectedTarget.playerId,
            targetHandIdx: selectedTarget.handIndex
        });
    };

    const handleActionSelect = (action) => {
        if (action.type === 'COMBO') {
            socket.emit('execute_action', { roomId: roomState.id, userId: user.id, action, targetId: action.targetId || null });
        } else if (action.type === 'RELIC') {
            socket.emit('execute_action', { roomId: roomState.id, userId: user.id, action, targetId: null });
        } else if (action.type === 'ATTACK') {
            setPendingAction(action);
            setRoomState(prev => ({...prev, gameState: {...prev.gameState, phase: 'SELECT_ACTION_TARGET'}}));
        }
    };

    const handleEndTurn = () => { socket.emit('end_turn', roomState.id); };
    const sendChat = () => { if(!chatInput.trim()) return; socket.emit('chat_message', { roomId: roomState.id, username: user.username, text: chatInput }); setChatInput(''); };

    // 倒计时前端显示模拟
    const [timeLeft, setTimeLeft] = useState(30);
    useEffect(() => {
        if (!gameStarted || roomState?.gameState?.phase === 'GAME_OVER') return;
        setTimeLeft(30);
        const timer = setInterval(() => { setTimeLeft(prev => Math.max(0, prev - 1)); }, 1000);
        return () => clearInterval(timer);
    }, [roomState?.gameState?.turnIndex, gameStarted]);

    // Render positioning — team mode has ally-bottom / enemy-top layout
    const isTeamMode = roomState?.gameState?.mode === 'team' || roomState?.mode === 'team';

    const getSeatStyle = (total, visualIdx, teamSlot) => {
        if (isTeamMode && total === 4) {
            // teamSlot: 'ally0','ally1','enemy0','enemy1'
            if (teamSlot === 'ally0')  return { bottom: '8%',  left: '30%', transform: 'translate(-50%, 0) scale(0.85)' };
            if (teamSlot === 'ally1')  return { bottom: '8%',  left: '70%', transform: 'translate(-50%, 0) scale(0.85)' };
            if (teamSlot === 'enemy0') return { top: '6%', left: '30%', transform: 'translate(-50%, 0) scale(0.85)' };
            if (teamSlot === 'enemy1') return { top: '6%', left: '70%', transform: 'translate(-50%, 0) scale(0.85)' };
        }
        if (visualIdx === 0) return { top: '80%', left: '50%', transform: 'translate(-50%, -50%) scale(0.9)' };
        if (total === 2 && visualIdx === 1) return { top: '20%', left: '50%', transform: 'translate(-50%, -50%) scale(0.9)' };
        if (total === 3) {
            if(visualIdx === 1) return { top: '30%', left: '20%', transform: 'translate(-50%, -50%) scale(0.8)' };
            if(visualIdx === 2) return { top: '30%', left: '80%', transform: 'translate(-50%, -50%) scale(0.8)' };
        }
        if (total === 4) {
            if(visualIdx === 1) return { top: '50%', left: '15%', transform: 'translate(-50%, -50%) scale(0.7)' };
            if(visualIdx === 2) return { top: '15%', left: '50%', transform: 'translate(-50%, -50%) scale(0.7)' };
            if(visualIdx === 3) return { top: '50%', left: '85%', transform: 'translate(-50%, -50%) scale(0.7)' };
        }
        return {};
    };

    if (!roomState) return <div className="absolute inset-0 flex items-center justify-center bg-[#030305] z-50 text-brand-cyan font-mono animate-pulse tracking-widest text-center px-4">CONNECTING TO NODE...</div>;

    const players = roomState.gameState ? roomState.gameState.players : roomState.players;
    const statePhase = roomState.gameState ? roomState.gameState.phase : 'WAITING';
    const turnIndex = roomState.gameState ? roomState.gameState.turnIndex : 0;
    const currentPlayerTurn = players[turnIndex];
    const isMeTurnNow = gameStarted && currentPlayerTurn?.id === user.id && !currentPlayerTurn.isDead;

    const visualPlayers = useMemo(() => {
        if (isTeamMode && players.length === 4) {
            // 团队模式：找到我的team，将我的队友和我放底部，敌人放顶部
            const me = players.find(p => p.id === user.id);
            if (!me) return players;
            const myTeam = me.team;
            const allies = players.filter(p => p.team === myTeam);
            const enemies = players.filter(p => p.team !== myTeam);
            // 返回顺序：[ally0, ally1, enemy0, enemy1]，并附加teamSlot信息
            return [
                { ...allies[0], _teamSlot: 'ally0' },
                { ...allies[1], _teamSlot: 'ally1' },
                { ...(enemies[0] || {}), _teamSlot: 'enemy0' },
                { ...(enemies[1] || {}), _teamSlot: 'enemy1' }
            ].filter(p => p.id);
        }
        const meIdx = players.findIndex(p => p.id === user.id); if(meIdx === -1) return players;
        const ordered = []; for(let i=0; i<players.length; i++) ordered.push(players[(meIdx + i) % players.length]); return ordered;
    }, [players, user.id, isTeamMode]);

    const activeVisualIdx = visualPlayers.findIndex(p => p.id === currentPlayerTurn?.id);
    const activeIndicatorStyle = gameStarted && activeVisualIdx !== -1 && statePhase !== 'GAME_OVER'
        ? getSeatStyle(players.length, activeVisualIdx, visualPlayers[activeVisualIdx]?._teamSlot)
        : { opacity: 0 };

    return (
        <div className={`min-h-screen absolute inset-0 overflow-hidden w-full ${shake ? 'animate-shake' : ''}`}>
            {selectedProfileTarget && <ProfileModal targetName={selectedProfileTarget} currentUser={user} onClose={()=>setSelectedProfileTarget(null)} onUpdateUser={onUpdateUser} t={t} />}
            {showInviteModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={()=>setShowInviteModal(false)}>
                    <div className="glass-panel-heavy p-8 rounded-3xl w-[400px] modal-responsive" onClick={e=>e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-brand-pink tracking-widest mb-4 flex items-center gap-2"><IconUserPlus/> {t.room_invite}</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto hide-scroll">
                            {user.friends?.map(fname => (
                                <div key={fname} className="flex justify-between items-center bg-black/60 p-3 rounded border border-gray-800">
                                    <span className="font-bold text-gray-200">{fname}</span>
                                    <button onClick={()=>{
                                        socket.emit('send_pm', { targetName: fname, text: `[系统] ${user.username} 邀请你加入房间: ${roomState.id}` });
                                        setShowInviteModal(false); playSFX('select');
                                    }} className="text-[10px] bg-brand-pink text-white px-3 py-1 rounded hover:bg-brand-pink/80 font-mono tracking-widest">SEND MSG</button>
                                </div>
                            ))}
                            {(!user.friends || user.friends.length === 0) && (
                                <div className="text-center text-gray-500 font-mono py-4">No friends found.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute top-0 w-full p-4 md:p-6 flex justify-between z-40 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2"><span className="text-brand-cyan font-mono text-[10px] md:text-sm tracking-widest">{roomState.id}</span></div>
                    <button
                        onClick={copyShareLink}
                        title={lang === 'zh' ? '复制房间分享链接' : 'Copy room share link'}
                        className={`glass-panel px-3 py-2 rounded-lg transition flex items-center gap-2 text-[10px] md:text-xs font-mono tracking-widest ${shareCopied ? 'text-green-400 border border-green-400/50' : 'text-brand-pink hover:bg-brand-pink/20'}`}>
                        <span className="text-base md:text-lg leading-none">🔗</span>
                        <span className="hidden sm:inline">{shareCopied ? (lang === 'zh' ? '已复制' : 'COPIED') : (lang === 'zh' ? '分享链接' : 'SHARE')}</span>
                    </button>
                </div>
                <button onClick={doLeave} className="glass-panel px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/20 pointer-events-auto transition flex items-center gap-2 text-xs md:text-sm"><IconLogOut /> {t.btn_exit}</button>
            </div>

{!gameStarted && (
                <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/80 backdrop-blur-md">
                    <div className="text-center glass-panel-heavy p-8 md:p-16 rounded-3xl relative overflow-hidden group shadow-[0_0_50px_rgba(0,240,255,0.1)] w-[90vw] md:w-[500px]">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-cyan/10 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-[2s] ease-in-out infinite"></div>
                        <h2 className="text-2xl md:text-4xl font-black mb-6 md:mb-8 text-brand-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] tracking-widest">{t.room_wait}</h2>
                        <div className="font-mono text-gray-400 mb-6 text-sm md:text-lg flex items-center justify-center gap-4"><span className="w-2 h-2 rounded-full bg-brand-pink animate-pulse"></span> Operator Links: <span className="text-white font-black text-xl md:text-2xl">{players.length} / {roomState.max || 4}</span></div>
                        <div className="flex flex-col gap-4 w-full relative z-10">
                            {players.length >= 2 && <button onClick={startGame} className="cyber-btn flex-1 bg-brand-pink hover:bg-[#ff3399] text-white font-black text-lg md:text-xl py-4 shadow-[0_0_30px_rgba(255,0,127,0.6)] hover:shadow-[0_0_50px_rgba(255,0,127,0.9)] transition transform hover:-translate-y-1 tracking-widest">{t.room_start}</button>}
                            {players.length < (roomState.max || 4) && (
                                <div className="flex flex-col md:flex-row gap-2">
                                    <button onClick={addBot} className="flex-1 border border-brand-cyan/50 text-brand-cyan hover:bg-brand-cyan/20 py-3 rounded transition font-mono tracking-widest text-xs md:text-sm">{t.room_add_bot}</button>
                                    <button onClick={()=>setShowInviteModal(true)} className="flex-1 border border-brand-pink/50 text-brand-pink hover:bg-brand-pink/20 py-3 rounded transition font-mono tracking-widest flex items-center justify-center gap-2 text-xs md:text-sm"><IconUserPlus/> {t.room_invite}</button>
                                </div>
                            )}
                            {players.length < 2 && <p className="text-brand-purple animate-pulse font-mono mt-2 text-xs md:text-sm">{t.room_wait_more}</p>}
                        </div>
                    </div>
                </div>
            )}

            {statePhase === 'GAME_OVER' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                    <div className="absolute inset-0 bg-brand-cyan/5 animate-pulse-fast"></div>
                    <div className="text-center opacity-0 animate-fade-in-up relative z-10 w-full max-w-[900px] px-4 md:px-8 modal-responsive h-auto max-h-[90vh]">
                        <h1 className="text-4xl md:text-7xl font-black text-brand-cyan mb-2 drop-shadow-[0_0_40px_rgba(0,240,255,0.8)] tracking-[0.2em]">{t.victory}</h1>
                        <p className="text-[10px] md:text-sm text-gray-400 font-mono tracking-widest mb-6 md:mb-10">{t.victory_sub}</p>

                        <div className="glass-panel-heavy rounded-2xl overflow-x-auto overflow-y-hidden mb-6 md:mb-8 border border-brand-cyan/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                            <table className="w-full text-left font-mono min-w-[500px]">
                                <thead className="bg-brand-cyan/20 text-brand-cyan text-[10px] md:text-xs">
                                    <tr>
                                        <th className="p-2 md:p-4">{t.stat_op}</th>
                                        <th className="p-2 md:p-4 text-center">{t.stat_dmg}</th>
                                        <th className="p-2 md:p-4 text-center">{t.stat_taken}</th>
                                        <th className="p-2 md:p-4 text-center">{t.stat_kills}</th>
                                        <th className="p-2 md:p-4 text-center">{t.stat_status}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map(p => {
                                        const s = roomState.gameState?.matchStats[p.id] || {dmgDealt:0, dmgTaken:0, kills:0};
                                        const maxScore = Math.max(...players.map(pl => (((roomState.gameState?.matchStats[pl.id]?.kills)||0)*20) + ((roomState.gameState?.matchStats[pl.id]?.dmgDealt)||0)));
                                        const isMvp = ((s.kills*20 + s.dmgDealt) === maxScore) && s.dmgDealt > 0;
                                        const pRank = p.id===user.id ? getRank(user.stats?.wins || 0) : getRank(Math.floor(Math.random()*100));
                                        return (
                                        <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition text-xs md:text-sm">
                                            <td className="p-2 md:p-4 flex items-center gap-2 md:gap-3">
                                                <AvatarDisplay avatar={p.avatar} name={p.name} frame={p.frame} className="w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0" />
                                                <div className="flex flex-col overflow-hidden">
                                                    {p.title && <div className="text-[8px] md:text-[10px] font-bold bg-black/50 px-1 py-0.5 rounded border border-white/20 mb-0.5 max-w-max text-brand-gold truncate">{p.title}</div>}
                                                    <div className="flex items-center gap-1 md:gap-2">
                                                        <div className={`text-[6px] md:text-[8px] font-bold px-1 rounded-sm border ${pRank.bg}`} style={{color: pRank.c}}>{pRank.n}</div>
                                                        <span className={`font-bold truncate ${p.id===user.id?'text-brand-pink':''}`}>{p.name}</span>
                                                    </div>
                                                </div>
                                                {isMvp && <span className="bg-brand-gold text-black text-[8px] md:text-[10px] px-1 md:px-2 py-0.5 rounded-sm font-black ml-1 md:ml-2 shadow-[0_0_10px_rgba(255,215,0,0.5)]">{t.stat_mvp}</span>}
                                            </td>
                                            <td className="p-2 md:p-4 text-center text-brand-cyan font-bold">{s.dmgDealt.toFixed(1)}</td>
                                            <td className="p-2 md:p-4 text-center text-red-400">{s.dmgTaken.toFixed(1)}</td>
                                            <td className="p-2 md:p-4 text-center text-brand-gold font-bold">{s.kills}</td>
                                            <td className="p-2 md:p-4 text-center">{p.isDead ? <span className="text-gray-500">K.I.A</span> : <span className="text-green-400">ALIVE</span>}</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mb-6 md:mb-8 shrink-0">
                            <div className="flex-1 flex justify-between items-center bg-black/50 p-4 md:p-6 rounded-xl border border-brand-gold/20">
                                <div className="text-left">
                                    <div className="text-brand-gold font-mono text-xs md:text-sm tracking-widest uppercase">{t.reward}</div>
                                </div>
                                <div className="text-2xl md:text-4xl font-black text-brand-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">
                                    +{ questRewards.base } CR
                                </div>
                            </div>
                            {questRewards.bonus > 0 && (
                            <div className="flex-1 flex justify-between items-center bg-brand-cyan/10 p-4 md:p-6 rounded-xl border border-brand-cyan/30 animate-pulse">
                                <div className="text-left">
                                    <div className="text-brand-cyan font-mono text-xs md:text-sm tracking-widest uppercase">{t.q_bonus}</div>
                                </div>
                                <div className="text-2xl md:text-4xl font-black text-brand-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">
                                    +{ questRewards.bonus } CR
                                </div>
                            </div>
                            )}
                        </div>

                        <button onClick={doLeave} className="cyber-btn bg-brand-cyan text-black font-black text-lg md:text-xl px-12 md:px-16 py-4 md:py-5 shadow-[0_0_30px_rgba(0,240,255,0.6)] hover:bg-white hover:shadow-[0_0_50px_rgba(255,255,255,0.8)] transition-all tracking-widest transform hover:-translate-y-1 mb-10 shrink-0">
                            {t.btn_exit}
                        </button>
                    </div>
                </div>
            )}

            <div className="absolute inset-0 pointer-events-none z-[-1]">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center opacity-20 md:opacity-30 z-0">
                    <div className="w-[300px] md:w-[450px] h-[300px] md:h-[450px] rounded-full border border-brand-cyan/20 relative overflow-hidden"><div className="radar-cone"></div><div className="absolute inset-0 border-[4px] border-dashed border-brand-purple/20 rounded-full animate-spin-reverse-slow"></div><div className="absolute inset-8 border border-brand-cyan/10 rounded-full"></div></div>
                    <div className="absolute text-brand-cyan font-mono font-black tracking-[0.6em] text-sm md:text-lg bg-black/50 px-4 md:px-6 py-2 rounded-full border border-brand-cyan/30 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)] whitespace-nowrap">{t.arena_proto}</div>
                </div>
            </div>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-30 w-full pointer-events-none mt-10 md:mt-0">
                {statePhase === 'SELECT_ACTION_TARGET' && isMeTurnNow && <h2 className="text-xl md:text-2xl font-black text-brand-purple animate-pulse drop-shadow-[0_0_15px_rgba(138,43,226,0.8)] flex items-center justify-center gap-3 tracking-widest"><IconCrosshair/> {t.select_atk_target}</h2>}
                {statePhase === 'SELECT_TNT_TARGET' && isMeTurnNow && <h2 className="text-2xl md:text-3xl font-black text-red-500 animate-pulse tracking-widest drop-shadow-[0_0_20px_rgba(255,0,0,0.8)] flex items-center justify-center gap-3"><IconCrosshair/> {t.phase_tnt}</h2>}
            </div>

            {(selectedOwn && selectedTarget && statePhase !== 'ANIMATING') && isMeTurnNow && (
                <div className="absolute top-[60%] md:top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <button onClick={handleConfirmProtocol} className="relative overflow-hidden pointer-events-auto bg-brand-pink text-white font-black text-lg md:text-2xl px-12 md:px-16 py-4 md:py-5 shadow-[0_0_40px_rgba(255,0,127,0.5)] hover:shadow-[0_0_60px_rgba(255,0,127,0.9)] transition-all tracking-[0.2em] group border border-white/30 backdrop-blur-sm">
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12"></div>
                        <span className="relative z-10">{t.phase_confirm}</span>
                        <div className="absolute top-0 left-0 w-3 md:w-4 h-3 md:h-4 border-t-2 border-l-2 border-white"></div><div className="absolute bottom-0 right-0 w-3 md:w-4 h-3 md:h-4 border-b-2 border-r-2 border-white"></div>
                    </button>
                </div>
            )}

            {statePhase === 'ACTION_MENU' && isMeTurnNow && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 glass-panel-heavy p-6 md:p-8 rounded-2xl flex flex-col items-center gap-4 md:gap-5 w-[85vw] md:w-96 shadow-[0_0_80px_rgba(0,0,0,0.9)] border-brand-cyan/50 animate-[float_3s_ease-in-out_infinite]">
                    <div className="text-brand-cyan font-mono text-xs md:text-sm tracking-[0.3em] uppercase mb-1 md:mb-2 font-black border-b border-brand-cyan/30 pb-2 w-full text-center">{t.phase_action}</div>
                    <div className="flex flex-col gap-2 md:gap-3 w-full max-h-[40vh] overflow-y-auto">
                        {roomState.gameState.availableActions.map((act, i) => (
                            <button key={i} onClick={() => handleActionSelect(act)} className={`relative overflow-hidden w-full py-3 md:py-4 px-4 md:px-5 border transition-all flex justify-between items-center group ${act.type === 'RELIC' ? 'bg-green-900/40 border-green-500/60 hover:border-green-400 shadow-[0_0_15px_rgba(0,255,80,0.2)]' : 'bg-black/60 border-brand-cyan/30 hover:border-brand-cyan'}`}>
                                <div className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform ${act.type === 'RELIC' ? 'bg-green-500/20' : 'bg-brand-cyan/20'}`}></div>
                                <span className={`relative z-10 font-bold tracking-wider text-sm md:text-base ${act.type === 'RELIC' ? 'text-green-300' : 'text-white'}`}>{act.name}</span>
                                <span className="relative z-10 text-[10px] md:text-xs font-mono text-brand-cyan/90">{act.desc}</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => { handleEndTurn(); }} className="mt-2 md:mt-4 text-gray-500 hover:text-white text-xs md:text-sm font-mono tracking-widest">{t.action_skip}</button>
                </div>
            )}

            <div className="absolute z-10 pointer-events-none transition-all duration-700 ease-in-out flex justify-center items-center w-[100px] md:w-[120px] h-[100px] md:h-[120px]" style={activeIndicatorStyle}>
                {gameStarted && statePhase !== 'GAME_OVER' && (
                    <div className="relative flex justify-center items-center w-full h-full">
                        <svg viewBox="0 0 120 120" className={`absolute w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(0,240,255,1)] ${getRingClass(players[turnIndex]?.ring)}`}>
                            <circle cx="60" cy="60" r="55" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" />
                            {/* 345是 2*pi*55 的近似值 */}
                            <circle cx="60" cy="60" r="55" stroke="#00f0ff" strokeWidth="3" fill="none" strokeDasharray="345" strokeDashoffset={345 - (345 * timeLeft) / 30} className="transition-all duration-1000 ease-linear" />
                        </svg>
                    </div>
                )}
            </div>

            {visualPlayers.map((p, i) => {
                const isMe = p.id === user.id;
                const seatStyle = getSeatStyle(players.length, i, p._teamSlot);
                // 团队模式：队友不可被攻击，但可被选为TNT或攻击的目标时过滤掉
                const isAlly = isTeamMode && !isMe && p.team !== undefined
                    && p.team === players.find(pl => pl.id === user.id)?.team;

                const pHands = p.hands || [1, 1];
                const pHp = p.hp !== undefined ? p.hp : (roomState.hp || 10);
                const pMaxHp = p.maxHp !== undefined ? p.maxHp : (roomState.hp || 10);
                const pIsDead = p.isDead || false;
                const pShield = p.shield || false;

                const leftOwn = selectedOwn?.handIndex === 0 && isMe; const rightOwn = selectedOwn?.handIndex === 1 && isMe;
                // 团队模式队友不可作为攻击目标
                const canTarget = !isMe && !isAlly;
                const leftTargetable = (statePhase === 'SELECT_TARGET' || (selectedOwn && isMeTurnNow)) && canTarget && pHands[0] !== 0;
                const rightTargetable = (statePhase === 'SELECT_TARGET' || (selectedOwn && isMeTurnNow)) && canTarget && pHands[1] !== 0;
                const leftIsTarget = selectedTarget?.playerId === p.id && selectedTarget?.handIndex === 0; const rightIsTarget = selectedTarget?.playerId === p.id && selectedTarget?.handIndex === 1;
                const leftZeroLocked = (statePhase === 'SELECT_TARGET' || (selectedOwn && isMeTurnNow)) && canTarget && pHands[0] === 0;
                const rightZeroLocked = (statePhase === 'SELECT_TARGET' || (selectedOwn && isMeTurnNow)) && canTarget && pHands[1] === 0;
                const cSkin = getCardClass(p.cardSkin);

                let tCol = '#00f0ff';
                if(p.title?.includes('欧米茄')||p.title?.includes('维度')) tCol = '#ffd700';
                else if(p.title?.includes('霓虹')||p.title?.includes('暗影')||p.title?.includes('虚空')) tCol = '#8a2be2';

                const activeEmote = activeEmotes[p.id];
                const pRank = p.id===user.id ? getRank(user.stats?.wins || 0) : getRank(Math.floor(Math.random()*100));

                const allChips = [...LOOT_POOLS[4], ...LOOT_POOLS[5]].filter(item=>item.type==='chip');  
                let equippedChipData = allChips.find(c => c.id === p.chip);  
                // ★ 自定义圣遗物 fallback：从服务端下发的 player 对象中读取 meta  
                if (!equippedChipData && p.chip?.startsWith('custom_')) {  
                    equippedChipData = {  
                        id: p.chip,  
                        icon: p.relicMeta?.icon || '⚙️',  
                        n: p.relicMeta?.name || '自定义',  
                        desc: p.relicMeta?.desc || ''  
                    };  
                }

                // Relic VFX integration
                const relicVFX = getRelicVFX(p.chip) || buildCustomVFX(p.relicState);  
                const relicState = p.relicState;

                // Relic hand override for left hand
                const leftRelicOverride = relicVFX?.getHandOverride(pHands[0], relicState);
                // Relic hand override for right hand
                const rightRelicOverride = relicVFX?.getHandOverride(pHands[1], relicState);

                    const glowConfig = p.relicState?._vfxConfig?.find(v => v.vfxType === 'glow');  
                    const glowActive = glowConfig && (!glowConfig.conditionVar || p.relicState?.[glowConfig.conditionVar]);  
                    const glowColorName = glowConfig ? (HEX_TO_NAME[glowConfig.color] || 'cyan') : null;  
                    const glowC = glowActive ? VFX_COLOR_MAP[glowColorName] : null;  
                    const intensityMap = { low: { outer: 0.2, inner: 0.05 }, medium: { outer: 0.4, inner: 0.1 }, high: { outer: 0.6, inner: 0.2 } };  
                    const glowI = intensityMap[glowConfig?.intensity] || intensityMap.medium;  
                    const customGlowStyle = glowActive && glowC ? {  
                        boxShadow: `0 0 25px ${glowC.glow.replace('VAR', String(glowI.outer))}, inset 0 0 15px ${glowC.glow.replace('VAR', String(glowI.inner))}`,  
                        borderColor: glowC.glow.replace('VAR', '0.4'),  
                    } : {};  
  
                    return (  
                    <div key={p.id} ref={el => seatRefs.current[p.id] = el}  
                         className={`absolute z-20 ${pIsDead ? 'opacity-30 grayscale' : ''} ${relicVFX?.getPlayerClasses(p, relicState) || ''}`}  
                         style={{...seatStyle, ...customGlowStyle}}  
                         onContextMenu={e=>{e.preventDefault(); handleRightClickAvatar(p.name);}}>
                        <div className={`relative flex gap-3 md:gap-5 items-center justify-center p-2 rounded-3xl ${pShield && p.chip!=='chip_heavy' && p.chip!=='chip_assassin' ? 'player-shield-wrapper' : ''}`}>
                            <div onClick={() => handleHandClick(p.id, 0)} className={`holo-slot ${cSkin} w-[55px] h-[75px] md:w-[70px] md:h-[90px] rounded-xl flex flex-col items-center justify-center ${leftTargetable||(isMe&&statePhase==='SELECT_OWN'&&gameStarted)?'cursor-pointer':''} ${leftOwn?'selected-own':''} ${leftIsTarget?'selected-target':''} ${leftZeroLocked?'locked-zero':''} ${leftRelicOverride?.className || ''}`}>
                                <span className="text-2xl md:text-3xl font-mono font-black drop-shadow-md relative z-10">{pHands[0]}</span>{leftRelicOverride ? <span className="absolute bottom-1 opacity-80 text-sm md:text-xl z-10">{leftRelicOverride.icon}</span> : (WEAPONS[pHands[0]] && <span className="absolute bottom-1 opacity-80 text-sm md:text-xl z-10">{WEAPONS[pHands[0]].icon}</span>)}
                            </div>

                            <div className="relative flex flex-col items-center">
                                                {activeEmote && (
                                                    <div className="absolute -top-16 text-3xl md:text-4xl animate-emote-float z-50 drop-shadow-[0_0_10px_#fff]">
                                                        {activeEmote.e}
                                                    </div>
                                                )}

                                                {chatBubbles[p.name] && (
                                                    <div className="absolute -top-20 left-1/2 z-50 animate-fade-in pointer-events-none" style={{maxWidth: '220px', width: 'max-content', transform: 'translateX(-50%)'}}>
                                                        <div className="bg-black/90 border border-brand-cyan/40 rounded-lg px-2.5 py-1.5 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
                                                            <p className="text-white text-[10px] md:text-xs font-mono leading-tight" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all'}}>{chatBubbles[p.name].text}</p>
                                                        </div>
                                                        <div className="w-0 h-0 mx-auto" style={{borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(0,0,0,0.9)'}}></div>
                                                    </div>
                                                )}

                                {showEmoteWheel && isMe && (
                                    <div className="absolute -top-24 w-28 h-28 md:w-32 md:h-32 bg-black/80 rounded-full border border-brand-cyan/50 backdrop-blur-md flex items-center justify-center gap-1 md:gap-2 flex-wrap p-2 z-50 animate-fade-in shadow-[0_0_30px_rgba(0,240,255,0.2)]">
                                        {['❓','💀','🥶','🔥'].map(em => (
                                            <button key={em} onClick={(e)=>{e.stopPropagation(); triggerEmote(p.id, em); setShowEmoteWheel(false);}} className="text-xl md:text-2xl hover:scale-125 transition bg-white/5 p-1 rounded-full">{em}</button>
                                        ))}
                                        <button onClick={(e)=>{e.stopPropagation(); setShowEmoteWheel(false);}} className="absolute bottom-1 text-[10px] md:text-xs text-gray-500 hover:text-white">CLOSE</button>
                                    </div>
                                )}

                                {p.title && <div className="absolute -top-8 md:-top-10 text-[8px] md:text-[10px] font-bold bg-black/60 px-1 md:px-2 py-0.5 rounded border mb-1 whitespace-nowrap z-20 shadow-[0_0_10px_currentColor]" style={{borderColor:`${tCol}40`, color:tCol}}>{p.title}</div>}
                                <div className="absolute -top-3 md:-top-4 flex items-center gap-1 z-20 bg-black/80 px-1 md:px-1.5 py-0.5 rounded shadow-[0_0_5px_currentColor]" style={{color: pRank.c, borderColor: pRank.c}}>
                                    <span className="text-[6px] md:text-[8px] font-bold">{pRank.n}</span>
                                </div>

                                <div className={`w-[60px] h-[60px] md:w-[80px] md:h-[80px] bg-black/80 rounded-full border-[2px] md:border-[3px] flex items-center justify-center z-10 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.9)] relative ${(statePhase==='SELECT_ACTION_TARGET'||statePhase==='SELECT_TNT_TARGET')&&!isMe?'cursor-crosshair':isMe?'cursor-pointer':''} ${isMe && !p.frame?.startsWith('frame_') ? 'border-brand-cyan' : 'border-transparent'}`} onClick={() => handleAvatarClick(p.id)}>
                                    {pIsDead ? <span className="text-red-500 font-mono text-lg md:text-2xl font-bold">X_X</span> : <AvatarDisplay avatar={p.avatar} name={p.name} frame={p.frame} className="w-[65px] h-[65px] md:w-[85px] md:h-[85px] rounded-full" />}
                                </div>
                                {relicVFX?.renderOverlay(p, relicState)}

                                {equippedChipData && (
                                    <div className="absolute -bottom-2 -left-2 w-7 h-7 md:w-9 md:h-9 z-30 has-tooltip" style={{filter:'drop-shadow(0 0 6px #00f0ff)'}}>
                                        <div style={{clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',background:'rgba(0,240,255,0.25)',width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid rgba(0,240,255,0.7)'}}>
                                            <span className="text-xs md:text-sm leading-none">{equippedChipData.icon}</span>
                                        </div>
                                        <div className="tooltip-custom glass-panel-heavy p-2 md:p-3 rounded-lg text-left w-40 md:w-48 border-brand-cyan/50 shadow-[0_0_20px_rgba(0,240,255,0.4)] pointer-events-none hidden md:block">
                                            <div className="text-brand-cyan font-bold text-[10px] md:text-xs mb-1">{equippedChipData.n}</div>
                                            <div className="text-[8px] md:text-[10px] font-mono text-gray-300 whitespace-pre-wrap leading-tight">{equippedChipData.desc}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div onClick={() => handleHandClick(p.id, 1)} className={`holo-slot ${cSkin} w-[55px] h-[75px] md:w-[70px] md:h-[90px] rounded-xl flex flex-col items-center justify-center ${rightTargetable||(isMe&&statePhase==='SELECT_OWN'&&gameStarted)?'cursor-pointer':''} ${rightOwn?'selected-own':''} ${rightIsTarget?'selected-target':''} ${rightZeroLocked?'locked-zero':''} ${rightRelicOverride?.className || ''}`}>
                                <span className="text-2xl md:text-3xl font-mono font-black drop-shadow-md relative z-10">{pHands[1]}</span>{rightRelicOverride ? <span className="absolute bottom-1 opacity-80 text-sm md:text-xl z-10">{rightRelicOverride.icon}</span> : (WEAPONS[pHands[1]] && <span className="absolute bottom-1 opacity-80 text-sm md:text-xl z-10">{WEAPONS[pHands[1]].icon}</span>)}
                            </div>
                        </div>
                        <div className="absolute top-[75px] md:top-[90px] left-1/2 transform -translate-x-1/2 glass-panel px-3 md:px-5 py-1.5 md:py-2 rounded-xl text-center min-w-[120px] md:min-w-[160px] z-10 mt-2">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                                <div className={`font-black text-xs md:text-sm truncate tracking-wide ${isMe ? 'text-brand-cyan' : isAlly ? 'text-green-400' : 'text-white'}`}>{p.name}</div>
                                {isTeamMode && <div className={`text-[8px] font-bold px-1 rounded ${isAlly||isMe ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{isAlly||isMe?'我方':'敌方'}</div>}
                                {p.swordLevel > 1 && <div className="text-[8px] font-bold text-brand-gold bg-brand-gold/20 px-1 rounded">⚔Lv{p.swordLevel}</div>}
                            </div>
                            <div className="w-full bg-gray-900 h-1.5 md:h-2 rounded-full mt-1.5 md:mt-2 overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-brand-pink to-brand-cyan transition-all duration-300" style={{ width: `${Math.max(0, (pHp/pMaxHp)*100)}%` }}></div></div>
                            <div className="text-[10px] md:text-xs font-mono mt-1 md:mt-1.5 text-gray-400 font-bold tracking-widest">{t.stat_hp}: {pHp.toFixed(1)} / {pMaxHp}</div>
                            {relicVFX?.renderStatusBar(p, relicState)}
                        </div>
                    </div>
                );
            })}

            {projectiles.map(p => (
                <div key={p.id} className="projectile-item" style={{ left: p.x1, top: p.y1, '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--angle': `${p.angle}rad` }}>
                    {p.type === 'arrow' && <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px #00f0ff)'}}><line x1="12" y1="22" x2="12" y2="2"></line><polyline points="5 9 12 2 19 9"></polyline></svg>}
                    {p.type === 'sword' && <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff007f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px #ff007f)'}}><path d="M4 14 Q 12 2 20 14" /><path d="M6 14 Q 12 6 18 14" opacity="0.5" /></svg>}
                </div>
            ))}

            {vfx.map(v => (
                <div key={v.id} className="absolute pointer-events-none z-50 animate-float-up font-black text-2xl md:text-4xl" style={{ left: v.x - 20, top: v.y - 50, color: v.color, textShadow: `0 0 20px ${v.color}` }}>{v.text}</div>
            ))}

            {/* Fix 5: 黑客大招全屏VFX */}
            {hackerUltVFX && (
                <div className="absolute inset-0 z-[200] pointer-events-none overflow-hidden">
                    <div className="absolute inset-0" style={{background:'rgba(0,30,0,0.6)', animation:'hackerUltFlash 0.5s ease-out forwards'}} />
                    {[...Array(60)].map((_,i) => (
                        <div key={i} className="absolute font-mono font-bold select-none" style={{
                            left: `${Math.random()*100}%`,
                            top: `${Math.random()*100}%`,
                            fontSize: `${8+Math.random()*18}px`,
                            color: `rgba(0,${180+Math.floor(Math.random()*75)},${Math.floor(Math.random()*80)},${0.5+Math.random()*0.5})`,
                            textShadow: '0 0 8px #00ff44',
                            animation: `hackerDigitFall ${0.5+Math.random()*1.5}s linear ${Math.random()*0.5}s forwards`,
                            willChange: 'transform, opacity'
                        }}>
                            {Math.random() > 0.5 ? '1' : '0'}
                        </div>
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-2xl md:text-4xl font-black font-mono tracking-widest" style={{color:'#00ff44',textShadow:'0 0 30px #00ff44, 0 0 60px #00ff44', animation:'hackerUltText 2s ease-out forwards'}}>
                            全域渗透攻击
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end">
                {isChatOpen ? (
                    <div className="glass-panel w-72 md:w-80 h-80 md:h-96 rounded-2xl flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.9)] border border-brand-cyan/20 animate-fade-in-up">
                        <div className="p-3 md:p-4 border-b border-white/10 flex justify-between items-center bg-black/60 rounded-t-2xl"><span className="text-brand-cyan font-mono text-xs md:text-sm font-bold flex items-center gap-2 tracking-widest">SYSTEM_LOGS</span><button onClick={() => { setIsChatOpen(false); setUnreadMsg(0); }} className="text-gray-400 hover:text-white transition"><IconMinimize /></button></div>
                        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 font-mono text-[10px] md:text-xs hide-scroll bg-black/40">
                            {logs.map(l => (<div key={l.id} className={l.type==='chat' ? 'text-white' : l.type==='combat' ? 'text-brand-pink font-bold' : 'text-brand-purple'}><span className="opacity-40 text-[8px] md:text-[10px]">[{l.time}] </span>{l.text}</div>))}
                            <div ref={logsEndRef} />
                        </div>
                        <div className="p-2 md:p-3 border-t border-white/10 bg-black/60 rounded-b-2xl">
                            <div className="flex items-center gap-2 bg-black/80 border border-gray-700 rounded-lg p-2 focus-within:border-brand-cyan transition shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
                                <span className="text-brand-cyan font-mono text-xs md:text-sm">$&gt;</span><input type="text" className="bg-transparent text-xs md:text-sm w-full outline-none font-mono text-gray-200" placeholder="Transmit..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendChat()} />
                                <button onClick={sendChat} className="text-gray-400 hover:text-brand-cyan transition"><IconSend /></button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => { setIsChatOpen(true); setUnreadMsg(0); }} className="glass-panel-heavy p-3 md:p-4 rounded-full hover:bg-white/10 transition shadow-[0_5px_30px_rgba(0,0,0,0.8)] border border-brand-cyan/30 relative group">
                        <IconMessageCircle className="group-hover:text-brand-cyan transition w-5 h-5 md:w-6 md:h-6" />
                        {unreadMsg > 0 && <span className="absolute -top-1 -right-1 bg-brand-pink text-white text-[8px] md:text-[10px] font-bold w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full animate-bounce shadow-[0_0_10px_rgba(255,0,127,0.8)]">{unreadMsg}</span>}
                    </button>
                )}
            </div>
        </div>
    );
};

export default BattleArena;
