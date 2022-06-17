import { Matrix4, Vector3,
  DirectionalLight, AmbientLight,
  PerspectiveCamera,
  Scene, WebGLRenderer,
} from "three";
import { IFCLoader } from "web-ifc-three/IFCLoader";  

//mapboxgl.accessToken = 'YOUR_API_KEY'
//this API key is restricted to this github repo. Make a free account to get your own: https://account.mapbox.com/auth/signup/
mapboxgl.accessToken = 'pk.eyJ1IjoiaWZjbWFwYm94IiwiYSI6ImNsNDBlbW52dTBjNHMzY3F0djJkM3lyb3kifQ.oZ2hjiBIxjhNC3UnqIK8dg';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  zoom: 20.5,
  center: [13.4453, 52.4910],
  pitch: 75,
  bearing: -80,
  antialias: true
});

const modelOrigin = [13.4453, 52.4910];
const modelAltitude = 0;
const modelRotate = [Math.PI / 2, .72, 0];
 
const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(modelOrigin, modelAltitude);
 
const modelTransform = {
  translateX: modelAsMercatorCoordinate.x,
  translateY: modelAsMercatorCoordinate.y,
  translateZ: modelAsMercatorCoordinate.z,
  rotateX: modelRotate[0],
  rotateY: modelRotate[1],
  rotateZ: modelRotate[2],
  scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
};
 
const scene = new Scene();
const camera = new PerspectiveCamera();
const renderer = new WebGLRenderer({
  canvas: map.getCanvas(),
  antialias: true,
});
renderer.autoClear = false;

const customLayer = {

  id: '3d-model',
  type: 'custom',
  renderingMode: '3d',

  onAdd: function () {
    const ifcLoader = new IFCLoader();
    ifcLoader.ifcManager.setWasmPath( '../../../' );
    ifcLoader.load( '../../../IFC/01.ifc', function ( model ) {
      scene.add( model );
    });

    const directionalLight = new DirectionalLight(0x404040);
    const directionalLight2 = new DirectionalLight(0x404040);
    const ambientLight = new AmbientLight( 0x404040, 3 ); 

    directionalLight.position.set(0, -70, 100).normalize();
    directionalLight2.position.set(0, 70, 100).normalize();

    scene.add(directionalLight, directionalLight2, ambientLight);
},

  render: function (gl, matrix) {
    const rotationX = new Matrix4().makeRotationAxis(
    new Vector3(1, 0, 0), modelTransform.rotateX);
    const rotationY = new Matrix4().makeRotationAxis(
    new Vector3(0, 1, 0), modelTransform.rotateY);
    const rotationZ = new Matrix4().makeRotationAxis(
    new Vector3(0, 0, 1), modelTransform.rotateZ);
  
    const m = new Matrix4().fromArray(matrix);
    const l = new Matrix4()
    .makeTranslation(
    modelTransform.translateX,
    modelTransform.translateY,
    modelTransform.translateZ
    )
    .scale(
    new Vector3(
    modelTransform.scale,
    -modelTransform.scale,
    modelTransform.scale)
    )
    .multiply(rotationX)
    .multiply(rotationY)
    .multiply(rotationZ);
    
    camera.projectionMatrix = m.multiply(l);
    renderer.resetState();
    renderer.render(scene, camera);
    map.triggerRepaint();
  }
};
 
map.on('style.load', () => {
  map.addLayer(customLayer, 'waterway-label');
});
