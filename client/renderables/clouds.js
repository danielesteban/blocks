import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SimplexNoise,
  Vector2,
} from '../core/three.js';

// Animated clouds that follow the player around

class Clouds extends Object3D {
  static setupMaterial() {
    Clouds.material = new MeshBasicMaterial({
      color: 0xffffff,
    });
  }

  constructor({ anchor }) {
    if (!Clouds.material) {
      Clouds.setupMaterial();
    }
    super();
    const simplex = new SimplexNoise();
    const aux = new Vector2();
    const center = new Vector2();
    for (let gx = -1; gx <= 1; gx += 1) {
      for (let gy = -1; gy <= 1; gy += 1) {
        const geometry = new BufferGeometry();
        const index = [];
        const position = [];
        const width = 10 + Math.floor(Math.random() * 21);
        const height = 10 + Math.floor(Math.random() * 21);
        center.set(width * 0.5 - 0.5, height * 0.5 - 0.5);
        const radius = Math.min(center.x, center.y);
        for (let i = 0, x = 0; x < width; x += 1) {
          for (let y = 0; y < height; y += 1) {
            const distance = aux.set(x, y).distanceTo(center);
            if (
              distance < radius
              && Math.abs(simplex.noise(x / 16, y / 16)) < distance * 0.05
            ) {
              position.push(
                x - center.x, 0, y - center.y,
                x - center.x + 1, 0, y - center.y,
                x - center.x + 1, 0, y - center.y + 1,
                x - center.x, 0, y - center.y + 1
              );
              index.push(
                i, i + 1, i + 2,
                i + 2, i + 3, i
              );
              i += 4;
            }
          }
        }
        geometry.setIndex(new BufferAttribute(new Uint16Array(index), 1));
        geometry.addAttribute('position', new BufferAttribute(new Float32Array(position), 3));
        const cloud = new Mesh(
          geometry,
          Clouds.material
        );
        cloud.position.set(gx * 20, Math.random(), gy * 20);
        cloud.speed = 0.01 + Math.random() * 0.05;
        this.add(cloud);
      }
    }
    this.anchor = anchor;
    this.scale.set(10, 1, 10);
  }

  dispose() {
    const { children } = this;
    children.forEach(({ geometry }) => (
      geometry.dispose()
    ));
  }

  onAnimationTick({ delta }) {
    const { anchor, children, position } = this;
    children.forEach(({ position, speed }) => {
      position.x += speed * delta;
      if (position.x > 30) {
        position.x -= 60;
      }
    });
    position.copy(anchor.position);
    position.y = Clouds.y;
    this.updateMatrixWorld();
  }
}

Clouds.y = 64;

export default Clouds;
