import {
    AmbientLight,
    AxesHelper,
    DirectionalLight,
    GridHelper,
    PerspectiveCamera,
    Scene,
    Raycaster,
    Vector2,
    WebGLRenderer,
} from "three";
import {
    OrbitControls
} from "three/examples/jsm/controls/OrbitControls";
import {
    IFCLoader
} from "web-ifc-three/IFCLoader";
import {
    acceleratedRaycast,
    computeBoundsTree,
    disposeBoundsTree
} from 'three-mesh-bvh';
import {
    MeshBasicMaterial
} from "three";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
    Matrix4, 
    Mesh, 
    Line3, 
    LineSegments, 
    BufferGeometry, 
    Vector3, 
    LineBasicMaterial,
    SphereBufferGeometry,
    BoxBufferGeometry,
    Object3D,
    Group,
    GreaterDepth,
    BufferAttribute
} from "three";
import { IFCCOLUMN, IFCDOOR, IFCFLOWTERMINAL, IFCWALL} from "web-ifc";


let boundsVizualization1;
let boundsVizualization2;
// For Multiple Collision
const table = document.createElement("table");

const collisionMaterial1 = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.4,
    color: 0xFFC0CB,
    depthTest: false,
});
const collisionMaterial2 = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.4,
    color: 0x0000FF,
    depthTest: false,
});

const nonCollisionMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.2,
    color: 0x00FF00,
    depthTest: false,
})


//Creates the Three.js scene
const scene = new Scene();

// Container for Lines and Sphere - Made for Easier Destruction
const lineGroup = new Group();
scene.add(lineGroup);

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
const renderer = new WebGLRenderer({
    canvas: threeCanvas,
    alpha: true
});
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//Creates grids and axes in the scene
const grid = new GridHelper(20, 40);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);

//Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
controls.enableDamping = true;
controls.target.set(-2, 0, 0);


//Animation loop
const animate = () => {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};

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
ifcLoader.load("../../../IFC/rme_advanced_sample_project.ifc", (ifcModel) => {
    ifcModels.push(ifcModel);
    scene.add(ifcModel)
});

// Sets up optimized picking
ifcLoader.ifcManager.setupThreeMeshBVH(
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast);

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
const mouse = new Vector2();

function cast(event) {

    // Computes the position of the mouse on the screen
    const bounds = threeCanvas.getBoundingClientRect();

    const x1 = event.clientX - bounds.left;
    const x2 = bounds.right - bounds.left;
    mouse.x = (x1 / x2) * 2 - 1;

    const y1 = event.clientY - bounds.top;
    const y2 = bounds.bottom - bounds.top;
    mouse.y = -(y1 / y2) * 2 + 1;

    // Places it on the camera pointing to the mouse
    raycaster.setFromCamera(mouse, camera);

    // Casts a ray
    return raycaster.intersectObjects(ifcModels);
}

const output = document.getElementById("id-output");

function pick(event) {
    const found = cast(event)[0];
    if (found) {
        const index = found.faceIndex;
        const geometry = found.object.geometry;
        const ifc = ifcLoader.ifcManager;
        const id = ifc.getExpressId(geometry, index);
        console.log(id);
        output.innerHTML = id;
    }
}


