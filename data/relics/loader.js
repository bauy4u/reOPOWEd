// 加载所有圣遗物（自动注册到 registry）
require('./relic_vampire');
require('./relic_heavy');
require('./relic_sniper');
require('./relic_medic');
require('./relic_fury');
require('./relic_assassin');
require('./relic_hacker');

// 导出注册表方法
const { getRelic, getAllRelics } = require('./index');
module.exports = { getRelic, getAllRelics };
