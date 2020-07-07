const { hsl2Rgb } = require('colorsys');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Mesher = require('./mesher');

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

  load() {
    const {
      x,
      z,
      world: { storage },
    } = this;
    const {
      needsPropagation,
      voxels,
    } = JSON.parse(fs.readFileSync(path.join(storage, `${x}_${z}.json`)));
    this.needsPropagation = needsPropagation;
    this.needsPersistence = false;
    this.voxels = zlib.inflateSync(Buffer.from(voxels, 'base64'));
    this.generateHeightmap();
  }

  persist() {
    const {
      x,
      z,
      needsPropagation,
      voxels,
      world: { storage },
    } = this;
    if (!storage) {
      return;
    }
    fs.writeFileSync(path.join(storage, `${x}_${z}.json`), JSON.stringify({
      needsPropagation,
      voxels: zlib.deflateSync(voxels).toString('base64'),
    }));
    this.needsPersistence = false;
  }

  get(x, z) {
    const { size } = Chunk;
    const { world } = this;
    let chunk = this;
    const nx = (x < 0 || x >= size) ? Math.floor(x / size) : 0;
    const nz = (z < 0 || z >= size) ? Math.floor(z / size) : 0;
    if (nx || nz) {
      chunk = world.getChunk({
        x: this.x + nx,
        z: this.z + nz,
      });
      x -= size * nx;
      z -= size * nz;
    }
    return { chunk, cx: x, cz: z };
  }

  static getVoxel(x, y, z) {
    const { fields, maxHeight, size } = Chunk;
    return ((x * size * maxHeight) + (y * size) + z) * fields.count;
  }

  generate() {
    const {
      fields,
      getVoxel,
      maxHeight,
      size,
    } = Chunk;
    const { world: { generator } } = this;
    const offset = { x: this.x * size, z: this.z * size };
    this.needsPropagation = true;
    this.needsPersistence = true;
    const voxels = new Uint8Array(size * size * maxHeight * fields.count);
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < maxHeight; y += 1) {
        for (let z = 0; z < size; z += 1) {
          const { type, color } = generator.terrain(offset.x + x, y, offset.z + z);
          const voxel = getVoxel(x, y, z);
          voxels[voxel] = type;
          voxels[voxel + fields.r] = color.r;
          voxels[voxel + fields.g] = color.g;
          voxels[voxel + fields.b] = color.b;
          voxels[voxel + fields.light] = 0;
          voxels[voxel + fields.sunlight] = 0;
        }
      }
    }
    this.voxels = voxels;
    this.generateHeightmap();
    if (generator.saplings) {
      for (let x = 0; x < size; x += 1) {
        for (let z = 0; z < size; z += 1) {
          const y = this.heightmap[(x * size) + z] + 1;
          const sapling = generator.saplings(offset.x + x, y, offset.z + z);
          if (sapling) {
            const voxel = getVoxel(x, y, z);
            voxels[voxel] = generator.types.sapling;
            voxels[voxel + fields.r] = sapling.r;
            voxels[voxel + fields.g] = sapling.g;
            voxels[voxel + fields.b] = sapling.b;
          }
        }
      }
    }
  }

  generateHeightmap() {
    const {
      getVoxel,
      maxHeight,
      size,
    } = Chunk;
    const {
      voxels,
      world: { generator: { types } },
    } = this;
    const heightmap = new Uint8Array(size ** 2);
    for (let x = 0; x < size; x += 1) {
      for (let z = 0; z < size; z += 1) {
        for (let y = maxHeight - 1; y >= 0; y -= 1) {
          if (
            y === 0
            || voxels[getVoxel(x, y, z)] !== types.air
          ) {
            heightmap[(x * size) + z] = y;
            break;
          }
        }
      }
    }
    this.heightmap = heightmap;
  }

  generateTree({
    sapling,
    height,
    hue,
    radius,
  }) {
    const {
      getVoxel,
      maxHeight,
      voxelNeighbors,
    } = Chunk;
    const { world: { generator: { noise, types } } } = this;
    const branches = height + radius * 0.5;
    const queue = [sapling];
    while (queue.length) {
      const {
        x,
        y,
        z,
        distance = 0,
      } = queue.shift();
      if (y < 0 || y >= maxHeight) {
        return;
      }
      const isTrunk = distance < height;
      const { chunk, cx, cz } = this.get(x, z);
      const colorOffset = isTrunk ? -10 : (Math.max(distance - height, 0) / radius) * 10;
      const hsl = {
        h: (hue / 0xFF) * 360,
        s: 60 + colorOffset,
        l: 30 + colorOffset,
      };
      const color = hsl2Rgb(hsl);
      color.r += Math.floor(Math.random() * hsl.l) - hsl.l * 0.5;
      color.r = Math.min(Math.max(color.r, 0), 0xFF);
      color.g += Math.floor(Math.random() * hsl.l) - hsl.l * 0.5;
      color.g = Math.min(Math.max(color.g, 0), 0xFF);
      color.b += Math.floor(Math.random() * hsl.l) - hsl.l * 0.5;
      color.b = Math.min(Math.max(color.b, 0), 0xFF);
      chunk.update({
        x: cx,
        y,
        z: cz,
        color,
        type: (isTrunk || distance < branches) ? types.trunk : types.leaves,
      });
      const pushNeighbor = (offset) => {
        const nx = x + offset.x;
        const ny = y + offset.y;
        const nz = z + offset.z;
        const { chunk, cx, cz } = this.get(nx, nz);
        if (chunk.voxels[getVoxel(cx, ny, cz)] === types.air) {
          queue.push({
            x: nx,
            y: ny,
            z: nz,
            distance: distance + 1,
          });
          return true;
        }
        return false;
      };
      if (isTrunk) {
        pushNeighbor({ x: 0, y: 1, z: 0 });
      } else if (distance === height) {
        voxelNeighbors.forEach((offset) => {
          if (offset.y !== -1) {
            pushNeighbor(offset);
          }
        });
      } else if (distance < (height + radius)) {
        let count = 0;
        const neighbors = voxelNeighbors.length;
        for (let i = 0; i < neighbors; i += 1) {
          const neighbor = voxelNeighbors[
            Math.floor(
              Math.abs(noise.GetWhiteNoise((x + i) * 2, (y - i) / 2, (z + i) * 2)) * neighbors
            )
          ];
          if (pushNeighbor(neighbor)) {
            count += 1;
            if (count >= 2) {
              break;
            }
          }
        }
      }
    }
  }

  propagate() {
    const {
      fields,
      getVoxel,
      maxHeight,
      maxLight,
      size,
    } = Chunk;
    this.needsPropagation = false;
    const { voxels, world: { generator: { types } } } = this;
    const lightQueue = [];
    const sunlightQueue = [];
    const trees = [];
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < maxHeight; y += 1) {
        for (let z = 0; z < size; z += 1) {
          const voxel = getVoxel(x, y, z);
          const type = voxels[voxel];
          if (type === types.sapling) {
            trees.push({
              sapling: { x, y, z },
              height: voxels[voxel + fields.r],
              hue: voxels[voxel + fields.g],
              radius: voxels[voxel + fields.b],
            });
          } else if (types[type].isLight) {
            voxels[voxel + fields.light] = maxLight;
            lightQueue.push({ x, y, z });
          }
        }
      }
    }
    trees.forEach((tree) => this.generateTree(tree));
    const top = maxHeight - 1;
    for (let x = 0; x < size; x += 1) {
      for (let z = 0; z < size; z += 1) {
        const voxel = getVoxel(x, top, z);
        const type = voxels[voxel];
        if (types[type].isTransparent) {
          voxels[voxel + fields.sunlight] = maxLight;
          sunlightQueue.push({ x, y: top, z });
        }
      }
    }
    this.floodLight(lightQueue, 'light');
    this.floodLight(sunlightQueue, 'sunlight');
    this.needsPersistence = true;
  }

  floodLight(queue, key = 'light') {
    const {
      fields,
      getVoxel,
      maxHeight,
      maxLight,
      size,
      voxelNeighbors,
    } = Chunk;
    const { world: { generator: { types } } } = this;
    const isSunLight = key === 'sunlight';
    while (queue.length) {
      const { x, y, z } = queue.shift();
      const { chunk, cx, cz } = this.get(x, z);
      const light = chunk.voxels[
        getVoxel(cx, y, cz) + fields[key]
      ];
      voxelNeighbors.forEach((offset) => {
        const ny = y + offset.y;
        if (ny < 0 || ny >= maxHeight) {
          return;
        }
        const nx = x + offset.x;
        const nz = z + offset.z;
        const nl = light - ((isSunLight && offset.y === -1 && light === maxLight) ? 0 : 1);
        const { chunk, cx, cz } = this.get(nx, nz);
        const voxel = getVoxel(cx, ny, cz);
        if (
          !types[chunk.voxels[voxel]].isTransparent
          || (
            isSunLight
            && offset.y !== -1
            && light === maxLight
            && ny > chunk.heightmap[(cx * size) + cz]
          )
          || chunk.voxels[voxel + fields[key]] >= nl
        ) {
          return;
        }
        chunk.voxels[voxel + fields[key]] = nl;
        chunk.needsPersistence = true;
        queue.push({ x: nx, y: ny, z: nz });
      });
    }
  }

  removeLight(x, y, z, key = 'light') {
    const {
      fields,
      getVoxel,
      maxHeight,
      maxLight,
      voxelNeighbors,
    } = Chunk;
    const { chunk, cx, cz } = this.get(x, z);
    const voxel = getVoxel(cx, y, cz);
    const fill = [];
    const queue = [];
    queue.push({
      x,
      y,
      z,
      light: chunk.voxels[voxel + fields[key]],
    });
    chunk.voxels[voxel + fields[key]] = 0;
    chunk.needsPersistence = true;
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
        const { chunk, cx, cz } = this.get(nx, nz);
        const voxel = getVoxel(cx, ny, cz);
        const nl = chunk.voxels[voxel + fields[key]];
        if (nl === 0) {
          return;
        }
        if (
          nl < light
          || (
            isSunLight
            && offset.y === -1
            && light === maxLight
            && nl === maxLight
          )
        ) {
          queue.push({
            x: nx,
            y: ny,
            z: nz,
            light: nl,
          });
          chunk.voxels[voxel + fields[key]] = 0;
          chunk.needsPersistence = true;
        } else if (nl >= light) {
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

  update({
    x,
    y,
    z,
    color = { r: 0, g: 0, b: 0 },
    type,
  }) {
    const {
      fields,
      getVoxel,
      maxHeight,
      maxLight,
      size,
      voxelNeighbors,
    } = Chunk;
    const {
      heightmap,
      needsPropagation,
      voxels,
      world: { generator: { types } },
    } = this;
    const voxel = getVoxel(x, y, z);
    const current = voxels[voxel];
    voxels[voxel] = type;
    voxels[voxel + fields.r] = color.r;
    voxels[voxel + fields.g] = color.g;
    voxels[voxel + fields.b] = color.b;
    const heightIndex = (x * size) + z;
    const height = heightmap[heightIndex];
    if (type === types.air) {
      if (y === height) {
        for (let i = y - 1; i >= 0; i -= 1) {
          if (i === 0 || voxels[getVoxel(x, i, z)] !== types.air) {
            heightmap[heightIndex] = i;
            break;
          }
        }
      }
    } else if (height < y) {
      heightmap[heightIndex] = y;
    }
    if (!needsPropagation) {
      if (types[current].isLight) {
        this.removeLight(x, y, z);
      } else if (types[current].isTransparent && !types[type].isTransparent) {
        ['light', 'sunlight'].forEach((key) => {
          if (voxels[voxel + fields[key]] !== 0) {
            this.removeLight(x, y, z, key);
          }
        });
      }
      if (types[type].isLight) {
        voxels[voxel + fields.light] = maxLight;
        this.floodLight([{ x, y, z }]);
      } else if (types[type].isTransparent && !types[current].isTransparent) {
        ['light', 'sunlight'].forEach((key) => {
          const queue = [];
          if (key === 'sunlight' && y === maxHeight - 1) {
            voxels[voxel + fields[key]] = maxLight;
            queue.push({ x, y, z });
          } else {
            voxelNeighbors.forEach((offset) => {
              const ny = y + offset.y;
              if (ny < 0 || ny >= maxHeight) {
                return;
              }
              const nx = x + offset.x;
              const nz = z + offset.z;
              const { chunk, cx, cz } = this.get(nx, nz);
              const voxel = getVoxel(cx, ny, cz);
              const { isLight, isTransparent } = types[chunk.voxels[voxel]];
              if (
                chunk.voxels[voxel + fields[key]] !== 0
                && (isTransparent || (isLight && key === 'light'))
              ) {
                queue.push({ x: nx, y: ny, z: nz });
              }
            });
          }
          this.floodLight(queue, key);
        });
      }
    }
    this.needsPersistence = true;
  }

  remesh() {
    const { chunkNeighbors, subchunks } = Chunk;
    const { world } = this;
    this.meshes = [];
    if (this.needsPropagation) {
      this.propagate();
    }
    chunkNeighbors.forEach(({ x, z }) => {
      const neighbor = world.getChunk({ x: this.x + x, z: this.z + z });
      if (neighbor.needsPropagation) {
        neighbor.propagate();
      }
    });
    for (let subchunk = 0; subchunk < subchunks; subchunk += 1) {
      this.meshSubChunk(subchunk);
    }
  }

  meshSubChunk(subchunk) {
    const {
      getVoxel,
      fields,
      maxHeight,
      maxLight,
      size,
    } = Chunk;
    const { world: { generator: { types } } } = this;
    const bottom = { type: types.dirt, light: 0, sunlight: 0 };
    const top = { type: types.air, light: 0, sunlight: maxLight };
    this.meshes[subchunk] = Mesher({
      get: (x, y, z) => {
        if (y < 0) {
          return bottom;
        }
        if (y >= maxHeight) {
          return top;
        }
        const { chunk, cx, cz } = this.get(x, z);
        const voxel = getVoxel(cx, y, cz);
        return {
          type: chunk.voxels[voxel],
          color: {
            r: chunk.voxels[voxel + fields.r],
            g: chunk.voxels[voxel + fields.g],
            b: chunk.voxels[voxel + fields.b],
          },
          light: chunk.voxels[voxel + fields.light],
          sunlight: chunk.voxels[voxel + fields.sunlight],
        };
      },
      from: { x: 0, y: subchunk * size, z: 0 },
      to: { x: size, y: (subchunk + 1) * size, z: size },
      types,
    });
  }
}

Chunk.size = 16;
Chunk.subchunks = 4;
Chunk.maxHeight = Chunk.size * Chunk.subchunks;
Chunk.maxLight = 15;
Chunk.fields = {
  r: 1,
  g: 2,
  b: 3,
  light: 4,
  sunlight: 5,
  count: 6,
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
