import './style.css'
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('black');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0,10, 5)

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const planeGeo = new THREE.PlaneGeometry(50, 50);
const planeMat = new THREE.MeshBasicMaterial({ color: 'white', side: THREE.DoubleSide });
const planeMesh = new THREE.Mesh(planeGeo, planeMat);
planeMesh.rotation.x = Math.PI * -0.5;
scene.add(planeMesh);


const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// cannon
const updateObjs = []
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
const plane = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0, shape: plane });
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true

world.defaultContactMaterial.friction = 0;

    var groundMaterial = new CANNON.Material("groundMaterial");
    var wheelMaterial = new CANNON.Material("wheelMaterial");
    var wheelGroundContactMaterial = window.wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
        friction: 2.3,
        restitution: 0,
        contactEquationStiffness: 1000
    });

// We must add the contact materials to the world
world.addContactMaterial(wheelGroundContactMaterial);

const cannonDebugger = new CannonDebugger(scene, world, {
    color: '0xff0000'
});

function updatePhysics() {
    updateObjs.forEach(({threeObj, cannonObj}) => {
        threeObj.position.copy(cannonObj.position);
        threeObj.quaternion.copy(cannonObj.quaternion);
    })
}

let chassisShape;
chassisShape = new CANNON.Box(new CANNON.Vec3(2, 1,0.5));
const chassisBody = new CANNON.Body({ mass: 150 });
chassisBody.addShape(chassisShape);
chassisBody.position.set(0, 4, 0);
chassisBody.angularVelocity.set(0, 0.5, 0);
chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(chassisBody);

// 球体
const boxGeo = new THREE.BoxGeometry(4, 2, 1);
const boxMat = new THREE.MeshStandardMaterial({ color: 'gold' });
const boxMesh = new THREE.Mesh(boxGeo, boxMat);
boxMesh.rotation.x = -Math.PI / 2;
boxMesh.position.set(0, 4, 0);
scene.add(boxMesh);
updateObjs.push({ threeObj: boxMesh, cannonObj: chassisBody });


var options = {
    radius: 0.5,
    directionLocal: new CANNON.Vec3(0, 0, -1),
    suspensionStiffness: 30,
    suspensionRestLength: 0.3,
    frictionSlip: 5,
    dampingRelaxation: 2.3,
    dampingCompression: 4.4,
    maxSuspensionForce: 100000,
    rollInfluence:  0.01,
    axleLocal: new CANNON.Vec3(0, 1, 0),
    chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
    maxSuspensionTravel: 0.3,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true
};

const vehicle = new CANNON.RaycastVehicle({
    chassisBody: chassisBody,
    indexUpAxis: 1, // y
    indexForwardAxis:0, // x
    indexRightAxis: 2, // z
});

options.chassisConnectionPointLocal.set(1, 1, 0);
vehicle.addWheel(options);

options.chassisConnectionPointLocal.set(1, -1, 0);
vehicle.addWheel(options);

options.chassisConnectionPointLocal.set(-1, 1, 0);
vehicle.addWheel(options);

options.chassisConnectionPointLocal.set(-1, -1, 0);
vehicle.addWheel(options);

vehicle.addToWorld(world);

var wheelBodies = [];
const wheelMat = new THREE.MeshStandardMaterial({ color: 'red' });
for(var i=0; i<vehicle.wheelInfos.length; i++){
    var wheel = vehicle.wheelInfos[i];
    var cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 10);
    var wheelBody = new CANNON.Body({ mass: 1 });

    const cylinderGeometry = new THREE.CylinderGeometry(wheel.radius, wheel.radius, wheel.radius / 2, 20);
    const cylinderMesh = new THREE.Mesh(cylinderGeometry, wheelMat);
    updateObjs.push({threeObj: cylinderMesh, cannonObj: wheelBody})
    scene.add(cylinderMesh);

    var q = new CANNON.Quaternion();
    // q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
    wheelBodies.push(wheelBody);
    world.addBody(wheelBody);
}

// Update wheels
world.addEventListener('postStep', function(){
    for (var i = 0; i < vehicle.wheelInfos.length; i++) {
        vehicle.updateWheelTransform(i);
        var t = vehicle.wheelInfos[i].worldTransform;
        wheelBodies[i].position.copy(t.position);
        wheelBodies[i].quaternion.copy(t.quaternion);
    }
});

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    world.step(1 / 60, clock.getDelta(), 3);
    renderer.render(scene, camera);
    controls.update();
    updatePhysics()
}

animate()

document.onkeydown = handler;
document.onkeyup = handler;

var maxSteerVal = 0.5;
var maxForce = 1000;
var brakeForce = 1000000;
function handler(event){
    var up = (event.type == 'keyup');

    if(!up && event.type !== 'keydown'){
        return;
    }

    vehicle.setBrake(0, 0);
    vehicle.setBrake(0, 1);
    vehicle.setBrake(0, 2);
    vehicle.setBrake(0, 3);

    switch(event.keyCode){

    case 38: // forward
        vehicle.applyEngineForce(up ? 0 : -maxForce, 2);
        vehicle.applyEngineForce(up ? 0 : -maxForce, 3);
        break;

    case 40: // backward
        vehicle.applyEngineForce(up ? 0 : maxForce, 2);
        vehicle.applyEngineForce(up ? 0 : maxForce, 3);
        break;

    case 66: // b
        vehicle.setBrake(brakeForce, 0);
        vehicle.setBrake(brakeForce, 1);
        vehicle.setBrake(brakeForce, 2);
        vehicle.setBrake(brakeForce, 3);
        break;

    case 39: // right
        vehicle.setSteeringValue(up ? 0 : -maxSteerVal, 0);
        vehicle.setSteeringValue(up ? 0 : -maxSteerVal, 1);
        break;

    case 37: // left
        vehicle.setSteeringValue(up ? 0 : maxSteerVal, 0);
        vehicle.setSteeringValue(up ? 0 : maxSteerVal, 1);
        break;

    }
}
