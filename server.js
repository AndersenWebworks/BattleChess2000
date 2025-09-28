const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Game state management
const games = new Map();
const waitingPlayers = [];

class GameRoom {
  constructor(player1, player2) {
    this.id = Math.random().toString(36).substring(7);
    this.players = [player1, player2];
    this.currentTurn = 0; // Player 0 starts
    this.turnNumber = 1; // Track turn number for mana progression
    this.gameState = {
      board: new Array(25).fill(null), // 5x5 grid = 25 tiles
      currentTurn: 0, // Add currentTurn to gameState for client sync
      turnNumber: 1,
      // No phases in parallel gameplay
      players: [
        {
          id: player1.id,
          hand: this.createStartingHand(),
          mana: 1,
          maxMana: 1
        },
        {
          id: player2.id,
          hand: this.createStartingHand(),
          mana: 2,
          maxMana: 2
        }
      ]
    };

    // Join both players to game room
    player1.join(this.id);
    player2.join(this.id);

    // Notify players that game started
    player1.emit('gameStarted', {
      gameId: this.id,
      gameState: this.gameState,
      yourPlayerIndex: 0,
      yourName: player1.playerName,
      opponentName: player2.playerName
    });

    player2.emit('gameStarted', {
      gameId: this.id,
      gameState: this.gameState,
      yourPlayerIndex: 1,
      yourName: player2.playerName,
      opponentName: player1.playerName
    });

    console.log(`🎮 Game ${this.id} started: ${player1.playerName} vs ${player2.playerName}`);
  }

  createStartingHand() {
    // ULTRATHINK Balanced deck composition
    // 5x Scout (1 mana), 5x Archer (3 mana), 3x Knight (5 mana), 2x Mage (6 mana)
    const deck = [
      ...Array(5).fill({type: 'SCOUT', cost: 1}),
      ...Array(5).fill({type: 'ARCHER', cost: 3}),
      ...Array(3).fill({type: 'KNIGHT', cost: 5}),
      ...Array(2).fill({type: 'MAGE', cost: 6})
    ];

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Return first 5 cards as starting hand
    return deck.slice(0, 5);
  }

  playCard(playerId, cardIndex, tileIndex) {
    // Find player index
    const playerIndex = this.players[0].id === playerId ? 0 : 1;

    // Validate it's player's turn
    if (this.currentTurn !== playerIndex) {
      return { success: false, error: 'Not your turn' };
    }

    const player = this.gameState.players[playerIndex];

    // Validate card index
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return { success: false, error: 'Invalid card index' };
    }

    const card = player.hand[cardIndex];

    // Validate mana
    if (player.mana < card.cost) {
      return { success: false, error: 'Not enough mana' };
    }

    // Validate tile index
    if (tileIndex < 0 || tileIndex >= 25) {
      return { success: false, error: 'Invalid tile index' };
    }

    // Validate spawn zone
    const isValidSpawn = this.isValidSpawnZone(tileIndex, playerIndex);
    if (!isValidSpawn) {
      return { success: false, error: 'Invalid spawn zone' };
    }

    // Validate tile is empty
    if (this.gameState.board[tileIndex] !== null) {
      return { success: false, error: 'Tile occupied' };
    }

    // Create unit
    const unit = this.createUnit(card.type, playerIndex, tileIndex);

    // Update game state
    this.gameState.board[tileIndex] = unit;
    player.hand.splice(cardIndex, 1); // Remove card from hand
    player.mana -= card.cost; // Spend mana

    // NO turn switch - parallel gameplay allows multiple actions per turn
    // this.switchTurn(); // REMOVED - cards don't end turn

    console.log(`🎮 ${card.type} spawned at tile ${tileIndex} by player ${playerIndex}`);

