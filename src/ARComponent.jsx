import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/**
 * This component renders an AR scene using Three.js.
 * It uses the WebXR API to detect if the device supports Augmented Reality.
 * If it does, it renders a button which, when clicked, enters XR mode.
 * When in XR mode, it renders a 3D model of a fan on the screen.
 * When the user touches the screen, it creates a new instance of the fan
 * at the point where the user touched.
 */
const ARComponent = () => {
  // This useRef hook creates a reference to a DOM element
  // which we can use to append our AR button and renderer canvas
  const containerRef = useRef(null);

  // This useRef hook creates a reference to our renderer
  // so we can dispose of it when the component unmounts
  const rendererRef = useRef(null);

  // This useLayoutEffect hook runs after the component has been rendered
  // and the DOM has been updated. It's used to set up our AR scene.
  useLayoutEffect(() => {
    // If the component has been rendered but the containerRef hasn't been set yet,
    // return without doing anything.
    if (!containerRef.current) return;

    // Check if the browser supports WebXR
    if (!navigator.xr) {
      alert('WebXR not supported on this device');
      return;
    }

    // Set up the scene and camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70, // field of view (in degrees)
      window.innerWidth / window.innerHeight, // aspect ratio
      0.01, // near clipping plane
      20 // far clipping plane
    );

    // Add some lighting to the scene
    const ambientLight = new THREE.AmbientLight(0xffdcb1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);

    // Set up the renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    rendererRef.current = renderer;

    // Create the AR button
    const arButton = ARButton.createButton(renderer);
    arButton.style.position = 'absolute';
    arButton.style.bottom = '20px';
    arButton.style.right = '20px';
    arButton.style.zIndex = '9999';
    arButton.style.pointerEvents = 'auto';
    containerRef.current.appendChild(arButton);

    // Add the renderer canvas to the DOM
    containerRef.current.appendChild(renderer.domElement);

    // Add some lighting to the scene
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Load a 3D model of a fan
    const loader = new GLTFLoader();
    loader.load('fan_model.glb', (gltf) => {
      const model = gltf.scene;
      scene.add(model);
    }, undefined, (error) => {
      console.error('Error loading model:', error);
    });

    // Set up a raycaster to detect when the user touches the screen
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // This function is called when the user touches the screen
    const onTouchStart = (event) => {
      console.log("Touch detected"); // Debugging line
      if (!model) return;

      // Get the x and y coordinates of the touch event
      pointer.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;

      // Cast a ray from the camera through the touch point
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      // If the ray intersects with an object in the scene, create a new instance
      // of the fan at the point of intersection
      if (intersects.length > 0) {
        const newCube = model.clone();
        newCube.position.copy(intersects[0].point);
        scene.add(newCube);
      }
    };

    // Add an event listener to the window to detect touch events
    window.addEventListener('touchstart', onTouchStart);

    // Set up an animation loop to render the scene
    const animate = () => {
      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    // Clean up when the component is unmounted
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      renderer.dispose();
      scene.clear();
    };
  }, []); // The dependency array is empty because we only want to run this effect once

  // Finally, return the JSX for the component
  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    />
  );
};

export default ARComponent;