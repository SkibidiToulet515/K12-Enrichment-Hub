const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../config');

const router = express.Router();

function getUserFromToken(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function canManageChannels(serverId, userId, callback) {
  db.get('SELECT owner_id FROM servers WHERE id = ?', [serverId], (err, server) => {
    if (err || !server) return callback(false);
    if (server.owner_id === userId) return callback(true);
    
    db.all(`
      SELECT sr.permissions FROM server_roles sr
      JOIN server_member_roles smr ON sr.id = smr.role_id
      WHERE smr.server_id = ? AND smr.user_id = ?
    `, [serverId, userId], (err, roles) => {
      if (err) return callback(false);
      for (const role of roles) {
        const perms = JSON.parse(role.permissions || '{}');
        if (perms.administrator || perms.manage_channels) {
          return callback(true);
        }
      }
      callback(false);
    });
  });
}

router.get('/server/:serverId', (req, res) => {
  const serverId = req.params.serverId;
  
  db.all(`
    SELECT cc.*, 
      (SELECT COUNT(*) FROM channels WHERE category_id = cc.id) as channel_count
    FROM channel_categories cc
    WHERE cc.server_id = ?
    ORDER BY cc.position
  `, [serverId], (err, categories) => {
    if (err) return res.status(500).json({ error: 'Failed to load categories' });
    res.json(categories);
  });
});

router.get('/server/:serverId/structured', (req, res) => {
  const serverId = req.params.serverId;
  
  db.all(`SELECT * FROM channel_categories WHERE server_id = ? ORDER BY position`, [serverId], (err, categories) => {
    if (err) return res.status(500).json({ error: 'Failed to load categories' });
    
    db.all(`SELECT * FROM channels WHERE server_id = ? ORDER BY position`, [serverId], (err, channels) => {
      if (err) return res.status(500).json({ error: 'Failed to load channels' });
      
      const uncategorized = channels.filter(c => !c.category_id);
      const structured = categories.map(cat => ({
        ...cat,
        channels: channels.filter(c => c.category_id === cat.id)
      }));
      
      if (uncategorized.length > 0) {
        structured.unshift({
          id: null,
          name: 'Channels',
          channels: uncategorized
        });
      }
      
      res.json(structured);
    });
  });
});

router.post('/server/:serverId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const serverId = req.params.serverId;
  const { name } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  
  canManageChannels(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage channels' });
    
    db.get('SELECT MAX(position) as maxPos FROM channel_categories WHERE server_id = ?', [serverId], (err, result) => {
      const position = (result?.maxPos || 0) + 1;
      
      db.run(`
        INSERT INTO channel_categories (server_id, name, position)
        VALUES (?, ?, ?)
      `, [serverId, name, position], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to create category' });
        
        res.json({ 
          success: true, 
          categoryId: this.lastID,
          message: `Category "${name}" created` 
        });
      });
    });
  });
});

router.put('/server/:serverId/:categoryId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId, categoryId } = req.params;
  const { name } = req.body;
  
  canManageChannels(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage channels' });
    
    db.run('UPDATE channel_categories SET name = ? WHERE id = ? AND server_id = ?', 
      [name, categoryId, serverId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update category' });
        res.json({ success: true, message: 'Category updated' });
      });
  });
});

router.delete('/server/:serverId/:categoryId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId, categoryId } = req.params;
  
  canManageChannels(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage channels' });
    
    db.run('UPDATE channels SET category_id = NULL WHERE category_id = ?', [categoryId], () => {
      db.run('DELETE FROM channel_categories WHERE id = ? AND server_id = ?', 
        [categoryId, serverId], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to delete category' });
          res.json({ success: true, message: 'Category deleted' });
        });
    });
  });
});

router.put('/server/:serverId/reorder', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const serverId = req.params.serverId;
  const { categoryOrder } = req.body;
  
  if (!Array.isArray(categoryOrder)) return res.status(400).json({ error: 'Invalid category order' });
  
  canManageChannels(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage channels' });
    
    let completed = 0;
    categoryOrder.forEach((categoryId, index) => {
      db.run('UPDATE channel_categories SET position = ? WHERE id = ? AND server_id = ?', 
        [index, categoryId, serverId], () => {
          completed++;
          if (completed === categoryOrder.length) {
            res.json({ success: true, message: 'Category order updated' });
          }
        });
    });
    
    if (categoryOrder.length === 0) {
      res.json({ success: true, message: 'No changes' });
    }
  });
});

router.put('/server/:serverId/channel/:channelId/category', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { serverId, channelId } = req.params;
  const { categoryId } = req.body;
  
  canManageChannels(serverId, user.userId, (canManage) => {
    if (!canManage) return res.status(403).json({ error: 'No permission to manage channels' });
    
    db.run('UPDATE channels SET category_id = ? WHERE id = ? AND server_id = ?', 
      [categoryId || null, channelId, serverId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to move channel' });
        res.json({ success: true, message: 'Channel moved to category' });
      });
  });
});

module.exports = router;
