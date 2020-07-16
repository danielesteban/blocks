const { hsl2Rgb } = require('colorsys');
const fastnoise = require('fastnoisejs');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const Chunk = require('./chunk');

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

const Generators = {
  default({ noise, types }) {
    const { maxHeight, size } = Chunk;
    const waterLevel = 8;
    const saplings = {
      from: waterLevel + 3,
      to: waterLevel + size,
    };
    const seed = noise.GetSeed();
    const spawn = Math.floor(noise.GetWhiteNoise(seed, seed) * 50);
    return {
      saplings: (x, y, z) => {
        if (
          y < saplings.from
          || y > saplings.to
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
      },
      spawn: { x: spawn, z: spawn },
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
          voxel.type = isBlock ? types.dirt : types.water;
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
  flat({ noise, types }) {
    const worldHeight = 3;
    return {
      terrain: (x, y, z) => {
        const isBlock = y <= worldHeight;
        return {
          type: isBlock ? types.dirt : types.air,
          color: isBlock ? computeColor(noise, x, y, z) : { r: 0, g: 0, b: 0 },
        };
      },
    };
  },
  heightmap({ noise, types }) {
    if (!process.env.HEIGHTMAP) {
      console.error('Must provide a HEIGHTMAP if you want to use the heightmap generator.\n');
      process.exit(1);
    }
    const { maxHeight } = Chunk;
    const waterLevel = 6;
    const heightmap = PNG.sync.read(fs.readFileSync(process.env.HEIGHTMAP));
    const heightOffset = {
      x: Math.floor(heightmap.width * 0.5),
      z: Math.floor(heightmap.height * 0.5),
    };
    const scale = maxHeight / 0xFF;
    const colormap = process.env.COLORMAP ? (
      PNG.sync.read(fs.readFileSync(process.env.COLORMAP))
    ) : false;
    const colorOffset = colormap ? {
      x: Math.floor(colormap.width * 0.5),
      z: Math.floor(colormap.height * 0.5),
    } : false;
    const getColor = (x, y, z) => {
      const cx = colorOffset.x + x;
      const cz = colorOffset.z + z;
      if (cx >= 0 && cx < colormap.width && cz >= 0 && cz < colormap.height) {
        const index = ((colormap.width * cz) + cx) * 4;
        return {
          r: colormap.data[index],
          g: colormap.data[index + 1],
          b: colormap.data[index + 2],
        };
      }
      return computeColor(noise, x, y, z);
    };
    return {
      terrain: (x, y, z) => {
        const hx = heightOffset.x + x;
        const hz = heightOffset.z + z;
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
          voxel.type = isBlock ? types.dirt : types.water;
          voxel.color = isBlock && colormap ? getColor(x, y, z) : computeColor(noise, x, y, z);
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

const LoadBlockTypes = (basePath) => {
  const blockTypes = {
    air: 0,
    0: { isTransparent: true },
  };
  /* eslint-disable import/no-dynamic-require, global-require */
  const types = require(basePath);
  const textures = [];
  types.forEach((type, i) => {
    const model = require(path.join(basePath, 'models', type));
    Object.keys(model.textures).forEach((id) => {
      const texture = model.textures[id];
      let index = textures.findIndex(({ name }) => (name === texture));
      if (index === -1) {
        index = textures.length;
        let image;
        switch (path.extname(texture)) {
          case '.js':
            image = require(path.join(basePath, 'textures', texture));
            break;
          case '.png':
            image = PNG.sync.read(fs.readFileSync(path.join(basePath, 'textures', texture)));
            break;
          default:
            console.error(`Texture: ${texture} format not supported.\n`);
            process.exit(1);
        }
        image.name = texture;
        textures.push(image);
      }
      model.textures[id] = index;
    });
    const index = i + 1;
    blockTypes[index] = model;
    blockTypes[type] = index;
  });
  /* eslint-enable import/no-dynamic-require, global-require */
  const { width, height } = textures[0];
  const atlas = new PNG({
    width: width * textures.length,
    height,
    colorType: 6, // RGBA
  });
  textures.forEach((texture, i) => {
    PNG.bitblt(texture, atlas, 0, 0, texture.width, texture.height, width * i, 0);
  });
  let client;
  {
    const air = { type: blockTypes.air };
    const empty = {
      neighbors: {
        get: () => air,
        top: air,
        bottom: air,
        south: air,
        north: air,
        west: air,
        east: air,
      },
      types: blockTypes,
    };
    client = types
      .reduce((types, v, index) => {
        const type = index + 1;
        if (type !== blockTypes.sapling) {
          const { name, faces, textures } = blockTypes[type];
          types.push({
            id: type,
            name,
            faces: faces({
              ...empty,
              voxel: { type },
            }),
            textures,
          });
        }
        return types;
      }, []);
  }
  return {
    atlas: PNG.sync.write(atlas),
    client,
    types: blockTypes,
  };
};

module.exports = ({ blockTypes, generator, seed }) => {
  const noise = fastnoise.Create(seed);
  const { atlas, client, types } = LoadBlockTypes(path.resolve(blockTypes));
  if (Generators[generator]) {
    generator = Generators[generator]({ noise, types });
  } else if (fs.existsSync(generator)) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    generator = require(path.resolve(generator))({ noise, types });
  } else {
    console.error(`Couldn't find the generator "${generator}".\n`);
    process.exit(1);
  }
  return {
    ...generator,
    atlas,
    client,
    noise,
    spawn: generator.spawn || { x: 0, z: 0 },
    types,
  };
};
