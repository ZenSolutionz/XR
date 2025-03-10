// import * as THREE from 'three';
// import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// // Setup Scene, Camera, Renderer
// let scene, camera, renderer, fanModel;
// function init() {
//     scene = new THREE.Scene();

//     camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

//     renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.xr.enabled = true;
//     document.body.appendChild(renderer.domElement);

//     // AR Button
//     document.body.appendChild(ARButton.createButton(renderer));

//     // Lighting
//     let light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
//     scene.add(light);

//     // Load Fan Model
//     const loader = new GLTFLoader();
//     loader.load('fan_model.glb', (gltf) => {
//         fanModel = gltf.scene;
//     });

//     // Raycaster for detecting surfaces
//     const raycaster = new THREE.Raycaster();
//     const pointer = new THREE.Vector2();
//     const touchPoint = new THREE.Vector3();

//     function onSelect(event) {
//         if (fanModel) {
//             raycaster.setFromCamera(pointer, camera);
//             const intersects = raycaster.intersectObjects(scene.children, true);

//             if (intersects.length > 0) {
//                 let fan = fanModel.clone();
//                 fan.position.copy(intersects[0].point);
//                 scene.add(fan);
//             }
//         }
//     }

//     // Listen for touch events
//     window.addEventListener('touchstart', (event) => {
//         pointer.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
//         pointer.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
//         onSelect();
//     });

//     // Animation loop
//     function animate() {
//         renderer.setAnimationLoop(() => {
//             renderer.render(scene, camera);
//         });
//     }

//     animate();
// }

// window.onload = init;
