const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const SECRET_KEY = 'real_user_auth_secret_2025';

function getUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded.userId;
  } catch {
    return null;
  }
}

function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function xpForLevel(level) {
  return Math.pow(level - 1, 2) * 100;
}

function xpForNextLevel(level) {
  return Math.pow(level, 2) * 100;
}

router.get('/me', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.get('SELECT * FROM user_xp WHERE user_id = ?', [userId], (err, xpData) => {
    if (!xpData) {
      db.run('INSERT INTO user_xp (user_id) VALUES (?) ON CONFLICT DO NOTHING', [userId], () => {
        res.json({
          total_xp: 0,
          level: 1,
          messages_sent: 0,
          games_played: 0,
          login_streak: 0,
          xp_for_next_level: 100,
          progress_percent: 0
        });
      });
    } else {
      const level = calculateLevel(xpData.total_xp);
      const currentLevelXp = xpForLevel(level);
      const nextLevelXp = xpForNextLevel(level);
      const progressPercent = Math.floor(((xpData.total_xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
      
      res.json({
        ...xpData,
        level,
        xp_for_next_level: nextLevelXp,
        progress_percent: progressPercent
      });
    }
  });
});

const XP_REWARDS = {
  message: 5,
  game: 20,
  login: 10,
  friend: 15,
  task_complete: 10,
  achievement: 0
};

const userActivityTimestamps = new Map();

router.post('/activity/:type', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { type } = req.params;
  const reward = XP_REWARDS[type];
  
  if (reward === undefined) {
    return res.status(400).json({ error: 'Invalid activity type' });
  }

  const now = Date.now();
  const lastActivity = userActivityTimestamps.get(`${userId}_${type}`) || 0;
  const cooldowns = { message: 2000, game: 30000, friend: 5000 };
  const cooldown = cooldowns[type] || 1000;
  
  if (now - lastActivity < cooldown) {
    return res.json({ success: true, xp_added: 0, cooldown: true });
  }
  userActivityTimestamps.set(`${userId}_${type}`, now);

  if (reward === 0) {
    return res.json({ success: true, xp_added: 0 });
  }

  const updateField = type === 'message' ? 'messages_sent = messages_sent + 1,' : 
                      type === 'game' ? 'games_played = games_played + 1,' : '';

  db.run(`
    INSERT INTO user_xp (user_id, total_xp, messages_sent, games_played) VALUES (?, ?, 0, 0)
    ON CONFLICT(user_id) DO UPDATE SET 
      total_xp = user_xp.total_xp + ?,
      ${updateField}
      updated_at = CURRENT_TIMESTAMP
  `, [userId, reward, reward], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, xp_added: reward });
  });
});

router.post('/claim-daily', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.get('SELECT * FROM user_xp WHERE user_id = ?', [userId], (err, xpData) => {
    const now = new Date();
    const lastClaim = xpData?.last_daily_claim ? new Date(xpData.last_daily_claim) : null;
    
    if (lastClaim && (now - lastClaim) < 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Already claimed today', next_claim: new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000) });
    }

    const isConsecutive = lastClaim && (now - lastClaim) < 48 * 60 * 60 * 1000;
    const newStreak = isConsecutive ? (xpData?.login_streak || 0) + 1 : 1;
    const baseXp = 50;
    const bonusXp = Math.min(newStreak * 10, 100);
    const totalXp = baseXp + bonusXp;

    db.run(`
      INSERT INTO user_xp (user_id, total_xp, login_streak, last_daily_claim)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        total_xp = user_xp.total_xp + ?,
        login_streak = ?,
        last_daily_claim = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, totalXp, newStreak, totalXp, newStreak], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        success: true,
        xp_earned: totalXp,
        streak: newStreak,
        bonus_xp: bonusXp
      });
    });
  });
});

router.post('/activity/:type', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { type } = req.params;
  let xpAmount = 0;
  let column = null;

  switch(type) {
    case 'message':
      xpAmount = 2;
      column = 'messages_sent';
      break;
    case 'game':
      xpAmount = 10;
      column = 'games_played';
      break;
    default:
      return res.status(400).json({ error: 'Invalid activity type' });
  }

  db.run(`
    INSERT INTO user_xp (user_id, total_xp, ${column})
    VALUES (?, ?, 1)
    ON CONFLICT(user_id) DO UPDATE SET
      total_xp = user_xp.total_xp + ?,
      ${column} = user_xp.${column} + 1,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, xpAmount, xpAmount], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, xp_earned: xpAmount });
  });
});

router.get('/leaderboard', (req, res) => {
  const { type = 'xp', limit = 20 } = req.query;
  
  let orderBy = 'total_xp DESC';
  if (type === 'messages') orderBy = 'messages_sent DESC';
  if (type === 'games') orderBy = 'games_played DESC';
  if (type === 'streak') orderBy = 'login_streak DESC';

  db.all(`
    SELECT u.id, u.username, u.profile_picture, x.total_xp, x.messages_sent, x.games_played, x.login_streak
    FROM user_xp x
    JOIN users u ON x.user_id = u.id
    ORDER BY ${orderBy}
    LIMIT ?
  `, [parseInt(limit)], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      ...row,
      level: calculateLevel(row.total_xp)
    }));
    
    res.json(leaderboard);
  });
});

router.get('/achievements', (req, res) => {
  db.all('SELECT * FROM achievements ORDER BY category, requirement_value', [], (err, achievements) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(achievements);
  });
});

router.get('/my-achievements', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.all(`
    SELECT a.*, ua.earned_at
    FROM achievements a
    LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
    ORDER BY a.category, a.requirement_value
  `, [userId], (err, achievements) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(achievements);
  });
});

router.post('/check-achievements', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.get('SELECT * FROM user_xp WHERE user_id = ?', [userId], (err, xpData) => {
    if (!xpData) return res.json({ new_achievements: [] });

    const level = calculateLevel(xpData.total_xp);
    const checks = {
      messages: xpData.messages_sent,
      games_played: xpData.games_played,
      login_streak: xpData.login_streak,
      level: level
    };

    db.all(`
      SELECT a.* FROM achievements a
      WHERE a.id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = ?)
    `, [userId], (err, unearned) => {
      if (err) return res.status(500).json({ error: err.message });

      const newAchievements = [];
      unearned.forEach(ach => {
        const value = checks[ach.requirement_type];
        if (value !== undefined && value >= ach.requirement_value) {
          newAchievements.push(ach);
          db.run('INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?) ON CONFLICT DO NOTHING', 
            [userId, ach.id]);
          if (ach.xp_reward > 0) {
            db.run('UPDATE user_xp SET total_xp = total_xp + ? WHERE user_id = ?', [ach.xp_reward, userId]);
          }
        }
      });

      res.json({ new_achievements: newAchievements });
    });
  });
});

module.exports = router;
