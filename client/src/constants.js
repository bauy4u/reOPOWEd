export const getWeapons = (t) => ({
    3: { name: t.w_arrow, icon: '🏹', desc: '基础射击' },
    4: { name: t.w_shield, icon: '🛡️', desc: '抵挡0.5伤害' },
    5: { name: t.w_sword, icon: '🗡️', desc: '切割伤害' },
    6: { name: t.w_darrow, icon: '🏹🏹', desc: '双重打击' },
    7: { name: t.w_bow, icon: '🏹', desc: '长弓投射' },
    8: { name: t.w_cross, icon: '🏹', desc: '机械重弩' },
    9: { name: t.w_pot, icon: '🧪', desc: '恢复HP' },
    0: { name: t.w_tnt, icon: '💣', desc: '爆破伤害' }
});

export const getRank = (wins) => {
    if(wins >= 100) return { n: '🌌 欧米茄', c: '#ff007f', bg: 'bg-pink-500/20 border-pink-500/50' };
    if(wins >= 60) return { n: '💎 钻石大师', c: '#00f0ff', bg: 'bg-cyan-500/20 border-cyan-500/50' };
    if(wins >= 30) return { n: '🥇 黄金精英', c: '#ffd700', bg: 'bg-yellow-500/20 border-yellow-500/50' };
    if(wins >= 10) return { n: '🥈 白银先锋', c: '#c0c0c0', bg: 'bg-gray-400/20 border-gray-400/50' };
    return { n: '🥉 黑铁特工', c: '#8c7853', bg: 'bg-orange-900/20 border-orange-900/50' };
};

export const getCardClass = (skin) => {
    if (skin === 'card_matrix') return 'card-matrix';
    if (skin === 'card_blood') return 'card-blood';
    return 'card-default';
};

export const getRingClass = (ring) => {
    if (ring === 'ring_magic') return 'ring-magic';
    if (ring === 'ring_cyber') return 'ring-cyber';
    if (ring === 'ring_flame') return 'ring-flame';
    if (ring === 'ring_frost') return 'ring-frost';
    if (ring === 'ring_void') return 'ring-void';
    if (ring === 'ring_chrono') return 'ring-chrono';
    return 'ring-default';
};
