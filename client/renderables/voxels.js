import {
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  BufferAttribute,
  VertexColors,
} from '../core/three.js';

// Voxels chunk

class Voxels extends Mesh {
  static setupMaterial() {
    Voxels.material = new MeshBasicMaterial({
      vertexColors: VertexColors,
    });
  }

  constructor() {
    if (!Voxels.material) {
      Voxels.setupMaterial();
    }
    super(
      new BufferGeometry(),
      Voxels.material
    );
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  update({
    chunk,
    color,
    index,
    position,
  }) {
    const { geometry } = this;
    const decodeBase64 = (Type, buffer) => {
      buffer = atob(buffer);
      return new Type(
        (new Uint8Array([...Array(buffer.length)].map((v, i) => (
          buffer.charCodeAt(i)
        )))).buffer
      );
    };
    geometry.setIndex(new BufferAttribute(decodeBase64(Uint16Array, index), 1));
    [
      ['position', position, 3],
      ['color', color, 3],
    ].forEach(([name, value, size]) => {
      geometry.setAttribute(name, new BufferAttribute(decodeBase64(Float32Array, value), size));
    });
    geometry.computeBoundingSphere();

    this.position
      .set(chunk.x, 0, chunk.z)
      .multiply({ x: 16, y: 16, z: 16 })
      .add({ x: -8, y: -1, z: -8 });
    this.updateMatrix();
    this.updateMatrixWorld();

    this.visible = true;
  }
}

export default Voxels;
