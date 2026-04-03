// ==========================================  
// client/src/relic-editor/blocks.js  
// Blockly 自定义积木块定义  
// 每个积木块对应 interpreter.js 中的一种 AST 节点  
// ==========================================  
import * as Blockly from 'blockly';
  
// ==========================================  
// 颜色常量（Blockly 使用 HSV 色相值 0~360）  
// ==========================================  
const COLOR = {  
    EVENT:    40,   // 琥珀色 — 事件/钩子  
    COMBAT:   0,    // 红色   — 战斗（伤害/治疗）  
    ACTION:  160,   // 青色   — 通用动作（日志/VFX/同步）  
    CONTROL: 120,   // 绿色   — 控制流（if/循环）  
    VALUE:   230,   // 靛蓝色 — 数值/运算  
    PROP:     60,   // 黄色   — 玩家属性读取  
    STATE:   290,   // 紫色   — 状态变量  
    LOGIC:   210,   // 蓝色   — 逻辑/比较  
    MATH:    230,   // 数学块
    SPECIAL: 280,   // 特殊值块
    VFX:     300    // 视觉效果块
};  
  
// ==========================================  
// 一、事件块（钩子入口）  
// 这些块是每个钩子的"帽子"，不能堆叠在其他块下面  
// ==========================================  
  
Blockly.Blocks['hook_onGameStart'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🎮 当游戏开始时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('游戏开始时对每个玩家调用一次，适合初始化属性和状态');  
        this.setHelpUrl('');  
        this.hat = 'cap';  // 帽子形状，不能接在其他块下面  
    }  
};  
  
Blockly.Blocks['hook_onTurnStart'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔄 当回合开始时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('每回合开始时对当前玩家调用');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_onHandChanged'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🃏 当手牌变化时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('手牌值变化后调用。可用 [变化的牌索引] 和 [新牌值] 获取信息');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_modifyActions'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('📋 当计算行动列表时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('引擎算完标准行动后调用，可以追加自定义技能按钮');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_modifyOutgoingDamage'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('⚔️ 当计算攻击伤害时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('攻击伤害计算前调用。用 [设置输出伤害] 块修改伤害值');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_modifyIncomingDamage'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🛡️ 当受到伤害时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('受到伤害前调用。用 [设置受到伤害] 块修改伤害值');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_onDamageDealt'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('💥 当伤害结算后');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('伤害结算完成后对攻击者调用。可用 [最终伤害] 获取实际伤害值');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_onTntDetonated'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('💣 当 TNT 引爆后');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('TNT 引爆结算后调用');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_modifyShield'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔰 当计算护盾时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('护盾状态更新时调用。用 [设置护盾] 块覆盖默认护盾逻辑');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_onTurnEnd'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('⏹️ 当回合结束时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('回合结束时对当前玩家调用');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_executeRelicAction'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('⭐ 当玩家使用技能')  
            .appendField(new Blockly.FieldTextInput('my_skill'), 'ACTION_ID')  
            .appendField('时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('玩家点击自定义技能按钮后调用。ACTION_ID 要和 [添加技能按钮] 里的 ID 一致');  
        this.hat = 'cap';  
    }  
};  
  
Blockly.Blocks['hook_modifyCrReward'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('💰 当计算 CR 奖励时');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.EVENT);  
        this.setTooltip('对局结算时调用。用 [设置CR倍率] 块修改奖励');  
        this.hat = 'cap';  
    }  
};  
  
// ==========================================  
// 二、战斗动作块  
// ==========================================  
  
Blockly.Blocks['action_apply_damage'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('⚔️ 对');  
        this.appendValueInput('TARGET')  
            .setCheck('Player');  
        this.appendDummyInput()  
            .appendField('造成');  
        this.appendValueInput('DAMAGE')  
            .setCheck('Number');  
        this.appendDummyInput()  
            .appendField('点')  
            .appendField(new Blockly.FieldDropdown([  
                ['特殊伤害（无视护盾）', 'false'],  
                ['普通伤害（受护盾减免）', 'true']  
            ]), 'IS_NORMAL');  
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.COMBAT);  
        this.setTooltip('通过引擎标准流程造成伤害（自动处理护盾、power、击杀判定等）');  
    }  
};  
  
