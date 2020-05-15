import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  Vector2,
  VertexColors,
} from '../core/three.js';

// Animated sun

class Sun extends Mesh {
  static setupGeometry() {
    const size = 12;
    const center = new Vector2(size * 0.5 - 0.5, size * 0.5 - 0.5);
    const position = [];
    const color = [];
    const index = [];
    const aux = new Vector2();
    const c = new Color();
    for (let i = 0, x = 0; x < size; x += 1) {
      for (let y = 0; y < size; y += 1) {
        const distance = aux.set(x, y).distanceTo(center);
        if (
          distance < size * 0.5
        ) {
          position.push(
            x - center.x, y - center.y, 0,
            x - center.x + 1, y - center.y, 0,
            x - center.x + 1, y - center.y + 1, 0,
            x - center.x, y - center.y + 1, 0
          );
          c.setHSL(0, 0, 0.8 - (Math.random() * 0.4));
          color.push(
            c.r, c.g, c.b,
            c.r, c.g, c.b,
            c.r, c.g, c.b,
            c.r, c.g, c.b
          );
          index.push(
            i, i + 1, i + 2,
            i + 2, i + 3, i
          );
          i += 4;
        }
      }
    }
    const geometry = new BufferGeometry();
    geometry.setIndex(new BufferAttribute(new Uint16Array(index), 1));
    geometry.addAttribute('position', new BufferAttribute(new Float32Array(position), 3));
    geometry.addAttribute('color', new BufferAttribute(new Float32Array(color), 3));
    Sun.geometry = geometry;
  }

  static setupMaterial() {
    Sun.material = new MeshBasicMaterial({
      depthWrite: false,
      vertexColors: VertexColors,
    });
  }

  static updateMaterial({ intensity, time }) {
    if (!Sun.material) {
      Sun.setupMaterial();
    }
    Sun.material.color.setHSL(0.166, 0.8, intensity * 0.25);
    Sun.material.time = time;
  }

  constructor({ anchor }) {
    if (!Sun.geometry) {
      Sun.setupGeometry();
    }
    if (!Sun.material) {
      Sun.setupMaterial();
    }
    super(
      Sun.geometry,
      Sun.material
    );
    this.anchor = anchor;
    this.renderOrder = -1;
  }

  onAnimationTick() {
    const { material: { time }, distance } = Sun;
    const { anchor, position } = this;
    const angle = Math.PI * (1 - time) * 1.1;
    position
      .copy(anchor.position)
      .add({
        x: 0,
        y: Math.sin(angle) * distance,
        z: Math.cos(angle) * distance,
      });
    this.rotation.x = Math.PI - angle;
    this.updateWorldMatrix();
  }
}

Sun.distance = 40;

export default Sun;
