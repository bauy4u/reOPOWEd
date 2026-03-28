class BotAI {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    takeTurn(room, state, botPlayer) {
        // 延迟模拟思考时间，防止客户端动画瞬间跳过
        setTimeout(() => {
            if (room.status !== 'playing') return;
            
            const aliveEnemies = state.players.filter(p => !p.isDead && p.id !== botPlayer.id);
            const validEnemies = aliveEnemies.filter(p => p.hands[0] !== 0 || p.hands[1] !== 0);
            
            if (validEnemies.length === 0) {
                this.gameEngine.endTurn(room.id);
                return;
            }

            // 根据机器人名字赋予基础性格
            let pType = 'random';
            if (botPlayer.name.includes('Ghost')) pType = 'berserker';
            else if (botPlayer.name.includes('Specter')) pType = 'defender';
            else if (botPlayer.name.includes('Phantom')) pType = 'calculator';

            let bestMove = null;
            let maxScore = -Infinity;

            // 遍历所有可能的加法组合
            [0, 1].forEach(myH => {
                validEnemies.forEach(enemy => {
                    [0, 1].forEach(eH => {
                        if (enemy.hands[eH] === 0) return; // 0不可被选中
                        
                        let newVal = (botPlayer.hands[myH] + enemy.hands[eH]) % 10;
                        let score = Math.random() * 5; // 基础随机权重，防止行为死板

                        // 狂战士喜欢炸弹和砍人
                        if (pType === 'berserker') { 
                            if (newVal === 0) score += 100; 
                            if (newVal === 5) score += 50; 
                        } 
                        // 防御者濒死时优先找奶和盾
                        else if (pType === 'defender') { 
                            if (botPlayer.hp < 5) { 
                                if (newVal === 9) score += 100; 
                                if (newVal === 4) score += 80; 
                            } else { 
                                if (newVal === 0) score += 50; 
                            } 
                        } 
                        // 计算者会评估对方血量和威胁
                        else if (pType === 'calculator') { 
                            score += (20 - enemy.hp) * 2; // 优先击杀低血量
                            if (enemy.hands.includes(7) || enemy.hands.includes(8)) score += 30; // 优先卸除对方重火力
                            if (newVal === 0) score += 60; 
                        }

                        if (score > maxScore) {
                            maxScore = score;
                            bestMove = { myH, tgtId: enemy.id, eH, newVal };
                        }
                    });
                });
            });

            if (!bestMove) {
                this.gameEngine.endTurn(room.id);
                return;
            }

            // 执行加法逻辑
            this.gameEngine.executeMath(room.id, botPlayer.id, bestMove.myH, bestMove.tgtId, bestMove.eH);
            
            // 在加法执行完成后，判断 AI 接下来的行动
            setTimeout(() => {
                if (room.status !== 'playing' || state.turnIndex !== state.players.findIndex(p => p.id === botPlayer.id)) return;
                
                // 如果刚刚凑出了炸弹(0)
                if (state.phase === 'SELECT_TNT_TARGET') {
                    // 找到当前血量最低的敌人炸
                    let targetToTnt = validEnemies[0];
                    validEnemies.forEach(e => { if (e.hp < targetToTnt.hp) targetToTnt = e; });
                    this.gameEngine.executeTnt(room.id, botPlayer.id, targetToTnt.id);
                } 
                // 如果可以执行动作 (例如 5, 或者合成了组合技)
                else if (state.phase === 'ACTION_MENU' && state.availableActions.length > 0) {
                    // 简单策略：优先选伤害最高的技能
                    const action = state.availableActions[0]; 
                    if (action.type === 'COMBO') {
                        this.gameEngine.executeAction(room.id, botPlayer.id, action, null);
                    } else if (action.type === 'ATTACK') {
                        let targetToAtk = validEnemies[0];
                        validEnemies.forEach(e => { if (e.hp < targetToAtk.hp) targetToAtk = e; });
                        this.gameEngine.executeAction(room.id, botPlayer.id, action, targetToAtk.id);
                    } else {
                        this.gameEngine.endTurn(room.id);
                    }
                }
            }, 800);

        }, 1500); // AI 思考时间 1.5s
    }
}

module.exports = BotAI;