Blockly.Blocks['action_heal'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('💚 治疗');  
        this.appendValueInput('WHO')  
            .setCheck('Player');  
        this.appendValueInput('AMOUNT')  
            .setCheck('Number');  
        this.appendDummyInput()  
            .appendField('点生命');  
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.COMBAT);  
        this.setTooltip('恢复生命值（不会超过最大生命值），并显示治疗飘字');  
    }  
};  
  
Blockly.Blocks['action_self_damage'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('💔 自身受到');  
        this.appendValueInput('AMOUNT')  
            .setCheck('Number');  
        this.appendDummyInput()  
            .appendField('点反噬伤害');  
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.COMBAT);  
        this.setTooltip('对自己造成伤害（不走攻击流程，直接扣血，会处理死亡判定）');  
    }  
};  
  
Blockly.Blocks['action_set_result_damage'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('📐 设置输出伤害为');  
        this.appendValueInput('VALUE')  
            .setCheck('Number');  
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.COMBAT);  
        this.setTooltip('在 [当计算攻击伤害时] 或 [当受到伤害时] 钩子中使用，修改最终伤害值');  
    }  
};  
  
Blockly.Blocks['action_temp_remove_power'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔒 临时移除 Power 状态');  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.COMBAT);  
        this.setTooltip('临时移除玩家的 power 状态，防止 applyDamage 自动翻倍。用完后记得 [恢复 Power 状态]');  
    }  
};  
  
Blockly.Blocks['action_restore_power'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔓 恢复 Power 状态');  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.COMBAT);  
        this.setTooltip('恢复之前临时移除的 power 状态');  
    }  
};  
  
// ==========================================  
// 三、通用动作块  
// ==========================================  
  
Blockly.Blocks['action_log'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('📝 发送日志');  
        this.appendValueInput('TEXT')  
            .setCheck('String');  
        this.appendDummyInput()  
            .appendField('类型')  
            .appendField(new Blockly.FieldDropdown([  
                ['普通 (info)', 'info'],  
                ['战斗 (combat)', 'combat'],  
                ['系统 (system)', 'system']  
            ]), 'TYPE');  // 👈 修复 1：把 'LOG_TYPE' 改成了 'TYPE' 以匹配 generator
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.ACTION);  
        this.setTooltip('在游戏日志中显示一条消息。支持 {playerName} 和 {targetName} 占位符');  
    }  
};  
  
Blockly.Blocks['action_emit_vfx'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('✨ 显示飘字')  
            .appendField(new Blockly.FieldDropdown([  
                ['伤害 (dmg)', 'dmg'],  
                ['治疗 (heal)', 'heal']  
            ]), 'VFX_TYPE')  
            .appendField('在');  
        this.appendValueInput('WHO')  // 👈 修复 2：把 'TARGET' 改成了 'WHO' 以匹配 generator
            .setCheck('Player');  
        this.appendDummyInput()  
            .appendField('文字')  
            .appendField(new Blockly.FieldTextInput('-1'), 'TEXT'); // 👈 修复 3：改成输入框以匹配 generator
        this.appendDummyInput()  
            .appendField('颜色')  
            .appendField(new Blockly.FieldDropdown([  // 👈 致命修复：不用 FieldColour，改用安全的下拉菜单
                ['粉色', '#ff007f'],  
                ['红色', '#ff0000'],  
                ['绿色', '#00ff00'],  
                ['青色', '#00f0ff'],  
                ['白色', '#ffffff']  
            ]), 'COLOR');  // 👈 修复 4：把 'COLOUR' 改成了 'COLOR' 以匹配 generator
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.ACTION);  
        this.setTooltip('在指定玩家头上显示飘字特效');  
    }  
};
  
Blockly.Blocks['action_sync_states'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔄 同步状态到前端');  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.ACTION);  
        this.setTooltip('将所有玩家的 relicState 同步给前端。修改状态变量后建议调用');  
    }  
};  
  
Blockly.Blocks['action_update_shield'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔰 更新');  
        this.appendValueInput('WHO')  
            .setCheck('Player');  
        this.appendDummyInput()  
            .appendField('的护盾状态');  
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.ACTION);  
        this.setTooltip('重新计算指定玩家的护盾状态');  
    }  
};  
  
