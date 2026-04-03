// ==========================================  
// client/src/relic-editor/generator.js  
// Blockly 代码生成器 — 将积木块转换为 JSON AST  
//  
// 工作原理：  
//   Blockly 的 Generator 本质上是"把积木块翻译成字符串"。  
//   我们让每个积木块生成一段 JSON 字符串，最后拼成完整的配置对象。  
//  
//   - 值块（有输出接口的）：返回 [jsonString, ORDER_ATOMIC]  
//   - 语句块（可上下堆叠的）：返回 jsonString + ',\n'  
//   - 事件块（顶层钩子）：返回特殊格式，由 generateRelicConfig 收集  
// ==========================================  
  
import * as Blockly from 'blockly';
  
// ---- 运算优先级（JSON 不需要优先级，统一用 ATOMIC） ----  
const ORDER_ATOMIC = 0;  
  
// ---- 创建自定义生成器实例 ----  
const jsonGen = new Blockly.Generator('JSON_AST');  
jsonGen.ORDER_ATOMIC = ORDER_ATOMIC;  
  
// Blockly 要求定义 scrub_ 方法来处理语句块的串联  
jsonGen.scrub_ = function (block, code, thisOnly) {  
    const nextBlock = block.nextConnection && block.nextConnection.targetBlock();  
    if (nextBlock && !thisOnly) {  
        return code + jsonGen.blockToCode(nextBlock);  
    }  
    return code;  
};  
  
// ==========================================  
// 辅助函数  
// ==========================================  

/**
 * 字符串转义，防止破坏 JSON 格式
 */
