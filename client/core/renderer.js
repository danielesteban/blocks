import {
  ACESFilmicToneMapping,
  Clock,
  PerspectiveCamera,
  ShaderChunk,
  sRGBEncoding,
  WebGLRenderer,
} from './three.js';

class Renderer {
  constructor({
    dialogs,
    dom,
  }) {
    // Initialize state
    this.clock = new Clock();
    this.fps = {
      count: 0,
      lastTick: this.clock.oldTime / 1000,
    };
    this.dialogs = dialogs;
    this.dom = dom;

    // Setup camera
    this.camera = new PerspectiveCamera(70, 1, 0.1, 1000);
    this.camera.position.y = 1.6;

    // Setup renderer
    this.renderer = new WebGLRenderer({
      antialias: true,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    // this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setAnimationLoop(this.onAnimationTick.bind(this));
    dom.renderer.appendChild(this.renderer.domElement);

    // Setup viewport resize
    window.addEventListener('resize', this.onResize.bind(this), false);
    this.onResize();

    // Setup VR
    if (navigator.xr) {
      const { xr } = this.renderer;
      xr.enabled = true;
      dom.renderer.addEventListener('mousedown', () => {
        if (xr.isPresenting) return;
        navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'bounded-floor'],
        })
          .then((session) => {
            xr.setSession(session);
            session.addEventListener('end', () => {
              xr.setSession(null);
            });
          })
          .catch(() => {});
      }, false);
      dom.support.className = 'supported';
      dom.support.innerText = 'webxr is supported';
      navigator.xr.isSessionSupported('immersive-vr')
        .then((supported) => {
          if (supported) {
            dom.enterVR.style.display = '';
          }
        });
    } else {
      dom.support.className = 'unsupported';
      dom.support.innerText = 'webxr is not supported';
    }
  }

  onAnimationTick() {
    const {
      camera,
      clock,
      dom,
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
      dom.fps.innerText = `${renderer.fps}fps`;
      fps.lastTick = renderer.animation.time;
      fps.count = 0;
    }
  }

  onResize() {
    const {
      camera,
      dom,
      renderer,
    } = this;

    // Resize viewport
    const { width, height } = dom.renderer.getBoundingClientRect();
    if (renderer.xr.isPresenting) {
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;
    } else {
      renderer.setSize(width, height);
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

// Tweak ThreeJS fog + allow fog density override
ShaderChunk.fog_pars_vertex = ShaderChunk.fog_pars_vertex.replace(
  'varying float fogDepth;',
  'varying vec3 vViewPosition;'
);

ShaderChunk.fog_vertex = ShaderChunk.fog_vertex.replace(
  'fogDepth = - mvPosition.z;',
  'vViewPosition = - mvPosition.xyz;'
);

ShaderChunk.fog_pars_fragment = ShaderChunk.fog_pars_fragment.replace(
  'varying float fogDepth;',
  'varying vec3 vViewPosition;'
);

ShaderChunk.fog_fragment = ShaderChunk.fog_fragment
  .replace(
    '#ifdef USE_FOG',
    [
      '#ifdef USE_FOG',
      '  float fogDepth = length(vViewPosition);',
    ].join('\n')
  )
  .replace(
    'float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );',
    [
      '#ifdef FOG_DENSITY',
      '  float fogFactor = 1.0 - exp( - FOG_DENSITY * FOG_DENSITY * fogDepth * fogDepth );',
      '#else',
      '  float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );',
      '#endif',
    ].join('\n')
  );

export default Renderer;
