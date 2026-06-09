const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Store board state in memory (in production, use a database)
let boardState = {
  background: null,
  gridSize: 5, // 5ft squares
  characters: []
};

// Routes

// Upload background image
app.post('/api/upload-background', upload.single('background'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  boardState.background = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    backgroundUrl: boardState.background
  });
});

// Get board state
app.get('/api/board-state', (req, res) => {
  res.json(boardState);
});

// Add character token
app.post('/api/characters', (req, res) => {
  const { x, y, name, color } = req.body;
  const character = {
    id: Date.now().toString(),
    x,
    y,
    name,
    color: color || '#FF6B6B'
  };
  boardState.characters.push(character);
  res.json(character);
});

// Update character position
app.put('/api/characters/:id', (req, res) => {
  const { id } = req.params;
  const { x, y } = req.body;
  
  const character = boardState.characters.find(c => c.id === id);
  if (!character) {
    return res.status(404).json({ error: 'Character not found' });
  }
  
  character.x = x;
  character.y = y;
  res.json(character);
});

// Delete character
app.delete('/api/characters/:id', (req, res) => {
  const { id } = req.params;
  boardState.characters = boardState.characters.filter(c => c.id !== id);
  res.json({ success: true });
});

// Update grid size
app.put('/api/grid-size', (req, res) => {
  const { gridSize } = req.body;
  boardState.gridSize = gridSize;
  res.json({ gridSize: boardState.gridSize });
});

// Start server
app.listen(PORT, () => {
  console.log(`D&D Board server running on http://localhost:${PORT}`);
});
