// ==========================================
// 圣遗物系统 — 基类 + 注册表
// 新增圣遗物: 1) 继承 RelicBase  2) 实现所需钩子  3) 在 registry 注册
// ==========================================

class RelicBase {
    constructor(id, meta) {
        this.id = id;
        this.meta = meta; // { name, icon, desc }
    }

    // 游戏开始时：修改初始属性 (如 maxHp)
    onGameStart(player, ctx) {}

    // 每回合开始时 (当前玩家)
    onTurnStart(player, ctx) {}

    // 手牌值变化后 (executeMath 结算后)
    onHandChanged(player, handIdx, newVal, ctx) {}

    // 计算可用行动后：可追加/过滤行动
    modifyActions(player, actions, changedHandIdx, ctx) { return actions; }

    // 攻击伤害计算前：修改基础伤害
    modifyOutgoingDamage(attacker, target, baseDmg, actionId, ctx) { return baseDmg; }

    // 受到伤害前：可拦截/修改伤害值
    modifyIncomingDamage(target, attacker, damage, isNormal, ctx) { return damage; }

    // 伤害结算后 (对所有伤害类型触发，isNormal 参数区分类型)
    onDamageDealt(attacker, target, finalDmg, isNormal, ctx) {}

    // TNT 引爆结算后
    onTntDetonated(player, target, ctx) {}

    // 护盾计算：覆盖默认护盾逻辑
    modifyShield(player, defaultHasShield) { return defaultHasShield; }

    // 回合结束时
    onTurnEnd(player, ctx) {}

    // 执行圣遗物专属行动 (由 executeAction RELIC 分支调用)
    executeRelicAction(player, action, ctx) {}

    // 对局结算时修改CR奖励倍率
    modifyCrReward(player, baseEarned) { return baseEarned; }

    // 返回自定义状态对象，附加到 player.relicState 发送给前端用于VFX
    getCustomState(player) { return null; }
}

// --- 注册表 ---
const registry = new Map();

function registerRelic(relic) {
    registry.set(relic.id, relic);
}

function getRelic(chipId) {
    return registry.get(chipId) || null;
}

function getAllRelics() {
    return Array.from(registry.values());
}

module.exports = { RelicBase, registerRelic, getRelic, getAllRelics };
