const { RelicBase, registerRelic } = require('./index');

class RelicAssassin extends RelicBase {
    constructor() {
        super('chip_assassin', { name: '暗影刺客', icon: '🥷', desc: '近战利刃(5)伤害+1.0，护盾失效' });
    }

    modifyOutgoingDamage(attacker, target, baseDmg, actionId, ctx) {
        if (actionId === 'sword') {
            return baseDmg + 1.0;
        }
        return baseDmg;
    }

    modifyShield(player, defaultHasShield) {
        return false;
    }
}

registerRelic(new RelicAssassin());
module.exports = RelicAssassin;
