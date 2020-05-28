const { hsl2Rgb } = require('colorsys');
const fs = require('fs');
const { PNG } = require('pngjs');
const Chunk = require('./chunk.js');

const computeColor = (noise, x, y, z) => {
  const { maxHeight } = Chunk;
  const hsl = {
    h: Math.abs(noise.perlin3(z / 128, y / 64, x / 128)) * 360,
    s: (
      1 - Math.abs(noise.simplex3(x / 64, y / 32, z / 64))
    ) * (1 - (y / maxHeight)) * 80,
    l: 30 + (
      Math.abs(noise.perlin3(x / 256, y / 64, z / 256))
    ) * 60,
  };
  const color = hsl2Rgb(hsl);
  color.r += Math.floor(Math.random() * hsl.l) - hsl.l * 0.5;
  color.r = Math.min(Math.max(color.r, 0), 0xFF);
  color.g += Math.floor(Math.random() * hsl.l) - hsl.l * 0.5;
  color.g = Math.min(Math.max(color.g, 0), 0xFF);
  color.b += Math.floor(Math.random() * hsl.l) - hsl.l * 0.5;
  color.b = Math.min(Math.max(color.b, 0), 0xFF);
  return color;
};

module.exports = {
  default(noise) {
    const { maxHeight, types } = Chunk;
    const waterLevel = 6;
    return (x, y, z) => {
      const isBlock = y <= Math.abs(
        (noise.perlin2(z / 1024, x / 1024) * 0.3)
        + (noise.simplex2(x / 512, z / 512) * 0.3)
        + (noise.perlin3(z / 32, y / 24, x / 32) * 0.3)
      ) * maxHeight * 2;
      const voxel = {
        type: types.air,
        color: { r: 0, g: 0, b: 0 },
      };
      if (isBlock || y <= waterLevel) {
        voxel.type = isBlock ? types.block : types.glass;
        voxel.color = computeColor(noise, x, y, z);
        if (!isBlock) {
          const avg = Math.floor((voxel.color.r + voxel.color.g + voxel.color.b) / 3);
          voxel.color.r = avg;
          voxel.color.g = avg;
          voxel.color.b = Math.min(Math.floor(avg * 1.5), 0xFF);
        }
      }
      return voxel;
    };
  },
  flat(noise) {
    const { types } = Chunk;
    const worldHeight = 3;
    return (x, y, z) => {
      const isBlock = y <= worldHeight;
      return {
        type: isBlock ? types.block : types.air,
        color: isBlock ? computeColor(noise, x, y, z) : { r: 0, g: 0, b: 0 },
      };
    };
  },
  heightmap(noise) {
    if (!process.env.HEIGHTMAP) {
      console.error('Must provide a HEIGHTMAP if you want to use the heightmap generator.\n');
      process.exit(1);
    }
    const { maxHeight, types } = Chunk;
    const waterLevel = 6;
    const heightmap = PNG.sync.read(fs.readFileSync(process.env.HEIGHTMAP));
    const offset = {
      x: Math.floor(heightmap.width * 0.5),
      z: Math.floor(heightmap.height * 0.5),
    };
    const scale = maxHeight / 0xFF;
    return (x, y, z) => {
      const hx = offset.x + x;
      const hz = offset.z + z;
      let height = 0;
      if (hx >= 0 && hx < heightmap.width && hz >= 0 && hz < heightmap.height) {
        height = Math.floor(heightmap.data[((heightmap.width * hz) + hx) * 4] * scale);
      }
      const isBlock = y <= height;
      const voxel = {
        type: types.air,
        color: { r: 0, g: 0, b: 0 },
      };
      if (isBlock || y <= waterLevel) {
        voxel.type = isBlock ? types.block : types.glass;
        voxel.color = computeColor(noise, x, y, z);
        if (!isBlock) {
          const avg = Math.floor((voxel.color.r + voxel.color.g + voxel.color.b) / 3);
          voxel.color.r = avg;
          voxel.color.g = avg;
          voxel.color.b = Math.min(Math.floor(avg * 1.5), 0xFF);
        }
      }
      return voxel;
    };
  },
  legacy(noise) {
    const { maxHeight, types } = Chunk;
    const waterLevel = 10;
    return (x, y, z) => {
      const isBlock = y <= Math.max((
        Math.abs(
          (noise.simplex2(x / 1024, z / 1024) * 0.6)
          + (noise.perlin2(x / 512, z / 512) * 0.2)
          + (noise.perlin3(x / 32, y / 16, z / 32) * 0.2)
        ) * 120
      ) - 8, 0);
      const voxel = {
        type: types.air,
        color: { r: 0, g: 0, b: 0 },
      };
      if (isBlock || y <= waterLevel) {
        voxel.type = isBlock ? types.block : types.glass;
        const hsl = {
          h: Math.abs(noise.perlin3(x / 4096, y / 128, z / 4096)) * 360,
          s: 60 * (1 - (y / maxHeight)),
          l: 33,
        };
        if (isBlock && y <= waterLevel + 2) {
          hsl.l -= (1 - (y / (waterLevel + 2))) * 33;
        }
        voxel.color = hsl2Rgb(hsl);
        voxel.color.r += (Math.random() * 15) - 7.5;
        voxel.color.r = Math.min(Math.max(voxel.color.r, 0), 0xFF);
        voxel.color.g += (Math.random() * 15) - 7.5;
        voxel.color.g = Math.min(Math.max(voxel.color.g, 0), 0xFF);
        voxel.color.b += (Math.random() * 15) - 7.5;
        voxel.color.b = Math.min(Math.max(voxel.color.b, 0), 0xFF);
        if (!isBlock) {
          const avg = Math.floor((voxel.color.r + voxel.color.g + voxel.color.b) / 3);
          voxel.color.r = avg;
          voxel.color.g = avg;
          voxel.color.b = Math.min(Math.floor(avg * 1.5), 0xFF);
        }
      }
      return voxel;
    };
  },
};
