class Chunk {
  constructor({ world, x, z }) {
    this.world = world;
    this.x = x;
    this.z = z;
    this.generate();
  }

  generate() {
    const { maxHeight, size, types } = Chunk;
    this.needsSunlightPropagation = true;
    const voxels = [];
    for (let x = 0; x < size; x += 1) {
      voxels[x] = [];
      for (let y = 0; y < maxHeight; y += 1) {
        voxels[x][y] = [];
        for (let z = 0; z < size; z += 1) {
          const wx = (this.x * size) + x - 7.5;
          const wz = (this.z * size) + z - 7.5;
          voxels[x][y][z] = {
            type: (
              // Ground
              y === 0
              || (
                // Dome
                Math.sqrt(wx ** 2 + wz ** 2 + y ** 2) >= 16
                // Side openings
                && (Math.abs(wx) > 24 || wz > 2 || wz < -2 || y > 8)
              )
            ) ? types.block : types.air,
            color: y === 0 ? {
              r: 0.2 + (Math.random() * 0.1),
              g: 0.5 + (Math.random() * 0.1),
              b: 0.2 + (Math.random() * 0.1),
            } : {
              r: 0.3 - (Math.random() * 0.06),
              g: 0.3 - (Math.random() * 0.06),
              b: 0.35 - (Math.random() * 0.06),
            },
            light: 0,
            sunlight: 0,
          };
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
    if (y >= maxHeight) return { type: types.air, light: maxLight, sunlight: maxLight };
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
    voxel.color.r = 1;
    voxel.color.g = 1;
    voxel.color.b = 1;
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
        if (neighbor.type === types.air && neighbor[key] + 2 <= voxel[key]) {
          const decay = (!isSunLight || offset.y !== -1 || voxel[key] !== maxLight) ? 1 : 0;
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

  propagateSunlight() {
    const {
      maxHeight,
      maxLight,
      size,
      types,
    } = Chunk;
    const { voxels } = this;
    const queue = [];
    const y = maxHeight - 1;
    for (let x = 0; x < size; x += 1) {
      for (let z = 0; z < size; z += 1) {
        const voxel = voxels[x][y][z];
        if (voxel.type === types.air) {
          voxel.sunlight = maxLight;
          queue.push({
            x,
            y,
            z,
          });
        }
      }
    }
    this.floodLight(queue, 'sunlight');
    this.needsSunlightPropagation = false;
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
      index,
      position,
    }) => ({
      color: color.toString('base64'),
      index: index.toString('base64'),
      position: position.toString('base64'),
    }));
  }

  remesh() {
    const { chunkNeighbors, subchunks } = Chunk;
    const { world } = this;
    this.meshes = [];
    if (this.needsSunlightPropagation) {
      this.propagateSunlight();
    }
    chunkNeighbors.forEach(({ x, z }) => {
      const neighbor = world.getChunk({ x: this.x + x, z: this.z + z });
      if (neighbor.needsSunlightPropagation) {
        neighbor.propagateSunlight();
      }
    });
    for (let subchunk = 0; subchunk < subchunks; subchunk += 1) {
      this.meshSubChunk(subchunk);
    }
  }

  static lighting(light, sunlight, neighbors) {
    const { maxLight, types } = Chunk;
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
    light /= c;
    light /= maxLight;
    c = 1;
    neighbors.forEach((n) => {
      if (n.type === types.air) {
        sunlight += n.sunlight;
        c += 1;
      }
    });
    sunlight /= c;
    sunlight /= maxLight;
    const ao = [n1, n2, n3].reduce((light, n) => (
      n ? light - 0.2 : light
    ), 1);
    return ao * (light + Math.max(sunlight, 0.02)) ** 2.2;
  }

  meshSubChunk(subchunk) {
    const { lighting, size } = Chunk;
    let offset = 0;
    const index = [];
    const color = [];
    const position = [];
    const pushFace = (
      /* eslint-disable no-multi-spaces */
      p1, n1,  // bottom left point + neighbours
      p2, n2,  // bottom right point + neighbours
      p3, n3,  // top right point + neighbours
      p4, n4,  // top left point + neighbours
      c,       // voxel color
      l,       // voxel light
      s        // voxel sunlight
      /* eslint-enable no-multi-spaces */
    ) => {
      const vertices = [p1, p2, p3, p4];
      const light = [
        lighting(l, s, n1),
        lighting(l, s, n2),
        lighting(l, s, n3),
        lighting(l, s, n4),
      ];
      if (light[0] + light[2] < light[1] + light[3]) {
        vertices.unshift(vertices.pop());
        light.unshift(light.pop());
      }
      vertices.forEach((vertex) => position.push(...vertex));
      light.forEach((light) => color.push(
        c.r * light,
        c.g * light,
        c.b * light
      ));
      index.push(
        offset, offset + 1, offset + 2,
        offset + 2, offset + 3, offset
      );
      offset += 4;
    };
    const yFrom = (size * subchunk) - 1;
    const yTo = yFrom + size + 1;
    for (let x = -1; x <= size; x += 1) {
      for (let y = yFrom; y <= yTo; y += 1) {
        for (let z = -1; z <= size; z += 1) {
          const voxel = this.get(x, y, z);
          if (voxel.type) {
            const top = this.get(x, y + 1, z);
            if (top.type === 0) {
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
            if (bottom.type === 0) {
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
            if (south.type === 0) {
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
            if (north.type === 0) {
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
            if (west.type === 0) {
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
            if (east.type === 0) {
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
      color: Buffer.from((new Float32Array(color)).buffer),
      index: Buffer.from((new Uint16Array(index)).buffer),
      position: Buffer.from((new Float32Array(position)).buffer),
    };
  }
}

Chunk.size = 16;
Chunk.subchunks = 1;
Chunk.maxHeight = Chunk.size * Chunk.subchunks;
Chunk.maxLight = 15;
Chunk.types = {
  air: 0,
  bedrock: 1,
  light: 2,
  block: 3,
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
