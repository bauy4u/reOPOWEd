class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.socketToRoom = new Map(); // 追踪 socketId 对应的 roomId，用于断线重连
    }

    createRoom(user, max, hp, socketId) {
        const roomId = 'RM-' + Math.floor(Math.random() * 10000);
        // 初始化房间状态架构
        const room = {
            id: roomId,
            name: `${user.username}'s Node`,
            max: max,
            hp: hp,
            status: 'waiting', // waiting, playing, game_over
            players: [{
                id: user.id,
                username: user.username,
                socketId: socketId,
                // 从前端带过来的外观与芯片配置
                avatar: user.settings?.avatar,
                frame: user.settings?.frame || 'frame_default',
                cardSkin: user.settings?.cardSkin || 'card_default',
                title: user.settings?.title || '',
                ring: user.settings?.ring || 'ring_default',
                chip: user.settings?.chip || '',
                isBot: false
            }],
            gameState: null // 战斗引擎专属数据槽
        };
        this.rooms.set(roomId, room);
        this.socketToRoom.set(socketId, roomId);
        return room;
    }

    joinRoom(roomId, user, socketId) {
        const room = this.rooms.get(roomId);
        if (!room) return { success: false, message: '节点已失效' };
        if (room.status !== 'waiting') return { success: false, message: '战斗已开始，无法接入' };
        if (room.players.length >= room.max) return { success: false, message: '节点容量已满' };
        if (room.players.find(p => p.id === user.id)) return { success: true, room };

        room.players.push({
            id: user.id,
            username: user.username,
            socketId: socketId,
            avatar: user.settings?.avatar,
            frame: user.settings?.frame || 'frame_default',
            cardSkin: user.settings?.cardSkin || 'card_default',
            title: user.settings?.title || '',
            ring: user.settings?.ring || 'ring_default',
            chip: user.settings?.chip || '',
            isBot: false
        });
        this.socketToRoom.set(socketId, roomId);
        return { success: true, room };
    }

    addBot(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.players.length >= room.max) return null;

        const bId = 'bot_' + Date.now();
        const botNames = ['AI_Ghost', 'AI_Specter', 'AI_Phantom', 'AI_Clone'];
        const botName = botNames[room.players.length - 1] || 'AI_Clone';

        room.players.push({
            id: bId,
            username: botName,
            socketId: null, // Bot 没有 socketId
            avatar: 'bot_avatar',
            frame: 'frame_default',
            cardSkin: 'card_default',
            title: '[AI_实体]',
            ring: 'ring_default',
            chip: '', // 如果希望 bot 有芯片，可在此随机配置
            isBot: true
        });
        return room;
    }

    leaveRoom(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        const playerIndex = room.players.findIndex(p => p.socketId === socketId);
        if (playerIndex !== -1) {
            const isPlaying = room.status === 'playing';
            if (isPlaying) {
                // 战斗中退出：标记为死亡
                const gp = room.gameState.players.find(p => p.id === room.players[playerIndex].id);
                if (gp) gp.isDead = true;
            } else {
                room.players.splice(playerIndex, 1);
            }
            this.socketToRoom.delete(socketId);
        }

        // Fix 3: 无真人玩家时立即销毁房间
        const humanPlayers = room.players.filter(p => !p.isBot);
        if (humanPlayers.length === 0) {
            this.rooms.delete(roomId);
            return null;
        }
        return room;
    }

    handleDisconnect(socketId) {
        const roomId = this.socketToRoom.get(socketId);
        if (roomId) {
            this.leaveRoom(roomId, socketId);
            return [roomId];
        }
        return [];
    }

    getRoom(roomId) { return this.rooms.get(roomId); }
    getPublicRooms() {
        return Array.from(this.rooms.values()).map(r => ({
            id: r.id, name: r.name, max: r.max, hp: r.hp, status: r.status, players: r.players
        }));
    }
}

module.exports = RoomManager;