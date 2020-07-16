import {
  BackSide,
  Color,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Object3D,
  PerspectiveCamera,
  PlaneBufferGeometry,
  sRGBEncoding,
  WebGLMultisampleRenderTarget,
} from '../core/three.js';
import UI from './ui.js';

// A photo frame mesh

class Photo extends Object3D {
  static setupBackplateMaterial() {
    Photo.backplateMaterial = new MeshBasicMaterial({
      color: (new Color(0x222222)).convertSRGBToLinear(),
      side: BackSide,
    });
  }

  static setupGeometry() {
    Photo.geometry = new PlaneBufferGeometry(1, 1, 1, 1);
  }

  constructor({
    player,
    renderer,
    width = 1280,
    height = 720,
  } = {}) {
    if (!Photo.backplateMaterial) {
      Photo.setupBackplateMaterial();
    }
    if (!Photo.geometry) {
      Photo.setupGeometry();
    }
    super();
    this.player = player;
    this.rasterizer = document.createElement('canvas');
    this.renderer = renderer;
    this.camera = new PerspectiveCamera(70, width / height, 0.1, 1000);
    this.target = new WebGLMultisampleRenderTarget(width, height, {
      encoding: sRGBEncoding,
      magFilter: NearestFilter,
      minFilter: NearestFilter,
    });
    this.frame = new Mesh(
      Photo.geometry,
      new MeshBasicMaterial({
        map: this.target.texture,
      })
    );
    this.frame.matrixAutoUpdate = false;
    this.frame.scale.set(0.5, (height * 0.5) / width, 1);
    this.frame.updateMatrix();
    this.add(this.frame);
    const backplate = new Mesh(
      Photo.geometry,
      Photo.backplateMaterial
    );
    backplate.matrixAutoUpdate = false;
    this.frame.add(backplate);
    this.ui = new UI({
      width: 0.15,
      height: 0.0375,
      page: 0,
      styles: {
        background: 'transparent',
        font: '700 24px monospace',
      },
      pages: [
        {
          buttons: [
            {
              background: '#393',
              label: 'Login to save',
              x: 0,
              y: 0,
              width: 192,
              height: 48,
              onPointer: () => {
                this.visible = false;
                renderer.xr.getSession().end();
                this.player.session.showDialog('login');
              },
            },
          ],
        },
        {},
        {
          buttons: [
            {
              label: 'X',
              x: 0,
              y: 0,
              width: 96,
              height: 48,
              onPointer: () => {
                this.visible = false;
              },
            },
            {
              background: '#393',
              label: 'Save',
              x: 96,
              y: 0,
              width: 96,
              height: 48,
              onPointer: () => {
                if (
                  this.player.session.server
                  && this.player.session.session
                ) {
                  this.save();
                }
              },
            },
          ],
        },
      ],
      textureWidth: 192,
      textureHeight: 48,
    });
    this.ui.position.set(0, this.frame.scale.y * -0.5 + 0.02, 0.001);
    this.ui.updateMatrix();
    this.add(this.ui);
    this.matrixAutoUpdate = false;
    this.position.set(0.25, -0.01, 0.025);
    this.rotation.set(Math.PI * -0.5, 0, 0);
    this.updateMatrix();
    this.visible = false;
  }

  dispose() {
    const { frame, target, ui } = this;
    frame.material.dispose();
    target.dispose();
    ui.dispose();
  }

  update(scene) {
    const {
      camera,
      matrixWorld,
      player,
      renderer,
      target,
      ui,
    } = this;
    matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
    target.position = {
      x: Math.floor(player.head.position.x / 0.5),
      y: Math.floor(player.position.y / 0.5),
      z: Math.floor(player.head.position.z / 0.5),
    };
    target.rotation = player.head.rotation.y;
    this.visible = false;
    player.controllers.forEach((controller) => {
      controller.visible = false;
    });
    const xrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.xr.enabled = xrEnabled;
    player.controllers.forEach((controller) => {
      controller.visible = true;
    });
    let page = 2;
    if (!player.session.session) {
      page = 0;
    } else if (!player.session.server) {
      page = 1;
    }
    ui.setPage(page);
    this.visible = true;
  }

  save() {
    const {
      player,
      rasterizer,
      renderer,
      target,
    } = this;
    const pixels = new Uint8ClampedArray(target.width * target.height * 4);
    renderer.readRenderTargetPixels(
      target,
      0,
      0,
      target.width,
      target.height,
      pixels
    );
    createImageBitmap(new ImageData(pixels, target.width, target.height))
      .then((bitmap) => {
        rasterizer.width = target.width;
        rasterizer.height = target.height;
        const ctx = rasterizer.getContext('2d');
        ctx.scale(1, -1);
        ctx.drawImage(bitmap, 0, target.height * -1);
        rasterizer.toBlob((blob) => (
          player.session.uploadLocation({
            blob,
            position: target.position,
            rotation: target.rotation,
          })
        ), 'image/jpeg', 0.9);
      });
    this.visible = false;
  }
}

export default Photo;
