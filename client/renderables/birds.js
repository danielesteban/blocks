import {
  BufferAttribute,
  DoubleSide,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
  Vector3,
  VertexColors,
} from '../core/three.js';

class Birds extends InstancedMesh {
  static setupGeometry() {
    /* eslint-disable no-multi-spaces */
    const position = new Float32Array([
      0, 0, -0.5,    0, 0,  0.5,    -1, 1, 0,
      0, 0,  0.5,    0, 0, -0.5,     1, 1, 0,
    ]);
    const bone = new Float32Array([
      0,              0,               1,
      0,              0,               1,
    ]);
    const color = new Float32Array([
      1, 1, 1,         1, 1, 1,        1, 1, 1,
      0.9, 0.9, 0.9,   0.9, 0.9, 0.9,  0.9, 0.9, 0.9,
    ]);
    /* eslint-enable no-multi-spaces */
    Birds.geometry = {
      bone: new BufferAttribute(bone, 1),
      color: new BufferAttribute(color, 3),
      position: new BufferAttribute(position, 3),
    };
  }

  static setupMaterial() {
    Birds.material = new ShaderMaterial({
      name: 'birds-material',
      depthWrite: false,
      fog: true,
      side: DoubleSide,
      transparent: true,
      vertexColors: VertexColors,
      fragmentShader: ShaderLib.basic.fragmentShader
        .replace(
          '#include <common>',
          [
            'varying vec3 vtint;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          [
            'vec4 diffuseColor = vec4( diffuse * vtint, opacity );',
          ].join('\n')
        ),
      vertexShader: ShaderLib.basic.vertexShader
        .replace(
          '#include <common>',
          [
            'uniform float animation;',
            'attribute float bone;',
            'attribute vec3 tint;',
            'attribute float velocity;',
            'varying vec3 vtint;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          '#include <begin_vertex>',
          [
            'vec3 transformed = vec3( position );',
            'if (bone > 0.5) {',
            '  float step = (sin(animation * velocity) + 1.0) * 0.5;',
            '  transformed.x *= ( step * 0.5 ) + 0.5;',
            '  transformed.y *= ( 2.0 - ( step * 2.0 ) ) - 1.0;',
            '}',
            'vtint = tint;',
          ].join('\n')
        ),
      uniforms: {
        ...UniformsUtils.clone(ShaderLib.basic.uniforms),
        animation: { value: 0 },
      },
    });
    Birds.material.uniforms.opacity.value = 0.4;
  }

  static updateMaterial(intensity) {
    if (!Birds.material) {
      Birds.setupMaterial();
    }
    Birds.material.uniforms.diffuse.value.setHSL(0, 0, intensity);
  }

  constructor({ anchor }) {
    if (!Birds.geometry) {
      Birds.setupGeometry();
    }
    if (!Birds.material) {
      Birds.setupMaterial();
    }
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', Birds.geometry.position);
    geometry.setAttribute('bone', Birds.geometry.bone);
    geometry.setAttribute('color', Birds.geometry.color);
    geometry.setAttribute('tint', new InstancedBufferAttribute(new Float32Array(Birds.count * 3), 3));
    geometry.setAttribute('velocity', new InstancedBufferAttribute(new Float32Array(Birds.count), 1));
    super(
      geometry,
      Birds.material,
      Birds.count
    );
    this.anchor = anchor;
    this.auxObject = new Object3D();
    this.auxVector = new Vector3();
    this.animations = new Float32Array(Birds.count);
    this.origins = new BufferAttribute(new Float32Array(Birds.count * 3), 3);
    this.targets = new BufferAttribute(new Float32Array(Birds.count * 3), 3);
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
    for (let i = 0; i < Birds.count; i += 1) {
      this.resetBird(i);
    }
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  onAnimationTick({ delta }) {
    const { count, material, radius } = Birds;
    const {
      auxVector: aux,
      anchor,
      animations,
      auxObject: bird,
      geometry,
      origins,
      targets,
    } = this;
    const velocities = geometry.getAttribute('velocity');
    for (let i = 0; i < count; i += 1) {
      const velocity = velocities.getX(i);
      animations[i] += delta * (0.5 + (velocity * 0.5)) * 0.1;
      const target = { x: targets.getX(i), y: targets.getY(i), z: targets.getZ(i) };
      if (animations[i] > 1) {
        this.resetBird(i, target);
      } else {
        aux.lerpVectors(
          { x: origins.getX(i), y: origins.getY(i), z: origins.getZ(i) },
          target,
          animations[i]
        );
        if (aux.distanceTo(anchor.position) >= radius * 2) {
          this.resetBird(i);
        } else {
          bird.position.copy(aux);
          bird.lookAt(aux.copy(target));
          const scale = 0.3 + ((1 - velocities.getX(i)) * 0.5);
          bird.scale.set(scale, scale, scale);
          bird.updateMatrix();
          this.setMatrixAt(i, bird.matrix);
        }
      }
    }
    this.instanceMatrix.needsUpdate = true;
    material.uniforms.animation.value += delta * 10;
  }

  resetBird(i, origin) {
    const { radius } = Birds;
    const {
      anchor,
      animations,
      auxObject: bird,
      geometry,
      origins,
      auxVector: target,
      targets,
    } = this;
    const tints = geometry.getAttribute('tint');
    const velocities = geometry.getAttribute('velocity');
    animations[i] = 0;
    target.set(
      anchor.position.x + (Math.random() * (radius * 2 + 1)) - radius,
      radius * (0.25 + (Math.random() * 0.5)),
      anchor.position.z + (Math.random() * (radius * 2 + 1)) - radius
    );
    targets.setXYZ(i, target.x, target.y, target.z);
    tints.setXYZ(i, Math.random(), Math.random(), Math.random());
    if (origin) {
      bird.position.copy(origin);
    } else {
      bird.position.set(
        anchor.position.x + (Math.random() * (radius * 2 + 1)) - radius,
        radius * (0.25 + (Math.random() * 0.5)),
        anchor.position.z + (Math.random() * (radius * 2 + 1)) - radius
      );
      velocities.setX(i, Math.random());
    }
    origins.setXYZ(i, bird.position.x, bird.position.y, bird.position.z);
    bird.lookAt(target);
    const scale = 0.3 + ((1 - velocities.getX(i)) * 0.5);
    bird.scale.set(scale, scale, scale);
    bird.updateMatrix();
    this.setMatrixAt(i, bird.matrix);
    this.instanceMatrix.needsUpdate = true;
  }
}

Birds.count = 64;
Birds.radius = 64;

export default Birds;
