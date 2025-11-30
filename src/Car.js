// src/Car.js
import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import * as CANNON from 'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js';
import { CAR_PHYSICS } from './Constants.js';

export default class Car {
    constructor(scene, world, startPosition) {
        this.scene = scene;
        this.world = world;

        this.initGraphics();
        this.initPhysics(startPosition);

        this.scene.add(this.mesh);
        this.wheelMeshes.forEach(wheel => this.scene.add(wheel));
        this.vehicle.addToWorld(this.world);
    }

    initGraphics() {
        this.mesh = new THREE.Group();
        const chassisLength = 4, chassisHeight = 0.6, chassisWidth = 1.8;

        // Chassis box, bo góc
        const chassisGeometry = new THREE.BoxGeometry(chassisLength, chassisHeight, chassisWidth, 4, 2, 4);
        const chassisMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0040,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x220022,
            emissiveIntensity: 0.3,
            vertexColors: true
        });

        // Gradient vertex colors
        const position = chassisGeometry.attributes.position;
        const colorAttr = new Float32Array(position.count * 3);
        const frontColor = new THREE.Color(0xff0040), midColor = new THREE.Color(0xff00ff), rearColor = new THREE.Color(0x00ffff);
        for (let i = 0; i < position.count; i++) {
            const z = position.getZ(i);
            let t = (z + chassisWidth/2)/chassisWidth;
            const color = frontColor.clone().lerp(rearColor, t);
            color.toArray(colorAttr, i*3);
        }
        chassisGeometry.setAttribute('color', new THREE.BufferAttribute(colorAttr,3));

        const chassisMesh = new THREE.Mesh(chassisGeometry, chassisMaterial);
        chassisMesh.castShadow = true;
        chassisMesh.receiveShadow = true;
        this.mesh.add(chassisMesh);

        // Wheels torus neon
        this.wheelMeshes = [];
        const wheelRadius = 0.45, wheelTube = 0.08;
        const wheelGeometry = new THREE.TorusGeometry(wheelRadius, wheelTube, 16, 100);
        const wheelColors = [0x00ffff,0xff00ff,0xffff00,0xff8800];
        const wheelOffset = 0.65, wheelY = -chassisHeight/2 - wheelRadius + 0.05;
        const wheelPositions = [
            [-chassisLength/2+wheelOffset, wheelY, chassisWidth/2],
            [-chassisLength/2+wheelOffset, wheelY, -chassisWidth/2],
            [chassisLength/2-wheelOffset, wheelY, chassisWidth/2],
            [chassisLength/2-wheelOffset, wheelY, -chassisWidth/2]
        ];
        wheelPositions.forEach((pos,i)=>{
            const wheelMat = new THREE.MeshStandardMaterial({
                color: wheelColors[i],
                emissive: wheelColors[i],
                emissiveIntensity:1,
                roughness:0.1,
                metalness:0.8
            });
            const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMat);
            wheelMesh.position.set(...pos);
            wheelMesh.rotation.x = Math.PI/2;
            wheelMesh.castShadow = true;
            this.wheelMeshes.push(wheelMesh);
        });

        // LED front/rear
        const ledGeo = new THREE.BoxGeometry(0.15,0.08,chassisWidth*0.8);
        const frontLED = new THREE.Mesh(ledGeo,new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x00ffff,emissiveIntensity:1}));
        frontLED.position.set(chassisLength/2-0.1,0,0);
        this.mesh.add(frontLED);
        const rearLED = new THREE.Mesh(ledGeo,new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:1}));
        rearLED.position.set(-chassisLength/2+0.1,0,0);
        this.mesh.add(rearLED);

        // Spoiler
        const spoilerGeo = new THREE.BoxGeometry(1.5,0.05,0.1);
        const spoilerMat = new THREE.MeshStandardMaterial({color:0xff00ff,emissive:0xff00ff,emissiveIntensity:0.7});
        const spoiler = new THREE.Mesh(spoilerGeo,spoilerMat);
        spoiler.position.set(0,0.35,-1.8);
        this.mesh.add(spoiler);

        // Optional: gương chiếu hậu
        const mirrorGeo = new THREE.BoxGeometry(0.1,0.05,0.02);
        const mirrorMat = new THREE.MeshStandardMaterial({color:0x555555,metalness:0.8,roughness:0.2});
        const leftMirror = new THREE.Mesh(mirrorGeo,mirrorMat);
        leftMirror.position.set(-1.2,0.1,0.9);
        const rightMirror = leftMirror.clone();
        rightMirror.position.z = -0.9;
        this.mesh.add(leftMirror,rightMirror);
    }

    initPhysics(startPosition) {
        const chassisLength = 4, chassisHeight = 0.6, chassisWidth = 1.8;
        const wheelRadius = 0.45, wheelOffset = 0.65;
        const chassisShape = new CANNON.Box(new CANNON.Vec3(chassisLength/2,chassisHeight/2,chassisWidth/2));
        this.chassisBody = new CANNON.Body({mass:CAR_PHYSICS.MASS});
        this.chassisBody.addShape(chassisShape,new CANNON.Vec3(0,-0.15,0));
        this.chassisBody.material = new CANNON.Material('chassisMaterial');
        this.chassisBody.material.friction = 0.4;
        this.chassisBody.material.restitution = 0.1;
        this.chassisBody.position.copy(startPosition);
        this.chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),-Math.PI/2);
        this.chassisBody.angularDamping = 0.4;
        this.chassisBody.linearDamping = 0.01;

        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody:this.chassisBody,
            indexRightAxis:2,
            indexUpAxis:1,
            indexForwardAxis:0
        });

        const wheelOptions = {
            radius: wheelRadius,
            directionLocal: new CANNON.Vec3(0,-1,0),
            suspensionStiffness:35,
            suspensionRestLength:wheelRadius,
            frictionSlip:6,
            dampingRelaxation:2.5,
            dampingCompression:4.5,
            maxSuspensionForce:100000,
            rollInfluence:0.3,
            axleLocal:new CANNON.Vec3(0,0,1),
            chassisConnectionPointLocal:new CANNON.Vec3(0,0,0),
            maxSuspensionTravel:0.35,
            customSlidingRotationalSpeed:-30,
            useCustomSlidingRotationalSpeed:true,
            material:new CANNON.Material('wheelMaterial')
        };

        const wheelY = -chassisHeight/2;
        const positions = [
            [-chassisLength/2+wheelOffset, wheelY, chassisWidth/2],
            [-chassisLength/2+wheelOffset, wheelY, -chassisWidth/2],
            [chassisLength/2-wheelOffset, wheelY, chassisWidth/2],
            [chassisLength/2-wheelOffset, wheelY, -chassisWidth/2]
        ];
        positions.forEach(pos=>{
            wheelOptions.chassisConnectionPointLocal.set(...pos);
            this.vehicle.addWheel(wheelOptions);
        });
    }

    applyControls(controls) {
        let engineForce=0,steerValue=0;
        if(controls.forward) engineForce=-CAR_PHYSICS.MAX_FORCE*0.7;
        if(controls.backward) engineForce=CAR_PHYSICS.MAX_FORCE*0.5;

        const currentSpeed=this.chassisBody.velocity.length();
        const speedFactor=Math.min(1,currentSpeed/10);
        const maxSteerReduction=0.6;
        if(controls.left) steerValue=CAR_PHYSICS.MAX_STEER_VAL*(1-maxSteerReduction*speedFactor);
        if(controls.right) steerValue=-CAR_PHYSICS.MAX_STEER_VAL*(1-maxSteerReduction*speedFactor);

        this.vehicle.applyEngineForce(engineForce*0.6,2);
        this.vehicle.applyEngineForce(engineForce*0.6,3);
        this.vehicle.applyEngineForce(engineForce*0.4,0);
        this.vehicle.applyEngineForce(engineForce*0.4,1);

        this.vehicle.setSteeringValue(steerValue,0);
        this.vehicle.setSteeringValue(steerValue,1);
    }

    syncGraphics() {
        this.mesh.position.copy(this.chassisBody.position);
        this.mesh.quaternion.copy(this.chassisBody.quaternion);

        for(let i=0;i<this.vehicle.wheelInfos.length;i++){
            this.vehicle.updateWheelTransform(i);
            const t=this.vehicle.wheelInfos[i].worldTransform;
            this.wheelMeshes[i].position.copy(t.position);
            this.wheelMeshes[i].quaternion.copy(t.quaternion);
        }
    }

    getPosition(){return this.mesh.position;}
    getQuaternion(){return this.mesh.quaternion;}
    getVelocity(){return this.chassisBody.velocity.length();}
}
