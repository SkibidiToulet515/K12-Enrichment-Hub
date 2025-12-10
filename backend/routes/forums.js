const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      req.user = null;
    }
  }
  next();
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/categories', (req, res) => {
  db.all(`
    SELECT fc.*, 
           (SELECT COUNT(*) FROM forum_posts WHERE category_id = fc.id) as post_count,
           (SELECT MAX(created_at) FROM forum_posts WHERE category_id = fc.id) as last_post_at
    FROM forum_categories fc 
    ORDER BY fc.position ASC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ categories: rows || [] });
  });
});

router.get('/posts', (req, res) => {
  const { category, page = 1, limit = 20, sort = 'newest' } = req.query;
  const offset = (page - 1) * limit;
  
  let orderBy = 'fp.is_pinned DESC, fp.created_at DESC';
  if (sort === 'popular') orderBy = 'fp.is_pinned DESC, (fp.upvotes - fp.downvotes) DESC';
  if (sort === 'views') orderBy = 'fp.is_pinned DESC, fp.views DESC';
  
  let whereClause = '';
  let params = [];
  
  if (category) {
    whereClause = 'WHERE fp.category_id = ?';
    params = [category];
  }
  
  db.all(`
    SELECT fp.*, fc.name as category_name, fc.icon as category_icon,
           (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) as reply_count
    FROM forum_posts fp
    JOIN forum_categories fc ON fp.category_id = fc.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ posts: rows || [] });
  });
});

router.get('/posts/:id', optionalAuth, (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE forum_posts SET views = views + 1 WHERE id = ?', [id], () => {});
  
  db.get(`
    SELECT fp.*, fc.name as category_name, fc.icon as category_icon
    FROM forum_posts fp
    JOIN forum_categories fc ON fp.category_id = fc.id
    WHERE fp.id = ?
  `, [id], (err, post) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    db.all(`
      SELECT * FROM forum_replies 
      WHERE post_id = ? 
      ORDER BY created_at ASC
    `, [id], (err, replies) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ post, replies: replies || [] });
    });
  });
});

router.post('/posts', optionalAuth, (req, res) => {
  const { categoryId, title, content, anonymousName } = req.body;
  
  if (!categoryId || !title || !content) {
    return res.status(400).json({ error: 'Category, title, and content are required' });
  }
  
  if (title.length > 200) {
    return res.status(400).json({ error: 'Title must be 200 characters or less' });
  }
  
  if (content.length > 10000) {
    return res.status(400).json({ error: 'Content must be 10000 characters or less' });
  }
  
  const userId = req.user?.id || null;
  const anonName = anonymousName?.trim().slice(0, 30) || 'Anonymous';
  
  db.run(`
    INSERT INTO forum_posts (category_id, title, content, anonymous_name, user_id)
    VALUES (?, ?, ?, ?, ?)
  `, [categoryId, title.trim(), content.trim(), anonName, userId], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, postId: this.lastID });
  });
});

router.post('/posts/:id/reply', optionalAuth, (req, res) => {
  const { id } = req.params;
  const { content, anonymousName } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  if (content.length > 5000) {
    return res.status(400).json({ error: 'Reply must be 5000 characters or less' });
  }
  
  db.get('SELECT id, is_locked FROM forum_posts WHERE id = ?', [id], (err, post) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.is_locked) return res.status(403).json({ error: 'This post is locked' });
    
    const userId = req.user?.id || null;
    const anonName = anonymousName?.trim().slice(0, 30) || 'Anonymous';
    
    db.run(`
      INSERT INTO forum_replies (post_id, content, anonymous_name, user_id)
      VALUES (?, ?, ?, ?)
    `, [id, content.trim(), anonName, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, replyId: this.lastID });
    });
  });
});

router.post('/vote', authenticate, (req, res) => {
  const { postId, replyId, voteType } = req.body;
  const userId = req.user.id;
  
  if (!voteType || !['up', 'down'].includes(voteType)) {
    return res.status(400).json({ error: 'Invalid vote type' });
  }
  
  if (!postId && !replyId) {
    return res.status(400).json({ error: 'Post ID or Reply ID required' });
  }
  
  const pId = postId || null;
  const rId = replyId || null;
  
  db.get('SELECT * FROM forum_votes WHERE user_id = ? AND post_id IS NOT DISTINCT FROM ? AND reply_id IS NOT DISTINCT FROM ?',
    [userId, pId, rId], (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (existing) {
        if (existing.vote_type === voteType) {
          db.run('DELETE FROM forum_votes WHERE id = ?', [existing.id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            const table = postId ? 'forum_posts' : 'forum_replies';
            const column = voteType === 'up' ? 'upvotes' : 'downvotes';
            const targetId = postId || replyId;
            
            db.run(`UPDATE ${table} SET ${column} = ${column} - 1 WHERE id = ?`, [targetId], (err) => {
              if (err) return res.status(500).json({ error: 'Database error' });
              res.json({ success: true, action: 'removed' });
            });
          });
        } else {
          db.run('UPDATE forum_votes SET vote_type = ? WHERE id = ?', [voteType, existing.id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            const table = postId ? 'forum_posts' : 'forum_replies';
            const targetId = postId || replyId;
            const addCol = voteType === 'up' ? 'upvotes' : 'downvotes';
            const subCol = voteType === 'up' ? 'downvotes' : 'upvotes';
            
            db.run(`UPDATE ${table} SET ${addCol} = ${addCol} + 1, ${subCol} = ${subCol} - 1 WHERE id = ?`, [targetId], (err) => {
              if (err) return res.status(500).json({ error: 'Database error' });
              res.json({ success: true, action: 'changed' });
            });
          });
        }
      } else {
        db.run('INSERT INTO forum_votes (user_id, post_id, reply_id, vote_type) VALUES (?, ?, ?, ?)',
          [userId, pId, rId, voteType], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            const table = postId ? 'forum_posts' : 'forum_replies';
            const column = voteType === 'up' ? 'upvotes' : 'downvotes';
            const targetId = postId || replyId;
            
            db.run(`UPDATE ${table} SET ${column} = ${column} + 1 WHERE id = ?`, [targetId], (err) => {
              if (err) return res.status(500).json({ error: 'Database error' });
              res.json({ success: true, action: 'added' });
            });
          });
      }
    });
});

router.get('/search', (req, res) => {
  const { q, limit = 20 } = req.query;
  
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  
  const searchTerm = `%${q}%`;
  
  db.all(`
    SELECT fp.*, fc.name as category_name, fc.icon as category_icon,
           (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) as reply_count
    FROM forum_posts fp
    JOIN forum_categories fc ON fp.category_id = fc.id
    WHERE fp.title ILIKE ? OR fp.content ILIKE ?
    ORDER BY fp.created_at DESC
    LIMIT ?
  `, [searchTerm, searchTerm, parseInt(limit)], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ posts: rows || [] });
  });
});

module.exports = router;
