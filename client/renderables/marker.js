import {
  BufferAttribute,
  BufferGeometry,
  BufferGeometryUtils,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  TorusBufferGeometry,
} from '../core/three.js';

// A mesh to visualize the translocation destination and the curvecast path

class Marker extends Group {
  static setupGeometry() {
    const geometry = BufferGeometryUtils.mergeBufferGeometries(
      [
        new TorusBufferGeometry(0.3, 0.025, 16, 32),
        new TorusBufferGeometry(0.15, 0.0125, 16, 24),
      ].map((model) => {
        model.deleteAttribute('normal');
        model.deleteAttribute('uv');
        const geometry = model.toNonIndexed();
        const { count } = geometry.getAttribute('position');
        const color = new BufferAttribute(new Float32Array(count * 3), 3);
        let light;
        for (let i = 0; i < count; i += 1) {
          if (i % 6 === 0) {
            light = 1 - Math.random() * 0.1;
          }
          color.setXYZ(i, light, light, light);
        }
        geometry.setAttribute('color', color);
        return geometry;
      })
    );
    geometry.rotateX(Math.PI * -0.5);
    Marker.geometry = BufferGeometryUtils.mergeVertices(geometry);
  }

  static setupMaterial() {
    Marker.material = new MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      opacity: 0.5,
      transparent: true,
    });
  }

  static setupLineMaterial() {
    Marker.lineMaterial = new LineBasicMaterial({
      color: (new Color(0xffe0bd)).convertSRGBToLinear(),
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
    this.add(this.disc);
    this.line = new Line(
      new BufferGeometry(),
      Marker.lineMaterial
    );
    this.add(this.line);
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  update({ animation: { delta }, hit, points }) {
    const { disc, line } = this;
    if (hit) {
      disc.rotation.y += delta;
      disc.position.copy(hit.point);
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
