import { GAME_STATE } from '../config.js';

export class GameState {
    /**
     * Initialisiert den Spielzustand
     */
    constructor() {
        this.currentPlayer = 1;
        this.selectedTank = null;
        this.tankAwaitingEndTurnClick = null;
        this.currentGameState = GAME_STATE.INITIAL;
        this.scores = { player1: 0, player2: 0 };
    }

    /**
     * Wechselt den aktiven Spieler
     * @param {Array} tanks - Die Panzer im Spiel
     * @returns {boolean} True, wenn eine neue Runde beginnt
     */
    switchPlayer(tanks) {
        const oldPlayer = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.currentGameState = GAME_STATE.SELECT_TANK;
        
        // Reset Auswahl
        if (this.selectedTank) {
            this.selectedTank.mesh.userData.selectionGlow = 0;
            this.selectedTank.mesh.children.forEach(c => {
                if (c.material && c.material.emissive) {
                    c.material.emissive.set(0x000000);
                }
            });
            this.selectedTank = null;
        }
        
        if (this.tankAwaitingEndTurnClick) {
            this.tankAwaitingEndTurnClick = null;
        }

        // Prüfe Rundenende
        const tanksOfOldPlayer = tanks.filter(t => t.mesh.userData.player === oldPlayer);
        const oldPlayerAllTanksMoved = tanksOfOldPlayer.length > 0 && 
            tanksOfOldPlayer.every(t => t.mesh.userData.movedThisTurn);

        const tanksOfNewPlayer = tanks.filter(t => t.mesh.userData.player === this.currentPlayer);
        const newPlayerAllTanksMoved = tanksOfNewPlayer.length > 0 && 
            tanksOfNewPlayer.every(t => t.mesh.userData.movedThisTurn);

        if (oldPlayerAllTanksMoved && newPlayerAllTanksMoved) {
            tanks.forEach(tank => {
                tank.mesh.userData.movedThisTurn = false;
            });
            return true;
        }
        
        return false;
    }

    /**
     * Prüft, ob das Spiel beendet ist
     * @param {Array} tanks - Die Panzer im Spiel
     * @returns {string|null} Die Game-Over-Nachricht oder null
     */
    checkGameOver(tanks) {
        if (this.currentGameState === GAME_STATE.GAME_OVER) return null;
        
        const player1TanksLeft = tanks.filter(t => t.mesh.userData.player === 1).length;
        const player2TanksLeft = tanks.filter(t => t.mesh.userData.player === 2).length;
        
        if (player1TanksLeft === 0 && player2TanksLeft > 0) {
            this.currentGameState = GAME_STATE.GAME_OVER;
            return "Spieler 2 (Orange) gewinnt!";
        } else if (player2TanksLeft === 0 && player1TanksLeft > 0) {
            this.currentGameState = GAME_STATE.GAME_OVER;
            return "Spieler 1 (Rot) gewinnt!";
        } else if (player1TanksLeft === 0 && player2TanksLeft === 0) {
            this.currentGameState = GAME_STATE.GAME_OVER;
            return "Unentschieden!";
        }
        
        return null;
    }

    /**
     * Setzt den Spielzustand zurück
     */
    reset() {
        this.currentPlayer = 1;
        this.selectedTank = null;
        this.tankAwaitingEndTurnClick = null;
        this.currentGameState = GAME_STATE.INITIAL;
        this.scores = { player1: 0, player2: 0 };
    }

    /**
     * Gibt den aktuellen Spielzustand zurück
     * @returns {string} Der aktuelle Spielzustand
     */
    getCurrentState() {
        return this.currentGameState;
    }

    /**
     * Setzt den Spielzustand
     * @param {string} state - Der neue Spielzustand
     */
    setState(state) {
        this.currentGameState = state;
    }

    /**
     * Gibt den aktuellen Spieler zurück
     * @returns {number} Der aktuelle Spieler
     */
    getCurrentPlayer() {
        return this.currentPlayer;
    }
} 