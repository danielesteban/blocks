import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SimplexNoise,
  Vector2,
  VertexColors,
} from '../core/three.js';

// Animated clouds that follow the player around

class Clouds extends Object3D {
  static setupMaterial() {
    Clouds.material = new MeshBasicMaterial({
      vertexColors: VertexColors,
    });
    Clouds.material.defines = {
      FOG_DENSITY: 0.01,
    };
  }

  static updateMaterial(intensity) {
    if (!Clouds.material) {
      Clouds.setupMaterial();
    }
    Clouds.material.color.setHSL(0, 0, intensity);
  }

  constructor({ anchor }) {
    if (!Clouds.material) {
      Clouds.setupMaterial();
    }
    super();
    const { depth } = Clouds;
    const simplex = new SimplexNoise();
    const aux = new Vector2();
    const center = new Vector2();
    for (let gx = -1; gx <= 1; gx += 1) {
      for (let gy = -1; gy <= 1; gy += 1) {
        const geometry = new BufferGeometry();
        const index = [];
        const position = [];
        const color = [];
        const width = 10 + Math.floor(Math.random() * 21);
        const height = 10 + Math.floor(Math.random() * 21);
        center.set(width * 0.5 - 0.5, height * 0.5 - 0.5);
        const radius = Math.min(center.x, center.y);
        const voxels = Array(width);
        for (let x = 0; x < width; x += 1) {
          voxels[x] = Array(height);
          for (let y = 0; y < height; y += 1) {
            const distance = aux.set(x, y).distanceTo(center);
            voxels[x][y] = (
              distance < radius
              && Math.abs(simplex.noise(x / 16, y / 16)) < distance * 0.05
            );
          }
        }
        let i = 0;
        const pushFace = (
          x1, y1, z1,
          x2, y2, z2,
          x3, y3, z3,
          x4, y4, z4,
          r, g, b
        ) => {
          position.push(
            x1 - center.x, y1, z1 - center.y,
            x2 - center.x, y2, z2 - center.y,
            x3 - center.x, y3, z3 - center.y,
            x4 - center.x, y4, z4 - center.y
          );
          color.push(
            r, g, b,
            r, g, b,
            r, g, b,
            r, g, b
          );
          index.push(
            i, i + 1, i + 2,
            i + 2, i + 3, i
          );
          i += 4;
        };
        for (let x = 0; x < width; x += 1) {
          for (let y = 0; y < height; y += 1) {
            if (voxels[x][y]) {
              pushFace(
                x, 0, y,
                x + 1, 0, y,
                x + 1, 0, y + 1,
                x, 0, y + 1,
                1, 1, 1
              );
              if (x === 0 || !voxels[x - 1][y]) {
                pushFace(
                  x, 0, y,
                  x, 0, y + 1,
                  x, depth, y + 1,
                  x, depth, y,
                  0.8, 0.8, 0.8
                );
              }
              if (x === (width - 1) || !voxels[x + 1][y]) {
                pushFace(
                  x + 1, 0, y + 1,
                  x + 1, 0, y,
                  x + 1, depth, y,
                  x + 1, depth, y + 1,
                  0.8, 0.8, 0.8
                );
              }
              if (y === 0 || !voxels[x][y - 1]) {
                pushFace(
                  x + 1, 0, y,
                  x, 0, y,
                  x, depth, y,
                  x + 1, depth, y,
                  0.8, 0.8, 0.8
                );
              }
              if (y === (height - 1) || !voxels[x][y + 1]) {
                pushFace(
                  x, 0, y + 1,
                  x + 1, 0, y + 1,
                  x + 1, depth, y + 1,
                  x, depth, y + 1,
                  0.8, 0.8, 0.8
                );
              }
            }
          }
        }
        geometry.setIndex(new BufferAttribute(new Uint16Array(index), 1));
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(position), 3));
        geometry.setAttribute('color', new BufferAttribute(new Float32Array(color), 3));
        const cloud = new Mesh(
          geometry,
          Clouds.material
        );
        cloud.position.set(gx * 20, Math.random() * depth * 2, gy * 20);
        cloud.speed = 0.025 + Math.random() * 0.05;
        cloud.matrixAutoUpdate = false;
        this.add(cloud);
      }
    }
    this.anchor = anchor;
    this.matrixAutoUpdate = false;
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
    position.copy(anchor.position);
    position.y = Clouds.y;
    this.updateMatrix();
    this.updateWorldMatrix();
    children.forEach((cloud) => {
      const { position, speed } = cloud;
      position.x += speed * delta;
      if (position.x > 30) {
        position.x -= 60;
      }
      cloud.updateMatrix();
      cloud.updateWorldMatrix();
    });
  }
}

Clouds.y = 100;
Clouds.depth = 3;

export default Clouds;
