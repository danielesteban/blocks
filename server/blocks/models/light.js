const cap = {
  offset: { x: 3, y: 3, z: 0 },
  size: { x: 2, y: 2 },
};
const side = {
  offset: { x: 3, y: 0, z: 3 },
  size: { x: 2, y: 8 },
};
const point = {
  offset: { x: 3, y: 3, z: 3 },
  size: { x: 2, y: 2 },
};

const top = {
  top: { texture: 'block', ...cap },
};
const bottom = {
  bottom: { texture: 'block', ...cap },
};
const sides = {
  south: { texture: 'block', ...side },
  north: { texture: 'block', ...side },
  west: { texture: 'block', ...side },
  east: { texture: 'block', ...side },
};
const dot = {
  top: { texture: 'block', ...point },
  bottom: { texture: 'block', ...point },
  south: { texture: 'block', ...point },
  north: { texture: 'block', ...point },
  west: { texture: 'block', ...point },
  east: { texture: 'block', ...point },
};

module.exports = {
  faces: ({ neighbors, types }) => {
    if (
      neighbors.top.type !== types.air
      || neighbors.bottom.type !== types.air
    ) {
      return {
        ...(types[neighbors.top.type].isTransparent ? top : {}),
        ...(types[neighbors.bottom.type].isTransparent ? bottom : {}),
        ...sides,
      };
    }
    return dot;
  },
  isLight: true,
  textures: {
    block: 'trunk.js',
  },
};
