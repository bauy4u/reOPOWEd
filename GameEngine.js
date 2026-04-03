const BotAI = require('./BotAI');
const { getRelic, loadCustomRelics } = require('./data/relics/loader');

const TURN_TIMEOUT_MS = 30000;

class GameEngine {
    constructor(io, roomManager, connectedUsers, db, saveDb) {
        this.io = io;
        this.roomManager = roomManager;
        this.connectedUsers = connectedUsers;
        this.db = db;
        this.saveDb = saveDb;
        this.botAI = new BotAI(this);
        this.turnTimers = {};
    }

    _makeCtx(roomId, state) {
        const self = this;
        return {
            io: this.io, roomId, state,
            emit: (event, data) => this.io.to(roomId).emit(event, data),
            log: (text, type) => this.io.to(roomId).emit('system_log', { text, type: type || 'info' }),
            applyDamage: (attacker, targetId, damage, isNormal) => self.applyDamage(roomId, attacker, targetId, damage, isNormal),
            updateShield: (player) => self._updateShield(player),
            syncRelicStates: () => self._syncRelicStates(state)
        };
    }

    _startTurnTimer(roomId) {
        this._clearTurnTimer(roomId);
        this.turnTimers[roomId] = setTimeout(() => {
            const room = this.roomManager.getRoom(roomId);
            if (!room || room.status !== 'playing') return;
            const player = room.gameState.players[room.gameState.turnIndex];
            if (player && !player.isBot) {
                this.io.to(roomId).emit('system_log', { text: `[系统] ${player.name} 超时，自动跳过回合。`, type: 'system' });
            }
            this.endTurn(roomId);
        }, TURN_TIMEOUT_MS);
    }

    _clearTurnTimer(roomId) {
        if (this.turnTimers[roomId]) { clearTimeout(this.turnTimers[roomId]); delete this.turnTimers[roomId]; }
    }

    isTeamMode(room) { return room.mode === 'team'; }

    sameTeam(a, b) { return a.team !== undefined && b.team !== undefined && a.team === b.team; }

    startGame(room) {
        room.status = 'playing';
        const initialHp = Number(room.hp) || 10;
        const isTeam = this.isTeamMode(room);

        room.gameState = {
            phase: 'SELECT_OWN',
            turnIndex: 0,
            turnStartAt: Date.now(),
            matchStats: {},
            mode: room.mode || 'classic',
            players: room.players.map((p, idx) => {
                const playerState = {
                    id: p.id, name: p.username,
                    hp: initialHp, maxHp: initialHp,
                    hands: [1, 1], shield: false, swordLevel: 1, power: false, isDead: false,
                    isBot: p.isBot, chip: p.chip, avatar: p.avatar, frame: p.frame,
                    ring: p.ring, title: p.title, cardSkin: p.cardSkin, relicState: null,
                    team: isTeam ? (idx < 2 ? 0 : 1) : 0
                };
                room.gameState = room.gameState || {};
                if (!room.gameState.matchStats) room.gameState.matchStats = {};
                room.gameState.matchStats[p.id] = { dmgDealt: 0, dmgTaken: 0, kills: 0 };
                return playerState;
            })
        };

        const ctx = this._makeCtx(room.id, room.gameState);  
        room.gameState.players.forEach(p => {  
            const relic = getRelic(p.chip);  
            // ★ 新增：将自定义圣遗物的 meta 附加到 player 对象，供前端显示  
            if (relic && p.chip?.startsWith('custom_')) {  
                p.relicMeta = relic.meta;  // { name, icon, desc }  
            }  
            if (relic) relic.onGameStart(p, ctx);  
            this._updateShield(p);  
        });

        this.io.to(room.id).emit('game_started', room);
        this.io.to(room.id).emit('system_log', { text: '>>> 竞技场初始化完毕。欧米茄协议生效。 <<<', type: 'system' });

        const firstPlayer = room.gameState.players[0];
        if (firstPlayer && !firstPlayer.isBot) this._startTurnTimer(room.id);
        this.checkBotTurn(room.id);
    }

