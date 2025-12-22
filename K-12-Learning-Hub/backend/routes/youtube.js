const express = require('express');
const router = express.Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

router.get('/search', async (req, res) => {
  try {
    const { q, maxResults = 12, pageToken = '' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'YouTube API key not configured' });
    }

    const params = new URLSearchParams({
      part: 'snippet',
      q: q,
      type: 'video',
      maxResults: maxResults,
      key: YOUTUBE_API_KEY,
      safeSearch: 'strict'
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      return res.status(500).json({ error: 'YouTube API error' });
    }

    const videos = data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt
    }));

    res.json({
      videos,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || 0
    });
  } catch (err) {
    console.error('YouTube search error:', err);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

router.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'YouTube API key not configured' });
    }

    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoId,
      key: YOUTUBE_API_KEY
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
    const data = await response.json();

    if (data.error || !data.items?.length) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = data.items[0];
    res.json({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      duration: video.contentDetails.duration
    });
  } catch (err) {
    console.error('YouTube video error:', err);
    res.status(500).json({ error: 'Failed to fetch video details' });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const { category = 'education', maxResults = 12 } = req.query;

    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'YouTube API key not configured' });
    }

    const searchTerms = {
      education: 'educational videos for students',
      science: 'science experiments explained',
      music: 'popular music 2024',
      gaming: 'gaming videos',
      entertainment: 'entertainment videos'
    };

    const params = new URLSearchParams({
      part: 'snippet',
      q: searchTerms[category] || 'educational videos',
      type: 'video',
      maxResults: maxResults,
      order: 'viewCount',
      safeSearch: 'strict',
      key: YOUTUBE_API_KEY
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      return res.status(500).json({ error: 'YouTube API error' });
    }

    const videos = (data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt
    }));

    res.json({ videos });
  } catch (err) {
    console.error('YouTube trending error:', err);
    res.status(500).json({ error: 'Failed to fetch trending videos' });
  }
});

module.exports = router;
