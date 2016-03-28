var scene, camera, renderer, world, hands, cubes, timestep = 1/60;

var ballGeometry = new THREE.SphereGeometry(4,32,32);
var cubeGeometry = new THREE.BoxGeometry(25,25,25);
var handBodies = [], ballShape = new CANNON.Sphere(4);
var cubeBodies = [], cubeShape = new CANNON.Box(new CANNON.Vec3(12.5,12.5,12.5));
var material = new THREE.MeshPhongMaterial({
	color: 0x156289,
	emissive: 0x072534,
	side: THREE.DoubleSide,
	shading: THREE.FlatShading
});

function init () {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 60, window.innerWidth/window.innerHeight, 0.1, 1000 );
	renderer = new THREE.WebGLRenderer( {
		alpha: true,
		antialias: true
	} );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	world = new CANNON.World();
	world.gravity.set(0, -100, 0);

	camera.position.set(0,250,300);
	camera.lookAt(new THREE.Vector3(0,250,0));

	hands = new THREE.Object3D();
	cubes = new THREE.Object3D();
	scene.add(hands, cubes);

	for (var i = 0; i < 5; i++) hands.add(new THREE.Mesh(ballGeometry, material));
	for (var i = 0; i < 5; i++) handBodies.push(new CANNON.Body({mass: 0,shape: ballShape}));
	for (var i = handBodies.length - 1; i >= 0; i--) world.add(handBodies[i]);

	var floorBody = new CANNON.Body({
		mass: 0,
		shape: new CANNON.Plane()
	});
	floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
	floorBody.position.set(0,100,0);
	world.add(floorBody);
	var floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(500,500), material);
	floorMesh.position.copy(floorBody.position);
	floorMesh.quaternion.copy(floorBody.quaternion);
	scene.add(floorMesh);

	var lights = [];
	lights.push(new THREE.HemisphereLight(0xffffbb, 0x080820, 1));
	scene.add(lights[0]);

	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.load('models/bird.mtl', function (mtl) {
		console.log(mtl);
		mtl.preload();
		var objLoader = new THREE.OBJLoader();
		objLoader.setMaterials(mtl);
		objLoader.load('models/bird.obj', function (obj) {
			obj.position.set(0,250,250);
			scene.add(obj);
		});
	});
}

var render = function () {
	requestAnimationFrame( render );
	renderer.render(scene, camera);
	world.step(timestep);
	for (var i = handBodies.length - 1; i >= 0; i--) handBodies[i].position.copy(hands.children[i].position);
	for (var i = cubeBodies.length - 1; i >= 0; i--) {
		cubes.children[i].position.copy(cubeBodies[i].position);
		cubes.children[i].quaternion.copy(cubeBodies[i].quaternion);
	}
};

init();
render();

var isGrab = false;
var soSmall = 0.01;
var currentCube;
Leap.loop(function (frame) {
	if (frame.hands.length) {
		var hand = frame.hands[0];
		for (var i = hand.fingers.length - 1; i >= 0; i--) {
			var dip = hand.fingers[i].dipPosition;
			hands.children[i].position.fromArray(dip);
		}
		// console.log(hand.grabStrength, hand.pinchStrength);
		if (hand.grabStrength === 1 && !isGrab) {
			isGrab = true;
			cubes.add(new THREE.Mesh(cubeGeometry, material));
			currentCube = cubes.children[cubes.children.length - 1];
			currentCube.position.fromArray(hand.palmPosition);
			currentCube.scale.set(soSmall,soSmall,soSmall);
		}
		if (hand.grabStrength < 1 && isGrab) {
			var scale = (1 - hand.grabStrength) ? 1 - hand.grabStrength : soSmall;
			currentCube.scale.set(scale,scale,scale);
		}
		if (hand.grabStrength === 0 && isGrab) {
			isGrab = false;
			cubeBodies.push(new CANNON.Body({
				mass: 1,
				shape: cubeShape,
				position: currentCube.position
			}));
			world.add(cubeBodies[cubeBodies.length - 1]);
		}
	}
});
