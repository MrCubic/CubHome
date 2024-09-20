import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; 

// Scene
const scene = new THREE.Scene();

// Audio
const clickSound = new Audio('./sounds/mouseClick.mp3');
clickSound.volume = 0.3;
const cardboard = new Audio('./sounds/cardboard.mp3');
cardboard.volume = 0.3;

let projectData;
let projectId = 0;
fetchProjectData();

const backgroundMusic = new Audio('./sounds/rainBG.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.3;

function init() {
  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
  document.body.appendChild(renderer.domElement);

  // Camera
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

  // Orbit controls
  let controls = new OrbitControls(camera, renderer.domElement);


  // Loading screen elements
  const loadingScreen = document.getElementById('loading-screen');
  const progressBarFill = document.getElementById('progress-bar-fill');

  // Loader
  const loader = new GLTFLoader();
  loader.load('./models/HubPortfolioBaked.glb', (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
          if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;  
          }
          if (child.isLight) {
            child.intensity *= 0.0005;
          }
        });
      scene.add(model);
    
      // Calculate model bounding box for camera positioning
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      let center = box.getCenter(new THREE.Vector3());
      center.x -= 4.5;
      center.z -= 6.5;

      // y is the new z (height) because of .glb export
      center.y -= 0.6;
    
      // Adjust camera position and controls based on model size
      camera.position.copy(center);
      camera.rotation.set(-0.2, 0.8, 0.13);
    
      // Initialize OrbitControls only after the camera position is set
      controls.target.copy(center);

      // Movement speed
      controls.rotateSpeed = 0.2;
      controls.zoomSpeed = 0.3;

      // Azimuth angle (horizontal rotation) limits
      controls.minAzimuthAngle = Math.PI / 8; 
      controls.maxAzimuthAngle = 3 * Math.PI / 8; 
    
      // Polar angle (vertical rotation) limits
      controls.minPolarAngle = Math.PI / 3.2; 
      controls.maxPolarAngle = Math.PI / 2.3; 

      //Disable pan & enable damping
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      // zoom out
      controls.minDistance = 3;
      controls.maxDistance = 4;

      // Fade out the loading screen once the model is loaded
      loadingScreen.style.opacity = '0';

      // After the fade-out transition is complete, hide the loading screen
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 1000);

      camera.position.set(-3, 5, -3);
      camera.rotation.set(0, 0, 0);
      lerpFactor = 0;
      startPosition.copy(camera.position);
      startRotation.copy(camera.rotation);
      moveCameraToOrigin = true;
    
    },
    (xhr) => {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
      progressBarFill.style.width = percentComplete + '%';
      //change the loading text every 10% to keep the user entertained
      if (percentComplete < 20) {
        document.getElementById('loading-title').innerText = 'Booting up...';
      }
      else if (percentComplete < 40) {
        document.getElementById('loading-title').innerText = 'Warming the scene...';
      }
      else if (percentComplete < 60) {
        document.getElementById('loading-title').innerText = 'Setting up the rain...';
      }
      else if (percentComplete < 80) {
        document.getElementById('loading-title').innerText = 'Computer getting online...';
      }
      else {
        document.getElementById('loading-title').innerText = 'Finishing up...';
      }
      if (percentComplete === 100) {
        document.getElementById('loading-title').innerText = 'All set!';
        document.getElementById('hudL').style.display = 'flex';
        document.getElementById('hudR').style.display = 'flex';
      }
    }
  );

  //add the disks to the scene
  function addDisk(modelPath) {
    loader.load(modelPath, (gltf) => {
      const model = gltf.scene;
      model.children[0].position.set(-6.5, 3.54, -3.84);
      model.children[0].rotation.set(0, Math.PI / 2, 0);
      model.name = modelPath.split('/')[2].split('.')[0];
      model.children[0].scale.set(0, 0, 0);
      scene.add(model);
    });
  }


  addDisk('./models/DropBot.glb');
  addDisk('./models/Blender Projects.glb');
  addDisk('./models/EcoSync.glb');
  addDisk('./models/ElephantVision.glb');
  addDisk('./models/Ertranked.glb');
  addDisk('./models/Lyrix.glb');

  //add a frosted window
  const geometry = new THREE.BoxGeometry(0.01, 1.175, 3.25);
  const texture = new THREE.TextureLoader();
  const normalMapTexture = texture.load('./rainNormals.jpg');
  normalMapTexture.wrapS = THREE.RepeatWrapping;
  normalMapTexture.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshPhysicalMaterial({ 
    roughness: 0.3,   
    transmission: 1,
    opacity: 0.7,
    transparent: true,
    normalMap: normalMapTexture,
  
  });
  const windowFake = new THREE.Mesh(geometry, material);
  windowFake.position.set(-6.5, 4.625, -4.3);
  scene.add(windowFake);

  // ########### INTERACTIVE PART ###########
  //
  // ########################################

  // material & geometry for the trigger hints
  const triggerHintGeometry = new THREE.SphereGeometry(0.05, 15);
  const triggerHintMaterial = new THREE.MeshPhysicalMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    emissive: 0xffffff,
  });

  // trigger for zooming on the CV
  const ZoomCVTriggerGeometry = new THREE.BoxGeometry(0.68, 0.4, 0.1);
  const ZoomCVTriggerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0 });
  const ZoomCVTrigger = new THREE.Mesh(ZoomCVTriggerGeometry, ZoomCVTriggerMaterial);
  ZoomCVTrigger.position.set(-5.6, 3.8, -6.1);
  ZoomCVTrigger.rotation.set(0, Math.PI / 8, 0);
  const ZoomCVTriggerHint = new THREE.Mesh(triggerHintGeometry, triggerHintMaterial);
  ZoomCVTriggerHint.position.set(-5.65, 3.8, -6.15);
  ZoomCVTriggerHint.rotation.set(0, Math.PI / 8, 0);
  scene.add(ZoomCVTrigger);
  scene.add(ZoomCVTriggerHint);

  // trigger for zooming on the credits
  const ZoomCreditsTriggerGeometry = new THREE.BoxGeometry(0.4, 0.68, 0.1);
  const ZoomCreditsTriggerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0 });
  const ZoomCreditsTrigger = new THREE.Mesh(ZoomCreditsTriggerGeometry, ZoomCreditsTriggerMaterial);
  ZoomCreditsTrigger.position.set(-4.55, 3.53, -6.15);
  ZoomCreditsTrigger.rotation.set(0, -Math.PI / 8, 0);
  const ZoomCreditsTriggerHint = new THREE.Mesh(triggerHintGeometry, triggerHintMaterial);
  ZoomCreditsTriggerHint.position.set(-4.55, 3.53, -6.15);
  scene.add(ZoomCreditsTrigger);
  scene.add(ZoomCreditsTriggerHint);

  // triggers for zooming on the projects
  const projectTriggerGeometry = new THREE.BoxGeometry(0.35, 0.35, 0.05);
  const projectTriggerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });

  // ElephantVision
  const ZoomProject01Trigger = new THREE.Mesh(projectTriggerGeometry, projectTriggerMaterial);
  ZoomProject01Trigger.position.set(-4.83, 4.5, -6.35);
  ZoomProject01Trigger.rotation.set(0, Math.PI / 2, 0);
  const ZoomProject01TriggerHint = new THREE.Mesh(triggerHintGeometry, triggerHintMaterial);
  ZoomProject01TriggerHint.position.set(-4.80, 4.5, -6.35);
  scene.add(ZoomProject01Trigger);
  scene.add(ZoomProject01TriggerHint);

  // EcoSync
  const ZoomProject02Trigger = new THREE.Mesh(projectTriggerGeometry, projectTriggerMaterial);
  ZoomProject02Trigger.position.set(-5.45, 4.85, -6.45);
  ZoomProject02Trigger.rotation.set(0, 0, 0);
  const ZoomProject02TriggerHint = new THREE.Mesh(triggerHintGeometry, triggerHintMaterial);
  ZoomProject02TriggerHint.position.set(-5.45, 4.85, -6.42);
  scene.add(ZoomProject02Trigger);
  scene.add(ZoomProject02TriggerHint);

  // Blender
  const ZoomProject03Trigger = new THREE.Mesh(projectTriggerGeometry, projectTriggerMaterial);
  ZoomProject03Trigger.position.set(-4.05, 3.25, -6.25);
  ZoomProject03Trigger.rotation.set(0, 5 * Math.PI / 12, 0);
  const ZoomProject03TriggerHint = new THREE.Mesh(triggerHintGeometry, triggerHintMaterial);
  ZoomProject03TriggerHint.position.set(-4.05, 3.25, -6.25);
  scene.add(ZoomProject03Trigger);
  scene.add(ZoomProject03TriggerHint);

  // DropBot 
  const ZoomProject04Trigger = new THREE.Mesh(projectTriggerGeometry, projectTriggerMaterial);
  ZoomProject04Trigger.position.set(-6.15, 3.1, -4.48);
  ZoomProject04Trigger.rotation.set(0, 0, 0);
  const ZoomProject04TriggerHint = new THREE.Mesh(triggerHintGeometry, triggerHintMaterial);
  ZoomProject04TriggerHint.position.set(-6.15, 3.1, -4.48);
  scene.add(ZoomProject04Trigger);
  scene.add(ZoomProject04TriggerHint);

  // Ertranked
  const ZoomProject05Trigger = new THREE.Mesh(projectTriggerGeometry, projectTriggerMaterial);
  ZoomProject05Trigger.position.set(-6.2, 3.1, -3.7);
  ZoomProject05Trigger.rotation.set(Math.PI / 2, 0, Math.PI / 3);
  const ZoomProject05TriggerHint = new THREE.Mesh(triggerHintGeometry, triggerHintMaterial);
  ZoomProject05TriggerHint.position.set(-6.2, 3.1, -3.7);
  scene.add(ZoomProject05Trigger);
  scene.add(ZoomProject05TriggerHint);

  // Lyrix
  const ZoomProject06Trigger = new THREE.Mesh(projectTriggerGeometry, projectTriggerMaterial);
  ZoomProject06Trigger.position.set(-6.25, 3.12, -3.55);
  ZoomProject06Trigger.rotation.set(Math.PI / 2, 0, Math.PI / 12);
  const ZoomProject06TriggerHint = new THREE.Mesh(triggerHintGeometry, triggerHintMaterial);
  ZoomProject06TriggerHint.position.set(-6.25, 3.12, -3.55);
  scene.add(ZoomProject06Trigger);  
  scene.add(ZoomProject06TriggerHint);


  // Raycaster for detecting clicks
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Target camera position and rotation
  const targetPositionOrigin = new THREE.Vector3(-4.65, 4.27, -4.63);
  const targetRotationOrigin = new THREE.Euler(-0.65, 0.65, 0.43);

  const targetPositionProjects = new THREE.Vector3(-5.5, 3.8, -5);
  const targetRotationProjects = new THREE.Euler(0, Math.PI / 2, 0);

  const targetPositionCV = new THREE.Vector3(-5.5, 3.8, -5.85);
  const targetRotationCV = new THREE.Euler(0, Math.PI / 9, 0);

  const targetPositionCredits = new THREE.Vector3(-5.3, 3.5, -5.85);
  const targetRotationCredits = new THREE.Euler(0, -Math.PI / 10, 0);

  // Variables for camera movement
  let moveCameraToOrigin = false;
  let moveCameraToCV = false;
  let moveCameraToCredits = false;
  let moveCameraToProjects = false;
  let startPosition = new THREE.Vector3();
  let startRotation = new THREE.Euler();
  let lerpFactor = 0;

  // Handle click event
  function onClick(event) {

    // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster based on the mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the ray
    const ZoomCVTriggerintersects = raycaster.intersectObjects([ZoomCVTrigger]);
    const ZoomCreditsTriggerintersects = raycaster.intersectObjects([ZoomCreditsTrigger]);
    const ZoomProjectsTriggerintersects = raycaster.intersectObjects([
      ZoomProject01Trigger, 
      ZoomProject02Trigger, 
      ZoomProject03Trigger, 
      ZoomProject04Trigger,
      ZoomProject05Trigger,
      ZoomProject06Trigger
    ]);

    if (ZoomCVTriggerintersects.length > 0) {
      // Temporarily deactivate the orbit controls
      controls.enabled = false;

      // Set up the transition
      moveCameraToCV = true;
      lerpFactor = 0;
      startPosition.copy(camera.position);
      startRotation.copy(camera.rotation);

      clickSound.play();
    }

    if (ZoomCreditsTriggerintersects.length > 0) {
      // Temporarily deactivate the orbit controls
      controls.enabled = false;

      // Set up the transition
      moveCameraToCredits = true;
      lerpFactor = 0;
      startPosition.copy(camera.position);
      startRotation.copy(camera.rotation);

      clickSound.play();
    }

    if (ZoomProjectsTriggerintersects.length > 0) {
      // Temporarily deactivate the orbit controls
      controls.enabled = false;

      // Set up the transition
      moveCameraToProjects = true;
      lerpFactor = 0;
      startPosition.copy(camera.position);
      startRotation.copy(camera.rotation);

      // ElephanVision
      if (ZoomProjectsTriggerintersects[0].object === ZoomProject01Trigger) {
        projectId = 2;
        
        // EcoSync
      } else if (ZoomProjectsTriggerintersects[0].object === ZoomProject02Trigger) {
        projectId = 1;
        
        // Blender
      } else if (ZoomProjectsTriggerintersects[0].object === ZoomProject03Trigger) {
        projectId = 5;
        
        // DropBot
      } else if (ZoomProjectsTriggerintersects[0].object === ZoomProject04Trigger) {
        projectId = 0;
        
        // Ertranked
      } else if (ZoomProjectsTriggerintersects[0].object === ZoomProject05Trigger) {
        projectId = 4;
        
        // Lyrix
      } else if (ZoomProjectsTriggerintersects[0].object === ZoomProject06Trigger) {
        projectId = 3;
      }
      
      setProjectData(projectId);

      cardboard.play();
    }
  }

  // on escape, lerp back to the original position
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !moveCameraToCV && !moveCameraToCredits && !moveCameraToProjects) {
      moveCameraToOrigin = true;
      lerpFactor = 0;
      startPosition.copy(camera.position);
      startRotation.copy(camera.rotation);
    }
  });

  // Listen for click events
  window.addEventListener('click', onClick, false);

  // Resize canvas on window resize
  window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function smoothCameraMovement(startPosition, startRotation, targetPosition, targetRotation, lerpFactor) {
    camera.position.lerpVectors(startPosition, targetPosition, lerpFactor);
    camera.rotation.set(
      THREE.MathUtils.lerp(startRotation.x, targetRotation.x, lerpFactor),
      THREE.MathUtils.lerp(startRotation.y, targetRotation.y, lerpFactor),
      THREE.MathUtils.lerp(startRotation.z, targetRotation.z, lerpFactor)
    );
  }

  //escape button
  const escapeButton = document.getElementById('exit-button');
  escapeButton.addEventListener('click', () => {
    if (!moveCameraToCV && !moveCameraToCredits && !moveCameraToProjects) {
      moveCameraToOrigin = true;
      lerpFactor = 0;
      startPosition.copy(camera.position);
      startRotation.copy(camera.rotation);

      clickSound.play();
    }
  });

  // ########### ANIMATION LOOP ###########
  //
  // ######################################

  // Animation loop
  function animate() {
      requestAnimationFrame(animate);
      //animate a breathing effect on the hints
      ZoomCVTriggerHint.scale.set(1 + 0.3 * Math.sin(performance.now() / 400), 1 + 0.3 * Math.sin(performance.now() / 400), 1 + 0.3 * Math.sin(performance.now() / 400));
      ZoomCreditsTriggerHint.scale.set(1 + 0.3 * Math.cos(performance.now() / 400), 1 + 0.3 * Math.cos(performance.now() / 400), 1 + 0.3 * Math.cos(performance.now() / 400));
      ZoomProject01TriggerHint.scale.set(1 + 0.3 * Math.sin(performance.now() / 400), 1 + 0.3 * Math.sin(performance.now() / 400), 1 + 0.3 * Math.sin(performance.now() / 400));
      ZoomProject02TriggerHint.scale.set(1 + 0.3 * Math.cos(performance.now() / 400), 1 + 0.3 * Math.cos(performance.now() / 400), 1 + 0.3 * Math.cos(performance.now() / 400));
      ZoomProject03TriggerHint.scale.set(1 + 0.3 * Math.sin(performance.now() / 400), 1 + 0.3 * Math.sin(performance.now() / 400), 1 + 0.3 * Math.sin(performance.now() / 400));
      ZoomProject04TriggerHint.scale.set(1 + 0.3 * Math.cos(performance.now() / 400), 1 + 0.3 * Math.cos(performance.now() / 400), 1 + 0.3 * Math.cos(performance.now() / 400));
      ZoomProject05TriggerHint.scale.set(1 + 0.3 * Math.sin(performance.now() / 400), 1 + 0.3 * Math.sin(performance.now() / 400), 1 + 0.3 * Math.sin(performance.now() / 400));
      ZoomProject06TriggerHint.scale.set(1 + 0.3 * Math.cos(performance.now() / 400), 1 + 0.3 * Math.cos(performance.now() / 400), 1 + 0.3 * Math.cos(performance.now() / 400));

      // zoom on the CV
      if (moveCameraToCV) {
        lerpFactor += 0.025; // speed

        // deactivate the triggers
        ZoomCVTrigger.scale.set(0, 0, 0);
        ZoomCreditsTrigger.scale.set(0, 0, 0);
        ZoomProject01Trigger.scale.set(0, 0, 0);
        ZoomProject02Trigger.scale.set(0, 0, 0);
        ZoomProject03Trigger.scale.set(0, 0, 0);
        ZoomProject04Trigger.scale.set(0, 0, 0);
        ZoomProject05Trigger.scale.set(0, 0, 0);
        ZoomProject06Trigger.scale.set(0, 0, 0);

        ZoomCVTriggerHint.material.opacity = 0;
        smoothCameraMovement(startPosition, startRotation, targetPositionCV, targetRotationCV, lerpFactor);
        if (lerpFactor >= 1) {
          moveCameraToCV = false;
          document.getElementById('hudT').style.display = 'flex';
        }
      }

      // zoom on the credits
      if (moveCameraToCredits) {
        lerpFactor += 0.025; // speed

        // deactivate the triggers
        ZoomCreditsTrigger.scale.set(0, 0, 0);
        ZoomProject01Trigger.scale.set(0, 0, 0);
        ZoomProject02Trigger.scale.set(0, 0, 0);
        ZoomProject03Trigger.scale.set(0, 0, 0);
        ZoomProject04Trigger.scale.set(0, 0, 0);
        ZoomProject05Trigger.scale.set(0, 0, 0);
        ZoomProject06Trigger.scale.set(0, 0, 0);

        ZoomCreditsTriggerHint.material.opacity = 0;
        smoothCameraMovement(startPosition, startRotation, targetPositionCredits, targetRotationCredits, lerpFactor);
        if (lerpFactor >= 1) {
          moveCameraToCredits = false;
          document.getElementById('hudT').style.display = 'flex';
        }
      }

      // zoom on the projects
      if (moveCameraToProjects) {
        lerpFactor += 0.025; // speed
        // deactivate the triggers
        ZoomCVTrigger.scale.set(0, 0, 0);
        ZoomCreditsTrigger.scale.set(0, 0, 0);
        ZoomProject01Trigger.scale.set(0, 0, 0);
        ZoomProject02Trigger.scale.set(0, 0, 0);
        ZoomProject03Trigger.scale.set(0, 0, 0);
        ZoomProject04Trigger.scale.set(0, 0, 0);
        ZoomProject05Trigger.scale.set(0, 0, 0);
        ZoomProject06Trigger.scale.set(0, 0, 0);

        // deactivate the hints
        ZoomProject01TriggerHint.material.opacity = 0;
        ZoomProject02TriggerHint.material.opacity = 0;
        ZoomProject03TriggerHint.material.opacity = 0;
        ZoomProject04TriggerHint.material.opacity = 0;
        ZoomProject05TriggerHint.material.opacity = 0;
        ZoomProject06TriggerHint.material.opacity = 0;
        smoothCameraMovement(startPosition, startRotation, targetPositionProjects, targetRotationProjects, lerpFactor);

        document.getElementById('hudP').style.display = 'flex';

        if (lerpFactor >= 1) {
          moveCameraToProjects = false;
          document.getElementById('hudT').style.display = 'flex';
          document.getElementById('hudP').style.opacity = 1;
        }
      }

      // zoom on the origin
      if (moveCameraToOrigin) {
        document.getElementById('hudT').style.display = 'none';
        document.getElementById('hudP').style.opacity = 0;
        hideAllDisks();
        lerpFactor += 0.025; // speed
        smoothCameraMovement(startPosition, startRotation, targetPositionOrigin, targetRotationOrigin, lerpFactor);
        if (lerpFactor >= 1) {
          moveCameraToOrigin = false;
          controls.enabled = true;
          ZoomCVTriggerHint.material.opacity = 1;
          ZoomCreditsTriggerHint.material.opacity = 1;
          ZoomProject01TriggerHint.material.opacity = 1;
          ZoomProject02TriggerHint.material.opacity = 1;
          ZoomProject03TriggerHint.material.opacity = 1;
          ZoomProject04TriggerHint.material.opacity = 1;
          ZoomProject05TriggerHint.material.opacity = 1;
          ZoomProject06TriggerHint.material.opacity = 1;
          ZoomCVTrigger.scale.set(1, 1, 1);
          ZoomCreditsTrigger.scale.set(1, 1, 1);
          ZoomProject01Trigger.scale.set(1, 1, 1);
          ZoomProject02Trigger.scale.set(1, 1, 1);
          ZoomProject03Trigger.scale.set(1, 1, 1);
          ZoomProject04Trigger.scale.set(1, 1, 1);
          ZoomProject05Trigger.scale.set(1, 1, 1);
          ZoomProject06Trigger.scale.set(1, 1, 1);

          document.getElementById('hudP').style.display = 'none';
        }
      }
    
      renderer.render(scene, camera);

      // only update controls if they are enabled
      if (controls.enabled)
        controls.update();
  }
  animate();
}

