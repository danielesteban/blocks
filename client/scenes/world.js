import { Color, FogExp2 } from '../core/three.js';
import Scene from '../core/scene.js';
import Translocable from '../renderables/translocable.js';
import Voxels from '../renderables/voxels.js';

class World extends Scene {
  constructor(renderer) {
    super(renderer);

    this.background = (new Color()).setHSL(0.55, 0.4, 0.3);
    this.fog = new FogExp2(this.background.clone().offsetHSL(0, 0, -0.1), 0.02);

    const translocable = new Translocable({ width: 10, length: 10 });
    this.translocables.push(translocable);
    this.add(translocable);

    this.voxels = new Map();
  }

  onBeforeRender(renderer, scene, camera) {
    super.onBeforeRender(renderer, scene, camera);
    const { player, server } = this;
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
      server.send(JSON.stringify({
        type: 'UPDATE',
        data: {
          x: Math.floor(raycaster.ray.origin.x + 8),
          y: Math.floor(raycaster.ray.origin.y + 1),
          z: Math.floor(raycaster.ray.origin.z + 8),
          type: triggerDown ? 0x02 : 0x00,
        },
      }));
    });
  }

  onEvent(event) {
    super.onEvent(event);
    const { type, data } = event;
    switch (type) {
      case 'INIT':
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
        mesh.update({ chunk, ...geometry });
      });
    });
  }
}

export default World;
