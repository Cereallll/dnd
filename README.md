# D&D Interactive Battle Board

An interactive web-based battle board for D&D campaigns with drag-and-drop character tokens and uploadable backgrounds.

## Features

✨ **Interactive Grid Board**
- Configurable grid size (customize square dimensions)
- Snap-to-grid character movement
- Visual grid overlay

🎨 **Custom Backgrounds**
- Upload battle map images
- Support for any image format
- Backgrounds automatically scaled to fit

🧙 **Character Tokens**
- Add named character tokens with custom colors
- Drag-and-drop movement
- Right-click to remove characters
- Hover tooltips show character names

## Installation

1. **Clone or navigate to the repository**
   ```bash
   cd dnd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## How to Use

### Upload a Background
1. Click on a background image file using the "Upload Background" button
2. The image will be scaled to fit the board

### Add Character Tokens
1. Enter a character name (max 20 characters)
2. Choose a color using the color picker
3. Click "Add Character Token"
4. The token will appear at a random position on the board

### Move Characters
1. Click and drag any character token to move it
2. Movement snaps to the grid automatically
3. Release to drop the character

### Remove Characters
1. Right-click on a character token
2. Confirm deletion

### Adjust Grid
1. Change the grid square size (20-100 pixels)
2. Click "Update Grid"
3. All movements will snap to the new grid size

## Project Structure

```
dnd/
├── server.js           # Express backend server
├── package.json        # Dependencies
├── public/
│   ├── index.html      # Main page
│   ├── styles.css      # Styling
│   └── script.js       # Game logic
├── uploads/            # Uploaded background images
└── README.md           # This file
```

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **File Upload**: Multer

## API Endpoints

### Board State
- `GET /api/board-state` - Get current board state

### Background
- `POST /api/upload-background` - Upload a background image

### Characters
- `POST /api/characters` - Add a new character
- `PUT /api/characters/:id` - Update character position
- `DELETE /api/characters/:id` - Delete a character

### Grid
- `PUT /api/grid-size` - Update grid size

## Future Enhancements

- [ ] Save/load board states
- [ ] Multiple layers (NPCs, terrain, obstacles)
- [ ] Measurement tool for distances
- [ ] Dice roller integration
- [ ] Chat system for players
- [ ] Database persistence
- [ ] Multi-player support with WebSockets
- [ ] Export board as image

## License

MIT
