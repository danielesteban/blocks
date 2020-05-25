const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class Chunk {
  constructor({
    x,
    z,
    world,
  }) {
    this.x = x;
    this.z = z;
    this.world = world;
    if (!world.storage) {
      this.generate();
      return;
    }
    try {
      this.load();
    } catch (e) {
      this.generate();
    }
  }

  generate() {
    const { maxHeight, size } = Chunk;
    const { world: { generator } } = this;
    const offset = { x: this.x * size, z: this.z * size };
    const voxels = [];
    for (let x = 0; x < size; x += 1) {
      voxels[x] = [];
      for (let y = 0; y < maxHeight; y += 1) {
        voxels[x][y] = [];
        for (let z = 0; z < size; z += 1) {
          voxels[x][y][z] = {
            ...generator(
              offset.x + x,
              y,
              offset.z + z
            ),
            chunk: this,
          };
        }
      }
    }
    this.needsLightPropagation = true;
    this.needsPersistence = true;
    this.voxels = voxels;
    this.generateHeightmap();
  }

  generateHeightmap() {
    const {
      maxHeight,
      size,
      types,
    } = Chunk;
    const {
      voxels,
    } = this;
    const heightmap = [];
    for (let x = 0; x < size; x += 1) {
      heightmap[x] = [];
      for (let z = 0; z < size; z += 1) {
        heightmap[x][z] = 0;
        for (let y = maxHeight - 1; y >= 0; y -= 1) {
          if (voxels[x][y][z].type !== types.air) {
            heightmap[x][z] = y;
            break;
          }
        }
      }
    }
    this.heightmap = heightmap;
  }

  load() {
    const { x, z, world } = this;
    const {
      needsLightPropagation,
      voxels,
    } = JSON.parse(zlib.inflateSync(fs.readFileSync(path.join(world.storage, `${x}_${z}.json.gz`))));
    this.needsLightPropagation = needsLightPropagation;
    this.needsPersistence = false;
    this.voxels = voxels.map((z) => z.map((y) => y.map(([
      type,
      color,
      light,
      sunlight,
    ]) => ({
      type,
      color: {
        r: (color >> 16) & 0xFF,
        g: (color >> 8) & 0xFF,
        b: color & 0xFF,
      },
      light,
      sunlight,
      chunk: this,
    }))));
    this.generateHeightmap();
  }

  persist() {
    const {
      x,
      z,
      needsLightPropagation,
      voxels,
      world: { storage },
    } = this;
    if (!storage) {
      return;
    }
    fs.writeFileSync(path.join(storage, `${x}_${z}.json.gz`), zlib.deflateSync(JSON.stringify({
      needsLightPropagation,
      voxels: voxels.map((z) => z.map((y) => y.map(({
        type,
        color,
        light,
        sunlight,
      }) => ([
        type,
        (color.r << 16) | (color.g << 8) | color.b,
        light,
        sunlight,
      ])))),
    })));
    this.needsPersistence = false;
  }

  get(x, y, z) {
    const {
      maxHeight,
      maxLight,
      size,
      types,
    } = Chunk;
    const { world } = this;
    if (y < 0) return { type: types.bedrock, light: 0, sunlight: 0 };
    if (y >= maxHeight) return { type: types.air, light: 0, sunlight: maxLight };
    let chunk = this;
    const cx = (x < 0 || x >= size) ? Math.floor(x / size) : 0;
    const cz = (z < 0 || z >= size) ? Math.floor(z / size) : 0;
    if (cx || cz) {
      chunk = world.getChunk({
        x: this.x + cx,
        z: this.z + cz,
      });
      x -= size * cx;
      z -= size * cz;
    }
    return chunk.voxels[x][y][z];
  }

  floodLight(queue, key = 'light') {
    const {
      isTransparent,
      maxHeight,
      maxLight,
      voxelNeighbors,
    } = Chunk;
    const isSunLight = key === 'sunlight';
    while (queue.length) {
      const { x, y, z } = queue.shift();
      const voxel = this.get(x, y, z);
      voxelNeighbors.forEach((offset) => {
        const ny = y + offset.y;
        if (ny < 0 || ny >= maxHeight) {
          return;
        }
        const nx = x + offset.x;
        const nz = z + offset.z;
        const neighbor = this.get(nx, ny, nz);
        const decay = (!isSunLight || offset.y !== -1 || voxel[key] !== maxLight) ? 1 : 0;
        if (isTransparent(neighbor.type) && neighbor[key] + decay < voxel[key]) {
          neighbor[key] = voxel[key] - decay;
          neighbor.chunk.needsPersistence = true;
          queue.push({ x: nx, y: ny, z: nz });
        }
      });
    }
  }

  removeLight(x, y, z, key = 'light') {
    const { maxHeight, maxLight, voxelNeighbors } = Chunk;
    const voxel = this.get(x, y, z);
    const fill = [];
    const queue = [];
    queue.push({
      x,
      y,
      z,
      light: voxel[key],
    });
    voxel[key] = 0;
    voxel.chunk.needsPersistence = true;
    const isSunLight = key === 'sunlight';
    while (queue.length) {
      const {
        x,
        y,
        z,
        light,
      } = queue.shift();
      voxelNeighbors.forEach((offset) => {
        const ny = y + offset.y;
        if (ny < 0 || ny >= maxHeight) {
          return;
        }
        const nx = x + offset.x;
        const nz = z + offset.z;
        const neighbor = this.get(nx, ny, nz);
        if (
          neighbor[key] !== 0
          && (
            neighbor[key] < light
            || (
              isSunLight
              && offset.y === -1
              && light === maxLight
              && neighbor[key] === maxLight
            )
          )
        ) {
          queue.push({
            x: nx,
            y: ny,
            z: nz,
            light: neighbor[key],
          });
          neighbor[key] = 0;
          neighbor.chunk.needsPersistence = true;
        } else if (neighbor[key] >= light) {
          fill.push({
            x: nx,
            y: ny,
            z: nz,
          });
        }
      });
    }
    this.floodLight(fill, key);
  }

  propagateLight() {
    const {
      isTransparent,
      maxHeight,
      maxLight,
      size,
      types,
    } = Chunk;
    const { voxels } = this;
    const lightQueue = [];
    const sunlightQueue = [];
    const top = maxHeight - 1;
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < maxHeight; y += 1) {
        for (let z = 0; z < size; z += 1) {
          const voxel = voxels[x][y][z];
          if (y === top && isTransparent(voxel.type)) {
            voxel.sunlight = maxLight;
            sunlightQueue.push({
              x,
              y,
              z,
            });
          }
          if (voxel.type === types.light) {
            voxel.light = maxLight;
            voxel.color.r = 0xFF;
            voxel.color.g = 0xFF;
            voxel.color.b = 0xFF;
            lightQueue.push({
              x,
              y,
              z,
            });
          }
        }
      }
    }
    this.floodLight(lightQueue, 'light');
    this.floodLight(sunlightQueue, 'sunlight');
    this.needsLightPropagation = false;
    this.needsPersistence = true;
  }

  update({
    x,
    y,
    z,
    color = { r: 0, g: 0, b: 0 },
    type,
  }) {
    const {
      isTransparent,
      maxHeight,
      maxLight,
      types,
      voxelNeighbors,
    } = Chunk;
    const { heightmap } = this;
    const voxel = this.get(x, y, z);
    const { type: current } = voxel;
    voxel.type = type;
    voxel.color.r = color.r;
    voxel.color.g = color.g;
    voxel.color.b = color.b;
    if (isTransparent(current)) {
      ['light', 'sunlight'].forEach((key) => {
        if (voxel[key] !== 0) {
          this.removeLight(x, y, z, key);
        }
      });
    }
    if (current === types.light) {
      this.removeLight(x, y, z);
    }
    if (isTransparent(type)) {
      ['light', 'sunlight'].forEach((key) => {
        const queue = [];
        if (key === 'sunlight' && y === maxHeight - 1) {
          voxel.sunlight = maxLight;
          queue.push({ x, y, z });
        } else {
          voxelNeighbors.forEach((offset) => {
            const ny = y + offset.y;
            if (ny < 0 || ny >= maxHeight) {
              return;
            }
            const nx = x + offset.x;
            const nz = z + offset.z;
            const neighbor = this.get(nx, ny, nz);
            if (isTransparent(neighbor.type) && neighbor[key] !== 0) {
              queue.push({ x: nx, y: ny, z: nz });
            }
          });
        }
        this.floodLight(queue, key);
      });
      if (heightmap[x][z] === y) {
        for (let i = y - 1; i >= 0; i -= 1) {
          if (this.get(x, i, z).type !== types.air) {
            heightmap[x][z] = i;
            break;
          }
        }
      }
    } else {
      if (type === types.light) {
        voxel.color.r = 0xFF;
        voxel.color.g = 0xFF;
        voxel.color.b = 0xFF;
        voxel.light = maxLight;
        this.floodLight([{ x, y, z }]);
      }
      if (heightmap[x][z] < y) {
        heightmap[x][z] = y;
      }
    }
    this.needsPersistence = true;
  }

  getSerializedMeshes() {
    const { meshes } = this;
    return meshes.map((geometry) => geometry.map(({
      color,
      light,
      position,
    }) => ({
      color: color.toString('base64'),
      light: light.toString('base64'),
      position: position.toString('base64'),
    })));
  }

  remesh() {
    const { chunkNeighbors, subchunks } = Chunk;
    const { world } = this;
    this.meshes = [];
    if (this.needsLightPropagation) {
      this.propagateLight();
    }
    chunkNeighbors.forEach(({ x, z }) => {
      const neighbor = world.getChunk({ x: this.x + x, z: this.z + z });
      if (neighbor.needsLightPropagation) {
        neighbor.propagateLight();
      }
    });
    for (let subchunk = 0; subchunk < subchunks; subchunk += 1) {
      this.meshSubChunk(subchunk);
    }
  }

  static isTransparent(type) {
    const { types } = Chunk;
    return type === types.air || type === types.glass;
  }

  static isVisible(type, neighbor) {
    const { types } = Chunk;
    if (type === types.glass) {
      return neighbor === types.air;
    }
    return neighbor === types.air || neighbor === types.glass;
  }

  static getLighting(light, sunlight, neighbors) {
    const { isTransparent, types } = Chunk;
    const n1 = neighbors[0].type !== types.air;
    const n2 = neighbors[1].type !== types.air;
    const n3 = (n1 && n2) || (neighbors[2].type !== types.air);
    let c = 1;
    neighbors.forEach((n) => {
      if (isTransparent(n.type)) {
        light += n.light;
        c += 1;
      }
    });
    light = Math.round(light / c);
    c = 1;
    neighbors.forEach((n) => {
      if (isTransparent(n.type)) {
        sunlight += n.sunlight;
        c += 1;
      }
    });
    sunlight = Math.round(sunlight / c);
    const ao = [n1, n2, n3].reduce((ao, n) => (
      ao - (n ? 0.2 : 0)
    ), 1);
    return {
      ao,
      light,
      sunlight,
      combined: ao * (light + sunlight) * 0.5,
    };
  }

  meshSubChunk(subchunk) {
    const {
      getLighting,
      isTransparent,
      isVisible,
      size,
      types,
    } = Chunk;
    const geometry = {
      opaque: {
        color: [],
        light: [],
        position: [],
      },
      transparent: {
        color: [],
        light: [],
        position: [],
      },
    };
    const pushFace = (
      /* eslint-disable no-multi-spaces */
      p1, n1,  // bottom left point + neighbours
      p2, n2,  // bottom right point + neighbours
      p3, n3,  // top right point + neighbours
      p4, n4,  // top left point + neighbours
      c,       // color
      t,       // type
      l,       // light level
      s        // sunlight level
      /* eslint-enable no-multi-spaces */
    ) => {
      const lighting = [
        getLighting(l, s, n1),
        getLighting(l, s, n2),
        getLighting(l, s, n3),
        getLighting(l, s, n4),
      ];
      const vertices = [p1, p2, p3, p4];
      if (
        lighting[0].combined + lighting[2].combined < lighting[1].combined + lighting[3].combined
      ) {
        lighting.unshift(lighting.pop());
        vertices.unshift(vertices.pop());
      }
      const mesh = isTransparent(t) ? geometry.transparent : geometry.opaque;
      lighting.forEach((lighting) => {
        mesh.color.push(
          Math.round(c.r * lighting.ao),
          Math.round(c.g * lighting.ao),
          Math.round(c.b * lighting.ao)
        );
        mesh.light.push(
          (lighting.light << 4) | lighting.sunlight
        );
      });
      vertices.forEach((vertex) => mesh.position.push(...vertex));
    };
    const yFrom = size * subchunk;
    const yTo = yFrom + size;
    for (let x = 0; x < size; x += 1) {
      for (let y = yFrom; y < yTo; y += 1) {
        for (let z = 0; z < size; z += 1) {
          const voxel = this.get(x, y, z);
          if (voxel.type !== types.air) {
            const top = this.get(x, y + 1, z);
            if (isVisible(voxel.type, top.type)) {
              const n = this.get(x, y + 1, z - 1);
              const e = this.get(x + 1, y + 1, z);
              const w = this.get(x - 1, y + 1, z);
              const s = this.get(x, y + 1, z + 1);
              pushFace(
                [x, y + 1, z + 1], [w, s, this.get(x - 1, y + 1, z + 1)],
                [x + 1, y + 1, z + 1], [e, s, this.get(x + 1, y + 1, z + 1)],
                [x + 1, y + 1, z], [e, n, this.get(x + 1, y + 1, z - 1)],
                [x, y + 1, z], [w, n, this.get(x - 1, y + 1, z - 1)],
                voxel.color,
                voxel.type,
                top.light,
                top.sunlight
              );
            }
            const bottom = this.get(x, y - 1, z);
            if (isVisible(voxel.type, bottom.type)) {
              const n = this.get(x, y - 1, z - 1);
              const e = this.get(x + 1, y - 1, z);
              const w = this.get(x - 1, y - 1, z);
              const s = this.get(x, y - 1, z + 1);
              pushFace(
                [x, y, z], [w, n, this.get(x - 1, y - 1, z - 1)],
                [x + 1, y, z], [e, n, this.get(x + 1, y - 1, z - 1)],
                [x + 1, y, z + 1], [e, s, this.get(x + 1, y - 1, z + 1)],
                [x, y, z + 1], [w, s, this.get(x - 1, y - 1, z + 1)],
                voxel.color,
                voxel.type,
                bottom.light,
                bottom.sunlight
              );
            }
            const south = this.get(x, y, z + 1);
            if (isVisible(voxel.type, south.type)) {
              const e = this.get(x + 1, y, z + 1);
              const w = this.get(x - 1, y, z + 1);
              const t = this.get(x, y + 1, z + 1);
              const b = this.get(x, y - 1, z + 1);
              pushFace(
                [x, y, z + 1], [w, b, this.get(x - 1, y - 1, z + 1)],
                [x + 1, y, z + 1], [e, b, this.get(x + 1, y - 1, z + 1)],
                [x + 1, y + 1, z + 1], [e, t, this.get(x + 1, y + 1, z + 1)],
                [x, y + 1, z + 1], [w, t, this.get(x - 1, y + 1, z + 1)],
                voxel.color,
                voxel.type,
                south.light,
                south.sunlight
              );
            }
            const north = this.get(x, y, z - 1);
            if (isVisible(voxel.type, north.type)) {
              const e = this.get(x + 1, y, z - 1);
              const w = this.get(x - 1, y, z - 1);
              const t = this.get(x, y + 1, z - 1);
              const b = this.get(x, y - 1, z - 1);
              pushFace(
                [x + 1, y, z], [e, b, this.get(x + 1, y - 1, z - 1)],
                [x, y, z], [w, b, this.get(x - 1, y - 1, z - 1)],
                [x, y + 1, z], [w, t, this.get(x - 1, y + 1, z - 1)],
                [x + 1, y + 1, z], [e, t, this.get(x + 1, y + 1, z - 1)],
                voxel.color,
                voxel.type,
                north.light,
                north.sunlight
              );
            }
            const west = this.get(x + 1, y, z);
            if (isVisible(voxel.type, west.type)) {
              const n = this.get(x + 1, y, z - 1);
              const s = this.get(x + 1, y, z + 1);
              const t = this.get(x + 1, y + 1, z);
              const b = this.get(x + 1, y - 1, z);
              pushFace(
                [x + 1, y, z + 1], [s, b, this.get(x + 1, y - 1, z + 1)],
                [x + 1, y, z], [n, b, this.get(x + 1, y - 1, z - 1)],
                [x + 1, y + 1, z], [n, t, this.get(x + 1, y + 1, z - 1)],
                [x + 1, y + 1, z + 1], [s, t, this.get(x + 1, y + 1, z + 1)],
                voxel.color,
                voxel.type,
                west.light,
                west.sunlight
              );
            }
            const east = this.get(x - 1, y, z);
            if (isVisible(voxel.type, east.type)) {
              const n = this.get(x - 1, y, z - 1);
              const s = this.get(x - 1, y, z + 1);
              const t = this.get(x - 1, y + 1, z);
              const b = this.get(x - 1, y - 1, z);
              pushFace(
                [x, y, z], [n, b, this.get(x - 1, y - 1, z - 1)],
                [x, y, z + 1], [s, b, this.get(x - 1, y - 1, z + 1)],
                [x, y + 1, z + 1], [s, t, this.get(x - 1, y + 1, z + 1)],
                [x, y + 1, z], [n, t, this.get(x - 1, y + 1, z - 1)],
                voxel.color,
                voxel.type,
                east.light,
                east.sunlight
              );
            }
          }
        }
      }
    }
    this.meshes[subchunk] = [
      geometry.opaque,
      geometry.transparent,
    ].map(({ color, light, position }) => ({
      color: Buffer.from((new Uint8Array(color)).buffer),
      light: Buffer.from((new Uint8Array(light)).buffer),
      position: Buffer.from((new Int16Array(position)).buffer),
    }));
  }
}

Chunk.size = 16;
Chunk.subchunks = 3;
Chunk.maxHeight = Chunk.size * Chunk.subchunks;
Chunk.maxLight = 15;
Chunk.types = {
  air: 0x00,
  block: 0x01,
  glass: 0x02,
  light: 0x03,
  bedrock: 0xFF,
};
Chunk.chunkNeighbors = [
  { x: -1, z: -1 },
  { x: 0, z: -1 },
  { x: 1, z: -1 },
  { x: -1, z: 0 },
  { x: 1, z: 0 },
  { x: -1, z: 1 },
  { x: 0, z: 1 },
  { x: 1, z: 1 },
];
Chunk.voxelNeighbors = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
];

module.exports = Chunk;
