/**

 */

const canvasSketch = require('canvas-sketch');
const THREE = require('three');
const glslify = require('glslify');

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
    varying vec2 vUv;
    uniform float playhead;
    uniform float opacity;
    void main () {
      float y = mod(playhead, 1.0);
      float sat = 1.0;
      float light = 0.5;
      vec3 color = hsl2rgb(y, sat, light);
      gl_FragColor = vec4(color, opacity);
    }
  `);

  const vertexShader = glslify(/* glsl */ `
  #pragma glslify: cnoise3 = require(glsl-noise/classic/3d) 
    varying vec2 vUv;
    uniform float playhead;
    void main () {
      vUv = uv;
      vec3 pos = position.xyz;
      pos += normal * cnoise3(normal * sin(playhead * 3.14 * 2.0) * 1.2) * 0.2;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `);

  const meshList = [];
  const geom = new THREE.SphereGeometry(1, 64, 64);
  for (let i = 0; i < 80; i++) {
    const perc = 1 - i / 80;
    const m = new THREE.Mesh(
      geom,
      new THREE.ShaderMaterial({
        fragmentShader,
        vertexShader,
        uniforms: {
          playhead: { type: 'f', value: perc },
          opacity: { type: 'f', value: perc * 0.08 }
        }
      })
    );
    m.material.transparent = true;
    m.material.depthWrite = false;
    m.material.depthTest = false;
    scene.add(m);
    meshList.push(m);
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
      meshList.forEach((m, i) => {
        if (m.scale.x === 1) {
          m.scale.set(
            0.01 + (i / meshList.length) * 1.5,
            0.01 + (i / meshList.length) * 1.5,
            0.01 + (i / meshList.length) * 1.5
          );
        }

        m.position.x = Math.sin((playhead + (i / meshList.length) * 0.5) * Math.PI * 2) * 0.4;
        m.position.y = Math.cos((playhead + (i / meshList.length) * 0.5) * Math.PI * 2) * 0.4;
        m.position.z = Math.sin((playhead + (i / meshList.length) * 0.5) * Math.PI * 2) * 0.4;

        m.material.uniforms.playhead.value = playhead + i / meshList.length;
      });

      renderer.render(scene, camera);
    }, // Dispose of events & renderer for cleaner hot-reloading
    unload() {
      renderer.dispose();
    }
  };
};

canvasSketch(sketch, settings);
