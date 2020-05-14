import { Color, FogExp2, Vector3 } from '../core/three.js';
import Scene from '../core/scene.js';
import Voxels from '../renderables/voxels.js';

class World extends Scene {
  constructor(renderer) {
    super(renderer);

    this.auxVector = new Vector3();
    this.player.chunk = new Vector3(0, -1, 0);

    this.background = new Color();
    this.fog = new FogExp2(0, 0.015);
    this.timeOffset = Date.now() / 1000;
    this.voxels = new Map();
  }

  onBeforeRender(renderer, scene, camera) {
    super.onBeforeRender(renderer, scene, camera);
    const { offset, scale } = World;
    const {
      auxVector,
      player,
      server,
      timeOffset,
    } = this;

    player.controllers.forEach((controller) => {
      const {
        buttons: {
          triggerDown,
          gripDown,
        },
        hand,
        raycaster,
      } = controller;
      if (!hand || (!triggerDown && !gripDown)) {
        return;
      }
      auxVector
        .copy(raycaster.ray.origin)
        .sub(offset)
        .divideScalar(scale)
        .floor();
      server.send(JSON.stringify({
        type: 'UPDATE',
        data: {
          x: auxVector.x,
          y: auxVector.y,
          z: auxVector.z,
          type: triggerDown ? 0x02 : 0x00,
        },
      }));
    });

    auxVector
      .copy(player.position)
      .sub(offset)
      .divideScalar(scale)
      .floor()
      .divideScalar(16)
      .floor();

    if (!player.chunk.equals(auxVector)) {
      player.chunk.copy(auxVector);
      this.needsTranslocablesUpdate = true;
    }

    if (this.needsTranslocablesUpdate) {
      this.updateTranslocables();
    }

    this.updateSunlight(
      0.5 + (Math.sin((timeOffset + renderer.animation.time) * 0.1) * 0.5)
    );
  }

  onEvent(event) {
    super.onEvent(event);
    const { offset, scale } = World;
    const { type, data } = event;
    switch (type) {
      case 'INIT':
        this.player.position
          .copy(data.spawn)
          .multiplyScalar(scale)
          .add({
            x: offset.x + 0.25,
            y: offset.y,
            z: offset.z + 0.25,
          });
        // fallsthrough
      case 'UPDATE':
        this.onUpdate(data);
        break;
      default:
        break;
    }
  }

  onUpdate(data) {
    const { voxels } = this;
    data.chunks.forEach(({ chunk, meshes }) => {
      meshes.forEach((geometry, subchunk) => {
        const key = `${chunk.x}:${chunk.z}:${subchunk}`;
        let mesh = voxels.get(key);
        if (!mesh) {
          mesh = new Voxels();
          this.add(mesh);
          voxels.set(key, mesh);
        }
        mesh.update({
          chunk: { ...chunk, y: subchunk },
          ...geometry,
        });
      });
    });
    this.needsTranslocablesUpdate = true;
  }

  updateSunlight(intensity) {
    const { background, fog } = this;
    background.setHSL(0.55, 0.4, Math.max(intensity, 0.1) * 0.5);
    fog.color.copy(background);
    Voxels.setSunlightIntensity(intensity);
  }

  updateTranslocables() {
    const { player, translocables, voxels } = this;
    translocables.length = 0;
    voxels.forEach((mesh) => {
      if (player.chunk.distanceTo(mesh.chunk) <= 4) {
        translocables.push(mesh);
      }
    });
    this.needsTranslocablesUpdate = false;
  }
}

World.offset = { x: -4, y: -0.5, z: -4 };
World.scale = 0.5;

export default World;
