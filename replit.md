# K-12 Learning Portal

## Overview
A comprehensive K-12 learning portal featuring a chat system, game library, and educational resources. Built with Node.js, Express, Socket.io, and SQLite.

**Current State**: Imported from GitHub and configured for Replit environment (December 3, 2025)

## Recent Changes
- **2025-12-03**: Added comprehensive cosmetic shop system
  - 10 item categories: Themes, Profile Frames, Badges, Chat Bubbles, Sound Packs, Animated Avatars, Server Cosmetics, Status Effects, Bio Upgrades, Boosts
  - Virtual currency system with 100 starting coins for new users
  - Daily rewards with streak bonuses (+10% per day up to 7 days)
  - Purchase, equip/unequip functionality
  - Theme application changes CSS variables site-wide
  - Rarity system: Common, Uncommon, Rare, Epic, Legendary
  - Admin coin grant feature for rewards
  - Database tables: shop_categories, shop_items, user_purchases, user_equipped, coin_transactions, daily_rewards

- **2025-12-03**: Enhanced server invite system UX
  - Added "Create Invite" and "View Invites" options to server context menus
  - Added "Join" button in the servers sidebar for quick access
  - Created invite creation modal with expiry options (1h, 6h, 24h, 7d, never) and max uses (no limit, 1, 5, 10, 25, 50, 100)
  - Added invite preview feature showing server name, member count, and inviter when entering codes
  - Implemented proper debouncing and state management for invite previews
  - Added comprehensive error handling across all invite operations
  - View invites modal shows all active invites with copy/delete functionality
  
- **2025-12-03**: Initial Replit setup
  - Changed server port from 8080 to 5000 (required for Replit webview)
  - Created uploads directory structure
  - Added .gitignore for Node.js projects
  - Configured workflow to run server on port 5000

## Project Architecture

### Backend (Node.js + Express)
- **Main Server**: `backend/server.js` - Express server with Socket.io for real-time chat
- **Database**: SQLite using `better-sqlite3` (`chat.db`)
- **Port**: 5000 (binds to 0.0.0.0 for Replit compatibility)
- **Routes**:
  - `/api/users` - User authentication (signup/login)
  - `/api/auth`, `/api/servers`, `/api/messages` - Protected routes requiring auth token
  - `/api/admin` - Admin panel functionality
  - `/api/features`, `/api/friends`, `/api/blocks` - Social features
  - `/api/reactions`, `/api/pins`, `/api/invites` - Message features
  - `/api/search`, `/api/roles`, `/api/categories`, `/api/audit` - Additional features

### Frontend (Static HTML/CSS/JS)
- **Public Pages**: `frontend/public/index.html` - Landing page
- **Login**: `frontend/login.html` - Staff login page
- **Private Area**: `frontend/private/` - Dashboard and authenticated pages
- **Games**: `frontend/games/` and `frontend/games2/` - Large collection of educational games
- **Uploads**: `frontend/uploads/` - User-uploaded files (max 10MB)

### Database Schema
- **users** - User accounts with roles (admin, moderator, member, guest)
- **servers** - Chat servers (Discord-like)
- **channels** - Channels within servers
- **messages** - Messages with support for DMs, group chats, channels, global chat
- **friends** - Friend relationships
- **group_chats** - Group chat functionality
- **roles, badges, games** - Additional features

### Real-time Features (Socket.io)
- User online/offline status
- Live chat messages
- Typing indicators
- Message reactions
- Message editing and deletion
- @mentions with notifications
- Read receipts

## Default Admin Accounts
The database is pre-seeded with two admin accounts for initial setup:
- Username: `admin`
- Username: `Yusoff(ADMIN)`

**IMPORTANT SECURITY**: Default passwords are set in `backend/db.js` (lines 459-466). For production use, you should:
1. Change these passwords immediately after first login
2. Remove or update the default credentials in the database initialization code
3. Never commit default passwords to version control

## File Upload
- Max file size: 10MB
- Uploads stored in: `frontend/uploads/`
- Supported via multer middleware

## User Preferences
None specified yet.

## Dependencies
- express: Web server framework
- socket.io: Real-time bidirectional communication
- better-sqlite3: Fast SQLite database
- bcryptjs: Password hashing
- jsonwebtoken: JWT authentication
- multer: File upload handling
- cors: Cross-origin resource sharing

## Running the Project
The project runs automatically via Replit workflow:
- Command: `node backend/server.js`
- Port: 5000 (webview enabled)

### Environment Variables (Optional for Production)
For production deployments, consider setting:
- `JWT_SECRET` - Custom secret for JWT token signing (currently uses default in code)
- `PORT` - Server port (defaults to 5000)

### Security Considerations
- **CORS**: Currently set to allow all origins (`*`) for development. Restrict this for production.
- **Default Admins**: Pre-seeded admin accounts exist in the database. Change passwords immediately.
- **JWT Secret**: Consider using environment variable for production instead of hardcoded value.

## Deployment

### Replit Deployment (Recommended)
- **Deployment Type**: Autoscale (stateless web app)
- **Run Command**: `node backend/server.js`
- **Port**: 5000 (automatically configured)
- **Note**: SQLite database will reset on deployment restarts. For persistent data in production, consider migrating to PostgreSQL.

### Alternative: Render.com
- See `DEPLOY-RENDER.md` for Render deployment instructions
- Same considerations apply regarding database persistence

### First Run
- SQLite database file (`chat.db`) is created automatically on first run
- Database includes pre-seeded admin accounts, roles, categories, and badges
- Default admin credentials should be changed immediately for security
