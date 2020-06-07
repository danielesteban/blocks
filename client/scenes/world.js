import {
  Color,
  FogExp2,
  Vector2,
  Vector3,
} from '../core/three.js';
import Ambient from '../core/ambient.js';
import Birds from '../renderables/birds.js';
import Clouds from '../renderables/clouds.js';
import MapUI from '../renderables/map.js';
import Menu from '../renderables/menu/index.js';
import Rain from '../renderables/rain.js';
import Scene from '../core/scene.js';
import Sun from '../renderables/sun.js';
import Voxels from '../renderables/voxels.js';

class World extends Scene {
  constructor(renderer) {
    super(renderer);

    this.chunks = {
      aux: new Vector3(),
      heightmaps: new Map(),
      loaded: new Map(),
      requested: new Map(),
      player: new Vector3(),
      pool: [...Array(World.renderGrid.length * World.subchunks)].map(() => new Voxels()),
      voxels: new Map(),
    };

    this.ambient = new Ambient({ listener: this.player.head });
    this.background = new Color();
    this.birds = new Birds({ anchor: this.player });
    this.add(this.birds);
    this.fog = new FogExp2(0, 0.02);
    this.clouds = new Clouds({ anchor: this.player });
    this.add(this.clouds);
    this.rain = new Rain({ anchor: this.player, heightmaps: this.chunks.heightmaps });
    this.add(this.rain);
    this.sun = new Sun({ anchor: this.player });
    this.add(this.sun);
    this.timeOffset = Date.now() / 1000;

    this.map = new MapUI();
    this.menu = new Menu({ world: this });
    const { attachments } = this.player;
    attachments.left = [this.menu];
    attachments.right = [this.map];
    this.ui.push(
      ...attachments.left,
      ...attachments.right
    );
  }

