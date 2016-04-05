var scene, camera, renderer, world, hands, birds, timestep = 1/60;

var bird, wall, panda;
var ballGeometry = new THREE.SphereGeometry(4,32,32);
var handBodies = [], ballShape = new CANNON.Sphere(4);
var birdBodies = [], birdShape = new CANNON.Sphere(10);
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
	birds = new THREE.Object3D();
	scene.add(hands, birds);

	for (var i = 0; i < 10; i++) {
		var dip = new THREE.Mesh(ballGeometry, material);
		dip.castShadow = true;
		hands.add(dip);
	}
	for (var i = 0; i < 10; i++) handBodies.push(new CANNON.Body({mass: 0,shape: ballShape}));
	for (var i = handBodies.length - 1; i >= 0; i--) world.add(handBodies[i]);

	var floorBody = new CANNON.Body({
		mass: 0,
		shape: new CANNON.Plane()
	});
	floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
	floorBody.position.set(0,100,0);
	world.add(floorBody);
	var floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(500,500), material);
	floorMesh.receiveShadow = true;
	floorMesh.position.copy(floorBody.position);
	floorMesh.quaternion.copy(floorBody.quaternion);
	scene.add(floorMesh);

	var sky = new THREE.TextureLoader().load('sky.jpg');
	wall = new THREE.Mesh(new THREE.SphereGeometry(500,32,32), new THREE.MeshBasicMaterial({
		map: sky,
		side: THREE.DoubleSide
	}));
	wall.position.y = 400;
	scene.add(wall);

	var lights = [];
	lights.push(new THREE.HemisphereLight(0xffffff, 0x424242, 1));
	lights.push(new THREE.PointLight(0xffffff, 0.5, 0));
	lights[1].position.y = 500;
	lights[1].castShadow = true;
	lights[1].shadow.mapSize = new THREE.Vector2(2048, 2048);
	for (var i = lights.length - 1; i >= 0; i--) scene.add(lights[i]);

	renderer.shadowMap.enabled = true;
	renderer.shadowMapSoft = true;

	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.load('models/bird.mtl', function (mtl) {
		mtl.preload();
		var objLoader = new THREE.OBJLoader();
		objLoader.setMaterials(mtl);
		objLoader.load('models/bird.obj', function (obj) {
			obj.children.forEach(function (child) {child.castShadow = true;});
			bird = obj;
		});
	});
	mtlLoader.load('models/panda.mtl', function (mtl) {
		mtl.preload();
		var objLoader = new THREE.OBJLoader();
		objLoader.setMaterials(mtl);
		objLoader.load('models/panda.obj', function (obj) {
			obj.children.forEach(function (child) {child.castShadow = true;});
			panda = obj;
		});
	});
}

var render = function () {
	requestAnimationFrame( render );
	renderer.render(scene, camera);
	world.step(timestep);
	for (var i = handBodies.length - 1; i >= 0; i--) handBodies[i].position.copy(hands.children[i].position);
	for (var i = birdBodies.length - 1; i >= 0; i--) {
		birds.children[i].position.copy(birdBodies[i].position);
		birds.children[i].quaternion.copy(birdBodies[i].quaternion);
	}
	wall.rotation.y += 0.0002;
};

init();
render();

var gravity = document.querySelector('#switch');

var isHandsPinch = false;
var isGrab = [false, false];
var soSmall = 0.01;
var currentBirds = [];
Leap.loop(function (frame) {
	if (frame.hands.length) {
		for (var i = frame.hands.length - 1; i >= 0; i--) {
			for (var j = frame.hands[i].fingers.length - 1; j >= 0; j--) {
				var dip = frame.hands[i].fingers[j].dipPosition;
				hands.children[5 * i + j].position.fromArray(dip);
			}
		}
		// console.log(hand.grabStrength, hand.pinchStrength);
		frame.hands.forEach(function (hand) {
			if (hand.grabStrength === 1 && !isGrab[frame.hands.indexOf(hand)]) {
				isGrab[frame.hands.indexOf(hand)] = true;
				birds.add((Math.random() < 0.2) ? panda.clone() : bird.clone());
				currentBirds[frame.hands.indexOf(hand)] = birds.children[birds.children.length - 1];
				currentBirds[frame.hands.indexOf(hand)].position.fromArray(hand.palmPosition);
				currentBirds[frame.hands.indexOf(hand)].scale.set(soSmall,soSmall,soSmall);
			}
			if (hand.grabStrength < 1 && isGrab[frame.hands.indexOf(hand)]) {
				var scale = (1 - hand.grabStrength) ? 1 - hand.grabStrength : soSmall;
				currentBirds[frame.hands.indexOf(hand)].scale.set(scale,scale,scale);
			}
			if (hand.grabStrength === 0 && isGrab[frame.hands.indexOf(hand)]) {
				isGrab[frame.hands.indexOf(hand)] = false;
				var v = new THREE.Vector3();
				var ary = hand.palmVelocity.map(function (v) {
					return v / 10;
				})
				v.fromArray(ary);
				birdBodies.push(new CANNON.Body({
					mass: 1,
					shape: birdShape,
					position: currentBirds[frame.hands.indexOf(hand)].position,
					velocity: v
				}));
				world.add(birdBodies[birdBodies.length - 1]);
			}
		});
		if (!isHandsPinch && frame.hands.length === 2 && frame.hands[0].pinchStrength === 1 && frame.hands[1].pinchStrength === 1) {
			isHandsPinch = true;
		}
		else if (isHandsPinch && frame.hands.length === 2 && frame.hands[0].pinchStrength === 0 && frame.hands[1].pinchStrength === 0) {
			if (world.gravity.y) {
				world.gravity.y = 0;
				gravity.textContent = 'OFF';
			} else {
				world.gravity.y = -100;
				gravity.textContent = 'ON';
			}
			isHandsPinch = false;
		}
	}
});
