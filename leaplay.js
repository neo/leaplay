var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer( {
	alpha: true,
	antialias: true
} );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

camera.position.set(0,250,500);
camera.lookAt(new THREE.Vector3(0,250,0));

var material = new THREE.MeshNormalMaterial();

var hands = new THREE.Object3D();
scene.add(hands);

var ballGeometry = new THREE.SphereGeometry(10,32,32);
for (var i = 0; i < 5; i++) hands.add(new THREE.Mesh(ballGeometry, material));

var render = function () {
	requestAnimationFrame( render );
	renderer.render(scene, camera);
};
render();

Leap.loop(function (frame) {
	if (frame.hands.length) {
		var hand = frame.hands[0];
		for (var i = hand.fingers.length - 1; i >= 0; i--) {
			var dip = hand.fingers[i].dipPosition;
			hands.children[i].position.fromArray(dip);
		}
	}
});
