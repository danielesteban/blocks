const fs = require('fs');
const fastnoise = require('fastnoisejs');
const Chunk = require('./chunk');
const Generators = require('./generators');
const Room = require('./room');

class World extends Room {
  constructor({
    generator,
    maxClients,
    preload,
    seed,
    storage,
  }) {
    if (storage && !seed) {
      console.error('Must provide a SEED if you want STORAGE.\n');
      process.exit(1);
    }
    super({ maxClients });
    this.chunks = new Map();
    this.seed = seed && !Number.isNaN(seed) ? (
      seed % 65536
    ) : (
      Math.floor(Math.random() * 65536)
    );
    this.storage = storage;
    const noise = fastnoise.Create(this.seed);
    this.generator = Generators[generator](noise);
    this.spawnOffset = generator === 'default' ? (
      Math.floor(noise.GetWhiteNoise(this.seed, this.seed) * 50)
    ) : (
      0
    );
    console.log(`World seed: ${this.seed}`);
    if (preload && !Number.isNaN(preload)) {
      console.log(`Preloading ${((preload + preload + 1)) ** 2} chunks...`);
      for (let z = -preload; z <= preload; z += 1) {
        for (let x = -preload; x <= preload; x += 1) {
          this.getChunk({
            x: this.spawnOffset + x,
            z: this.spawnOffset + z,
          }).remesh();
        }
      }
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
    const { seed, spawnOffset } = this;
    const chunk = this.getChunk({
      x: spawnOffset + Math.floor(Math.random() * 3) - 1,
      z: spawnOffset + Math.floor(Math.random() * 3) - 1,
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
        this.unloadChunks();
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
          || (
            type !== Chunk.types.air
            && type !== Chunk.types.block
            && type !== Chunk.types.glass
            && type !== Chunk.types.light
          )
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
        const { type: current } = chunk.get(x, y, z);
        if (
          !chunk.meshes
          || (current === Chunk.types.air && type === Chunk.types.air)
          || (current === Chunk.types.light && type === Chunk.types.light)
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
        [
          // @hack: To reduce latency on most of the cases
          //        remesh/broadcast the update origin chunk first.
          //        once the affected chunks get filtered, they should
          //        all get broadcasted at once to avoid artifacts
          //        at the chunk borders
          [chunk],
          // @incomplete: This should only remesh/broadcast the
          //              chunks that the update has affected
          //              instead of all the chunk neighbors.
          //              (this requires the Chunk class to track the updated chunks)
          Chunk.chunkNeighbors.map(({ x, z }) => (
            this.getChunk({ x: chunk.x + x, z: chunk.z + z })
          )),
        ].forEach((chunks) => (
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
          })
        ));
        break;
      }
      default:
        break;
    }
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

World.maxLoadedChunks = 512;

module.exports = World;
