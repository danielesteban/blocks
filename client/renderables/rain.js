import {
  BoxGeometry,
  BufferGeometry,
  BufferGeometryUtils,
  DynamicDrawUsage,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
  Vector3,
} from '../core/three.js';

class Rain extends Mesh {
  static setupGeometry() {
    let geometry = (new BufferGeometry()).fromGeometry(
      (new BoxGeometry(0.01, 0.5, 0.01)).translate(0, 0.25, 0)
    );
    delete geometry.attributes.normal;
    delete geometry.attributes.uv;
    geometry = BufferGeometryUtils.mergeVertices(geometry);
    Rain.geometry = {
      index: geometry.getIndex(),
      position: geometry.getAttribute('position'),
    };
  }

  static setupMaterial() {
    Rain.material = new ShaderMaterial({
      name: 'rain-material',
      fog: true,
      fragmentShader: ShaderLib.basic.fragmentShader,
      vertexShader: ShaderLib.basic.vertexShader
        .replace(
          '#include <common>',
          [
            'attribute vec3 offset;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          '#include <begin_vertex>',
          [
            'vec3 transformed = vec3( position + offset );',
          ].join('\n')
        ),
      uniforms: UniformsUtils.clone(ShaderLib.basic.uniforms),
    });
  }

  static updateMaterial(intensity) {
    if (!Rain.material) {
      Rain.setupMaterial();
    }
    Rain.material.uniforms.diffuse.value.setHSL(0.65, 0.4, intensity);
  }

  constructor({ anchor, heightmaps }) {
    if (!Rain.geometry) {
      Rain.setupGeometry();
    }
    if (!Rain.material) {
      Rain.setupMaterial();
    }
    const geometry = new InstancedBufferGeometry();
    geometry.setIndex(Rain.geometry.index);
    geometry.setAttribute('position', Rain.geometry.position);
    geometry.setAttribute('offset', (new InstancedBufferAttribute(new Float32Array(Rain.numDrops * 3), 3).setUsage(DynamicDrawUsage)));
    super(
      geometry,
      Rain.material
    );
    this.anchor = anchor;
    this.aux = new Vector3();
    this.heightmaps = heightmaps;
    this.targets = new Float32Array(Rain.numDrops);
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  onAnimationTick({ delta }) {
    const { numDrops } = Rain;
    const { geometry, targets, visible } = this;
    if (!visible) {
      return;
    }
    const step = delta * 16;
    const offsets = geometry.getAttribute('offset');
    for (let i = 0; i < numDrops; i += 1) {
      const y = offsets.getY(i) - step;
      const height = targets[i];
      if (y > height) {
        offsets.setY(i, y);
      } else {
        this.resetDrop(i);
      }
    }
    offsets.needsUpdate = true;
  }

  resetDrop(i) {
    const { radius } = Rain;
    const {
      anchor,
      aux,
      geometry,
      heightmaps,
      targets,
    } = this;
    const size = 16;
    const scale = 0.5;
    aux.set(
      anchor.position.x + (Math.random() * (radius * 2 + 1)) - radius,
      0,
      anchor.position.z + (Math.random() * (radius * 2 + 1)) - radius
    );
    const offsets = geometry.getAttribute('offset');
    offsets.setX(i, aux.x);
    offsets.setZ(i, aux.z);
    aux
      .divideScalar(scale)
      .floor();
    const cx = Math.floor(aux.x / size);
    const cz = Math.floor(aux.z / size);
    aux.x -= (cx * size);
    aux.z -= (cz * size);
    const heightmap = heightmaps.get(`${cx}:${cz}`);
    const height = heightmap ? heightmap[(aux.x * size) + aux.z] * scale : 0;
    targets[i] = height;
    offsets.setY(i, Math.max(Math.random() * radius * 2, height));
    offsets.needsUpdate = true;
  }

  reset() {
    const { numDrops } = Rain;
    for (let i = 0; i < numDrops; i += 1) {
      this.resetDrop(i);
    }
  }
}

Rain.numDrops = 10000;
Rain.radius = 50;

export default Rain;
