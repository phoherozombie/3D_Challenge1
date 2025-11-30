// src/UI.js

export default class UI {
    constructor() {
        // Get DOM elements
        this.speedElement = document.getElementById('speed');
        this.lapElement = document.getElementById('lap');
        this.timerElement = document.getElementById('timer');
        this.messageElement = document.getElementById('message');
    }

    // Update speed display in km/h
    updateSpeed(speed) {
        const kmh = (speed * 3.6).toFixed(0);
        this.speedElement.textContent = kmh;
    }

    // Update lap counter
    updateLap(lap, totalLaps) {
        this.lapElement.textContent = `${lap} / ${totalLaps}`;
    }

    // Update timer display
    updateTimer(time) {
        this.timerElement.textContent = time.toFixed(2);
    }

    // Show a temporary message with optional duration and background color
    showMessage(
    text, 
    duration = 1000, 
    options = { 
        backgroundColor: "rgba(255, 255, 0, 0.75)", 
        color: "#000", 
        border: "2px solid #fff", 
        borderRadius: "8px",
        padding: "0.5rem 1rem",
        fontSize: "1.2rem",
        fontWeight: "bold"
    }
) {
    const { backgroundColor, color, border, borderRadius, padding, fontSize, fontWeight } = options;

    this.messageElement.textContent = text;

    // Apply style
    this.messageElement.style.display = 'block';
    this.messageElement.style.backgroundColor = backgroundColor;
    this.messageElement.style.color = color;
    this.messageElement.style.border = border;
    this.messageElement.style.borderRadius = borderRadius;
    this.messageElement.style.padding = padding;
    this.messageElement.style.fontSize = fontSize;
    this.messageElement.style.fontWeight = fontWeight;
    this.messageElement.style.textAlign = "center";
    this.messageElement.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    this.messageElement.style.position = "absolute";
    this.messageElement.style.top = "20px";
    this.messageElement.style.left = "50%";
    this.messageElement.style.transform = "translateX(-50%)";
    this.messageElement.style.zIndex = 1000;

    // Hide after duration
    setTimeout(() => {
        this.messageElement.style.display = 'none';
    }, duration);
}

}
