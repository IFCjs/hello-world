import '@widgetjs/tree/dist/tree.js';
import { IfcViewerAPI } from 'web-ifc-viewer';
import {
  IFCSPACE, IFCOPENINGELEMENT, IFCWALLSTANDARDCASE, IFCWALL, IFCWINDOW, IFCCURTAINWALL, IFCMEMBER, IFCPLATE
} from 'web-ifc';
import { Color } from 'three';

// Example of data format for @widgetjs/tree
var treeData = [
  {
    id: '0',
    text: 'node-0',
    children: [
      {
        id: '0-0',
        text: 'node-0-0',
        children: [
          {id: '0-0-0', text: 'node-0-0-0'},
          {id: '0-0-1', text: 'node-0-0-1'},
          {id: '0-0-2', text: 'node-0-0-2'},
        ],
      },
      {id: '0-1', text: 'node-0-1'},
    ],
  },
  {
    id: '1',
    text: 'node-1',
    children: [{id: '1-0', text: 'node-1-0'}, {id: '1-1', text: 'node-1-1'}],
  },
];




// Create the tree with data from above example
// Set treeData = [] if you don't want that part
const myTree = new Tree('#container', {
  data: treeData,
});

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container, backgroundColor: new Color(255, 255, 255) });
viewer.axes.setAxes();
viewer.grid.setGrid();
viewer.shadowDropper.darkness = 1.5;



viewer.IFC.loader.ifcManager.applyWebIfcConfig({
  USE_FAST_BOOLS: true,
  COORDINATE_TO_ORIGIN: true
});

viewer.IFC.setWasmPath('../../../');

// Setup loader
let model;


var modelLoaded = null;

// Start with the base node and call addNodes recursivly to fill the tree data
const addAndViewNodes = (value) => {
  treeData = [  {
    id: value.expressID,
    text: value.type,
    children: addNodes(value.children)
  }
  ];
  presentNodes(treeData);
}

// Recursirve populate the tree data from ifc structure.
function addNodes(value) {
  var newTreeData = [ ];
  for (var i=0; i<value.length; i++)
  {
    newTreeData.push({
      id: value[i].expressID,
      text: value[i].type,
      children: addNodes(value[i].children),
      check: true
    })
  }
  return newTreeData;
}

var treejs = null;
// Update the tree container with data
function presentNodes(treeData) {
  const myTree = new Tree('#container', {
    data: treeData,
  });

  treejs = myTree;
}

// Get the selected ids of the tree.
function getSelectedIds(tree) {
  return treejs.values;
}

// Update view from selection.
const updateButton = document.getElementById('btnUpdate');
updateButton.addEventListener('click', async () => {
  if (modelLoaded != null) {
    var selected = getSelectedIds(treejs);
    
    // IFC.selector want a list of ints and not list of strings
    var selectedInts = [];
    for (var i = 0; i < selected.length; i++)
        selectedInts.push(parseInt(selected[i]));

    await viewer.IFC.selector.highlightIfcItemsByID(modelLoaded.modelID,selectedInts,false,true);
  }
});

// Load selected ifc file.
const loadIfc = async (event) => {

  viewer.IFC.loader.ifcManager.parser.setupOptionalCategories({
    [IFCSPACE]: false,
    [IFCOPENINGELEMENT]: false
  });

  model = await viewer.IFC.loadIfc(event.target.files[0], false);
  model.material.forEach(mat => mat.side = 2);

  modelLoaded = model;

  await viewer.IFC.selector.highlightIfcItemsByID(modelLoaded.modelID,[],false,true);

  const structure = viewer.IFC.getSpatialStructure(model.modelID);
  structure.then((value) => addAndViewNodes(value));
};

// Input from file selector
const inputElement = document.createElement('input');
inputElement.setAttribute('type', 'file');
inputElement.classList.add('hidden');
inputElement.addEventListener('change', loadIfc, false);

const loadButton = document.getElementById('btnSelect');
loadButton.addEventListener('click', () => {
  loadButton.blur();
  inputElement.click();
});
