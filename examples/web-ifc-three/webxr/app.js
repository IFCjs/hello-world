import {
    AmbientLight,
    AxesHelper,
    DirectionalLight,
    GridHelper,
    PerspectiveCamera,
    Scene,
    Raycaster,
    Matrix4,
    WebGLRenderer,
    Vector3,
    Line,
    BufferGeometry,
    MeshLambertMaterial,
    Mesh,
    Object3D,
    Clock,
    Quaternion
} from "three";
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { HTMLMesh } from 'three/examples/jsm/interactive/HTMLMesh.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import {
    acceleratedRaycast,
    computeBoundsTree,
    disposeBoundsTree
} from 'three-mesh-bvh';

//Creates the Three.js scene
const scene = new Scene();

//Variables for VR hand controllers
let controller1, controller2;
let controllerGrip1, controllerGrip2;

//Variable for raycaster to 'pick' objects
let raycaster;

const tempMatrix = new Matrix4();

//Object to store the size of the viewport
const size = {
    width: window.innerWidth,
    height: window.innerHeight,
};

//Creates the camera (point of view of the user)
const camera = new PerspectiveCamera(75, size.width / size.height);
camera.position.z = 15;
camera.position.y = 13;
camera.position.x = 8;

//Create a 3D object to carry the camera around XR session
const cameraDolly = new Object3D();
cameraDolly.position.x = 0
cameraDolly.position.y = 1.6
cameraDolly.position.z = 5;
cameraDolly.add(camera);
scene.add(cameraDolly);

//Add dummy camera to accurately get camera orientation in handleMovement function
const dummyCam = new Object3D();
camera.add(dummyCam);

//Creates the lights of the scene
const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 1);
directionalLight.position.set(0, 10, 0);
directionalLight.target.position.set(-5, 0, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);

//Sets up the renderer, fetching the canvas of the HTML
const threeCanvas = document.getElementById("three-canvas");
const renderer = new WebGLRenderer({canvas: threeCanvas, alpha: true});
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//Notify WebGLRenderer instance to enable XR rendering
renderer.xr.enabled = true;

//Append button to engage VR mode
document.body.appendChild( VRButton.createButton( renderer ) );

//Creates grids and axes in the scene
const grid = new GridHelper(50, 30);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);

//Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
controls.enableDamping = true;
controls.target.set(-2, 0, 0);

//VR Controllers 
controller1 = renderer.xr.getController( 0 );
controller1.addEventListener( 'selectstart', pick );
// controller1.addEventListener( 'squeezestart', hideDetails );
controller1.addEventListener( 'squeezestart', allowMovement );
controller1.addEventListener( 'squeezeend', stopMovement );
scene.add( controller1 );

//One can set controller 2 to perform another function on 'select' - currently both set to object picking
controller2 = renderer.xr.getController( 1 );
controller2.addEventListener( 'selectstart', highlight );
controller2.addEventListener( 'squeezestart', clearHighlight );
scene.add( controller2 );
//controller2.addEventListener( 'selectend', clearHighlight );

const controllerModelFactory = new XRControllerModelFactory();

controllerGrip1 = renderer.xr.getControllerGrip( 0 );
controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
scene.add( controllerGrip1 );

controllerGrip2 = renderer.xr.getControllerGrip( 1 );
controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
scene.add( controllerGrip2 );

// Needed to add controllers to dolly??
cameraDolly.add(controller1);
cameraDolly.add(controller2);
cameraDolly.add(controllerGrip1);
cameraDolly.add(controllerGrip2);

//Lines to shoot out from VR controllers to help aim
const geometry = new BufferGeometry().setFromPoints( [ new Vector3( 0, 0, 0 ), new Vector3( 0, 0, - 1 ) ] );
const line = new Line( geometry );
line.name = 'line';
line.scale.z = 5;

controller1.add( line.clone() );
controller2.add( line.clone() );

//Animation loop
function animate() {
    //WebXR needs 'setAnimationLoop' as opposed to 'requestAnimationFrame'
    renderer.setAnimationLoop( render );
}

const clock = new Clock();

function render() {
    const dt = clock.getDelta();
    if (controller1) { handleUserMovement(dt) }
    renderer.render( scene, camera );
}

animate();

//Adjust the viewport to the size of the browser
window.addEventListener("resize", () => {
    (size.width = window.innerWidth), (size.height = window.innerHeight);
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    renderer.setSize(size.width, size.height);
});

//Sets up the IFC loading
const ifcModels = [];
const ifcLoader = new IFCLoader();
ifcLoader.ifcManager.setWasmPath("../../../");

