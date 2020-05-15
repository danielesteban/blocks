const { hsl2Rgb } = require('colorsys');

class Chunk {
  constructor({ world, x, z }) {
    this.world = world;
    this.x = x;
    this.z = z;
    this.generate();
  }

  generate() {
    const {
      maxHeight,
      size,
      types,
    } = Chunk;
    const {
      world: {
        noise,
      },
    } = this;
    this.needsLightPropagation = true;
    const voxels = [];
    for (let x = 0; x < size; x += 1) {
      voxels[x] = [];
      for (let y = 0; y < maxHeight; y += 1) {
        voxels[x][y] = [];
        for (let z = 0; z < size; z += 1) {
          const wx = (this.x * size) + x - 4;
          const wz = (this.z * size) + z - 4;
          const height = Math.min(Math.max((
            Math.abs(
              (noise.simplex2(wx / 512, wz / 512) * 0.5)
              + (noise.perlin2(wz / 1024, wx / 1024) * 0.2)
              + (noise.perlin3(wx / 64, y / 32, wz / 64) * 0.4)
            ) * 128
          ) - 8, 0), maxHeight);
          const voxel = {
            type: types.air,
            color: { r: 0, g: 0, b: 0 },
            light: 0,
            sunlight: 0,
          };
          if (y <= height) {
            voxel.type = types.block;
            const l = (
              1 - Math.abs(noise.perlin3(wx / 64, y / 32, wz / 64))
            ) * (Math.max(y, 8) / maxHeight) * 60;
            voxel.color = hsl2Rgb({
              h: Math.abs(noise.perlin3(wx / 256, y / 64, wz / 256)) * 360,
              s: (
                1 - Math.abs(noise.perlin3(wx / 32, y / 16, wz / 32))
              ) * (1 - (y / maxHeight)) * 80,
              l,
            });
            voxel.color.r += Math.floor(Math.random() * l) - l * 0.5;
            voxel.color.r = Math.min(Math.max(voxel.color.r, 0), 0xFF);
            voxel.color.g += Math.floor(Math.random() * l) - l * 0.5;
            voxel.color.g = Math.min(Math.max(voxel.color.g, 0), 0xFF);
            voxel.color.b += Math.floor(Math.random() * l) - l * 0.5;
            voxel.color.b = Math.min(Math.max(voxel.color.b, 0), 0xFF);
            if (y === 0) {
              const avg = Math.floor((voxel.color.r + voxel.color.g) / 2);
              voxel.color.r = avg;
              voxel.color.g = avg;
              voxel.color.b = Math.floor(avg * 1.5);
            }
          }
          voxels[x][y][z] = voxel;
        }
      }
    }
    this.voxels = voxels;
    const heightmap = [];
    for (let x = 0; x < size; x += 1) {
      heightmap[x] = [];
      for (let z = 0; z < size; z += 1) {
        heightmap[x][z] = 0;
        for (let y = maxHeight - 1; y >= 0; y -= 1) {
          if (voxels[x][y][z].type !== types.air) {
            heightmap[x][z] = y;
            // HACK: Generate test lights
            if (y > 0 && Math.random() < 0.005) {
              voxels[x][y][z] = {
                type: types.light,
                color: { r: 0xFF, g: 0xFF, b: 0xFF },
                light: 0,
                sunlight: 0,
              };
            }
            break;
          }
        }
      }
    }
    this.heightmap = heightmap;
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

  addLight(x, y, z) {
    const { maxLight, types } = Chunk;
    const voxel = this.get(x, y, z);
    voxel.light = maxLight;
    voxel.type = types.light;
    voxel.color.r = 0xFF;
    voxel.color.g = 0xFF;
    voxel.color.b = 0xFF;
    this.floodLight([{ x, y, z }]);
  }

  floodLight(queue, key = 'light') {
    const {
      maxHeight,
      maxLight,
      types,
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
        if (neighbor.type === types.air && neighbor[key] + decay < voxel[key]) {
          neighbor[key] = voxel[key] - decay;
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
          if (y === top && voxel.type === types.air) {
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
  }

  update({
    x,
    y,
    z,
    color = { r: 0, g: 0, b: 0 },
    type,
  }) {
    const {
      maxHeight,
      maxLight,
      types,
      voxelNeighbors,
    } = Chunk;
    const voxel = this.get(x, y, z);
    const { type: current } = voxel;
    voxel.type = type;
    voxel.color.r = color.r;
    voxel.color.g = color.g;
    voxel.color.b = color.b;
    if (current === types.air) {
      if (voxel.light !== 0) {
        this.removeLight(x, y, z);
      }
      if (voxel.sunlight !== 0) {
        this.removeLight(x, y, z, 'sunlight');
      }
    }
    if (current === types.light) {
      this.removeLight(x, y, z);
    }
    if (type === types.light) {
      this.addLight(x, y, z);
    }
    if (type === types.air) {
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
            if (neighbor.type === types.air && neighbor[key] !== 0) {
              queue.push({ x: nx, y: ny, z: nz });
            }
          });
        }
        this.floodLight(queue, key);
      });
    }
  }

  getSerializedMeshes() {
    const { meshes } = this;
    return meshes.map(({
      color,
      light,
      position,
    }) => ({
      color: color.toString('base64'),
      light: light.toString('base64'),
      position: position.toString('base64'),
    }));
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

  static getLighting(light, sunlight, neighbors) {
    const { types } = Chunk;
    const n1 = neighbors[0].type !== types.air;
    const n2 = neighbors[1].type !== types.air;
    const n3 = (n1 && n2) || neighbors[2].type !== types.air;
    let c = 1;
    neighbors.forEach((n) => {
      if (n.type === types.air) {
        light += n.light;
        c += 1;
      }
    });
    light = Math.round(light / c);
    c = 1;
    neighbors.forEach((n) => {
      if (n.type === types.air) {
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
    const { getLighting, size, types } = Chunk;
    const color = [];
    const light = [];
    const position = [];
    const pushFace = (
      /* eslint-disable no-multi-spaces */
      p1, n1,  // bottom left point + neighbours
      p2, n2,  // bottom right point + neighbours
      p3, n3,  // top right point + neighbours
      p4, n4,  // top left point + neighbours
      c,       // color
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
      lighting.forEach((lighting) => {
        color.push(
          Math.round(c.r * lighting.ao),
          Math.round(c.g * lighting.ao),
          Math.round(c.b * lighting.ao)
        );
        light.push(
          (lighting.light << 4) | lighting.sunlight
        );
      });
      vertices.forEach((vertex) => position.push(...vertex));
    };
    const yFrom = (size * subchunk) - 1;
    const yTo = yFrom + size + 1;
    for (let x = -1; x <= size; x += 1) {
      for (let y = yFrom; y <= yTo; y += 1) {
        for (let z = -1; z <= size; z += 1) {
          const voxel = this.get(x, y, z);
          if (voxel.type) {
            const top = this.get(x, y + 1, z);
            if (top.type === types.air) {
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
                top.light,
                top.sunlight
              );
            }
            const bottom = this.get(x, y - 1, z);
            if (bottom.type === types.air) {
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
                bottom.light,
                bottom.sunlight
              );
            }
            const south = this.get(x, y, z + 1);
            if (south.type === types.air) {
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
                south.light,
                south.sunlight
              );
            }
            const north = this.get(x, y, z - 1);
            if (north.type === types.air) {
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
                north.light,
                north.sunlight
              );
            }
            const west = this.get(x + 1, y, z);
            if (west.type === types.air) {
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
                west.light,
                west.sunlight
              );
            }
            const east = this.get(x - 1, y, z);
            if (east.type === types.air) {
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
                east.light,
                east.sunlight
              );
            }
          }
        }
      }
    }
    this.meshes[subchunk] = {
      color: Buffer.from((new Uint8Array(color)).buffer),
      light: Buffer.from((new Uint8Array(light)).buffer),
      position: Buffer.from((new Int16Array(position)).buffer),
    };
  }
}

Chunk.size = 16;
Chunk.subchunks = 3;
Chunk.maxHeight = Chunk.size * Chunk.subchunks;
Chunk.maxLight = 15;
Chunk.types = {
  air: 0x00,
  light: 0x01,
  block: 0x02,
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
