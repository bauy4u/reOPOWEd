const { RelicBase, registerRelic } = require('./index');

class RelicSniper extends RelicBase {
    constructor() {
        super('chip_sniper', { name: '鹰眼准星', icon: '🦅', desc: '长弓(7)与重弩(8)额外+0.5伤害' });
    }

    modifyOutgoingDamage(attacker, target, baseDmg, actionId, ctx) {
        if (actionId === 'bow' || actionId === 'crossbow_single' || actionId === 'crossbow_double') {
            return baseDmg + 0.5;
        }
        return baseDmg;
    }
}

registerRelic(new RelicSniper());
module.exports = RelicSniper;
