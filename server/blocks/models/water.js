const block = require('./block');

const offset = { x: 0, y: 0, z: 0 };
const size = { x: 8, y: 6 };

const faces = [
  'top',
  'bottom',
  'south',
  'north',
  'west',
  'east',
].reduce((faces, facing) => {
  faces[facing] = [{
    facing,
    texture: 'block',
    offset: facing === 'top' ? { x: 0, y: 0, z: 2 } : offset,
    size: facing === 'top' ? { x: 8, y: 8 } : size,
  }];
  return faces;
}, {});

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

const empty = [];
module.exports = {
  faces: ({ neighbors, types, voxel }) => {
    if (neighbors.top.type === types.water) {
      return block.faces({ neighbors, types, voxel });
    }
    return [
      ...faces.top,
      ...(isVisible(types[voxel.type], types[neighbors.bottom.type]) ? faces.bottom : empty),
      ...(isVisible(types[voxel.type], types[neighbors.south.type]) ? faces.south : empty),
      ...(isVisible(types[voxel.type], types[neighbors.north.type]) ? faces.north : empty),
      ...(isVisible(types[voxel.type], types[neighbors.west.type]) ? faces.west : empty),
      ...(isVisible(types[voxel.type], types[neighbors.east.type]) ? faces.east : empty),
    ];
  },
  hasCulling: true,
  isTransparent: true,
  textures: {
    block: 'glass.js',
  },
};
