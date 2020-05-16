import {
  BufferGeometry,
  Mesh,
  BufferAttribute,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
  VertexColors,
} from '../core/three.js';

// Voxels chunk

class Voxels extends Mesh {
  static setupMaterial() {
    Voxels.material = new ShaderMaterial({
      name: 'voxels-material',
      vertexColors: VertexColors,
      fog: true,
      fragmentShader: ShaderLib.basic.fragmentShader
        .replace(
          '#include <common>',
          [
            'varying float vlight;',
            'varying float vsunlight;',
            'uniform float sunlightIntensity;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          [
            'vec4 diffuseColor = vec4( diffuse * (vlight + max(vsunlight * sunlightIntensity, 0.05)) * 0.5, opacity );',
          ].join('\n')
        ),
      vertexShader: ShaderLib.basic.vertexShader
        .replace(
          '#include <common>',
          [
            'attribute float light;',
            'attribute float sunlight;',
            'varying float vlight;',
            'varying float vsunlight;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          '#include <begin_vertex>',
          [
            '#include <begin_vertex>',
            'vlight = light;',
            'vsunlight = sunlight;',
          ].join('\n')
        ),
      uniforms: {
        ...UniformsUtils.clone(ShaderLib.basic.uniforms),
        sunlightIntensity: { value: 1 },
      },
    });
  }

  static updateMaterial(intensity) {
    if (!Voxels.material) {
      Voxels.setupMaterial();
    }
    Voxels.material.uniforms.sunlightIntensity.value = intensity;
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

  static decodeBase64(Type, buffer) {
    buffer = atob(buffer);
    return new Type(
      (new Uint8Array([...Array(buffer.length)].map((v, i) => (
        buffer.charCodeAt(i)
      )))).buffer
    );
  }

  update({
    chunk,
    color,
    light,
    position,
  }) {
    const { decodeBase64 } = Voxels;
    const { geometry } = this;

    this.chunk = chunk;

    if (!position.length) {
      this.visible = false;
      return;
    }

    light = decodeBase64(Uint8Array, light);
    position = new Float32Array(decodeBase64(Int16Array, position));
    color = new Float32Array(decodeBase64(Uint8Array, color))
      .map((c) => (
        c / 0xFF
      ));

    const index = new Uint16Array((position.length / 3 / 4) * 6);
    const l = index.length;
    for (let i = 0, v = 0; i < l; i += 6, v += 4) {
      index[i] = v;
      index[i + 1] = v + 1;
      index[i + 2] = v + 2;
      index[i + 3] = v + 2;
      index[i + 4] = v + 3;
      index[i + 5] = v;
    }
    geometry.setIndex(new BufferAttribute(index, 1));

    geometry.setAttribute('position', new BufferAttribute(position, 3));
    geometry.setAttribute('color', new BufferAttribute(color, 3));
    geometry.setAttribute('light', new BufferAttribute(new Float32Array(light).map((v) => (
      ((v >> 4) & 0xF) / 0xF
    )), 1));
    geometry.setAttribute('sunlight', new BufferAttribute(new Float32Array(light).map((v) => (
      (v & 0xF) / 0xF
    )), 1));

    if (
      geometry.attributes.normal
      && geometry.attributes.normal.array.length !== position.length
    ) {
      geometry.deleteAttribute('normal');
    }
    geometry.computeVertexNormals();

    geometry.computeBoundingSphere();

    this.position
      .set(chunk.x, 0, chunk.z)
      .multiply({ x: 8, y: 8, z: 8 });
    this.scale.set(0.5, 0.5, 0.5);
    this.updateMatrix();
    this.updateWorldMatrix();

    this.visible = true;
  }
}

export default Voxels;
