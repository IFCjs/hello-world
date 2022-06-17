import {Color, LineBasicMaterial, MeshBasicMaterial} from 'three';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial';
import {IfcViewerAPI} from 'web-ifc-viewer';
import Drawing from 'dxf-writer';
import {
    IFCWINDOW,
    IFCPLATE,
    IFCMEMBER,
    IFCWALL,
    IFCWALLSTANDARDCASE,
    IFCSLAB,
    IFCFURNISHINGELEMENT,
    IFCDOOR,
    IFCSTAIR,
    IFCSTAIRFLIGHT,
    IFCRAILING
} from 'web-ifc';
import {ClippingEdges} from 'web-ifc-viewer/dist/components/display/clipping-planes/clipping-edges';

// Let's initialize the scene
const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({container, backgroundColor: new Color(0xffffff)});
viewer.grid.setGrid();
viewer.axes.setAxes();

viewer.IFC.setWasmPath('../../../');
ClippingEdges.createDefaultIfcStyles = false;
viewer.dxf.initializeJSDXF(Drawing);

const input = document.getElementById('file-input');
let model;

input.addEventListener('change',

    async (changed) => {

        const file = changed.target.files[0];
        const ifcURL = URL.createObjectURL(file);
        model = await viewer.IFC.loadIfcUrl(ifcURL);
        await viewer.shadowDropper.renderShadow(0);
    },

    false,
);

// Now, let's define the categories that we want to draw
const clippingMaterial = new LineMaterial();
const sectionedCategories = [
    {
        name: "windows_section",
        style: 'CONTINUOUS',
        color: Drawing.ACI.BLUE,
        value: [IFCWINDOW, IFCPLATE, IFCMEMBER],
        stringValue: ["IFCWINDOW", "IFCPLATE", "IFCMEMBER"],
        material: clippingMaterial
    },
    {
        name: "walls_section",
        style: 'CONTINUOUS',
        color: Drawing.ACI.RED,
        value: [IFCWALL, IFCWALLSTANDARDCASE],
        stringValue: ["IFCWALL", "IFCWALLSTANDARDCASE"],
        material: clippingMaterial
    },
    {
        name: "floors_section",
        style: 'CONTINUOUS',
        color: Drawing.ACI.RED,
        value: [IFCSLAB],
        stringValue: ["IFCSLAB"],
        material: clippingMaterial
    },
    {
        name: "doors_section",
        style: 'CONTINUOUS',
        color: Drawing.ACI.YELLOW,
        value: [IFCDOOR],
        stringValue: ["IFCDOOR"],
        material: clippingMaterial
    },
    {
        name: "furniture_section",
        style: 'CONTINUOUS',
        color: Drawing.ACI.RED,
        value: [IFCFURNISHINGELEMENT],
        stringValue: ["IFCFURNISHINGELEMENT"],
        material: clippingMaterial
    },
    {
        name: "stairs_section",
        style: 'CONTINUOUS',
        color: Drawing.ACI.RED,
        value: [IFCSTAIR, IFCSTAIRFLIGHT],
        stringValue: ["IFCSTAIR", "IFCSTAIRFLIGHT"],
        material: clippingMaterial
    },
];

const projectedCategories = [
    {
        name: "furniture_projection",
        style: 'CONTINUOUS',
        color: Drawing.ACI.CYAN,
        value: [IFCFURNISHINGELEMENT],
        stringValue: ["IFCFURNISHINGELEMENT"],
    },
    {
        name: "general_projection",
        style: 'CONTINUOUS',
        color: Drawing.ACI.CYAN,
        value: [IFCSLAB, IFCWINDOW, IFCDOOR, IFCSTAIRFLIGHT, IFCSTAIR, IFCRAILING, IFCMEMBER],
        stringValue: ["IFCSLAB", "IFCWINDOW", "IFCDOOR", "IFCSTAIRFLIGHT", "IFCSTAIR", "IFCRAILING", "IFCMEMBER"],
    },

];


window.onkeydown = async (e) => {
    if (e.code === 'KeyP') {
        await exportAllFloors();
    }
}

const subsetMat = new MeshBasicMaterial();

async function exportAllFloors() {


    await createClippingLayers();

    await viewer.plans.computeAllPlanViews(model.modelID);

    const plans = Object.values(viewer.plans.planLists[model.modelID]);

    const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
    const storeys = ifcProject.children[0].children[0].children;
    for(let storey of storeys) {
        for (let child of storey.children ) {
            if(child.children.length) {
                storey.children.push(...child.children);
            }
        }
    }

    console.log(storeys);

    console.log(plans);

    for (let plan of plans) {
        // Create a new drawing (if it doesn't exist)
        if (!viewer.dxf.drawings[plan.name]) viewer.dxf.newDrawing(plan.name);

        const storey = storeys.find(storey => storey.expressID === plan.expressID);

        // Draw all projected layers
        for (let category of projectedCategories) {

            // Get the IDs of all the items to draw
            const ids = storey.children
                .filter(child => category.stringValue.includes(child.type))
                .map(child => child.expressID);

            // If no items to draw in this layer in this floor plan, let's continue
            if (!ids.length) {
                continue;
            }

            // If there are items, extract its geometry
            const subset = viewer.IFC.loader.ifcManager.createSubset({
                modelID: model.modelID,
                ids,
                removePrevious: true,
                customID: "floor_plan_generation",
                material: subsetMat
            });

            // Get the projection of the items in this floor plan
            const filteredPoints = [];
            const edges = await viewer.edgesProjector.projectEdges(subset);
            const positions = edges.geometry.attributes.position.array;


            // Lines shorter than this won't be rendered
            // https://stackoverflow.com/a/20916980/14627620

            const tolerance = 0.01;
            for (let i = 0; i < positions.length - 5; i += 6) {

                const a = positions[i] - positions[i + 3];
                // Z coords are multiplied by -1 to match DXF Y coordinate
                const b = -positions[i + 2] + positions[i + 5];

                const distance = Math.sqrt(a * a + b * b);

                if (distance > tolerance) {
                    filteredPoints.push([positions[i], -positions[i + 2], positions[i + 3], -positions[i + 5]]);
                }

            }

            // Draw the projection of the items
            viewer.dxf.drawEdges(plan.name, filteredPoints, category.name, category.color, category.style);

            // Clean up
            edges.geometry.dispose();

        }

        // Draw all sectioned items
        for (let category of sectionedCategories) {
            viewer.dxf.drawNamedLayer(plan.name, plan, category.name, category.name, category.color, category.style);
        }

        const result = viewer.dxf.exportDXF(plan.name);
        const link = document.createElement('a');
        link.download = "floorplan.dxf";
        link.href = URL.createObjectURL(result);
        document.body.appendChild(link);
        link.click();
        link.remove();

    }

}

async function createClippingLayers() {
    for (let category of sectionedCategories) {
        await ClippingEdges.newStyle(category.name, category.value, category.material);
    }
}