    return { success: true };
  }

  isValidSpawnZone(tileIndex, playerIndex) {
    if (playerIndex === 0) {
      return tileIndex >= 20 && tileIndex <= 24; // Bottom row only (20-24)
    } else {
      return tileIndex >= 0 && tileIndex <= 4;   // Top row only (0-4)
    }
  }

  createUnit(type, owner, position) {
    const unitTypes = {
      SCOUT: { hp: 25, attack: 30, movement: 'STRAIGHT_1', weapon: 'SWORD' },
      ARCHER: { hp: 50, attack: 40, movement: 'STRAIGHT', weapon: 'BOW' },
      KNIGHT: { hp: 90, attack: 60, movement: 'ADJACENT', weapon: 'LANCE' },
      MAGE: { hp: 35, attack: 80, movement: 'DIAGONAL', weapon: 'STAFF' }
    };

    const unitData = unitTypes[type];

    return {
      id: Math.random().toString(36).substring(7),
      type: type,
      owner: owner,
      position: position,
      currentHp: unitData.hp,
      maxHp: unitData.hp,
      attack: unitData.attack,
      movement: unitData.movement,
      weapon: unitData.weapon,
      hasMovedThisTurn: false,
      hasAttackedThisTurn: false,
      justSummoned: true // Summoning sickness - can't move until next turn
    };
  }

  nextPhase(playerId) {
    // Simplified for parallel gameplay - just end turn
    const playerIndex = this.players[0].id === playerId ? 0 : 1;

    // Validate it's player's turn
    if (this.currentTurn !== playerIndex) {
      return { success: false, error: 'Not your turn' };
    }

    // No phases anymore - just switch turns
    console.log(`🔄 Player ${this.currentTurn + 1} ending turn (parallel gameplay)`);
    this.switchTurn();

    return { success: true };
  }

  switchTurn() {
    // Switch to next player
    this.currentTurn = 1 - this.currentTurn;
    this.gameState.currentTurn = this.currentTurn;

    // Reset unit flags for new turn (parallel gameplay)
    this.gameState.board.forEach(unit => {
      if (unit && unit.owner === this.currentTurn) {
        unit.hasMovedThisTurn = false;
        unit.hasAttackedThisTurn = false;
        unit.justSummoned = false; // Remove summoning sickness for new turn
      }
    });

    // No more phases in parallel gameplay - remove this line
    // this.gameState.currentPhase = 'CARD';

    // Increment turn number and handle ROUND progression when it comes back to player 0
    if (this.currentTurn === 0) {
      this.turnNumber++;
      this.gameState.turnNumber = this.turnNumber;

      // NEW ROUND - Increase mana for BOTH players (not per turn, but per round)
      console.log(`🌟 NEW ROUND ${this.turnNumber} - Increasing mana for all players`);
      this.gameState.players.forEach((player, index) => {
        // Increase max mana (up to 10), but player 2 always has +1
        if (index === 0) {
          // Player 1: normal progression
          if (player.maxMana < 10) {
            player.maxMana++;
          }
        } else {
          // Player 2: starts with 2, then normal progression (+1 ahead)
          if (player.maxMana < 10) {
            player.maxMana++;
          }
        }

        // Refill mana to max
        player.mana = player.maxMana;

        // Draw a card (if deck exists - simplified for MVP)
        if (player.hand.length < 10) {
          const newCard = this.drawCard();
          if (newCard) {
            player.hand.push(newCard);
          }
        }

        console.log(`👤 Player ${index + 1} Mana: ${player.mana}/${player.maxMana}`);
      });
    } else {
      // Just refill current player's mana (no increase in max mana)
      const activePlayer = this.gameState.players[this.currentTurn];
      activePlayer.mana = activePlayer.maxMana;
      console.log(`🔄 Player ${this.currentTurn + 1} turn - Mana refilled: ${activePlayer.mana}/${activePlayer.maxMana}`);
    }
  }

  drawCard() {
    // Simplified card draw for MVP - random card from basic set
    const cardTypes = ['SCOUT', 'ARCHER', 'KNIGHT', 'MAGE'];
    const randomType = cardTypes[Math.floor(Math.random() * cardTypes.length)];

    const cardCosts = { SCOUT: 1, ARCHER: 3, KNIGHT: 5, MAGE: 6 };

    return {
      type: randomType,
      cost: cardCosts[randomType]
    };
  }

  moveUnit(playerId, fromIndex, toIndex) {
    // Find player index
    const playerIndex = this.players[0].id === playerId ? 0 : 1;

    // Validate it's player's turn (no phase check - parallel gameplay)
    if (this.currentTurn !== playerIndex) {
      return { success: false, error: 'Not your turn' };
    }

    // Validate source unit
    const unit = this.gameState.board[fromIndex];
    if (!unit || unit.owner !== playerIndex) {
      return { success: false, error: 'Invalid unit' };
    }

    // Check movement status (parallel gameplay)
    if (unit.hasMovedThisTurn) {
      return { success: false, error: 'Unit has already moved this turn' };
    }

    // Check summoning sickness
    if (unit.justSummoned) {
      return { success: false, error: 'Unit was just summoned and cannot move this turn' };
    }

    // Validate destination
    if (toIndex < 0 || toIndex >= 25) {
      return { success: false, error: 'Invalid destination' };
    }

    if (this.gameState.board[toIndex] !== null) {
      return { success: false, error: 'Destination occupied' };
    }

    // Validate movement using chess patterns
    const validMoves = this.calculateValidMoves(fromIndex, unit);
    if (!validMoves.includes(toIndex)) {
      return { success: false, error: 'Invalid movement pattern' };
    }

    // Execute movement
    this.gameState.board[fromIndex] = null;
    unit.position = toIndex;
    unit.hasMovedThisTurn = true; // Mark as moved this turn
    this.gameState.board[toIndex] = unit;

    console.log(`🚶 ${unit.type} moved from ${fromIndex} to ${toIndex}`);

    return { success: true };
  }

  attackUnit(playerId, attackerIndex, targetIndex) {
    // Find player index
    const playerIndex = this.players[0].id === playerId ? 0 : 1;

    // Validate it's player's turn (no phase check - parallel gameplay)
    if (this.currentTurn !== playerIndex) {
      return { success: false, error: 'Not your turn' };
    }

    // Validate attacker
    const attacker = this.gameState.board[attackerIndex];
    if (!attacker || attacker.owner !== playerIndex) {
      return { success: false, error: 'Invalid attacker' };
    }

    // Check attack status (parallel gameplay)
    if (attacker.hasAttackedThisTurn) {
      return { success: false, error: 'Unit has already attacked this turn' };
    }

    // Validate target
    const target = this.gameState.board[targetIndex];
    if (!target || target.owner === playerIndex) {
      return { success: false, error: 'Invalid target' };
    }

    // Validate attack range using proper patterns
    const validTargets = this.calculateValidTargets(attackerIndex, attacker, attacker.owner);
    if (!validTargets.includes(targetIndex)) {
      return { success: false, error: 'Target out of range' };
    }

    // Calculate damage with Weapon Triangle
    let damage = attacker.attack;

    // Weapon Triangle: SWORD > BOW > LANCE > SWORD
    const weaponAdvantage = this.getWeaponAdvantage(attacker.weapon, target.weapon);
    damage = Math.floor(damage * weaponAdvantage);

    // Apply damage
    target.currentHp -= damage;
    attacker.hasAttackedThisTurn = true; // Mark as attacked this turn

    console.log(`⚔️ ${attacker.type} (${attacker.weapon}) attacks ${target.type} (${target.weapon}) for ${damage} damage (${target.currentHp}/${target.maxHp} HP left)`);

    // Remove dead units
    if (target.currentHp <= 0) {
      this.gameState.board[targetIndex] = null;
      console.log(`💀 ${target.type} eliminated!`);
    }

    // Check win condition
    const gameOverResult = this.checkWinCondition();

    return {
      success: true,
      gameOver: gameOverResult.gameOver,
      winner: gameOverResult.winner
    };
  }

  getWeaponAdvantage(attackerWeapon, defenderWeapon) {
    // Weapon Triangle: SWORD > BOW > LANCE > SWORD
    const advantages = {
      'SWORD': { 'BOW': 1.2, 'LANCE': 0.8, 'SWORD': 1.0 },
      'BOW': { 'LANCE': 1.2, 'SWORD': 0.8, 'BOW': 1.0 },
      'LANCE': { 'SWORD': 1.2, 'BOW': 0.8, 'LANCE': 1.0 }
    };

    return advantages[attackerWeapon][defenderWeapon] || 1.0;
  }

  checkWinCondition() {
    const player0Units = this.gameState.board.filter(unit => unit && unit.owner === 0);
    const player1Units = this.gameState.board.filter(unit => unit && unit.owner === 1);

    if (player0Units.length === 0) {
      return { gameOver: true, winner: 1 };
    }

    if (player1Units.length === 0) {
      return { gameOver: true, winner: 0 };
    }

    return { gameOver: false, winner: null };
  }

  // Calculate valid movement tiles with chess-like patterns
  calculateValidMoves(fromIndex, unit) {
    const validMoves = [];
    const fromX = fromIndex % 5;
    const fromY = Math.floor(fromIndex / 5);
    const movementType = unit.movement;

    if (movementType === 'L_SHAPE') {
      // Scout: Knight/Springer pattern - can jump over units
      const lShapeMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];

      for (const [dx, dy] of lShapeMoves) {
        const toX = fromX + dx;
        const toY = fromY + dy;
        const toIndex = toY * 5 + toX;

        // Check bounds
        if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) continue;

        // Check if tile is empty (L-shape can jump over units)
        if (!this.gameState.board[toIndex]) {
          validMoves.push(toIndex);
        }
      }
    } else if (movementType === 'STRAIGHT_1') {
      // Scout: Straight pattern - only 1 tile (no diagonal)
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

      for (const [dx, dy] of directions) {
        const toX = fromX + dx;
        const toY = fromY + dy;
        const toIndex = toY * 5 + toX;

        // Check bounds
        if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) continue;

        // Check if tile is empty
        if (!this.gameState.board[toIndex]) {
          validMoves.push(toIndex);
        }
      }
    } else if (movementType === 'STRAIGHT') {
      // Archer: Rook pattern - straight lines 1-2 tiles
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

      for (const [dx, dy] of directions) {
        for (let range = 1; range <= 2; range++) {
          const toX = fromX + dx * range;
          const toY = fromY + dy * range;
          const toIndex = toY * 5 + toX;

          // Check bounds
          if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) break;

          // Check if blocked by unit
          if (this.gameState.board[toIndex]) break;

          validMoves.push(toIndex);
        }
      }
    } else if (movementType === 'ADJACENT') {
      // Knight: King pattern - 1 tile in all 8 directions
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];

      for (const [dx, dy] of directions) {
        const toX = fromX + dx;
        const toY = fromY + dy;
        const toIndex = toY * 5 + toX;

        // Check bounds
        if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) continue;

        // Check if tile is empty
        if (!this.gameState.board[toIndex]) {
          validMoves.push(toIndex);
        }
      }
    } else if (movementType === 'DIAGONAL') {
      // Mage: Bishop pattern - diagonal only 1-3 tiles
      const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

      for (const [dx, dy] of directions) {
        for (let range = 1; range <= 3; range++) {
          const toX = fromX + dx * range;
          const toY = fromY + dy * range;
          const toIndex = toY * 5 + toX;

          // Check bounds
          if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) break;

          // Check if blocked by unit
          if (this.gameState.board[toIndex]) break;

          validMoves.push(toIndex);
        }
      }
    }

    return validMoves;
  }

  // Calculate valid attack targets with chess-like patterns
  calculateValidTargets(fromIndex, unit, playerIndex) {
    const validTargets = [];
    const fromX = fromIndex % 5;
    const fromY = Math.floor(fromIndex / 5);

    if (unit.weapon === 'SWORD') {
      // Scout: Melee range 1 (straight only, no diagonal)
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];

      for (const [dx, dy] of directions) {
        const toX = fromX + dx;
        const toY = fromY + dy;
        const toIndex = toY * 5 + toX;

        // Check bounds
        if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) continue;

        // Check if there's an enemy unit
        const target = this.gameState.board[toIndex];
        if (target && target.owner !== playerIndex) {
          validTargets.push(toIndex);
        }
      }
    } else if (unit.weapon === 'BOW') {
      // Archer: All directions range 2
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];

      for (const [dx, dy] of directions) {
        for (let range = 1; range <= 2; range++) {
          const toX = fromX + dx * range;
          const toY = fromY + dy * range;
          const toIndex = toY * 5 + toX;

          // Check bounds
          if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) break;

          const target = this.gameState.board[toIndex];
          if (target) {
            // If enemy, can attack
            if (target.owner !== playerIndex) {
              validTargets.push(toIndex);
            }
            // Stop line regardless (blocked by any unit)
            break;
          }
        }
      }
    } else if (unit.weapon === 'LANCE') {
      // Knight: Melee range 1 (adjacent)
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];

      for (const [dx, dy] of directions) {
        const toX = fromX + dx;
        const toY = fromY + dy;
        const toIndex = toY * 5 + toX;

        // Check bounds
        if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) continue;

        // Check if there's an enemy unit
        const target = this.gameState.board[toIndex];
        if (target && target.owner !== playerIndex) {
          validTargets.push(toIndex);
        }
      }
    } else if (unit.weapon === 'STAFF') {
      // Mage: Diagonal range 4
      const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

      for (const [dx, dy] of directions) {
        for (let range = 1; range <= 4; range++) {
          const toX = fromX + dx * range;
          const toY = fromY + dy * range;
          const toIndex = toY * 5 + toX;

          // Check bounds
          if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) break;

          const target = this.gameState.board[toIndex];
          if (target) {
            // If enemy, can attack
            if (target.owner !== playerIndex) {
              validTargets.push(toIndex);
            }
            // Stop line regardless (blocked by any unit)
            break;
          }
        }
      }
    }

    return validTargets;
  }
}