Blockly.Blocks['action_add_skill'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('➕ 添加技能按钮');  
        this.appendDummyInput()  
            .appendField('  ID')  
            .appendField(new Blockly.FieldTextInput('my_skill'), 'ACTION_ID');  
        this.appendDummyInput()  
            .appendField('  名称')  
            .appendField(new Blockly.FieldTextInput('🔥 技能名'), 'ACTION_NAME');  
        this.appendDummyInput()  
            .appendField('  描述')  
            .appendField(new Blockly.FieldTextInput('技能效果描述'), 'ACTION_DESC');  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.ACTION);  
        this.setTooltip('在行动列表中添加一个自定义技能按钮。ID 要和 [当玩家使用技能] 里的 ID 一致');  
    }  
};  
  
Blockly.Blocks['action_set_shield'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔰 设置护盾为');  
        this.appendValueInput('VALUE')  
            .setCheck('Boolean');  
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.ACTION);  
        this.setTooltip('在 [当计算护盾时] 钩子中使用，覆盖默认护盾逻辑');  
    }  
};  
  
Blockly.Blocks['action_set_result_cr'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('💰 设置 CR 奖励为');  
        this.appendValueInput('VALUE')  
            .setCheck('Number');  
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.ACTION);  
        this.setTooltip('在 [当计算CR奖励时] 钩子中使用，修改最终 CR 奖励值');  
    }  
};  
  
Blockly.Blocks['action_set_player_prop'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('📝 设置');  
        this.appendValueInput('WHO')  
            .setCheck('Player');  
        this.appendDummyInput()  
            .appendField('的')  
            .appendField(new Blockly.FieldDropdown([  
                ['最大生命值 (maxHp)', 'maxHp'],  
                ['生命值 (hp)', 'hp'],  
                ['剑等级 (swordLevel)', 'swordLevel']  
            ]), 'PROP')  
            .appendField('为');  
        this.appendValueInput('VALUE')  
            .setCheck('Number');  
        this.setInputsInline(true);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setColour(COLOR.ACTION);  
        this.setTooltip('直接设置玩家属性值（谨慎使用，建议用 [治疗] 和 [自身反噬] 代替直接改 HP）');  
    }  
};  
  
// ==========================================  
// 四、控制流块  
// ==========================================  
  
Blockly.Blocks['control_if'] = {  
    init() {  
        this.appendValueInput('CONDITION')  
            .setCheck('Boolean')  
            .appendField('如果');  
        this.appendStatementInput('THEN')  
            .appendField('那么');  
        this.setColour(COLOR.CONTROL);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('条件判断：如果条件成立，执行"那么"里的内容');  
    }  
};  
  
Blockly.Blocks['control_if_else'] = {  
    init() {  
        this.appendValueInput('CONDITION')  
            .setCheck('Boolean')  
            .appendField('如果');  
        this.appendStatementInput('THEN')  
            .appendField('那么');  
        this.appendStatementInput('ELSE')  
            .appendField('否则');  
        this.setColour(COLOR.CONTROL);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('条件判断：如果条件成立执行"那么"，否则执行"否则"');  
    }  
};  
  
Blockly.Blocks['control_foreach_enemies'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔁 对每个存活的敌人');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.CONTROL);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('遍历所有存活的敌方玩家。循环体内用 [循环目标] 块引用当前遍历到的敌人');  
    }  
};  
  
Blockly.Blocks['control_foreach_alive'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔁 对每个存活的玩家（含自己）');  
        this.appendStatementInput('BODY')  
            .appendField('执行');  
        this.setColour(COLOR.CONTROL);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('遍历所有存活的玩家（包括自己）。循环体内用 [循环目标] 块引用当前遍历到的玩家');  
    }  
};  
  
// ==========================================  
// 五、玩家引用块（值块，输出 Player 类型）  
// ==========================================  
  
Blockly.Blocks['player_self'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('👤 自己');  
        this.setOutput(true, 'Player');  
        this.setColour(COLOR.PROP);  
        this.setTooltip('引用当前圣遗物的持有者');  
    }  
};  
  
