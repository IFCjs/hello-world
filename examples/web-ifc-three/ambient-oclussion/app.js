import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  GridHelper,
  PerspectiveCamera,
  Scene,
    Plane,
    Vector3,
  WebGLRenderer,
} from "three";

import {IFCSPACE, IFCOPENINGELEMENT} from 'web-ifc';

import Stats from "three/examples/jsm/libs/stats.module";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { IFCLoader } from "web-ifc-three/IFCLoader";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SAOPass } from "three/examples/jsm/postprocessing/SAOPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

//Creates the Three.js scene
const scene = new Scene();

//Sets up the renderer, fetching the canvas of the HTML
const size = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const threeCanvas = document.getElementById("three-canvas");
const renderer = new WebGLRenderer({ canvas: threeCanvas, alpha: true });
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//Creates stats
const stats = Stats();
document.body.appendChild(stats.dom);

//Creates the camera (point of view of the user)
const camera = new PerspectiveCamera(75, size.width / size.height);
camera.position.z = 15;
camera.position.y = 13;
camera.position.x = 8;

//Creates the lights of the scene
const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 1);
directionalLight.position.set(0, 10, 0);
directionalLight.target.position.set(-5, 0, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);

// Creates grids and axes in the scene
const grid = new GridHelper(50, 30);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);

//Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
// controls.enableDamping = true;
controls.target.set(-2, 0, 0);

//Postprocessing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const fxaaPass = new ShaderPass(FXAAShader);
const saoPass = new SAOPass(scene, camera, false, true);

saoPass.enabled = true;
saoPass.params.saoIntensity = 0.02;
saoPass.params.saoBias = 0.5;
saoPass.params.saoBlurRadius = 8;
saoPass.params.saoBlurDepthCutoff = 0.0015;
saoPass.params.saoScale = 50;
saoPass.params.kernelRadius = 50;

composer.addPass(renderPass);
composer.addPass(fxaaPass);
composer.addPass(saoPass);

// Show AO only when the user is not moving the camera
let activateAO = true;
let pointerDown = false;
window.onmousedown = () => {
  activateAO = false;
  pointerDown = true;
}
window.onmouseup = () => {
  activateAO = true;
  pointerDown = false;
}

let lastWheeled = 0;
let wheelDelayAO = 500; // milliseconds
window.onwheel = () => {
  activateAO = false;
  lastWheeled = performance.now();
}

// //Animation loop
const animate = () => {
  controls.update();
  renderer.render(scene, camera);

  if(activateAO) {
    composer.render();
  } else if (!pointerDown) {
    const now = performance.now();
    if(now - lastWheeled > wheelDelayAO) {
      activateAO = true;
    }
  }

  stats.update();
  requestAnimationFrame(animate);
};

animate();

//Adjust the viewport to the size of the browser
window.addEventListener("resize", () => {
  (size.width = window.innerWidth), (size.height = window.innerHeight);
  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();
  composer.setSize(size.width, size.height);
  renderer.setSize(size.width, size.height);
});

//Sets up the IFC loading
const ifcLoader = new IFCLoader();

async function loadIfc() {
  await ifcLoader.ifcManager.setWasmPath("../../../");

  await ifcLoader.ifcManager.applyWebIfcConfig({
    USE_FAST_BOOLS: true,
    COORDINATE_TO_ORIGIN: true
  });

  await ifcLoader.ifcManager.parser.setupOptionalCategories({
    [IFCSPACE]: false,
    [IFCOPENINGELEMENT]: false
  });

  ifcLoader.load("../../../IFC/01.ifc", (ifcModel) => {
    scene.add(ifcModel);
  });
}

loadIfc();



//GUI
const gui = new GUI();

const saoFolder = gui.addFolder("SAO");
saoFolder
  .add(saoPass.params, "output", {
    Beauty: SAOPass.OUTPUT.Beauty,
    "Beauty+SAO": SAOPass.OUTPUT.Default,
    SAO: SAOPass.OUTPUT.SAO,
    Normal: SAOPass.OUTPUT.Normal,
  })
  .onChange(function (value) {
    saoPass.params.output = parseInt(value);
  });

const fxaaFolder = gui.addFolder("FXAA");
fxaaFolder.add(fxaaPass, "enabled");

const plane = new Plane(new Vector3(0, -1, 0), 1.5);
let clippingPlaneControls = {enabled: false};

const clippingPlaneFolder = gui.addFolder("Clipping planes");
clippingPlaneFolder.add(clippingPlaneControls, "enabled").listen().onChange(
    () => {
      if(clippingPlaneControls.enabled) {
        renderer.clippingPlanes = [plane];
      } else {
        renderer.clippingPlanes = [];
      }
    }
)
