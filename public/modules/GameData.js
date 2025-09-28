// GameData.js - Game constants, unit definitions, and configuration
// Part of BattleChess2000 modularization

export class GameData {
    static get UNIT_TYPES() {
        return {
            SCOUT: { hp: 60, attack: 30, movement: 2, weapon: 'SWORD', cost: 1, color: '#4CAF50' },
            ARCHER: { hp: 80, attack: 60, movement: 1, weapon: 'BOW', cost: 3, color: '#2196F3' },
            KNIGHT: { hp: 150, attack: 90, movement: 1, weapon: 'LANCE', cost: 5, color: '#FF9800' }
        };
    }

    static get WEAPON_ADVANTAGE() {
        return {
            SWORD: 'BOW',
            BOW: 'LANCE',
            LANCE: 'SWORD'
        };
    }

    static get WEAPON_TYPES() {
        return {
            SCOUT: 'SWORD',
            ARCHER: 'BOW',
            KNIGHT: 'LANCE'
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
            BOARD_SIZE: 4,
            MAX_CANVAS_SIZE: 400,
            DEATH_ANIMATION_DURATION: 2000,
            HURT_ANIMATION_DURATION: 1000,
            ATTACK_ANIMATION_DURATION: 800
        };
    }
}