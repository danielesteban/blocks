const Chunk = require('./chunk');
const Room = require('./room');

class World extends Room {
  constructor() {
    super();
    this.chunks = new Map();

    // Hack
    this.test = [
      { x: 0, z: 0 },
      { x: -1, z: -1 },
      { x: 0, z: -1 },
      { x: 1, z: -1 },
      { x: -1, z: 0 },
      { x: 1, z: 0 },
      { x: -1, z: 1 },
      { x: 0, z: 1 },
      { x: 1, z: 1 },
    ];
    this.test.forEach((chunk) => {
      this.getChunk(chunk).remesh();
    });
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
    // Hack
    const { test } = this;
    return {
      chunks: test.map((chunk) => ({
        chunk,
        meshes: this.getChunk(chunk).getSerializedMeshes(),
      })),
    };
  }
}

module.exports = World;
