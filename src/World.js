// src/World.js
// Game world setup: track, walls, lights, checkpoints

import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import * as CANNON from 'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js';

export default class World {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.world = physicsWorld;
    }

    init() {
        this.createLights();
        this.createTrack();
        this.createWalls();
        const checkpointBodies = this.createCheckpoints();
        return checkpointBodies;
    }

    createLights() {
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 100, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this.directionalLight);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);
    }

    createTrack() {
        const trackWidth = 8;
        const outerSize = 100;
        const innerIslandSize = 40;

        const textureLoader = new THREE.TextureLoader();
        const defaultMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(outerSize, outerSize);
        groundGeometry.rotateX(-Math.PI / 2);
        const groundMesh = new THREE.Mesh(groundGeometry, defaultMaterial);
        groundMesh.position.set(0, 0, 0);
        groundMesh.receiveShadow = true;
        this.scene.add(groundMesh);

        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);

        // --- Vẽ đường viền dạng đường đua ---
        const trackShape = new THREE.Shape();
        const halfOuter = outerSize / 2;
        const halfInner = innerIslandSize / 2 + trackWidth;

        // Tạo hình chữ nhật bên ngoài
        trackShape.moveTo(-halfOuter, -halfOuter);
        trackShape.lineTo(-halfOuter, halfOuter);
        trackShape.lineTo(halfOuter, halfOuter);
        trackShape.lineTo(halfOuter, -halfOuter);
        trackShape.lineTo(-halfOuter, -halfOuter);

        // Vẽ lỗ bên trong (inner island)
        const hole = new THREE.Path();
        hole.moveTo(-halfInner, -halfInner);
        hole.lineTo(-halfInner, halfInner);
        hole.lineTo(halfInner, halfInner);
        hole.lineTo(halfInner, -halfInner);
        hole.lineTo(-halfInner, -halfInner);
        trackShape.holes.push(hole);

        const extrudeSettings = { depth: 0.05, bevelEnabled: false };
        const trackGeometry = new THREE.ExtrudeGeometry(trackShape, extrudeSettings);
        trackGeometry.rotateX(-Math.PI / 2);
        const trackMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        trackMesh.position.y = 0.02; // hơi nhô lên mặt đất
        this.scene.add(trackMesh);

        // Track segments cũ vẫn giữ để physics
        this.createTrackSegment(outerSize, trackWidth, 0, -outerSize / 2 + trackWidth / 2, textureLoader);
        this.createTrackSegment(outerSize, trackWidth, 0, outerSize / 2 - trackWidth / 2, textureLoader);
        this.createTrackSegment(trackWidth, outerSize - innerIslandSize, -outerSize / 2 + trackWidth / 2, 0, textureLoader);
        this.createTrackSegment(trackWidth, outerSize - innerIslandSize, outerSize / 2 - trackWidth / 2, 0, textureLoader);
    }

    createTrackSegment(width, length, x, z, textureLoader) {
        const geometry = new THREE.PlaneGeometry(width, length);
        geometry.rotateX(-Math.PI / 2);

        const defaultMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const mesh = new THREE.Mesh(geometry, defaultMaterial);
        mesh.position.set(x, 0.01, z);
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        textureLoader.load(
            './assets/textures/track.jpg',
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(2, 2);
                mesh.material = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide });
            }
        );

        const shape = new CANNON.Plane();
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        body.position.set(x, 0, z);
        this.world.addBody(body);
    }

    createWalls() {
        const outerSize = 100;
        const innerRadius = 20; // inner island circular
        const wallHeight = 3;
        const wallThickness = 0.5;

        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });

        // Outer walls: rectangle
        this.createWallSegment(outerSize + wallThickness * 2, wallThickness, wallHeight, 0, -outerSize / 2 - wallThickness / 2, wallMaterial);
        this.createWallSegment(outerSize + wallThickness * 2, wallThickness, wallHeight, 0, outerSize / 2 + wallThickness / 2, wallMaterial);
        this.createWallSegment(wallThickness, outerSize + wallThickness * 2, wallHeight, -outerSize / 2 - wallThickness / 2, 0, wallMaterial);
        this.createWallSegment(wallThickness, outerSize + wallThickness * 2, wallHeight, outerSize / 2 + wallThickness / 2, 0, wallMaterial);

        // Inner island wall: circular
        const segments = 64;
        const innerGeometry = new THREE.TorusGeometry(innerRadius, wallThickness / 2, 8, segments);
        innerGeometry.rotateX(Math.PI / 2);
        const innerMesh = new THREE.Mesh(innerGeometry, wallMaterial);
        innerMesh.position.y = wallHeight / 2;
        innerMesh.castShadow = true;
        innerMesh.receiveShadow = true;
        this.scene.add(innerMesh);

        // Physics approximation: many small boxes along circle
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * innerRadius;
            const z = Math.sin(angle) * innerRadius;
            const shape = new CANNON.Box(new CANNON.Vec3(wallThickness / 2, wallHeight / 2, wallThickness / 2));
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(shape);
            body.position.set(x, wallHeight / 2, z);
            this.world.addBody(body);
        }
    }

    createWallSegment(width, depth, height, x, z, material) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, height / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(x, height / 2, z);
        this.world.addBody(body);
    }

 createCheckpoints() {
    const checkpointBodies = {};
    const outerSize = 100;
    const trackWidth = 8;

    // Chiều dài checkpoint
    const cpLength = trackWidth * 3.0;

    // ---------- MID CHECKPOINT ----------
    const midShape = new CANNON.Box(new CANNON.Vec3(cpLength / 2, 1, 0.1));
    const midBody = new CANNON.Body({ mass: 0, isTrigger: true });
    midBody.addShape(midShape);
    midBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
    midBody.position.set(0, 1, outerSize / 4);
    this.world.addBody(midBody);
    checkpointBodies.midCheckpoint = midBody;

    // ---------- FINISH LINE ----------
    const finishShape = new CANNON.Box(new CANNON.Vec3(cpLength / 1.2, 1, 0.1));
    const finishBody = new CANNON.Body({ mass: 0, isTrigger: true });
    finishBody.addShape(finishShape);
    finishBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
    finishBody.position.set(0, 1, -outerSize / 2 + 10);
    this.world.addBody(finishBody);
    checkpointBodies.finishLine = finishBody;

    // Tạo vật thể 3D với texture
    this.createCheckpointVisuals(outerSize, trackWidth, cpLength);

    return checkpointBodies;
}


