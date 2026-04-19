const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const RoomManager = require('./RoomManager');
const GameEngine = require('./GameEngine');
const LOOT_POOLS = require('./data/loot_pools');

// ==========================================
// 邮件工具函数
// ==========================================
function makeMailId() { return 'mail_' + Date.now() + '_' + Math.random().toString(36).substr(2,6); }

function createWelcomeMail() {
    return {
        id: makeMailId(),
        from: '一加一武器版 制作组',
        subject: '欢迎来到一加一武器版！',
        content: `亲爱的特工，

欢迎加入 一加一武器版！

这是一款由 bau 独立制作的战术数字对决游戏。在这里，你将通过加法运算操控手牌数值，以智取胜，以策略制人。

作为新特工的入职礼遇，我们为你准备了以下物资：

· 32,000 信用点（CR）—— 够你尽情探索深空祈愿了
· 传说背景 "狂乱视界" —— 让战场在混沌中燃烧
· 战术模块 "鹰眼准星" —— 远程精准打击，弓弩伤害+0.5

期待在竞技场见到你的身影。

—— bau / 一加一武器版 制作组`,
        time: Date.now(),
        read: false,
        attachments: [
            { type: 'credits', amount: 32000, name: '32,000 CR', icon: '💰', claimed: false },
            { type: 'item', id: 'bg_chaos', name: '狂乱视界', icon: '🌀', claimed: false },
            { type: 'item', id: 'chip_sniper', name: '鹰眼准星', icon: '🦅', claimed: false }
        ]
    };
}

const app = express();
app.use(cors());
app.use(express.json());

// 生产环境：服务 Vite 构建产物
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
}

// ==========================================
// 极简文件数据库引擎 (JSON Memory DB)
// ==========================================
const dbPath = path.join(__dirname, 'database.json');
let db = { users: {} };
if (fs.existsSync(dbPath)) {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}
const saveDb = () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

// ==========================================
// 一次性邮件投递（健儿模块测试）
// ==========================================
(function sendAthleteMailToBau() {
    const u = db.users['bau'];
    if (!u) return;
    if (!u.inbox) u.inbox = [];
    if (u.inbox.some(m => m.id === 'mail_athlete_module')) return;
    u.inbox.unshift({
        id: 'mail_athlete_module',
        from: '一加一武器版 制作组',
        subject: '新模块上线：健儿',
        content: `亲爱的特工，\n\n全新战术模块「健儿」已上线！\n\n效果：最大HP+50%，但所受伤害+100%，对局结算CR+100%。\n\n高风险、高回报——适合敢于冒险的战士。请查收附件中的模块。\n\n—— bau / 一加一武器版 制作组`,
        time: Date.now(),
        read: false,
        attachments: [
            { type: 'item', id: 'chip_athlete', name: '健儿', icon: '💪', claimed: false }
        ]
    });
    saveDb();
})();

// ==========================================
// HTTP API 鉴权层
// ==========================================
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (db.users[username]) return res.status(400).json({ error: '该代号已被占用' });

    const newUser = {
        username, password, id: 'u_' + Math.random().toString(36).substr(2, 9),
        stats: { wins: 0, matches: 0 }, quests: { kills: 0, matches: 0, dmg: 0 },
        economy: { credits: 200, unlocks: ['stars','grid','orbs','abstract','frame_default','card_default'] },
        gacha: { p4: 0, p5: 0 },
        settings: { bgTheme: 'stars', avatar: '', sfx: true, bgm: false, frame: 'frame_default', cardSkin: 'card_default', title: '', ring: 'ring_default', chip: '', signature: '' },
        friends: [], friendRequests: [], messages: {}, invites: [], status: 'lobby', recentPlayers: [],
        inbox: [createWelcomeMail()],
        customRelics: []     
    };
    db.users[username] = newUser; saveDb();
    res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.users[username];
    if (!user || user.password !== password) return res.status(401).json({ error: '密钥验证失败' });

    // 数据结构兼容升级
    if (!user.settings) user.settings = { bgTheme: 'stars', avatar: '', sfx: true, bgm: false, frame: 'frame_default', cardSkin: 'card_default', title:'', ring:'ring_default', chip: '', signature: '' };
    if (!user.economy) user.economy = { credits: 0, unlocks: ['stars','grid','orbs','abstract','frame_default','card_default'] };
    if (!user.quests) user.quests = { kills: 0, matches: 0, dmg: 0 };
    if (!user.gacha) user.gacha = { p4: 0, p5: 0 };
    if (!user.friends) user.friends = []; if(!user.friendRequests) user.friendRequests = []; if(!user.messages) user.messages = {}; if(!user.invites) user.invites = []; if(!user.recentPlayers) user.recentPlayers = [];
    if (!user.inbox) { user.inbox = [createWelcomeMail()]; } // 老账号补发欢迎信
    if (!user.customRelics) user.customRelics = [];
    user.status = 'lobby'; saveDb();

    res.json({ success: true, user });
});