    executeMath(roomId, userId, myHandIdx, targetId, targetHandIdx) {
        const room = this.roomManager.getRoom(roomId);
        if (!room || room.status !== 'playing') return;
        const state = room.gameState;

        const currentPlayer = state.players[state.turnIndex];
        if (currentPlayer.id !== userId && !currentPlayer.isBot) return;

        const targetP = state.players.find(p => p.id === targetId);
        if (!targetP) return;
        if (targetP.hands[targetHandIdx] === 0) return;
        // 团队模式不能加队友的牌（加自己的和加敌方的可以）
        if (this.isTeamMode(room) && this.sameTeam(currentPlayer, targetP) && targetP.id !== currentPlayer.id) return;

        this._clearTurnTimer(roomId);

        const myVal = currentPlayer.hands[myHandIdx];
        const targetVal = targetP.hands[targetHandIdx];
        const newVal = (myVal + targetVal) % 10;

        currentPlayer.hands[myHandIdx] = newVal;
        this._updateShield(currentPlayer);

        this.io.to(roomId).emit('system_log', { text: `${currentPlayer.name} 执行 [${myVal}]+[${targetVal}] -> [${newVal}]`, type: 'info' });

        const ctx = this._makeCtx(roomId, state);
        const relic = getRelic(currentPlayer.chip);

        if (newVal === 9) {
            currentPlayer.hp = Math.min(currentPlayer.maxHp, currentPlayer.hp + 1);
            this.io.to(roomId).emit('vfx_trigger', { type: 'heal', targetId: currentPlayer.id, text: '+1', color: '#00ff00' });
        }

        if (relic) relic.onHandChanged(currentPlayer, myHandIdx, newVal, ctx);

        this._syncRelicStates(state);
        this.io.to(roomId).emit('math_executed', { players: state.players });

        if (newVal === 0) {
            state.phase = 'SELECT_TNT_TARGET'; state.activeHandIdx = myHandIdx;
            this._syncRelicStates(state);
            this.io.to(roomId).emit('phase_changed', state);
        } else {
            const actions = this.evaluateActions(currentPlayer, myHandIdx, ctx, room, state);
            if (actions.length > 0) {
                state.phase = 'ACTION_MENU'; state.availableActions = actions; state.activeHandIdx = myHandIdx;
                this._syncRelicStates(state);
                this.io.to(roomId).emit('phase_changed', state);
            } else {
                this.endTurn(roomId);
            }
        }
    }

    executeTnt(roomId, userId, targetId) {
        const room = this.roomManager.getRoom(roomId);
        const state = room.gameState;
        const currentPlayer = state.players[state.turnIndex];
        const ctx = this._makeCtx(roomId, state);

        this._clearTurnTimer(roomId);

        // 团队模式不能炸队友
        const target = state.players.find(p => p.id === targetId);
        if (target && this.isTeamMode(room) && this.sameTeam(currentPlayer, target)) return;

        let dmg = 1.5;
        const relic = getRelic(currentPlayer.chip);
        if (relic) dmg = relic.modifyOutgoingDamage(currentPlayer, null, dmg, 'tnt', ctx);

        this.applyDamage(roomId, currentPlayer, targetId, dmg, false);

        if (relic) relic.onTntDetonated(currentPlayer, target, ctx);

        this._syncRelicStates(state);
        this.io.to(roomId).emit('tnt_executed', { players: state.players });

        setTimeout(() => {
            const actions = this.evaluateActions(currentPlayer, state.activeHandIdx, ctx, room, state);
            if (actions.length > 0) {
                state.phase = 'ACTION_MENU'; state.availableActions = actions;
                this._syncRelicStates(state);
                this.io.to(roomId).emit('phase_changed', state);
            } else { this.endTurn(roomId); }
        }, 500);
    }