Blockly.Blocks['player_target'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🎯 目标');  
        this.setOutput(true, 'Player');  
        this.setColour(COLOR.PROP);  
        this.setTooltip('引用当前钩子中的目标玩家（在伤害相关钩子中可用）');  
    }  
};  
  
Blockly.Blocks['player_loop_target'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🔄 循环目标');  
        this.setOutput(true, 'Player');  
        this.setColour(COLOR.PROP);  
        this.setTooltip('在 [对每个敌人] 或 [对每个玩家] 循环体内，引用当前遍历到的玩家');  
    }  
};  
  
// ==========================================  
// 六、玩家属性读取块（值块，输出 Number/Boolean）  
// ==========================================  
  
Blockly.Blocks['prop_number'] = {  
    init() {  
        this.appendValueInput('WHO')  
            .setCheck('Player');  
        this.appendDummyInput()  
            .appendField('的')  
            .appendField(new Blockly.FieldDropdown([  
                ['生命值 (hp)', 'hp'],  
                ['最大生命值 (maxHp)', 'maxHp'],  
                ['剑等级 (swordLevel)', 'swordLevel'],  
                ['第一张手牌 (hand0)', 'hand0'],  
                ['第二张手牌 (hand1)', 'hand1']  
            ]), 'PROP');  
        this.setInputsInline(true);  
        this.setOutput(true, 'Number');  
        this.setColour(COLOR.PROP);  
        this.setTooltip('读取玩家的数值属性');  
    }  
};  
  
Blockly.Blocks['prop_boolean'] = {  
    init() {  
        this.appendValueInput('WHO')  
            .setCheck('Player');  
        this.appendDummyInput()  
            .appendField('的')  
            .appendField(new Blockly.FieldDropdown([  
                ['有护盾？ (shield)', 'shield'],  
                ['有 Power？ (power)', 'power'],  
                ['已死亡？ (isDead)', 'isDead']  
            ]), 'PROP');  
        this.setInputsInline(true);  
        this.setOutput(true, 'Boolean');  
        this.setColour(COLOR.PROP);  
        this.setTooltip('读取玩家的布尔属性');  
    }  
};  
  
Blockly.Blocks['prop_hand_includes'] = {  
    init() {  
        this.appendValueInput('WHO')  
            .setCheck('Player');  
        this.appendDummyInput()  
            .appendField('的手牌包含');  
        this.appendValueInput('VALUE')  
            .setCheck('Number');  
        this.setInputsInline(true);  
        this.setOutput(true, 'Boolean');  
        this.setColour(COLOR.PROP);  
        this.setTooltip('检查玩家的手牌中是否包含指定数字');  
    }  
};  
  
// ==========================================  
// 七、状态变量块（读写 player.relicState）  
// ==========================================  
  
Blockly.Blocks['state_get'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('📦 状态变量')  
            .appendField(new Blockly.FieldTextInput('myVar'), 'KEY');  
        this.setOutput(true, null); // 可以是任意类型  
        this.setColour(COLOR.STATE);  
        this.setTooltip('读取 relicState 中的自定义变量值。变量名需要和 [设置状态变量] 中的一致');  
    }  
};  
  
Blockly.Blocks['state_set'] = {  
    init() {  
        this.appendValueInput('VALUE')  
            .appendField('📦 设置状态变量')  
            .appendField(new Blockly.FieldTextInput('myVar'), 'KEY')  
            .appendField('为');  
        this.setInputsInline(true);  
        this.setColour(COLOR.STATE);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('设置 relicState 中的自定义变量值。这个值会通过 getCustomState 同步到前端');  
    }  
};  
  
Blockly.Blocks['state_change'] = {  
    init() {  
        this.appendValueInput('DELTA')  
            .appendField('📦 状态变量')  
            .appendField(new Blockly.FieldTextInput('myVar'), 'KEY')  
            .appendField(new Blockly.FieldDropdown([  
                ['增加', 'add'],  
                ['减少', 'sub']  
            ]), 'OP');  
        this.setInputsInline(true);  
        this.setColour(COLOR.STATE);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('让状态变量增加或减少指定数值');  
    }  
};  
  
