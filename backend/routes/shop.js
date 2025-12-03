const express = require('express');
const router = express.Router();
const db = require('../db');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'k12-learning-portal-secret-key-2024';
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

router.get('/categories', authenticateToken, (req, res) => {
  db.all('SELECT * FROM shop_categories ORDER BY position', (err, categories) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(categories);
  });
});

router.get('/items', authenticateToken, (req, res) => {
  const { category, search, rarity } = req.query;
  let sql = `
    SELECT si.*, sc.name as category_name, sc.slug as category_slug
    FROM shop_items si
    JOIN shop_categories sc ON si.category_id = sc.id
    WHERE si.is_available = 1
  `;
  const params = [];
  
  if (category) {
    sql += ' AND (sc.slug = ? OR sc.id = ?)';
    params.push(category, category);
  }
  if (search) {
    sql += ' AND (si.name LIKE ? OR si.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (rarity) {
    sql += ' AND si.rarity = ?';
    params.push(rarity);
  }
  
  sql += ' ORDER BY sc.position, si.price';
  
  db.all(sql, params, (err, items) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(items);
  });
});

router.get('/item/:id', authenticateToken, (req, res) => {
  db.get(`
    SELECT si.*, sc.name as category_name, sc.slug as category_slug
    FROM shop_items si
    JOIN shop_categories sc ON si.category_id = sc.id
    WHERE si.id = ?
  `, [req.params.id], (err, item) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  });
});

