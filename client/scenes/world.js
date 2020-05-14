import {
  Color,
  FogExp2,
  Vector2,
  Vector3,
} from '../core/three.js';
import Scene from '../core/scene.js';
import Voxels from '../renderables/voxels.js';

class World extends Scene {
  constructor(renderer) {
    super(renderer);

    this.chunks = {
      aux: new Vector3(),
      loaded: new Map(),
      requested: new Map(),
      player: new Vector3(),
    };

    this.background = new Color();
    this.fog = new FogExp2(0, 0.015);
    this.timeOffset = Date.now() / 1000;
    this.voxels = new Map();
  }

  onBeforeRender(renderer, scene, camera) {
    super.onBeforeRender(renderer, scene, camera);
    const { offset, renderGrid, scale } = World;
    const {
      chunks,
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
      chunks.aux
        .copy(raycaster.ray.origin)
        .sub(offset)
        .divideScalar(scale)
        .floor();
      server.send(JSON.stringify({
        type: 'UPDATE',
        data: {
          x: chunks.aux.x,
          y: chunks.aux.y,
          z: chunks.aux.z,
          type: triggerDown ? 0x02 : 0x00,
        },
      }));
    });

    chunks.aux
      .copy(player.position)
      .sub(offset)
      .divideScalar(scale)
      .floor()
      .divideScalar(16)
      .floor();

    if (!chunks.player.equals(chunks.aux)) {
      chunks.player.copy(chunks.aux);
      renderGrid.forEach((neighbour) => {
        this.loadChunk({
          x: chunks.player.x + neighbour.x,
          z: chunks.player.z + neighbour.y,
        });
      });
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
    const { type, data } = event;
    switch (type) {
      case 'INIT':
        this.onInit(data);
        break;
      case 'UPDATE':
        this.onUpdate(data);
        break;
      default:
        break;
    }
  }

  onInit(data) {
    const { offset, scale } = World;
    const { chunks, player } = this;
    player.position
      .copy(data.spawn)
      .multiplyScalar(scale)
      .add({
        x: offset.x + 0.25,
        y: offset.y,
        z: offset.z + 0.25,
      });
    chunks.loaded.clear();
    chunks.requested.clear();
    chunks.player
      .copy(player.position)
      .sub(offset)
      .divideScalar(scale)
      .floor()
      .divideScalar(16)
      .floor()
      .add({ x: 0, y: -1, z: 0 });
  }

  onUpdate(data) {
    const { chunks, voxels } = this;
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
      const key = `${chunk.x}:${chunk.z}`;
      chunks.loaded.set(key, true);
      chunks.requested.delete(key);
    });
    this.needsTranslocablesUpdate = true;
  }

  loadChunk(chunk) {
    const { chunks, server } = this;
    const key = `${chunk.x}:${chunk.z}`;
    if (chunks.loaded.has(key) || chunks.requested.has(key)) {
      return;
    }
    chunks.requested.set(key, true);
    server.send(JSON.stringify({
      type: 'LOAD',
      data: chunk,
    }));
  }

  updateSunlight(intensity) {
    const { background, fog } = this;
    background.setHSL(0.55, 0.4, Math.max(intensity, 0.1) * 0.5);
    fog.color.copy(background);
    Voxels.setSunlightIntensity(intensity);
  }

  updateTranslocables() {
    const { chunks, translocables, voxels } = this;
    translocables.length = 0;
    voxels.forEach((mesh) => {
      if (chunks.player.distanceTo(mesh.chunk) <= 4) {
        translocables.push(mesh);
      }
    });
    this.needsTranslocablesUpdate = false;
  }
}

World.renderRadius = 10;
World.renderGrid = (() => {
  const grid = [];
  const center = new Vector2();
  for (let x = -World.renderRadius; x <= World.renderRadius; x += 1) {
    for (let y = -World.renderRadius; y <= World.renderRadius; y += 1) {
      const chunk = new Vector2(x, y);
      if (chunk.distanceTo(center) <= World.renderRadius) {
        grid.push(chunk);
      }
    }
  }
  grid.sort((a, b) => (a.distanceTo(center) - b.distanceTo(center)));
  return grid;
})();
World.offset = { x: -4, y: -0.5, z: -4 };
World.scale = 0.5;

export default World;
