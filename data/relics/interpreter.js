// ==========================================  
// data/relics/interpreter.js  
// 圣遗物解释器 — 将 JSON AST 配置解释为可运行的 RelicBase 实例  
// ==========================================  
const { RelicBase } = require('./index');  
  
// 安全限制  
const MAX_LOOP_ITERATIONS = 20;  
const MAX_RECURSION_DEPTH = 30;  
const MAX_DAMAGE = 99;  
const MAX_HEAL = 99;  
const MAX_HP = 99;  
  
class RelicInterpreter extends RelicBase {  
    constructor(config) {  
        super(config.id, config.meta);  
        this.config = config;  
        this.varDefs = config.variables || [];  
    }  
  
    // ==========================================  
    // 状态初始化  
    // ==========================================  
    _initState(player) {  
        const rs = {};  
        this.varDefs.forEach(v => {  
            if (v.type === 'number') rs[v.name] = typeof v.default === 'number' ? v.default : 0;  
            else if (v.type === 'boolean') rs[v.name] = !!v.default;  
            else rs[v.name] = v.default || '';  
        });  
        player.relicState = rs;  
    }  
  
    // ==========================================  
    // 钩子实现  
    // ==========================================  
  
    onGameStart(player, ctx) {  
        this._initState(player);  
        this._exec(this.config.hooks?.onGameStart, player, null, ctx, {});  
    }  
  
    onTurnStart(player, ctx) {  
        this._exec(this.config.hooks?.onTurnStart, player, null, ctx, {});  
    }  
  
    onHandChanged(player, handIdx, newVal, ctx) {  
        this._exec(this.config.hooks?.onHandChanged, player, null, ctx, { handIdx, newVal });  
    }  
  
    modifyActions(player, actions, changedHandIdx, ctx) {  
        const locals = { actions, changedHandIdx };  
        this._exec(this.config.hooks?.modifyActions, player, null, ctx, locals);  
        return locals.actions;  
    }  
  
    executeRelicAction(player, action, ctx) {  
        const hookList = this.config.hooks?.executeRelicAction;  
        if (!hookList) return;  
        const entries = Array.isArray(hookList) ? hookList : [hookList];  
        for (const entry of entries) {  
            if (entry.actionId === action.id) {  
                this._exec(entry.body, player, null, ctx, { action });  
                break;  
            }  
        }  
    }  
  
    modifyOutgoingDamage(attacker, target, baseDmg, actionId, ctx) {  
        const locals = { baseDmg, actionId, resultDmg: baseDmg };  
        this._exec(this.config.hooks?.modifyOutgoingDamage, attacker, target, ctx, locals);  
        return this._clampNumber(locals.resultDmg, -MAX_DAMAGE, MAX_DAMAGE);  
    }  
  
    modifyIncomingDamage(target, attacker, damage, isNormal, ctx) {  
        const locals = { damage, isNormal, resultDmg: damage };  
        this._exec(this.config.hooks?.modifyIncomingDamage, target, attacker, ctx, locals);  
        return this._clampNumber(locals.resultDmg, 0, MAX_DAMAGE);  
    }  
  
    onDamageDealt(attacker, target, finalDmg, isNormal, ctx) {  
        this._exec(this.config.hooks?.onDamageDealt, attacker, target, ctx, { finalDmg, isNormal });  
    }  
  
    onTntDetonated(player, target, ctx) {  
        this._exec(this.config.hooks?.onTntDetonated, player, target, ctx, {});  
    }  
  
    modifyShield(player, defaultHasShield) {  
        const locals = { hasShield: defaultHasShield };  
        this._exec(this.config.hooks?.modifyShield, player, null, null, locals);  
        return !!locals.hasShield;  
    }  
  
    onTurnEnd(player, ctx) {  
        this._exec(this.config.hooks?.onTurnEnd, player, null, ctx, {});  
    }  
  
    modifyCrReward(player, baseEarned) {  
        const locals = { baseEarned, resultCr: baseEarned };  
        this._exec(this.config.hooks?.modifyCrReward, player, null, null, locals);  
        return this._clampNumber(locals.resultCr, 0, 9999);  
    }  
  
    getCustomState(player) {  
        if (!player.relicState) return null;  
        // 将 VFX 配置附加到 relicState，供前端动态渲染  
        return { ...player.relicState, _vfxConfig: this.config.vfx || [] };  
    }
  
    // ==========================================  
    // 执行引擎  
    // ==========================================  
  