// ==========================================  
// 八、数学运算块  
// ==========================================  
  
Blockly.Blocks['math_number'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField(new Blockly.FieldNumber(0, -999, 999, 0.5), 'NUM');  
        this.setOutput(true, 'Number');  
        this.setColour(COLOR.MATH);  
        this.setTooltip('一个数字常量');  
    }  
};  
  
Blockly.Blocks['math_arithmetic'] = {  
    init() {  
        this.appendValueInput('A')  
            .setCheck('Number');  
        this.appendDummyInput()  
            .appendField(new Blockly.FieldDropdown([  
                ['+', 'add'],  
                ['−', 'sub'],  
                ['×', 'mul'],  
                ['÷', 'div'],  
                ['取余 %', 'mod']  
            ]), 'OP');  
        this.appendValueInput('B')  
            .setCheck('Number');  
        this.setInputsInline(true);  
        this.setOutput(true, 'Number');  
        this.setColour(COLOR.MATH);  
        this.setTooltip('两个数字的四则运算');  
    }  
};  
  
Blockly.Blocks['math_minmax'] = {  
    init() {  
        this.appendValueInput('A')  
            .setCheck('Number');  
        this.appendDummyInput()  
            .appendField('和');  
        this.appendValueInput('B')  
            .setCheck('Number');  
        this.appendDummyInput()  
            .appendField('中取')  
            .appendField(new Blockly.FieldDropdown([  
                ['较小值 (min)', 'min'],  
                ['较大值 (max)', 'max']  
            ]), 'FUNC');  
        this.setInputsInline(true);  
        this.setOutput(true, 'Number');  
        this.setColour(COLOR.MATH);  
        this.setTooltip('取两个数中的较大值或较小值');  
    }  
};  
  
Blockly.Blocks['math_round'] = {  
    init() {  
        this.appendValueInput('VALUE')  
            .setCheck('Number')  
            .appendField(new Blockly.FieldDropdown([  
                ['向下取整 (floor)', 'floor'],  
                ['向上取整 (ceil)', 'ceil'],  
                ['四舍五入 (round)', 'round']  
            ]), 'MODE');  
        this.setInputsInline(true);  
        this.setOutput(true, 'Number');  
        this.setColour(COLOR.MATH);  
        this.setTooltip('对数字进行取整操作');  
    }  
};  
  
// ==========================================  
// 九、比较与逻辑块  
// ==========================================  
  
Blockly.Blocks['logic_compare'] = {  
    init() {  
        this.appendValueInput('A');  
        this.appendDummyInput()  
            .appendField(new Blockly.FieldDropdown([  
                ['=', 'eq'],  
                ['≠', 'neq'],  
                ['>', 'gt'],  
                ['<', 'lt'],  
                ['≥', 'gte'],  
                ['≤', 'lte']  
            ]), 'OP');  
        this.appendValueInput('B');  
        this.setInputsInline(true);  
        this.setOutput(true, 'Boolean');  
        this.setColour(COLOR.LOGIC);  
        this.setTooltip('比较两个值的大小关系');  
    }  
};  
  
Blockly.Blocks['logic_operation'] = {  
    init() {  
        this.appendValueInput('A')  
            .setCheck('Boolean');  
        this.appendDummyInput()  
            .appendField(new Blockly.FieldDropdown([  
                ['并且 (AND)', 'and'],  
                ['或者 (OR)', 'or']  
            ]), 'OP');  
        this.appendValueInput('B')  
            .setCheck('Boolean');  
        this.setInputsInline(true);  
        this.setOutput(true, 'Boolean');  
        this.setColour(COLOR.LOGIC);  
        this.setTooltip('逻辑运算：两个条件同时成立 / 至少一个成立');  
    }  
};  
  
Blockly.Blocks['logic_not'] = {  
    init() {  
        this.appendValueInput('VALUE')  
            .setCheck('Boolean')  
            .appendField('取反 (NOT)');  
        this.setOutput(true, 'Boolean');  
        this.setColour(COLOR.LOGIC);  
        this.setTooltip('逻辑取反：成立变不成立，不成立变成立');  
    }  
};  
  
