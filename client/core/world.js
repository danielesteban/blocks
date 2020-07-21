import {
  Color,
  FogExp2,
  Vector2,
  Vector3,
} from './three.js';
import Ambient from './ambient.js';
import Birds from '../renderables/birds.js';
import Clouds from '../renderables/clouds.js';
import Menu from '../renderables/menu/index.js';
import Help from '../renderables/help.js';
import Photo from '../renderables/photo.js';
import Rain from '../renderables/rain.js';
import Room from './room.js';
import Sun from '../renderables/sun.js';
import Voxels from '../renderables/voxels.js';

class World extends Room {
  constructor(renderer) {
    super(renderer);

    this.chunks = {
      aux: new Vector3(),
      heightmaps: new Map(),
      loaded: new Map(),
      requested: new Map(),
      player: new Vector3(),
      voxels: new Map(),
    };

    this.ambient = new Ambient({ listener: this.player.head });
    this.background = new Color();
    this.birds = new Birds({ anchor: this.player });
    this.add(this.birds);
    this.fog = new FogExp2(0, 0);
    this.clouds = new Clouds({ anchor: this.player });
    this.add(this.clouds);
    this.rain = new Rain({ anchor: this.player, heightmaps: this.chunks.heightmaps });
    this.add(this.rain);
    this.sun = new Sun({ anchor: this.player });
    this.add(this.sun);
    this.timeOffset = Date.now() / 1000;

    this.menu = new Menu({ world: this });
    this.photo = new Photo({
      menu: this.menu,
      player: this.player,
      renderer: renderer.renderer,
    });
    const { attachments } = this.player;
    attachments.left = [this.menu];
    attachments.right = [this.photo];
    this.ui.push(
      this.menu,
      this.menu.tabs,
      this.photo.ui
    );
    this.player.setWelcome(new Help());

    this.updateRenderRadius(this.menu.settings.renderRadius);
    this.chunks.pool = [...Array(this.renderGrid.length * World.subchunks)].map(() => new Voxels());

    const params = World.getURLParams();
    if (params.location) {
      this.player.session
        .showLocation(params.location)
        .then((location) => this.goToLocation(location))
        .catch(() => (
          this.connect(params.server || document.location.toString())
        ));
    } else {
      this.connect(params.server || document.location.toString());
    }
  }

  goToLocation({ server, position, rotation }) {
    const { scale } = World;
    const { player } = this;
    const spawn = {
      position: (new Vector3())
        .copy(position)
        .multiplyScalar(scale)
        .add({
          x: 0.25,
          y: 0,
          z: 0.25,
        }),
      rotation,
    };
    if (this.server && this.server.serverURL === server.url) {
      player.setLocation(spawn);
    } else {
      player.spawn = spawn;
      this.connect(server.url);
    }
  }

