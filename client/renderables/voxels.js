import {
  BufferGeometry,
  Mesh,
  BufferAttribute,
  Object3D,
  RepeatWrapping,
  ShaderLib,
  ShaderMaterial,
  sRGBEncoding,
  CanvasTexture,
  UniformsUtils,
  UVMapping,
  VertexColors,
} from '../core/three.js';

// Voxels chunk

class Voxels extends Object3D {
  static setupMaterials() {
    const opaque = new ShaderMaterial({
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
          '#include <envmap_fragment>',
          [
            '#include <envmap_fragment>',
            'outgoingLight *= (vlight + max(vsunlight * sunlightIntensity, 0.05)) * 0.5;',
          ].join('\n')
        ),
      vertexShader: ShaderLib.basic.vertexShader
        .replace(
          '#include <common>',
          [
            'attribute float light;',
            'varying float vlight;',
            'varying float vsunlight;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          '#include <color_vertex>',
          [
            '#ifdef USE_COLOR',
            '  vColor.xyz = color.xyz / 255.0;',
            '#endif',
            'vlight = float((int(light) >> 4) & 15) / 15.0;',
            'vsunlight = float(int(light) & 15) / 15.0;',
          ].join('\n')
        ),
      uniforms: {
        ...UniformsUtils.clone(ShaderLib.basic.uniforms),
        sunlightIntensity: { value: 1 },
      },
    });
    const transparent = opaque.clone();
    transparent.transparent = true;
    const atlas = new CanvasTexture(
      document.createElement('canvas'),
      UVMapping,
      RepeatWrapping,
      RepeatWrapping
    );
    atlas.anisotropy = 16;
    atlas.image.height = 128;
    atlas.encoding = sRGBEncoding;
    atlas.loader = new Image();
    atlas.loader.crossOrigin = 'anonymous';
    atlas.loader.onload = () => {
      atlas.image.width = (atlas.loader.width * atlas.image.height) / atlas.loader.height;
      const ctx = atlas.image.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        atlas.loader,
        0,
        0,
        atlas.loader.width,
        atlas.loader.height,
        0,
        0,
        atlas.image.width,
        atlas.image.height
      );
      atlas.needsUpdate = true;
      const uvScale = 1 / (atlas.loader.width / 16);
      [opaque, transparent].forEach((material) => {
        material.map = atlas;
        material.uniforms.map.value = atlas;
        material.uniforms.uvTransform.value.setUvTransform(
          0, 0, uvScale, 1, 0, 0, 0
        );
        material.needsUpdate = true;
      });
    };
    Voxels.materials = {
      atlas,
      opaque,
      transparent,
    };
  }

  static updateMaterials({ atlas, intensity }) {
    if (!Voxels.materials) {
      Voxels.setupMaterials();
    }
    const {
      atlas: { loader },
      opaque,
      transparent,
    } = Voxels.materials;
    if (atlas !== undefined) {
      if (atlas) {
        loader.src = atlas;
      } else {
        [opaque, transparent].forEach((material) => {
          material.map = null;
          material.uniforms.map.value = null;
        });
      }
    }
    if (intensity !== undefined) {
      [opaque, transparent].forEach((material) => {
        material.uniforms.sunlightIntensity.value = intensity;
      });
    }
  }

  constructor() {
    if (!Voxels.materials) {
      Voxels.setupMaterials();
    }
    super();
    this.matrixAutoUpdate = false;
    this.meshes = {
      opaque: new Mesh(new BufferGeometry(), Voxels.materials.opaque),
      transparent: new Mesh(new BufferGeometry(), Voxels.materials.transparent),
    };
    ['opaque', 'transparent'].forEach((key) => {
      this.meshes[key].matrixAutoUpdate = false;
      this.add(this.meshes[key]);
    });
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  update({
    chunk,
    heightmap,
    geometries,
  }) {
    const { updateHeightmap } = Voxels;
    const { meshes } = this;

    this.chunk = chunk;
    this.position
      .set(chunk.x, 0, chunk.z)
      .multiplyScalar(8);
    this.scale.set(0.5, 0.5, 0.5);
    this.updateMatrix();

    ['opaque', 'transparent'].forEach((key) => {
      const {
        color,
        light,
        position,
        uv,
      } = geometries[key];
      const mesh = meshes[key];

      if (!position.length) {
        mesh.visible = false;
        return;
      }

      const { geometry } = mesh;

      geometry.setAttribute('color', new BufferAttribute(color, 3));
      geometry.setAttribute('light', new BufferAttribute(light, 1));
      geometry.setAttribute('position', new BufferAttribute(position, 3));
      geometry.setAttribute('uv', new BufferAttribute(uv, 2));

      {
        const len = (position.length / 3 / 4) * 6;
        const index = new Uint16Array(len);
        for (let i = 0, v = 0; i < len; i += 6, v += 4) {
          index[i] = v;
          index[i + 1] = v + 1;
          index[i + 2] = v + 2;
          index[i + 3] = v + 2;
          index[i + 4] = v + 3;
          index[i + 5] = v;
        }
        geometry.setIndex(new BufferAttribute(index, 1));
      }

      geometry.deleteAttribute('normal');
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      updateHeightmap({ geometry, heightmap });

      mesh.visible = true;
    });

    super.updateMatrixWorld();
  }

  // eslint-disable-next-line class-methods-use-this
  updateMatrixWorld() {}

  static updateHeightmap({ geometry, heightmap }) {
    const aux = { x: 0, y: 0, z: 0 };
    const normal = geometry.getAttribute('normal');
    const position = geometry.getAttribute('position');
    const { count } = normal;
    for (let i = 0; i < count; i += 4) {
      if (
        normal.getX(i) === 0
        && normal.getY(i) === 1
        && normal.getZ(i) === 0
      ) {
        aux.x = 0xFF;
        aux.y = 0;
        aux.z = 0xFF;
        for (let j = 0; j < 4; j += 1) {
          aux.x = Math.min(aux.x, position.getX(i + j));
          aux.y = Math.max(aux.y, position.getY(i + j));
          aux.z = Math.min(aux.z, position.getZ(i + j));
        }
        const index = (aux.x * 16) + aux.z;
        heightmap[index] = Math.max(heightmap[index], aux.y);
      }
    }
  }
}

export default Voxels;
