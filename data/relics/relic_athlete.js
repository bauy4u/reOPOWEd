const { RelicBase, registerRelic } = require('./index');

class RelicAthlete extends RelicBase {
    constructor() {
        super('chip_athlete', {
            name: '健儿',
            icon: '💪',
            desc: '最大HP+50%，但所受伤害+100%，对局结算CR+100%'
        });
    }

    onGameStart(player, ctx) {
        const bonus = Math.floor(player.maxHp * 0.5);
        player.maxHp += bonus;
        player.hp += bonus;
    }

    modifyIncomingDamage(target, attacker, damage, isNormal, ctx) {
        return damage * 2;
    }

    modifyCrReward(player, baseEarned) {
        return baseEarned * 2;
    }
}

registerRelic(new RelicAthlete());
module.exports = RelicAthlete;
