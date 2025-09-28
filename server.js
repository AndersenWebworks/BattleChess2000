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
      board: new Array(16).fill(null), // 4x4 grid = 16 tiles
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
    // MVP: Fixed deck composition
    // 6x Scout (1 mana), 6x Archer (3 mana), 3x Knight (5 mana)
    const deck = [
      ...Array(6).fill({type: 'SCOUT', cost: 1}),
      ...Array(6).fill({type: 'ARCHER', cost: 3}),
      ...Array(3).fill({type: 'KNIGHT', cost: 5})
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
    if (tileIndex < 0 || tileIndex >= 16) {
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
      return tileIndex >= 12 && tileIndex <= 15; // Bottom row
    } else {
      return tileIndex >= 0 && tileIndex <= 3;   // Top row
    }
  }

  createUnit(type, owner, position) {
    const unitTypes = {
      SCOUT: { hp: 60, attack: 30, movement: 2, weapon: 'SWORD' },
      ARCHER: { hp: 80, attack: 60, movement: 1, weapon: 'BOW' },
      KNIGHT: { hp: 150, attack: 90, movement: 1, weapon: 'LANCE' }
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
    const cardTypes = ['SCOUT', 'ARCHER', 'KNIGHT'];
    const randomType = cardTypes[Math.floor(Math.random() * cardTypes.length)];

    const cardCosts = { SCOUT: 1, ARCHER: 3, KNIGHT: 5 };

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
    if (toIndex < 0 || toIndex >= 16) {
      return { success: false, error: 'Invalid destination' };
    }

    if (this.gameState.board[toIndex] !== null) {
      return { success: false, error: 'Destination occupied' };
    }

    // Validate movement range
    const fromX = fromIndex % 4;
    const fromY = Math.floor(fromIndex / 4);
    const toX = toIndex % 4;
    const toY = Math.floor(toIndex / 4);
    const distance = Math.abs(toX - fromX) + Math.abs(toY - fromY);

    if (distance > unit.movement) {
      return { success: false, error: 'Move too far' };
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

    // Validate attack range
    const attackerX = attackerIndex % 4;
    const attackerY = Math.floor(attackerIndex / 4);
    const targetX = targetIndex % 4;
    const targetY = Math.floor(targetIndex / 4);
    const distance = Math.abs(targetX - attackerX) + Math.abs(targetY - attackerY);

    let maxRange = 1; // Default melee range
    if (attacker.weapon === 'BOW') {
      maxRange = 2; // Archers have longer range
    }

    if (distance > maxRange) {
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