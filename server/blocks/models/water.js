const block = require('./block');

const side = { x: 8, y: 6 };

const shore = {
  ...block.faces,
  top: {
    ...block.faces.top,
    isCulled: false,
    offset: { x: 0, y: 0, z: 2 },
  },
  south: {
    ...block.faces.south,
    size: side,
  },
  north: {
    ...block.faces.north,
    size: side,
  },
  west: {
    ...block.faces.west,
    size: side,
  },
  east: {
    ...block.faces.east,
    size: side,
  },
};

module.exports = {
  ...block,
  isTransparent: true,
  faces: ({ neighbors, types }) => {
    if (neighbors.top.type === types.water) {
      return block.faces;
    }
    return shore;
  },
  textures: {
    block: 'glass.js',
  },
};
