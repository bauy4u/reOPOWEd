import React, { useState, useEffect, Suspense } from 'react';
import socket from './socket';
import { ensureAudioContext, toggleBGM } from './audio';
import BackgroundEngine from './components/BackgroundEngine';
import LoginScreen from './screens/LoginScreen';
import LobbyScreen from './screens/LobbyScreen';

// 懒加载重型场景
const BattleArena = React.lazy(() => import('./screens/BattleArena'));
const RelicEditorScreen = React.lazy(() => import('./screens/RelicEditorScreen'));

let bgmCtx = null;

const App = () => {
    const [gameState, setGameState] = useState('LOADING');
    const [user, setUser] = useState(null);
    const [activeRoom, setActiveRoom] = useState(null);
    const [lang, setLang] = useState('zh');

    useEffect(() => {
        const handleInteract = () => {
            if (window.isBgmOn && bgmCtx && bgmCtx.state === 'suspended') bgmCtx.resume();
        };
        window.addEventListener('mousedown', handleInteract);
        window.addEventListener('touchstart', handleInteract);

        const saved = localStorage.getItem('tactical_user_cache');
        if (saved) {
            const parsed = JSON.parse(saved);
            setUser(parsed);
            setGameState('LOBBY');
            socket.emit('authenticate', parsed.username);
            if (parsed.settings?.bgm) setTimeout(() => toggleBGM(true), 200);
        } else {
            setGameState('LOGIN');
        }
        return () => {
            window.removeEventListener('mousedown', handleInteract);
            window.removeEventListener('touchstart', handleInteract);
        }
    }, []);

    useEffect(() => {
        const handleUserUpdate = (u) => {
            setUser(u);
            localStorage.setItem('tactical_user_cache', JSON.stringify(u));
        };
        socket.on('user_state_update', handleUserUpdate);

        // Socket 重连后自动补发认证，防止 socket.username 在服务端丢失
        const handleReconnect = () => {
            const saved = localStorage.getItem('tactical_user_cache');
            if (saved) {
                const parsed = JSON.parse(saved);
                socket.emit('authenticate', parsed.username);
            }
        };
        socket.on('connect', handleReconnect);

        return () => {
            socket.off('user_state_update', handleUserUpdate);
            socket.off('connect', handleReconnect);
        };
    }, []);

    const handleLogin = (u) => { setUser(u); setGameState('LOBBY'); };
    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('tactical_user_cache');
        setGameState('LOGIN');
        setActiveRoom(null);
        toggleBGM(false);
    };
    const handleLeaveRoom = () => { setActiveRoom(null); setGameState('LOBBY'); };
    const handleUpdateUser = (u) => { setUser(u); };

    const handleOpenEditor = () => { setGameState('RELIC_EDITOR'); };  
    const handleEditorBack = () => { setGameState('LOBBY'); };

    useEffect(() => {
        const onRoomStateUpdate = (room) => {
            if (!user) return;
            const isMeInRoom = room?.players?.find(p => p.username === user.username);
            if (isMeInRoom) {
                setActiveRoom(room);
                if (gameState !== 'ARENA') {
                    setGameState('ARENA');
                }
            }
        };

        socket.on('room_created', onRoomStateUpdate);
        socket.on('room_state_update', onRoomStateUpdate);

        return () => {
            socket.off('room_created', onRoomStateUpdate);
            socket.off('room_state_update', onRoomStateUpdate);
        }
    }, [user, gameState]);

    return (
        <>
            <BackgroundEngine theme={user?.settings?.bgTheme || 'stars'} />
            {gameState === 'LOADING' && <div className="h-screen w-full flex items-center justify-center text-brand-cyan font-mono animate-pulse tracking-widest text-center px-4">SYSTEM BOOTING...</div>}
            {gameState === 'LOGIN' && <LoginScreen onLogin={handleLogin} lang={lang} setLang={setLang} />}
            {gameState === 'LOBBY' && <LobbyScreen user={user} onJoinRoom={()=>{}} onLogout={handleLogout} lang={lang} setLang={setLang} onUpdateUser={handleUpdateUser} onOpenEditor={handleOpenEditor} />}
            {gameState === 'ARENA' && (  
                <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-[#030305] z-50 text-brand-cyan font-mono animate-pulse tracking-widest text-center px-4">CONNECTING TO NODE...</div>}>  
                    <BattleArena user={user} onLeave={handleLeaveRoom} lang={lang} onUpdateUser={handleUpdateUser} initialRoom={activeRoom} />  
                </Suspense>  
            )}  
            {/* ↓↓↓ 新增：圣遗物编辑器 ↓↓↓ */}  
            {gameState === 'RELIC_EDITOR' && (  
                <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-[#030305] z-50 text-brand-cyan font-mono animate-pulse tracking-widest text-center px-4">LOADING WORKSHOP...</div>}>  
                    <RelicEditorScreen user={user} onBack={handleEditorBack} />  
                </Suspense>  
            )}
        </>
    );
};

export default App;
