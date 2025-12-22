# K-12 Learning Portal

## Overview
A comprehensive K-12 learning portal designed to provide educational resources, a chat system, and a game library for students. The platform aims to offer an engaging and interactive learning environment with features like gamification, robust communication tools, and administrative control. It is built to support a large user base with persistent data storage and real-time functionalities.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
- **Theming System**: Comprehensive theming with 36 options, persistence via localStorage, and a default "NebulaCore" theme featuring cyan/purple neon glows and glassmorphism.
- **Panic Button**: Stealth mode activation (via ` key or double-ESC) to disguise the portal as common educational sites (Google Docs, Classroom, etc.), with tab title and favicon cloaking.
- **Quick Switcher**: Ctrl+K or / activated search for pages, commands, users, and servers with keyboard navigation.
- **Public Landing Page**: Professional, institutional branding with stock images, hero section, statistics, academic programs, testimonials, and a comprehensive footer.
- **Admin Control Center**: Dashboard with real-time metrics, user management, content management placeholders, permission/role editors, analytics, site settings, security features (XP rate limiting, activity status auto-expiry), and communication tools.
- **Friend Management**: Context menu for friend actions (View Profile, Send Message, Ignore, Be Invisible, Block, Unfriend).
- **Invite System**: UI for creating server/group invites with expiry options and max uses, invite previews, and error handling.

### Technical Implementations
- **Backend**: Node.js with Express.js for routing and business logic.
- **Database**: PostgreSQL for persistent data storage, replacing SQLite.
- **Real-time Communication**: Socket.io for chat, online/offline status, typing indicators, reactions, editing, deletion, @mentions, and read receipts.
- **Gamification**: XP and leveling system, 22 achievements across 5 categories, global leaderboards, activity status, and a personal task system.
- **Permission System**: Discord-style channel-level permissions with overrides, hierarchy (user > channel role > server role > defaults), and deny-over-allow precedence.
- **Web Proxy**: Dual-engine proxy system with Ultraviolet (UV) as primary and Server-side fallback. UV uses service workers for URL rewriting with broad website compatibility. Server proxy provides basic fallback for simpler pages.
- **Authentication**: JWT for secure user authentication.
- **File Uploads**: Multer middleware for handling file uploads (max 10MB).
- **Cosmetic Shop**: Virtual currency, 10 categories of items, daily rewards, purchase/equip functionality, and rarity system.
- **Custom Keyboard Shortcuts**: Editable, enable/disable, and reset options with conflict detection.
- **Archive Mode**: Ability to archive DMs, group chats, and channels.
- **Polls System**: In-channel polls with various options.
- **Friend Notes**: Private notes on user profiles.
- **Auto Theme**: Automatic theme switching based on system preference or time.
- **Game Rating System**: Star rating (1-5) for games with user reviews and average rating display.
- **Recently Played Games**: Tracks last 10 played games in a carousel display on the games page.
- **Game Categories**: Filter games by 10 categories (Action, Racing, Puzzle, Sports, Strategy, Adventure, Arcade, Shooter, Simulation, Multiplayer).
- **Profile Banner**: Custom banner image upload for user profiles.
- **Custom Wallpaper**: Upload background images for dashboard pages.
- **YouTube Video Library**: Search and watch educational videos with category filtering (Education, Science, Music, Gaming, Entertainment).
- **Game Leaderboards**: High score tracking per game with global rankings and personal bests.
- **Speedrun Timer**: Built-in stopwatch with millisecond precision for speedrunning, submit times to leaderboard.
- **Dashboard Widgets**: Customizable widget system with 10 widget types (stats, recent games, leaderboard, friends, announcements, tasks, clock, calendar, notes, weather).
- **Theme Creator**: Full theme customization with live preview, color pickers, save/export functionality, and public theme gallery.
- **Anonymous Forums**: Discussion boards where users can post anonymously with categories (General Discussion, Homework Help, Study Tips, Game Requests, Bug Reports, Off Topic), voting system, replies, search, and sorting options.
- **OS-Style Interface**: Optional desktop-style interface with taskbar, windowed apps, start menu, and notifications panel. Switchable via Settings.
- **Wave OS Mode**: Second OS mode option featuring calm, fluid macOS-inspired interface with animated gradient background, bottom dock, floating windows, muted color palette (soft blues, dusty purples, warm grays), and smooth transitions. Offers an alternative to the Windows-style OS mode.
- **Universal Settings App (New)**: Centralized settings page with layout toggle, theme selection, font customization, accessibility options, and notification preferences.
- **Guest Mode (New)**: Users can browse as guests without creating an account. Guests have limited access (cannot save progress, post content, or access admin features).
- **Pin/Like Games (New)**: Games can be pinned and liked with localStorage persistence and dedicated filter categories.
- **Apps Page (New)**: Utility apps including Calculator, Stopwatch, Timer, Quick Notes, Coin Flip, and Dice Roller.
- **YouTube Privacy Mode (New)**: Videos embed using youtube-nocookie.com for enhanced privacy.
- **Music App (New)**: YouTube-based music streaming with search, genre filters, play queue, and currently playing display using youtube-nocookie.com embeds.
- **Bug Report System (New)**: User submission form with category/priority selection, screenshot upload, admin review queue with status management (pending/investigating/resolved/closed), filtering, and statistics dashboard.
- **OS-Style Notifications (New)**: Toast notification system with info/success/warning/error types, auto-dismiss, action buttons, slide-in animations, and max 3 concurrent notifications.
- **Advanced Tab Cloaking**: Tab disguise with custom icon (My Apps) and title, about:blank wrapper, blob: URL wrapper, and auto-cloak on site open. Settings to enable/disable each cloaking method.
- **Nova AI Chat**: AI-powered study buddy using OpenAI GPT-4o-mini. Conversational interface for homework help, study tips, and general chat. Session-based conversation history with typing indicators and error handling.
- **Pomodoro Timer**: Study timer with work/short break/long break modes, session tracking, streak counter, and stats persistence.
- **Custom Cursors**: Selectable cursor styles including custom SVG cursors (neon glow, retro pixel, minimal dot) with persistence.
- **Sound Effects**: Configurable notification and click sounds using Web Audio API with volume control.
- **Bookmark Manager**: Save and organize proxy site URLs for quick access.
- **Animated Particle Background**: Canvas-based floating particle system with theme color integration, pulsing glow effects, and configurable density (low/medium/high). Persists user preferences across sessions.
- **Visual Effects System**: Comprehensive CSS utility library with floating animations, glow effects (including neon borders), gradient backgrounds, shimmer text, stagger animations, 3D tilt effects, and backdrop blur variants. All effects can be toggled in Settings.
- **Dynamic Default Avatars**: Colorful gradient avatars with user initials generated automatically when no profile picture is set. Deterministic colors based on username hash.
- **Polish CSS Utilities**: Loading spinners, skeleton screens, empty states with icons, toast notifications, smooth page transitions, card hover effects, and status indicators.
- **Rich Presence System**: Real-time activity tracking showing what users are doing (playing games, watching videos, listening to music, studying, AFK) with socket.io integration, presence badges, hover cards with duration, and automatic status updates across games/music apps.
- **Version History for Notes & Tasks**: Save and restore previous versions of notes and tasks with up to 50 versions per item, modal UI for viewing history, and restore functionality with ownership verification.
- **In-OS Spotlight Search**: Unified search across games, users, forums, tasks, messages, channels, and servers with Ctrl+K/slash keyboard shortcut, grouped results display, search history tracking, and XSS-sanitized output.

### System Design Choices
- **Port**: Server runs on port 5000 for Replit compatibility.
- **Database Schema**: Includes tables for users, servers, channels, messages, friends, group_chats, roles, badges, games, user_xp, achievements, user_activity, tasks, announcements, channel_permissions, friend_notes, polls, poll_options, poll_votes, user_preferences, changelogs, user_shortcuts, default_shortcuts, archived_chats, shop_categories, shop_items, user_purchases, user_equipped, coin_transactions, daily_rewards, game_ratings, recently_played, game_leaderboards, speedrun_records, user_widgets, custom_themes, forum_categories, forum_posts, forum_replies, forum_votes, bug_reports, notes_history, tasks_history, and search_history.
- **Security**: Pre-seeded admin accounts (admin, Yusoff(ADMIN)) with default passwords for initial setup (requires immediate change for production). CORS configured to allow all origins during development, needing restriction for production. JWT secret should be an environment variable.

## External Dependencies
- `express`: Web server framework.
- `socket.io`: Real-time bidirectional communication.
- `pg`: PostgreSQL client for Node.js.
- `bcryptjs`: Password hashing library.
- `jsonwebtoken`: JSON Web Token implementation for authentication.
- `multer`: Middleware for handling `multipart/form-data` (file uploads).
- `cors`: Middleware for enabling Cross-Origin Resource Sharing.