    executeAction(roomId, userId, action, targetId) {
        const room = this.roomManager.getRoom(roomId);
        const state = room.gameState;
        const currentPlayer = state.players[state.turnIndex];
        const ctx = this._makeCtx(roomId, state);

        this._clearTurnTimer(roomId);

        if (action.type === 'COMBO') {
            // targetId 可以是队友（团队模式下 forge/power/heal 可指向队友）
            const target = targetId ? state.players.find(p => p.id === targetId) : currentPlayer;
            const applyTo = target || currentPlayer;

            if (action.id === 'forge') applyTo.swordLevel++;
            if (action.id === 'power') applyTo.power = true;
            if (action.id === 'heal') {
                applyTo.hp = Math.min(applyTo.maxHp, applyTo.hp + 2);
                this.io.to(roomId).emit('vfx_trigger', { type: 'heal', targetId: applyTo.id, text: '+2', color: '#00ff00' });
            }
            this.io.to(roomId).emit('system_log', { text: `[技能] ${currentPlayer.name} 对 ${applyTo.name} 发动了 ${action.name}!`, type: 'combat' });
            this.endTurn(roomId);

        } else if (action.type === 'ATTACK') {
            state.phase = 'ANIMATING';
            this._syncRelicStates(state);
            this.io.to(roomId).emit('phase_changed', state);

            let baseDmg = 0;
            const actionId = action.id;

            if (action.id === 'sword') {
                baseDmg = 0.5 + (currentPlayer.swordLevel - 1) * 0.5;
                this.io.to(roomId).emit('play_projectile', { attackerId: currentPlayer.id, targetId, type: 'sword' });
            } else if (action.id === 'bow' || action.id === 'crossbow_single') {
                baseDmg = 1;
                this.consumeArrows(currentPlayer, 1);
                this.io.to(roomId).emit('play_projectile', { attackerId: currentPlayer.id, targetId, type: 'arrow' });
            } else if (action.id === 'crossbow_double') {
                baseDmg = 2;
                this.consumeArrows(currentPlayer, 2);
                this.io.to(roomId).emit('play_projectile', { attackerId: currentPlayer.id, targetId, type: 'arrow' });
                setTimeout(() => this.io.to(roomId).emit('play_projectile', { attackerId: currentPlayer.id, targetId, type: 'arrow' }), 150);
            }

            const relic = getRelic(currentPlayer.chip);
            if (relic) baseDmg = relic.modifyOutgoingDamage(currentPlayer, state.players.find(p => p.id === targetId), baseDmg, actionId, ctx);

            setTimeout(() => {
                this.applyDamage(roomId, currentPlayer, targetId, baseDmg, true);
                this.endTurn(roomId);
            }, 500);

        } else if (action.type === 'RELIC') {
            const relic = getRelic(currentPlayer.chip);
            if (relic && relic.executeRelicAction) relic.executeRelicAction(currentPlayer, action, ctx);
            this.endTurn(roomId);
        }
    }

    evaluateActions(player, changedHandIdx, ctx, room, state) {
        const actions = [];
        const hStr = [...player.hands].sort().join(',');
        const isTeam = room && this.isTeamMode(room);

        // 获取存活队友
        const aliveAlly = isTeam && state
            ? state.players.find(p => !p.isDead && p.id !== player.id && this.sameTeam(player, p))
            : null;

        if (hStr === '4,5') {
            actions.push({ type: 'COMBO', id: 'forge', name: '锻造 (我的剑升1级)', targetId: null });
            if (aliveAlly) actions.push({ type: 'COMBO', id: 'forge', name: `锻造 (${aliveAlly.name}的剑升1级)`, targetId: aliveAlly.id });
        }
        if (hStr === '8,8') {
            actions.push({ type: 'COMBO', id: 'power', name: '力量过载 (我)', targetId: null });
            if (aliveAlly) actions.push({ type: 'COMBO', id: 'power', name: `力量过载 (${aliveAlly.name})`, targetId: aliveAlly.id });
        }
        if (hStr === '9,9') {
            actions.push({ type: 'COMBO', id: 'heal', name: '强效治疗 (我+2血)', targetId: null });
            if (aliveAlly) actions.push({ type: 'COMBO', id: 'heal', name: `强效治疗 (${aliveAlly.name}+2血)`, targetId: aliveAlly.id });
        }

        const hasBow = player.hands.includes(7);
        const hasCrossbow = player.hands.includes(8);
        const arrows = (player.hands.includes(3) ? 1 : 0) + (player.hands.includes(6) ? 2 : 0) + (player.hands[0] === 3 && player.hands[1] === 3 ? 1 : 0);

        if (hasBow && arrows >= 1) actions.push({ type: 'ATTACK', id: 'bow', name: '长弓射击', desc: '-1 Arrow, 1 DMG' });
        if (hasCrossbow) {
            if (arrows >= 2) actions.push({ type: 'ATTACK', id: 'crossbow_double', name: '重弩连射', desc: '-2 Arrows, 2 DMG' });
            else if (arrows >= 1) actions.push({ type: 'ATTACK', id: 'crossbow_single', name: '重弩单射', desc: '-1 Arrow, 1 DMG' });
        }

        if (changedHandIdx !== null && changedHandIdx !== undefined) {
            const changedVal = player.hands[changedHandIdx];
            if (changedVal === 5 && hStr !== '4,5') {
                const baseDmg = 0.5 + (player.swordLevel - 1) * 0.5;
                actions.push({ type: 'ATTACK', id: 'sword', name: '近战利刃', desc: `${baseDmg} DMG` });
            }
        }

        const relic = getRelic(player.chip);
        if (relic) return relic.modifyActions(player, actions, changedHandIdx, ctx);
        return actions;
    }

