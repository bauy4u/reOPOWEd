const { RelicBase, registerRelic } = require('./index');

class RelicVampire extends RelicBase {
    constructor() {
        super('chip_vampire', { name: '吸血鬼模块', icon: '🩸', desc: '近战利刃(5)造成伤害时恢复0.5 HP' });
    }

    onDamageDealt(attacker, target, finalDmg, isNormal, ctx) {
        if (isNormal && finalDmg > 0 && !attacker.isDead) {
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + 0.5);
            ctx.emit('vfx_trigger', { type: 'heal', targetId: attacker.id, text: '+0.5', color: '#ff007f' });
        }
    }
}

registerRelic(new RelicVampire());
module.exports = RelicVampire;
