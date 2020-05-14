const { Noise } = require('noisejs');
const Chunk = require('./chunk');
const Room = require('./room');

class World extends Room {
  constructor() {
    super();
    this.seed = Math.floor(Math.random() * 65536);
    this.chunks = new Map();
    this.noise = new Noise();
    this.noise.seed(this.seed);
  }

  getChunk({ x, z }) {
    const { chunks } = this;
    const key = `${x}:${z}`;
    let chunk = chunks.get(key);
    if (!chunk) {
      chunk = new Chunk({ world: this, x, z });
      chunks.set(key, chunk);
    }
    return chunk;
  }

  onInit() {
    const { seed } = this;
    const chunk = this.getChunk({
      x: Math.floor(Math.random() * 3) - 1,
      z: Math.floor(Math.random() * 3) - 1,
    });
    const spawn = {
      x: Math.floor(Math.random() * Chunk.size),
      z: Math.floor(Math.random() * Chunk.size),
    };
    spawn.y = chunk.heightmap[spawn.x][spawn.z];
    spawn.x += chunk.x * Chunk.size;
    spawn.z += chunk.z * Chunk.size;
    return { seed, spawn };
  }

  onRequest(client, request) {
    super.onRequest(client, request);
    switch (request.type) {
      case 'LOAD': {
        let {
          x,
          z,
        } = request.data;
        x = parseInt(x, 10);
        z = parseInt(z, 10);
        if (
          Number.isNaN(x)
          || Number.isNaN(z)
        ) {
          return;
        }
        const chunk = this.getChunk({ x, z });
        if (!chunk.meshes) {
          chunk.remesh();
        }
        this.broadcast({
          type: 'UPDATE',
          data: {
            chunks: [{
              chunk: { x: chunk.x, z: chunk.z },
              meshes: chunk.getSerializedMeshes(),
            }],
          },
        });
        break;
      }
      case 'UPDATE': {
        let {
          x,
          y,
          z,
          color,
          type,
        } = request.data;
        x = parseInt(x, 10);
        y = parseInt(y, 10);
        z = parseInt(z, 10);
        color = {
          r: parseFloat(color ? color.r : '0', 10),
          g: parseFloat(color ? color.g : '0', 10),
          b: parseFloat(color ? color.b : '0', 10),
        };
        type = parseInt(type, 10);
        if (
          Number.isNaN(x)
          || Number.isNaN(y)
          || Number.isNaN(z)
          || Number.isNaN(color.r)
          || Number.isNaN(color.g)
          || Number.isNaN(color.b)
          || Number.isNaN(type)
          || (type !== Chunk.types.air && type !== Chunk.types.light)
          || y <= 0
          || y >= Chunk.maxHeight
        ) {
          return;
        }
        let chunk = {
          x: Math.floor(x / Chunk.size),
          z: Math.floor(z / Chunk.size),
        };
        x -= Chunk.size * chunk.x;
        z -= Chunk.size * chunk.z;
        chunk = this.getChunk(chunk);
        if (!chunk.meshes) {
          return;
        }
        const { type: current } = chunk.get(x, y, z);
        if (type === current) {
          return;
        }
        chunk.update({
          x,
          y,
          z,
          color,
          type,
        });
        const chunks = [
          chunk,
          ...Chunk.chunkNeighbors.map(({ x, z }) => (
            this.getChunk({ x: chunk.x + x, z: chunk.z + z })
          )),
        ];
        this.broadcast({
          type: 'UPDATE',
          data: {
            chunks: chunks.map((chunk) => {
              chunk.remesh();
              return {
                chunk: { x: chunk.x, z: chunk.z },
                meshes: chunk.getSerializedMeshes(),
              };
            }),
          },
        });
        break;
      }
      default:
        break;
    }
  }
}

module.exports = World;
