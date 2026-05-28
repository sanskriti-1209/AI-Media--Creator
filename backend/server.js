const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// API to generate image link
app.post('/api/generate-image', (req, res) => {
    const { prompt } = req.body;
    const randomSeed = Math.floor(Math.random() * 100000);
    // Free AI Image API
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${randomSeed}`;
    
    console.log("Generating for:", prompt);
    res.json({ imageUrl: imageUrl });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
});