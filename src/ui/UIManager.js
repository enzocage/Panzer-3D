import { GAME_STATE } from '../config.js';

export class UIManager {
    /**
     * Initialisiert den UI-Manager
     */
    constructor() {
        this.scorePlayer1Elem = document.getElementById('scorePlayer1');
        this.scorePlayer2Elem = document.getElementById('scorePlayer2');
        this.turnInfoElem = document.getElementById('turnInfo');
        this.gameOverMessageElem = document.getElementById('gameOverMessage');
        this.startMessageElem = document.getElementById('startMessage');
    }

    /**
     * Aktualisiert die Spieler-Punktestände
     * @param {Object} scores - Die Punktestände der Spieler
     */
    updateScores(scores) {
        this.scorePlayer1Elem.textContent = `Spieler 1 (Rot): ${scores.player1}`;
        this.scorePlayer2Elem.textContent = `Spieler 2 (Orange): ${scores.player2}`;
    }

    /**
     * Aktualisiert die Spielinformationen
     * @param {number} currentPlayer - Der aktuelle Spieler
     * @param {string} gameState - Der aktuelle Spielzustand
     * @param {Array} tanks - Die Panzer im Spiel
     */
    updateTurnInfo(currentPlayer, gameState, tanks) {
        if (gameState === GAME_STATE.INITIAL) {
            this.turnInfoElem.textContent = "Warte auf Spielstart...";
            return;
        }
        
        if (gameState === GAME_STATE.GAME_OVER) {
            this.turnInfoElem.textContent = "Spiel beendet!";
            return;
        }
        
        let message = `Spieler ${currentPlayer} (${currentPlayer === 1 ? "Rot" : "Orange"}) ist am Zug: `;
        
        switch (gameState) {
            case GAME_STATE.SELECT_TANK:
                const tanksOfCurrentPlayer = tanks.filter(t => t.mesh.userData.player === currentPlayer);
                const allTanksMovedThisGrandRound = tanksOfCurrentPlayer.length > 0 && 
                    tanksOfCurrentPlayer.every(t => t.mesh.userData.movedThisTurn);
                
                if (tanksOfCurrentPlayer.length === 0) {
                    message += "Keine Panzer mehr!";
                } else if (allTanksMovedThisGrandRound && 
                    tanks.filter(t => t.mesh.userData.player !== currentPlayer && 
                    !t.mesh.userData.movedThisTurn).length === 0) {
                    message += "Alle Panzer haben agiert. Neue Runde beginnt gleich...";
                } else if (allTanksMovedThisGrandRound) {
                    message += "Alle Panzer haben agiert. Warte auf Gegner.";
                } else {
                    message += "Panzer auswählen.";
                }
                break;
                
            case GAME_STATE.MOVE_TANK:
                message += "Ziel für Panzerbewegung auswählen.";
                break;
                
            case GAME_STATE.TANK_MOVING:
                message += "Panzer bewegt sich...";
                break;
                
            case GAME_STATE.AWAITING_END_TURN_CLICK:
                message += "Klicken, um Zug zu beenden (Turm rotiert).";
                break;
        }
        
        this.turnInfoElem.textContent = message;
    }

    /**
     * Zeigt eine benutzerdefinierte Nachricht an
     * @param {string} message - Die anzuzeigende Nachricht
     */
    showMessage(message) {
        this.turnInfoElem.textContent = message;
    }

    /**
     * Zeigt die Game-Over-Nachricht an
     * @param {string} message - Die Game-Over-Nachricht
     */
    showGameOverMessage(message) {
        this.gameOverMessageElem.textContent = message;
        this.gameOverMessageElem.style.display = 'block';
    }

    /**
     * Versteckt die Start-Nachricht
     */
    hideStartMessage() {
        this.startMessageElem.style.display = 'none';
    }

    /**
     * Fügt einen Event-Listener für den Spielstart hinzu
     * @param {Function} callback - Die aufzurufende Funktion
     */
    addStartListener(callback) {
        this.startMessageElem.addEventListener('click', callback);
    }

    /**
     * Entfernt den Event-Listener für den Spielstart
     * @param {Function} callback - Die zu entfernende Funktion
     */
    removeStartListener(callback) {
        this.startMessageElem.removeEventListener('click', callback);
    }
} 