createCheckpointVisuals(outerSize, trackWidth, cpLength) {

    // ------- THAY TEXTURE Ở ĐÂY -------
    const midTexturePath = "assets/textures/checkpoint.jpeg";
    const finishTexturePath = "assets/textures/image.png";

    const loader = new THREE.TextureLoader();

    // ---------- MID CHECKPOINT VISUAL ----------
    const midTexture = loader.load(midTexturePath);
    midTexture.wrapS = THREE.RepeatWrapping;
    midTexture.wrapT = THREE.RepeatWrapping;

    const midMat = new THREE.MeshBasicMaterial({
        map: midTexture,
        transparent: true,
    });

    const midGeometry = new THREE.BoxGeometry(cpLength, 2, 0.2);
    const midMesh = new THREE.Mesh(midGeometry, midMat);

    midMesh.rotation.y = Math.PI / 2;
    midMesh.position.set(0, 1.5, outerSize / 3);
    this.scene.add(midMesh);

    // ---------- FINISH LINE VISUAL ----------
    const finishTexture = loader.load(finishTexturePath);
    finishTexture.wrapS = THREE.RepeatWrapping;
    finishTexture.wrapT = THREE.RepeatWrapping;

    const finishMat = new THREE.MeshBasicMaterial({
        map: finishTexture,
        transparent: true,
    });

    const finishGeometry = new THREE.BoxGeometry(cpLength * 1.2, 2, 0.2);
    const finishMesh = new THREE.Mesh(finishGeometry, finishMat);

    finishMesh.rotation.y = Math.PI / 2;
    finishMesh.position.set(0, 1.5, -outerSize / 2.1 + 10);
    this.scene.add(finishMesh);
}


}
