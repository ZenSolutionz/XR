import { useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three';

/**
 * This component renders an AR scene using Three.js.
 * It uses the WebXR API to detect if the device supports Augmented Reality.
 * If it does, it renders a button which, when clicked, enters XR mode.
 * When in XR mode, it renders a 3D model of a fan on the screen.
 * When the user selects the fan using the XR controller, it creates a new instance
 * of the fan at the point where the user selected.
 */
const ARComponent = () => {
  // This useRef hook creates a reference to a DOM element
  // which we can use to append our AR button and renderer canvas
  const containerRef = useRef(null);

  // This useRef hook creates a reference to our renderer
  // so we can dispose of it when the component unmounts
  const rendererRef = useRef(null);

  // This useRef hook creates a reference to the original model
  // so we can clone it when the user selects it
  const modelRef = useRef(null);

  // This useRef hook creates a reference to the current fan model
  // so we can remove it when the user selects a new fan
  const fanModelRef = useRef(null);

  // Add state for material properties
  const [roughness, setRoughness] = useState(0.5);
  const [metalness, setMetalness] = useState(0.5);
  const [tempRoughness, setTempRoughness] = useState(0.5);
  const [tempMetalness, setTempMetalness] = useState(0.5);

  // Add refs for room scanning
  const planesRef = useRef([]);
  const reticleRef = useRef(null);

  // Function to update material properties
  const updateMaterialProperties = (mesh, rough, metal) => {
    if (mesh.isMesh && mesh.material) {
      mesh.material.roughness = rough;
      mesh.material.metalness = metal;
      mesh.material.needsUpdate = true;
    }
  };

  // Function to apply material changes
  const applyMaterialChanges = () => {
    setRoughness(tempRoughness);
    setMetalness(tempMetalness);
    
    if (fanModelRef.current) {
      fanModelRef.current.traverse((child) => 
        updateMaterialProperties(child, tempRoughness, tempMetalness)
      );
    }
    
    // Update the reference model for future clones
    if (modelRef.current) {
      modelRef.current.traverse((child) => 
        updateMaterialProperties(child, tempRoughness, tempMetalness)
      );
    }
  };

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

    // Set up the renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true, // enable anti-aliasing
      alpha: true, // allow transparency
      logarithmicDepthBuffer: true // enable logarithmic depth buffer
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; // enable WebXR
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1; // Typically 1-1.5
    renderer.outputEncoding = THREE.sRGBEncoding; // use sRGB color encoding
    rendererRef.current = renderer; // store the renderer reference

    // Create reticle for ceiling detection
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
    reticleRef.current = reticle;

    // Create the AR button with ceiling scan requirement
    const sessionInit = {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'plane-detection'],
      domOverlay: { root: containerRef.current }
    };

    const arButton = ARButton.createButton(renderer, sessionInit);
    arButton.style.position = 'absolute';
    arButton.style.bottom = '20px';
    arButton.style.right = '20px';
    arButton.style.zIndex = '9999';
    arButton.style.pointerEvents = 'auto';
    containerRef.current.appendChild(arButton); // append the button to the container
    containerRef.current.appendChild(renderer.domElement); // append the renderer canvas to the container

    // Create PMREM Generator for HDR environment
    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // Load HDRI environment map
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load('graffiti_shelter_2k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap; // set the environment map
      texture.dispose(); // dispose of the texture
      pmremGenerator.dispose(); // dispose of the PMREM generator
    });

    // Load the initial model
    const loader = new GLTFLoader();
    loader.load('fan_model.glb', (gltf) => {
      const model = gltf.scene;

      // Enable shadows and configure materials for better reflections
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.envMapIntensity = 1.0;
            // Set initial material properties
            child.material.roughness = roughness;
            child.material.metalness = metalness;
            // Enable material features
            child.material.envMap = scene.environment;
            child.material.needsUpdate = true;
          }
        }
      });

      modelRef.current = model.clone();
    }, undefined, (error) => {
      console.error('Error loading model:', error);
    });

    // Set up XR controller and session
    let controller;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    // Function to initialize hit testing
    const initializeHitTesting = async (session) => {
      const referenceSpace = await session.requestReferenceSpace('local');
      const viewerSpace = await session.requestReferenceSpace('viewer');
      hitTestSource = await session.requestHitTestSource({
        space: viewerSpace
      });
      renderer.xr.setReferenceSpace(referenceSpace);
    };

    renderer.xr.addEventListener('sessionstart', async () => {
      const session = renderer.xr.getSession();
      
      // Initialize hit testing
      try {
        await initializeHitTesting(session);
      } catch (error) {
        console.error('Error initializing hit testing:', error);
      }

      // Set up plane detection if available
      if (session.requestPlaneDetection) {
        try {
          const features = await session.requestPlaneDetection();
          session.addEventListener('planedetected', (event) => {
            const plane = event.plane;
            if (plane.orientation === 'ceiling') {
              planesRef.current.push(plane);
            }
          });
        } catch (error) {
          console.warn('Plane detection not available:', error);
        }
      }

      // Ensure material properties are correct when entering XR
      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.envMapIntensity = 1.0;
            child.material.roughness = roughness;
            child.material.metalness = metalness;
            child.material.needsUpdate = true;
          }
        });
      }
      
      controller = renderer.xr.getController(0);
      controller.addEventListener('select', onSelect);
      scene.add(controller);
    });

    renderer.xr.addEventListener('sessionend', () => {
      hitTestSource = null;
      hitTestSourceRequested = false;
      if (controller) {
        controller.removeEventListener('select', onSelect);
        scene.remove(controller);
      }
      // Re-add the AR button after session ends
      if (!containerRef.current.contains(arButton)) {
        containerRef.current.appendChild(arButton);
      }
    });

    // Modified onSelect function for ceiling placement
    const onSelect = () => {
      if (!modelRef.current || !reticleRef.current.visible) return;

      const newFan = modelRef.current.clone();
      
      // Position the fan at the reticle's position
      const position = new THREE.Vector3().setFromMatrixPosition(reticleRef.current.matrix);
      
      // Move 6 feet (1.83 meters) down from the reticle
      position.y += 2.74;
      newFan.position.copy(position);
      
      // Rotate 90 degrees to face downward (fan blades parallel to ceiling)
      newFan.rotation.x = Math.PI;
      
      // Configure the new instance for HDRI lighting
      newFan.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.envMapIntensity = 1.0;
            child.material.roughness = roughness;
            child.material.metalness = metalness;
            child.material.envMap = scene.environment;
            child.material.needsUpdate = true;
          }
        }
      });

      scene.add(newFan);

      // Store the latest fan reference
      if (fanModelRef.current) {
        scene.remove(fanModelRef.current);
      }
      fanModelRef.current = newFan;
    };

    // Set up animation loop with hit testing
    const animate = () => {
      if (renderer.xr.isPresenting) {
        if (hitTestSource) {
          const frame = renderer.xr.getFrame();
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const referenceSpace = renderer.xr.getReferenceSpace();
            const pose = hit.getPose(referenceSpace);
            
            if (pose) {
              // Check if the hit is on a ceiling plane
              const hitMatrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
              const normal = new THREE.Vector3(0, -1, 0).applyMatrix4(hitMatrix).normalize();
              const isCeiling = normal.y < -0.5; // More lenient threshold
              
              if (isCeiling) {
                reticleRef.current.visible = true;
                reticleRef.current.matrix.fromArray(pose.transform.matrix);
              } else {
                reticleRef.current.visible = false;
              }
            }
          } else {
            reticleRef.current.visible = false;
          }
        }
      }
      
      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    // Clean up when the component is unmounted
    return () => {
      if (fanModelRef.current) {
        fanModelRef.current.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
        scene.remove(fanModelRef.current);
      }

      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
      }

      if (scene.environment) {
        scene.environment.dispose();
      }

      if (reticleRef.current) {
        reticleRef.current.geometry.dispose();
        reticleRef.current.material.dispose();
        scene.remove(reticleRef.current);
      }

      renderer.setAnimationLoop(null);
      renderer.xr.removeEventListener('sessionstart');
      renderer.xr.removeEventListener('sessionend');
      renderer.dispose();
      scene.clear();
    };
  }, []); // The dependency array is empty because we only want to run this effect once

  // Finally, return the JSX for the component
  return (
    <>
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
      <div style={{
        position: 'fixed',
        top: '400px',
        left: '70px',
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '10px',
        borderRadius: '5px',
        color: 'white'
      }}>
        <div>
          <label>Roughness: </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={tempRoughness}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setTempRoughness(value);
            }}
          />
          <span>{tempRoughness.toFixed(1)}</span>
        </div>
        <div>
          <label>Metalness: </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={tempMetalness}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setTempMetalness(value);
            }}
          />
          <span>{tempMetalness.toFixed(1)}</span>
        </div>
        <button
          onClick={applyMaterialChanges}
          style={{
            marginTop: '10px',
            padding: '5px 15px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Apply Changes
        </button>
      </div>
    </>
  );
};

export default ARComponent;