    applyDamage(roomId, attacker, targetId, damage, isNormal = true) {
        const room = this.roomManager.getRoom(roomId);
        const state = room.gameState;
        const target = state.players.find(p => p.id === targetId);
        const ctx = this._makeCtx(roomId, state);

        // 团队模式禁止伤害队友
        if (this.isTeamMode(room) && this.sameTeam(attacker, target)) return;

        let finalDmg = attacker.power ? damage * 2 : damage;
        if (isNormal && target.shield) finalDmg = Math.max(0, finalDmg - 0.5);

        const targetRelic = getRelic(target.chip);
        if (targetRelic) finalDmg = targetRelic.modifyIncomingDamage(target, attacker, finalDmg, isNormal, ctx);

        target.hp = Math.max(0, target.hp - finalDmg);

        let isKilled = false;
        if (target.hp === 0 && !target.isDead) {
            target.isDead = true; isKilled = true;
            this.io.to(roomId).emit('system_log', { text: `>>> ${target.name} 被处决了! <<<`, type: 'system' });
        }

        if (attacker.power) attacker.power = false;

        const attackerRelic = getRelic(attacker.chip);
        if (attackerRelic) attackerRelic.onDamageDealt(attacker, target, finalDmg, isNormal, ctx);

        if (!state.matchStats) state.matchStats = {};
        if (!state.matchStats[attacker.id]) state.matchStats[attacker.id] = { dmgDealt: 0, dmgTaken: 0, kills: 0 };
        if (!state.matchStats[target.id]) state.matchStats[target.id] = { dmgDealt: 0, dmgTaken: 0, kills: 0 };

        state.matchStats[attacker.id].dmgDealt += finalDmg;
        state.matchStats[target.id].dmgTaken += finalDmg;
        if (isKilled) state.matchStats[attacker.id].kills += 1;

        if (finalDmg > 0) this.io.to(roomId).emit('vfx_trigger', { type: 'dmg', targetId: target.id, text: `-${finalDmg}`, color: '#ff007f' });
        this.io.to(roomId).emit('system_log', { text: `[攻击] ${attacker.name} 对 ${target.name} 造成 ${finalDmg} 伤害。`, type: 'combat' });
        this._syncRelicStates(state);
        this.io.to(roomId).emit('state_update', state);
    }

    consumeArrows(player, count) {
        let toConsume = count;
        for (let i = 0; i < 2; i++) { if (toConsume >= 2 && player.hands[i] === 6) { player.hands[i] = 1; toConsume -= 2; } }
        for (let i = 0; i < 2; i++) { if (toConsume >= 1 && player.hands[i] === 3) { player.hands[i] = 1; toConsume -= 1; } }
    }

    _updateShield(player) {
        let hasShield = player.hands.includes(4);
        const relic = getRelic(player.chip);
        if (relic) hasShield = relic.modifyShield(player, hasShield);
        player.shield = hasShield;
    }

    _syncRelicStates(state) {
        state.players.forEach(p => {
            const relic = getRelic(p.chip);
            if (relic && relic.getCustomState) {
                p.relicState = relic.getCustomState(p);
            }
        });
    }

