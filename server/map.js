const { PNG } = require('pngjs');
const Chunk = require('./chunk');

class Map {
  constructor({ world }) {
    this.world = world;
  }

  onRequest(req, res) {
    const { world } = this;
    const {
      maxHeight,
      size,
    } = Chunk;
    const { getGrid, maxRadius } = Map;
    const origin = (req.params.originX !== undefined && req.params.originZ !== undefined) ? ({
      x: parseInt(req.params.originX, 10),
      z: parseInt(req.params.originZ, 10),
    }) : ({
      x: world.generator.spawn.x,
      z: world.generator.spawn.z,
    });
    const radius = Math.min(
      Math.max(
        parseInt(req.params.radius || 8, 10),
        1
      ),
      maxRadius
    );
    const grid = getGrid(radius);
    const image = new PNG({
      width: (size * ((radius * 2) + 1)) * 2,
      height: (size * ((radius * 2) + 1)) * 2,
      colorType: 2, // color, no alpha
      inputColorType: 2, // color, no alpha
    });
    const renderChunks = () => {
      if (!grid.length) {
        res
          .set('Cache-Control', 'public, max-age=0')
          .type('image/png');
        image.pack().pipe(res);
        return;
      }
      const chunk = grid.shift();
      const map = {
        x: (chunk.x + radius) * size,
        z: (chunk.z + radius) * size,
      };
      const { voxels, heightmap } = world.getChunk({
        x: origin.x + chunk.x,
        z: origin.z + chunk.z,
      });
      const height = (x, z) => (
        (x < 0 || x >= size || z < 0 || z >= size) ? (
          0xFF
        ) : (
          heightmap[(x * size) + z]
        )
      );
      for (let x = 0; x < size; x += 1) {
        for (let z = 0; z < size; z += 1) {
          const y = Math.min(height(x, z), maxHeight - 1);
          const voxel = Chunk.getVoxel(x, y, z);
          const pixel = {
            x: (map.x + x) * 2,
            z: (map.z + z) * 2,
            r: voxels[voxel + Chunk.fields.r],
            g: voxels[voxel + Chunk.fields.g],
            b: voxels[voxel + Chunk.fields.b],
          };
          for (let v = 0; v < 4; v += 1) {
            let ao = 1;
            switch (v) {
              case 0:
                if (height(x - 1, z - 1) > y) ao -= 0.1;
                if (height(x - 1, z) > y) ao -= 0.1;
                if (height(x, z - 1) > y) ao -= 0.1;
                break;
              case 1:
                if (height(x + 1, z - 1) > y) ao -= 0.1;
                if (height(x + 1, z) > y) ao -= 0.1;
                if (height(x, z - 1) > y) ao -= 0.1;
                break;
              case 2:
                if (height(x - 1, z + 1) > y) ao -= 0.1;
                if (height(x - 1, z) > y) ao -= 0.1;
                if (height(x, z + 1) > y) ao -= 0.1;
                break;
              case 3:
                if (height(x + 1, z + 1) > y) ao -= 0.1;
                if (height(x + 1, z) > y) ao -= 0.1;
                if (height(x, z + 1) > y) ao -= 0.1;
                break;
              default:
                break;
            }
            const offset = (
              (image.width * (pixel.z + Math.floor(v / 2)))
              + (pixel.x + (v % 2))
            ) * 3;
            image.data[offset] = pixel.r * ao;
            image.data[offset + 1] = pixel.g * ao;
            image.data[offset + 2] = pixel.b * ao;
          }
        }
      }
      world.unloadChunks();
      process.nextTick(renderChunks);
    };
    renderChunks();
  }

  static getGrid(radius) {
    const grid = [];
    for (let z = -radius; z <= radius; z += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        grid.push({ x, z });
      }
    }
    return grid;
  }
}

Map.maxRadius = 10;

module.exports = Map;
