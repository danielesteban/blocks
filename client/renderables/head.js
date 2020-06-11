import {
  BoxBufferGeometry,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  sRGBEncoding,
  Texture,
} from '../core/three.js';

// Textured mesh for the player/peer head

class Head extends Mesh {
  static setupGeometry() {
    const geometry = new BoxBufferGeometry(0.3, 0.3, 0.3, 1, 1, 1);
    const uv = geometry.getAttribute('uv');
    Head.uvs.forEach((offset, face) => {
      for (let i = 0; i < 4; i += 1) {
        const o = ((face * 4) + i) * 2;
        uv.array[o] = (uv.array[o] + offset.x) * 0.25;
        uv.array[o + 1] = 1 - (((1 - uv.array[o + 1]) + offset.y) * 0.5);
      }
    });
    delete geometry.attributes.normal;
    Head.geometry = geometry;
  }

  static setupMaterials() {
    Head.materials = {
      opaque: new MeshBasicMaterial(),
      transparent: new MeshBasicMaterial({
        alphaTest: 1,
        side: DoubleSide,
        transparent: true,
      }),
    };
  }

  constructor() {
    if (!Head.geometry) {
      Head.setupGeometry();
    }
    if (!Head.materials) {
      Head.setupMaterials();
    }
    super(
      Head.geometry,
      Head.materials.opaque.clone()
    );
    this.transparentMesh = new Mesh(
      Head.geometry,
      Head.materials.transparent.clone()
    );
    this.transparentMesh.scale.multiplyScalar(1.05);
    this.add(this.transparentMesh);
  }

  dispose() {
    const {
      material,
      transparentMesh: { material: transparentMaterial },
    } = this;
    if (material.map) {
      material.map.dispose();
    }
    material.dispose();
    if (transparentMaterial.map) {
      transparentMaterial.map.dispose();
    }
    transparentMaterial.dispose();
  }

  getColor(uv) {
    const {
      context,
      layer,
      renderer,
    } = this;
    uv.x = (uv.x * 0.5) + (layer === 'transparent' ? 0.5 : 0);
    uv.y = 1 - uv.y;
    const [r, g, b] = context.getImageData(
      Math.floor(renderer.width * uv.x),
      Math.floor(renderer.height * uv.y),
      1,
      1
    ).data;
    return { r, g, b };
  }

  getLayer() {
    const { layer, transparentMesh } = this;
    if (layer === 'transparent') {
      return transparentMesh;
    }
    return this;
  }

  setLayer(layer) {
    const { transparentMesh } = this;
    transparentMesh.visible = layer === 'transparent';
    this.layer = layer;
  }

  regenerate() {
    const {
      material,
      renderer,
      transparentMesh: { material: transparentMaterial },
    } = this;
    Head.generateTexture(renderer);
    material.map.needsUpdate = true;
    material.needsUpdate = true;
    transparentMaterial.map.needsUpdate = true;
    transparentMaterial.needsUpdate = true;
  }

  updateTexture(url, editable) {
    const {
      material,
      transparentMesh: { material: transparentMaterial },
    } = this;
    const image = new Image();
    image.src = url;
    image.onload = () => {
      let opaque;
      if (editable) {
        this.renderer = document.createElement('canvas');
        this.renderer.width = image.width;
        this.renderer.height = image.height;
        this.context = this.renderer.getContext('2d');
        this.context.imageSmoothingEnabled = false;
        this.context.drawImage(image, 0, 0);
        opaque = new CanvasTexture(this.renderer);
      } else {
        opaque = new Texture(image);
      }
      opaque.encoding = sRGBEncoding;
      opaque.needsUpdate = true;
      opaque.magFilter = NearestFilter;
      opaque.minFilter = NearestFilter;
      opaque.repeat.x = 0.5;
      if (material.map) {
        material.map.dispose();
      }
      material.map = opaque;
      material.needsUpdate = true;

      const transparent = opaque.clone();
      transparent.needsUpdate = true;
      transparent.offset.x = 0.5;
      if (transparentMaterial.map) {
        transparentMaterial.map.dispose();
      }
      transparentMaterial.map = transparent;
      transparentMaterial.needsUpdate = true;
    };
  }

  updatePixel({
    color,
    remove,
    uv,
  }) {
    const {
      context,
      layer,
      renderer,
      material,
      transparentMesh: { material: transparentMaterial },
    } = this;
    if (remove && layer !== 'transparent') {
      return;
    }
    uv.x = (uv.x * 0.5) + (layer === 'transparent' ? 0.5 : 0);
    uv.y = 1 - uv.y;
    context.fillStyle = color;
    context[remove ? 'clearRect' : 'fillRect'](
      Math.floor(renderer.width * uv.x),
      Math.floor(renderer.height * uv.y),
      1,
      1
    );
    if (layer === 'transparent') {
      transparentMaterial.map.needsUpdate = true;
      transparentMaterial.needsUpdate = true;
    } else {
      material.map.needsUpdate = true;
      material.needsUpdate = true;
    }
  }

  static generateTexture(renderer = document.createElement('canvas')) {
    renderer.width = 64;
    renderer.height = 16;
    const ctx = renderer.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const size = 8;
    const skin = Math.floor(Math.random() * 150);
    const eyes = {
      r: Math.floor(Math.random() * 100),
      g: Math.floor(Math.random() * 100),
      b: Math.floor(Math.random() * 100),
    };
    const hair = {
      r: Math.floor(Math.random() * 100),
      g: Math.floor(Math.random() * 100),
      b: Math.floor(Math.random() * 100),
    };
    Head.uvs.forEach((offset, face) => {
      for (let x = 0; x < size; x += 1) {
        for (let y = 0; y < size; y += 1) {
          ctx.globalAlpha = 1;
          const l = Math.floor(Math.random() * 10);
          ctx.fillStyle = `rgb(${skin + l}, ${(skin * 0.75) + l}, ${skin + l})`;
          ctx.fillRect(
            offset.x * size + x,
            offset.y * size + y,
            1,
            1
          );
          if (face !== 3) {
            const px = offset.x * size + x;
            const py = offset.y * size + y;
            ctx.globalAlpha = (
              Math.sqrt((px - 11.5) ** 2 + (py - 19) ** 2) > 10
              && Math.random() > 0.25
            ) ? 1 : 0;
            const l = Math.floor(Math.random() * 50);
            ctx.fillStyle = `rgb(${hair.r + l}, ${hair.g + l}, ${hair.b + l})`;
            ctx.fillRect(32 + px, py, 1, 1);
          }
        }
      }
      if (face !== 5) {
        return;
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = `rgb(${eyes.r}, ${eyes.g}, ${eyes.b})`;
      [
        // r-eye
        [1, 3],
        [2, 3],
        // l-eye
        [5, 3],
        [6, 3],
      ].forEach(([x, y]) => (
        ctx.fillRect(
          offset.x * size + x,
          offset.y * size + y,
          1,
          1
        )
      ));
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#bbb';
      [
        // mouth
        [1, 6],
        [2, 6],
        [3, 6],
        [4, 6],
        [5, 6],
        [6, 6],
      ].forEach(([x, y]) => (
        ctx.fillRect(
          offset.x * size + x,
          offset.y * size + y,
          1,
          1
        )
      ));
    });
    return renderer;
  }
}

Head.uvs = [
  { x: 0, y: 1 },
  { x: 2, y: 1 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 3, y: 1 },
  { x: 1, y: 1 },
];

export default Head;
