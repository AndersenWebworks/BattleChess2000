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

        // Animation system
        this.animations = [];
        this.damageNumbers = [];
        this.particles = [];

        // Death animation system
        this.deathAnimations = [];
        this.corpses = [];
        this.weaponDrops = [];
        this.bloodPools = [];

        // Hurt animation system
        this.hurtAnimations = [];

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

            // Check if this is an attack result by comparing HP
            if (this.gameState) {
                this.checkForAttackAnimations(this.gameState, newGameState);
            }

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
        this.drawBloodPools(); // Draw permanent blood pools
        this.drawCorpses(); // Draw dead bodies
        this.drawWeaponDrops(); // Draw dropped weapons
        this.drawUnits();
        this.drawHurtOverlays(); // Draw hurt expressions over units
        this.drawAnimations(); // Draw combat animations
        this.drawDeathAnimations(); // Draw death sequences
        this.drawParticles(); // Draw blood and effects
        this.drawDamageNumbers(); // Draw floating damage numbers
        this.drawUI();

        // Update animations
        this.updateAnimations();

        // Keep rendering if animations are active
        if (this.animations.length > 0 || this.particles.length > 0 ||
            this.damageNumbers.length > 0 || this.deathAnimations.length > 0 ||
            this.hurtAnimations.length > 0) {
            requestAnimationFrame(() => this.render());
        }
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

        // Universal emotional warrior with equipment-based differences
        this.drawEmotionalWarrior(centerX, centerY, size, unit);

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

    // Emotional Warrior System - Base model with facial expressions and equipment
    drawEmotionalWarrior(centerX, centerY, size, unit) {
        const isOwn = unit.owner === this.playerIndex;
        const scale = size / 25;

        // Determine emotional state
        let emotion = 'normal';
        if (unit.hasActed) emotion = 'tired';
        if (unit.currentHp < unit.maxHp * 0.3) emotion = 'hurt';

        // Base warrior body
        this.drawWarriorBody(centerX, centerY, size, isOwn, emotion);

        // Equipment based on unit type
        this.drawWarriorEquipment(centerX, centerY, size, unit.type, isOwn);
    }

    drawWarriorBody(centerX, centerY, size, isOwn, emotion) {
        const scale = size / 25;

        // Colors
        const skinColor = '#FFDBAC'; // Skin tone
        const eyeColor = '#000000';
        const bodyColor = isOwn ? '#4A5568' : '#7A7A7A'; // Base armor color

        // HEAD - Larger and more expressive
        this.ctx.fillStyle = skinColor;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - size * 0.6, size * 0.3, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = Math.max(1, scale);
        this.ctx.stroke();

        // EYES - The key to emotion!
        this.drawWarriorEyes(centerX, centerY - size * 0.6, size, emotion);

        // MOUTH - Emotional expression
        this.drawWarriorMouth(centerX, centerY - size * 0.6, size, emotion);

        // BODY - Rounded torso
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY - size * 0.1, size * 0.25, size * 0.35, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.strokeStyle = isOwn ? '#2D3748' : '#4A5568';
        this.ctx.lineWidth = Math.max(1, scale * 2);
        this.ctx.stroke();

        // ARMS - Rounded
        this.ctx.fillStyle = skinColor;
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = Math.max(1, scale * 1.5);

        // Left arm
        this.ctx.beginPath();
        this.ctx.arc(centerX - size * 0.4, centerY - size * 0.1, size * 0.12, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Right arm
        this.ctx.beginPath();
        this.ctx.arc(centerX + size * 0.4, centerY - size * 0.1, size * 0.12, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // LEGS - Rounded thighs and shins
        // Left leg
        this.ctx.beginPath();
        this.ctx.ellipse(centerX - size * 0.15, centerY + size * 0.35, size * 0.1, size * 0.25, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Right leg
        this.ctx.beginPath();
        this.ctx.ellipse(centerX + size * 0.15, centerY + size * 0.35, size * 0.1, size * 0.25, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // FEET - Simple boots
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(centerX - size * 0.2, centerY + size * 0.55, size * 0.1, size * 0.15);
        this.ctx.fillRect(centerX + size * 0.1, centerY + size * 0.55, size * 0.1, size * 0.15);
    }

    drawWarriorEyes(centerX, centerY, size, emotion) {
        const eyeSize = size * 0.08;
        const eyeOffset = size * 0.1;

        this.ctx.fillStyle = '#FFFFFF';

        if (emotion === 'hurt' || emotion === 'pain') {
            // X-shaped hurt eyes
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;

            // Left eye X
            this.ctx.beginPath();
            this.ctx.moveTo(centerX - eyeOffset - eyeSize/2, centerY - eyeSize/2);
            this.ctx.lineTo(centerX - eyeOffset + eyeSize/2, centerY + eyeSize/2);
            this.ctx.moveTo(centerX - eyeOffset + eyeSize/2, centerY - eyeSize/2);
            this.ctx.lineTo(centerX - eyeOffset - eyeSize/2, centerY + eyeSize/2);
            this.ctx.stroke();

            // Right eye X
            this.ctx.beginPath();
            this.ctx.moveTo(centerX + eyeOffset - eyeSize/2, centerY - eyeSize/2);
            this.ctx.lineTo(centerX + eyeOffset + eyeSize/2, centerY + eyeSize/2);
            this.ctx.moveTo(centerX + eyeOffset + eyeSize/2, centerY - eyeSize/2);
            this.ctx.lineTo(centerX + eyeOffset - eyeSize/2, centerY + eyeSize/2);
            this.ctx.stroke();

        } else if (emotion === 'tired') {
            // Half-closed sleepy eyes
            this.ctx.beginPath();
            this.ctx.ellipse(centerX - eyeOffset, centerY, eyeSize, eyeSize/2, 0, 0, Math.PI);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.ellipse(centerX + eyeOffset, centerY, eyeSize, eyeSize/2, 0, 0, Math.PI);
            this.ctx.fill();

        } else if (emotion === 'shock') {
            // Wide open shocked eyes
            this.ctx.beginPath();
            this.ctx.arc(centerX - eyeOffset, centerY, eyeSize * 1.2, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(centerX + eyeOffset, centerY, eyeSize * 1.2, 0, 2 * Math.PI);
            this.ctx.fill();

            // Large pupils (shocked)
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(centerX - eyeOffset, centerY, eyeSize * 0.7, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(centerX + eyeOffset, centerY, eyeSize * 0.7, 0, 2 * Math.PI);
            this.ctx.fill();

        } else if (emotion === 'dying') {
            // Spiral death eyes
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;

            // Left eye spiral
            this.ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 4;
                const radius = (i / 20) * eyeSize * 0.8;
                const x = centerX - eyeOffset + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();

            // Right eye spiral
            this.ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 4;
                const radius = (i / 20) * eyeSize * 0.8;
                const x = centerX + eyeOffset + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();

        } else {
            // Normal alert eyes
            this.ctx.beginPath();
            this.ctx.arc(centerX - eyeOffset, centerY, eyeSize, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(centerX + eyeOffset, centerY, eyeSize, 0, 2 * Math.PI);
            this.ctx.fill();

            // Pupils
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(centerX - eyeOffset, centerY, eyeSize * 0.5, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(centerX + eyeOffset, centerY, eyeSize * 0.5, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    drawWarriorMouth(centerX, centerY, size, emotion) {
        const mouthY = centerY + size * 0.15;

        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        if (emotion === 'hurt' || emotion === 'pain') {
            // Sad downward mouth
            this.ctx.arc(centerX, mouthY - size * 0.05, size * 0.08, 0.2 * Math.PI, 0.8 * Math.PI);
        } else if (emotion === 'tired') {
            // Neutral small line
            this.ctx.moveTo(centerX - size * 0.05, mouthY);
            this.ctx.lineTo(centerX + size * 0.05, mouthY);
        } else if (emotion === 'shock') {
            // Open shocked mouth (O shape)
            this.ctx.arc(centerX, mouthY, size * 0.06, 0, 2 * Math.PI);
        } else if (emotion === 'dying') {
            // Drooping dying mouth
            this.ctx.arc(centerX, mouthY - size * 0.08, size * 0.1, 0.3 * Math.PI, 0.7 * Math.PI);
        } else {
            // Determined small smile
            this.ctx.arc(centerX, mouthY + size * 0.02, size * 0.06, 1.2 * Math.PI, 1.8 * Math.PI);
        }

        this.ctx.stroke();
    }

    drawWarriorEquipment(centerX, centerY, size, unitType, isOwn) {
        if (unitType === 'SCOUT') {
            this.drawScoutEquipment(centerX, centerY, size, isOwn);
        } else if (unitType === 'ARCHER') {
            this.drawArcherEquipment(centerX, centerY, size, isOwn);
        } else if (unitType === 'KNIGHT') {
            this.drawKnightEquipment(centerX, centerY, size, isOwn);
        }
    }

    drawScoutEquipment(centerX, centerY, size, isOwn) {
        // Light green scout helm
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - size * 0.6, size * 0.32, Math.PI, 2 * Math.PI);
        this.ctx.fill();

        // Small sword at side
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.45, centerY - size * 0.2);
        this.ctx.lineTo(centerX + size * 0.45, centerY + size * 0.15);
        this.ctx.stroke();

        // Sword hilt
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.4, centerY + size * 0.15);
        this.ctx.lineTo(centerX + size * 0.5, centerY + size * 0.15);
        this.ctx.stroke();
    }

    drawArcherEquipment(centerX, centerY, size, isOwn) {
        // Blue archer helm with feather
        this.ctx.fillStyle = '#2196F3';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - size * 0.6, size * 0.32, Math.PI, 2 * Math.PI);
        this.ctx.fill();

        // Feather on helm
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.2, centerY - size * 0.8);
        this.ctx.lineTo(centerX + size * 0.15, centerY - size * 0.9);
        this.ctx.stroke();

        // Bow on left shoulder
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(centerX - size * 0.5, centerY - size * 0.2, size * 0.25, -Math.PI/3, Math.PI/3, false);
        this.ctx.stroke();

        // Quiver on back
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(centerX + size * 0.25, centerY - size * 0.4, size * 0.12, size * 0.3);

        // Arrow tips sticking out
        for (let i = 0; i < 3; i++) {
            const arrowX = centerX + size * 0.27 + i * size * 0.03;
            const arrowY = centerY - size * 0.42;
            this.ctx.fillStyle = '#C0C0C0';
            this.ctx.beginPath();
            this.ctx.arc(arrowX, arrowY, size * 0.02, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    drawKnightEquipment(centerX, centerY, size, isOwn) {
        // Heavy orange helm with visor
        this.ctx.fillStyle = '#FF9800';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - size * 0.6, size * 0.35, Math.PI, 2 * Math.PI);
        this.ctx.fill();

        // Visor line
        this.ctx.strokeStyle = '#BF360C';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - size * 0.25, centerY - size * 0.65);
        this.ctx.lineTo(centerX + size * 0.25, centerY - size * 0.65);
        this.ctx.stroke();

        // Shield on left arm
        this.ctx.fillStyle = '#C0C0C0';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX - size * 0.6, centerY - size * 0.1, size * 0.18, size * 0.25, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Shield cross
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - size * 0.6, centerY - size * 0.25);
        this.ctx.lineTo(centerX - size * 0.6, centerY + size * 0.05);
        this.ctx.moveTo(centerX - size * 0.72, centerY - size * 0.1);
        this.ctx.lineTo(centerX - size * 0.48, centerY - size * 0.1);
        this.ctx.stroke();

        // Lance in right hand
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.5, centerY - size * 0.1);
        this.ctx.lineTo(centerX + size * 0.8, centerY - size * 0.6);
        this.ctx.stroke();

        // Lance tip
        this.ctx.fillStyle = '#C0C0C0';
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.8, centerY - size * 0.6);
        this.ctx.lineTo(centerX + size * 0.75, centerY - size * 0.55);
        this.ctx.lineTo(centerX + size * 0.85, centerY - size * 0.55);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawStickFigureBase(centerX, centerY, size, unit) {
        const isOwn = unit.owner === this.playerIndex;
        const scale = size / 20; // Base scale for stick figure

        // Colors based on owner
        const bodyColor = unit.hasActed ? '#666666' : (isOwn ? '#ffffff' : '#ffcccc');
        const outlineColor = isOwn ? '#000000' : '#880000';

        this.ctx.strokeStyle = outlineColor;
        this.ctx.fillStyle = bodyColor;
        this.ctx.lineWidth = Math.max(1, scale * 2);

        // Head (circle)
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - size * 0.6, size * 0.25, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Body (line)
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - size * 0.35);
        this.ctx.lineTo(centerX, centerY + size * 0.2);
        this.ctx.stroke();

        // Arms (lines)
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - size * 0.4, centerY - size * 0.1);
        this.ctx.lineTo(centerX + size * 0.4, centerY - size * 0.1);
        this.ctx.stroke();

        // Legs (lines)
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY + size * 0.2);
        this.ctx.lineTo(centerX - size * 0.3, centerY + size * 0.6);
        this.ctx.moveTo(centerX, centerY + size * 0.2);
        this.ctx.lineTo(centerX + size * 0.3, centerY + size * 0.6);
        this.ctx.stroke();

        return { bodyColor, outlineColor, scale };
    }

    drawScout(centerX, centerY, size, unit) {
        // Draw base stick figure
        const { bodyColor, outlineColor, scale } = this.drawStickFigureBase(centerX, centerY, size, unit);

        // Scout equipment: Small sword at side
        this.ctx.strokeStyle = '#FFD700'; // Gold sword
        this.ctx.lineWidth = Math.max(1, scale * 1.5);

        // Sword blade
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.5, centerY - size * 0.2);
        this.ctx.lineTo(centerX + size * 0.5, centerY + size * 0.1);
        this.ctx.stroke();

        // Sword hilt
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.4, centerY + size * 0.1);
        this.ctx.lineTo(centerX + size * 0.6, centerY + size * 0.1);
        this.ctx.stroke();

        // Scout identifier - green chest armor
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(centerX - size * 0.15, centerY - size * 0.3, size * 0.3, size * 0.25);
    }

    drawArcher(centerX, centerY, size, unit) {
        // Draw base stick figure
        const { bodyColor, outlineColor, scale } = this.drawStickFigureBase(centerX, centerY, size, unit);

        // Archer equipment: Bow and quiver
        this.ctx.strokeStyle = '#8B4513'; // Brown bow
        this.ctx.lineWidth = Math.max(1, scale * 2);

        // Bow arc
        this.ctx.beginPath();
        this.ctx.arc(centerX - size * 0.6, centerY - size * 0.1, size * 0.3, -Math.PI/3, Math.PI/3, false);
        this.ctx.stroke();

        // Bow string
        this.ctx.lineWidth = Math.max(1, scale);
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - size * 0.45, centerY - size * 0.25);
        this.ctx.lineTo(centerX - size * 0.45, centerY + size * 0.05);
        this.ctx.stroke();

        // Quiver on back
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(centerX + size * 0.2, centerY - size * 0.4, size * 0.1, size * 0.3);

        // Archer identifier - blue chest armor
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillRect(centerX - size * 0.15, centerY - size * 0.3, size * 0.3, size * 0.25);
    }

    drawKnight(centerX, centerY, size, unit) {
        // Draw base stick figure (but bulkier)
        const { bodyColor, outlineColor, scale } = this.drawStickFigureBase(centerX, centerY, size, unit);

        // Knight equipment: Shield and lance
        // Shield on left arm
        this.ctx.fillStyle = '#C0C0C0'; // Silver shield
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = Math.max(1, scale);

        this.ctx.beginPath();
        this.ctx.arc(centerX - size * 0.5, centerY - size * 0.1, size * 0.2, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Lance in right hand
        this.ctx.strokeStyle = '#8B4513'; // Brown lance shaft
        this.ctx.lineWidth = Math.max(1, scale * 2);
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.4, centerY - size * 0.1);
        this.ctx.lineTo(centerX + size * 0.7, centerY - size * 0.5);
        this.ctx.stroke();

        // Lance tip
        this.ctx.fillStyle = '#C0C0C0';
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.7, centerY - size * 0.5);
        this.ctx.lineTo(centerX + size * 0.65, centerY - size * 0.45);
        this.ctx.lineTo(centerX + size * 0.75, centerY - size * 0.45);
        this.ctx.closePath();
        this.ctx.fill();

        // Knight identifier - orange chest armor (heavier)
        this.ctx.fillStyle = '#FF9800';
        this.ctx.fillRect(centerX - size * 0.2, centerY - size * 0.35, size * 0.4, size * 0.35);
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

    // Check for attack animations by comparing game states
    checkForAttackAnimations(oldState, newState) {
        // Compare each unit's HP to detect attacks and deaths
        for (let i = 0; i < 16; i++) {
            const oldUnit = oldState.board[i];
            const newUnit = newState.board[i];

            // Check for unit death (unit existed, now it's gone)
            if (oldUnit && !newUnit) {
                // Find who killed this unit by looking for units that just acted
                for (let j = 0; j < 16; j++) {
                    const attacker = newState.board[j];
                    const oldAttacker = oldState.board[j];

                    if (attacker && oldAttacker &&
                        !oldAttacker.hasActed && attacker.hasActed) {

                        console.log(`💀 DEATH ANIMATION: ${oldUnit.type} killed by ${attacker.weapon} at position ${i}`);

                        // Trigger epic death animation
                        this.triggerDeathAnimation(i, oldUnit.type, attacker.weapon);
                        break;
                    }
                }
            }
            // Check for damage (but unit survives)
            else if (oldUnit && newUnit && oldUnit.currentHp > newUnit.currentHp) {
                const damage = oldUnit.currentHp - newUnit.currentHp;

                // Find who attacked by looking for units that just acted
                for (let j = 0; j < 16; j++) {
                    const attacker = newState.board[j];
                    const oldAttacker = oldState.board[j];

                    if (attacker && oldAttacker &&
                        !oldAttacker.hasActed && attacker.hasActed) {

                        // Calculate weapon advantage for visual feedback
                        const weaponAdvantage = this.calculateWeaponAdvantage(
                            attacker.weapon, oldUnit.weapon
                        );

                        // Trigger attack animation (non-lethal)
                        this.triggerAttackAnimation(j, i, damage, weaponAdvantage);

                        // Also trigger hurt animation for emotional feedback
                        this.triggerHurtAnimation(i, damage, attacker.weapon);
                        break;
                    }
                }
            }
        }
    }

    calculateWeaponAdvantage(attackerWeapon, defenderWeapon) {
        // Weapon Triangle: SWORD > BOW > LANCE > SWORD
        const advantages = {
            'SWORD': { 'BOW': 1.2, 'LANCE': 1.0, 'SWORD': 1.0 },
            'BOW': { 'LANCE': 1.2, 'SWORD': 1.0, 'BOW': 1.0 },
            'LANCE': { 'SWORD': 1.2, 'BOW': 1.0, 'LANCE': 1.0 }
        };
        return advantages[attackerWeapon][defenderWeapon] || 1.0;
    }

    // Animation System
    updateAnimations() {
        const currentTime = Date.now();

        // Update active animations
        this.animations = this.animations.filter(anim => {
            anim.progress = (currentTime - anim.startTime) / anim.duration;
            return anim.progress < 1.0;
        });

        // Update death animations
        this.deathAnimations = this.deathAnimations.filter(deathAnim => {
            deathAnim.age += 16;
            deathAnim.progress = deathAnim.age / deathAnim.totalDuration;

            // Check if we need to advance to next phase
            const phaseIndex = Math.floor(deathAnim.progress * deathAnim.phases.length);
            if (phaseIndex !== deathAnim.currentPhase && phaseIndex < deathAnim.phases.length) {
                deathAnim.currentPhase = phaseIndex;
                deathAnim.phaseStartTime = currentTime;
            }

            return deathAnim.progress < 1.0;
        });

        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.age += 16; // Assume 60fps
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3; // Gravity
            particle.alpha = Math.max(0, 1 - particle.age / particle.lifetime);
            return particle.age < particle.lifetime;
        });

        // Update damage numbers
        this.damageNumbers = this.damageNumbers.filter(dmg => {
            dmg.age += 16;
            dmg.y -= 1; // Float upward
            dmg.alpha = Math.max(0, 1 - dmg.age / dmg.lifetime);
            return dmg.age < dmg.lifetime;
        });

        // Update weapon drops (they wobble and settle)
        this.weaponDrops.forEach(weapon => {
            if (weapon.age < 1000) { // First second: wobble
                weapon.age += 16;
                weapon.rotation += weapon.wobbleSpeed;
                weapon.wobbleSpeed *= 0.95; // Damping
            }
        });

        // Update hurt animations (temporary pain expressions)
        this.hurtAnimations = this.hurtAnimations.filter(hurt => {
            hurt.age += 16;
            hurt.intensity = Math.max(0, 1 - hurt.age / hurt.duration);
            return hurt.age < hurt.duration;
        });
    }

    drawAnimations() {
        this.animations.forEach(anim => {
            if (anim.type === 'attack') {
                this.drawAttackAnimation(anim);
            }
        });
    }

    drawAttackAnimation(anim) {
        const { fromPos, toPos, weapon, progress } = anim;

        if (weapon === 'SWORD') {
            // Sword swing: Yellow arc from attacker
            this.ctx.strokeStyle = `rgba(255, 215, 0, ${1 - progress})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            const angle = Math.PI * progress;
            this.ctx.arc(fromPos.x, fromPos.y, 30, -angle, angle);
            this.ctx.stroke();

        } else if (weapon === 'BOW') {
            // Arrow flight: Blue line traveling to target
            const currentX = fromPos.x + (toPos.x - fromPos.x) * progress;
            const currentY = fromPos.y + (toPos.y - fromPos.y) * progress;

            this.ctx.strokeStyle = '#2196F3';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(fromPos.x, fromPos.y);
            this.ctx.lineTo(currentX, currentY);
            this.ctx.stroke();

            // Arrow tip
            this.ctx.fillStyle = '#1976D2';
            this.ctx.beginPath();
            this.ctx.arc(currentX, currentY, 3, 0, 2 * Math.PI);
            this.ctx.fill();

        } else if (weapon === 'LANCE') {
            // Lance thrust: Orange line extending forward
            const extendDistance = 40 * progress;
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;

            this.ctx.strokeStyle = `rgba(255, 152, 0, ${1 - progress * 0.5})`;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(fromPos.x, fromPos.y);
            this.ctx.lineTo(
                fromPos.x + normalizedX * extendDistance,
                fromPos.y + normalizedY * extendDistance
            );
            this.ctx.stroke();
        }
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    drawDamageNumbers() {
        this.damageNumbers.forEach(dmg => {
            this.ctx.fillStyle = `rgba(${dmg.color}, ${dmg.alpha})`;
            this.ctx.font = `bold ${dmg.size}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(dmg.text, dmg.x, dmg.y);
        });
    }

    // Trigger hurt animation for non-lethal damage
    triggerHurtAnimation(targetIndex, damage, killerWeapon) {
        const targetPos = this.getVisualPosition(targetIndex);
        const centerX = targetPos.x + this.tileSize / 2;
        const centerY = targetPos.y + this.tileSize / 2;

        // Create hurt overlay
        this.hurtAnimations.push({
            x: centerX,
            y: centerY,
            unitIndex: targetIndex,
            age: 0,
            duration: 1000, // 1 second of hurt expression
            intensity: 1.0,
            killerWeapon: killerWeapon
        });

        // Blood splatter on hit (smaller than death)
        const bloodCount = Math.min(8, Math.max(3, damage / 10));
        for (let i = 0; i < bloodCount; i++) {
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * 20,
                y: centerY + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: Math.random() * 3 + 1,
                color: '180, 0, 0', // Bright red for fresh blood
                alpha: 1,
                age: 0,
                lifetime: 1500
            });
        }

        // Start animation loop
        this.render();
    }

    drawHurtOverlays() {
        this.hurtAnimations.forEach(hurt => {
            const unit = this.gameState.board[hurt.unitIndex];
            if (!unit) return; // Unit might have died

            this.ctx.save();
            this.ctx.translate(hurt.x, hurt.y);

            // Pulsing red overlay to show pain
            const pulseAlpha = (Math.sin(hurt.age * 0.01) + 1) * 0.5 * hurt.intensity;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.tileSize / 2, 0, 2 * Math.PI);
            this.ctx.fill();

            // Draw hurt facial expression overlay
            const size = this.tileSize / 3;
            this.ctx.globalAlpha = hurt.intensity;

            // Override emotion temporarily
            this.drawWarriorEyes(0, -size * 0.6, size, 'pain');
            this.drawWarriorMouth(0, -size * 0.6, size, 'pain');

            // Add weapon-specific hurt effects
            if (hurt.killerWeapon === 'SWORD') {
                // Red slash mark
                this.ctx.strokeStyle = `rgba(255, 0, 0, ${hurt.intensity})`;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(-size * 0.3, -size * 0.2);
                this.ctx.lineTo(size * 0.3, size * 0.2);
                this.ctx.stroke();

            } else if (hurt.killerWeapon === 'BOW') {
                // Small bleeding wound
                this.ctx.fillStyle = `rgba(139, 0, 0, ${hurt.intensity})`;
                this.ctx.beginPath();
                this.ctx.arc(size * 0.2, 0, 3, 0, 2 * Math.PI);
                this.ctx.fill();

            } else if (hurt.killerWeapon === 'LANCE') {
                // Puncture wound with blood
                this.ctx.fillStyle = `rgba(139, 0, 0, ${hurt.intensity})`;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 4, 0, 2 * Math.PI);
                this.ctx.fill();

                // Blood drops falling
                for (let i = 0; i < 3; i++) {
                    const dropY = i * size * 0.15 * (hurt.age / hurt.duration);
                    this.ctx.beginPath();
                    this.ctx.arc(0, dropY, 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
            }

            this.ctx.restore();
        });
    }

    // Trigger attack animation when attack happens
    triggerAttackAnimation(attackerIndex, targetIndex, damage, weaponAdvantage) {
        const attackerPos = this.getVisualPosition(attackerIndex);
        const targetPos = this.getVisualPosition(targetIndex);

        const attacker = this.gameState.board[attackerIndex];
        const target = this.gameState.board[targetIndex];

        // Center positions
        const fromPos = {
            x: attackerPos.x + this.tileSize / 2,
            y: attackerPos.y + this.tileSize / 2
        };
        const toPos = {
            x: targetPos.x + this.tileSize / 2,
            y: targetPos.y + this.tileSize / 2
        };

        // Attack animation
        this.animations.push({
            type: 'attack',
            fromPos,
            toPos,
            weapon: attacker.weapon,
            startTime: Date.now(),
            duration: 500,
            progress: 0
        });

        // Blood particles on hit
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: toPos.x + (Math.random() - 0.5) * 20,
                y: toPos.y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 3 + 1,
                color: '220, 20, 20', // Red blood
                alpha: 1,
                age: 0,
                lifetime: 1000
            });
        }

        // Damage number
        const isBonus = weaponAdvantage > 1.0;
        this.damageNumbers.push({
            text: damage.toString(),
            x: toPos.x,
            y: toPos.y - 20,
            color: isBonus ? '0, 255, 0' : '255, 255, 255', // Green for bonus, white for normal
            size: isBonus ? 18 : 14,
            alpha: 1,
            age: 0,
            lifetime: 2000
        });

        // Start animation loop
        if (this.animations.length === 1) {
            this.render();
        }
    }

    // Trigger death animation based on KILLER WEAPON (simplified Diablo-style)
    triggerDeathAnimation(victimIndex, victimType, killerWeapon) {
        const victimPos = this.getVisualPosition(victimIndex);
        const centerX = victimPos.x + this.tileSize / 2;
        const centerY = victimPos.y + this.tileSize / 2;

        let phases = [];
        let totalDuration = 2000; // 2 seconds - quicker but impactful

        // 3 Weapon-specific death types (regardless of victim)
        if (killerWeapon === 'SWORD') {
            // SWORD DEATH: Swift slice, side fall, blood spray
            phases = [
                { type: 'sword_shock', duration: 400 },  // 😱 Shock face, slice wound
                { type: 'sword_fall', duration: 800 },   // Falls sideways, hand to wound
                { type: 'sword_blood', duration: 800 }   // Blood spray, final twitch
            ];
        } else if (killerWeapon === 'BOW') {
            // ARROW DEATH: Piercing surprise, arrow sticks, collapse
            phases = [
                { type: 'arrow_hit', duration: 500 },    // 😳 Arrow hits, surprise
                { type: 'arrow_grab', duration: 700 },   // 😖 Grabs arrow, staggers
                { type: 'arrow_fall', duration: 800 }    // Collapses, arrow visible
            ];
        } else if (killerWeapon === 'LANCE') {
            // LANCE DEATH: Pierced through, lifted, heavy fall
            phases = [
                { type: 'lance_pierce', duration: 300 }, // 😰 Pierced, lifted briefly
                { type: 'lance_slide', duration: 900 },  // Slides off lance, blood flows
                { type: 'lance_pool', duration: 800 }    // Heavy fall, big blood pool
            ];
        }

        // Create death animation
        this.deathAnimations.push({
            x: centerX,
            y: centerY,
            unitType: victimType,
            killedBy: killerWeapon,
            phases: phases,
            currentPhase: 0,
            age: 0,
            progress: 0,
            totalDuration: totalDuration,
            phaseStartTime: Date.now()
        });

        // DIABLO-STYLE MASSIVE BLOOD EXPLOSION
        const bloodCount = killerWeapon === 'LANCE' ? 25 : killerWeapon === 'SWORD' ? 20 : 15;
        for (let i = 0; i < bloodCount; i++) {
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * 40,
                y: centerY + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                size: Math.random() * 5 + 2,
                color: Math.random() > 0.7 ? '180, 0, 0' : '139, 0, 0', // Mix of blood reds
                alpha: 1,
                age: 0,
                lifetime: 3000 + Math.random() * 1000
            });
        }

        // Weapon-specific blood pools
        let poolSize, poolShape;
        if (killerWeapon === 'SWORD') {
            poolSize = 18;
            poolShape = 'spray'; // Directional spray pattern
        } else if (killerWeapon === 'BOW') {
            poolSize = 12;
            poolShape = 'spot'; // Concentrated spot
        } else if (killerWeapon === 'LANCE') {
            poolSize = 30;
            poolShape = 'pool'; // Large spreading pool
        }

        this.bloodPools.push({
            x: centerX,
            y: centerY,
            size: poolSize,
            shape: poolShape,
            alpha: 0.9,
            killerWeapon: killerWeapon
        });

        // Drop weapons (equipment falls off)
        const weaponType = this.getUnitWeapon(victimType);
        this.weaponDrops.push({
            x: centerX + (Math.random() - 0.5) * 25,
            y: centerY + (Math.random() - 0.5) * 25,
            weaponType: weaponType,
            rotation: Math.random() * Math.PI * 2,
            wobbleSpeed: (Math.random() - 0.5) * 0.4,
            age: 0
        });

        // After death animation, create emotional corpse
        setTimeout(() => {
            this.corpses.push({
                x: centerX,
                y: centerY,
                unitType: victimType,
                killedBy: killerWeapon,
                rotation: Math.random() * Math.PI * 2,
                emotion: 'dead' // Special dead emotion
            });
        }, totalDuration);

        // Start animation loop
        this.render();
    }

    getUnitWeapon(unitType) {
        const weapons = {
            'SCOUT': 'SWORD',
            'ARCHER': 'BOW',
            'KNIGHT': 'LANCE'
        };
        return weapons[unitType];
    }

    // Death Animation System Draw Functions
    drawBloodPools() {
        this.bloodPools.forEach(pool => {
            this.ctx.fillStyle = `rgba(139, 0, 0, ${pool.alpha})`;

            const centerX = pool.x;
            const centerY = pool.y;

            if (pool.shape === 'spray') {
                // SWORD: Directional spray pattern
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI + Math.PI; // Spray to one side
                    const distance = pool.size * (0.8 + Math.random() * 0.4);
                    const x = centerX + Math.cos(angle) * distance;
                    const y = centerY + Math.sin(angle) * distance;

                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 3 + Math.random() * 4, 0, 2 * Math.PI);
                    this.ctx.fill();
                }

            } else if (pool.shape === 'spot') {
                // BOW: Concentrated spot
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, pool.size, 0, 2 * Math.PI);
                this.ctx.fill();

                // Small splatters around main spot
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    const distance = pool.size * 1.2;
                    const x = centerX + Math.cos(angle) * distance;
                    const y = centerY + Math.sin(angle) * distance;

                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                }

            } else {
                // LANCE: Large spreading pool (default)
                this.ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    const angle = (i / 10) * Math.PI * 2;
                    const variance = 0.7 + Math.random() * 0.6;
                    const radius = pool.size * variance;
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;

                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.fill();
            }
        });
    }

    drawCorpses() {
        this.corpses.forEach(corpse => {
            const { x, y, unitType, rotation, killedBy, emotion } = corpse;

            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(rotation);

            // Draw corpse using emotional warrior system (darkened)
            this.ctx.globalAlpha = 0.7; // Faded corpse

            // Draw dead emotional warrior
            const size = this.tileSize / 3;
            this.drawWarriorBody(0, 0, size, true, 'dying'); // Always use dying emotion for corpses
            this.drawWarriorEquipment(0, 0, size, unitType, true);

            // Add death-specific details
            if (killedBy === 'BOW') {
                // Arrow still sticking out
                this.ctx.globalAlpha = 0.8;
                this.ctx.strokeStyle = '#8B4513';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(size * 0.2, -size * 0.1);
                this.ctx.lineTo(size * 0.4, size * 0.1);
                this.ctx.stroke();

                // Arrow fletching
                this.ctx.fillStyle = '#654321';
                this.ctx.beginPath();
                this.ctx.arc(size * 0.2, -size * 0.1, 2, 0, 2 * Math.PI);
                this.ctx.fill();
            }

            this.ctx.restore();
        });
    }

    drawCorpseScout(x, y, killedBy) {
        const size = this.tileSize / 6;

        // Head
        this.ctx.beginPath();
        this.ctx.arc(x, y - size * 0.5, size * 0.2, 0, 2 * Math.PI);
        this.ctx.fill();

        // Body (laying down)
        this.ctx.fillRect(x - size * 0.1, y - size * 0.3, size * 0.2, size * 0.6);

        // Arms spread out
        this.ctx.fillRect(x - size * 0.4, y - size * 0.05, size * 0.8, size * 0.1);

        // Legs
        this.ctx.fillRect(x - size * 0.15, y + size * 0.3, size * 0.1, size * 0.3);
        this.ctx.fillRect(x + size * 0.05, y + size * 0.3, size * 0.1, size * 0.3);

        // Death-specific details
        if (killedBy === 'BOW') {
            // Arrow sticking out
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x, y - size * 0.8);
            this.ctx.stroke();
        }
    }

    drawCorpseArcher(x, y, killedBy) {
        const size = this.tileSize / 6;

        // Head
        this.ctx.beginPath();
        this.ctx.arc(x, y - size * 0.5, size * 0.2, 0, 2 * Math.PI);
        this.ctx.fill();

        // Body
        this.ctx.fillRect(x - size * 0.1, y - size * 0.3, size * 0.2, size * 0.6);

        // Arms
        this.ctx.fillRect(x - size * 0.4, y - size * 0.05, size * 0.8, size * 0.1);

        // Legs
        this.ctx.fillRect(x - size * 0.15, y + size * 0.3, size * 0.1, size * 0.3);
        this.ctx.fillRect(x + size * 0.05, y + size * 0.3, size * 0.1, size * 0.3);

        // Scattered arrows around body (from spilled quiver)
        if (killedBy === 'LANCE' || killedBy === 'SWORD') {
            for (let i = 0; i < 3; i++) {
                const arrowX = x + (Math.random() - 0.5) * size;
                const arrowY = y + (Math.random() - 0.5) * size;
                this.ctx.strokeStyle = '#8B4513';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(arrowX, arrowY);
                this.ctx.lineTo(arrowX + size * 0.3, arrowY);
                this.ctx.stroke();
            }
        }
    }

    drawCorpseKnight(x, y, killedBy) {
        const size = this.tileSize / 5; // Knights are bigger

        // Head
        this.ctx.beginPath();
        this.ctx.arc(x, y - size * 0.5, size * 0.25, 0, 2 * Math.PI);
        this.ctx.fill();

        // Larger body
        this.ctx.fillRect(x - size * 0.15, y - size * 0.3, size * 0.3, size * 0.6);

        // Arms
        this.ctx.fillRect(x - size * 0.5, y - size * 0.05, size * 1.0, size * 0.15);

        // Legs
        this.ctx.fillRect(x - size * 0.2, y + size * 0.3, size * 0.15, size * 0.4);
        this.ctx.fillRect(x + size * 0.05, y + size * 0.3, size * 0.15, size * 0.4);

        // Armor pieces scattered around
        for (let i = 0; i < 4; i++) {
            const pieceX = x + (Math.random() - 0.5) * size * 1.5;
            const pieceY = y + (Math.random() - 0.5) * size * 1.5;
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(pieceX, pieceY, size * 0.1, size * 0.1);
        }
    }

    drawWeaponDrops() {
        this.weaponDrops.forEach(weapon => {
            const { x, y, weaponType, rotation } = weapon;

            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(rotation);

            this.ctx.strokeStyle = '#666666';
            this.ctx.lineWidth = 2;

            if (weaponType === 'SWORD') {
                // Fallen sword
                this.ctx.beginPath();
                this.ctx.moveTo(-15, 0);
                this.ctx.lineTo(15, 0);
                this.ctx.stroke();

                // Hilt
                this.ctx.beginPath();
                this.ctx.moveTo(-18, -5);
                this.ctx.lineTo(-18, 5);
                this.ctx.stroke();

            } else if (weaponType === 'BOW') {
                // Broken bow (two pieces)
                this.ctx.beginPath();
                this.ctx.moveTo(-10, -10);
                this.ctx.lineTo(0, 0);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(10, 10);
                this.ctx.stroke();

            } else if (weaponType === 'LANCE') {
                // Fallen lance
                this.ctx.beginPath();
                this.ctx.moveTo(-20, 0);
                this.ctx.lineTo(20, 0);
                this.ctx.stroke();

                // Lance tip
                this.ctx.fillStyle = '#888888';
                this.ctx.beginPath();
                this.ctx.moveTo(20, 0);
                this.ctx.lineTo(15, -3);
                this.ctx.lineTo(15, 3);
                this.ctx.closePath();
                this.ctx.fill();
            }

            this.ctx.restore();
        });
    }

    drawDeathAnimations() {
        this.deathAnimations.forEach(deathAnim => {
            const currentPhase = deathAnim.phases[deathAnim.currentPhase];
            if (!currentPhase) return;

            const phaseProgress = (deathAnim.age - deathAnim.currentPhase * (deathAnim.totalDuration / deathAnim.phases.length)) / (deathAnim.totalDuration / deathAnim.phases.length);

            this.ctx.save();
            this.ctx.translate(deathAnim.x, deathAnim.y);

            // Draw dying emotional warrior based on weapon that killed them
            const { unitType, killedBy } = deathAnim;
            const alpha = Math.max(0.4, 1 - deathAnim.progress * 0.6);
            this.ctx.globalAlpha = alpha;

            // Apply death pose transformations
            if (currentPhase.type.includes('fall') || currentPhase.type.includes('slide')) {
                this.ctx.rotate(phaseProgress * Math.PI / 2); // Falling rotation
            }

            // Draw emotional dying warrior
            this.drawDyingEmotionalWarrior(0, 0, unitType, currentPhase, phaseProgress, killedBy);

            this.ctx.restore();
        });
    }

    drawDyingEmotionalWarrior(x, y, unitType, currentPhase, progress, killerWeapon) {
        const size = this.tileSize / 3;

        // Determine death emotion based on phase
        let deathEmotion = 'shock';
        if (currentPhase.type.includes('grab') || currentPhase.type.includes('fall')) {
            deathEmotion = 'pain';
        } else if (currentPhase.type.includes('blood') || currentPhase.type.includes('pool')) {
            deathEmotion = 'dying';
        }

        // Draw base warrior with death emotion
        this.drawWarriorBody(x, y, size, true, deathEmotion);
        this.drawWarriorEquipment(x, y, size, unitType, true);

        // Add weapon-specific death details
        if (killerWeapon === 'SWORD' && currentPhase.type === 'sword_blood') {
            // Blood spray from sword wound
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI + Math.PI; // Spray sideways
                const distance = progress * size * (0.8 + Math.random() * 0.4);
                const bloodX = x + Math.cos(angle) * distance;
                const bloodY = y + Math.sin(angle) * distance;

                this.ctx.fillStyle = `rgba(180, 0, 0, ${1 - progress})`;
                this.ctx.beginPath();
                this.ctx.arc(bloodX, bloodY, 3, 0, 2 * Math.PI);
                this.ctx.fill();
            }

        } else if (killerWeapon === 'BOW') {
            // Arrow sticking out
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(x + size * 0.2, y - size * 0.1);
            this.ctx.lineTo(x + size * 0.4, y + size * 0.1);
            this.ctx.stroke();

            // Arrow fletching
            this.ctx.fillStyle = '#654321';
            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.2, y - size * 0.1, 2, 0, 2 * Math.PI);
            this.ctx.fill();

        } else if (killerWeapon === 'LANCE' && currentPhase.type === 'lance_slide') {
            // Blood flowing down from pierce wound
            for (let i = 0; i < 4; i++) {
                const flowY = y + i * size * 0.1 * progress;
                this.ctx.fillStyle = `rgba(139, 0, 0, ${1 - i * 0.2})`;
                this.ctx.beginPath();
                this.ctx.arc(x, flowY, 2, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        }
    }

    drawDyingScout(x, y, progress, phase, killedBy) {
        const size = this.tileSize / 6;

        if (phase.type === 'recoil') {
            // Grabbing neck/chest
            this.ctx.fillStyle = '#8B0000';
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 0.3, 0, 2 * Math.PI);
            this.ctx.fill();

            // Hands to wound
            this.ctx.strokeStyle = '#654321';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x - size * 0.2, y - size * 0.1);
            this.ctx.lineTo(x, y);
            this.ctx.moveTo(x + size * 0.2, y - size * 0.1);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();

        } else if (phase.type === 'fall') {
            // Falling forward
            const fallOffset = progress * size * 0.5;
            this.drawStickFigureBase(x, y + fallOffset, size * 0.8, { hasActed: true, owner: 0 });

        } else if (phase.type === 'final') {
            // Final blood spurt
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const distance = progress * size * (0.5 + Math.random() * 0.5);
                const bloodX = x + Math.cos(angle) * distance;
                const bloodY = y + Math.sin(angle) * distance;

                this.ctx.fillStyle = `rgba(139, 0, 0, ${1 - progress})`;
                this.ctx.beginPath();
                this.ctx.arc(bloodX, bloodY, 2, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        }
    }

    drawDyingArcher(x, y, progress, phase, killedBy) {
        const size = this.tileSize / 6;

        if (phase.type === 'bow_break') {
            // Bow shattering
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.lineWidth = 3;

            // First half flying left
            this.ctx.save();
            this.ctx.translate(x - progress * size, y);
            this.ctx.rotate(progress * Math.PI);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.2, -Math.PI/3, Math.PI/3);
            this.ctx.stroke();
            this.ctx.restore();

            // Second half flying right
            this.ctx.save();
            this.ctx.translate(x + progress * size, y);
            this.ctx.rotate(-progress * Math.PI);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.2, -Math.PI/3, Math.PI/3);
            this.ctx.stroke();
            this.ctx.restore();

        } else if (phase.type === 'stagger') {
            // Staggering backward
            const staggerOffset = progress * size * 0.3;
            this.drawStickFigureBase(x, y + staggerOffset, size, { hasActed: true, owner: 0 });

            // Hands to chest
            this.ctx.fillStyle = '#8B0000';
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 0.1, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    drawDyingKnight(x, y, progress, phase, killedBy) {
        const size = this.tileSize / 5;

        if (phase.type === 'weapon_drop') {
            // Weapons falling
            const dropDistance = progress * size * 0.8;

            // Lance falling
            this.ctx.save();
            this.ctx.translate(x + size * 0.3, y + dropDistance);
            this.ctx.rotate(progress * Math.PI * 2);
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(-size * 0.3, 0);
            this.ctx.lineTo(size * 0.3, 0);
            this.ctx.stroke();
            this.ctx.restore();

            // Shield falling
            this.ctx.save();
            this.ctx.translate(x - size * 0.3, y + dropDistance * 0.7);
            this.ctx.rotate(-progress * Math.PI);
            this.ctx.fillStyle = '#666666';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.15, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.restore();

        } else if (phase.type === 'timber') {
            // Falling like a tree
            this.ctx.save();
            this.ctx.rotate(progress * Math.PI / 2);
            this.drawStickFigureBase(0, 0, size, { hasActed: true, owner: 0 });
            this.ctx.restore();

        } else if (phase.type === 'impact') {
            // Ground impact with screen shake effect
            const shakeX = (Math.random() - 0.5) * progress * 10;
            const shakeY = (Math.random() - 0.5) * progress * 10;

            this.ctx.save();
            this.ctx.translate(shakeX, shakeY);
            this.drawStickFigureBase(x, y, size, { hasActed: true, owner: 0 });

            // Impact particles
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const distance = progress * size;
                const particleX = x + Math.cos(angle) * distance;
                const particleY = y + Math.sin(angle) * distance;

                this.ctx.fillStyle = `rgba(101, 67, 33, ${1 - progress})`;
                this.ctx.beginPath();
                this.ctx.arc(particleX, particleY, 3, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            this.ctx.restore();
        }
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