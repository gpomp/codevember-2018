/**

 */

const canvasSketch = require('canvas-sketch');
const THREE = require('three');
const glslify = require('glslify');
const sineInOut = require('eases').sineInOut;
const expoInOut = require('eases').expoInOut;
const smoothstep = require('smoothstep');

const settings = {
  dimensions: [512, 512],
  // Make the loop animated
  animate: true,
  // Get a WebGL canvas rather than 2D
  context: 'webgl',
  // Loop itme in seconds
  duration: 7,
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
  camera.updateProjectionMatrix();

  const fragmentShader = glslify(/* glsl */ `
    varying vec2 vUv;
    uniform float time;
    uniform vec2 resolution;
    void main () {
      gl_FragColor = vec4(vec3(vUv, 0.5), 1.0);
    }
  `);

  const vertexShader = glslify(/* glsl */ `
    varying vec2 vUv;
    void main () {
      vUv = uv;
      vec3 pos = position.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `);

  // Setup your scene
  const scene = new THREE.Scene();
  const c = new THREE.BoxBufferGeometry(1, 1, 1, 1, 1);
  const v = new THREE.Vector3();
  const vTemp = new THREE.Vector3();
  const cubeList = [];

  const cubeGroup = new THREE.Object3D();
  scene.add(cubeGroup);
  cubeGroup.extra = { rZ: Math.PI * 2 + Math.PI * 4 * Math.random() };

  function toScreenPosition(vector, obj) {
    vTemp.copy(vector);
    vTemp.applyMatrix4(obj.matrixWorld);
    vTemp.project(camera);

    vTemp.x = vTemp.x + 1 * 0.5;
    vTemp.y = vTemp.y + 1 * 0.5;

    return { x: vTemp.x, y: vTemp.y };
  }

  function buildScene() {
    for (let i = 0; i < 90; i++) {
      const cube = new THREE.Mesh(
        c.clone(),
        new THREE.ShaderMaterial({
          fragmentShader,
          vertexShader,
          uniforms: {
            playhead: { type: 'f', value: 0 },
            time: { type: 'f', value: 0 },
            resolution: { type: 'v2', value: new THREE.Vector2(512, 512) }
          },
          depthWrite: false,
          depthTest: false
        })
      );

      cubeGroup.add(cube);
      cubeList.push(cube);

      cube.position.x = Math.cos(Math.PI * 2 * Math.random()) * Math.random() * 2.5;
      cube.position.y = Math.sin(Math.PI * 2 * Math.random()) * Math.random() * 2.5;
      cube.scale.set(
        1 + (Math.random() * 2 - 1) * 0.6,
        1 + (Math.random() * 2 - 1) * 0.6,
        1 + (Math.random() * 2 - 1) * 0.6
      );

      cube.updateMatrixWorld();

      for (let i = 0; i < cube.geometry.attributes.position.array.length; i += 3) {
        const i2 = (i / 3) * 2;
        v.set(
          cube.geometry.attributes.position.array[i + 0],
          cube.geometry.attributes.position.array[i + 1],
          cube.geometry.attributes.position.array[i + 2]
        );
        const xy = toScreenPosition(v, cube);
        cube.geometry.attributes.uv.array[i2 + 0] = xy.x;
        cube.geometry.attributes.uv.array[i2 + 1] = xy.y;
      }
      cube.geometry.attributes.uv.needsUpdate = true;
      cube.extra = {
        rX: Math.PI * 2 * Math.random(),
        rY: Math.PI * 2 * Math.random(),
        rZ: Math.PI * 2 * Math.random()
      };
    }
  }

  // draw each frame
  return {
    // Handle resize events here
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      if (cubeList.length === 0) {
        buildScene();
      }
    }, // Update & render your scene here
    render({ playhead, frame }) {
      cubeList.forEach((c, i) => {
        const p = Math.abs(playhead * 2 - 1);
        const sm = smoothstep(0.0, 0.7, (Math.abs(playhead * 2 - 1) + (i / cubeList.length) * p) * 0.5);
        const perc = expoInOut(1 - sm);
        c.material.uniforms.time.value = frame;
        c.position.z = perc * 5;
        c.rotation.x = perc * c.extra.rX;
        c.rotation.y = perc * c.extra.rY;
        c.rotation.z = perc * c.extra.rZ;
      });

      /* const p = Math.abs(playhead * 2 - 1);
      const sm = smoothstep(0.0, 0.45, Math.abs(playhead * 2 - 1) * 0.5);
      const perc = expoInOut(1 - sm); */
      // cubeGroup.rotation.z = perc * cubeGroup.extra.rZ;

      renderer.render(scene, camera);
    }, // Dispose of events & renderer for cleaner hot-reloading
    unload() {
      renderer.dispose();
    }
  };
};

canvasSketch(sketch, settings);
