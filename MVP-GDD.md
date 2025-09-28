# BattleChess2000 MVP - Game Design Document

**Version**: 1.0
**Date**: 2025-09-28
**Status**: Development-Ready MVP Specification
**Purpose**: Minimal Viable Product für sofortige Umsetzung
**Inspiration**: Hearthstone's Flash Prototype Approach

---

## 🎯 MVP Definition

**"Der erste funktionsfähige Tactical Card Battler in 2 Wochen"**

Basierend auf Hearthstone's MVP-Ansatz: Minimale Features für maximalen Lerneffekt.

---

## 🎮 Core MVP Scope

### **Was IST im MVP:**
- ✅ **4x4 Grid Board** (16 Felder total)
- ✅ **3 Unit Types** (Scout, Archer, Knight)
- ✅ **15-Card Decks** (nicht 30)
- ✅ **5 Mana Maximum** (1-5 Mana Curve)
- ✅ **Online Multiplayer** mit Socket.io (ESSENTIELL!)
- ✅ **Mobile HTML5** Touch Controls (ESSENTIELL!)
- ✅ **Basic Movement + Attack**
- ✅ **Responsive Canvas** 2D Rendering

### **Was ist NICHT im MVP:**
- ❌ 8x8 Grid
- ❌ Complex Unit Abilities
- ❌ Sound/Music
- ❌ Fancy Graphics/Animations
- ❌ Collection System
- ❌ Persistent Account System
- ❌ Ranked Matchmaking
- ❌ Spectator Mode

---

## 🃏 MVP Unit System

### **3 Basic Unit Types**
```javascript
const MVP_UNITS = {
  SCOUT: {
    cost: 1,
    hp: 60,
    attack: 30,
    movement: 2,
    weapon: 'SWORD',
    description: "Fast, weak early game unit"
  },

  ARCHER: {
    cost: 3,
    hp: 80,
    attack: 60,
    movement: 1,
    weapon: 'BOW',
    description: "Ranged attacker, can shoot 2 tiles"
  },

  KNIGHT: {
    cost: 5,
    hp: 150,
    attack: 90,
    movement: 1,
    weapon: 'LANCE',
    description: "Heavy hitter, expensive"
  }
}
```

### **Simplified Weapon Triangle**
```
SWORD > BOW (+20% damage)
BOW > LANCE (+20% damage)
LANCE > SWORD (+20% damage)
```

### **MVP Deck Composition**
```
Standard MVP Deck (15 cards):
- 6x Scout (1 Mana)
- 6x Archer (3 Mana)
- 3x Knight (5 Mana)

Total Deck Cost: 39 Mana
Average Card Cost: 2.6 Mana
```

---

## 🎯 MVP Gameplay Flow

### **1. Game Setup**
```
4x4 Grid Layout:
┌─────┬─────┬─────┬─────┐
│  4  │  5  │  6  │  7  │ ← Player 2 Spawn Zone
├─────┼─────┼─────┼─────┤
│  8  │  9  │ 10  │ 11  │ ← Neutral Zone
├─────┼─────┼─────┼─────┤
│ 12  │ 13  │ 14  │ 15  │ ← Neutral Zone
├─────┼─────┼─────┼─────┤
│  0  │  1  │  2  │  3  │ ← Player 1 Spawn Zone
└─────┴─────┴─────┴─────┘

Each Player:
- Hand: 5 Cards (drawn from 15-card deck)
- Starting Mana: 1
- Max Mana: 5
```

### **2. Turn Structure (Simplified)**
```
PHASE 1 - CARD PHASE:
- Draw 1 Card
- Gain 1 Mana (max 5)
- Play Cards (spawn Units in your spawn zone)

PHASE 2 - ACTION PHASE:
- Move Units (movement points)
- Attack with Units (if in range)
- End Turn
```

### **3. Movement System**
```
Movement Rules:
- Each Unit: Movement Points per turn
- Can move orthogonally (up/down/left/right)
- Cannot move diagonally (MVP simplification)
- Cannot move through other units
- Cannot move into occupied spaces
```

