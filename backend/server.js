const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const fetchStream = (url, opts = {}) =>
  axios.get(url, { responseType: 'stream', timeout: 20000, maxRedirects: 5, ...opts });

const fetchAndPipe = async (prompt, res) => {
  // 1) Pollinations (may be rate-limited / paid)
  try {
    const seed = Math.floor(Math.random() * 100000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`;
    console.log('Trying Pollinations:', pollinationsUrl);
    const r = await fetchStream(pollinationsUrl);
    res.setHeader('Content-Type', r.headers['content-type'] || 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    r.data.pipe(res);
    return;
  } catch (err) {
    console.warn('Pollinations failed:', err?.response?.status || err.message);
  }

  // 2) Pexels (recommended) - requires PEXELS_API_KEY in .env
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      console.log('Trying Pexels for:', prompt);
      const pex = await axios.get('https://api.pexels.com/v1/search', {
        headers: { Authorization: pexelsKey },
        params: { query: prompt, per_page: 1 }
      });
      const photo = pex.data?.photos?.[0];
      if (photo && (photo.src?.large || photo.src?.original || photo.src?.medium)) {
        const imgUrl = photo.src.large || photo.src.original || photo.src.medium;
        const streamResp = await fetchStream(imgUrl);
        res.setHeader('Content-Type', streamResp.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'no-cache');
        streamResp.data.pipe(res);
        return;
      }
      console.log('Pexels returned no results.');
    } catch (e) {
      console.warn('Pexels failed:', e.message || e);
    }
  } else {
    console.log('PEXELS_API_KEY not set; skipping Pexels fallback.');
  }

  // 3) Unsplash official API fallback - requires UNSPLASH_ACCESS_KEY in .env
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      console.log('Trying Unsplash API for:', prompt);
      const us = await axios.get('https://api.unsplash.com/search/photos', {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
        params: { query: prompt, per_page: 1 }
      });
      const photo = us.data?.results?.[0];
      if (photo && (photo.urls?.regular || photo.urls?.full || photo.urls?.small)) {
        const imgUrl = photo.urls.regular || photo.urls.full || photo.urls.small;
        const streamResp = await fetchStream(imgUrl);
        res.setHeader('Content-Type', streamResp.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'no-cache');
        streamResp.data.pipe(res);
        return;
      }
      console.log('Unsplash API returned no results.');
    } catch (e) {
      console.warn('Unsplash API failed:', e.message || e);
    }
  } else {
    console.log('UNSPLASH_ACCESS_KEY not set; skipping Unsplash API fallback.');
  }

  // 4) source.unsplash (redirect) - unreliable but sometimes works
  try {
    console.log('Trying source.unsplash for:', prompt);
    const srcUrl = `https://source.unsplash.com/512x512/?${encodeURIComponent(prompt)}`;
    const r = await fetchStream(srcUrl);
    res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache');
    r.data.pipe(res);
    return;
  } catch (e) {
    console.warn('source.unsplash failed:', e.message || e);
  }

  // 5) picsum as last resort (generic placeholder)
  try {
    console.log('Using picsum placeholder for:', prompt);
    const picsumUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt)}/512`;
    const r = await fetchStream(picsumUrl);
    res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache');
    r.data.pipe(res);
    return;
  } catch (e) {
    console.error('picsum failed:', e.message || e);
  }

  if (!res.headersSent) res.status(502).json({ error: 'All image providers failed' });
};

app.post(['/generate-image', '/api/generate-image'], async (req, res) => {
  const prompt = (req.body && req.body.prompt) || req.query.prompt;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  await fetchAndPipe(prompt, res);
});

// Optional: generate-video endpoint (uses Pexels if available, otherwise returns sample)
app.post('/generate-video', async (req, res) => {
  const prompt = (req.body && req.body.prompt) || req.query.prompt;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      console.log('Searching Pexels videos for:', prompt);
      const pex = await axios.get('https://api.pexels.com/videos/search', {
        headers: { Authorization: pexelsKey },
        params: { query: prompt, per_page: 1 }
      });
      const video = pex.data?.videos?.[0];
      if (video && video.video_files && video.video_files.length > 0) {
        const file = video.video_files.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        if (file && file.link) return res.json({ videoUrl: file.link });
      }
      console.log('Pexels returned no videos for:', prompt);
    } catch (err) {
      console.warn('Pexels video search failed:', err?.response?.status || err.message);
    }
  } else {
    console.log('PEXELS_API_KEY not set; skipping Pexels video search.');
  }

  // fallback sample video
  const fallback = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
  res.json({ videoUrl: fallback });
});

app.get('/', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});