  onBeforeRender(renderer, scene, camera) {
    super.onBeforeRender(renderer, scene, camera);
    const { blockFacings, scale } = World;
    const {
      ambient,
      birds,
      chunks,
      clouds,
      dom,
      menu,
      player,
      photo,
      rain,
      renderGrid,
      renderRadius,
      server,
      sun,
      translocables,
    } = this;

    player.controllers.forEach((controller) => {
      const {
        buttons: {
          grip,
          gripUp,
          primary,
          primaryDown,
          primaryUp,
          trigger,
          triggerUp,
        },
        hand,
        pointer,
        raycaster,
      } = controller;
      if (
        !hand
        || pointer.visible
        || !(
          grip
          || gripUp
          || primary
          || primaryUp
          || trigger
          || triggerUp
        )
      ) {
        return;
      }
      if (hand.handedness === 'right' && (primary || primaryUp)) {
        if (primaryDown) {
          photo.update(scene);
          ambient.trigger('shutter');
        }
        return;
      }
      const hit = (player.skinEditor ? (
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
      if (gripUp || primaryUp || triggerUp) {
        const { point, uv } = hit;
        const isPicking = primaryUp;
        const isRemoving = gripUp;
        point
          .addScaledVector(
            blockFacings[Math.floor(uv.y / 2)],
            (isPicking || isRemoving ? -1 : 1) * 0.25
          )
          .divideScalar(scale)
          .floor();
        if (isPicking) {
          if (player.skinEditor) {
            menu.picker.setColor(player.skinEditor.getColor(uv));
            return;
          }
          server.sendEvent({
            type: 'PICK',
            json: {
              x: point.x,
              y: point.y,
              z: point.z,
            },
          });
          return;
        }
        if (player.skinEditor) {
          player.skinEditor.updatePixel({
            color: `#${menu.picker.color.getHexString()}`,
            remove: isRemoving,
            uv,
          });
          return;
        }
        server.sendEvent({
          type: 'UPDATE',
          json: {
            x: point.x,
            y: point.y,
            z: point.z,
            color: menu.picker.color.getHex(),
            type: isRemoving ? 0 : menu.block.type,
          },
        });
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
      dom.chunk.innerText = `${chunks.player.x}:${chunks.player.y}:${chunks.player.z}`;
      this.needsTranslocablesUpdate = true;
      if (hasCrossedBorder) {
        const maxDistance = renderRadius * 1.25;
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
        menu.map.setChunk(chunks.player);
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
    const { type } = event;
    switch (type) {
      case 'INIT':
        this.onInit(event.json);
        break;
      case 'PICK':
        this.onPick(event.json);
        break;
      case 'TELEPORT':
        this.onTeleport(event.json);
        break;
      case 'UPDATE':
        this.onUpdate(event.chunks);
        break;
      default:
        break;
    }
  }

  onInit(data) {
    const { scale } = World;
    const {
      chunks,
      dom,
      menu,
      player,
      server,
    } = this;
    Voxels.updateMaterials({ atlas: `${server.serverURL}atlas` });
    if (data.id) {
      dom.server.href = `https://blocks.gatunes.com/destinations/#/server:${data.id}`;
      dom.server.innerText = data.name;
    } else {
      dom.server.removeAttribute('href');
      dom.server.innerText = (new URL(server.serverURL)).host;
    }
    menu.block.setBlocks(data.blocks);
    menu.map.setConnectedServer(server.serverURL);
    if (player.spawn) {
      player.setLocation(player.spawn);
      delete player.spawn;
    } else {
      player.position
        .copy(data.spawn)
        .multiplyScalar(scale)
        .add({
          x: 0.25,
          y: 0.5,
          z: 0.25,
        });
    }
    chunks.loaded.forEach((chunk) => this.unloadChunk(chunk));
    chunks.requested.clear();
    chunks.player.set(Infinity, Infinity, Infinity);
  }

  onPick({ type, color }) {
    const { menu } = this;
    menu.picker.setColor(color);
    menu.block.setType(type);
  }

  onTeleport(position) {
    const { scale } = World;
    const { player } = this;
    player.position
      .copy(position)
      .multiplyScalar(scale)
      .add({
        x: 0.25,
        y: 0.5,
        z: 0.25,
      });
  }

  onUpdate(data) {
    const { chunks } = this;
    data.forEach(({ x, z, meshes }) => {
      const key = `${x}:${z}`;
      if (!chunks.loaded.has(key) && !chunks.requested.has(key)) {
        return;
      }
      const heightmap = new Uint8Array(256);
      chunks.heightmaps.set(key, heightmap);
      meshes.forEach((geometries, subchunk) => {
        const key = `${x}:${z}:${subchunk}`;
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
          chunk: { x, y: subchunk, z },
          geometries,
          heightmap,
        });
      });
      chunks.loaded.set(key, { x, z });
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
    server.sendEvent({
      type: 'LOAD',
      json: chunk,
    });
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

  updateRenderRadius(radius) {
    const {
      chunks,
      fog,
      menu,
      server,
    } = this;
    fog.density = (24 - radius) * 0.002;
    this.renderGrid = World.getRenderGrid(radius);
    this.renderRadius = radius;
    menu.settings.setRenderRadius(radius);
    if (server) {
      chunks.player.set(Infinity, Infinity, Infinity);
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
    Voxels.updateMaterials({ intensity });
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
    chunks.voxels.forEach(({ chunk, meshes }) => {
      if (chunks.player.distanceTo(chunk) <= 4) {
        if (meshes.opaque.visible) {
          translocables.push(meshes.opaque);
        }
        if (meshes.transparent.visible) {
          translocables.push(meshes.transparent);
        }
      }
    });
    this.needsTranslocablesUpdate = false;
  }

  static getRenderGrid(radius) {
    const grid = [];
    const center = new Vector2();
    for (let x = -radius; x <= radius; x += 1) {
      for (let y = -radius; y <= radius; y += 1) {
        const chunk = new Vector2(x, y);
        if (chunk.distanceTo(center) <= radius) {
          grid.push(chunk);
        }
      }
    }
    grid.sort((a, b) => (a.distanceTo(center) - b.distanceTo(center)));
    return grid;
  }

  static getURLParams() {
    return document.location.hash.substr(2).split('/').reduce((keys, param) => {
      const [key, value] = param.split(':');
      keys[key] = decodeURIComponent(value);
      return keys;
    }, {});
  }
}

World.blockFacings = [
  new Vector3(0, 1, 0),
  new Vector3(0, -1, 0),
  new Vector3(0, 0, 1),
  new Vector3(0, 0, -1),
  new Vector3(-1, 0, 0),
  new Vector3(1, 0, 0),
];
World.dayDuration = 600;
World.rainInterval = 1500;
World.rainDuration = 300;
World.scale = 0.5;
World.subchunks = 4;

export default World;