function detectCollisionByIDs(target1, target2){
    // Clearing Previous Things
    clearSelections();

    let intersectionResult = false;

    const sub1 = getSubsetDataFromId(parseInt(target1));
    const sub2 = getSubsetDataFromId(parseInt(target2));

    sub1.geometry.computeBoundsTree();
    sub1.geometry.computeBoundingSphere();

    sub2.geometry.computeBoundsTree();
    sub2.geometry.computeBoundingSphere();

    const transformMatrix = new Matrix4().copy(sub1.matrixWorld).invert().multiply(sub2.matrixWorld);
   
    const lineGeometry = new BufferGeometry();
	lineGeometry.setFromPoints( [ new Vector3( 0, 1, 0 ), new Vector3( 0, - 1, 0 ) ] );
	const line = new LineSegments( 
        lineGeometry, 
        new LineBasicMaterial
        ({ 
            color: 0x000000,
            depthFunc: GreaterDepth,
            linewidth: 1
        }) 
    );

    const edge = new Line3();
	const results = [];
	
    sub1.geometry.boundsTree.bvhcast( sub2.geometry.boundsTree, transformMatrix, {

		intersectsTriangles( triangle1, triangle2 ) {

			if ( triangle1.intersectsTriangle( triangle2, edge ) ) {
				const { start, end } = edge;
				results.push(
					start.x,
					start.y,
					start.z,
					end.x,
					end.y,
					end.z,
				);
                
                // return INTERSECTED;
                // This means intersection is happening
                // Results array will be filled with data
                // We will check if results array is null or not
                // If it is not null then there is intersection happening
			}

            //return NOT_INTERSECTED;
            // Intersection is not Happening and Results Array will be null
		}

	} );

    // If Results has data then clash detected
    if(results.length > 0){
        intersectionResult = true;

        const geometry = line.geometry;
        const posArray = geometry.attributes.position.array;
        if ( posArray.length < results.length ) {

            geometry.dispose();
            geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( results ), 3, false ) );

        } else {

            posArray.set( results );

        }

        line.renderOrder = 3;
        lineGroup.add( line );
    }


    return(intersectionResult);
}
function getSubsetDataFromId(elementId) {
    const sub1 = ifcLoader.ifcManager.createSubset({
        modelID: 0,
        scene: scene,
        ids: [elementId],
        removePrevious: true,
        material: new MeshBasicMaterial({
            transparent: true,
            opacity: 0,
        }),
        applyBVH: true,
    });
    return sub1;
}

// Statement 2
async function getAllExpressIds(element, type) {

    clearSelections();
    
    const collisionResults = [];
    ifcLoader.ifcManager.removeSubset(0,collisionMaterial1);
    ifcLoader.ifcManager.removeSubset(0,collisionMaterial2);

    const elementBase = parseInt(element);
    let elementsType;
    if(type === "IFCWALL"){
        elementsType = IFCWALL;
    }
    else if(type === "IFCCOLUMN"){
        elementsType = IFCCOLUMN;
    }
    else if(type === "IFCFLOWTERMINAL"){
        elementsType = IFCFLOWTERMINAL
    }
    console.log(elementBase);
    console.log(elementsType);

    const sub1 = getSubsetDataFromId(elementBase);
    sub1.geometry.computeBoundsTree();
    sub1.geometry.computeBoundingSphere();

    const elementsTypeArr = await ifcLoader.ifcManager.getAllItemsOfType(0, elementsType, false);

    for(let cIndex = 0; cIndex < elementsTypeArr.length; cIndex++){
        const elementId2 = elementsTypeArr[cIndex];

        if(elementBase === elementId2){

        }
        else{
            const sub2 = getSubsetDataFromId(elementId2);

            sub2.geometry.computeBoundsTree();
            sub2.geometry.computeBoundingSphere();

            const transformMatrix = new Matrix4().copy(sub1.matrixWorld).invert().multiply(sub2.matrixWorld);

            const hit = sub1.geometry.boundsTree.intersectsGeometry(sub2.geometry, transformMatrix)

            if(hit){
                collisionResults.push({
                    id1 : elementBase,
                    id2 : elementId2,
                    result : hit
                });
            }

            // Removing Subset from scenes
            scene.remove(sub2);
        }
    }
    


    console.log(collisionResults);

    // If Multiple Collisions Present then only creating table
    if(collisionResults.length > 0){
        createGUIForCollisionResults(collisionResults);
    }

}
function createGUIForCollisionResults(colResults){
    const tableDiv = document.getElementById("id-collision-table");
    tableDiv.style.display = "block";

    for(let index = 0; index < colResults.length; index++){
        const label1 = colResults[index].id1;
        const label2 = colResults[index].id2;

        //getItemNameFromExpressId(colResults[index].id1);
        
        createRowInTable(index,label1,label2)
    }

    tableDiv.appendChild(table);
}
function createRowInTable(index, label1, label2){
    const row = document.createElement("tr");
    row.innerHTML = "<td><button onclick='highlightClash("+label1+","+label2+")'>Collision "+(index+1)+"</button></td><td>"+label1+"</td><td>"+label2+"</td>";

    table.appendChild(row);
}
function highlightClash(expId1, expId2){

    ifcLoader.ifcManager.removeSubset(0,collisionMaterial1);
    ifcLoader.ifcManager.removeSubset(0,collisionMaterial2);
    
    ifcLoader.ifcManager.createSubset({
        modelID: 0,
        ids: [expId1],
        material: collisionMaterial1,
        scene: scene
    });

    ifcLoader.ifcManager.createSubset({
        modelID: 0,
        ids: [expId2],
        material: collisionMaterial2,
        scene: scene
    });
    //zoomToFit(object, offset);
}
// Better UX
// function zoomToFit(object, offset=1){

