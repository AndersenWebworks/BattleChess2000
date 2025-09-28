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
        document.getElementById('endPhaseBtn').onclick = () => this.endPhase();
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
            // Show phase control in game
            document.querySelector('.phase-control').classList.add('game-active');
            this.inGame = true;
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

        this.socket.on('gameOver', (data) => {
            console.log('🏆 Game Over!', data);
            const isWinner = data.winner === this.playerIndex;
            this.showGameOverMenu(isWinner);
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
        const visualIndex = tileY * 4 + tileX;
        const boardIndex = this.visualIndexToBoardIndex(visualIndex);

        console.log(`Clicked visual tile ${tileX}, ${tileY} (visual: ${visualIndex}, board: ${boardIndex})`);

        // Handle different actions based on current phase
        if (this.selectedCard !== null) {
            // Card Phase: Playing cards
            this.tryPlayCard(boardIndex);
        } else if (this.gameState && this.gameState.currentPhase === 'MOVEMENT') {
            this.handleMovementClick(boardIndex);
        } else if (this.gameState && this.gameState.currentPhase === 'COMBAT') {
            this.handleCombatClick(boardIndex);
        } else {
            // Default: Try to select a unit or show info
            this.handleUnitClick(boardIndex);
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

    // Perspective transformation helpers
    boardIndexToVisualIndex(boardIndex) {
        // Convert board index to visual index based on player perspective
        if (this.playerIndex === 0) {
            // Player 0 sees board normally
            return boardIndex;
        } else {
            // Player 1 sees board rotated 180 degrees
            return 15 - boardIndex;
        }
    }

    visualIndexToBoardIndex(visualIndex) {
        // Convert visual index back to board index
        if (this.playerIndex === 0) {
            return visualIndex;
        } else {
            return 15 - visualIndex;
        }
    }

    getVisualPosition(boardIndex) {
        // Get visual x,y coordinates for rendering
        const visualIndex = this.boardIndexToVisualIndex(boardIndex);
        const x = (visualIndex % 4) * this.tileSize;
        const y = Math.floor(visualIndex / 4) * this.tileSize;
        return { x, y };
    }

    handleUnitClick(tileIndex) {
        const unit = this.gameState.board[tileIndex];
        if (unit) {
            console.log(`🎯 Clicked on ${unit.type} (Owner: ${unit.owner}, HP: ${unit.currentHp}/${unit.maxHp})`);

            // In any phase, show unit info
            this.selectedUnit = unit;
            this.selectedUnitIndex = tileIndex;
            this.render();
        } else {
            console.log('📍 Empty tile clicked');
            this.selectedUnit = null;
            this.selectedUnitIndex = null;
            this.render();
        }
    }

    handleMovementClick(tileIndex) {
        // Check if it's player's turn
        if (this.gameState.currentTurn !== this.playerIndex) {
            console.log('❌ Not your turn!');
            return;
        }

        const unit = this.gameState.board[tileIndex];

        if (unit && unit.owner === this.playerIndex) {
            // Selecting own unit for movement
            if (!unit.hasActed) {
                console.log(`🚶 Selected ${unit.type} for movement`);
                this.selectedUnit = unit;
                this.selectedUnitIndex = tileIndex;
                this.showMovementOptions(unit, tileIndex);
            } else {
                console.log(`❌ ${unit.type} has already moved this turn`);
            }
        } else if (this.selectedUnit && this.selectedUnitIndex !== null) {
            // Moving selected unit to new position
            this.tryMoveUnit(this.selectedUnitIndex, tileIndex);
        } else {
            console.log('❌ No unit selected for movement');
        }
    }

    handleCombatClick(tileIndex) {
        // Check if it's player's turn
        if (this.gameState.currentTurn !== this.playerIndex) {
            console.log('❌ Not your turn!');
            return;
        }

        const unit = this.gameState.board[tileIndex];

        if (unit && unit.owner === this.playerIndex && !unit.hasActed) {
            // Selecting own unit for combat
            console.log(`⚔️ Selected ${unit.type} for combat`);
            this.selectedUnit = unit;
            this.selectedUnitIndex = tileIndex;
            this.showAttackOptions(unit, tileIndex);
        } else if (this.selectedUnit && this.selectedUnitIndex !== null) {
            // Attacking with selected unit
            this.tryAttackUnit(this.selectedUnitIndex, tileIndex);
        } else {
            console.log('❌ No unit selected for combat');
        }
    }

    showMovementOptions(unit, fromIndex) {
        console.log(`🔍 Showing movement options for ${unit.type} (Movement: ${unit.movement})`);

        // Calculate valid movement tiles
        this.validMoves = this.calculateValidMoves(fromIndex, unit.movement);

        console.log(`📍 Valid moves: ${this.validMoves.join(', ')}`);
        this.render(); // Re-render to show highlighted tiles
    }

    calculateValidMoves(fromIndex, movementPoints) {
        const validMoves = [];
        const fromX = fromIndex % 4;
        const fromY = Math.floor(fromIndex / 4);

        // Check all tiles within movement range
        for (let dy = -movementPoints; dy <= movementPoints; dy++) {
            for (let dx = -movementPoints; dx <= movementPoints; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy); // Manhattan distance

                if (distance === 0 || distance > movementPoints) continue;

                const toX = fromX + dx;
                const toY = fromY + dy;
                const toIndex = toY * 4 + toX;

                // Check bounds
                if (toX < 0 || toX >= 4 || toY < 0 || toY >= 4) continue;

                // Check if tile is empty
                if (!this.gameState.board[toIndex]) {
                    validMoves.push(toIndex);
                }
            }
        }

        return validMoves;
    }

    tryMoveUnit(fromIndex, toIndex) {
        // Validate move
        if (!this.validMoves || !this.validMoves.includes(toIndex)) {
            console.log('❌ Invalid move target');
            return;
        }

        console.log(`🚶 Moving unit from ${fromIndex} to ${toIndex}`);

        // Send move to server
        this.socket.emit('moveUnit', {
            fromIndex: fromIndex,
            toIndex: toIndex
        });

        // Clear selection
        this.selectedUnit = null;
        this.selectedUnitIndex = null;
        this.validMoves = null;
    }

    showAttackOptions(unit, fromIndex) {
        console.log(`🎯 Showing attack options for ${unit.type} (Weapon: ${unit.weapon})`);

        // Calculate valid attack targets
        this.validTargets = this.calculateValidTargets(fromIndex, unit);

        console.log(`⚔️ Valid targets: ${this.validTargets.join(', ')}`);
        this.render(); // Re-render to show highlighted tiles
    }

    calculateValidTargets(fromIndex, unit) {
        const validTargets = [];
        const fromX = fromIndex % 4;
        const fromY = Math.floor(fromIndex / 4);

        // Different attack ranges based on weapon
        let range = 1; // Default melee range
        if (unit.weapon === 'BOW') {
            range = 2; // Archers have longer range
        }

        // Check all tiles within attack range
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);

                if (distance === 0 || distance > range) continue;

                const toX = fromX + dx;
                const toY = fromY + dy;
                const toIndex = toY * 4 + toX;

                // Check bounds
                if (toX < 0 || toX >= 4 || toY < 0 || toY >= 4) continue;

                // Check if tile has enemy unit
                const target = this.gameState.board[toIndex];
                if (target && target.owner !== this.playerIndex) {
                    validTargets.push(toIndex);
                }
            }
        }

        return validTargets;
    }

    tryAttackUnit(fromIndex, toIndex) {
        // Validate target
        if (!this.validTargets || !this.validTargets.includes(toIndex)) {
            console.log('❌ Invalid attack target');
            return;
        }

        const attacker = this.gameState.board[fromIndex];
        const target = this.gameState.board[toIndex];

        console.log(`⚔️ ${attacker.type} attacking ${target.type}`);

        // Send attack to server
        this.socket.emit('attackUnit', {
            attackerIndex: fromIndex,
            targetIndex: toIndex
        });

        // Clear selection
        this.selectedUnit = null;
        this.selectedUnitIndex = null;
        this.validTargets = null;
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

    endPhase() {
        console.log('🔄 Ending current phase...');

        if (!this.inGame) {
            console.log('❌ Not in a game');
            return;
        }

        // Check if it's my turn
        const isMyTurn = this.gameState && this.gameState.currentTurn === this.playerIndex;
        if (!isMyTurn) {
            console.log('❌ Not your turn');
            return;
        }

        // Send next phase event to server
        this.socket.emit('nextPhase');
    }

    // UI Management
    showMainMenu() {
        this.hideAllMenus();
        // Hide phase control when not in game
        document.querySelector('.phase-control').classList.remove('game-active');
        this.inGame = false;
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

    showGameOverMenu(isWinner) {
        this.hideAllMenus();
        const gameOverMenu = document.getElementById('gameOverMenu');
        const title = document.getElementById('gameOverTitle');
        const subtitle = document.getElementById('gameOverSubtitle');

        if (isWinner) {
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

        // Update End Phase button
        const endPhaseBtn = document.getElementById('endPhaseBtn');
        if (isMyTurn) {
            endPhaseBtn.disabled = false;
            if (phase === 'CARD') {
                endPhaseBtn.textContent = 'Start Movement';
            } else if (phase === 'MOVEMENT') {
                endPhaseBtn.textContent = 'Start Combat';
            } else {
                endPhaseBtn.textContent = 'End Turn';
            }
        } else {
            endPhaseBtn.disabled = true;
            endPhaseBtn.textContent = 'End Phase';
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

        // Add type-specific class for styling
        cardDiv.classList.add(`card-${card.type.toLowerCase()}`);

        if (!canPlay) {
            cardDiv.classList.add('disabled');
        }

        // Get unit-specific symbol and weapon
        let unitSymbol, weaponIcon;
        if (card.type === 'SCOUT') {
            unitSymbol = '🗡';
            weaponIcon = '⚔️';
        } else if (card.type === 'ARCHER') {
            unitSymbol = '🏹';
            weaponIcon = '🎯';
        } else if (card.type === 'KNIGHT') {
            unitSymbol = '🛡';
            weaponIcon = '🗡️';
        }

        cardDiv.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-weapon">${weaponIcon}</div>
            <div class="card-symbol">${unitSymbol}</div>
            <div class="card-name">${card.type}</div>
            <div class="card-stats">${unitData.hp}❤️ ${unitData.attack}⚔️ ${unitData.movement}🏃</div>
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
        this.drawHighlights(); // Draw movement/attack highlights
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

        // Label spawn zones - always show player's spawn at bottom
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${this.tileSize / 8}px Arial`;
        this.ctx.textAlign = 'center';

        // Player's spawn is always visually at the bottom
        this.ctx.fillText('YOUR SPAWN', this.canvas.width / 2, 3.5 * this.tileSize);
        this.ctx.fillText('ENEMY SPAWN', this.canvas.width / 2, 0.5 * this.tileSize);
    }

    drawHighlights() {
        // Highlight selected unit
        if (this.selectedUnitIndex !== null) {
            const { x, y } = this.getVisualPosition(this.selectedUnitIndex);

            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

            this.ctx.strokeStyle = '#FFFF00';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
        }

        // Highlight valid moves (green)
        if (this.validMoves) {
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            this.validMoves.forEach(boardIndex => {
                const { x, y } = this.getVisualPosition(boardIndex);
                this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

                this.ctx.strokeStyle = '#00FF00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
            });
        }

        // Highlight valid attack targets (red)
        if (this.validTargets) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.validTargets.forEach(boardIndex => {
                const { x, y } = this.getVisualPosition(boardIndex);
                this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

                this.ctx.strokeStyle = '#FF0000';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
            });
        }
    }

    drawUnits() {
        this.gameState.board.forEach((unit, boardIndex) => {
            if (unit) {
                const { x, y } = this.getVisualPosition(boardIndex);
                this.drawUnit(unit, x, y);
            }
        });
    }

    drawUnit(unit, x, y) {
        const centerX = x + this.tileSize / 2;
        const centerY = y + this.tileSize / 2;
        const size = this.tileSize / 3;

        // Different shapes and colors for each unit type
        if (unit.type === 'SCOUT') {
            this.drawScout(centerX, centerY, size, unit);
        } else if (unit.type === 'ARCHER') {
            this.drawArcher(centerX, centerY, size, unit);
        } else if (unit.type === 'KNIGHT') {
            this.drawKnight(centerX, centerY, size, unit);
        }

        // HP bar
        const barWidth = this.tileSize * 0.8;
        const barHeight = 6;
        const barX = centerX - barWidth / 2;
        const barY = y + this.tileSize - 15;

        const hpPercent = unit.currentHp / unit.maxHp;

        // HP background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // HP foreground
        const hpColor = hpPercent > 0.6 ? '#4CAF50' : hpPercent > 0.3 ? '#FF9800' : '#F44336';
        this.ctx.fillStyle = hpColor;
        this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // HP text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${this.tileSize / 12}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${unit.currentHp}/${unit.maxHp}`, centerX, barY - 2);

        // Action indicator
        if (unit.hasActed) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.beginPath();
            if (unit.type === 'SCOUT') {
                this.ctx.arc(centerX, centerY, size, 0, 2 * Math.PI);
            } else if (unit.type === 'ARCHER') {
                this.ctx.moveTo(centerX, centerY - size);
                this.ctx.lineTo(centerX - size, centerY + size);
                this.ctx.lineTo(centerX + size, centerY + size);
                this.ctx.closePath();
            } else if (unit.type === 'KNIGHT') {
                this.ctx.rect(centerX - size, centerY - size, size * 2, size * 2);
            }
            this.ctx.fill();

            this.ctx.fillStyle = '#FFFF00';
            this.ctx.font = `${this.tileSize / 6}px Arial`;
            this.ctx.fillText('✓', centerX, centerY + 3);
        }
    }

    drawScout(centerX, centerY, radius, unit) {
        // Scout: Fast green circle with sword symbol
        const isOwn = unit.owner === this.playerIndex;

        // Main circle - bright green
        this.ctx.fillStyle = isOwn ? '#4CAF50' : '#8BC34A';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        // Border
        this.ctx.strokeStyle = unit.hasActed ? '#2E7D32' : (isOwn ? '#1B5E20' : '#F44336');
        this.ctx.lineWidth = unit.hasActed ? 2 : 3;
        this.ctx.stroke();

        // Sword symbol
        this.ctx.fillStyle = unit.hasActed ? '#CCCCCC' : '#ffffff';
        this.ctx.font = `bold ${radius * 0.8}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🗡', centerX, centerY + radius * 0.3);
    }

    drawArcher(centerX, centerY, size, unit) {
        // Archer: Blue triangle with bow symbol
        const isOwn = unit.owner === this.playerIndex;

        // Triangle shape
        this.ctx.fillStyle = isOwn ? '#2196F3' : '#64B5F6';
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - size);
        this.ctx.lineTo(centerX - size, centerY + size);
        this.ctx.lineTo(centerX + size, centerY + size);
        this.ctx.closePath();
        this.ctx.fill();

        // Border
        this.ctx.strokeStyle = unit.hasActed ? '#1565C0' : (isOwn ? '#0D47A1' : '#F44336');
        this.ctx.lineWidth = unit.hasActed ? 2 : 3;
        this.ctx.stroke();

        // Bow symbol
        this.ctx.fillStyle = unit.hasActed ? '#CCCCCC' : '#ffffff';
        this.ctx.font = `bold ${size * 0.7}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏹', centerX, centerY + size * 0.3);
    }

    drawKnight(centerX, centerY, size, unit) {
        // Knight: Orange square with shield symbol
        const isOwn = unit.owner === this.playerIndex;

        // Square shape
        this.ctx.fillStyle = isOwn ? '#FF9800' : '#FFB74D';
        this.ctx.fillRect(centerX - size, centerY - size, size * 2, size * 2);

        // Border
        this.ctx.strokeStyle = unit.hasActed ? '#E65100' : (isOwn ? '#BF360C' : '#F44336');
        this.ctx.lineWidth = unit.hasActed ? 2 : 3;
        this.ctx.strokeRect(centerX - size, centerY - size, size * 2, size * 2);

        // Shield symbol
        this.ctx.fillStyle = unit.hasActed ? '#CCCCCC' : '#ffffff';
        this.ctx.font = `bold ${size * 0.7}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🛡', centerX, centerY + size * 0.3);
    }

    drawUI() {
        // Additional UI elements can be drawn here
        if (this.selectedCard !== null) {
            // Draw spawn zone highlights for selected card
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';

            // Always highlight bottom row (player's spawn zone visually)
            this.ctx.fillRect(0, 3 * this.tileSize, this.canvas.width, this.tileSize);
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