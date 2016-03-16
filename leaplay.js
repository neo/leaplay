var scene, camera, renderer, world, hands, cubes;

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
	world.gravity.set(0, -10, 0);

	camera.position.set(0,250,300);
	camera.lookAt(new THREE.Vector3(0,250,0));

	hands = new THREE.Object3D();
	cubes = new THREE.Object3D();
	scene.add(hands, cubes);

	for (var i = 0; i < 5; i++) hands.add(new THREE.Mesh(ballGeometry, material));
}

var material = new THREE.MeshNormalMaterial();
var ballGeometry = new THREE.SphereGeometry(4,32,32);
var cubeGeometry = new THREE.BoxGeometry(25,25,25);

var render = function () {
	requestAnimationFrame( render );
	renderer.render(scene, camera);
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
		if (hand.grabStrength === 0 && isGrab) isGrab = false;
	}
});