Blockly.Blocks['logic_boolean'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField(new Blockly.FieldDropdown([  
                ['✅ 成立 (true)', 'true'],  
                ['❌ 不成立 (false)', 'false']  
            ]), 'VALUE');  
        this.setOutput(true, 'Boolean');  
        this.setColour(COLOR.LOGIC);  
        this.setTooltip('布尔常量：成立或不成立');  
    }  
};  
  
// ==========================================  
// 十、特殊值块  
// ==========================================  
  
Blockly.Blocks['value_count_enemies'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('👥 存活敌人数量');  
        this.setOutput(true, 'Number');  
        this.setColour(COLOR.SPECIAL);  
        this.setTooltip('当前存活的敌方玩家数量（不含自己）');  
    }  
};  
  
Blockly.Blocks['value_count_alive'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('👥 存活玩家总数');  
        this.setOutput(true, 'Number');  
        this.setColour(COLOR.SPECIAL);  
        this.setTooltip('当前存活的所有玩家数量（含自己）');  
    }  
};  
  
Blockly.Blocks['value_random'] = {  
    init() {  
        this.appendValueInput('MIN')  
            .setCheck('Number')  
            .appendField('🎲 随机 从');  
        this.appendValueInput('MAX')  
            .setCheck('Number')  
            .appendField('到');  
        this.appendDummyInput()  
            .appendField('整数?')  
            .appendField(new Blockly.FieldDropdown([  
                ['✅ 是', 'TRUE'],  
                ['❌ 否', 'FALSE']  
            ]), 'INTEGER');  
        this.setInputsInline(true);  
        this.setOutput(true, 'Number');  
        this.setColour(COLOR.SPECIAL);  
        this.setTooltip('生成一个指定范围内的随机数');  
    }  
};
  
Blockly.Blocks['value_hook_param'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('📋 钩子参数')  
            .appendField(new Blockly.FieldDropdown([  
                ['基础伤害 (baseDmg)', 'baseDmg'],  
                ['行动ID (actionId)', 'actionId'],  
                ['最终伤害 (finalDmg)', 'finalDmg'],  
                ['是否普通攻击 (isNormal)', 'isNormal'],  
                ['变化的手牌索引 (handIdx)', 'handIdx'],  
                ['手牌新值 (newVal)', 'newVal'],  
                ['变化的手牌索引 (changedHandIdx)', 'changedHandIdx'],  
                ['基础CR (baseEarned)', 'baseEarned']  
            ]), 'NAME');  
        this.setOutput(true, null);  
        this.setColour(COLOR.SPECIAL);  
        this.setTooltip('读取当前钩子传入的参数值。不同钩子可用的参数不同');  
    }  
};  
  
Blockly.Blocks['value_text'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('📝 文本')  
            .appendField(new Blockly.FieldTextInput('你好'), 'TEXT');  
        this.setOutput(true, 'String');  
        this.setColour(COLOR.MATH);  
        this.setTooltip('一段文本。支持占位符：{playerName}=自己名字，{targetName}=目标名字，{relicName}=圣遗物名，{relicIcon}=圣遗物图标');  
    }  
};  
  
Blockly.Blocks['value_concat'] = {  
    init() {  
        this.appendValueInput('A')  
            .appendField('🔗 拼接');  
        this.appendValueInput('B')  
            .appendField('和');  
        this.setInputsInline(true);  
        this.setOutput(true, 'String');  
        this.setColour(COLOR.MATH);  
        this.setTooltip('将两个值拼接成一段文本');  
    }  
};  
  
// ==========================================  
// 十一、技能按钮与结果设置块  
// ==========================================  
  

  
Blockly.Blocks['action_set_result_damage'] = {  
    init() {  
        this.appendValueInput('VALUE')  
            .setCheck('Number')  
            .appendField('📊 设置结果伤害为');  
        this.setColour(COLOR.COMBAT);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('设置伤害修改钩子的返回值。仅在 [攻击伤害计算前] 和 [受到伤害前] 钩子中使用');  
    }  
};  
  
