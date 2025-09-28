// GameData.js - Game constants, unit definitions, and configuration
// Part of BattleChess2000 modularization

export class GameData {
    static get UNIT_TYPES() {
        return {
            SCOUT: { hp: 25, attack: 30, movement: 'STRAIGHT_1', weapon: 'SWORD', cost: 1, color: '#4CAF50' },
            ARCHER: { hp: 50, attack: 40, movement: 'STRAIGHT', weapon: 'BOW', cost: 3, color: '#2196F3' },
            KNIGHT: { hp: 90, attack: 60, movement: 'ADJACENT', weapon: 'LANCE', cost: 5, color: '#FF9800' },
            MAGE: { hp: 35, attack: 80, movement: 'DIAGONAL', weapon: 'STAFF', cost: 6, color: '#9C27B0' }
        };
    }

    static get WEAPON_ADVANTAGE() {
        return {
            SWORD: 'STAFF',
            STAFF: 'BOW',
            BOW: 'LANCE',
            LANCE: 'SWORD'
        };
    }

    static get WEAPON_TYPES() {
        return {
            SCOUT: 'SWORD',
            ARCHER: 'BOW',
            KNIGHT: 'LANCE',
            MAGE: 'STAFF'
        };
    }

    static getUnitWeapon(unitType) {
        return this.WEAPON_TYPES[unitType];
    }

    static getUnitStats(unitType) {
        return this.UNIT_TYPES[unitType];
    }

    static hasWeaponAdvantage(attackerWeapon, defenderWeapon) {
        return this.WEAPON_ADVANTAGE[attackerWeapon] === defenderWeapon;
    }

    // Game configuration constants
    static get CONFIG() {
        return {
            BOARD_SIZE: 5,
            MAX_CANVAS_SIZE: 400,
            DEATH_ANIMATION_DURATION: 2000,
            HURT_ANIMATION_DURATION: 1000,
            ATTACK_ANIMATION_DURATION: 800,
            WEAPON_ADVANTAGE_MULTIPLIER: 1.4
        };
    }
}