const db = require('./db');

const ActivityLogger = {
  log(category, action, details = {}, userId = null) {
    const timestamp = new Date().toISOString();
    const detailsJson = JSON.stringify(details);
    
    db.run(`
      INSERT INTO activity_log (category, action, details, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [category, action, detailsJson, userId, timestamp], (err) => {
      if (err) {
        console.error('[Logger Error]', err.message);
      }
    });
    
    const logMessage = `[${timestamp}] [${category.toUpperCase()}] ${action}`;
    if (Object.keys(details).length > 0) {
      console.log(logMessage, details);
    } else {
      console.log(logMessage);
    }
  },

  user(action, details = {}, userId = null) {
    this.log('user', action, details, userId);
  },

  auth(action, details = {}, userId = null) {
    this.log('auth', action, details, userId);
  },

  server(action, details = {}, userId = null) {
    this.log('server', action, details, userId);
  },

  channel(action, details = {}, userId = null) {
    this.log('channel', action, details, userId);
  },

  message(action, details = {}, userId = null) {
    this.log('message', action, details, userId);
  },

  moderation(action, details = {}, userId = null) {
    this.log('moderation', action, details, userId);
  },

  shop(action, details = {}, userId = null) {
    this.log('shop', action, details, userId);
  },

  xp(action, details = {}, userId = null) {
    this.log('xp', action, details, userId);
  },

  system(action, details = {}) {
    this.log('system', action, details, null);
  },

  error(action, details = {}, userId = null) {
    this.log('error', action, details, userId);
    console.error(`[ERROR] ${action}`, details);
  }
};

module.exports = ActivityLogger;
