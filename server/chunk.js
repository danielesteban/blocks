const { hsl2Rgb } = require('colorsys');
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
    const { maxHeight, size, types } = Chunk;
    const { world: { generator } } = this;
    const offset = { x: this.x * size, z: this.z * size };
    const voxels = Array(size);
    for (let x = 0; x < size; x += 1) {
      voxels[x] = Array(maxHeight);
      for (let y = 0; y < maxHeight; y += 1) {
        voxels[x][y] = Array(size);
        for (let z = 0; z < size; z += 1) {
          voxels[x][y][z] = {
            ...generator.terrain(offset.x + x, y, offset.z + z),
            light: 0,
            sunlight: 0,
            chunk: this,
          };
        }
      }
    }
    this.needsPropagation = true;
    this.needsPersistence = true;
    this.voxels = voxels;
    this.generateHeightmap();
    if (generator.saplings) {
      for (let x = 0; x < size; x += 1) {
        for (let z = 0; z < size; z += 1) {
          const y = this.heightmap[x][z] + 1;
          const sapling = generator.saplings(offset.x + x, y, offset.z + z);
          if (sapling) {
            const voxel = voxels[x][y][z];
            voxel.type = types.sapling;
            voxel.color = sapling;
          }
        }
      }
    }
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
    const heightmap = Array(size);
    for (let x = 0; x < size; x += 1) {
      heightmap[x] = new Uint8Array(size);
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

  propagate() {
    const {
      isTransparent,
      maxHeight,
      maxLight,
      size,
      types,
    } = Chunk;
    this.needsPropagation = false;
    const { voxels } = this;
    const lightQueue = [];
    const sunlightQueue = [];
    const trees = [];
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < maxHeight; y += 1) {
        for (let z = 0; z < size; z += 1) {
          const voxel = voxels[x][y][z];
          switch (voxel.type) {
            case types.light:
              voxel.light = maxLight;
              voxel.color.r = 0xFF;
              voxel.color.g = 0xFF;
              voxel.color.b = 0xFF;
              lightQueue.push({ x, y, z });
              break;
            case types.sapling:
              trees.push({
                sapling: { x, y, z },
                height: voxel.color.r,
                hue: voxel.color.g,
                radius: voxel.color.b,
              });
              break;
            default:
              break;
          }
        }
      }
    }
    trees.forEach((sapling) => this.growTree(sapling));
    const top = maxHeight - 1;
    for (let x = 0; x < size; x += 1) {
      for (let z = 0; z < size; z += 1) {
        const voxel = voxels[x][top][z];
        if (isTransparent(voxel.type)) {
          voxel.sunlight = maxLight;
          sunlightQueue.push({ x, y: top, z });
        }
      }
    }
    this.floodLight(lightQueue, 'light');
    this.floodLight(sunlightQueue, 'sunlight');
    this.needsPersistence = true;
  }

  load() {
    const { maxHeight, size } = Chunk;
    const { x, z, world } = this;
    const {
      needsPropagation,
      voxels,
    } = JSON.parse(fs.readFileSync(path.join(world.storage, `${x}_${z}.json`)));
    this.needsPropagation = needsPropagation;
    this.needsPersistence = false;
    const buffer = zlib.inflateSync(Buffer.from(voxels, 'base64'));
    this.voxels = [];
    for (let x = 0, i = 0; x < size; x += 1) {
      this.voxels[x] = Array(maxHeight);
      for (let y = 0; y < maxHeight; y += 1) {
        this.voxels[x][y] = Array(size);
        for (let z = 0; z < size; z += 1, i += 6) {
          this.voxels[x][y][z] = {
            type: buffer[i],
            color: {
              r: buffer[i + 1],
              g: buffer[i + 2],
              b: buffer[i + 3],
            },
            light: buffer[i + 4],
            sunlight: buffer[i + 5],
            chunk: this,
          };
        }
      }
    }
    this.generateHeightmap();
  }

  persist() {
    const { maxHeight, size } = Chunk;
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
    const buffer = Buffer.allocUnsafe(size * maxHeight * size * 6);
    for (let x = 0, i = 0; x < size; x += 1) {
      for (let y = 0; y < maxHeight; y += 1) {
        for (let z = 0; z < size; z += 1, i += 6) {
          const voxel = voxels[x][y][z];
          buffer[i] = voxel.type;
          buffer[i + 1] = voxel.color.r;
          buffer[i + 2] = voxel.color.g;
          buffer[i + 3] = voxel.color.b;
          buffer[i + 4] = voxel.light;
          buffer[i + 5] = voxel.sunlight;
        }
      }
    }
    fs.writeFileSync(path.join(storage, `${x}_${z}.json`), JSON.stringify({
      needsPropagation,
      voxels: zlib.deflateSync(buffer).toString('base64'),
    }));
    this.needsPersistence = false;
  }

  getChunk(x, z) {
    const { size } = Chunk;
    const { world } = this;
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
    return { chunk, cx: x, cz: z };
  }

  get(x, y, z) {
    const { bottom, maxHeight, top } = Chunk;
    if (y < 0) return bottom;
    if (y >= maxHeight) return top;
    const { chunk, cx, cz } = this.getChunk(x, z);
    return chunk.voxels[cx][y][cz];
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
      const { [key]: light } = this.get(x, y, z);
      voxelNeighbors.forEach((offset) => {
        const ny = y + offset.y;
        if (ny < 0 || ny >= maxHeight) {
          return;
        }
        const nx = x + offset.x;
        const nz = z + offset.z;
        const nl = light - ((isSunLight && offset.y === -1 && light === maxLight) ? 0 : 1);
        const { chunk, cx, cz } = this.getChunk(nx, nz);
        const voxel = chunk.voxels[cx][ny][cz];
        if (
          !isTransparent(voxel.type)
          || (
            isSunLight
            && offset.y !== -1
            && light === maxLight
            && ny > chunk.heightmap[cx][cz]
          )
          || voxel[key] >= nl
        ) {
          return;
        }
        voxel[key] = nl;
        chunk.needsPersistence = true;
        queue.push({ x: nx, y: ny, z: nz });
      });
    }
  }

  growTree({
    sapling,
    height,
    hue,
    radius,
  }) {
    const { maxHeight, types, voxelNeighbors } = Chunk;
    const { world: { generator: { noise } } } = this;
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
      const { chunk, cx, cz } = this.getChunk(x, z);
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
        type: types.block,
      });
      const pushNeighbor = (offset) => {
        const nx = x + offset.x;
        const ny = y + offset.y;
        const nz = z + offset.z;
        if (this.get(nx, ny, nz).type === types.air) {
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
        for (let i = 0; i < voxelNeighbors.length; i += 1) {
          const neighbor = voxelNeighbors[
            Math.floor(
              Math.abs(noise.GetWhiteNoise((x + i) * 2, (y - i) / 2, (z + i) * 2))
              * voxelNeighbors.length
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
    const { heightmap, needsPropagation } = this;
    const voxel = this.get(x, y, z);
    const { type: current } = voxel;
    voxel.type = type;
    voxel.color.r = color.r;
    voxel.color.g = color.g;
    voxel.color.b = color.b;
    if (type === types.air) {
      if (heightmap[x][z] === y) {
        for (let i = y - 1; i >= 0; i -= 1) {
          if (this.get(x, i, z).type !== types.air) {
            heightmap[x][z] = i;
            break;
          }
        }
      }
    } else if (heightmap[x][z] < y) {
      heightmap[x][z] = y;
    }
    if (!needsPropagation) {
      if (isTransparent(current)) {
        ['light', 'sunlight'].forEach((key) => {
          if (voxel[key] !== 0) {
            this.removeLight(x, y, z, key);
          }
        });
      } else if (current === types.light) {
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
      } else if (type === types.light) {
        voxel.color.r = 0xFF;
        voxel.color.g = 0xFF;
        voxel.color.b = 0xFF;
        voxel.light = maxLight;
        this.floodLight([{ x, y, z }]);
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
    let n1 = neighbors[0].type !== types.air;
    let n2 = neighbors[1].type !== types.air;
    let n3 = (n1 && n2) || (neighbors[2].type !== types.air);
    const ao = [n1, n2, n3].reduce((ao, n) => (
      ao - (n ? 0.2 : 0)
    ), 1);
    n1 = isTransparent(neighbors[0].type);
    n2 = isTransparent(neighbors[1].type);
    n3 = (n1 || n2) && isTransparent(neighbors[2].type);
    let c = 1;
    [n1, n2, n3].forEach((n, i) => {
      if (n) {
        light += neighbors[i].light;
        sunlight += neighbors[i].sunlight;
        c += 1;
      }
    });
    light = Math.round(light / c);
    sunlight = Math.round(sunlight / c);
    return {
      ao,
      light: (light << 4) | sunlight,
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
        mesh.light.push(lighting.light);
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
Chunk.subchunks = 4;
Chunk.maxHeight = Chunk.size * Chunk.subchunks;
Chunk.maxLight = 15;
Chunk.types = {
  air: 0x00,
  block: 0x01,
  glass: 0x02,
  light: 0x03,
  sapling: 0x04,
};
Chunk.top = { type: Chunk.types.air, light: 0, sunlight: Chunk.maxLight };
Chunk.bottom = { type: Chunk.types.block, light: 0, sunlight: 0 };
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