const input = document.getElementById("file-input");
  input.addEventListener(
    "change",
    (changed) => {
      const ifcURL = URL.createObjectURL(changed.target.files[0]);
      ifcLoader.load(ifcURL, (ifcModel) => {
        //Make a translucent copy geometry - so when IFC model is hidden on item highlight, the remaining items take 'ghost' view  
        const modelCopy = new Mesh(
            ifcModel.geometry,
            new MeshLambertMaterial({
                    transparent: true,
                    opacity: 0.1,
                    color: 0x77aaff
        }));
        ifcModels.push(ifcModel);
        console.log('the ifc model:', ifcModel)
        scene.add(modelCopy)
        scene.add(ifcModel)
      });
    },
    false
  );

// Sets up optimized picking
ifcLoader.ifcManager.setupThreeMeshBVH(
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast);

raycaster = new Raycaster();
raycaster.firstHitOnly = true;

function cast(controller) {
    tempMatrix.identity().extractRotation( controller.matrixWorld );
    raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
    raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );
    // Casts a ray
    return raycaster.intersectObjects(ifcModels);
}

const outputId = document.getElementById("id-output");
const outputDesc = document.getElementById("desc-output");
const messageBlock = document.getElementById("message-container");
propMesh = new HTMLMesh( messageBlock );

async function pick(event) {
    const controller = event.target;
    const found = cast(controller)[0];
    if (found) {
        const index = found.faceIndex;
        const geometry = found.object.geometry;
        const ifc = ifcLoader.ifcManager;
        const id = ifc.getExpressId(geometry, index);
        const modelID = found.object.modelID;
        const props = await ifc.getItemProperties(modelID, id);
        console.log(id);
        console.log(found.object);
        const expId = props.expressID;
        outputId.innerHTML = `ExpressID : ${expId}`;
        const desc = props.Name.value;
        outputDesc.innerHTML = `Name: ${desc}`;
        propMesh.removeFromParent();
        propMesh = new HTMLMesh( messageBlock );
        setX = found.point.x + 0.2*(cameraDolly.position.x - found.point.x);
        setY = found.point.y + 0.2*(cameraDolly.position.y - found.point.y);
        setZ = found.point.z + 0.2*(cameraDolly.position.z - found.point.z);
        propMesh.position.set( setX, setY, setZ );
        // propMesh.quaternion = found.object.mesh.quaternion
        propMesh.lookAt(cameraDolly.position);
        propMesh.scale.setScalar( 2 );
        scene.add(propMesh);
    }
}

function hideDetails(event) {
    propMesh.removeFromParent();
}

//Will apply material completely transparent on select
const highlightStrongMaterial = new MeshLambertMaterial({
    transparent: true,
    opacity: 0.9,
    color: 0xff88ff,
    depthTest: false
})

//For seeing through items
function highlight(event) {
    const controller = event.target;
    const found = cast(controller)[0];
    if (found) {
        const index = found.faceIndex;
        const geometry = found.object.geometry;
        const id = ifcLoader.ifcManager.getExpressId(geometry, index);
        const modelID = found.object.modelID;
        //Creates 'highlight' subset
        ifcLoader.ifcManager.createSubset({
            modelID: modelID,
            ids: [id],
            material: highlightStrongMaterial,
            scene: scene,
            removePrevious: true,
            customID: 'highlight-sub'
        });
        for (var i = 0; i < ifcModels.length; i++) {
            //Hide all IFC models (only the transparent copies will remain seen with the highlight subset)
            ifcModels[i].visible = false;
        }
    } else {
        clearHighlight(event)
    }
}

//Removes previous highlight
function clearHighlight(event) {
    //Loop through all loaded IFC models
    for (var i = 0; i < ifcModels.length; i++) {
        //Remove the 'highlight' subset
        ifcLoader.ifcManager.removeSubset(ifcModels[i].modelID, highlightStrongMaterial, 'highlight-sub');
        //Make the IFC Model visible again
        ifcModels[i].visible = true;
    }
}

//Functions to handle user movement around scene (3 of the 6 DoF)
var letUserMove = false
function allowMovement() { letUserMove = true }
function stopMovement() { letUserMove = false }
function handleUserMovement(dt) {
    if (letUserMove) {
        const speed = 2;
        const moveZ = -dt * speed
        const saveQuat = cameraDolly.quaternion.clone();
        var holder = new Quaternion()
        dummyCam.getWorldQuaternion(holder)
        cameraDolly.quaternion.copy(holder);
        cameraDolly.translateZ(moveZ);
        cameraDolly.quaternion.copy(saveQuat)
    }
}

/* 
No way for me to test with no device - ThreeJS currently doesn't support VR thumbstick event listeners - 
so this is based on solution found on Stack Overflow here: https://stackoverflow.com/questions/62476426/webxr-controllers-for-button-pressing-in-three-js
*/


