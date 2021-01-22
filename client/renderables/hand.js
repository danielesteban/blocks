import {
  AnimationClip,
  AnimationMixer,
  Bone,
  BoxBufferGeometry,
  BufferAttribute,
  BufferGeometryUtils,
  Euler,
  LoopOnce,
  MeshBasicMaterial,
  Quaternion,
  QuaternionKeyframeTrack,
  Skeleton,
  SkinnedMesh,
  Vector3,
} from '../core/three.js';

// Skinned mesh for the player/peer hands

class Hand extends SkinnedMesh {
  static setupAnimations() {
    const eulerToQuat = (x, y, z) => (
      (new Quaternion()).setFromEuler(new Euler(x, y, z)).toArray()
    );
    const times = new Float32Array([
      0,
      1,
    ]);
    const values = new Float32Array([
      ...eulerToQuat(0, 0, 0),
      ...eulerToQuat(Math.PI * 0.5, 0, 0),
    ]);
    // Thumb base rotates in a different axis
    const thumbBaseValues = new Float32Array([
      ...eulerToQuat(0, 0, Math.PI * 0.5),
      ...eulerToQuat(0, 0, Math.PI * 0.25),
    ]);
    // Thumb phalanges rotation
    const thumbValues = new Float32Array([
      ...eulerToQuat(0, 0, 0),
      ...eulerToQuat(0, 0, Math.PI * -0.25),
    ]);
    // Ring and little fingers, will closely follow the middle finger
    const middleTimes = [...Array(3)].map((v, i) => (
      new Float32Array([
        0,
        1 - 0.2 * i,
      ])
    ));
    Hand.animations = [
      new AnimationClip('thumb', 1, [
        ...[...Array(3)].map((v, i) => (
          new QuaternionKeyframeTrack(
            `.bones[${i + 1}].quaternion`,
            times,
            i === 0 ? thumbBaseValues : thumbValues
          )
        )),
      ]),
      new AnimationClip('index', 1, [
        ...[...Array(3)].map((v, i) => (
          new QuaternionKeyframeTrack(
            `.bones[${i + 4}].quaternion`,
            times,
            values
          )
        )),
      ]),
      new AnimationClip('middle', 1, [
        ...[...Array(9)].map((v, i) => (
          new QuaternionKeyframeTrack(
            `.bones[${i + 7}].quaternion`,
            middleTimes[Math.floor(i / 3)],
            values
          )
        )),
      ]),
    ];
  }

  static setupGeometry() {
    const geometries = [];
    const pushBox = (dimensions, bone) => {
      const {
        w,
        h,
        d,
        x,
        y,
        z,
      } = dimensions;
      const box = new BoxBufferGeometry(
        w,
        h,
        d,
        Math.round(w * 100),
        Math.round(h * 100),
        Math.round(d * 100)
      );
      box.deleteAttribute('normal');
      box.deleteAttribute('uv');
      box.translate(x, y, z);
      const geometry = box.toNonIndexed();
      const { count } = geometry.getAttribute('position');
      const color = new BufferAttribute(new Float32Array(count * 3), 3);
      const skinIndex = new BufferAttribute(new Float32Array(count * 4), 4);
      const skinWeight = new BufferAttribute(new Float32Array(count * 4), 4);
      let light;
      for (let i = 0; i < count; i += 1) {
        if (i % 6 === 0) {
          light = 1 - Math.random() * 0.1 - (bone ? 0 : 0.1);
        }
        color.setXYZ(i, light, light, light);
        skinIndex.setXYZW(i, bone, 0, 0, 0);
        skinWeight.setXYZW(i, 1, 0, 0, 0);
      }
      geometry.setAttribute('color', color);
      geometry.setAttribute('skinIndex', skinIndex);
      geometry.setAttribute('skinWeight', skinWeight);
      geometries.push(geometry);
    };
    const { dimensions: { base, phalange } } = Hand;
    // Base of the hand
    pushBox(base, 0);
    // 3 phalanges x 5 fingers
    for (let i = 1; i < 16; i += 1) {
      pushBox(phalange, i);
    }
    Hand.geometry = BufferGeometryUtils.mergeVertices(
      BufferGeometryUtils.mergeBufferGeometries(geometries)
    );
    // Pre-computed bone origins
    Hand.bones = [new Vector3(0, 0, 0)];
    for (let f = 0; f < 5; f += 1) {
      for (let p = 0; p < 3; p += 1) {
        let x;
        let y;
        if (f === 0) {
          x = -0.03;
          y = -0.01;
        } else {
          x = ((f - 1) * 0.0225 - 0.034);
          y = base.h * 0.5;
        }
        Hand.bones.push(new Vector3(
          (p === 0 ? x : 0) + Math.random() * 0.001 - 0.0005,
          p === 0 ? y : phalange.h,
          Math.random() * 0.001 - 0.0005
        ));
      }
    }
  }

