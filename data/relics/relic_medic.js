const { RelicBase, registerRelic } = require('./index');

class RelicMedic extends RelicBase {
    constructor() {
        super('chip_medic', { name: '战地医疗', icon: '💉', desc: '恢复药剂(9)额外+1HP，但最大HP-2' });
    }

    onGameStart(player, ctx) {
        player.maxHp -= 2;
        player.hp = Math.min(player.hp, player.maxHp);
    }

    // 凑出9时额外治疗 — 通过 onHandChanged 钩子
    onHandChanged(player, handIdx, newVal, ctx) {
        if (newVal === 9) {
            // 基础治疗1已在引擎中处理，此处额外+1 (总共2)
            player.hp = Math.min(player.maxHp, player.hp + 1);
            ctx.emit('vfx_trigger', { type: 'heal', targetId: player.id, text: '+1', color: '#00ff00' });
        }
    }
}

registerRelic(new RelicMedic());
module.exports = RelicMedic;
