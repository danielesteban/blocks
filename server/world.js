const fs = require('fs');
const Chunk = require('./chunk');
const Generators = require('./generators');
const Room = require('./room');

class World extends Room {
  constructor({
    authService,
    blockTypes,
    generator,
    maxClients,
    name,
    preload,
    publicURL,
    seed,
    storage,
  }) {
    if (storage && !seed) {
      console.error('Must provide a SEED if you want STORAGE.\n');
      process.exit(1);
    }
    super({
      authService,
      maxClients,
      name,
    });
    this.chunks = new Map();
    this.seed = seed && !Number.isNaN(seed) ? (
      seed % 65536
    ) : (
      Math.floor(Math.random() * 65536)
    );
    this.storage = storage;
    this.generator = Generators({ blockTypes, generator, seed });
    console.log(`World seed: ${this.seed}`);
    if (preload && !Number.isNaN(preload)) {
      console.log(`Preloading ${((preload + preload + 1)) ** 2} chunks...`);
      for (let z = -preload; z <= preload; z += 1) {
        for (let x = -preload; x <= preload; x += 1) {
          this.getChunk({
            x: this.generator.spawn.x + x,
            z: this.generator.spawn.z + z,
          }).remesh();
        }
      }
    }
    if (publicURL) {
      this.register(publicURL);
    }
    if (storage) {
      if (!fs.existsSync(storage)) {
        fs.mkdirSync(storage, { recursive: true });
      }
      setInterval(() => this.persist(), 60000);
    }
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
    const { generator: { client, spawn: offset }, seed } = this;
    const chunk = this.getChunk({ x: offset.x, z: offset.z });
    const spawn = {
      x: Math.floor(Math.random() * Chunk.size),
      z: Math.floor(Math.random() * Chunk.size),
    };
    spawn.y = chunk.heightmap[(spawn.x * Chunk.size) + spawn.z];
    spawn.x += chunk.x * Chunk.size;
    spawn.z += chunk.z * Chunk.size;
    return {
      blocks: client,
      seed,
      spawn,
    };
  }

  onRequest(client, request) {
    super.onRequest(client, request);
    switch (request.type) {
      case 'LOAD': {
        let {
          x,
          z,
        } = request.json || {};
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
          chunks: [chunk],
        });
        this.unloadChunks();
        break;
      }
      case 'PICK': {
        let { x, y, z } = request.json || {};
        x = parseInt(x, 10);
        y = parseInt(y, 10);
        z = parseInt(z, 10);
        if (
          Number.isNaN(x)
          || Number.isNaN(y)
          || Number.isNaN(z)
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
        if (chunk.needsPropagation) {
          return;
        }
        const voxel = Chunk.getVoxel(x, y, z);
        this.broadcast({
          type: 'PICK',
          json: {
            type: chunk.voxels[voxel],
            color: {
              r: chunk.voxels[voxel + Chunk.fields.r],
              g: chunk.voxels[voxel + Chunk.fields.g],
              b: chunk.voxels[voxel + Chunk.fields.b],
            },
          },
        }, {
          include: client.id,
        });
        break;
      }
      case 'TELEPORT': {
        let { x, z } = request.json || {};
        x = parseInt(x, 10);
        z = parseInt(z, 10);
        if (
          Number.isNaN(x)
          || Number.isNaN(z)
        ) {
          return;
        }
        let chunk = {
          x: Math.floor(x / Chunk.size),
          z: Math.floor(z / Chunk.size),
        };
        chunk = this.getChunk(chunk);
        if (chunk.needsPropagation) {
          return;
        }
        const y = chunk.heightmap[
          ((x - (Chunk.size * chunk.x)) * Chunk.size)
          + (z - (Chunk.size * chunk.z))
        ];
        this.broadcast({
          type: 'TELEPORT',
          json: { x, y, z },
        }, {
          include: client.id,
        });
        break;
      }
      case 'UPDATE': {
        const { generator: { types } } = this;
        let {
          x,
          y,
          z,
          color,
          type,
        } = request.json || {};
        x = parseInt(x, 10);
        y = parseInt(y, 10);
        z = parseInt(z, 10);
        color = parseInt(color, 10);
        type = parseInt(type, 10);
        if (
          Number.isNaN(x)
          || Number.isNaN(y)
          || Number.isNaN(z)
          || Number.isNaN(color)
          || Number.isNaN(type)
          || y <= 0
          || y >= Chunk.maxHeight
          || color < 0
          || color > 16777215
          || types[type] === undefined
          || type === types.sapling
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
        if (chunk.needsPropagation) {
          return;
        }
        const current = chunk.voxels[Chunk.getVoxel(x, y, z)];
        if (
          (current !== types.air && type !== types.air)
          || (current === types.air && type === types.air)
        ) {
          return;
        }
        chunk.update({
          x,
          y,
          z,
          color: {
            r: (color >> 16) & 0xFF,
            g: (color >> 8) & 0xFF,
            b: color & 0xFF,
          },
          type,
        });
        this.broadcast({
          type: 'UPDATE',
          chunks: [
            chunk,
            ...Chunk.chunkNeighbors.map(({ x, z }) => (
              this.getChunk({ x: chunk.x + x, z: chunk.z + z })
            )),
          ].map((chunk) => {
            chunk.remesh();
            return chunk;
          }),
        });
        break;
      }
      default:
        break;
    }
  }

  onAtlasRequest(req, res) {
    const { generator: { atlas } } = this;
    res
      .set('Cache-Control', 'public, max-age=0')
      .type('image/png')
      .send(atlas);
  }

  onStatusRequest(req, res) {
    const {
      clients,
      id,
      name,
      seed,
      version,
    } = this;
    res.json({
      id,
      name,
      players: clients.length,
      seed,
      version,
    });
  }

  persist() {
    const { chunks } = this;
    chunks.forEach((chunk) => {
      if (chunk.needsPersistence) {
        chunk.persist();
      }
    });
  }

  unloadChunks() {
    const { maxLoadedChunks } = World;
    const { chunks } = this;
    while (chunks.size > maxLoadedChunks) {
      const [oldestKey, oldestChunk] = chunks.entries().next().value;
      if (oldestChunk.needsPersistence) {
        oldestChunk.persist();
      }
      chunks.delete(oldestKey);
    }
  }
}

World.maxLoadedChunks = 1024;

module.exports = World;