    _exec(nodes, player, target, ctx, locals, depth = 0) {  
        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return null;  
        if (depth > MAX_RECURSION_DEPTH) return null;  
  
        for (const node of nodes) {  
            const signal = this._execNode(node, player, target, ctx, locals, depth);  
            if (signal && signal.type === 'break') return signal;  
        }  
        return null;  
    }  
  
    _execNode(node, player, target, ctx, locals, depth) {  
        if (!node || !node.type) return null;  
  
        switch (node.type) {  
            case 'if': {  
                const cond = !!this._evalValue(node.condition, player, target, ctx, locals, depth);  
                if (cond) {  
                    return this._exec(node.then, player, target, ctx, locals, depth + 1);  
                } else if (node.else) {  
                    return this._exec(node.else, player, target, ctx, locals, depth + 1);  
                }  
                return null;  
            }  
  
            case 'foreach_enemies': {  
                if (!ctx) return null;  
                const enemies = ctx.state.players.filter(p => !p.isDead && p.id !== player.id);  
                let count = 0;  
                for (const enemy of enemies) {  
                    if (++count > MAX_LOOP_ITERATIONS) break;  
                    locals._loopTarget = enemy;  
                    const signal = this._exec(node.body, player, enemy, ctx, locals, depth + 1);  
                    if (signal && signal.type === 'break') break;  
                }  
                locals._loopTarget = null;  
                return null;  
            }  
  
            case 'foreach_alive': {  
                if (!ctx) return null;  
                const players = ctx.state.players.filter(p => !p.isDead);  
                let count = 0;  
                for (const p of players) {  
                    if (++count > MAX_LOOP_ITERATIONS) break;  
                    locals._loopTarget = p;  
                    const signal = this._exec(node.body, player, p, ctx, locals, depth + 1);  
                    if (signal && signal.type === 'break') break;  
                }  
                locals._loopTarget = null;  
                return null;  
            }  
  
            case 'set_state': {  
                if (!player.relicState) player.relicState = {};  
                const key = String(node.key);  
                const val = this._evalValue(node.value, player, target, ctx, locals, depth);  
                player.relicState[key] = val;  
                return null;  
            }  
  
            case 'heal': {  
                const who = this._resolvePlayer(node.who || node.target, player, target, locals);  
                if (!who || who.isDead) return null;  
                const amount = this._clampNumber(  
                    this._evalValue(node.amount, player, target, ctx, locals, depth),  
                    0, MAX_HEAL  
                );  
                who.hp = Math.min(who.maxHp, who.hp + amount);  
                if (ctx) {  
                    ctx.emit('vfx_trigger', {  
                        type: 'heal', targetId: who.id,  
                        text: `+${amount}`, color: node.color || '#00ff00'  
                    });  
                }  
                return null;  
            }  
  
            case 'self_damage': {  
                const amount = this._clampNumber(  
                    this._evalValue(node.amount, player, target, ctx, locals, depth),  
                    0, MAX_DAMAGE  
                );  
                player.hp = Math.max(0, player.hp - amount);  
                if (ctx) {  
                    ctx.emit('vfx_trigger', {  
                        type: 'dmg', targetId: player.id,  
                        text: `-${amount}`, color: node.color || '#ff0000'  
                    });  
                }  
                if (player.hp === 0 && !player.isDead) {  
                    player.isDead = true;  
                    if (ctx) ctx.log(`>>> ${player.name} 被处决了! <<<`, 'system');  
                }  
                return null;  
            }  
  
            case 'apply_damage': {  
                if (!ctx) return null;  
                const dmgTarget = this._resolvePlayer(node.target, player, target, locals);  
                if (!dmgTarget || dmgTarget.isDead) return null;  
                const damage = this._clampNumber(  
                    this._evalValue(node.damage, player, target, ctx, locals, depth),  
                    0, MAX_DAMAGE  
                );  
                const isNormal = !!node.isNormal;  
                ctx.applyDamage(player, dmgTarget.id, damage, isNormal);  
                return null;  
            }  
  
            case 'set_player_prop': {  
                const who = this._resolvePlayer(node.who, player, target, locals);  
                if (!who) return null;  
                const prop = node.prop;  
                const val = this._evalValue(node.value, player, target, ctx, locals, depth);  
                if (prop === 'maxHp') {  
                    who.maxHp = this._clampNumber(val, 1, MAX_HP);  
                    who.hp = Math.min(who.hp, who.maxHp);  
                } else if (prop === 'hp') {  
                    who.hp = this._clampNumber(val, 0, who.maxHp);  
                } else if (prop === 'swordLevel') {  
                    who.swordLevel = this._clampNumber(val, 0, 9);  
                } else if (prop === 'shield') {  
                    who.shield = !!val;  
                } else if (prop === 'power') {  
                    who.power = !!val;  
                } else if (prop === 'isDead') {  
                    who.isDead = !!val;  
                }  
                return null;  
            }  
  
            case 'set_result_damage': {  
                locals.resultDmg = this._toNumber(this._evalValue(node.value, player, target, ctx, locals, depth));  
                return null;  
            }  
  
            case 'set_shield': {  
                locals.hasShield = !!this._evalValue(node.value, player, target, ctx, locals, depth);  
                return null;  
            }  
  
            case 'set_result_cr': {  
                locals.resultCr = this._toNumber(this._evalValue(node.value, player, target, ctx, locals, depth));  
                return null;  
            }  
  
            case 'add_action': {  
                if (!locals.actions) return null;  
                locals.actions.push({  
                    type: 'RELIC',  
                    id: String(node.actionId),  
                    name: String(node.actionName),  
                    desc: String(node.actionDesc)  
                });  
                return null;  
            }  
  
            case 'log': {  
                if (!ctx) return null;  
                const text = this._evalString(node.text, player, target, ctx, locals, depth);  
                ctx.log(text, node.logType || 'info');  
                return null;  
            }  
  
            case 'emit_vfx': {  
                if (!ctx) return null;  
                const vfxTarget = this._resolvePlayer(node.who || node.target, player, target, locals);  
                if (!vfxTarget) return null;  
                ctx.emit('vfx_trigger', {  
                    type: node.vfxType || 'dmg',  
                    targetId: vfxTarget.id,  
                    text: String(this._evalValue(node.text, player, target, ctx, locals, depth) || ''),  
                    color: node.color || '#ffffff'  
                });  
                return null;  
            }  
  
            case 'sync_states': {  
                if (ctx) ctx.syncRelicStates();  
                return null;  
            }  
  
            case 'update_shield': {  
                if (ctx) {  
                    const who = this._resolvePlayer(node.who, player, target, locals);  
                    if (who) ctx.updateShield(who);  
                }  
                return null;  
            }  
  
            case 'temp_remove_power': {  
                player._relicHadPower = !!player.power;  
                player.power = false;  
                return null;  
            }  
  
            case 'restore_power': {  
                if (player._relicHadPower !== undefined) {  
                    player.power = player._relicHadPower;  
                }  
                return null;  
            }  
  
            default: return null;  
        }  
    }  
  
