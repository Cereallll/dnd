// Game Board State
let boardState = {
  background: null,
  gridSize: 40,
  characters: []
};

let selectedToken = null;
let draggingToken = null;
let dragOffset = { x: 0, y: 0 };

const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
const tokensContainer = document.getElementById('characterTokens');

// Resize canvas to fit container
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  drawBoard();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Draw grid and background
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background image if exists
  if (boardState.background) {
    const img = new Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawGrid();
    };
    img.src = boardState.background;
  } else {
    // Default beige background
    ctx.fillStyle = '#f5deb3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
  }
}

function drawGrid() {
  const gridSize = boardState.gridSize;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Load board state from server
async function loadBoardState() {
  try {
    const response = await fetch('/api/board-state');
    boardState = await response.json();
    drawBoard();
    renderCharacters();
  } catch (error) {
    console.error('Error loading board state:', error);
  }
}

// Upload background image
document.getElementById('uploadBtn').addEventListener('click', async () => {
  const input = document.getElementById('backgroundInput');
  const file = input.files[0];

  if (!file) {
    alert('Please select an image file');
    return;
  }

  const formData = new FormData();
  formData.append('background', file);

  try {
    const response = await fetch('/api/upload-background', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (data.success) {
      boardState.background = data.backgroundUrl;
      drawBoard();
      input.value = '';
      alert('Background uploaded successfully!');
    }
  } catch (error) {
    console.error('Error uploading background:', error);
    alert('Error uploading background');
  }
});

// Add character token
document.getElementById('addCharacterBtn').addEventListener('click', async () => {
  const name = document.getElementById('characterName').value.trim();
  const color = document.getElementById('characterColor').value;

  if (!name) {
    alert('Please enter a character name');
    return;
  }

  try {
    const response = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: Math.random() * (canvas.width - 50),
        y: Math.random() * (canvas.height - 50),
        name,
        color
      })
    });
    const character = await response.json();
    boardState.characters.push(character);
    document.getElementById('characterName').value = '';
    renderCharacters();
  } catch (error) {
    console.error('Error adding character:', error);
    alert('Error adding character');
  }
});

// Update grid size
document.getElementById('updateGridBtn').addEventListener('click', () => {
  const gridSize = parseInt(document.getElementById('gridSize').value);
  if (gridSize < 20 || gridSize > 100) {
    alert('Grid size must be between 20 and 100 pixels');
    return;
  }
  boardState.gridSize = gridSize;
  drawBoard();
});

// Render character tokens
function renderCharacters() {
  tokensContainer.innerHTML = '';
  boardState.characters.forEach(char => {
    const token = document.createElement('div');
    token.className = 'character-token';
    token.style.left = char.x + 'px';
    token.style.top = char.y + 'px';
    token.style.backgroundColor = char.color;
    token.setAttribute('data-id', char.id);
    token.setAttribute('data-name', char.name);
    token.textContent = char.name.charAt(0).toUpperCase();

    // Drag functionality
    token.addEventListener('mousedown', startDrag);
    token.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      deleteCharacter(char.id);
    });

    tokensContainer.appendChild(token);
  });
}

// Drag functionality
function startDrag(e) {
  draggingToken = e.target;
  draggingToken.classList.add('dragging');
  const rect = draggingToken.getBoundingClientRect();
  const containerRect = canvas.parentElement.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;

  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
  if (!draggingToken) return;
  const containerRect = canvas.parentElement.getBoundingClientRect();
  let x = e.clientX - containerRect.left - dragOffset.x;
  let y = e.clientY - containerRect.top - dragOffset.y;

  // Snap to grid
  const gridSize = boardState.gridSize;
  x = Math.round(x / gridSize) * gridSize;
  y = Math.round(y / gridSize) * gridSize;

  // Clamp to canvas
  x = Math.max(0, Math.min(x, canvas.width - 50));
  y = Math.max(0, Math.min(y, canvas.height - 50));

  draggingToken.style.left = x + 'px';
  draggingToken.style.top = y + 'px';
}

async function stopDrag() {
  if (!draggingToken) return;

  const id = draggingToken.getAttribute('data-id');
  const x = parseInt(draggingToken.style.left);
  const y = parseInt(draggingToken.style.top);

  try {
    await fetch(`/api/characters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y })
    });
  } catch (error) {
    console.error('Error updating character position:', error);
  }

  draggingToken.classList.remove('dragging');
  draggingToken = null;
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
}

// Delete character
async function deleteCharacter(id) {
  if (!confirm('Remove this character?')) return;

  try {
    await fetch(`/api/characters/${id}`, { method: 'DELETE' });
    boardState.characters = boardState.characters.filter(c => c.id !== id);
    renderCharacters();
  } catch (error) {
    console.error('Error deleting character:', error);
  }
}

// Initialize
loadBoardState();
