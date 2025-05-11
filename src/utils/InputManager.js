export class InputManager {
    /**
     * Initialisiert den Input-Manager
     */
    constructor() {
        this.isCtrlPressed = false;
        this.isMiddleMouseButtonPressed = false;
        this.isShiftPressed = false;
        this.isDraggingForCamera = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
    }

    /**
     * Verarbeitet Tastendruck-Ereignisse
     * @param {KeyboardEvent} event - Das Tastendruck-Ereignis
     */
    onKeyDown(event) {
        if (event.key === 'Control') this.isCtrlPressed = true;
        if (event.key === 'Shift') this.isShiftPressed = true;
    }

    /**
     * Verarbeitet Tastenloslassen-Ereignisse
     * @param {KeyboardEvent} event - Das Tastenloslassen-Ereignis
     */
    onKeyUp(event) {
        if (event.key === 'Control') {
            this.isCtrlPressed = false;
            if (!this.isMiddleMouseButtonPressed && !this.isShiftPressed) {
                this.isDraggingForCamera = false;
            }
        }
        if (event.key === 'Shift') {
            this.isShiftPressed = false;
            if (!this.isCtrlPressed && !this.isMiddleMouseButtonPressed) {
                this.isDraggingForCamera = false;
            }
        }
    }

    /**
     * Verarbeitet Mausklick-Ereignisse
     * @param {MouseEvent} event - Das Mausklick-Ereignis
     * @param {THREE.Camera} camera - Die Kamera
     * @returns {Object} Informationen über den Klick
     */
    onMouseDown(event, camera) {
        // Kamerasteuerung
        if (event.button === 1 || 
            (this.isCtrlPressed && event.button === 0) || 
            (this.isShiftPressed && event.button === 0)) {
            this.isMiddleMouseButtonPressed = (event.button === 1);
            this.isDraggingForCamera = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            event.preventDefault();
            return { isCameraControl: true };
        }

        // Spielinteraktionen
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, camera);

        return {
            isCameraControl: false,
            mouse: this.mouse,
            raycaster: this.raycaster
        };
    }

    /**
     * Verarbeitet Mausbewegungs-Ereignisse
     * @param {MouseEvent} event - Das Mausbewegungs-Ereignis
     * @returns {Object|null} Informationen über die Bewegung oder null
     */
    onMouseMove(event) {
        if (this.isDraggingForCamera) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;

            return {
                deltaX,
                deltaY,
                isShiftPressed: this.isShiftPressed
            };
        }
        return null;
    }

    /**
     * Verarbeitet Mausloslassen-Ereignisse
     * @param {MouseEvent} event - Das Mausloslassen-Ereignis
     */
    onMouseUp(event) {
        if (event.button === 1) {
            this.isMiddleMouseButtonPressed = false;
        }
        if (!this.isCtrlPressed && !this.isMiddleMouseButtonPressed && !this.isShiftPressed) {
            this.isDraggingForCamera = false;
        }
    }

    /**
     * Verarbeitet Mausrad-Ereignisse
     * @param {WheelEvent} event - Das Mausrad-Ereignis
     * @returns {number} Der Zoom-Faktor
     */
    onMouseWheel(event) {
        return event.deltaY;
    }
} 