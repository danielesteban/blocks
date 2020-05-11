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

    this.voxels = [];
  }

  onEvent(event) {
    super.onEvent(event);
    const { type, data } = event;
    switch (type) {
      case 'INIT':
        this.onInit(data);
        break;
      default:
        break;
    }
  }

  onInit(data) {
    // HACK
    let i = 0;
    data.chunks.forEach(({ chunk, meshes }) => {
      meshes.forEach((mesh) => {
        i += 1;
        if (!this.voxels[i]) {
          this.voxels[i] = new Voxels();
          this.add(this.voxels[i]);
        }
        this.voxels[i].update({ chunk, ...mesh });
      });
    });
  }
}

export default World;