Blockly.Blocks['action_set_shield'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🛡️ 设置护盾结果为')  
            .appendField(new Blockly.FieldDropdown([  
                ['有护盾 (true)', 'true'],  
                ['无护盾 (false)', 'false']  
            ]), 'VALUE');  
        this.setColour(COLOR.COMBAT);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('设置护盾计算钩子的返回值。仅在 [护盾计算时] 钩子中使用');  
    }  
};  
  
Blockly.Blocks['action_set_result_cr'] = {  
    init() {  
        this.appendValueInput('VALUE')  
            .setCheck('Number')  
            .appendField('💰 设置CR奖励为');  
        this.setColour(COLOR.ACTION);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('设置CR奖励修改钩子的返回值。仅在 [对局结算CR时] 钩子中使用');  
    }  
};  
  
Blockly.Blocks['action_temp_remove_power'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('⚡ 临时移除 Power 状态');  
        this.setColour(COLOR.COMBAT);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('临时移除自己的 Power 状态（88组合加成），使接下来的 applyDamage 不会翻倍。用完后记得 [恢复 Power 状态]');  
    }  
};  
  
Blockly.Blocks['action_restore_power'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('⚡ 恢复 Power 状态');  
        this.setColour(COLOR.COMBAT);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('恢复之前被 [临时移除 Power 状态] 移除的 Power。必须和移除配对使用');  
    }  
};  
  
// ==========================================  
// 十二、玩家属性设置块  
// ==========================================  
  
Blockly.Blocks['set_prop_number'] = {  
    init() {  
        this.appendValueInput('WHO')  
            .setCheck('Player')  
            .appendField('✏️ 设置');  
        this.appendDummyInput()  
            .appendField('的')  
            .appendField(new Blockly.FieldDropdown([  
                ['生命值 (hp)', 'hp'],  
                ['最大生命值 (maxHp)', 'maxHp'],  
                ['剑等级 (swordLevel)', 'swordLevel']  
            ]), 'PROP')  
            .appendField('为');  
        this.appendValueInput('VALUE')  
            .setCheck('Number');  
        this.setInputsInline(true);  
        this.setColour(COLOR.PROP);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('直接设置玩家的数值属性。注意：HP 会被自动限制在 0~maxHp 范围内');  
    }  
};  
  
Blockly.Blocks['set_prop_boolean'] = {  
    init() {  
        this.appendValueInput('WHO')  
            .setCheck('Player')  
            .appendField('✏️ 设置');  
        this.appendDummyInput()  
            .appendField('的')  
            .appendField(new Blockly.FieldDropdown([  
                ['护盾 (shield)', 'shield'],  
                ['Power (power)', 'power'],  
                ['死亡 (isDead)', 'isDead']  
            ]), 'PROP')  
            .appendField('为')  
            .appendField(new Blockly.FieldDropdown([  
                ['✅ 是', 'true'],  
                ['❌ 否', 'false']  
            ]), 'VALUE');  
        this.setInputsInline(true);  
        this.setColour(COLOR.PROP);  
        this.setPreviousStatement(true, null);  
        this.setNextStatement(true, null);  
        this.setTooltip('设置玩家的布尔属性');  
    }  
};  
  
// ==========================================  
// 十三、VFX 预设块（前端视觉效果配置）  
// ==========================================  
  
Blockly.Blocks['vfx_glow'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('✨ 发光效果');  
        this.appendDummyInput()  
            .appendField('  颜色:')  
            .appendField(new Blockly.FieldDropdown([  
                ['红色', '#ff0000'],  
                ['橙色', '#ff6600'],  
                ['金色', '#ffd700'],  
                ['绿色', '#00ff00'],  
                ['青色', '#00f0ff'],  
                ['蓝色', '#0066ff'],  
                ['紫色', '#8a2be2'],  
                ['粉色', '#ff007f'],  
                ['白色', '#ffffff']  
            ]), 'COLOR');  
        this.appendDummyInput()  
            .appendField('  强度:')  
            .appendField(new Blockly.FieldDropdown([  
                ['弱', 'low'],  
                ['中', 'medium'],  
                ['强', 'high']  
            ]), 'INTENSITY');  
        this.appendDummyInput()  
            .appendField('  条件变量:')  
            .appendField(new Blockly.FieldTextInput('isActive'), 'CONDITION_VAR');  
        this.setColour(COLOR.VFX);  
        this.setPreviousStatement(true, 'VFX');  
        this.setNextStatement(true, 'VFX');  
        this.setTooltip('当指定的状态变量为 true 时，玩家头像周围显示发光效果');  
    }  
};  
  
