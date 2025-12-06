# K-12 Learning Portal

## Overview
A comprehensive K-12 learning portal featuring a chat system, game library, and educational resources. Built with Node.js, Express, Socket.io, and PostgreSQL.

**Current State**: Migrated to PostgreSQL for persistent data storage (December 3, 2025)

## Recent Changes
- **2025-12-06**: Gamification System Implementation
  - **XP & Leveling**: Users earn XP from activities (messages +5, games +20, logins +10, friends +15)
  - **Level Progression**: XP formula uses level^2 * 100 for increasing thresholds
  - **22 Achievements**: Across 5 categories (Social, Activity, Communication, Exploration, Special)
  - **Global Leaderboards**: Rankings by total XP, messages, games played, and login streaks
  - **Activity Status**: Shows what users are doing (playing games, browsing, chatting)
  - **Task System**: Personal to-do list with priorities, due dates, and completion XP
  - **Cross-Server Announcements**: Admin broadcasts displayed on dashboard with dismiss option
  - New pages: `/private/stats.html` (XP/achievements/leaderboards), `/private/tasks.html`
  - New dashboard cards: "Stats & Achievements" and "My Tasks"
  - New routes: `/api/xp`, `/api/activity`, `/api/tasks`, `/api/announcements`
  - Database tables: user_xp, user_achievements, achievements, user_activity, tasks, announcements

- **2025-12-06**: Enhanced Friend Management & Invite System
  - Friend context menu with right-click or options button (⋮)
  - Friend actions: View Profile, Send Message, Ignore, Be Invisible, Block, Unfriend
  - Ignore: Hide friend from DM list while keeping friendship
  - Be Invisible: Appear offline to specific friend
  - Direct invite friends to servers and group chats via modal UI
  - Server options now include "Invite Friends" (option 6 for owners, 2 for members)
  - Group chat options include "Invite Friends" option
  - New database columns: friends.invisible, friends.ignored
  - New API endpoints: POST /api/friends/:id/invisible, /api/friends/:id/ignore
  - New invite endpoints: POST /api/invites/server/:id/direct/:userId, POST /api/invites/group/:id/add/:userId
  - Friends-to-invite endpoints: GET /api/invites/friends-to-invite/server/:id, GET /api/invites/friends-to-invite/group/:id

- **2025-12-06**: Implemented Discord-Style Permission System
  - Channel-level permission overrides for roles and users
  - Permission hierarchy: User overrides > Channel role overrides > Server role permissions > Defaults
  - Deny-over-allow precedence across all roles (any deny blocks the permission)
  - 15 permission types: view_channel, send_messages, send_files, add_reactions, mention_everyone, delete_messages, pin_messages, manage_channel, manage_permissions, mute_members, kick_members, ban_members, manage_roles, manage_server, create_invites
  - Permission management UI in channel settings (🔐 button)
  - Real-time permission checks on socket.io join_channel and send_message events
  - Database table: channel_permissions (channel_id, target_type, target_id, permission, value)
  - New files: backend/permissions.js, backend/routes/permissions.js, frontend/js/permissions.js

- **2025-12-05**: Fixed Web Proxy System
  - Removed problematic Scramjet proxy (BareMux issues in Replit environment)
  - Ultraviolet proxy now the recommended default option
  - Server-side proxy fallback for maximum compatibility
  - Added auto-login: users stay logged in across visits
  - Fake staff login page at `/public/staff-login.html` (secret gateway with admin/0000P)

- **2025-12-05**: Redesigned Public Landing Page
  - Professional, official-looking design with institutional branding
  - Added stock images of students and teachers
  - Top bar with contact info and portal access
  - Hero section with "Now Enrolling" badge and compelling headline
  - Statistics section (15,000+ students, 850+ teachers, 98% graduation rate)
  - About section with features and establishment badge
  - Academic programs grid (6 programs with icons)
  - Testimonials section with 3 parent/educator reviews
  - Call-to-action section with image
  - Contact information section
  - Professional footer with navigation, social links, and accreditation badges
  - Images stored in `/public/images/`

- **2025-12-05**: Added Theme System with 36 Themes
  - Comprehensive theming with CSS variables (`/css/private-theme.css`)
  - Theme selector modal with visual previews
  - Theme button added to all major pages (dashboard, games, movies, chat, shop, proxy)
  - Themes persist via localStorage
  - Default theme: NebulaCore (cyan/purple neon glows, glassmorphism)

