import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { playSFX } from '../audio';
import { IconMinimize, IconSend } from './Icons';

const PrivateChat = ({ friendName, user, onClose }) => {
    const [text, setText] = useState('');
    const msgs = user.messages?.[friendName] || [];
    const endRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

    const sendPM = () => {
        if(!text.trim()) return;
        socket.emit('send_pm', { targetName: friendName, text: text.trim() });
        setText(''); playSFX('select');
    };

    return (
        <div className="fixed bottom-6 right-6 md:right-[350px] w-80 max-w-[90vw] h-96 glass-panel-heavy rounded-2xl flex flex-col z-[100] shadow-[0_0_30px_rgba(0,240,255,0.2)] animate-fade-in-up">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/60 rounded-t-2xl">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div><span className="text-brand-cyan font-mono text-sm font-bold tracking-widest">{friendName}</span></div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition"><IconMinimize /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm hide-scroll bg-black/40">
                {msgs.map((m, i) => {
                    const isMe = m.from === user.username;
                    return (
                        <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[9px] text-gray-500 mb-1">{m.time}</span>
                            <div className={`px-3 py-2 rounded-lg max-w-[85%] break-words ${isMe ? 'bg-brand-cyan/20 border border-brand-cyan/30 text-white' : 'bg-black/60 border border-gray-700 text-gray-300'}`}>{m.text}</div>
                        </div>
                    )
                })}
                <div ref={endRef} />
            </div>
            <div className="p-3 border-t border-white/10 bg-black/60 rounded-b-2xl">
                <div className="flex items-center gap-2 bg-black/80 border border-gray-700 rounded-lg p-2 focus-within:border-brand-cyan transition shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
                    <input type="text" className="bg-transparent text-sm w-full outline-none font-mono text-gray-200" placeholder="Message..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key==='Enter' && sendPM()} />
                    <button onClick={sendPM} className="text-brand-cyan hover:text-white transition"><IconSend /></button>
                </div>
            </div>
        </div>
    );
};

export default PrivateChat;
