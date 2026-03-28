import React, { useState, useEffect } from 'react';
import socket from '../socket';
import { playSFX } from '../audio';
import { IconInbox } from './Icons';

const MailboxModal = ({ user, onClose, lang }) => {
    const [inbox, setInbox] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        socket.emit('get_inbox', (mails) => {
            setInbox(mails || []);
            setLoading(false);
        });
    }, []);

    const openMail = (mail) => {
        setSelected(mail);
        if (!mail.read) {
            socket.emit('mail_read', mail.id);
            setInbox(prev => prev.map(m => m.id === mail.id ? { ...m, read: true } : m));
        }
    };

    const claimAll = (mail) => {
        socket.emit('claim_all_attachments', mail.id, (res) => {
            if (res.success) {
                playSFX('gacha_5star');
                setInbox(prev => prev.map(m => m.id === mail.id
                    ? { ...m, attachments: m.attachments.map(a => ({ ...a, claimed: true })) }
                    : m
                ));
                setSelected(prev => prev ? { ...prev, attachments: prev.attachments.map(a => ({ ...a, claimed: true })) } : null);
            }
        });
    };

    const claimOne = (mail, idx) => {
        socket.emit('claim_attachment', mail.id, idx, (res) => {
            if (res.success) {
                playSFX('heal');
                setInbox(prev => prev.map(m => {
                    if (m.id !== mail.id) return m;
                    const atts = [...m.attachments];
                    atts[idx] = { ...atts[idx], claimed: true };
                    return { ...m, attachments: atts };
                }));
                setSelected(prev => {
                    if (!prev || prev.id !== mail.id) return prev;
                    const atts = [...prev.attachments];
                    atts[idx] = { ...atts[idx], claimed: true };
                    return { ...prev, attachments: atts };
                });
            }
        });
    };

    const deleteMail = (mail) => {
        socket.emit('delete_mail', mail.id, (res) => {
            if (res?.err) { playSFX('error'); return; }
            setInbox(prev => prev.filter(m => m.id !== mail.id));
            setSelected(null);
            playSFX('select');
        });
    };

    const unreadCount = inbox.filter(m => !m.read).length;
    const fmt = (ts) => new Date(ts).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="glass-panel-heavy rounded-3xl modal-responsive flex flex-col overflow-hidden" style={{maxWidth:'800px', height:'80vh'}} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-brand-cyan/30 shrink-0">
                    <h2 className="text-xl font-black text-brand-cyan tracking-widest flex items-center gap-2">
                        <IconInbox/> 特工邮箱
                        {unreadCount > 0 && <span className="bg-brand-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Mail list */}
                    <div className="w-[220px] md:w-[260px] border-r border-white/10 overflow-y-auto hide-scroll shrink-0">
                        {loading && <div className="text-gray-500 font-mono text-xs p-4 animate-pulse">Loading...</div>}
                        {!loading && inbox.length === 0 && (
                            <div className="text-gray-600 font-mono text-xs p-6 text-center">收件箱为空</div>
                        )}
                        {inbox.map(mail => (
                            <div key={mail.id} onClick={() => openMail(mail)}
                                className={`p-3 border-b border-white/5 cursor-pointer transition hover:bg-white/5 ${selected?.id === mail.id ? 'bg-brand-cyan/10 border-l-2 border-l-brand-cyan' : ''}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {!mail.read && <div className="w-1.5 h-1.5 rounded-full bg-brand-pink shrink-0"></div>}
                                    <div className={`text-xs font-bold truncate ${!mail.read ? 'text-white' : 'text-gray-400'}`}>{mail.subject}</div>
                                </div>
                                <div className="text-[10px] font-mono text-gray-500 flex justify-between">
                                    <span className="truncate mr-2">{mail.from}</span>
                                    <span className="shrink-0">{fmt(mail.time)}</span>
                                </div>
                                {mail.attachments?.some(a => !a.claimed) && (
                                    <div className="text-[9px] text-brand-gold mt-1 flex items-center gap-1">📎 含未领取附件</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Mail detail */}
                    {selected ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-5 border-b border-white/10 shrink-0">
                                <div className="font-black text-white text-base mb-1">{selected.subject}</div>
                                <div className="text-[11px] font-mono text-gray-500">
                                    来自: <span className="text-brand-cyan">{selected.from}</span> &nbsp;·&nbsp; {fmt(selected.time)}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 hide-scroll">
                                <pre className="text-sm text-gray-300 font-sans whitespace-pre-wrap leading-relaxed">{selected.content}</pre>
                            </div>

                            {/* Attachments */}
                            {selected.attachments?.length > 0 && (
                                <div className="border-t border-brand-gold/30 p-4 shrink-0 bg-brand-gold/5">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-[11px] font-mono text-brand-gold tracking-widest uppercase">📎 附件</div>
                                        {selected.attachments.some(a => !a.claimed) && (
                                            <button onClick={() => claimAll(selected)}
                                                className="text-[10px] bg-brand-gold text-black font-black px-3 py-1 rounded hover:bg-yellow-400 transition tracking-widest">
                                                一键领取
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selected.attachments.map((att, i) => (
                                            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${att.claimed ? 'border-gray-700 bg-black/30 opacity-50' : 'border-brand-gold/50 bg-brand-gold/10 hover:bg-brand-gold/20 cursor-pointer'}`}
                                                onClick={() => !att.claimed && claimOne(selected, i)}>
                                                <span className="text-lg">{att.icon}</span>
                                                <div>
                                                    <div className="text-xs font-bold text-brand-gold">{att.name}</div>
                                                    <div className="text-[9px] font-mono text-gray-500">{att.claimed ? '已领取' : '点击领取'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-3 border-t border-white/10 shrink-0 flex justify-end">
                                <button onClick={() => deleteMail(selected)}
                                    className="text-[11px] text-red-400 hover:text-red-300 font-mono border border-red-400/30 px-3 py-1 rounded hover:bg-red-500/10 transition">
                                    删除邮件
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-600 font-mono text-sm">
                            选择一封邮件查看
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MailboxModal;
