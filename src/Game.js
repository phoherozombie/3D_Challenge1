// src/Game.js
import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import * as CANNON from 'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js';
import { GAME_LOGIC } from './Constants.js';
import InputController from './InputController.js';
import UI from './UI.js';
import World from './World.js';
import Car from './Car.js';
import SettingsMenu from './SettingsMenu.js';

export default class Game {
    constructor() {
        // Core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null; // Physics world
        this.clock = new THREE.Clock();

        // Game entities
        this.car = null;
        this.worldManager = null;
        this.input = new InputController();
        this.ui = new UI();
        this.settingsMenu = null;

        // Audio components
        this.audioListener = null;
        this.engineSound = null;
        this.crashSound = null;

        // Game logic
        this.gameLogic = {
            startTime: Date.now(),
            lap: 0,
            checkpoint: false,
            gameFinished: false
        };
        this.checkpointBodies = {};

        // Camera shake
        this.cameraShakeIntensity = 0;
    }

    // Main initialization function
    init() {
        this.initThree();
        this.initCannon();

        // Create the world (lights, track, walls)
        this.worldManager = new World(this.scene, this.world);
        this.checkpointBodies = this.worldManager.init();

        // Create car - positioned at bottom of track, facing forward
        const outerSize = 100;
        const trackWidth = 8;
        this.car = new Car(this.scene, this.world, new CANNON.Vec3(0, 4, outerSize / 2 - trackWidth / 2 - 5));

        // Add neon glow to car (emissive)
        if (this.car.mesh.material) {
            this.car.mesh.material.emissive = new THREE.Color(0x00ffff);
            this.car.mesh.material.emissiveIntensity = 0.6;
        }

        // Load and configure audio
        this.initAudio();

        // Initialize settings menu
        this.settingsMenu = new SettingsMenu(this);

        this.initGameLogicListeners();
        this.initResizeListener();
        this.startGameLoop();

        // Initialize mini-map placeholder
        this.initMiniMap();
    }