- **2025-12-03**: Added Web Proxy System
  - Created server-side proxy at `/api/proxy/fetch` for reliable browsing
  - Dedicated proxy page at `/private/proxy.html`
  - URL bar with search support (auto-detects URLs vs search terms)
  - Quick links to popular sites (Google, YouTube, Discord, etc.)
  - Two modes: Server Proxy (fetches via backend) and Direct Link
  - Base tag injection for proper relative URL resolution
  - Works reliably in Replit's iframe environment (no service workers needed)

- **2025-12-03**: Database Migration to PostgreSQL
  - Converted from SQLite to PostgreSQL for persistent data across deployments
  - Updated all route files to use PostgreSQL-compatible SQL syntax
  - Fixed JWT authentication across all routes (unified secret key)
  - Converted INSERT OR IGNORE/REPLACE to ON CONFLICT syntax
  - Changed datetime('now') to CURRENT_TIMESTAMP

- **2025-12-03**: Added Quick Win Power Features
  - **Panic Button**: Shield button in bottom-right activates stealth mode. Disguise as Google Docs, Classroom, Khan Academy, Drive, Wikipedia, or Quizlet. Activate with \` key or double-ESC.
  - **Browser Cloaking**: Tab title and favicon change to match selected disguise when panic mode is active.
  - **Quick Switcher**: Press Ctrl+K or / to search pages, commands, users, and servers. Keyboard navigation with arrow keys.
  - **Friend Notes**: Private notes on any user's profile (only you can see them).
  - **Polls System**: Create polls in channels with single/multiple choice, anonymous voting, expiration times.
  - **Auto Theme**: Automatic theme switching based on system preference or time of day.
  - New JS files: stealth-mode.js, quick-switcher.js, auto-theme.js
  - New routes: /api/notes, /api/polls, /api/preferences
  - Database tables: friend_notes, polls, poll_options, poll_votes, user_preferences

- **2025-12-03**: Added Quick Win Features (Phase 1)
  - **Site Changelogs**: Professional changelog panel showing updates with version tags, change types (feature/bugfix/improvement/security/removed/ui), author attribution, and styled UI. Admin-only creation via API.
  - **Custom Keyboard Shortcuts**: Dedicated page at `/private/shortcuts.html` with categories (navigation/chat/ui/advanced). Users can edit, enable/disable, and reset shortcuts. Conflict detection prevents duplicate bindings.
  - **Archive Mode**: Users can archive DMs, group chats, and channels to hide from main view. Server owners can archive/unarchive entire channels. All archived items viewable in dedicated modal.
  - **Shop Page**: Dedicated page at `/private/shop.html` with full cosmetic shop interface, category browsing, inventory view, purchase and equip functionality.
  - New dashboard cards: "Cosmetic Shop" and "Keyboard Shortcuts"
  - Database tables: changelogs, user_shortcuts, default_shortcuts, archived_chats

- **2025-12-03**: Added comprehensive cosmetic shop system
  - 10 item categories: Themes, Profile Frames, Badges, Chat Bubbles, Sound Packs, Animated Avatars, Server Cosmetics, Status Effects, Bio Upgrades, Boosts
  - Virtual currency system with 1000 starting coins for new users
  - Daily rewards with streak bonuses (50, 100, 150, 200, 250 coins based on streak)
  - Purchase, equip/unequip functionality with inventory tracking
  - Theme application changes CSS variables site-wide
  - Rarity system: Common, Uncommon, Rare, Epic, Legendary
  - Server cosmetics restricted to server owners only
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
- **Database**: PostgreSQL (via DATABASE_URL environment variable) - Persistent across deployments
- **Port**: 5000 (binds to 0.0.0.0 for Replit compatibility)
- **Routes**:
  - `/api/users` - User authentication (signup/login)
  - `/api/auth`, `/api/servers`, `/api/messages` - Protected routes requiring auth token
  - `/api/admin` - Admin panel functionality
  - `/api/features`, `/api/friends`, `/api/blocks` - Social features
  - `/api/reactions`, `/api/pins`, `/api/invites` - Message features
  - `/api/search`, `/api/roles`, `/api/categories`, `/api/audit` - Additional features
  - `/api/shop` - Cosmetic shop system
  - `/api/changelogs` - Site changelog (public read, admin write)
  - `/api/shortcuts` - Keyboard shortcuts management
  - `/api/archive` - Chat archiving

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
