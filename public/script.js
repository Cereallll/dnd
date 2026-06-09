// Game Board State
let boardState = {
  background: null,
  gridSize: 40,
  characters: []
};

let selectedToken = null;
let draggingToken = null;
let dragOffset = { x: 0, y: 0 };
let currentEditingCharacterId = null;

const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
const tokensContainer = document.getElementById('characterTokens');
const modal = document.getElementById('characterModal');
const closeBtn = document.querySelector('.close');
const saveBtn = document.getElementById('saveCharacterBtn');
const cancelBtn = document.getElementById('cancelCharacterBtn');

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
  const maxHP = parseInt(document.getElementById('characterHP').value) || 10;
  const ac = parseInt(document.getElementById('characterAC').value) || 10;

  if (!name) {
    alert('Please enter a character name');
    return;
  }

  try {
    const response = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: Math.random() * (canvas.width - 80),
        y: Math.random() * (canvas.height - 100),
        name,
        color,
        maxHP,
        currentHP: maxHP,
        ac,
        initiative: 0,
        status: 'active'
      })
    });
    const character = await response.json();
    boardState.characters.push(character);
    document.getElementById('characterName').value = '';
    document.getElementById('characterHP').value = '10';
    document.getElementById('characterAC').value = '10';
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
    if (char.status === 'dead') token.classList.add('dead');
    if (char.status === 'unconscious') token.classList.add('unconscious');
    
    token.style.left = char.x + 'px';
    token.style.top = char.y + 'px';
    token.style.backgroundColor = char.color;
    token.setAttribute('data-id', char.id);
    token.setAttribute('data-name', char.name);

    const hpPercent = (char.currentHP / char.maxHP) * 100;
    const hpColor = hpPercent > 50 ? '#4caf50' : hpPercent > 25 ? '#ff9800' : '#f44336';

    token.innerHTML = `
      <div class="character-name">${char.name.substring(0, 11)}</div>
      <div class="character-hp-bar">
        <div class="character-hp-fill" style="width: ${hpPercent}%; background: ${hpColor};"></div>
      </div>
      <div class="character-stats">
        <div class="stat-hp">${char.currentHP}/${char.maxHP} HP</div>
        <div class="stat-ac">AC ${char.ac}</div>
      </div>
    `;

    // Drag functionality
    token.addEventListener('mousedown', (e) => {
      if (e.button === 0 && e.detail === 1) startDrag(e);
    });
    
    // Click to edit (double-click)
    token.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openCharacterEditor(char.id);
    });
    
    // Right-click to delete
    token.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      deleteCharacter(char.id);
    });

    // Scroll to damage/heal
    token.addEventListener('wheel', (e) => {
      e.preventDefault();
      damageCharacter(char.id, e.deltaY > 0 ? 1 : -1);
    });

    tokensContainer.appendChild(token);
  });
}

// Drag functionality
function startDrag(e) {
  draggingToken = e.target.closest('.character-token');
  if (!draggingToken) return;
  
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
  x = Math.max(0, Math.min(x, canvas.width - 80));
  y = Math.max(0, Math.min(y, canvas.height - 100));

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

// Damage character
async function damageCharacter(id, amount) {
  const character = boardState.characters.find(c => c.id === id);
  if (!character) return;

  character.currentHP = Math.max(0, Math.min(character.maxHP, character.currentHP + amount));

  try {
    await fetch(`/api/characters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        currentHP: character.currentHP,
        x: character.x,
        y: character.y
      })
    });
  } catch (error) {
    console.error('Error updating HP:', error);
  }

  renderCharacters();
}

// Character Editor Modal
function openCharacterEditor(id) {
  currentEditingCharacterId = id;
  const character = boardState.characters.find(c => c.id === id);
  if (!character) return;

  document.getElementById('modalCharacterName').value = character.name;
  document.getElementById('modalCurrentHP').value = character.currentHP;
  document.getElementById('modalMaxHP').value = character.maxHP;
  document.getElementById('modalAC').value = character.ac;
  document.getElementById('modalInitiative').value = character.initiative || 0;
  document.getElementById('modalStatus').value = character.status || 'active';

  updateHPPreview();
  modal.classList.add('show');
}

// HP Preview Update
function updateHPPreview() {
  const currentHP = parseInt(document.getElementById('modalCurrentHP').value) || 0;
  const maxHP = parseInt(document.getElementById('modalMaxHP').value) || 1;
  const percent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
  const fill = document.getElementById('previewHPFill');
  
  let bgColor = percent > 50 ? '#4caf50' : percent > 25 ? '#ff9800' : '#f44336';
  fill.style.width = percent + '%';
  fill.style.background = `linear-gradient(90deg, ${bgColor}, ${adjustBrightness(bgColor, -20)})`;
  fill.textContent = `${currentHP}/${maxHP}`;
}

function adjustBrightness(color, percent) {
  const num = parseInt(color.replace('#',''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
    (G<255?G<1?0:G:255)*0x100 +
    (B<255?B<1?0:B:255))
    .toString(16).slice(1);
}

// HP Quick buttons
document.addEventListener('keyup', updateHPPreview);
document.addEventListener('change', updateHPPreview);
document.addEventListener('input', updateHPPreview);

if (document.getElementById('hpMinus5')) {
  document.getElementById('hpMinus5').addEventListener('click', () => {
    const input = document.getElementById('modalCurrentHP');
    input.value = Math.max(0, parseInt(input.value) - 5);
    updateHPPreview();
  });

  document.getElementById('hpMinus1').addEventListener('click', () => {
    const input = document.getElementById('modalCurrentHP');
    input.value = Math.max(0, parseInt(input.value) - 1);
    updateHPPreview();
  });

  document.getElementById('hpPlus1').addEventListener('click', () => {
    const input = document.getElementById('modalCurrentHP');
    const maxInput = document.getElementById('modalMaxHP');
    const max = parseInt(maxInput.value);
    input.value = Math.min(max, parseInt(input.value) + 1);
    updateHPPreview();
  });

  document.getElementById('hpPlus5').addEventListener('click', () => {
    const input = document.getElementById('modalCurrentHP');
    const maxInput = document.getElementById('modalMaxHP');
    const max = parseInt(maxInput.value);
    input.value = Math.min(max, parseInt(input.value) + 5);
    updateHPPreview();
  });
}

closeBtn.addEventListener('click', () => {
  modal.classList.remove('show');
});

cancelBtn.addEventListener('click', () => {
  modal.classList.remove('show');
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('show');
  }
});

saveBtn.addEventListener('click', async () => {
  if (!currentEditingCharacterId) return;

  const character = boardState.characters.find(c => c.id === currentEditingCharacterId);
  if (!character) return;

  const newData = {
    name: document.getElementById('modalCharacterName').value,
    currentHP: parseInt(document.getElementById('modalCurrentHP').value),
    maxHP: parseInt(document.getElementById('modalMaxHP').value),
    ac: parseInt(document.getElementById('modalAC').value),
    initiative: parseFloat(document.getElementById('modalInitiative').value),
    status: document.getElementById('modalStatus').value,
    x: character.x,
    y: character.y
  };

  try {
    await fetch(`/api/characters/${currentEditingCharacterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData)
    });

    Object.assign(character, newData);
    renderCharacters();
    modal.classList.remove('show');
  } catch (error) {
    console.error('Error updating character:', error);
    alert('Error updating character');
  }
});

// Initialize
loadBoardState();