Blockly.Blocks['vfx_particles'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🎆 粒子效果');  
        this.appendDummyInput()  
            .appendField('  Emoji:')  
            .appendField(new Blockly.FieldTextInput('🔥'), 'EMOJI');  
        this.appendDummyInput()  
            .appendField('  数量:')  
            .appendField(new Blockly.FieldNumber(5, 1, 12, 1), 'COUNT');  
        this.appendDummyInput()  
            .appendField('  动画:')  
            .appendField(new Blockly.FieldDropdown([  
                ['上浮消散', 'float'],  
                ['环绕旋转', 'orbit'],  
                ['脉冲闪烁', 'pulse'],  
                ['随机飘动', 'drift'],  
                ['向上喷射', 'fountain'],  
                ['摇摆', 'swing']  
            ]), 'ANIMATION');  
        this.appendDummyInput()  
            .appendField('  条件变量:')  
            .appendField(new Blockly.FieldTextInput('isActive'), 'CONDITION_VAR');  
        this.setColour(COLOR.VFX);  
        this.setPreviousStatement(true, 'VFX');  
        this.setNextStatement(true, 'VFX');  
        this.setTooltip('当指定的状态变量为 true 时，在玩家头像上显示 Emoji 粒子动画');  
    }  
};  
  
Blockly.Blocks['vfx_status_bar'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('📊 状态栏');  
        this.appendDummyInput()  
            .appendField('  显示文本:')  
            .appendField(new Blockly.FieldTextInput('🔥 能量: {energy}'), 'TEMPLATE');  
        this.appendDummyInput()  
            .appendField('  颜色:')  
            .appendField(new Blockly.FieldDropdown([  
                ['红色', 'red'],  
                ['橙色', 'orange'],  
                ['金色', 'yellow'],  
                ['绿色', 'green'],  
                ['青色', 'cyan'],  
                ['蓝色', 'blue'],  
                ['紫色', 'purple'],  
                ['粉色', 'pink']  
            ]), 'COLOR');  
        this.setColour(COLOR.VFX);  
        this.setPreviousStatement(true, 'VFX');  
        this.setNextStatement(true, 'VFX');  
        this.setTooltip('在玩家下方显示状态栏。文本中用 {变量名} 插入 relicState 中的值');  
    }  
};  
  
Blockly.Blocks['vfx_card_override'] = {  
    init() {  
        this.appendDummyInput()  
            .appendField('🃏 特殊卡牌');  
        this.appendDummyInput()  
            .appendField('  当手牌为:')  
            .appendField(new Blockly.FieldNumber(0, 0, 9, 1), 'HAND_VALUE');  
        this.appendDummyInput()  
            .appendField('  显示图标:')  
            .appendField(new Blockly.FieldTextInput('🔥'), 'ICON');  
        this.appendDummyInput()  
            .appendField('  显示名称:')  
            .appendField(new Blockly.FieldTextInput('特殊牌'), 'NAME');  
        this.appendDummyInput()  
            .appendField('  卡牌颜色:')  
            .appendField(new Blockly.FieldDropdown([  
                ['红色', 'red'],  
                ['橙色', 'orange'],  
                ['金色', 'yellow'],  
                ['绿色', 'green'],  
                ['青色', 'cyan'],  
                ['蓝色', 'blue'],  
                ['紫色', 'purple'],  
                ['粉色', 'pink']  
            ]), 'COLOR');  
        this.appendDummyInput()  
            .appendField('  条件变量:')  
            .appendField(new Blockly.FieldTextInput('isActive'), 'CONDITION_VAR');  
        this.setColour(COLOR.VFX);  
        this.setPreviousStatement(true, 'VFX');  
        this.setNextStatement(true, 'VFX');  
        this.setTooltip('当指定的状态变量为 true 时，将特定数字的手牌显示为特殊卡牌');  
    }  
};