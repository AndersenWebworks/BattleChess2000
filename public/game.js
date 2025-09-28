// BattleChess2000 MVP - Game Logic & Client
// The First Tactical Card Battler - Mobile + Multiplayer

class BattleChess2000 {
    constructor() {
        this.socket = io();
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = null;
        this.playerIndex = null;
        this.selectedUnit = null;
        this.selectedCard = null;

        // Unit definitions (MVP)
        this.unitTypes = {
            SCOUT: { hp: 60, attack: 30, movement: 2, weapon: 'SWORD', cost: 1, color: '#4CAF50' },
            ARCHER: { hp: 80, attack: 60, movement: 1, weapon: 'BOW', cost: 3, color: '#2196F3' },
            KNIGHT: { hp: 150, attack: 90, movement: 1, weapon: 'LANCE', cost: 5, color: '#FF9800' }
        };

        // Weapon triangle
        this.weaponAdvantage = {
            SWORD: 'BOW',
            BOW: 'LANCE',
            LANCE: 'SWORD'
        };

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupUI();
        this.setupSocketEvents();
        this.setupInputHandlers();
        this.showMainMenu();
    }

    setupCanvas() {
        // Make canvas responsive
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
    }

    resizeCanvas() {
        const container = document.querySelector('.game-board-container');
        const maxWidth = container.clientWidth - 20;
        const maxHeight = container.clientHeight - 20;

        // Keep square aspect ratio for 4x4 grid
        const size = Math.min(maxWidth, maxHeight, 400);

        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';

        // Set actual canvas resolution (for crisp rendering)
        this.canvas.width = size;
        this.canvas.height = size;

        this.tileSize = size / 4; // 4x4 grid

        if (this.gameState) {
            this.render();
        }
    }

