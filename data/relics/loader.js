// 加载所有内置圣遗物（自动注册到 registry）  
require('./relic_vampire');  
require('./relic_heavy');  
require('./relic_sniper');  
require('./relic_medic');  
require('./relic_fury');  
require('./relic_assassin');  
require('./relic_hacker');  
require('./relic_athlete');  
  
// 导出注册表方法  
const { getRelic, getAllRelics, registerRelic } = require('./index');  
const { RelicInterpreter } = require('./interpreter');  
  
/**  
 * 动态加载自定义圣遗物到 registry  
 * 在 GameEngine.startGame() 中、relic.onGameStart() 之前调用  
 *  
 * @param {Object} db - 数据库对象 (server.js 中的 db)  
 * @param {Array} players - room.players 数组  
 */  
function loadCustomRelics(db, players) {  
    for (const p of players) {  
        // 只处理以 custom_ 开头的 chip ID  
        if (!p.chip || !p.chip.startsWith('custom_')) continue;  
        // Bot 不会有自定义圣遗物  
        if (p.isBot) continue;  
        // 如果 registry 里已经有了（同一局复用），跳过  
        if (getRelic(p.chip)) continue;  
  
        // 通过 username 查找用户数据  
        const u = db.users[p.username];  
        if (!u || !u.customRelics) continue;  
  
        const saved = u.customRelics.find(r => r.id === p.chip);  
        if (!saved || !saved.config) continue;  
  
        try {  
            const instance = new RelicInterpreter({  
                id: saved.id,  
                meta: saved.config.meta || { name: '自定义', icon: '⚙️', desc: '' },  
                hooks: saved.config.hooks || {},  
                variables: saved.config.variables || [],  
                vfx: saved.config.vfx || []  
            });  
            registerRelic(instance);  
            console.log(`[RELIC] 已加载自定义圣遗物: ${saved.config.meta?.name || saved.id}`);  
        } catch (e) {  
            console.error(`[RELIC] 加载自定义圣遗物失败: ${p.chip}`, e);  
        }  
    }  
}  
  
module.exports = { getRelic, getAllRelics, loadCustomRelics };