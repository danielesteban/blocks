const block = require('./block');

const offset = { x: 0, y: 0, z: 0 };
const size = { x: 8, y: 6 };
const faces = {
  top: { top: { texture: 'block', offset: { x: 0, y: 0, z: 2 }, size: { x: 8, y: 8 } } },
  bottom: { bottom: { texture: 'block', offset, size } },
  south: { south: { texture: 'block', offset, size } },
  north: { north: { texture: 'block', offset, size } },
  west: { west: { texture: 'block', offset, size } },
  east: { east: { texture: 'block', offset, size } },
};

const isVisible = (type, neighbor) => (
  !type.hasCulling
  || !neighbor.hasCulling
  || (
    neighbor.isTransparent
    && (
      !type.isTransparent
      || type !== neighbor
    )
  )
);

module.exports = {
  faces: ({ neighbors, types, voxel }) => {
    if (neighbors.top.type === types.water) {
      return block.faces({ neighbors, types, voxel });
    }
    return {
      ...faces.top,
      ...(isVisible(types[voxel.type], types[neighbors.bottom.type]) ? faces.bottom : {}),
      ...(isVisible(types[voxel.type], types[neighbors.south.type]) ? faces.south : {}),
      ...(isVisible(types[voxel.type], types[neighbors.north.type]) ? faces.north : {}),
      ...(isVisible(types[voxel.type], types[neighbors.west.type]) ? faces.west : {}),
      ...(isVisible(types[voxel.type], types[neighbors.east.type]) ? faces.east : {}),
    };
  },
  hasAO: true,
  hasCulling: true,
  isTransparent: true,
  textures: {
    block: 'glass.js',
  },
};