    // R1: Setup Scene, Camera, Renderer
    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, -15);

        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);

        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
    }

    // R1: Setup Physics World
    initCannon() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.allowSleep = true;
    }

    // Load and configure audio
    initAudio() {
        const audioLoader = new THREE.AudioLoader();

        this.engineSound = new THREE.Audio(this.audioListener);
        audioLoader.load('./assets/audio/mechanical.wav', (buffer) => {
            this.engineSound.setBuffer(buffer);
            this.engineSound.setLoop(true);
            this.engineSound.setVolume(0.5);
            this.engineSound.play();
        }, undefined, (error) => {
            console.warn('Failed to load engine sound:', error);
        });

        this.crashSound = new THREE.Audio(this.audioListener);
        audioLoader.load('./assets/audio/collision.mp3', (buffer) => {
            this.crashSound.setBuffer(buffer);
            this.crashSound.setVolume(1.0);
        }, undefined, (error) => {
            console.warn('Failed to load crash sound:', error);
        });
    }

    // R3: Setup collision event listeners
    initGameLogicListeners() {
        let lastCheckpointTime = 0;
        let lastFinishLineTime = 0;
        const triggerCooldown = 500; // ms

        this.car.chassisBody.addEventListener('collide', (e) => {
            if (this.gameLogic.gameFinished) return;
            const currentTime = Date.now();

            // Collision with checkpoint
            if (e.body === this.checkpointBodies.midCheckpoint) {
                if (currentTime - lastCheckpointTime > triggerCooldown) {
                    this.gameLogic.checkpoint = true;
                    this.ui.showMessage("Checkpoint!");
                    lastCheckpointTime = currentTime;
                }
            }

            // Collision with finish line
            if (e.body === this.checkpointBodies.finishLine) {
                if (currentTime - lastFinishLineTime > triggerCooldown) {
                    if (this.gameLogic.checkpoint) {
                        this.gameLogic.lap++;
                        this.gameLogic.checkpoint = false;
                        this.ui.showMessage(`Lap ${this.gameLogic.lap} / ${this.gameLogic.totalLaps}`, 3000, "rgba(0, 255, 100, 0.75)");

                        if (this.gameLogic.lap >= this.gameLogic.totalLaps) {
                            this.gameLogic.gameFinished = true;
                            this.ui.showMessage(`Finished!`, 5000, "rgba(255, 215, 0, 0.8)");
                        }
                    } else {
                        this.ui.showMessage("Pass the checkpoint first!", 1500, "rgba(255, 100, 0, 0.75)");
                    }
                    lastFinishLineTime = currentTime;
                }
            }

            // Wall collision - trigger crash sound and camera shake
            const isWall = e.body.mass === 0 && e.body !== this.checkpointBodies.midCheckpoint && e.body !== this.checkpointBodies.finishLine;
            if (isWall) {
                if (this.crashSound && !this.crashSound.isPlaying) this.crashSound.play();
                this.cameraShakeIntensity = 0.3; // shake intensity
            }
        });
    }

    // Start game loop
    startGameLoop() {
        this.renderer.setAnimationLoop(() => this.animate());
    }

    // Main animation loop
    animate() {
        const deltaTime = this.clock.getDelta();

        // Update physics
        this.world.step(1 / 60, deltaTime);

        // Update controls
        const controls = this.input.getControls();

        if (!this.gameLogic.gameFinished) {
            this.car.applyControls(controls);

            // Engine pitch according to speed
            const speed = this.car.getVelocity();
            if (this.engineSound) {
                this.engineSound.setPlaybackRate(1 + speed / 50);
            }
        } else {
            this.car.applyControls({ forward: false, backward: false, left: false, right: false });
            if (this.engineSound && this.engineSound.isPlaying) this.engineSound.pause();
        }

        // Sync graphics with physics
        this.car.syncGraphics();

        // Camera follow with shake
        this.updateCamera();

        // Update HUD
        this.updateHUD();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    // Camera follow logic with shake
    updateCamera() {
        const carPosition = this.car.getPosition();
        const carQuaternion = this.car.getQuaternion();

        const cameraMode = this.settingsMenu ? this.settingsMenu.settings.cameraMode : 'follow';
        const baseOffset = cameraMode === 'thirdPerson' 
            ? new THREE.Vector3(0, 13, 25) 
            : new THREE.Vector3(0, 5, 10);

        const offset = this.settingsMenu
            ? new THREE.Vector3(
                this.settingsMenu.settings.cameraOffsetX,
                this.settingsMenu.settings.cameraOffsetY + (cameraMode==='thirdPerson'?8:0),
                this.settingsMenu.settings.cameraOffsetZ + (cameraMode==='thirdPerson'?15:0)
            )
            : baseOffset;

        offset.applyQuaternion(carQuaternion);
        const targetPosition = carPosition.clone().add(offset);

        // Apply camera shake
        if (this.cameraShakeIntensity > 0) {
            targetPosition.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
            targetPosition.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
            targetPosition.z += (Math.random() - 0.5) * this.cameraShakeIntensity;
            this.cameraShakeIntensity *= 0.9; // decay
        }

        const lerpValue = this.settingsMenu ? this.settingsMenu.settings.cameraLerp : 0.1;
        this.camera.position.lerp(targetPosition, lerpValue);

        if (cameraMode === 'thirdPerson') {
            const lookAhead = new THREE.Vector3(0, 0, -5).applyQuaternion(carQuaternion);
            this.camera.lookAt(carPosition.clone().add(lookAhead));
        } else {
            this.camera.lookAt(carPosition);
        }
    }

    // Update HUD
    updateHUD() {
        const speed = this.car.getVelocity();
        this.ui.updateSpeed(speed);
        this.ui.updateLap(this.gameLogic.lap, this.gameLogic.totalLaps);

        if (!this.gameLogic.gameFinished) {
            const elapsedTime = (Date.now() - this.gameLogic.startTime) / 1000;
            this.ui.updateTimer(elapsedTime);
        }
    }

    // Handle window resize
    initResizeListener() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // Mini-map placeholder
    initMiniMap() {
        this.miniMap = document.createElement('div');
        this.miniMap.style.position = 'absolute';
        this.miniMap.style.bottom = '10px';
        this.miniMap.style.right = '10px';
        this.miniMap.style.width = '150px';
        this.miniMap.style.height = '150px';
        this.miniMap.style.background = 'rgba(0,0,0,0.3)';
        this.miniMap.style.border = '1px solid #fff';
        this.miniMap.innerHTML = '<p style="color:white; text-align:center;">Mini-map</p>';
        document.body.appendChild(this.miniMap);
    }
}
