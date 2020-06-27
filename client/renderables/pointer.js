import {
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  Vector3,
} from '../core/three.js';

// A line in 3D space to use as a pointer

class Pointer extends Line {
  static setupGeometry() {
    Pointer.geometry = (new BufferGeometry()).setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -1),
    ]);
  }

  static setupMaterial() {
    Pointer.material = new LineBasicMaterial({
      color: (new Color(0xffe0bd)).convertSRGBToLinear(),
    });
  }

  constructor() {
    if (!Pointer.geometry) {
      Pointer.setupGeometry();
    }
    if (!Pointer.material) {
      Pointer.setupMaterial();
    }
    super(
      Pointer.geometry,
      Pointer.material
    );
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  update({ distance, origin }) {
    const { parent, position, scale } = this;
    if (distance <= 0.1) {
      return;
    }
    parent.worldToLocal(position.copy(origin));
    scale.z = distance;
    this.updateMatrix();
    this.updateWorldMatrix();
    this.visible = true;
  }
}

export default Pointer;