const startButton = document.getElementById('start-button');
startButton.addEventListener('click', () => {
  backgroundMusic.play();
  startButton.style.display = 'none';
  document.getElementById('loading-title').style.display = 'block';
  document.getElementById('progress-bar').style.display = 'block';

  clickSound.play();
  init();
});

// Control mute/unmute
function toggleMute() {
  backgroundMusic.muted = !backgroundMusic.muted;
  if (backgroundMusic.muted) {
    document.getElementById('mute-icon').style.display = 'none';
    document.getElementById('unmute-icon').style.display = 'flex';
  } else {
    document.getElementById('mute-icon').style.display = 'flex';
    document.getElementById('unmute-icon').style.display = 'none';
  }
}

function toggleHelp() {
  if (document.getElementById('tutorial-hide').style.display === 'none') {
    document.getElementById('tutorial-hide').style.display = 'flex';
    tutorialButton.children[0].innerHTML = '<b>Got it!</b>';
  } else {
    document.getElementById('tutorial-hide').style.display = 'none';
    tutorialButton.children[0].innerHTML = '<b>Help</b>';
  }
}

// Mute button
const muteButton = document.getElementById('mute-button');
muteButton.addEventListener('click', () => {
  toggleMute();
  clickSound.play();
});

//tutorial button
const tutorialButton = document.getElementById('tutorial-button');
tutorialButton.addEventListener('click', () => {
  toggleHelp();
  clickSound.play();
});