  static setupMaterial() {
    Hand.material = new MeshBasicMaterial({
      color: 0x0A0A0A,
      skinning: true,
      vertexColors: true,
    });
  }

  constructor({ color, handedness = 'right' } = {}) {
    if (!Hand.animations) {
      Hand.setupAnimations();
    }
    if (!Hand.geometry || !Hand.bones) {
      Hand.setupGeometry();
    }
    if (!Hand.material) {
      Hand.setupMaterial();
    }
    let { material } = Hand;
    if (color) {
      material = material.clone();
      material.color.copy(color);
    }
    super(
      Hand.geometry,
      material
    );
    this.handedness = handedness;
    this.position.set(0, -0.1 / 3, 0.05);
    this.rotation.set(Math.PI * -0.5, Math.PI * 0.5, 0);
    if (handedness === 'right') {
      this.scale.set(-1, 1, 1);
      this.rotation.y = Math.PI * -0.5;
    }
    const bones = [new Bone()];
    this.add(bones[0]);
    for (let f = 0; f < 5; f += 1) {
      let parent = bones[0];
      for (let p = 0; p < 3; p += 1) {
        const bone = new Bone();
        bones.push(bone);
        parent.add(bone);
        parent = bone;
      }
    }
    this.bind(new Skeleton(bones));
    this.skeleton.bones.forEach((bone, i) => (
      bone.position.copy(Hand.bones[i])
    ));
    this.mixer = new AnimationMixer(this);
    this.fingers = Hand.animations.map((animation) => {
      const action = this.mixer.clipAction(animation);
      action.clampWhenFinished = true;
      action.loop = LoopOnce;
      action.timeScale = -1;
      action.play();
      return action;
    });
  }

  animate({ delta }) {
    const { mixer } = this;
    mixer.update(delta);
  }

  setFinger(id, status) {
    const state = this.state || 0;
    const fingers = {
      thumb: state & (1 << 0),
      index: state & (1 << 1),
      middle: state & (1 << 2),
    };
    fingers[id] = status;
    this.setFingers(fingers);
  }

  setFingers(state) {
    const { fingers } = this;
    const { animationSpeed } = Hand;
    if (typeof state === 'object') {
      state = (
        (state.thumb ? (1 << 0) : 0)
        | (state.index ? (1 << 1) : 0)
        | (state.middle ? (1 << 2) : 0)
      );
    }
    if (this.state === state) {
      return;
    }
    this.state = state;
    fingers.forEach((finger, i) => {
      const timeScale = animationSpeed * ((state & (1 << i)) ? 1 : -1);
      if (finger.timeScale !== timeScale) {
        finger.timeScale = timeScale;
        finger.paused = false;
        finger.play();
      }
    });
  }
}

Hand.animationSpeed = 4;

Hand.dimensions = {
  base: {
    w: 0.08,
    h: 0.08,
    d: 0.015,
    x: 0,
    y: 0,
    z: 0,
  },
  phalange: {
    w: 0.02,
    h: 0.02,
    d: 0.02,
    x: 0,
    y: 0.01,
    z: 0,
  },
};

export default Hand;
