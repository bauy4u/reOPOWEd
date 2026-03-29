class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.socketToRoom = new Map();
    }

    // team: 2v2时按加入顺序分队，0,1号玩家=队伍0，2,3号=队伍1
    _getTeam(playerIndex, mode) {
        if (mode !== 'team') return 0;
        return playerIndex < 2 ? 0 : 1;
    }

    createRoom(user, max, hp, socketId, mode) {
        const roomId = 'RM-' + Math.floor(Math.random() * 10000);
        const m = mode || 'classic';
        const room = {
            id: roomId,
            name: `${user.username}'s Node`,
            max: max,
            hp: hp,
            mode: m,
            status: 'waiting',
            players: [{
                id: user.id,
                username: user.username,
                socketId: socketId,
                avatar: user.settings?.avatar,
                frame: user.settings?.frame || 'frame_default',
                cardSkin: user.settings?.cardSkin || 'card_default',
                title: user.settings?.title || '',
                ring: user.settings?.ring || 'ring_default',
                chip: user.settings?.chip || '',
                isBot: false,
                team: this._getTeam(0, m)
            }],
            gameState: null
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

        const idx = room.players.length;
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
            isBot: false,
            team: this._getTeam(idx, room.mode)
        });
        this.socketToRoom.set(socketId, roomId);
        return { success: true, room };
    }

    addBot(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.players.length >= room.max) return null;

        const idx = room.players.length;
        const bId = 'bot_' + Date.now();
        const botNames = ['AI_Ghost', 'AI_Specter', 'AI_Phantom', 'AI_Clone'];
        const botName = botNames[idx - 1] || 'AI_Clone';

        room.players.push({
            id: bId,
            username: botName,
            socketId: null,
            avatar: 'bot_avatar',
            frame: 'frame_default',
            cardSkin: 'card_default',
            title: '[AI_实体]',
            ring: 'ring_default',
            chip: '',
            isBot: true,
            team: this._getTeam(idx, room.mode)
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
                const gp = room.gameState.players.find(p => p.id === room.players[playerIndex].id);
                if (gp) gp.isDead = true;
            } else {
                room.players.splice(playerIndex, 1);
            }
            this.socketToRoom.delete(socketId);
        }

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
            id: r.id, name: r.name, max: r.max, hp: r.hp, mode: r.mode, status: r.status, players: r.players
        }));
    }
}

module.exports = RoomManager;
