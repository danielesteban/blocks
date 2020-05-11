import {
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from '../core/three.js';

// Invisible plane to raycast against and translocate the player

class Translocable extends Mesh {
  static setupGeometry() {
    const geometry = new PlaneBufferGeometry(1, 1, 1, 1);
    geometry.rotateX(Math.PI * -0.5);
    delete geometry.attributes.normal;
    delete geometry.attributes.uv;
    Translocable.geometry = geometry;
  }

  static setupMaterial() {
    Translocable.material = new MeshBasicMaterial({
      visible: false,
    });
  }

  constructor({ width, length, offset = 0 }) {
    if (!Translocable.geometry) {
      Translocable.setupGeometry();
    }
    if (!Translocable.material) {
      Translocable.setupMaterial();
    }
    super(
      Translocable.geometry,
      Translocable.material
    );
    this.scale.set(width - (offset * 2), 1, length - (offset * 2));
    this.position.set(0, 0.001, 0);
  }
}

export default Translocable;
