const { hsl2Rgb } = require('colorsys');
const fs = require('fs');
const { PNG } = require('pngjs');
const Chunk = require('./chunk.js');

const computeColor = (noise, x, y, z) => {
  const { maxHeight } = Chunk;
  const hsl = {
    h: Math.abs(noise.perlin3(x / 128, y / 32, z / 128)) * 360,
    s: (
      1 - Math.abs(noise.perlin3(x / 32, y / 24, z / 32))
    ) * (1 - (y / maxHeight)) * 80,
    l: (
      1 - Math.abs(noise.perlin3(x / 64, y / 24, z / 64))
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
        light: 0,
        sunlight: 0,
      };
      if (isBlock || y <= waterLevel) {
        voxel.type = isBlock ? types.block : types.glass;
        voxel.color = computeColor(noise, x, y, z);
        if (!isBlock) {
          const avg = Math.floor((voxel.color.r + voxel.color.g) / 2);
          voxel.color.r = avg;
          voxel.color.g = avg;
          voxel.color.b = Math.min(Math.floor(avg * 1.5), 0xFF);
        }
      }
      return voxel;
    };
  },
  flat(noise) {
    const { maxLight, types } = Chunk;
    const worldHeight = 3;
    return (x, y, z) => {
      const isBlock = y <= worldHeight;
      return {
        type: isBlock ? types.block : types.air,
        color: isBlock ? computeColor(noise, x, y, z) : { r: 0, g: 0, b: 0 },
        light: 0,
        sunlight: isBlock ? 0 : maxLight,
      };
    };
  },
  heightmap(noise) {
    if (!process.env.HEIGHTMAP) {
      console.error('Must provide a HEIGHTMAP if you want to use the heightmap generator.\n');
      process.exit(1);
    }
    const { maxHeight, maxLight, types } = Chunk;
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
        light: 0,
        sunlight: maxLight,
      };
      if (isBlock || y <= waterLevel) {
        voxel.type = isBlock ? types.block : types.glass;
        voxel.color = computeColor(noise, x, y, z);
        voxel.sunlight = 0;
        if (!isBlock) {
          const avg = Math.floor((voxel.color.r + voxel.color.g) / 2);
          voxel.color.r = avg;
          voxel.color.g = avg;
          voxel.color.b = Math.min(Math.floor(avg * 1.5), 0xFF);
        }
      }
      return voxel;
    };
  },
};
