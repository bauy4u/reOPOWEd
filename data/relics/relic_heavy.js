const { RelicBase, registerRelic } = require('./index');

class RelicHeavy extends RelicBase {
    constructor() {
        super('chip_heavy', { name: '重型装甲', icon: '🪨', desc: '最大HP+2，但护盾(4)失效' });
    }

    onGameStart(player, ctx) {
        player.maxHp += 2;
        player.hp += 2;
    }

    modifyShield(player, defaultHasShield) {
        return false;
    }
}

registerRelic(new RelicHeavy());
module.exports = RelicHeavy;