// }



function calculateCollisionByDistance(base, target, distance){
    ifcLoader.ifcManager.removeSubset(0,collisionMaterial1);
    ifcLoader.ifcManager.removeSubset(0,collisionMaterial2);
    ifcLoader.ifcManager.removeSubset(0,nonCollisionMaterial);
    lineGroup.clear();

    const sub1 = getSubsetDataFromId(parseInt(base));
    const sub2 = getSubsetDataFromId(parseInt(target));


    const lineCube = new Mesh(new BoxBufferGeometry(), new MeshBasicMaterial({
        color: 0xE90000,
    }));
    lineCube.position.z = 0.5;
    let line = new Object3D();
    line.add(lineCube);
    
    lineGroup.add(line);

    scene.updateMatrixWorld(true);

    let sphere1 = new Mesh(
        new SphereBufferGeometry(0.025, 20, 20),
        new MeshBasicMaterial({
            color: 0xE91E63,
        }));
    //scene.add(sphere1);
    
    let sphere2 = new Mesh(
        new SphereBufferGeometry(0.025, 20, 20),
        new MeshBasicMaterial({
            color: 0x000000,
        }));

    lineGroup.add(sphere1);
    lineGroup.add(sphere2);
    
    sub1.geometry.computeBoundsTree();
    sub1.geometry.computeBoundingSphere();
    if (boundsVizualization1) {
        scene.remove(boundsVizualization1);
    }

    sub2.geometry.computeBoundsTree();
    sub2.geometry.computeBoundingSphere();
    sub2.updateMatrixWorld();
    if (boundsVizualization2) {
        scene.remove(boundsVizualization2);
    }


    const transformMatrix = new Matrix4().copy(sub1.matrixWorld).invert().multiply(sub2.matrixWorld);
    
    const maxDistance = parseFloat(distance);

    const distanceResult1 = {};
    const distanceResult2 = {};
    const point = sub1.geometry.boundsTree.closestPointToGeometry(
        sub2.geometry,
        transformMatrix,
        distanceResult1,
        distanceResult2,
        0,
        maxDistance
    )

    if (point && distanceResult1.distance <= maxDistance) {
        lineGroup.visible = true;

        console.log(distanceResult1);
        console.log(distanceResult2);

        console.log("Distance 1:" + distanceResult1.distance + "::::Distance 2:" + distanceResult2.distance);

        // the resulting points are provided in the local frame of the the geometries
        sphere1.position.copy(distanceResult1.point);
        sphere2.position.copy(distanceResult2.point).applyMatrix4(transformMatrix);

        sphere1.position.applyMatrix4(sub1.matrixWorld);
        sphere2.position.applyMatrix4(sub1.matrixWorld);

        line.position.copy(sphere1.position);
        line.lookAt(sphere2.position);
        console.log(line.position);

        line.scale.set(
            0.02,
            0.02,
            sphere1.position.distanceTo(sphere2.position)
        );


        console.log("Collision Detected");
        // Creates subset
        ifcLoader.ifcManager.createSubset({
            modelID: 0,
            ids: [parseInt(base)],
            material: collisionMaterial1,
            scene: scene
        });

        ifcLoader.ifcManager.createSubset({
            modelID: 0,
            ids: [parseInt(target)],
            material: collisionMaterial2,
            scene: scene
        });

        // Showing Output in HTML Side
        const collisionPara = document.getElementById("id-collision-output");
        collisionPara.innerHTML = "Collision Detected with Approx Distance : "+(distanceResult1.distance).toFixed(2)+"m";
    }
    else{
        ifcLoader.ifcManager.createSubset({
            modelID: 0,
            ids: [parseInt(base), parseInt(target)],
            material: nonCollisionMaterial,
            scene: scene
        });

        const collisionPara = document.getElementById("id-collision-output");
        collisionPara.innerHTML = "Collision Not Detected";
    }

}