router.get('/wallet', authenticateToken, (req, res) => {
  db.get('SELECT coins FROM users WHERE id = ?', [req.user.userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    db.all(`
      SELECT * FROM coin_transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [req.user.userId], (err, transactions) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({
        coins: user?.coins || 0,
        transactions: transactions || []
      });
    });
  });
});

router.post('/purchase/:itemId', authenticateToken, (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const userId = req.user.userId;
  
  db.get('SELECT * FROM shop_items WHERE id = ? AND is_available = 1', [itemId], (err, item) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!item) return res.status(404).json({ error: 'Item not found or unavailable' });
    
    db.get('SELECT * FROM user_purchases WHERE user_id = ? AND item_id = ?', [userId, itemId], (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (existing) return res.status(400).json({ error: 'You already own this item' });
      
      db.get('SELECT coins FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user || user.coins < item.price) {
          return res.status(400).json({ error: 'Not enough coins', required: item.price, current: user?.coins || 0 });
        }
        
        const newBalance = user.coins - item.price;
        
        db.run('UPDATE users SET coins = ? WHERE id = ?', [newBalance, userId], function(err) {
          if (err) return res.status(500).json({ error: 'Transaction failed' });
          
          db.run(`
            INSERT INTO user_purchases (user_id, item_id, price_paid)
            VALUES (?, ?, ?)
          `, [userId, itemId, item.price], function(err) {
            if (err) {
              db.run('UPDATE users SET coins = ? WHERE id = ?', [user.coins, userId], () => {});
              return res.status(500).json({ error: 'Purchase failed' });
            }
            
            db.run(`
              INSERT INTO coin_transactions (user_id, amount, balance_after, transaction_type, description, reference_id)
              VALUES (?, ?, ?, 'purchase', ?, ?)
            `, [userId, -item.price, newBalance, `Purchased ${item.name}`, itemId], () => {});
            
            res.json({
              success: true,
              message: `Successfully purchased ${item.name}!`,
              item: item,
              newBalance: newBalance
            });
          });
        });
      });
    });
  });
});

router.get('/inventory', authenticateToken, (req, res) => {
  db.all(`
    SELECT si.*, up.purchased_at, sc.name as category_name, sc.slug as category_slug
    FROM user_purchases up
    JOIN shop_items si ON up.item_id = si.id
    JOIN shop_categories sc ON si.category_id = sc.id
    WHERE up.user_id = ?
    ORDER BY up.purchased_at DESC
  `, [req.user.userId], (err, items) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(items || []);
  });
});

router.get('/equipped', authenticateToken, (req, res) => {
  db.all(`
    SELECT ue.*, si.name, si.item_type, si.css_class, si.css_vars, si.asset_url, si.metadata, si.is_animated
    FROM user_equipped ue
    JOIN shop_items si ON ue.item_id = si.id
    WHERE ue.user_id = ? AND (ue.server_id IS NULL OR ue.server_id = 0)
  `, [req.user.userId], (err, equipped) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    const equippedMap = {};
    (equipped || []).forEach(item => {
      equippedMap[item.slot] = item;
    });
    
    res.json(equippedMap);
  });
});

router.post('/equip', authenticateToken, (req, res) => {
  const { itemId, slot, serverId } = req.body;
  const userId = req.user.userId;
  
  if (!itemId || !slot) {
    return res.status(400).json({ error: 'Item ID and slot are required' });
  }
  
  db.get(`
    SELECT si.* FROM user_purchases up
    JOIN shop_items si ON up.item_id = si.id
    WHERE up.user_id = ? AND up.item_id = ?
  `, [userId, itemId], (err, item) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!item) return res.status(400).json({ error: 'You do not own this item' });
    
    const slotMap = {
      'theme': 'theme',
      'frame': 'frame',
      'badge': 'badge',
      'bubble': 'bubble',
      'sound': 'sound',
      'avatar': 'avatar',
      'status': 'status',
      'bio_upgrade': 'bio_upgrade',
      'boost': 'boost',
      'server_icon': 'server_icon',
      'server_banner': 'server_banner'
    };
    
    if (!slotMap[item.item_type] || slotMap[item.item_type] !== slot) {
      return res.status(400).json({ error: 'Item type does not match slot' });
    }
    
    const serverIdValue = serverId || null;
    
    const doEquip = () => {
      db.run(`
        INSERT OR REPLACE INTO user_equipped (user_id, slot, item_id, server_id, equipped_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [userId, slot, itemId, serverIdValue], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to equip item' });
        
        res.json({
          success: true,
          message: `Equipped ${item.name}`,
          item: item
        });
      });
    };
    
    if ((slot === 'server_icon' || slot === 'server_banner') && serverId) {
      db.get(`
        SELECT s.owner_id, sm.user_id as member_id
        FROM servers s
        LEFT JOIN server_members sm ON s.id = sm.server_id AND sm.user_id = ?
        WHERE s.id = ?
      `, [userId, serverId], (err, serverData) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!serverData) return res.status(404).json({ error: 'Server not found' });
        
        const isOwner = serverData.owner_id === userId;
        const isMember = serverData.member_id === userId;
        
        if (!isOwner && !isMember) {
          return res.status(403).json({ error: 'You must be a member of this server' });
        }
        
        if (!isOwner) {
          return res.status(403).json({ error: 'Only the server owner can change server cosmetics' });
        }
        
        doEquip();
      });
    } else {
      doEquip();
    }
  });
});

router.post('/unequip', authenticateToken, (req, res) => {
  const { slot, serverId } = req.body;
  const userId = req.user.userId;
  
  if (!slot) {
    return res.status(400).json({ error: 'Slot is required' });
  }
  
  let sql = 'DELETE FROM user_equipped WHERE user_id = ? AND slot = ?';
  let params = [userId, slot];
  
  if (serverId) {
    sql += ' AND server_id = ?';
    params.push(serverId);
  } else {
    sql += ' AND (server_id IS NULL OR server_id = 0)';
  }
  
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: 'Failed to unequip item' });
    
    res.json({
      success: true,
      message: `Unequipped ${slot}`
    });
  });
});

