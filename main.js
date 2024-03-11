import './style.css'
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'

const sound = new Audio('hit.wav')
const playHitSound = (colEvent) => {
    // 碰撞强度
    const colideStrongness = colEvent.contact.getImpactVelocityAlongNormal()
    if(colideStrongness >= 1){
        sound.currentTime = 0
        const volume = Math.abs(colideStrongness) / 15
        sound.volume = volume > 1 ? 1 : volume
        sound.play()
    }
}

const scene = new THREE.Scene();
scene.background = new THREE.Color('black');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0,10, 5)

const directLight = new THREE.DirectionalLight(0xffffff, 0.5)
directLight.position.set(0, 10, 10)
scene.add(directLight)
directLight.castShadow = true;
directLight.shadow.camera.far = 100
const ambientLight = new THREE.AmbientLight( 0xffffff, 0.01)
scene.add(ambientLight)

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;

// const concreteMaterial = new CANNON.Material("concrete"); // 混凝土材料，适合做地面
// const plasticMaterial = new CANNON.Material("plastic"); // 塑料材质
const defaultMaterial = new CANNON.Material("default"); // 默认材料
// 定义两种材料接触时的摩擦系数和弹性系数
// const concretePlasticContactMaterial = new CANNON.ContactMaterial(
const defaultMaterialContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1,
        restitution: 0.5
    }
)

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
const plane = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0, shape: plane });
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true

world.addContactMaterial(defaultMaterialContactMaterial)
world.defaultContactMaterial = defaultMaterialContactMaterial;

const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshStandardMaterial({ color: 'gold' });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const mesh = new THREE.Mesh(boxGeo, material);
mesh.castShadow = true
scene.add(mesh);

const groundGeo = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
const groundMesh = new THREE.Mesh(groundGeo, groundMaterial);
groundMesh.receiveShadow = true
groundGeo.rotateX(Math.PI / 2);
scene.add(groundMesh);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false

function createSphere(radius, position) {
    const sphereMesh = new THREE.Mesh(sphereGeo, material);
    sphereMesh.scale.set(radius, radius, radius);
    sphereMesh.position.copy(position);
    sphereMesh.castShadow = true;
    scene.add(sphereMesh);
    const sphereShape = new CANNON.Sphere(radius);
    const sphereBody = new CANNON.Body({ 
        mass: 1, 
        position: sphereMesh.position,
        shape: sphereShape,
    });
    world.addBody(sphereBody);
    sphereBody.addEventListener('collide', playHitSound)
    return {
        mesh: sphereMesh,
        body: sphereBody,
    }
}

const boxMaterial = new THREE.MeshStandardMaterial({ color: 'silver' });
function createBox(scale, position) {
    const boxMesh = new THREE.Mesh(boxGeo, boxMaterial);
    boxMesh.scale.copy(scale);
    boxMesh.position.copy(position);
    boxMesh.castShadow = true;
    scene.add(boxMesh);
    const boxShape = new CANNON.Box(new CANNON.Vec3(scale.x / 2, scale.y / 2, scale.z / 2));
    const boxBody = new CANNON.Body({ 
        mass: 1, 
        position: boxMesh.position,
        shape: boxShape
    });
    world.addBody(boxBody);
    boxBody.addEventListener('collide', playHitSound)
    return {
        mesh: boxMesh,
        body: boxBody,
    }
}

const clock = new THREE.Clock();

const updateObjs = []

const gui = new GUI()
const debugObject = {
    createASphere: () => {
        const obj = createSphere(
            Math.random() * 1 + 0.5,
            { 
                x: (Math.random() - 0.5) * 5,
                y: 10, 
                z: (Math.random() - 0.5) * 5
            }
        )
        updateObjs.push(obj)
    },
    createABox: () => {
        const obj = createBox(
            { 
                x: Math.random() * 1 + 0.5,
                y: Math.random() * 1 + 0.5,
                z: Math.random() * 1 + 0.5,
            },
            { 
                x: (Math.random() - 0.5) * 5,
                y: 10, 
                z: (Math.random() - 0.5) * 5
            }
        )
        updateObjs.push(obj)
    },
    reset: () => {
        for (const obj of updateObjs) {
            // 去除cannon中的体
            world.removeBody(obj.body)
            // 去除three中的mesh
            scene.remove(obj.mesh)
            // 清除事件监听器
            obj.body.removeEventListener('collide', playHitSound)
        }
        // 清空更新数组
        updateObjs.splice(0, updateObjs.length)
    }
}
gui.add(debugObject, 'createASphere')
gui.add(debugObject, 'createABox') 
gui.add(debugObject, 'reset') 

function updatePhysics() {
    for (const obj of updateObjs) {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
    }
}

function animate() {
    requestAnimationFrame(animate);
    world.step(1 / 60, clock.getDelta(), 3);
    updatePhysics()
    renderer.render(scene, camera);
    controls.update();
}

animate()
