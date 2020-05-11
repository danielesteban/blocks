import {
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  TorusGeometry,
  VertexColors,
} from '../core/three.js';

// A mesh to visualize the translocation destination and the curvecast path

class Marker extends Object3D {
  static setupGeometry() {
    const outer = new TorusGeometry(0.3, 0.025, 16, 32);
    const inner = new TorusGeometry(0.15, 0.0125, 16, 24);
    [outer, inner].forEach(({ faces }) => faces.forEach((face, i) => {
      if (i % 2 === 1) {
        face.color.offsetHSL(0, 0, Math.random() * -0.1);
        faces[i - 1].color.copy(face.color);
      }
    }));
    outer.merge(inner);
    outer.rotateX(Math.PI * -0.5);
    const geometry = (new BufferGeometry()).fromGeometry(outer);
    delete geometry.attributes.normal;
    delete geometry.attributes.uv;
    Marker.geometry = geometry;
  }

  static setupMaterial() {
    Marker.material = new MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: VertexColors,
      opacity: 0.5,
      transparent: true,
    });
  }

  static setupLineMaterial() {
    Marker.lineMaterial = new LineBasicMaterial({
      color: (new Color(0xffe0bd)).convertGammaToLinear(2.2),
    });
  }

  constructor() {
    if (!Marker.geometry) {
      Marker.setupGeometry();
    }
    if (!Marker.material) {
      Marker.setupMaterial();
    }
    if (!Marker.lineMaterial) {
      Marker.setupLineMaterial();
    }
    super();
    this.disc = new Mesh(
      Marker.geometry,
      Marker.material
    );
    this.disc.onBeforeRender = ({ animation: { delta } }) => {
      this.disc.rotation.y += delta;
    };
    this.add(this.disc);
    this.line = new Line(
      new BufferGeometry(),
      Marker.lineMaterial
    );
    this.add(this.line);
    this.visible = false;
  }

  update({ hit, points }) {
    const { disc, line } = this;
    if (hit) {
      disc.position.copy(hit.point);
      disc.updateWorldMatrix();
      disc.visible = true;
    } else {
      disc.visible = false;
    }
    if (points) {
      line.geometry.setFromPoints(points);
      line.geometry.computeBoundingSphere();
      line.visible = true;
    } else {
      line.visible = false;
    }
    this.visible = true;
  }
}

export default Marker;
