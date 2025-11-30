// src/InputController.js

export default class InputController {
    constructor() {
        this.keys = {}; // Store the state of all keys
        this.initListeners();
    }

    // Initialize event listeners
    initListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    // Helper function to check if a key is pressed
    isKeyPressed(key) {
        return this.keys[key] || false;
    }

    // Return the current control state for the car
    getControls() {
        return {
            forward: this.isKeyPressed('w') || this.isKeyPressed('arrowup'),
            backward: this.isKeyPressed('s') || this.isKeyPressed('arrowdown'),
            left: this.isKeyPressed('a') || this.isKeyPressed('arrowleft'),
            right: this.isKeyPressed('d') || this.isKeyPressed('arrowright'),
        };
    }
}
