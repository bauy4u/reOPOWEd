const { RelicBase, registerRelic } = require('./index');

class RelicFury extends RelicBase {
    constructor() {
        super('chip_fury', { name: '极度狂热', icon: '🔥', desc: 'TNT(0)伤害+1.5，引爆受1反噬' });
    }

    modifyOutgoingDamage(attacker, target, baseDmg, actionId, ctx) {
        if (actionId === 'tnt') {
            return baseDmg + 1.5; // 1.5 → 3.0
        }
        return baseDmg;
    }

    onTntDetonated(player, target, ctx) {
        player.hp = Math.max(0, player.hp - 1);
        ctx.emit('vfx_trigger', { type: 'dmg', targetId: player.id, text: '-1', color: '#ff0000' });
        if (player.hp === 0 && !player.isDead) {
            player.isDead = true;
        }
    }
}

registerRelic(new RelicFury());
module.exports = RelicFury;