    setupUI() {
        // Connection status indicator
        this.updateConnectionStatus(false);

        // Menu buttons
        document.getElementById('findMatchBtn').onclick = () => this.findMatch();
        document.getElementById('howToPlayBtn').onclick = () => this.showHowToPlay();
        document.getElementById('backToMenuBtn').onclick = () => this.showMainMenu();
        document.getElementById('cancelSearchBtn').onclick = () => this.cancelSearch();
        document.getElementById('playAgainBtn').onclick = () => this.findMatch();
        document.getElementById('mainMenuBtn').onclick = () => this.showMainMenu();
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.updateConnectionStatus(true);
            document.getElementById('gameStatus').textContent = 'Connected';
            document.getElementById('debugInfo').textContent = `Debug: Connected (${this.socket.id})`;
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
            document.getElementById('gameStatus').textContent = 'Disconnected';
        });

        this.socket.on('searching', (data) => {
            console.log('🔍 Searching for opponent:', data);
            document.getElementById('gameStatus').textContent = 'Searching...';
            this.showSearchingMenu();
        });

        this.socket.on('gameStarted', (data) => {
            console.log('🎮 Game started:', data);
            this.gameState = data.gameState;
            this.playerIndex = data.yourPlayerIndex;
            this.playerName = data.yourName;
            this.opponentName = data.opponentName;

            console.log(`You are: ${this.playerName}`);
            console.log(`Opponent: ${this.opponentName}`);

            this.hideAllMenus();
            this.updateGameState();
            this.render();
        });

        this.socket.on('gameUpdate', (newGameState) => {
            console.log('🔄 Game state updated:', newGameState);
            this.gameState = newGameState;
            this.updateGameState();
            this.render();
        });

        this.socket.on('gameError', (data) => {
            console.log('❌ Game error:', data.message);
            alert(data.message); // Simple error display for MVP
        });

        // Test message for validation
        this.socket.on('testMessage', (data) => {
            console.log('Test message received:', data);
        });
    }

    setupInputHandlers() {
        // Touch and mouse events for canvas
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const clickEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            this.handleCanvasClick(clickEvent);
        });

        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleCanvasClick(e) {
        if (!this.gameState) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        const tileIndex = tileY * 4 + tileX;

        console.log(`Clicked tile ${tileX}, ${tileY} (index ${tileIndex})`);

        // Handle card playing
        if (this.selectedCard !== null) {
            this.tryPlayCard(tileIndex);
        }
    }

    tryPlayCard(tileIndex) {
        // Check if it's player's turn
        if (this.gameState.currentTurn !== this.playerIndex) {
            console.log('❌ Not your turn!');
            return;
        }

        // Check if tile is in player's spawn zone
        const isValidSpawn = this.isValidSpawnZone(tileIndex);
        if (!isValidSpawn) {
            console.log('❌ You can only spawn units in your spawn zone!');
            return;
        }

        // Check if tile is empty
        if (this.gameState.board[tileIndex] !== null) {
            console.log('❌ Tile already occupied!');
            return;
        }

        const player = this.gameState.players[this.playerIndex];
        const card = player.hand[this.selectedCard];

        console.log(`🎯 Playing card: ${card.type} at tile ${tileIndex}`);

        // Send play card event to server
        this.socket.emit('playCard', {
            cardIndex: this.selectedCard,
            tileIndex: tileIndex
        });

        // Clear selection
        this.selectedCard = null;
        document.querySelectorAll('.card').forEach(card => {
            card.style.transform = '';
            card.classList.remove('selected');
        });
        this.render();
    }

    isValidSpawnZone(tileIndex) {
        // Player 0 spawn zone: row 3 (tiles 12-15)
        // Player 1 spawn zone: row 0 (tiles 0-3)

        if (this.playerIndex === 0) {
            return tileIndex >= 12 && tileIndex <= 15; // Bottom row
        } else {
            return tileIndex >= 0 && tileIndex <= 3;   // Top row
        }
    }

    findMatch() {
        console.log('🎮 Finding match...');
        console.log('Socket connected:', this.socket.connected);

        if (!this.socket.connected) {
            alert('Not connected to server! Please refresh.');
            return;
        }

        this.socket.emit('findMatch');
        console.log('✅ findMatch event sent to server');
        this.showSearchingMenu();
    }

    cancelSearch() {
        console.log('Cancelling search...');
        // TODO: Implement cancel search
        this.showMainMenu();
    }

    // UI Management
    showMainMenu() {
        this.hideAllMenus();
        document.getElementById('mainMenu').classList.remove('hidden');
    }

    showHowToPlay() {
        this.hideAllMenus();
        document.getElementById('howToPlayMenu').classList.remove('hidden');
    }

    showSearchingMenu() {
        this.hideAllMenus();
        document.getElementById('searchingMenu').classList.remove('hidden');
    }

    showGameOverMenu(winner) {
        this.hideAllMenus();
        const gameOverMenu = document.getElementById('gameOverMenu');
        const title = document.getElementById('gameOverTitle');
        const subtitle = document.getElementById('gameOverSubtitle');

        if (winner === this.playerIndex) {
            title.textContent = 'Victory!';
            subtitle.textContent = 'You have proven your tactical superiority!';
        } else {
            title.textContent = 'Defeat';
            subtitle.textContent = 'Your opponent has outmaneuvered you.';
        }

        gameOverMenu.classList.remove('hidden');
    }

    hideAllMenus() {
        document.querySelectorAll('.menu-screen').forEach(menu => {
            menu.classList.add('hidden');
        });
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connectionStatus');
        status.classList.toggle('connected', connected);
    }

    updateGameState() {
        if (!this.gameState) return;

        const player = this.gameState.players[this.playerIndex];

        // Update mana display
        document.getElementById('manaDisplay').textContent = `Mana: ${player.mana}/${player.maxMana}`;

        // Update game status with turn number and phase
        const isMyTurn = this.gameState.currentTurn === this.playerIndex;
        const phase = this.gameState.currentPhase || 'CARD';
        const turnText = isMyTurn ? 'Your Turn' : 'Opponent\'s Turn';
        const phaseText = phase === 'CARD' ? 'Card Phase' : phase === 'MOVEMENT' ? 'Move Phase' : 'Combat Phase';

        document.getElementById('gameStatus').textContent = `${turnText} - ${phaseText}`;

        // Update player info
        if (this.playerName && this.opponentName) {
            document.getElementById('playerInfo').textContent = `${this.playerName} vs ${this.opponentName}`;
        }

        // Update hand
        this.updateHand();
    }

    updateHand() {
        const hand = document.getElementById('gameHand');
        const player = this.gameState.players[this.playerIndex];

        hand.innerHTML = '';

        player.hand.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index);
            hand.appendChild(cardElement);
        });
    }

    createCardElement(card, index) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.dataset.cardIndex = index;

        const unitData = this.unitTypes[card.type];
        const canPlay = this.gameState.players[this.playerIndex].mana >= card.cost;

        if (!canPlay) {
            cardDiv.classList.add('disabled');
        }

        cardDiv.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-name">${card.type}</div>
            <div class="card-stats">${unitData.hp}❤️ ${unitData.attack}⚔️</div>
        `;

        cardDiv.addEventListener('click', () => {
            if (canPlay) {
                this.selectCard(index);
            }
        });

        return cardDiv;
    }

    selectCard(index) {
        // Check if it's player's turn
        if (this.gameState.currentTurn !== this.playerIndex) {
            console.log('Not your turn!');
            return;
        }

        const player = this.gameState.players[this.playerIndex];
        const card = player.hand[index];

        // Check if player has enough mana
        if (player.mana < card.cost) {
            console.log(`Not enough mana! Need ${card.cost}, have ${player.mana}`);
            return;
        }

        // Remove previous selection
        document.querySelectorAll('.card').forEach(card => {
            card.style.transform = '';
            card.classList.remove('selected');
        });

        // Highlight selected card
        const cardElement = document.querySelector(`[data-card-index="${index}"]`);
        cardElement.style.transform = 'translateY(-10px)';
        cardElement.classList.add('selected');

        this.selectedCard = index;
        console.log(`✅ Selected card ${index}:`, card);
        console.log('💡 Now click on your spawn zone to place the unit!');

        // Re-render to show spawn zone highlights
        this.render();
    }

    // Canvas Rendering
    render() {
        if (!this.gameState) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();
        this.drawUnits();
        this.drawUI();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;

        // Draw grid lines
        for (let i = 0; i <= 4; i++) {
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.tileSize, 0);
            this.ctx.lineTo(i * this.tileSize, this.canvas.height);
            this.ctx.stroke();

            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.tileSize);
            this.ctx.lineTo(this.canvas.width, i * this.tileSize);
            this.ctx.stroke();
        }

        // Draw spawn zones
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.2)'; // Green for player 1
        this.ctx.fillRect(0, 3 * this.tileSize, this.canvas.width, this.tileSize);

        this.ctx.fillStyle = 'rgba(244, 67, 54, 0.2)'; // Red for player 2
        this.ctx.fillRect(0, 0, this.canvas.width, this.tileSize);

        // Label spawn zones
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${this.tileSize / 8}px Arial`;
        this.ctx.textAlign = 'center';

        if (this.playerIndex === 0) {
            this.ctx.fillText('YOUR SPAWN', this.canvas.width / 2, 3.5 * this.tileSize);
            this.ctx.fillText('ENEMY SPAWN', this.canvas.width / 2, 0.5 * this.tileSize);
        } else {
            this.ctx.fillText('ENEMY SPAWN', this.canvas.width / 2, 3.5 * this.tileSize);
            this.ctx.fillText('YOUR SPAWN', this.canvas.width / 2, 0.5 * this.tileSize);
        }
    }

    drawUnits() {
        // TODO: Draw units on board (will implement when unit spawning is ready)
        this.gameState.board.forEach((unit, index) => {
            if (unit) {
                const x = (index % 4) * this.tileSize;
                const y = Math.floor(index / 4) * this.tileSize;
                this.drawUnit(unit, x, y);
            }
        });
    }

    drawUnit(unit, x, y) {
        const centerX = x + this.tileSize / 2;
        const centerY = y + this.tileSize / 2;
        const radius = this.tileSize / 3;

        const unitData = this.unitTypes[unit.type];

        // Unit circle
        this.ctx.fillStyle = unitData.color;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        // Unit border
        this.ctx.strokeStyle = unit.owner === this.playerIndex ? '#4CAF50' : '#F44336';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Unit type text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${this.tileSize / 8}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(unit.type[0], centerX, centerY + 5);

        // HP bar
        const barWidth = this.tileSize * 0.8;
        const barHeight = 6;
        const barX = centerX - barWidth / 2;
        const barY = y + this.tileSize - 15;

        const hpPercent = unit.currentHp / unit.maxHp;

        // HP background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // HP fill
        this.ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.2 ? '#FF9800' : '#F44336';
        this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // HP text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${this.tileSize / 12}px Arial`;
        this.ctx.fillText(`${unit.currentHp}/${unit.maxHp}`, centerX, barY - 2);
    }

    drawUI() {
        // Additional UI elements can be drawn here
        if (this.selectedCard !== null) {
            // Draw spawn zone highlights for selected card
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';

            // Highlight spawn zones where card can be played
            if (this.playerIndex === 0) {
                this.ctx.fillRect(0, 3 * this.tileSize, this.canvas.width, this.tileSize);
            } else {
                this.ctx.fillRect(0, 0, this.canvas.width, this.tileSize);
            }
        }
    }

    // Test function for multiplayer validation
    sendTestMessage() {
        this.socket.emit('testMessage', {
            message: 'Hello from BattleChess2000!',
            timestamp: new Date().toISOString()
        });
        console.log('🧪 Test message sent');
    }

    // Debug function to test findMatch manually
    testFindMatch() {
        console.log('🧪 Manual findMatch test');
        this.findMatch();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 BattleChess2000 MVP Loading...');
    console.log('📱 Mobile-optimized Tactical Card Battler');
    console.log('🎮 The first of its kind!');

    window.game = new BattleChess2000();

    // Test multiplayer functionality
    setTimeout(() => {
        window.game.sendTestMessage();
    }, 1000);
});