### **4. Combat System**
```
Attack Rules:
- Melee Units: Attack adjacent tiles only
- Archer: Attack up to 2 tiles away
- Damage Calculation:
  Base Damage = Attacker.attack
  Weapon Bonus = weapon triangle (+20% or -20%)
  Final Damage = Base * (1 + Weapon Bonus)
- No HP regeneration
- Unit dies when HP ≤ 0
```

### **5. Win Conditions**
```
Game ends when:
1. One player has no units on board AND no cards in hand
2. OR: One player controls all 4 tiles of enemy spawn zone
3. OR: One player runs out of cards (deck fatigue)
```

---

## 🔧 Technical MVP Specification

### **Frontend Architecture (Mobile-First)**
```
Client: Single HTML File + Socket.io Client
<!DOCTYPE html>
<html>
<head>
  <title>BattleChess2000 MVP</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>/* Mobile-First Responsive CSS */</style>
</head>
<body>
  <canvas id="gameBoard"></canvas>
  <div id="gameUI">
    <!-- Touch-Optimized Hand, Mana, Turn Display -->
  </div>
  <script src="/socket.io/socket.io.js"></script>
  <script>/* Game Logic + Socket.io Client */</script>
</body>
</html>
```

### **Backend Architecture (Online Multiplayer)**
```
Server: Node.js + Express + Socket.io
server.js:
- Express static file serving
- Socket.io real-time communication
- Game room management
- Matchmaking queue
- Game state synchronization
```

### **Core JavaScript Classes**
```javascript
class Game {
  constructor() {
    this.board = new Board(4, 4);
    this.players = [new Player(1), new Player(2)];
    this.currentPlayer = 0;
    this.phase = 'CARD'; // 'CARD' or 'ACTION'
  }
}

class Unit {
  constructor(type, owner, position) {
    this.type = type;
    this.owner = owner;
    this.position = position;
    this.hp = MVP_UNITS[type].hp;
    this.maxHp = MVP_UNITS[type].hp;
    this.attack = MVP_UNITS[type].attack;
    this.movement = MVP_UNITS[type].movement;
    this.hasAttacked = false;
    this.hasMoved = false;
  }
}

class Player {
  constructor(id) {
    this.id = id;
    this.hand = [];
    this.deck = this.buildMVPDeck();
    this.mana = 1;
    this.maxMana = 1;
  }
}
```

### **Mobile-Responsive Canvas Rendering**
```javascript
class Renderer {
  constructor() {
    this.setupMobileCanvas();
    this.touchHandler = new TouchHandler();
  }

  setupMobileCanvas() {
    // Dynamic canvas sizing for mobile
    // Touch-friendly UI scaling
    // Responsive grid layout
  }

  drawBoard() {
    // 4x4 grid with responsive tile size
    // Touch-optimized borders and highlights
    // Mobile-friendly colors and contrast
  }

  drawUnits() {
    // Large, touch-friendly unit representations
    // Clear HP bars visible on small screens
    // High contrast unit type indicators
  }

  drawUI() {
    // Touch-optimized card hand (large tap targets)
    // Mobile-friendly mana display
    // Clear turn indicators
  }
}

class TouchHandler {
  // Converts touch events to game actions
  // Handles pinch, tap, drag for mobile
  // Provides visual feedback for touches
}
```

### **Socket.io Multiplayer System**
```javascript
// Client-side
const socket = io();

socket.on('gameFound', (gameData) => {
  // Start game with opponent
});

socket.on('gameUpdate', (gameState) => {
  // Sync game state
});

socket.emit('playCard', cardData);
socket.emit('moveUnit', moveData);

// Server-side
io.on('connection', (socket) => {
  socket.on('findGame', () => {
    matchmaking.addPlayer(socket);
  });

  socket.on('playCard', (data) => {
    game.playCard(socket.id, data);
    io.to(gameRoom).emit('gameUpdate', gameState);
  });
});
```

---

## 🎯 MVP Success Criteria

### **The "Holy Shit" Moment (5 Minutes) - Mobile Ready**
1. **Minute 1**: Player öffnet Link auf Handy → 4x4 Board perfekt sichtbar
2. **Minute 2**: "Find Match" → Queue → "Opponent Found!" → Real Multiplayer!
3. **Minute 3**: Spielt erste Karte per Touch → Unit spawnt → "WOW!"
4. **Minute 4**: Touch-Move Unit → Opponent reagiert in Echtzeit → "Das ist revolutionär!"
5. **Minute 5**: Combat + Weapon Triangle → "ICH MUSS DAS TEILEN!"

