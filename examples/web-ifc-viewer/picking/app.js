import { IfcViewerAPI } from 'web-ifc-viewer';

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container});

async function loadIfc(url) {
    await viewer.IFC.setWasmPath("../../../");
    const model = await viewer.IFC.loadIfcUrl(url);
    viewer.shadowDropper.renderShadow(model.modelID);
}
loadIfc('../../../IFC/01.ifc');

window.onmousemove = () => viewer.IFC.selector.prePickIfcItem(true);

window.onclick = async () => {
    const {modelID, id} = await viewer.IFC.selector.pickIfcItem(true);
    const props = await viewer.IFC.getProperties(modelID, id, true, false);
    console.log(props);
}

window.ondblclick = () => viewer.IFC.selector.highlightIfcItem();

window.onkeydown = (event) => {
    if(event.code === 'KeyC') {
        viewer.IFC.selector.unpickIfcItems();
        viewer.IFC.selector.unHighlightIfcItems();
    }
}

document.getElementById('express_22492')
.addEventListener('click', () => {
    viewer.IFC.selector.pickIfcItemsByID(0, [22492], true);
})