// This Method will be used to remove subsets created based upon material
function clearSelections(){
    lineGroup.clear();
    table.innerHTML = "";
    const tableDiv = document.getElementById("id-collision-table");
    tableDiv.style.display = "none";

    ifcLoader.ifcManager.removeSubset(0, nonCollisionMaterial);
    ifcLoader.ifcManager.removeSubset(0, collisionMaterial1);
    ifcLoader.ifcManager.removeSubset(0, collisionMaterial2);
}



//GUI
const gui = new GUI();

const params = {
    ID1: "559034",
    ID2: "932625",
    Detect: async function () {

        const collision = detectCollisionByIDs(params.ID1, params.ID2);

        if (collision === true) {
            console.log("Collision Detected");
            // Creates subset
            ifcLoader.ifcManager.createSubset({
                modelID: 0,
                ids: [parseInt(params.ID1)],
                material: collisionMaterial1,
                scene: scene
            });

            ifcLoader.ifcManager.createSubset({
                modelID: 0,
                ids: [parseInt(params.ID2)],
                material: collisionMaterial2,
                scene: scene
            });

            // Showing Output in HTML Side
            const collisionPara = document.getElementById("id-collision-output");
            collisionPara.innerHTML = "Collision Detected";
        }
        else{
            // If Elements Don't Collide - Apply Greenish Material To Them
            ifcLoader.ifcManager.createSubset({
                modelID: 0,
                ids: [parseInt(params.ID1), parseInt(params.ID2)],
                material: nonCollisionMaterial,
                scene: scene
            });

            const collisionPara = document.getElementById("id-collision-output");
            collisionPara.innerHTML = "Collision Not Detected";
        }
    },
    BaseId: "555180",
    ElementType: "IFCFLOWTERMINAL",
    GetAllCollisions: function(){
        getAllExpressIds(this.BaseId,this.ElementType);
    },
    CollisionBase: "438897",
    CollisionTarget: "438938",
    Distance: 1,
    GetCollisions: function () {
        //calculateDistance(params.Distance, params.CollisionBase);
        calculateCollisionByDistance(params.CollisionBase, params.CollisionTarget, params.Distance);
    }
}


const CollisionByIDs = gui.addFolder("Collision By IDs");
CollisionByIDs.add(params, "ID1");
CollisionByIDs.add(params, "ID2");
CollisionByIDs.add(params, "Detect");

// Getting all the collisions
const CollisionByType = gui.addFolder("Collision By Types - Get All");
CollisionByType.add(params, "BaseId");
CollisionByType.add(params, "ElementType", ['IFCCOLUMN','IFCWALL','IFCFLOWTERMINAL']).name('Type');
CollisionByType.add(params, "GetAllCollisions").name("Get Collisions");

// Adjust the Max Distance as it suits you
const CollisionByDistance = gui.addFolder("Collision By Setting Distance");
CollisionByDistance.add(params, "CollisionBase");
CollisionByDistance.add(params, "CollisionTarget");
CollisionByDistance.add(params, "Distance").min(0.0).max(30).step(0.5);
CollisionByDistance.add(params, "GetCollisions").name("Get Collision By Distance");



window.ondblclick = pick;

// Button click from Table 
window.highlightClash = highlightClash;
