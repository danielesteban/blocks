const offset = { x: 0, y: 0, z: 0 };
const size = { x: 8, y: 8 };

module.exports = {
  faces: {
    top: { texture: 'block', offset, size },
    bottom: { texture: 'block', offset, size },
    south: { texture: 'block', offset, size },
    north: { texture: 'block', offset, size },
    west: { texture: 'block', offset, size },
    east: { texture: 'block', offset, size },
  },
  hasAO: true,
  hasCulling: true,
};