function escStr(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
  
/** * 获取值输入的 JSON 字符串，如果未连接则返回默认值的 JSON  
 */  
function valCode(block, inputName, defaultValue) {  
    const code = jsonGen.valueToCode(block, inputName, ORDER_ATOMIC);  
    if (!code || code.trim() === '') {  
        return JSON.stringify(  
            typeof defaultValue === 'object' ? defaultValue : { type: 'literal', value: defaultValue }  
        );  
    }  
    return code;  
}  
  
/** * 收集语句输入中的所有语句块，返回 JSON 数组字符串  
 * 每个语句块生成 "{ ... },\n"，这里去掉末尾逗号并包裹为数组  
 */  
function stmtArray(block, inputName) {  
    const raw = jsonGen.statementToCode(block, inputName);  
    if (!raw || !raw.trim()) return '[]';  
    const trimmed = raw.trim().replace(/,\s*$/, '');  
    return `[${trimmed}]`;  
}  
  
// ==========================================  
// 一、事件块（顶层钩子）  
// 这些块不参与 scrub_ 串联，由 generateRelicConfig 单独收集  
// 返回格式：  $$HOOK:hookName:[ ...statements... ]$$  
// ==========================================  
  
const HOOK_BLOCKS = {  
    'hook_onGameStart':          'onGameStart',  
    'hook_onTurnStart':          'onTurnStart',  
    'hook_onHandChanged':        'onHandChanged',  
    'hook_modifyActions':        'modifyActions',  
    'hook_modifyOutgoingDamage': 'modifyOutgoingDamage',  
    'hook_modifyIncomingDamage': 'modifyIncomingDamage',  
    'hook_onDamageDealt':        'onDamageDealt',  
    'hook_onTntDetonated':       'onTntDetonated',  
    'hook_modifyShield':         'modifyShield',  
    'hook_onTurnEnd':            'onTurnEnd',  
};  
  
// 为所有普通钩子事件块注册生成器  
Object.entries(HOOK_BLOCKS).forEach(([blockType, hookName]) => {  
    jsonGen.forBlock[blockType] = function (block) {  
        const body = stmtArray(block, 'BODY');  
        return `$$HOOK:${hookName}:${body}$$\n`;  
    };  
});  
  
// executeRelicAction 特殊处理（需要 actionId）  
jsonGen.forBlock['hook_executeRelicAction'] = function (block) {  
    const actionId = block.getFieldValue('ACTION_ID') || 'my_skill';  
    const body = stmtArray(block, 'BODY');  
    return `$$RELIC_ACTION:${actionId}:${body}$$\n`;  
};  
  
// ==========================================  
// 二、VFX 预设块（顶层，由 generateRelicConfig 单独收集）  
// 返回格式：  $$VFX:type:{ ...config... }$$ 
// ==========================================  
  
jsonGen.forBlock['vfx_top_glow'] = function (block) {  
    const color = block.getFieldValue('COLOR') || 'cyan';  
    const intensity = block.getFieldValue('INTENSITY') || 'medium';  
    const condVar = block.getFieldValue('CONDITION_VAR') || 'isActive';  
    const config = JSON.stringify({ color, intensity, conditionVar: condVar });  
    return `$$VFX:glow:${config}$$\n`;  
};  
  
jsonGen.forBlock['vfx_top_particles'] = function (block) {  
    const emoji = block.getFieldValue('EMOJI') || '✨';  
    const count = block.getFieldValue('COUNT') || 5;  
    const animation = block.getFieldValue('ANIMATION') || 'float';  
    const condVar = block.getFieldValue('CONDITION_VAR') || 'isActive';  
    const config = JSON.stringify({ emoji, count, animation, conditionVar: condVar });  
    return `$$VFX:particles:${config}$$\n`;  
};  
  
jsonGen.forBlock['vfx_top_status_bar'] = function (block) {  
    const template = block.getFieldValue('TEMPLATE') || '';  
    const color = block.getFieldValue('COLOR') || 'cyan';  
    const config = JSON.stringify({ template, color });  
    return `$$VFX:statusBar:${config}$$\n`;  
};  
  
jsonGen.forBlock['vfx_top_card_override'] = function (block) {  
    const handValue = block.getFieldValue('HAND_VALUE') || 0;  
    const icon = block.getFieldValue('ICON') || '🔥';  
    const name = block.getFieldValue('NAME') || '特殊牌';  
    const color = block.getFieldValue('COLOR') || 'red';  
    const condVar = block.getFieldValue('CONDITION_VAR') || 'isActive';  
    const config = JSON.stringify({ handValue, icon, name, color, conditionVar: condVar });  
    return `$$VFX:cardOverride:${config}$$\n`;  
};  
  
// ==========================================  
// 三、动作块（语句块，返回 JSON + 逗号）  
// ==========================================  
  
jsonGen.forBlock['action_heal'] = function (block) {  
    const who = valCode(block, 'WHO', { type: 'player_ref', ref: 'self' });  
    const amount = valCode(block, 'AMOUNT', 1);  
    const node = `{"type":"heal","who":${who},"amount":${amount}}`;  
    return node + ',\n';  
};  
  
jsonGen.forBlock['action_self_damage'] = function (block) {  
    const amount = valCode(block, 'AMOUNT', 1);  
    const node = `{"type":"self_damage","amount":${amount}}`;  
    return node + ',\n';  
};  
  
jsonGen.forBlock['action_apply_damage'] = function (block) {  
    const target = valCode(block, 'TARGET', { type: 'player_ref', ref: 'target' });  
    const damage = valCode(block, 'DAMAGE', 1);  
    // 🔧 修复 Bug 11: 下拉菜单的值是小写 'true'/'false'
    const isNormal = block.getFieldValue('IS_NORMAL') === 'true';  
    const node = `{"type":"apply_damage","target":${target},"damage":${damage},"isNormal":${isNormal}}`;  
    return node + ',\n';  
};  
  
jsonGen.forBlock['action_sync_states'] = function () {  
    return '{"type":"sync_states"},\n';  
};  
  
jsonGen.forBlock['action_update_shield'] = function (block) {  
    // 🔧 修复: 之前忽略了 block 参数并且没有读取 WHO 输入
    const who = valCode(block, 'WHO', { type: 'player_ref', ref: 'self' });
    return `{"type":"update_shield","who":${who}},\n`;  
};  
  
// ==========================================  
// 四、日志与特效块  
// ==========================================  
  
jsonGen.forBlock['action_log'] = function (block) {  
    const text = valCode(block, 'TEXT', '');  
    const logType = block.getFieldValue('TYPE') || 'info';  
    const node = `{"type":"log","text":${text},"logType":"${logType}"}`;  
    return node + ',\n';  
};  
  
jsonGen.forBlock['action_emit_vfx'] = function (block) {  
    const who = valCode(block, 'WHO', { type: 'player_ref', ref: 'self' });  
    const text = block.getFieldValue('TEXT') || '-1';  
    const color = block.getFieldValue('COLOR') || '#ff007f';  
    const vfxType = block.getFieldValue('VFX_TYPE') || 'dmg';  
    const node = `{"type":"emit_vfx","who":${who},"text":"${escStr(text)}","color":"${escStr(color)}","vfxType":"${vfxType}"}`;  
    return node + ',\n';  
};  
  
// ==========================================  
// 五、控制块  
// ==========================================  
  
jsonGen.forBlock['control_if'] = function (block) {    
    const condition = valCode(block, 'CONDITION', { type: 'literal', value: true });    
    const thenBody = stmtArray(block, 'THEN');    
    const node = `{"type":"if","condition":${condition},"then":${thenBody},"else":[]}`;    
    return node + ',\n';    
};
  
// 🔧 修复: 添加漏掉的 control_if_else，它的逻辑和 control_if 一致（Blockly 的机制也是提取同样的输入）
jsonGen.forBlock['control_if_else'] = function (block) {  
    const condition = valCode(block, 'CONDITION', { type: 'literal', value: true });  
    const thenBody = stmtArray(block, 'THEN');  
    const elseBody = stmtArray(block, 'ELSE');  
    const node = `{"type":"if","condition":${condition},"then":${thenBody},"else":${elseBody}}`;  
    return node + ',\n';  
};  
  
jsonGen.forBlock['control_foreach_enemies'] = function (block) {  
    const body = stmtArray(block, 'BODY');  
    const node = `{"type":"foreach_enemies","body":${body}}`;  
    return node + ',\n';  
};  
  
jsonGen.forBlock['control_foreach_alive'] = function (block) {  
    const body = stmtArray(block, 'BODY');  
    const node = `{"type":"foreach_alive","body":${body}}`;  
    return node + ',\n';  
};  
  
// ==========================================  
// 六、玩家引用块（值块）  
// ==========================================  
  
jsonGen.forBlock['player_self'] = function () {  
    return ['{"type":"player_ref","ref":"self"}', ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['player_target'] = function () {  
    return ['{"type":"player_ref","ref":"target"}', ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['player_loop_target'] = function () {  
    return ['{"type":"player_ref","ref":"loop_target"}', ORDER_ATOMIC];  
};  
  
// ==========================================  
// 七、玩家属性读取块（值块）  
// ==========================================  
  
jsonGen.forBlock['prop_number'] = function (block) {  
    const who = valCode(block, 'WHO', { type: 'player_ref', ref: 'self' });  
    const prop = block.getFieldValue('PROP') || 'hp';  
    return [`{"type":"player_prop","who":${who},"prop":"${prop}"}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['prop_boolean'] = function (block) {  
    const who = valCode(block, 'WHO', { type: 'player_ref', ref: 'self' });  
    const prop = block.getFieldValue('PROP') || 'shield';  
    return [`{"type":"player_prop","who":${who},"prop":"${prop}"}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['prop_hand_includes'] = function (block) {  
    const who = valCode(block, 'WHO', { type: 'player_ref', ref: 'self' });  
    const value = valCode(block, 'VALUE', 0);  
    return [`{"type":"hand_includes","who":${who},"value":${value}}`, ORDER_ATOMIC];  
};  
  
// ==========================================  
// 八、状态变量块  
// ==========================================  
  
jsonGen.forBlock['state_get'] = function (block) {  
    const key = block.getFieldValue('KEY') || 'myVar';  
    return [`{"type":"state_var","key":"${escStr(key)}"}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['state_set'] = function (block) {  
    const key = block.getFieldValue('KEY') || 'myVar';  
    const value = valCode(block, 'VALUE', 0);  
    const node = `{"type":"set_state","key":"${escStr(key)}","value":${value}}`;  
    return node + ',\n';  
};  
  
jsonGen.forBlock['state_change'] = function (block) {  
    const key = block.getFieldValue('KEY') || 'myVar';  
    const op = block.getFieldValue('OP') || 'add';  
    const delta = valCode(block, 'DELTA', 1);  
    const mathOp = op === 'sub' ? 'sub' : 'add';  
    const node = `{"type":"set_state","key":"${escStr(key)}","value":{"type":"math_op","op":"${mathOp}","a":{"type":"state_var","key":"${escStr(key)}"},"b":${delta}}}`;  
    return node + ',\n';  
};  
  
// ==========================================  
// 九、数学运算块（值块）  
// ==========================================  
  
jsonGen.forBlock['math_number'] = function (block) {  
    const num = block.getFieldValue('NUM') || 0;  
    return [`{"type":"literal","value":${num}}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['math_arithmetic'] = function (block) {  
    const a = valCode(block, 'A', 0);  
    const op = block.getFieldValue('OP') || 'add';  
    const b = valCode(block, 'B', 0);  
    return [`{"type":"math_op","op":"${op}","a":${a},"b":${b}}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['math_minmax'] = function (block) {  
    // 🔧 修复: 字段名为 'FUNC'
    const op = block.getFieldValue('FUNC') || 'min';  
    const a = valCode(block, 'A', 0);  
    const b = valCode(block, 'B', 0);  
    return [`{"type":"math_op","op":"${op}","a":${a},"b":${b}}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['math_round'] = function (block) {  
    // 🔧 修复: 字段名为 'MODE'
    const op = block.getFieldValue('MODE') || 'floor';  
    const value = valCode(block, 'VALUE', 0);  
    return [`{"type":"math_op","op":"${op}","a":${value},"b":{"type":"literal","value":0}}`, ORDER_ATOMIC];  
};  
  
// ==========================================  
// 十、比较与逻辑块（值块）  
// ==========================================  
  
jsonGen.forBlock['logic_compare'] = function (block) {  
    const a = valCode(block, 'A', 0);  
    const op = block.getFieldValue('OP') || 'eq';  
    const b = valCode(block, 'B', 0);  
    return [`{"type":"compare","op":"${op}","a":${a},"b":${b}}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['logic_operation'] = function (block) {  
    const a = valCode(block, 'A', { type: 'literal', value: true });  
    const op = block.getFieldValue('OP') || 'and';  
    const b = valCode(block, 'B', { type: 'literal', value: true });  
    return [`{"type":"logic_op","op":"${op}","a":${a},"b":${b}}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['logic_not'] = function (block) {  
    const value = valCode(block, 'VALUE', { type: 'literal', value: false });  
    return [`{"type":"logic_not","value":${value}}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['logic_boolean'] = function (block) {  
    // 🔧 修复: 字段名改为 'VALUE'，判定改为小写 'true'
    const val = block.getFieldValue('VALUE') === 'true';  
    return [`{"type":"literal","value":${val}}`, ORDER_ATOMIC];  
};  
  
// ==========================================  
// 十一、特殊值块  
// ==========================================  
  
jsonGen.forBlock['value_count_enemies'] = function () {  
    return ['{"type":"count_enemies"}', ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['value_count_alive'] = function () {  
    return ['{"type":"count_alive"}', ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['value_random'] = function (block) {  
    const min = valCode(block, 'MIN', 0);  
    const max = valCode(block, 'MAX', 1);  
    const integer = block.getFieldValue('INTEGER') === 'TRUE';  // 这里因为之前发你的积木改的是 'TRUE' 所以保持兼容，不需要动
    return [`{"type":"random","min":${min},"max":${max},"integer":${integer}}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['value_hook_param'] = function (block) {  
    // 🔧 修复: 字段名改为 'NAME'
    const param = block.getFieldValue('NAME') || 'baseDmg';  
    return [`{"type":"local_var","name":"${param}"}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['value_text'] = function (block) {  
    const text = block.getFieldValue('TEXT') || '';  
    return [`{"type":"literal","value":"${escStr(text)}"}`, ORDER_ATOMIC];  
};  
  
jsonGen.forBlock['value_concat'] = function (block) {  
    const a = valCode(block, 'A', '""');  
    const b = valCode(block, 'B', '""');  
    return [`{"type":"concat","parts":[${a},${b}]}`, ORDER_ATOMIC];  
};  
  
// ==========================================  
// 十二、技能按钮与结果设置块（语句块）  
// ==========================================  
  
jsonGen.forBlock['action_add_skill'] = function (block) {  
    const actionId = block.getFieldValue('ACTION_ID') || 'my_skill';  
    const actionName = block.getFieldValue('ACTION_NAME') || '技能';  
    const actionDesc = block.getFieldValue('ACTION_DESC') || '';  
    return `{"type":"add_action","actionId":"${escStr(actionId)}","actionName":"${escStr(actionName)}","actionDesc":"${escStr(actionDesc)}"},\n`;  
};  
  
jsonGen.forBlock['action_set_result_damage'] = function (block) {  
    const value = valCode(block, 'VALUE', 0);  
    return `{"type":"set_result_damage","value":${value}},\n`;  
};  
  
jsonGen.forBlock['action_set_shield'] = function (block) {  
    // 🔧 修复: 判定改为小写 'true'
    const value = block.getFieldValue('VALUE') === 'true';  
    return `{"type":"set_shield","value":{"type":"literal","value":${value}}},\n`;  
};  
  
jsonGen.forBlock['action_set_result_cr'] = function (block) {  
    const value = valCode(block, 'VALUE', 0);  
    return `{"type":"set_result_cr","value":${value}},\n`;  
};  
  
jsonGen.forBlock['action_temp_remove_power'] = function () {  
    return '{"type":"temp_remove_power"},\n';  
};  
  
jsonGen.forBlock['action_restore_power'] = function () {  
    return '{"type":"restore_power"},\n';  
};  
  
// ==========================================  
// 十三、玩家属性设置块（语句块）  
// ==========================================  
  
jsonGen.forBlock['set_prop_number'] = function (block) {  
    const who = valCode(block, 'WHO', { type: 'player_ref', ref: 'self' });  
    const prop = block.getFieldValue('PROP') || 'hp';  
    const value = valCode(block, 'VALUE', 0);  
    return `{"type":"set_player_prop","who":${who},"prop":"${prop}","value":${value}},\n`;  
};  
  
jsonGen.forBlock['set_prop_boolean'] = function (block) {  
    const who = valCode(block, 'WHO', { type: 'player_ref', ref: 'self' });  
    const prop = block.getFieldValue('PROP') || 'shield';  
    // 🔧 修复: 判定改为小写 'true'
    const value = block.getFieldValue('VALUE') === 'true';  
    return `{"type":"set_player_prop","who":${who},"prop":"${prop}","value":{"type":"literal","value":${value}}},\n`;  
};  
  
// ==========================================  
// 十四、VFX 预设块（语句块，用于 VFX 配置区域）  
// ==========================================  
  
// VFX 块比较特殊：它们不生成运行时 AST 节点，  
// 而是生成 vfx 配置对象，由编辑器单独收集。  
// 这里生成的 JSON 会被 buildConfig() 放入 config.vfx 数组中。  
  
jsonGen.forBlock['vfx_glow'] = function (block) {  
    const color = block.getFieldValue('COLOR') || 'cyan';  
    const intensity = block.getFieldValue('INTENSITY') || 'medium';  
    const condVar = block.getFieldValue('CONDITION_VAR') || '';  
    return `{"vfxType":"glow","color":"${escStr(color)}","intensity":"${escStr(intensity)}","conditionVar":"${escStr(condVar)}"},\n`;  
};  
  
jsonGen.forBlock['vfx_particles'] = function (block) {  
    const emoji = block.getFieldValue('EMOJI') || '✨';  
    const count = block.getFieldValue('COUNT') || 5;  
    const animation = block.getFieldValue('ANIMATION') || 'float';  
    const condVar = block.getFieldValue('CONDITION_VAR') || '';  
    return `{"vfxType":"particles","emoji":"${escStr(emoji)}","count":${count},"animation":"${escStr(animation)}","conditionVar":"${escStr(condVar)}"},\n`;  
};  
  
jsonGen.forBlock['vfx_status_bar'] = function (block) {  
    const template = block.getFieldValue('TEMPLATE') || '';  
    const color = block.getFieldValue('COLOR') || 'cyan';  
    return `{"vfxType":"statusBar","template":"${escStr(template)}","color":"${escStr(color)}"},\n`;  
};  
  
jsonGen.forBlock['vfx_card_override'] = function (block) {  
    const handValue = block.getFieldValue('HAND_VALUE') || 0;  
    const icon = block.getFieldValue('ICON') || '🔥';  
    const name = block.getFieldValue('NAME') || '特殊牌';  
    const color = block.getFieldValue('COLOR') || 'red';  
    const condVar = block.getFieldValue('CONDITION_VAR') || '';  
    return `{"vfxType":"cardOverride","handValue":${handValue},"icon":"${escStr(icon)}","name":"${escStr(name)}","color":"${escStr(color)}","conditionVar":"${escStr(condVar)}"},\n`;  
};  
  
// ==========================================  
// 导出  
// ==========================================  
  
export { jsonGen };