### **Technical Success**
- ✅ Läuft auf Desktop UND Mobile perfekt
- ✅ Keine Installation nötig
- ✅ 60fps Canvas Rendering (responsive)
- ✅ Intuitive Touch + Mouse Controls
- ✅ Online Multiplayer funktioniert stabil
- ✅ Komplettes Match in <20 Minuten
- ✅ Shareable Link für sofortiges Spielen

### **Gameplay Success**
- ✅ Jeder versteht es in 2 Minuten
- ✅ Erste Partie ist spannend
- ✅ Taktische Tiefe ist sofort erkennbar
- ✅ "Das ist revolutionär!" Reaktion

---

## 🚀 MVP Development Roadmap (Mobile + Multiplayer)

### **Week 1: Foundation + Multiplayer (40 hours)**
```
Day 1: Node.js Server + Socket.io Setup (8h)
Day 2: Mobile-First HTML5 Canvas + Touch Controls (8h)
Day 3: Basic Matchmaking + Game Room System (8h)
Day 4: Card System + Real-time Synchronization (8h)
Day 5: Unit Spawning + Multiplayer Movement (8h)
```

### **Week 2: Combat + Polish (40 hours)**
```
Day 6: Combat System + Weapon Triangle Sync (8h)
Day 7: Win Conditions + Game Flow (8h)
Day 8: Mobile UI Polish + Touch Optimization (8h)
Day 9: Connection Handling + Error Recovery (8h)
Day 10: Balance Testing + Deployment Prep (8h)
```

### **Week 3: Deployment + Testing (20 hours)**
```
Day 11-12: Heroku/Railway Deployment (8h)
Day 13: Mobile Device Testing (iPhone/Android) (8h)
Day 14-15: Bug Fixes + Performance Optimization (4h)
```

**Total Development Time: 100 hours (2.5 weeks full-time)**

---

## 🎮 MVP User Journey

### **First Time Player Experience (Mobile + Multiplayer)**
```
1. Opens Link auf Smartphone (z.B. battlechess2000.herokuapp.com)
2. Perfect mobile layout loads instantly
3. Big "FIND MATCH" button → taps it
4. "Searching for opponent..." → "Opponent found!"
5. Game starts → 4x4 grid + hand of 5 cards
6. Tutorial overlay: "Tap a card to spawn a unit"
7. Taps Scout card → Unit appears with animation
8. "Tap unit, then tap where to move"
9. Moves unit → opponent moves in real-time!
10. Combat happens → weapon triangle explained
11. Finishes 15-minute match
12. Immediately wants to share link with friends
13. "This is the future of mobile gaming!"
```

---

## ⚠️ MVP Constraints & Limitations

### **Deliberately Excluded Features**
- **Sound/Music**: Focus on gameplay first
- **Complex Abilities**: Keep units simple
- **Large Board**: 4x4 is enough to prove concept
- **Collection System**: Fixed decks for MVP
- **Visual Polish**: Functional > Beautiful
- **Persistent Accounts**: Session-based for MVP
- **Ranked System**: Casual matches only

### **Technical Constraints**
- **Basic Node.js Server**: Minimal complexity
- **Socket.io Only**: No complex networking
- **Canvas 2D Only**: No WebGL complexity
- **Touch + Mouse**: Optimized for both
- **Mobile-First**: But desktop compatible
- **Session Storage**: No database persistence

---

## 🔮 MVP to Full Game Path

### **Post-MVP Expansion**
```
MVP Success → Online Multiplayer → Bigger Board → More Units
     ↓              ↓                ↓            ↓
  Proof of      Real-time        Strategic     Meta Game
  Concept       Battles          Depth         Development
```

### **MVP Learning Goals**
1. **Is the core concept fun?**
2. **Do players understand the innovation immediately?**
3. **What's the optimal unit balance?**
4. **How long should games last?**
5. **What UI improvements are critical?**

---

**This MVP proves the concept. Everything else comes after validation! 🎯**