// src/SettingsMenu.js
// Redesigned Settings Menu (Glassmorphism Style)

import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

export default class SettingsMenu {
    constructor(game) {
        this.game = game;
        this.isOpen = false;

        this.defaults = {
            lightIntensity: 0.8,
            ambientIntensity: 0.4,
            shadowEnabled: true,
            shadowType: "PCF",
            cameraOffsetX: 0,
            cameraOffsetY: 5,
            cameraOffsetZ: 10,
            cameraLerp: 0.1,
            cameraMode: "follow",
        };

        this.settings = { ...this.defaults };
        this.loadSettings();

        this.createMenu();
        this.setupEventListeners();
    }

    // ==============================
    // UI CREATION
    // ==============================
    createMenu() {
        // ---- Container ----
        this.container = document.createElement("div");
        this.container.id = "settingsMenu";
        this.container.style.cssText = `
            position: absolute;
            top: 80px;
            right: 30px;
            padding: 1.2rem;
            backdrop-filter: blur(12px);
            background: rgba(50, 50, 50, 0.35);
            border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
            border-radius: 1rem;
            min-width: 270px;
            max-width: 340px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: Arial, sans-serif;
            color: #fff;
            display: none;
            animation: fadeIn 0.25s ease-out;
            z-index: 999;
        `;

        // ---- Floating Settings Button ----
        this.toggleButton = document.createElement("div");
        this.toggleButton.innerHTML = "⚙️";
        this.toggleButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.45);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 50%;
            font-size: 1.4rem;
            cursor: pointer;
            transition: 0.25s;
            z-index: 1001;
        `;
        this.toggleButton.onmouseenter = () => {
            this.toggleButton.style.background = "rgba(0,0,0,0.65)";
            this.toggleButton.style.transform = "scale(1.05)";
        };
        this.toggleButton.onmouseleave = () => {
            this.toggleButton.style.background = "rgba(0,0,0,0.45)";
            this.toggleButton.style.transform = "scale(1)";
        };

        // ---- Title ----
        const title = document.createElement("h3");
        title.textContent = "⚙️ Settings";
        title.style.cssText = `
            margin: 0 0 0.8rem 0;
            padding-bottom: 0.6rem;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            font-size: 1.1rem;
            opacity: 0.9;
        `;
        this.container.appendChild(title);

        // Sections
        this.createLightSection();
        this.createShadowSection();
        this.createCameraSection();

        // ---- Reset Button ----
        const resetBtn = document.createElement("button");
        resetBtn.textContent = "Reset to default";
        resetBtn.style.cssText = `
            width: 100%;
            padding: 0.6rem;
            margin-top: 0.6rem;
            background: rgba(255,50,50,0.6);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 0.5rem;
            color: #fff;
            cursor: pointer;
            transition: 0.2s;
        `;
        resetBtn.onmouseenter = () => (resetBtn.style.background = "rgba(255,50,50,0.8)");
        resetBtn.onmouseleave = () => (resetBtn.style.background = "rgba(255,50,50,0.6)");
        resetBtn.onclick = () => this.resetSettings();

        this.container.appendChild(resetBtn);

        document.body.appendChild(this.container);
        document.body.appendChild(this.toggleButton);
    }

    // ==============================
    // UI Utility - Collapsible Section
    // ==============================
    createSection(titleText, emoji) {
        const section = document.createElement("div");
        section.style.marginBottom = "1.2rem";

        const header = document.createElement("div");
        header.innerHTML = `${emoji} <b>${titleText}</b>`;
        header.style.cssText = `
            font-size: 1rem;
            cursor: pointer;
            padding: 0.4rem;
            border-radius: 0.4rem;
            background: rgba(255,255,255,0.08);
            transition: 0.2s;
            margin-bottom: 0.4rem;
        `;
        header.onmouseenter = () => (header.style.background = "rgba(255,255,255,0.15)");
        header.onmouseleave = () => (header.style.background = "rgba(255,255,255,0.08)");

        const content = document.createElement("div");
        content.style.marginTop = "0.4rem";

        header.onclick = () => {
            content.style.display = content.style.display === "none" ? "block" : "none";
        };

        section.appendChild(header);
        section.appendChild(content);

        return { section, content };
    }

    // ==============================
    // LIGHT SECTION
    // ==============================
    createLightSection() {
        const { section, content } = this.createSection("Lighting", "💡");

        content.appendChild(
            this.createSlider("Main light intensity", this.settings.lightIntensity, 0, 2, 0.1, (v) => {
                this.settings.lightIntensity = v;
                if (this.game.worldManager?.directionalLight)
                    this.game.worldManager.directionalLight.intensity = v;
                this.saveSettings();
            })
        );

        content.appendChild(
            this.createSlider("Ambient light intensity", this.settings.ambientIntensity, 0, 1, 0.1, (v) => {
                this.settings.ambientIntensity = v;
                if (this.game.worldManager?.ambientLight)
                    this.game.worldManager.ambientLight.intensity = v;
                this.saveSettings();
            })
        );

        this.container.appendChild(section);
    }

    // ==============================
    // SHADOW SECTION
    // ==============================
    createShadowSection() {
        const { section, content } = this.createSection("Shadow", "🌑");

        content.appendChild(
            this.createToggle("Enable Shadow", this.settings.shadowEnabled, (enabled) => {
                this.settings.shadowEnabled = enabled;
                if (this.game.renderer) this.game.renderer.shadowMap.enabled = enabled;
                this.saveSettings();
            })
        );

        // Shadow type dropdown
        const wrap = document.createElement("div");
        wrap.style.marginTop = "0.5rem";

        const label = document.createElement("label");
        label.textContent = "Shadow Type:";
        label.style.marginRight = "0.5rem";

        const select = document.createElement("select");
        select.style.cssText = `
            padding: 0.3rem;
            border-radius: 0.4rem;
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.25);
        `;

        ["Basic", "PCF", "PCFSoft"].forEach((t) => {
            const o = document.createElement("option");
            o.value = t;
            o.textContent = t;
            if (t === this.settings.shadowType) o.selected = true;
            select.appendChild(o);
        });

        select.onchange = (e) => {
            const type = e.target.value;
            this.settings.shadowType = type;

            const shadowTypes = {
                Basic: THREE.BasicShadowMap,
                PCF: THREE.PCFShadowMap,
                PCFSoft: THREE.PCFSoftShadowMap,
            };

            if (this.game.renderer) this.game.renderer.shadowMap.type = shadowTypes[type];
            this.saveSettings();
        };

        wrap.appendChild(label);
        wrap.appendChild(select);
        content.appendChild(wrap);

        this.container.appendChild(section);
    }

    // ==============================
    // CAMERA SECTION
    // ==============================
    createCameraSection() {
        const { section, content } = this.createSection("Camera", "📷");

        // Mode
        const modeWrap = document.createElement("div");
        modeWrap.style.marginBottom = "1rem";

        const label = document.createElement("label");
        label.textContent = "Camera Mode:";
        label.style.marginRight = "0.5rem";

        const select = document.createElement("select");
        select.style.cssText = `
            padding: 0.3rem;
            border-radius: 0.4rem;
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.25);
        `;

        ["follow", "thirdPerson"].forEach((m) => {
            const o = document.createElement("option");
            o.value = m;
            o.textContent = m === "follow" ? "Follow" : "Third Person";
            if (m === this.settings.cameraMode) o.selected = true;
            select.appendChild(o);
        });

        select.onchange = (e) => {
            this.settings.cameraMode = e.target.value;
            this.saveSettings();
        };

        modeWrap.appendChild(label);
        modeWrap.appendChild(select);
        content.appendChild(modeWrap);

        // Offsets
        content.appendChild(
            this.createSlider("Offset X", this.settings.cameraOffsetX, -10, 10, 0.5, (v) => {
                this.settings.cameraOffsetX = v;
                this.saveSettings();
            })
        );

        content.appendChild(
            this.createSlider("Offset Y", this.settings.cameraOffsetY, 0, 20, 0.5, (v) => {
                this.settings.cameraOffsetY = v;
                this.saveSettings();
            })
        );

        content.appendChild(
            this.createSlider("Offset Z", this.settings.cameraOffsetZ, 0, 30, 0.5, (v) => {
                this.settings.cameraOffsetZ = v;
                this.saveSettings();
            })
        );

        content.appendChild(
            this.createSlider("Lerp (Smoothness)", this.settings.cameraLerp, 0.01, 1, 0.01, (v) => {
                this.settings.cameraLerp = v;
                this.saveSettings();
            })
        );

        this.container.appendChild(section);
    }

    // ==============================
    // SLIDER UI
    // ==============================
    createSlider(labelText, value, min, max, step, onChange) {
        const wrap = document.createElement("div");
        wrap.style.marginBottom = "0.9rem";

        const label = document.createElement("label");
        label.textContent = labelText;
        label.style.opacity = "0.85";
        label.style.fontSize = "0.9rem";

        const row = document.createElement("div");
        row.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.6rem;
            margin-top: 0.35rem;
        `;

        const slider = document.createElement("input");
        slider.type = "range";
        slider.value = value;
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.style.flex = "1";
        slider.style.cursor = "pointer";

        const val = document.createElement("span");
        val.style.width = "48px";
        val.style.textAlign = "right";
        val.style.opacity = "0.85";
        val.textContent = value.toFixed(2);

        slider.oninput = (e) => {
            const v = parseFloat(e.target.value);
            val.textContent = v.toFixed(2);
            onChange(v);
        };

        row.appendChild(slider);
        row.appendChild(val);

        wrap.appendChild(label);
        wrap.appendChild(row);

        return wrap;
    }

    // ==============================
    // CHECKBOX
    // ==============================
    createToggle(labelText, value, onChange) {
        const wrap = document.createElement("div");
        wrap.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.8rem;
        `;

        const label = document.createElement("label");
        label.textContent = labelText;
        label.style.opacity = "0.85";

        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = value;
        toggle.style.cursor = "pointer";

        toggle.onchange = (e) => onChange(e.target.checked);

        wrap.appendChild(label);
        wrap.appendChild(toggle);

        return wrap;
    }

    // ==============================
    // EVENTS
    // ==============================
    setupEventListeners() {
        this.toggleButton.onclick = () => this.toggle();
        document.addEventListener("keydown", (e) => {
            if (e.key === "s" || e.key === "S") this.toggle();
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.container.style.display = this.isOpen ? "block" : "none";
    }

    // ==============================
    // SAVE / LOAD
    // ==============================
    resetSettings() {
        this.settings = { ...this.defaults };
        localStorage.removeItem("gameSettings");
        location.reload();
    }

    saveSettings() {
        localStorage.setItem("gameSettings", JSON.stringify(this.settings));
    }

    loadSettings() {
        const saved = localStorage.getItem("gameSettings");
        if (saved) {
            try {
                this.settings = JSON.parse(saved);
            } catch (e) {}
        }
    }

    // External getters
    getCameraOffset() {
        return {
            x: this.settings.cameraOffsetX,
            y: this.settings.cameraOffsetY,
            z: this.settings.cameraOffsetZ,
        };
    }
    getCameraLerp() {
        return this.settings.cameraLerp;
    }
}