// Prevent right-click menu
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

function fetchProjectData() { 
  fetch('./projects.json')
    .then(response => response.json())
    .then(data => projectData = data);
}

function hideAllDisks() {
  scene.getObjectByName('DropBot').children[0].scale.set(0, 0, 0);
  scene.getObjectByName('Blender Projects').children[0].scale.set(0, 0, 0);
  scene.getObjectByName('EcoSync').children[0].scale.set(0, 0, 0);
  scene.getObjectByName('ElephantVision').children[0].scale.set(0, 0, 0);
  scene.getObjectByName('Ertranked').children[0].scale.set(0, 0, 0);
  scene.getObjectByName('Lyrix').children[0].scale.set(0, 0, 0);  
}

function setProjectData(projectId) {
      const project = projectData[projectId];
      document.getElementById('project-title').innerText = project.title;
      document.getElementById('project-image').src =  project.picturePath;
      document.getElementById('project-year').innerText = project.year;

      // hide all disks
      hideAllDisks();

      // show the disk of the current project
      scene.getObjectByName(project.title).children[0].scale.set(1, 1, 1);

      const container = document.getElementById('project-tech');
      container.innerHTML = '';
      project.usedTechs.forEach((technologies) => {
        const techBox = document.createElement('div');
        techBox.classList.add('tech-box');
        const prefix = document.createElement('div');
        prefix.classList.add('prefix');
        prefix.innerText = '• ';
        const tech = document.createElement('div');
        tech.classList.add('tech');
        tech.classList.add('text');
        tech.innerText = technologies;

        techBox.appendChild(prefix);
        techBox.appendChild(tech);
        container.appendChild(techBox);
      });
      document.getElementById('project-description').innerText = project.description;
      if (project.link === null) {
        document.getElementById('project-link').style.display = 'none';
      } else {
        document.getElementById('project-link').style.display = 'block';
        document.getElementById('project-link').href = project.link;
      }
    };

  document.getElementById('previous').addEventListener('click', () => {
    projectId = projectId === 0 ? 5 : projectId - 1;
    setProjectData(projectId);
    clickSound.play();
    // disable button to prevent spam
    document.getElementById('previous').disabled = true;
    setTimeout(() => {
      document.getElementById('previous').disabled = false;
    }, 500);
  });
  document.getElementById('next').addEventListener('click', () => {
    projectId = projectId === 5 ? 0 : projectId + 1;
    setProjectData(projectId);
    clickSound.play();
    // disable button to prevent spam
    document.getElementById('next').disabled = true;
    setTimeout(() => {
      document.getElementById('next').disabled = false;
    }, 500);
  });