    _evalValue(node, player, target, ctx, locals, depth) {  
        if (node === undefined || node === null) return 0;  
        if (depth > MAX_RECURSION_DEPTH) return 0;  
  
        if (typeof node === 'number' || typeof node === 'boolean' || typeof node === 'string') return node;  
        if (typeof node !== 'object' || !node.type) return 0;  
  
        switch (node.type) {  
            case 'literal': return node.value;  
  
            case 'player_ref': return this._resolvePlayer(node.ref, player, target, locals);  
  
            case 'player_prop': {  
                const who = this._resolvePlayer(node.who || node.target, player, target, locals);  
                if (!who) return 0;  
                return this._readPlayerProp(who, node.prop);  
            }  
  
            case 'state_var':  
                return player.relicState ? (player.relicState[node.key] ?? 0) : 0;  
  
            case 'local_var':  
                return locals[node.name || node.key] ?? 0;  
  
            case 'math_op': {  
                const a = this._toNumber(this._evalValue(node.a, player, target, ctx, locals, depth + 1));  
                const b = this._toNumber(this._evalValue(node.b, player, target, ctx, locals, depth + 1));  
                switch (node.op) {  
                    case 'add': return a + b;  
                    case 'sub': return a - b;  
                    case 'mul': return a * b;  
                    case 'div': return b !== 0 ? a / b : 0;  
                    case 'mod': return b !== 0 ? a % b : 0;  
                    case 'min': return Math.min(a, b);  
                    case 'max': return Math.max(a, b);  
                    // 🔧 修复: 补全缺失的取整运算符
                    case 'floor': return Math.floor(a);  
                    case 'ceil': return Math.ceil(a);  
                    case 'round': return Math.round(a);  
                    default: return 0;  
                }  
            }  
  
            case 'compare': {  
                const a = this._evalValue(node.a, player, target, ctx, locals, depth + 1);  
                const b = this._evalValue(node.b, player, target, ctx, locals, depth + 1);  
                switch (node.op) {  
                    case 'eq':  return a === b;  
                    case 'neq': return a !== b;  
                    case 'gt':  return this._toNumber(a) > this._toNumber(b);  
                    case 'lt':  return this._toNumber(a) < this._toNumber(b);  
                    case 'gte': return this._toNumber(a) >= this._toNumber(b);  
                    case 'lte': return this._toNumber(a) <= this._toNumber(b);  
                    default: return false;  
                }  
            }  
  
            case 'logic_op': {  
                const a = !!this._evalValue(node.a, player, target, ctx, locals, depth + 1);  
                if (node.op === 'and') return a && !!this._evalValue(node.b, player, target, ctx, locals, depth + 1);  
                if (node.op === 'or')  return a || !!this._evalValue(node.b, player, target, ctx, locals, depth + 1);  
                if (node.op === 'not') return !a;  
                return false;  
            }  
  
            case 'logic_not':  
                return !this._evalValue(node.value, player, target, ctx, locals, depth + 1);  
  
            case 'count_enemies':  
                return ctx ? ctx.state.players.filter(p => !p.isDead && p.id !== player.id).length : 0;  
  
            case 'count_alive':  
                return ctx ? ctx.state.players.filter(p => !p.isDead).length : 0;  
  
            case 'random': {  
                const min = this._toNumber(this._evalValue(node.min, player, target, ctx, locals, depth + 1));  
                const max = this._toNumber(this._evalValue(node.max, player, target, ctx, locals, depth + 1));  
                if (node.integer) return Math.floor(Math.random() * (max - min + 1)) + min;  
                return Math.random() * (max - min) + min;  
            }  
  
            case 'hand_includes': {  
                const who = this._resolvePlayer(node.who, player, target, locals);  
                if (!who || !who.hands) return false;  
                const val = this._toNumber(this._evalValue(node.value, player, target, ctx, locals, depth + 1));  
                return who.hands.includes(val);  
            }  
  
            case 'concat': {  
                const parts = (node.parts || []).map(p => String(this._evalValue(p, player, target, ctx, locals, depth + 1)));  
                return parts.join('');  
            }  
  
            default: return 0;  
        }  
    }  
  
