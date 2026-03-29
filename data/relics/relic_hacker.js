const { RelicBase, registerRelic } = require('./index');

class RelicHacker extends RelicBase {
    constructor() {
        super('chip_hacker', {
            name: '黑客入侵',
            icon: '💻',
            desc: '空手(2)变为渗透门户，进入渗透状态积攒渗透值，可抵消伤害或释放终极技能'
        });
    }

    onGameStart(player, ctx) {
        player.relicState = {
            penetrationValue: 0,
            portalActive: true,
            isInPenetration: false,
            hasActivated: false,
            canFireUltimate: false,
            skillFired: false
        };
        this._updatePenetrationStatus(player, ctx);
    }

    onTurnStart(player, ctx) {
        const rs = player.relicState;
        if (!rs || !rs.portalActive || rs.skillFired) return;

        this._updatePenetrationStatus(player, ctx);

        if (rs.isInPenetration) {
            if (!rs.hasActivated) {
                rs.hasActivated = true;
                rs.penetrationValue = 1;
                ctx.log(`[黑客] ${player.name} 激活渗透门户！渗透值: 1`, 'combat');
                ctx.emit('vfx_trigger', { type: 'heal', targetId: player.id, text: '渗透:1', color: '#00ff00' });
            } else {
                rs.penetrationValue += 1;
                ctx.log(`[黑客] ${player.name} 渗透值增长至 ${rs.penetrationValue}`, 'info');
                ctx.emit('vfx_trigger', { type: 'heal', targetId: player.id, text: `渗透:${rs.penetrationValue}`, color: '#00ff00' });
            }
        }

        // Fix 5: 检测是否可以触发大招，标记但不自动释放
        if (rs.isInPenetration && rs.penetrationValue >= player.hp && rs.penetrationValue > 0) {
            rs.canFireUltimate = true;
            ctx.log(`[黑客] ${player.name} 渗透值充盈，可释放全域渗透攻击！`, 'combat');
            ctx.emit('system_log', { text: `[黑客] ${player.name} 的渗透值已满足条件，可发动大招！`, type: 'combat' });
        } else {
            rs.canFireUltimate = false;
        }
    }

    onHandChanged(player, handIdx, newVal, ctx) {
        if (!player.relicState || !player.relicState.portalActive) return;
        this._updatePenetrationStatus(player, ctx);
    }

    // Fix 5: modifyActions 注入大招选项
    modifyActions(player, actions, changedHandIdx, ctx) {
        const rs = player.relicState;
        if (rs && rs.canFireUltimate && !rs.skillFired && rs.portalActive) {
            actions.push({
                type: 'RELIC',
                id: 'hacker_ultimate',
                name: '🌐 全域渗透攻击',
                desc: '对所有敌人造成2伤害，自身回复2血'
            });
        }
        return actions;
    }

    // Fix 5: 大招执行逻辑
    executeRelicAction(player, action, ctx) {
        if (action.id !== 'hacker_ultimate') return;
        const rs = player.relicState;
        if (!rs || !rs.canFireUltimate || rs.skillFired) return;

        rs.skillFired = true;
        rs.portalActive = false;
        rs.isInPenetration = false;
        rs.canFireUltimate = false;

        ctx.log(`[黑客] ${player.name} 释放终极技能——全域渗透攻击！`, 'combat');

        // 通知前端播放全屏VFX
        ctx.emit('hacker_ultimate_vfx', { casterId: player.id });

        // 延迟300ms再结算伤害，给VFX动画时间
        setTimeout(() => {
            const otherPlayers = ctx.state.players.filter(p => !p.isDead && p.id !== player.id);
            otherPlayers.forEach(target => {
                ctx.applyDamage(player, target.id, 2, false);
                ctx.emit('vfx_trigger', { type: 'dmg', targetId: target.id, text: '-2', color: '#00ff00' });
                ctx.log(`[黑客] ${target.name} 受到 2 渗透伤害！`, 'combat');
            });

            player.hp = Math.min(player.maxHp, player.hp + 2);
            ctx.emit('vfx_trigger', { type: 'heal', targetId: player.id, text: '+2', color: '#00ff00' });
            ctx.log(`[黑客] ${player.name} 回复 2 生命值！渗透门户已失效。`, 'combat');
            ctx.syncRelicStates();
            ctx.emit('state_update', ctx.state);
        }, 300);
    }

    // 受到伤害：渗透状态下免伤扣值
    modifyIncomingDamage(target, attacker, damage, isNormal, ctx) {
        const rs = target.relicState;
        if (!rs || !rs.isInPenetration || !rs.portalActive || rs.skillFired) return damage;

        rs.penetrationValue -= damage;
        ctx.log(`[黑客] ${target.name} 渗透值吸收 ${damage} 伤害！剩余: ${Math.max(0, rs.penetrationValue)}`, 'combat');
        ctx.emit('vfx_trigger', { type: 'heal', targetId: target.id, text: `渗透抵消`, color: '#00ff00' });

        if (rs.penetrationValue <= 0) {
            rs.penetrationValue = 0;
            const hpLoss = Math.ceil(target.hp / 2);
            target.hp = Math.max(0, target.hp - hpLoss);

            // Fix 5: 渗透归零反噬VFX（绿色）
            ctx.emit('hacker_backlash_vfx', { targetId: target.id });
            ctx.emit('vfx_trigger', { type: 'dmg', targetId: target.id, text: `反噬-${hpLoss}`, color: '#00ff00' });
            ctx.log(`[黑客] ${target.name} 渗透值耗尽！反噬失去 ${hpLoss} 生命值！`, 'combat');

            rs.isInPenetration = false;

            if (target.hp === 0 && !target.isDead) {
                target.isDead = true;
                ctx.log(`>>> ${target.name} 被处决了! <<<`, 'system');
            }
        }

        return 0;
    }

    onTurnEnd(player, ctx) {
        // 大招已改为手动触发，不在回合结束自动释放
    }

    getCustomState(player) {
        return player.relicState || null;
    }

    _updatePenetrationStatus(player, ctx) {
        const rs = player.relicState;
        if (!rs || !rs.portalActive || rs.skillFired) return;

        const holdingPortal = player.hands.includes(2);
        const wasPenetrating = rs.isInPenetration;
        rs.isInPenetration = holdingPortal;

        if (holdingPortal && !wasPenetrating) {
            ctx.log(`[黑客] ${player.name} 进入渗透状态`, 'info');
        } else if (!holdingPortal && wasPenetrating) {
            ctx.log(`[黑客] ${player.name} 脱离渗透状态`, 'info');
        }
    }
}

registerRelic(new RelicHacker());
module.exports = RelicHacker;