    endTurn(roomId) {
        this._clearTurnTimer(roomId);
        const room = this.roomManager.getRoom(roomId);
        if (!room || room.status !== 'playing') return;
        const state = room.gameState;
        const ctx = this._makeCtx(roomId, state);

        const currentPlayer = state.players[state.turnIndex];
        if (currentPlayer && !currentPlayer.isDead) {
            const relic = getRelic(currentPlayer.chip);
            if (relic) relic.onTurnEnd(currentPlayer, ctx);
        }

        // 胜负判断
        const alivePlayers = state.players.filter(p => !p.isDead);
        let gameOver = false;
        let winner = null;

        if (this.isTeamMode(room)) {
            const team0alive = alivePlayers.filter(p => p.team === 0);
            const team1alive = alivePlayers.filter(p => p.team === 1);
            if (team0alive.length === 0) { gameOver = true; winner = team1alive[0] || null; }
            else if (team1alive.length === 0) { gameOver = true; winner = team0alive[0] || null; }
        } else {
            if (alivePlayers.length <= 1) { gameOver = true; winner = alivePlayers[0] || null; }
        }

        if (gameOver) {
            this._endGame(room, roomId, state, winner);
            return;
        }

        let nextIdx = (state.turnIndex + 1) % state.players.length;
        let failsafe = 0;
        while (state.players[nextIdx].isDead && failsafe < 10) { nextIdx = (nextIdx + 1) % state.players.length; failsafe++; }

        state.turnIndex = nextIdx;
        state.phase = 'SELECT_OWN';
        state.availableActions = [];
        state.turnStartAt = Date.now();

        const nextPlayer = state.players[nextIdx];
        if (nextPlayer && !nextPlayer.isDead) {
            const nextRelic = getRelic(nextPlayer.chip);
            if (nextRelic) nextRelic.onTurnStart(nextPlayer, ctx);
            this._updateShield(nextPlayer);
        }

        this._syncRelicStates(state);
        this.io.to(roomId).emit('phase_changed', state);
        if (nextPlayer && !nextPlayer.isBot) this._startTurnTimer(roomId);
        this.checkBotTurn(roomId);
    }

    _endGame(room, roomId, state, winner) {
        this._clearTurnTimer(roomId);
        room.status = 'game_over';
        state.phase = 'GAME_OVER';

        const othersNames = room.players.filter(p => !p.isBot).map(p => p.username);
        room.players.forEach(p => {
            if (p.isBot) return;
            const u = this.db.users[p.username];
            if (!u) return;

            const isWin = this.isTeamMode(room)
                ? winner && state.players.find(gp => gp.id === p.id)?.team === winner.team
                : winner && winner.id === p.id;

            const myStats = state.matchStats[p.id] || { kills: 0, dmgDealt: 0 };
            let baseEarned = (isWin ? 100 : 30) + (myStats.kills * 20);
            const gp = state.players.find(gp => gp.id === p.id);
            if (gp) {
                const relic = getRelic(gp.chip);
                if (relic) baseEarned = relic.modifyCrReward(gp, baseEarned);
            }
            let qBonus = 0;

            u.status = 'lobby';
            u.stats.matches += 1;
            if (isWin) u.stats.wins += 1;
            u.recentPlayers = [...new Set([...othersNames.filter(n => n !== p.username), ...(u.recentPlayers || [])])].slice(0, 10);

            const q = u.quests;
            const oldK = q.kills; const oldM = q.matches; const oldD = q.dmg;
            q.kills += myStats.kills; q.matches += 1; q.dmg += myStats.dmgDealt;
            if (Math.floor(q.kills / 3) > Math.floor(oldK / 3)) qBonus += 50;
            if (Math.floor(q.matches / 5) > Math.floor(oldM / 5)) qBonus += 100;
            if (Math.floor(q.dmg / 20) > Math.floor(oldD / 20)) qBonus += 80;

            u.economy.credits += (baseEarned + qBonus);

            const sockId = this.connectedUsers[p.username];
            if (sockId) {
                this.io.to(sockId).emit('user_state_update', u);
                this.io.to(sockId).emit('quest_rewards', { base: baseEarned, bonus: qBonus });
            }
        });
        this.saveDb();

        this.io.to(roomId).emit('game_over_state', {
            winner, stats: state.matchStats, players: state.players
        });
    }

    checkBotTurn(roomId) {
        const room = this.roomManager.getRoom(roomId);
        if (!room) return;
        const state = room.gameState;
        const currentPlayer = state.players[state.turnIndex];
        if (currentPlayer && !currentPlayer.isDead && currentPlayer.isBot) {
            this.botAI.takeTurn(room, state, currentPlayer);
        }
    }
}

module.exports = GameEngine;