// Helper function to find game by player ID
function findPlayerGame(playerId) {
  for (const game of games.values()) {
    if (game.players.some(player => player.id === playerId)) {
      return game;
    }
  }
  return null;
}

// Random name generator for players
const playerNames = [
  'TacticalMaster', 'ChessWarrior', 'BattleKnight', 'StrategicMind', 'GridCommander',
  'CardCrusader', 'TacticalGenius', 'BattleMage', 'ChessLord', 'WarChief',
  'GridMaster', 'TacticianX', 'BattleAce', 'ChessHero', 'WarStrategist',
  'TacticalBeast', 'GridWarrior', 'BattleProud', 'ChessKing', 'WarMaster'
];

function generatePlayerName() {
  return playerNames[Math.floor(Math.random() * playerNames.length)] + Math.floor(Math.random() * 999);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  socket.playerName = generatePlayerName();
  console.log(`🎮 ${socket.playerName} (${socket.id}) connected`);
  console.log(`Debug: Player name assigned: ${socket.playerName}`);

  // Player wants to find a match
  socket.on('findMatch', () => {
    console.log(`🎮 ${socket.playerName} looking for match`);
    console.log(`Current queue size: ${waitingPlayers.length}`);

    if (waitingPlayers.length > 0) {
      // Match found! Create game with waiting player
      const opponent = waitingPlayers.shift();
      console.log(`🎯 MATCH FOUND! ${opponent.playerName} vs ${socket.playerName}`);

      const game = new GameRoom(opponent, socket);
      games.set(game.id, game);
    } else {
      // No opponent available, add to waiting queue
      waitingPlayers.push(socket);
      socket.emit('searching', { message: 'Searching for opponent...' });
      console.log(`➕ ${socket.playerName} added to queue. Queue size: ${waitingPlayers.length}`);
    }
  });

  // Player disconnects
  socket.on('disconnect', () => {
    console.log(`❌ ${socket.playerName || socket.id} disconnected`);

    // Remove from waiting queue if present
    const waitingIndex = waitingPlayers.findIndex(player => player.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
      console.log(`Removed ${socket.playerName || socket.id} from queue. Queue size: ${waitingPlayers.length}`);
    }

    // Handle game disconnection (TODO: implement reconnection logic)
  });

  // Handle card play
  socket.on('playCard', (data) => {
    console.log(`🃏 ${socket.playerName} playing card:`, data);

    // Find the game this player is in
    const game = findPlayerGame(socket.id);
    if (!game) {
      console.log('❌ Player not in a game');
      return;
    }

    const result = game.playCard(socket.id, data.cardIndex, data.tileIndex);
    if (result.success) {
      // Broadcast game state update to both players
      io.to(game.id).emit('gameUpdate', game.gameState);
      console.log(`✅ Card played successfully`);
    } else {
      // Send error to player
      socket.emit('gameError', { message: result.error });
      console.log(`❌ Card play failed: ${result.error}`);
    }
  });

  // Handle phase transitions
  socket.on('nextPhase', () => {
    console.log(`🔄 ${socket.playerName} requesting phase transition`);

    // Find the game this player is in
    const game = findPlayerGame(socket.id);
    if (!game) {
      console.log('❌ Player not in a game');
      return;
    }

    const result = game.nextPhase(socket.id);
    if (result.success) {
      // Broadcast game state update to both players
      io.to(game.id).emit('gameUpdate', game.gameState);
      console.log(`✅ Phase transition successful`);
    } else {
      // Send error to player
      socket.emit('gameError', { message: result.error });
      console.log(`❌ Phase transition failed: ${result.error}`);
    }
  });

  // Handle unit movement
  socket.on('moveUnit', (data) => {
    console.log(`🚶 ${socket.playerName} moving unit:`, data);

    const game = findPlayerGame(socket.id);
    if (!game) {
      console.log('❌ Player not in a game');
      return;
    }

    const result = game.moveUnit(socket.id, data.fromIndex, data.toIndex);
    if (result.success) {
      io.to(game.id).emit('gameUpdate', game.gameState);
      console.log(`✅ Unit moved successfully`);
    } else {
      socket.emit('gameError', { message: result.error });
      console.log(`❌ Unit movement failed: ${result.error}`);
    }
  });

  // Handle unit attacks
  socket.on('attackUnit', (data) => {
    console.log(`⚔️ ${socket.playerName} attacking:`, data);

    const game = findPlayerGame(socket.id);
    if (!game) {
      console.log('❌ Player not in a game');
      return;
    }

    const result = game.attackUnit(socket.id, data.attackerIndex, data.targetIndex);
    if (result.success) {
      io.to(game.id).emit('gameUpdate', game.gameState);
      console.log(`✅ Attack executed successfully`);

      // Check for win condition
      if (result.gameOver) {
        io.to(game.id).emit('gameOver', { winner: result.winner });
        console.log(`🏆 Game Over! Winner: Player ${result.winner + 1}`);
      }
    } else {
      socket.emit('gameError', { message: result.error });
      console.log(`❌ Attack failed: ${result.error}`);
    }
  });

  // Test message for initial multiplayer validation
  socket.on('testMessage', (data) => {
    console.log(`💬 Test message from ${socket.playerName || socket.id}:`, data.message);
    socket.broadcast.emit('testMessage', {
      from: socket.playerName || socket.id,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });
});

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check for deployment
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    games: games.size,
    waiting: waitingPlayers.length,
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, () => {
  console.log(`🚀 BattleChess2000 MVP Server running on port ${PORT}`);
  console.log(`🎮 Ready to create the first Tactical Card Battler!`);
  console.log(`📱 Mobile-optimized and multiplayer-ready!`);
});