// SPA fallback: 所有非API路由返回 index.html
app.get('*', (req, res) => {
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Client not built. Run: cd client && npm run build');
    }
});

// ==========================================
// Socket.io 核心网关与在线映射
// ==========================================
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const connectedUsers = {};
const roomManager = new RoomManager();
const gameEngine = new GameEngine(io, roomManager, connectedUsers, db, saveDb);

io.on('connection', (socket) => {
    console.log(`[CONNECT] 客户端已连接: ${socket.id}`);

    socket.on('authenticate', (username) => {
        if(db.users[username]) {
            socket.username = username;
            connectedUsers[username] = socket.id;
            db.users[username].status = 'lobby';
            saveDb();
            io.to(socket.id).emit('user_state_update', db.users[username]);
        }
    });

    // 匿名访客：不落库，仅在 socket 上留下 username 用作标识
    socket.on('authenticate_guest', (username) => {
        if (!username || typeof username !== 'string') return;
        // 防止与真实账号冲撞
        if (db.users[username]) return;
        socket.username = username;
        socket.isGuest = true;
    });

    // ==========================================
    // 资产与社交请求
    // ==========================================
    socket.on('get_profile', (targetName, callback) => {
        const u = db.users[targetName];
        if(!u) return callback(null);
        callback({ username: u.username, stats: u.stats, settings: u.settings, status: u.status, friends: u.friends });
    });

    socket.on('send_friend_req', (targetName) => {
        const me = db.users[socket.username]; const target = db.users[targetName];
        if(!me || !target || targetName === socket.username) return;
        if(!target.friendRequests.find(r => r.from === me.username)) {
            target.friendRequests.push({ from: me.username, time: Date.now() }); saveDb();
            if(connectedUsers[targetName]) io.to(connectedUsers[targetName]).emit('user_state_update', target);
            io.to(socket.id).emit('user_state_update', me);
        }
    });

    socket.on('accept_friend_req', (reqName) => {
        const me = db.users[socket.username]; const friend = db.users[reqName];
        if(!me || !friend) return;
        me.friendRequests = me.friendRequests.filter(r => r.from !== reqName);
        if(!me.friends.includes(reqName)) me.friends.push(reqName);
        if(!friend.friends.includes(me.username)) friend.friends.push(me.username);
        saveDb();
        io.to(socket.id).emit('user_state_update', me);
        if(connectedUsers[reqName]) io.to(connectedUsers[reqName]).emit('user_state_update', friend);
    });

    socket.on('remove_friend', (fName) => {
        const me = db.users[socket.username]; const friend = db.users[fName];
        if(!me || !friend) return;
        me.friends = me.friends.filter(f => f !== fName);
        friend.friends = friend.friends.filter(f => f !== me.username);
        saveDb();
        io.to(socket.id).emit('user_state_update', me);
        if(connectedUsers[fName]) io.to(connectedUsers[fName]).emit('user_state_update', friend);
    });

    socket.on('send_pm', (data) => {
        const { targetName, text } = data;
        const me = db.users[socket.username]; const target = db.users[targetName];
        if(!me || !target || !text.trim()) return;

        const msgObj = { from: me.username, text: text.trim(), time: new Date().toLocaleTimeString() };
        if(!me.messages[targetName]) me.messages[targetName] = []; me.messages[targetName].push(msgObj);
        if(!target.messages[me.username]) target.messages[me.username] = []; target.messages[me.username].push(msgObj);

        saveDb();
        io.to(socket.id).emit('user_state_update', me);
        if(connectedUsers[targetName]) io.to(connectedUsers[targetName]).emit('user_state_update', target);
    });

    socket.on('transfer_cr', (data, callback) => {
        const { targetName, amount } = data;
        const amt = parseInt(amount); if(isNaN(amt) || amt <= 0) return callback({ err: 'Invalid amount' });
        const me = db.users[socket.username]; const target = db.users[targetName];
        const tax = Math.ceil(amt * 0.1); const total = amt + tax;

        if(!me || !target || me.economy.credits < total) return callback({ err: 'Insufficient funds' });
        me.economy.credits -= total; target.economy.credits += amt;
        saveDb();
        io.to(socket.id).emit('user_state_update', me);
        if(connectedUsers[targetName]) io.to(connectedUsers[targetName]).emit('user_state_update', target);
        callback({ success: true });
    });

    socket.on('buy_item', (itemId, cost) => {
        const u = db.users[socket.username];
        if (!u || u.economy.credits < cost || u.economy.unlocks.includes(itemId)) return;
        u.economy.credits -= cost; u.economy.unlocks.push(itemId);
        saveDb(); io.to(socket.id).emit('user_state_update', u);
    });

    socket.on('update_settings', (newSettings, newPass, oldPass, callback) => {
        const u = db.users[socket.username]; if(!u) return;
        if(newPass && oldPass) {
            if(u.password !== oldPass) return callback({ err: 'Wrong old password' });
            u.password = newPass;
        }
        u.settings = { ...u.settings, ...newSettings };
        saveDb(); io.to(socket.id).emit('user_state_update', u); callback({ success: true });
    });

    socket.on('gacha_pull', (count, callback) => {
        const u = db.users[socket.username];
        const cost = count * 160;
        if (!u || u.economy.credits < cost) return callback({ err: 'CR 不足' });

        u.economy.credits -= cost;
        let p4 = u.gacha.p4 || 0; let p5 = u.gacha.p5 || 0;
        let results = []; let refund = 0;

        for(let i=0; i<count; i++) {
            p4++; p5++;
            let is5 = p5 >= 50 ? true : (Math.random() < 0.01);
            let is4 = !is5 && (p4 >= 10 ? true : (Math.random() < 0.15));
            if (is5) { p5 = 0; p4 = 0; } else if (is4) { p4 = 0; }

            let rarity = is5 ? 5 : (is4 ? 4 : 3);
            let pool = LOOT_POOLS[rarity]; let item = pool[Math.floor(Math.random()*pool.length)];

            let isDup = u.economy.unlocks.includes(item.id);
            if (isDup) { refund += (rarity===5 ? 800 : rarity===4 ? 200 : 30); }
            else { u.economy.unlocks.push(item.id); }
            results.push({...item, rarity, isDup});
        }
        u.economy.credits += refund; u.gacha = { p4, p5 };
        saveDb(); io.to(socket.id).emit('user_state_update', u);
        callback({ drops: results });
    });

    // ==========================================
    // 测试工具：直接解锁物品 / 加 CR
    // ==========================================
    socket.on('debug_unlock', (itemIds, callback) => {
        const u = db.users[socket.username];
        if (!u) return callback && callback({ err: 'Not authenticated' });
        const added = [];
        (Array.isArray(itemIds) ? itemIds : [itemIds]).forEach(id => {
            if (!u.economy.unlocks.includes(id)) {
                u.economy.unlocks.push(id);
                added.push(id);
            }
        });
        saveDb(); io.to(socket.id).emit('user_state_update', u);
        console.log(`[DEBUG] ${socket.username} unlocked: ${added.join(', ')}`);
        if (callback) callback({ success: true, added });
    });

    socket.on('debug_credits', (amount, callback) => {
        const u = db.users[socket.username];
        if (!u) return callback && callback({ err: 'Not authenticated' });
        u.economy.credits += (parseInt(amount) || 10000);
        saveDb(); io.to(socket.id).emit('user_state_update', u);
        console.log(`[DEBUG] ${socket.username} credits += ${amount}`);
        if (callback) callback({ success: true });
    });

    // ==========================================
    // 邮件系统事件
    // ==========================================
    socket.on('get_inbox', (callback) => {
        const u = db.users[socket.username];
        if (!u) return callback([]);
        if (!u.inbox) u.inbox = [];
        callback(u.inbox);
    });

    socket.on('mail_read', (mailId) => {
        const u = db.users[socket.username];
        if (!u || !u.inbox) return;
        const mail = u.inbox.find(m => m.id === mailId);
        if (mail) { mail.read = true; saveDb(); }
        io.to(socket.id).emit('user_state_update', u);
    });

    socket.on('claim_attachment', (mailId, attachIdx, callback) => {
        const u = db.users[socket.username];
        if (!u || !u.inbox) return callback({ err: '账号错误' });
        const mail = u.inbox.find(m => m.id === mailId);
        if (!mail) return callback({ err: '邮件不存在' });
        const att = mail.attachments[attachIdx];
        if (!att || att.claimed) return callback({ err: '附件已领取' });

        att.claimed = true;
        if (att.type === 'credits') {
            u.economy.credits += att.amount;
        } else if (att.type === 'item') {
            if (!u.economy.unlocks.includes(att.id)) {
                u.economy.unlocks.push(att.id);
            }
        }
        saveDb();
        io.to(socket.id).emit('user_state_update', u);
        callback({ success: true });
    });

    socket.on('claim_all_attachments', (mailId, callback) => {
        const u = db.users[socket.username];
        if (!u || !u.inbox) return callback({ err: '账号错误' });
        const mail = u.inbox.find(m => m.id === mailId);
        if (!mail) return callback({ err: '邮件不存在' });

        mail.attachments.forEach(att => {
            if (att.claimed) return;
            att.claimed = true;
            if (att.type === 'credits') {
                u.economy.credits += att.amount;
            } else if (att.type === 'item') {
                if (!u.economy.unlocks.includes(att.id)) u.economy.unlocks.push(att.id);
            }
        });
        saveDb();
        io.to(socket.id).emit('user_state_update', u);
        callback({ success: true });
    });

    socket.on('delete_mail', (mailId, callback) => {
        const u = db.users[socket.username];
        if (!u || !u.inbox) return;
        // 只允许删除附件全部领取或无附件的邮件
        const mail = u.inbox.find(m => m.id === mailId);
        if (mail && mail.attachments.some(a => !a.claimed)) {
            return callback && callback({ err: '请先领取所有附件' });
        }
        u.inbox = u.inbox.filter(m => m.id !== mailId);
        saveDb();
        io.to(socket.id).emit('user_state_update', u);
        if (callback) callback({ success: true });
    });

    socket.on('send_mail', (data, callback) => {
        const { targetName, subject, content, attachments } = data;
        const sender = db.users[socket.username];
        const target = db.users[targetName];
        if (!sender || !target) return callback && callback({ err: '目标玩家不存在' });
        if (!target.inbox) target.inbox = [];

        const mail = {
            id: makeMailId(),
            from: sender.username,
            subject: subject || '无标题',
            content: content || '',
            time: Date.now(),
            read: false,
            attachments: (attachments || []).map(a => ({ ...a, claimed: false }))
        };
        target.inbox.unshift(mail);
        saveDb();
        if (connectedUsers[targetName]) {
            io.to(connectedUsers[targetName]).emit('user_state_update', target);
            io.to(connectedUsers[targetName]).emit('new_mail', { from: sender.username, subject: mail.subject });
        }
        if (callback) callback({ success: true });
    });

    // ==========================================  
    // 圣遗物编辑器 API  
    // ==========================================  
  
    // 获取用户的自定义圣遗物列表  
    socket.on('relic:list', (data) => {  
        const u = db.users[socket.username];  
        if (!u) return;  
        if (!u.customRelics) u.customRelics = [];  
        socket.emit('relic:list', u.customRelics);  
    });  
  
    // 保存/更新自定义圣遗物  
    socket.on('relic:save', (data) => {  
        const u = db.users[socket.username];  
        if (!u) return socket.emit('relic:saved', { ok: false, error: '未登录' });  
        if (!u.customRelics) u.customRelics = [];  
  
        const { relic } = data;  
        if (!relic || !relic.id || !relic.config) {  
            return socket.emit('relic:saved', { ok: false, error: '数据无效' });  
        }  
  
        const MAX_CUSTOM_RELICS = 10;  
  
        // 查找是否已存在（按 id 更新）  
        const existIdx = u.customRelics.findIndex(r => r.id === relic.id);  
        if (existIdx >= 0) {  
            u.customRelics[existIdx] = relic;  
        } else {  
            if (u.customRelics.length >= MAX_CUSTOM_RELICS) {  
                return socket.emit('relic:saved', { ok: false, error: `最多保存 ${MAX_CUSTOM_RELICS} 个圣遗物` });  
            }  
            u.customRelics.push(relic);  
        }  
  
        saveDb();  
        socket.emit('relic:saved', { ok: true });  
    });  
  
    // 删除自定义圣遗物  
    socket.on('relic:delete', (data) => {  
        const u = db.users[socket.username];  
        if (!u || !u.customRelics) return;  
        const { relicId } = data;  
        u.customRelics = u.customRelics.filter(r => r.id !== relicId);  
        saveDb();  
        socket.emit('relic:deleted', { ok: true });  
    });

    // ==========================================
    // 大厅与房间系统事件
    // ==========================================
    socket.on('create_room', (data) => {
        const { user, max, hp, mode } = data;
        const room = roomManager.createRoom(user, max, hp, socket.id, mode);
        socket.join(room.id);
        socket.emit('room_created', room);
        io.emit('lobby_rooms_update', roomManager.getPublicRooms());
    });

    socket.on('join_room', (data) => {
        const { roomId, user } = data;
        const result = roomManager.joinRoom(roomId, user, socket.id);
        if (result.success) {
            socket.join(roomId);
            io.to(roomId).emit('room_state_update', result.room);
            io.emit('lobby_rooms_update', roomManager.getPublicRooms());
        } else {
            socket.emit('error_message', result.message);
        }
    });

    socket.on('leave_room', (roomId) => {
        const room = roomManager.leaveRoom(roomId, socket.id);
        socket.leave(roomId);
        if (room) {
            io.to(roomId).emit('room_state_update', room);
            io.to(roomId).emit('system_log', {text:`[系统] 玩家已撤离节点。`, type:'system'});
        }
        io.emit('lobby_rooms_update', roomManager.getPublicRooms());
    });

    socket.on('add_bot', (roomId) => {
        const room = roomManager.addBot(roomId);
        if (room) io.to(roomId).emit('room_state_update', room);
    });

    // ==========================================
    // 战斗流转与结算事件
    // ==========================================
    socket.on('start_game', (roomId) => {
        const room = roomManager.getRoom(roomId);
        if (!room || room.players.length < 2) return;
        gameEngine.startGame(room);

        room.players.forEach(p => {
            if(!p.isBot && db.users[p.username]) {
                db.users[p.username].status = 'in_game';
            }
        });
        saveDb();
    });

    socket.on('execute_math', (data) => gameEngine.executeMath(data.roomId, data.userId, data.myHandIdx, data.targetId, data.targetHandIdx));
    socket.on('execute_tnt', (data) => gameEngine.executeTnt(data.roomId, data.userId, data.targetId));
    socket.on('execute_action', (data) => gameEngine.executeAction(data.roomId, data.userId, data.action, data.targetId));
    socket.on('end_turn', (roomId) => gameEngine.endTurn(roomId));

    socket.on('chat_message', (data) => {
        const { roomId, username, text } = data;
        io.to(roomId).emit('chat_message_broadcast', { id: Date.now(), username, text, time: new Date().toLocaleTimeString(), type: 'chat' });
    });

    socket.on('disconnect', () => {
        console.log(`[DISCONNECT] 客户端断开: ${socket.id}`);
        if(socket.username && db.users[socket.username]) {
            db.users[socket.username].status = 'offline'; saveDb();
            delete connectedUsers[socket.username];
        }
        const roomsToUpdate = roomManager.handleDisconnect(socket.id);
        roomsToUpdate.forEach(roomId => {
            const room = roomManager.getRoom(roomId);
            if (room) io.to(roomId).emit('room_state_update', room);
        });
        io.emit('lobby_rooms_update', roomManager.getPublicRooms());
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`>>> TACTICAL_ARENA PHASE 2 SERVER ONLINE ON PORT ${PORT} <<<`);
});
