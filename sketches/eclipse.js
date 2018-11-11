/**
 * An example of a rotating rainbow sphere, using Nadieh Bremer's
 * loop as a reference, but implemented with a custom shader.
 *
 * See here:
 * https://twitter.com/NadiehBremer/status/1058016472759496711
 *
 * @author Matt DesLauriers (@mattdesl), inspired by Nadieh Bremer's loop
 */

const canvasSketch = require('canvas-sketch');
const THREE = require('three');
const glslify = require('glslify');
const sineInOut = require('eases').sineInOut;

const settings = {
  dimensions: [512, 512],
  // Make the loop animated
  animate: true,
  // Get a WebGL canvas rather than 2D
  context: 'webgl',
  // Loop itme in seconds
  duration: 5,
  // Loop framerate
  fps: 24,
  // Visualize the above FPS in-browser
  playbackRate: 'throttle'
};

const sketch = ({ context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    context
  });

  // WebGL background color
  renderer.setClearColor('#000', 1);

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0, -4);
  camera.lookAt(new THREE.Vector3());

  // Setup your scene
  const scene = new THREE.Scene();

  const fragmentShader = glslify(/* glsl */ `
    #pragma glslify: hsl2rgb = require('glsl-hsl2rgb');
  #pragma glslify: cnoise3 = require(glsl-noise/classic/3d)
  #pragma glslify: cnoise2 = require(glsl-noise/classic/2d)
    varying vec2 vUv;
    uniform float playhead;
    uniform float opacity;
    uniform vec3 rand;
    void main () {
      float p = playhead * 3.0 * (0.03 * rand.y + rand.x * 0.06);
      float a = atan(vUv.y - 0.5, vUv.x - 0.5);
      float dist = distance(vec2(0.5, 0.5), vUv);
      float n = cnoise3(vec3(a, a, p) * (5.0 + rand.y * (1.0 + p * 3.0)));
      float n1 = cnoise3(vec3(vUv.x * 2.0 - 1.0, vUv.y * 2.0 - 1.0, playhead * 3.0) * (0.9));
      float nn1 = 0.05 * n1;
      float circle = step(0.3 - nn1, dist);
      circle *= smoothstep(0.5 - 0.2 * n - nn1, 0.3 - nn1, dist);
      
      float sat = 1.0;
      float light = 0.5 + smoothstep(0.5 - 0.4 * n, 0.3, dist) * 0.5;
      float y = mod(0.8 + p * 60.0 * abs(rand.z) * n * 0.45, 1.0);
      vec3 color = hsl2rgb(y, sat, light);
      gl_FragColor = vec4(color * circle, opacity);
    }
  `);

  const vertexShader = glslify(/* glsl */ `
  #pragma glslify: cnoise3 = require(glsl-noise/classic/3d)
    varying vec2 vUv;
    uniform float playhead;
    void main () {
      vUv = uv;
      vec3 pos = position.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `);
  const planeList = [];

  for (let i = 0; i < 20; i++) {
    const plane = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(3.3, 3.3, 1, 1),
      new THREE.ShaderMaterial({
        fragmentShader,
        vertexShader,
        side: THREE.BackSide,
        // blending: THREE.AdditiveBlending,
        uniforms: {
          playhead: { type: 'f', value: 0 },
          rand: {
            type: 'v3',
            value: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
          },
          opacity: { type: 'f', value: 0.4 }
        }
      })
    );
    plane.material.transparent = true;
    plane.material.depthWrite = false;
    plane.material.depthTest = false;
    plane.extra = {
      rotation: Math.random() * Math.PI * 0.0003
    };
    // plane.rotation.z = Math.random() * Math.PI * 2;
    scene.add(plane);
    planeList.push(plane);
  }

  // draw each frame
  return {
    // Handle resize events here
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    }, // Update & render your scene here
    render({ playhead }) {
      const pHead = sineInOut(1.0 - Math.abs(playhead * 2.0 - 1.0));
      planeList.forEach((p, i) => {
        p.material.uniforms.playhead.value = pHead;
        // p.rotation.z += p.extra.rotation;
      });
      renderer.render(scene, camera);
    }, // Dispose of events & renderer for cleaner hot-reloading
    unload() {
      renderer.dispose();
    }
  };
};

canvasSketch(sketch, settings);
