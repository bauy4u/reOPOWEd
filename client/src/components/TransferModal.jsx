import React, { useState } from 'react';
import socket from '../socket';
import { playSFX } from '../audio';
import { IconGift } from './Icons';

const TransferModal = ({ friendName, user, onClose, t }) => {
    const [amount, setAmount] = useState('');
    const [err, setErr] = useState('');

    const handleTransfer = () => {
        socket.emit('transfer_cr', { targetName: friendName, amount }, (res) => {
            if(res.err) setErr(res.err);
            else { playSFX('heal'); onClose(); }
        });
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 flex items-center justify-center animate-fade-in">
            <div className="glass-panel-heavy p-6 rounded-2xl w-[320px] max-w-[90vw] flex flex-col gap-4 border border-brand-gold/50 shadow-[0_0_30px_rgba(255,215,0,0.2)] modal-responsive">
                <h3 className="text-lg font-bold text-brand-gold tracking-widest flex items-center gap-2"><IconGift/> {t.soc_transfer}</h3>
                <p className="text-xs text-gray-400 font-mono">To: <span className="text-white">{friendName}</span></p>
                {err && <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/30">{err}</div>}
                <input type="number" placeholder="Amount (CR)..." value={amount} onChange={e=>setAmount(e.target.value)} className="bg-black/50 border border-brand-gold/30 rounded px-3 py-2 outline-none focus:border-brand-gold font-mono text-brand-gold" />
                <div className="text-xs text-gray-500 font-mono">Cost: {amount ? Math.ceil(parseInt(amount)*1.1) : 0} CR (-10% Tax)</div>
                <div className="flex gap-2 mt-2">
                    <button onClick={onClose} className="flex-1 py-2 bg-white/5 rounded hover:bg-white/10 text-xs font-mono">Cancel</button>
                    <button onClick={handleTransfer} className="flex-1 py-2 bg-brand-gold text-black font-bold rounded hover:bg-yellow-400 text-xs tracking-widest shadow-[0_0_10px_rgba(255,215,0,0.4)]">Transfer</button>
                </div>
            </div>
        </div>
    );
};

export default TransferModal;