    _resolvePlayer(ref, player, target, locals) {  
        if (!ref) return player;  
        if (typeof ref === 'object' && ref.type === 'player_ref') {  
            return this._resolvePlayer(ref.ref, player, target, locals);  
        }  
        switch (ref) {  
            case 'self':        return player;  
            case 'target':      return target;  
            case 'loop_target': return locals._loopTarget || target;  
            default:            return player;  
        }  
    }  
  
    _readPlayerProp(who, prop) {  
        switch (prop) {  
            case 'hp':         return who.hp;  
            case 'maxHp':      return who.maxHp;  
            case 'shield':     return !!who.shield;  
            case 'power':      return !!who.power;  
            case 'swordLevel': return who.swordLevel || 0;  
            case 'isDead':     return !!who.isDead;  
            case 'hand0':      return who.hands ? who.hands[0] : 0;  
            case 'hand1':      return who.hands ? who.hands[1] : 0;  
            default:           return 0;  
        }  
    }  
  
    _evalString(template, player, target, ctx, locals, depth) {  
        if (!template) return '';  
        const base = (typeof template === 'object')   
            ? String(this._evalValue(template, player, target, ctx, locals, depth))  
            : String(template);  
  
        return base  
            .replace(/\{playerName\}/g, player.name || '???')  
            .replace(/\{targetName\}/g, target ? (target.name || '???') : '???')  
            .replace(/\{relicName\}/g, this.meta.name || '???')  
            .replace(/\{relicIcon\}/g, this.meta.icon || '?');  
    }  
  
    _toNumber(val) {  
        if (typeof val === 'number') return isNaN(val) ? 0 : val;  
        if (typeof val === 'boolean') return val ? 1 : 0;  
        const n = Number(val);  
        return isNaN(n) ? 0 : n;  
    }  
  
    _clampNumber(val, min, max) {  
        const n = this._toNumber(val);  
        return Math.max(min, Math.min(max, n));  
    }  
}  
  
module.exports = { RelicInterpreter };