router.post('/daily', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const today = new Date().toISOString().split('T')[0];
  
  db.get(`
    SELECT * FROM daily_rewards 
    WHERE user_id = ? AND reward_date = ?
  `, [userId, today], (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (existing) return res.status(400).json({ error: 'Already claimed today', nextClaim: 'tomorrow' });
    
    db.get(`
      SELECT * FROM daily_rewards 
      WHERE user_id = ? 
      ORDER BY reward_date DESC 
      LIMIT 1
    `, [userId], (err, lastReward) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      let streak = 1;
      if (lastReward) {
        const lastDate = new Date(lastReward.reward_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
          streak = lastReward.streak + 1;
        }
      }
      
      let baseAmount = 25;
      let bonusMultiplier = 1 + (Math.min(streak, 7) - 1) * 0.1;
      
      db.get(`
        SELECT si.metadata FROM user_equipped ue
        JOIN shop_items si ON ue.item_id = si.id
        WHERE ue.user_id = ? AND ue.slot = 'boost' AND si.slug = 'boost-daily'
      `, [userId], (err, boost) => {
        if (!err && boost) {
          try {
            const meta = JSON.parse(boost.metadata);
            if (meta.coinBonus) bonusMultiplier *= meta.coinBonus;
          } catch(e) {}
        }
        
        const amount = Math.floor(baseAmount * bonusMultiplier);
        
        db.get('SELECT coins FROM users WHERE id = ?', [userId], (err, user) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          
          const newBalance = (user?.coins || 0) + amount;
          
          db.run('UPDATE users SET coins = ? WHERE id = ?', [newBalance, userId], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to add coins' });
            
            db.run(`
              INSERT INTO daily_rewards (user_id, reward_date, amount, streak)
              VALUES (?, ?, ?, ?)
            `, [userId, today, amount, streak], function(err) {
              if (err) return res.status(500).json({ error: 'Failed to record daily reward' });
              
              db.run(`
                INSERT INTO coin_transactions (user_id, amount, balance_after, transaction_type, description)
                VALUES (?, ?, ?, 'daily_reward', ?)
              `, [userId, amount, newBalance, `Daily reward (${streak} day streak)`], () => {});
              
              res.json({
                success: true,
                amount: amount,
                streak: streak,
                newBalance: newBalance,
                message: streak > 1 ? `${streak} day streak! +${amount} coins` : `+${amount} coins`
              });
            });
          });
        });
      });
    });
  });
});

router.get('/daily/status', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const today = new Date().toISOString().split('T')[0];
  
  db.get(`
    SELECT * FROM daily_rewards 
    WHERE user_id = ? AND reward_date = ?
  `, [userId, today], (err, todayReward) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    db.get(`
      SELECT * FROM daily_rewards 
      WHERE user_id = ? 
      ORDER BY reward_date DESC 
      LIMIT 1
    `, [userId], (err, lastReward) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      res.json({
        claimed: !!todayReward,
        lastClaim: lastReward?.reward_date,
        currentStreak: lastReward?.streak || 0,
        todayAmount: todayReward?.amount
      });
    });
  });
});

router.get('/user/:userId/cosmetics', authenticateToken, (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  
  db.all(`
    SELECT ue.slot, si.name, si.item_type, si.css_class, si.css_vars, si.asset_url, si.metadata, si.is_animated
    FROM user_equipped ue
    JOIN shop_items si ON ue.item_id = si.id
    WHERE ue.user_id = ? AND (ue.server_id IS NULL OR ue.server_id = 0)
  `, [targetUserId], (err, equipped) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    const cosmetics = {};
    (equipped || []).forEach(item => {
      cosmetics[item.slot] = {
        name: item.name,
        css_class: item.css_class,
        css_vars: item.css_vars,
        asset_url: item.asset_url,
        metadata: item.metadata,
        is_animated: item.is_animated
      };
    });
    
    res.json(cosmetics);
  });
});

router.post('/admin/give-coins', authenticateToken, (req, res) => {
  const { targetUserId, amount, reason } = req.body;
  
  db.get('SELECT role FROM users WHERE id = ?', [req.user.userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    db.get('SELECT coins FROM users WHERE id = ?', [targetUserId], (err, target) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!target) return res.status(404).json({ error: 'User not found' });
      
      const newBalance = (target.coins || 0) + amount;
      
      db.run('UPDATE users SET coins = ? WHERE id = ?', [newBalance, targetUserId], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update coins' });
        
        db.run(`
          INSERT INTO coin_transactions (user_id, amount, balance_after, transaction_type, description)
          VALUES (?, ?, ?, 'admin_grant', ?)
        `, [targetUserId, amount, newBalance, reason || 'Admin grant'], () => {});
        
        res.json({
          success: true,
          newBalance: newBalance
        });
      });
    });
  });
});

module.exports = router;
