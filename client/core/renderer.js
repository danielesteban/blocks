import {
  Clock,
  PerspectiveCamera,
  ShaderChunk,
  sRGBEncoding,
  WebGLRenderer,
} from './three.js';

class Renderer {
  constructor({
    debug,
    mount,
  }) {
    // Initialize state
    this.clock = new Clock();
    this.fps = {
      count: 0,
      lastTick: this.clock.oldTime / 1000,
    };
    this.debug = debug;
    this.mount = mount;

    // Setup camera
    this.camera = new PerspectiveCamera(90, 1, 0.1, 1000);
    this.camera.position.y = 1.6;

    // Setup renderer
    {
      const canvas = document.createElement('canvas');
      this.renderer = new WebGLRenderer({
        canvas,
        context: canvas.getContext('webgl2', { antialias: true, xrCompatible: true }),
      });
    }
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.gammaFactor = 2.2;
    // this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setAnimationLoop(this.onAnimationTick.bind(this));
    this.mount.appendChild(this.renderer.domElement);

    // Setup viewport resize
    window.addEventListener('resize', this.onResize.bind(this), false);
    this.onResize();

    // Setup VR
    if (navigator.xr) {
      const { xr } = this.renderer;
      xr.enabled = true;
      mount.addEventListener('mousedown', () => {
        if (xr.isPresenting) return;
        navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'bounded-floor'],
        })
          .then((session) => {
            xr.setSession(session);
            session.addEventListener('end', () => {
              xr.setSession(null);
            });
          });
      }, false);
      debug.support.className = 'supported';
      debug.support.innerText = 'webxr is supported';
    } else {
      debug.support.className = 'unsupported';
      debug.support.innerText = 'webxr is not supported';
    }
  }

  onAnimationTick() {
    const {
      camera,
      clock,
      debug,
      fps,
      renderer,
      scene,
    } = this;

    // Store the frame timings into the renderer
    // So that they are accesible from onBeforeRender
    renderer.animation = {
      delta: Math.min(clock.getDelta(), 1 / 30),
      time: clock.oldTime / 1000,
    };

    // Render scene
    if (scene) {
      renderer.render(scene, camera);
    }

    // Output debug info
    fps.count += 1;
    if (renderer.animation.time >= fps.lastTick + 1) {
      renderer.fps = Math.round(fps.count / (renderer.animation.time - fps.lastTick));
      fps.lastTick = renderer.animation.time;
      fps.count = 0;
      if (!renderer.xr.isPresenting) {
        debug.fps.innerText = `${renderer.fps}fps`;
      }
    }
  }

  onResize() {
    const {
      camera,
      mount,
      renderer,
    } = this;

    // Resize viewport
    const { width, height } = mount.getBoundingClientRect();
    if (renderer.xr.isPresenting) {
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;
    } else {
      renderer.setSize(width, height);
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  loadScene(Scene) {
    if (this.scene) {
      this.scene.dispose();
      delete this.scene;
    }
    this.scene = new Scene(this);
  }
}

// Tweak ThreeJS Fog
ShaderChunk.fog_vertex = ShaderChunk.fog_vertex.replace(
  'fogDepth = -mvPosition.z;',
  'fogDepth = length(mvPosition);'
);

export default Renderer;
