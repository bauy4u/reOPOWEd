import React, { useState, useEffect } from 'react';
import socket from '../socket';
import { getRank } from '../constants';
import { playSFX } from '../audio';
import AvatarDisplay from './AvatarDisplay';
import { IconUser, IconClock, IconUserPlus } from './Icons';

const ProfileModal = ({ targetName, currentUser, onClose, t }) => {
    const [targetData, setTargetData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (targetName.startsWith('AI_')) {
            setTargetData({
                username: targetName,
                stats: { wins: Math.floor(Math.random()*100), matches: 100 },
                settings: { signature: '01000010 01001111 01010100', title: '[AI_GHOST]', avatar: 'bot_avatar' },
                status: 'in_game'
            });
            setLoading(false); return;
        }
        socket.emit('get_profile', targetName, (data) => {
            if(data) setTargetData(data);
            setLoading(false);
        });
    }, [targetName]);

    if (loading) return null;
    if (!targetData) return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="glass-panel p-8 text-brand-pink font-mono" onClick={e=>e.stopPropagation()}>[ ERROR ] Operator not found in DB.<button onClick={onClose} className="block mt-4 text-white">CLOSE</button></div>
        </div>
    );

    const rank = getRank(targetData.stats?.wins || 0);
    const isMe = targetName === currentUser.username;
    const isFriend = currentUser.friends?.includes(targetName);
    const isBot = targetName.startsWith('AI_');
    const reqSent = targetData.friendRequests?.some(r => r.from === currentUser.username);

    const sendFriendReq = () => {
        if(isBot) return playSFX('error');
        socket.emit('send_friend_req', targetName);
        playSFX('heal');
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in" onClick={onClose} onContextMenu={e=>e.preventDefault()}>
            <div className="glass-panel-heavy p-8 rounded-3xl modal-responsive items-center relative overflow-hidden" onClick={e=>e.stopPropagation()}>
                <div className="absolute inset-0 bg-gradient-to-b from-brand-cyan/10 to-transparent pointer-events-none"></div>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl z-10">&times;</button>

                <AvatarDisplay avatar={targetData.settings?.avatar} name={targetData.username} frame={targetData.settings?.frame} className="w-24 h-24 rounded-full border-4 border-black shadow-[0_0_20px_rgba(0,240,255,0.3)] mb-4 relative z-10" />
                <div className="flex items-center gap-2 relative z-10 mb-1">
                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border ${rank.bg}`} style={{color: rank.c}}>{rank.n}</div>
                    <h2 className="text-2xl font-black text-white tracking-wider">{targetData.username}</h2>
                </div>
                {targetData.settings?.title && <div className="text-xs font-bold text-brand-gold mb-3 bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/30 relative z-10">{targetData.settings.title}</div>}

                <div className="w-full bg-black/50 p-4 rounded-xl border border-white/10 mb-6 relative z-10">
                    <p className="text-sm font-mono text-gray-300 italic text-center break-words">"{targetData.settings?.signature || '这个特工很神秘，什么都没留下...'}"</p>
                </div>

                <div className="w-full grid grid-cols-2 gap-4 mb-6 relative z-10">
                    <div className="bg-black/60 p-3 rounded-lg border border-brand-cyan/20 text-center">
                        <div className="text-xs font-mono text-gray-400 mb-1">{t.lobby_wins}</div>
                        <div className="text-xl font-bold text-brand-cyan">{Math.max(0, Math.round(((targetData.stats?.wins||0)/Math.max(targetData.stats?.matches||1,1))*100))||0}%</div>
                    </div>
                    <div className="bg-black/60 p-3 rounded-lg border border-brand-purple/20 text-center">
                        <div className="text-xs font-mono text-gray-400 mb-1">{t.lobby_matches}</div>
                        <div className="text-xl font-bold text-brand-purple">{targetData.stats?.matches||0}</div>
                    </div>
                </div>

                {!isMe && !isBot && (
                    <div className="w-full relative z-10">
                        {isFriend ? (
                            <button disabled className="w-full py-3 rounded-xl bg-green-500/20 text-green-400 font-bold tracking-widest border border-green-500/30 flex items-center justify-center gap-2"><IconUser/> 已是特工网络成员</button>
                        ) : reqSent ? (
                            <button disabled className="w-full py-3 rounded-xl bg-gray-500/20 text-gray-400 font-bold tracking-widest border border-gray-500/30 flex items-center justify-center gap-2"><IconClock/> {t.soc_req_sent}</button>
                        ) : (
                            <button onClick={sendFriendReq} className="cyber-btn w-full bg-brand-cyan text-black font-black py-3 hover:bg-white transition tracking-widest shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2"><IconUserPlus/> {t.soc_add_friend}</button>
                        )}
                    </div>
                )}
                {isBot && (
                    <div className="w-full relative z-10">
                        <button disabled className="w-full py-3 rounded-xl bg-gray-500/20 text-gray-400 font-bold tracking-widest border border-gray-500/30 flex items-center justify-center gap-2">AI 实体</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileModal;
