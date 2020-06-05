const { hsl2Rgb } = require('colorsys');
const fs = require('fs');
const { PNG } = require('pngjs');
const Chunk = require('./chunk.js');

const computeColor = (noise, x, y, z) => {
  const { maxHeight } = Chunk;
  const hsl = {
    h: Math.abs(noise.GetPerlin(x, y * 2, z)) * 360,
    s: 30 + (
      Math.abs(noise.GetSimplex(x * 2, y, z * 2))
    ) * (1 - (y / maxHeight)) * 60,
    l: 30 + (
      Math.abs(noise.GetPerlin(x, y * 2, z))
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

const treeSaplings = ({ noise, from, to }) => (x, y, z) => {
  if (
    y < from
    || y > to
    || (Math.abs(noise.GetPerlin(x / 4, y / 4, z / 4))) > 0.1
    || (Math.abs(noise.GetSimplex(z * 4, y * 4, x * 4))) > 0.005
  ) {
    return false;
  }
  const n = Math.abs(noise.GetSimplex(z / 8, x / 8));
  const height = 5 + Math.floor(Math.abs(noise.GetWhiteNoise(x / 2, z / 2)) * 16);
  const hue = Math.floor(n * 0x100);
  const radius = 7 + Math.floor(n * height * 0.5);
  return {
    r: height,
    g: hue,
    b: radius,
  };
};

module.exports = {
  default(noise) {
    const { maxHeight, size, types } = Chunk;
    const waterLevel = 8;
    return {
      noise,
      saplings: treeSaplings({ noise, from: waterLevel + 3, to: waterLevel + size }),
      terrain: (x, y, z) => {
        const isBlock = y <= (
          Math.abs(noise.GetSimplexFractal(x / 1.5, y, z / 1.5))
          * maxHeight
        );
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
      },
    };
  },
  flat(noise) {
    const { types } = Chunk;
    const worldHeight = 3;
    return {
      noise,
      saplings: treeSaplings({ noise, from: worldHeight + 1, to: worldHeight + 1 }),
      terrain: (x, y, z) => {
        const isBlock = y <= worldHeight;
        return {
          type: isBlock ? types.block : types.air,
          color: isBlock ? computeColor(noise, x, y, z) : { r: 0, g: 0, b: 0 },
        };
      },
    };
  },
  heightmap(noise) {
    if (!process.env.HEIGHTMAP) {
      console.error('Must provide a HEIGHTMAP if you want to use the heightmap generator.\n');
      process.exit(1);
    }
    const { maxHeight, size, types } = Chunk;
    const waterLevel = 6;
    const heightmap = PNG.sync.read(fs.readFileSync(process.env.HEIGHTMAP));
    const offset = {
      x: Math.floor(heightmap.width * 0.5),
      z: Math.floor(heightmap.height * 0.5),
    };
    const scale = maxHeight / 0xFF;
    return {
      noise,
      saplings: treeSaplings({ noise, from: waterLevel + 3, to: maxHeight - size }),
      terrain: (x, y, z) => {
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
      },
    };
  },
};
