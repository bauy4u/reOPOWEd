const LOOT_POOLS = {
    3: [
        { id: 'title_1', type: 'title', n: '[新晋特工]', c: '#00f0ff' },
        { id: 'title_2', type: 'title', n: '[前线兵卒]', c: '#00f0ff' },
        { id: 'title_3', type: 'title', n: '[拾荒者]', c: '#00f0ff' },
        { id: 'avatar_c1', type: 'avatar', n: 'Emoji 🤡', val: '🤡' },
        { id: 'avatar_c2', type: 'avatar', n: 'Emoji 👻', val: '👻' }
    ],
    4: [
        { id: 'title_4', type: 'title', n: '[霓虹漫步者]', c: '#8a2be2' },
        { id: 'title_5', type: 'title', n: '[暗影执行官]', c: '#8a2be2' },
        { id: 'frame_neon', type: 'frame', n: '霓虹流光', val: 'frame_neon' },
        { id: 'frame_inferno', type: 'frame', n: '地狱烈焰', val: 'frame_inferno' },
        { id: 'card_matrix', type: 'card', n: '骇客指令', val: 'card_matrix' },
        { id: 'card_blood', type: 'card', n: '鲜血盛宴', val: 'card_blood' },
        { id: 'ring_flame', type: 'ring', n: '烈焰灼心环', val: 'ring_flame' },
        { id: 'ring_frost', type: 'ring', n: '霜寒凝脉环', val: 'ring_frost' },
        { id: 'chip_vampire', type: 'chip', n: '吸血鬼模块', icon: '🩸', val: 'chip_vampire', desc: '近战利刃(5)造成伤害时恢复0.5 HP' },
        { id: 'chip_heavy', type: 'chip', n: '重型装甲', icon: '🪨', val: 'chip_heavy', desc: '最大HP+2，但护盾(4)失效' },
        { id: 'chip_sniper', type: 'chip', n: '鹰眼准星', icon: '🦅', val: 'chip_sniper', desc: '长弓(7)与重弩(8)额外+0.5伤害' },
        { id: 'chip_medic', type: 'chip', n: '战地医疗', icon: '💉', val: 'chip_medic', desc: '恢复药剂(9)额外+1HP，但最大HP-2' }
    ],
    5: [
        { id: 'title_6', type: 'title', n: '[👑 欧米茄掌控者]', c: '#ffd700' },
        { id: 'title_7', type: 'title', n: '[🌌 维度观测者]', c: '#ffd700' },
        { id: 'bg_chaos', type: 'bg', n: '狂乱视界', val: 'chaos' },
        { id: 'bg_quantum', type: 'bg', n: '量子跃迁', val: 'quantum' },
        { id: 'ring_magic', type: 'ring', n: '魔法符文法阵', val: 'ring_magic' },
        { id: 'ring_cyber', type: 'ring', n: '赛博序列圆环', val: 'ring_cyber' },
        { id: 'ring_void', type: 'ring', n: '虚空湮灭法阵', val: 'ring_void' },
        { id: 'ring_chrono', type: 'ring', n: '时序逆流法阵', val: 'ring_chrono' },
        { id: 'chip_fury', type: 'chip', n: '极度狂热', icon: '🔥', val: 'chip_fury', desc: 'TNT(0)伤害+1.5，引爆受1反噬' },
        { id: 'chip_assassin', type: 'chip', n: '暗影刺客', icon: '🥷', val: 'chip_assassin', desc: '近战利刃(5)伤害+1.0，护盾失效' },
        { id: 'chip_hacker', type: 'chip', n: '黑客入侵', icon: '💻', val: 'chip_hacker', desc: '空手(2)变为渗透门户，进入渗透状态积攒渗透值，可抵消伤害或释放终极技能' }
    ]
};

export default LOOT_POOLS;
