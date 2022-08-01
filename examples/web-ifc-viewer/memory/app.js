import { IfcViewerAPI } from 'web-ifc-viewer';
import Stats from 'stats.js/src/Stats';

const container = document.getElementById('viewer-container');
let viewer = new IfcViewerAPI({ container });

//memory visualization
const stats = new Stats();
addStats();
function addStats() {
    stats.showPanel(2);
    document.body.append(stats.dom);
    viewer.context.stats = stats;
};

//release function
function releaseMemory() {
    viewer.dispose();
    viewer = null;
    viewer = new IfcViewerAPI({ container });
    viewer.IFC.setWasmPath('../../../');
    addStats();
    // if multiple models are stored in an array, reset.
    // models.length = 0;
}

//attach to button
const release_button = document.getElementById('release-button');
release_button.addEventListener('click', () => releaseMemory());

//load file from input file function
async function loadIfcFromFile(file) {
    const model = await viewer.IFC.loadIfc(file, true);
    viewer.shadowDropper.renderShadow(model.modelID);
}

//attach to button
const input_button = document.getElementById('input-button');
input_button.addEventListener('input',
    (input) => { loadIfcFromFile(input.target.files[0]) },
    false
);

//inital model load from url
async function loadIfcUrl(url) {
    await viewer.IFC.setWasmPath("../../../");
    const model = await viewer.IFC.loadIfcUrl(url, true);
    viewer.shadowDropper.renderShadow(model.modelID);
}
loadIfcUrl('../../../IFC/01.ifc');

//just so we can reload the same model over and over
input_button.addEventListener(
    'click', (e) => {e.target.value = ''}
)