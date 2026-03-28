import { io } from 'socket.io-client';

// 开发模式直连后端，避免 Vite WS proxy 的 ECONNRESET 问题
// 生产模式走同源（由后端 express.static 服务前端）
const SERVER_URL = import.meta.env.DEV
    ? 'http://localhost:3000'
    : window.location.origin;

const socket = io(SERVER_URL);

export default socket;
export { SERVER_URL };
