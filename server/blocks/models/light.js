const cross = ({
  facing,
  neighbors: {
    top,
    bottom,
    front,
    left,
    right,
  },
  types,
}) => [
  ...(types[front.type].isTransparent ? [{
    facing,
    texture: 'block',
    offset: { x: 3, y: 3, z: front.type !== types.air ? 0 : 3 },
    size: { x: 2, y: 2 },
  }] : []),
  ...(top.type !== types.air ? [{
    facing,
    texture: 'block',
    offset: { x: 3, y: 5, z: 3 },
    size: { x: 2, y: 3 },
  }] : []),
  ...(bottom.type !== types.air ? [{
    facing,
    texture: 'block',
    offset: { x: 3, y: 0, z: 3 },
    size: { x: 2, y: 3 },
  }] : []),
  ...(left.type !== types.air ? [{
    facing,
    texture: 'block',
    offset: { x: 0, y: 3, z: 3 },
    size: { x: 3, y: 2 },
  }] : []),
  ...(right.type !== types.air ? [{
    facing,
    texture: 'block',
    offset: { x: 5, y: 3, z: 3 },
    size: { x: 3, y: 2 },
  }] : []),
];

const faces = [
  {
    facing: 'top',
    neighbors: {
      top: 'north',
      bottom: 'south',
      front: 'top',
      left: 'west',
      right: 'east',
    },
  },
  {
    facing: 'bottom',
    neighbors: {
      top: 'south',
      bottom: 'north',
      front: 'bottom',
      left: 'west',
      right: 'east',
    },
  },
  {
    facing: 'south',
    neighbors: {
      top: 'top',
      bottom: 'bottom',
      front: 'south',
      left: 'west',
      right: 'east',
    },
  },
  {
    facing: 'north',
    neighbors: {
      top: 'top',
      bottom: 'bottom',
      front: 'north',
      left: 'east',
      right: 'west',
    },
  },
  {
    facing: 'west',
    neighbors: {
      top: 'top',
      bottom: 'bottom',
      front: 'west',
      left: 'north',
      right: 'south',
    },
  },
  {
    facing: 'east',
    neighbors: {
      top: 'top',
      bottom: 'bottom',
      front: 'east',
      left: 'south',
      right: 'north',
    },
  },
];

module.exports = {
  name: 'Light',
  faces: ({ neighbors, types }) => faces.reduce((faces, { facing, neighbors: faceNeighbors }) => {
    faces.push(
      ...cross({
        facing,
        neighbors: {
          top: neighbors[faceNeighbors.top],
          bottom: neighbors[faceNeighbors.bottom],
          front: neighbors[faceNeighbors.front],
          left: neighbors[faceNeighbors.left],
          right: neighbors[faceNeighbors.right],
        },
        types,
      })
    );
    return faces;
  }, []),
  isLight: true,
  textures: {
    block: 'block.js',
  },
};
