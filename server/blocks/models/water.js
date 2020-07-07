const block = require('./block');

const [drain, flood] = [
  {
    top: {
      offset: { x: 0, y: 0, z: 2 },
      size: { x: 8, y: 8 },
    },
    side: {
      offset: { x: 0, y: 0, z: 0 },
      size: { x: 8, y: 6 },
    },
  },
  {
    top: {
      offset: { x: 0, y: 0, z: 2 },
      size: { x: 8, y: 8 },
    },
    side: {
      offset: { x: 0, y: -2, z: 0 },
      size: { x: 8, y: 8 },
    },
  },
].map(({ top, side }) => (
  [
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
      offset: facing === 'top' ? top.offset : side.offset,
      size: facing === 'top' ? top.size : side.size,
    }];
    return faces;
  }, {})
));

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
    const model = neighbors.bottom.type === types.water ? flood : drain;
    return [
      ...model.top,
      ...(isVisible(types[voxel.type], types[neighbors.bottom.type]) ? model.bottom : empty),
      ...(isVisible(types[voxel.type], types[neighbors.south.type]) ? model.south : empty),
      ...(isVisible(types[voxel.type], types[neighbors.north.type]) ? model.north : empty),
      ...(isVisible(types[voxel.type], types[neighbors.west.type]) ? model.west : empty),
      ...(isVisible(types[voxel.type], types[neighbors.east.type]) ? model.east : empty),
    ];
  },
  hasCulling: true,
  isTransparent: true,
  textures: {
    block: 'glass.js',
  },
};
