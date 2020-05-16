import {
  Color,
  FogExp2,
  Vector2,
  Vector3,
} from '../core/three.js';
import Scene from '../core/scene.js';
import Clouds from '../renderables/clouds.js';
import FPSMeter from '../renderables/fps.js';
import Menu from '../renderables/menu.js';
import Sun from '../renderables/sun.js';
import Voxels from '../renderables/voxels.js';

class World extends Scene {
  constructor(renderer) {
    super(renderer);

    this.background = new Color();
    this.clouds = new Clouds({ anchor: this.player });
    this.add(this.clouds);
    this.fog = new FogExp2(0, 0.02);
    this.sun = new Sun({ anchor: this.player });
    this.add(this.sun);

    this.menu = new Menu();
    const { attachments } = this.player;
    attachments.left = [this.menu];
    attachments.right = [new FPSMeter()];
    this.ui.push(
      ...attachments.left,
      ...attachments.right
    );

    this.chunks = {
      aux: new Vector3(),
      loaded: new Map(),
      requested: new Map(),
      player: new Vector3(),
    };
    this.voxels = new Map();
    this.timeOffset = Date.now() / 1000;
  }

  onBeforeRender(renderer, scene, camera) {
    super.onBeforeRender(renderer, scene, camera);
    const {
      renderGrid,
      renderRadius,
      scale,
    } = World;
    const {
      chunks,
      clouds,
      debug,
      menu,
      player,
      server,
      sun,
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
        .divideScalar(scale)
        .floor();
      server.send(JSON.stringify({
        type: 'UPDATE',
        data: {
          x: chunks.aux.x,
          y: chunks.aux.y,
          z: chunks.aux.z,
          color: menu.blockColor,
          type: triggerDown ? menu.blockType : 0,
        },
      }));
    });

    chunks.aux
      .copy(player.position)
      .divideScalar(scale)
      .floor()
      .divideScalar(16)
      .floor();

    if (!chunks.player.equals(chunks.aux)) {
      chunks.player.copy(chunks.aux);
      debug.chunk.innerText = `${chunks.player.x}:${chunks.player.y}:${chunks.player.z}`;
      const maxDistance = renderRadius * 1.5;
      chunks.loaded.forEach((chunk) => {
        if (
          chunks.player.distanceTo(chunks.aux.set(chunk.x, chunks.player.y, chunk.z)) > maxDistance
        ) {
          this.unloadChunk(chunk);
        }
      });
      chunks.requested.forEach((chunk, key) => {
        if (
          chunks.player.distanceTo(chunks.aux.set(chunk.x, chunks.player.y, chunk.z)) > maxDistance
        ) {
          chunks.requested.delete(key);
        }
      });
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

    this.updateTime(renderer.animation.time);
    clouds.onAnimationTick(renderer.animation);
    sun.onAnimationTick(renderer.animation);
  }

  onEvent(event) {
    super.onEvent(event);
    const { type, data } = event;
    switch (type) {
      case 'INIT':
      case 'JOIN':
      case 'LEAVE':
        this.debug.players.innerText = this.peers.peers.length + 1;
        if (type === 'INIT') {
          this.onInit(data);
        }
        break;
      case 'UPDATE':
        this.onUpdate(data);
        break;
      default:
        break;
    }
  }

  onInit(data) {
    const { scale } = World;
    const { chunks, debug, player } = this;
    debug.seed.innerText = data.seed;
    player.position
      .copy(data.spawn)
      .multiplyScalar(scale)
      .add({
        x: 0.25,
        y: 0.5,
        z: 0.25,
      });
    chunks.loaded.clear();
    chunks.requested.clear();
    chunks.player
      .copy(player.position)
      .divideScalar(scale)
      .floor()
      .divideScalar(16)
      .floor()
      .add({ x: 0, y: -1, z: 0 });
  }

  onUpdate(data) {
    const { chunks, voxels } = this;
    data.chunks.forEach(({ chunk, meshes }) => {
      const key = `${chunk.x}:${chunk.z}`;
      if (!chunks.loaded.has(key) && !chunks.requested.has(key)) {
        return;
      }
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
      chunks.loaded.set(key, chunk);
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
    chunks.requested.set(key, chunk);
    server.send(JSON.stringify({
      type: 'LOAD',
      data: chunk,
    }));
  }

  unloadChunk(chunk) {
    const { chunks, voxels } = this;
    chunks.loaded.delete(`${chunk.x}:${chunk.z}`);
    for (let subchunk = 0; subchunk < 4; subchunk += 1) {
      const key = `${chunk.x}:${chunk.z}:${subchunk}`;
      const mesh = voxels.get(key);
      if (mesh) {
        mesh.dispose();
        this.remove(mesh);
        voxels.delete(key);
      }
    }
  }

  updateTime(time) {
    const { dayDuration } = World;
    const { background, fog, timeOffset } = this;
    time = ((timeOffset + time) % dayDuration) / dayDuration;
    const intensity = (time > 0.5 ? (1 - time) : time) * 2;
    background.setHSL(0.55, 0.4, Math.max(intensity, 0.1) * 0.5);
    fog.color.copy(background);
    Sun.updateMaterial({ intensity, time });
    Voxels.updateMaterial(intensity);
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

World.dayDuration = 600;
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
World.scale = 0.5;

export default World;
