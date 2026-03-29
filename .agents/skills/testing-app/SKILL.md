# Testing the Tactical Arena App

## Local Setup

1. Install server dependencies: `npm install` (from repo root)
2. Install client dependencies: `cd client && npm install`
3. Start the server: `node server.js` (runs on port 3000 by default, configurable via PORT env var)
4. The server serves the built frontend from `client/dist/`

## Building the Frontend

- Source: `client/src/` (React + Vite)
- Build: `cd client && npx vite build`
- Output: `client/dist/`
- **IMPORTANT**: The server serves static files from `client/dist/`. Changes to `client/src/` files do NOT take effect until the frontend is rebuilt.
- If vite has permission issues, run `chmod +x client/node_modules/.bin/vite` first
- If rollup native module is missing, delete `client/node_modules` and `client/package-lock.json`, then run `npm install` again

## Dual Loot Pool Files

- Backend: `data/loot_pools.js` (CommonJS, used by server/GameEngine)
- Frontend: `client/src/loot_pools.js` (ES module, bundled into client)
- **Both files must be kept in sync manually** when adding new items (chips, frames, rings, etc.)
- After updating frontend loot_pools, you MUST rebuild the frontend for changes to appear

## Test Accounts

- User data is stored in `database.json` at repo root
- The database is a simple JSON file that persists across server restarts
- Test user: `bau` / password: `bau`

## Testing Relic/Module Features

1. Start the server
2. Log in at `http://localhost:3000`
3. Check mailbox (envelope icon in top-right header area) for module attachments
4. Claim attachments to add items to `economy.unlocks`
5. Open tactical modules screen (green CPU icon labeled "战术模块" in lobby)
6. Select and equip the module via "植入芯片" button
7. Create a game room to test battle mechanics

## Mail System

- Mail injection IIFEs in `server.js` run on server startup
- They use fixed mail IDs for idempotency (won't re-send if mail with same ID exists in inbox)
- If a user deletes a mail, the IIFE will re-inject it on next server restart
- Claiming mail attachments of type 'item' adds the item ID to `user.economy.unlocks`

## Key UI Navigation

- **Login**: Username + password fields, click "接入矩阵"
- **Mailbox**: Envelope icon in header (shows dot indicator for unread)
- **Tactical Modules**: Green CPU icon button labeled "战术模块" in lobby sidebar
- **Gacha/Warp**: Pink star icon button labeled "星空祈愿" in lobby sidebar
- **Settings**: Click on user avatar/name in header

## No CI

This repo has no CI pipeline. Verify code with `node -c <file>` syntax checks before committing.