  onBeforeRender(renderer, scene, camera) {
    super.onBeforeRender(renderer, scene, camera);
    const {
      renderGrid,
      renderRadius,
      scale,
    } = World;
    const {
      ambient,
      birds,
      chunks,
      clouds,
      debug,
      map,
      menu,
      player,
      rain,
      server,
      sun,
      translocables,
    } = this;

    player.controllers.forEach((controller) => {
      const {
        buttons: {
          grip,
          gripUp,
          trigger,
          triggerUp,
        },
        hand,
        pointer,
        raycaster,
      } = controller;
      if (
        !hand
        || !(grip || gripUp || trigger || triggerUp)
        || pointer.visible
      ) {
        return;
      }
      const hit = (player.skinEditor && !menu.picker.isPicking ? (
        raycaster.intersectObject(player.skinEditor.getLayer())
      ) : (
        raycaster.intersectObjects(translocables)
      ))[0] || false;
      if (!hit) {
        return;
      }
      pointer.update({
        distance: hit.distance,
        origin: raycaster.ray.origin,
      });
      if (gripUp || triggerUp) {
        const { point, face, uv } = hit;
        const remove = grip || gripUp;
        if (menu.picker.isPicking) {
          point.fromBufferAttribute(hit.object.geometry.getAttribute('color'), face.a);
          menu.picker.setColor({ r: point.x, g: point.y, b: point.z });
          return;
        }
        if (player.skinEditor) {
          player.skinEditor.updatePixel({
            color: `#${menu.picker.color.getHexString()}`,
            remove,
            uv,
          });
          return;
        }
        point
          .addScaledVector(face.normal, (remove ? -1 : 1) * 0.25)
          .divideScalar(scale)
          .floor();
        server.send(JSON.stringify({
          type: 'UPDATE',
          data: {
            x: point.x,
            y: point.y,
            z: point.z,
            color: menu.picker.color.getHex(),
            type: remove ? 0 : menu.options.blockType,
          },
        }));
      }
    });

    chunks.aux
      .copy(player.position)
      .divideScalar(scale)
      .floor()
      .divideScalar(16)
      .floor();

    if (!chunks.player.equals(chunks.aux)) {
      const hasCrossedBorder = chunks.player.x !== chunks.aux.x || chunks.player.z !== chunks.aux.z;
      chunks.player.copy(chunks.aux);
      debug.chunk.innerText = `${chunks.player.x}:${chunks.player.y}:${chunks.player.z}`;
      this.needsTranslocablesUpdate = true;
      if (hasCrossedBorder) {
        const maxDistance = renderRadius * 1.5;
        chunks.loaded.forEach((chunk) => {
          if (
            chunks.player.distanceTo(
              chunks.aux.set(chunk.x, chunks.player.y, chunk.z)
            ) > maxDistance
          ) {
            this.unloadChunk(chunk);
          }
        });
        chunks.requested.forEach((chunk, key) => {
          if (
            chunks.player.distanceTo(
              chunks.aux.set(chunk.x, chunks.player.y, chunk.z)
            ) > maxDistance
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
        map.setChunk(chunks.player);
      }
    }

    if (this.needsTranslocablesUpdate) {
      this.updateTranslocables();
    }

    this.updateTime(renderer.animation.time);
    ambient.updateAltitude(player.position.y);
    birds.onAnimationTick(renderer.animation);
    clouds.onAnimationTick(renderer.animation);
    rain.onAnimationTick(renderer.animation);
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
    chunks.player.set(Infinity, Infinity, Infinity);
  }

  onUpdate(data) {
    const { chunks } = this;
    data.chunks.forEach(({ chunk, meshes }) => {
      const key = `${chunk.x}:${chunk.z}`;
      if (!chunks.loaded.has(key) && !chunks.requested.has(key)) {
        return;
      }
      const heightmap = new Uint8Array(256);
      chunks.heightmaps.set(key, heightmap);
      meshes.forEach(([opaque, transparent], subchunk) => {
        const key = `${chunk.x}:${chunk.z}:${subchunk}`;
        let mesh = chunks.voxels.get(key);
        if (!mesh) {
          mesh = chunks.pool.shift();
          if (!mesh) {
            mesh = new Voxels();
          }
          this.add(mesh);
          chunks.voxels.set(key, mesh);
        }
        mesh.update({
          chunk: { ...chunk, y: subchunk },
          heightmap,
          opaque,
          transparent,
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
    const { chunks } = this;
    const key = `${chunk.x}:${chunk.z}`;
    chunks.heightmaps.delete(key);
    chunks.loaded.delete(key);
    for (let subchunk = 0; subchunk < World.subchunks; subchunk += 1) {
      const subchunkKey = `${key}:${subchunk}`;
      const mesh = chunks.voxels.get(subchunkKey);
      if (mesh) {
        this.remove(mesh);
        chunks.voxels.delete(subchunkKey);
        chunks.pool.push(mesh);
      }
    }
  }

  updateTime(time) {
    const { dayDuration, rainInterval, rainDuration } = World;
    const {
      ambient,
      background,
      fog,
      rain,
      timeOffset,
    } = this;
    time = timeOffset + time;
    const dayTime = (time % dayDuration) / dayDuration;
    const intensity = (dayTime > 0.5 ? (1 - dayTime) : dayTime) * 2;
    background.setHSL(0.55, 0.4, Math.max(intensity, 0.1) * 0.5);
    fog.color.copy(background);
    Birds.updateMaterial(intensity);
    Clouds.updateMaterial(intensity);
    Rain.updateMaterial(intensity);
    Sun.updateMaterial({ intensity, time: dayTime });
    Voxels.updateMaterial(intensity);
    const isRaining = (time % rainInterval) < rainDuration;
    if (rain.visible !== isRaining) {
      rain.reset();
      rain.visible = isRaining;
      ambient.updateEffect({ name: 'rain', enabled: isRaining });
    }
  }

  updateTranslocables() {
    const { chunks, translocables } = this;
    translocables.length = 0;
    chunks.voxels.forEach((mesh) => {
      if (chunks.player.distanceTo(mesh.chunk) <= 4) {
        translocables.push(mesh, mesh.transparentMesh);
      }
    });
    this.needsTranslocablesUpdate = false;
  }
}

World.dayDuration = 600;
World.rainInterval = 1000;
World.rainDuration = 300;
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
World.subchunks = 4;

export default World;
