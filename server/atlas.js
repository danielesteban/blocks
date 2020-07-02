const { PNG } = require('pngjs');

module.exports = (types) => {
  const block = new PNG({
    width: 16,
    height: 16,
    colorType: 6, // RGBA
  });
  for (let y = 0; y < block.height; y += 1) {
    for (let x = 0; x < block.width; x += 1) {
      let light = 0.9 + Math.random() * 0.05;
      if (
        x === 0
        || x === block.width - 1
        || y === 0
        || y === block.width - 1
      ) {
        light *= 0.9;
      } else if (
        x === 1
        || x === block.width - 2
        || y === 1
        || y === block.width - 2
      ) {
        light *= 1.2;
      }
      light = Math.floor(Math.min(Math.max(light, 0), 1) * 0xFF);
      const i = (y * block.width + x) * 4;
      block.data[i] = light;
      block.data[i + 1] = light;
      block.data[i + 2] = light;
      block.data[i + 3] = 0xFF;
    }
  }
  const count = Object.keys(types).filter((type) => (
    type !== 'air' && type !== 'sapling'
  )).length;
  const atlas = new PNG({
    width: block.width * count,
    height: block.height,
    colorType: 6, // RGBA
  });
  for (let type = 0; type < count; type += 1) {
    const offset = block.width * type;
    block.bitblt(atlas, 0, 0, block.width, block.height, offset, 0);
    if (
      (type + 1) === types.glass
      || (type + 1) === types.water
    ) {
      for (let y = 0; y < block.height; y += 1) {
        for (let x = 0; x < block.width; x += 1) {
          atlas.data[((y * atlas.width + x + offset) * 4) + 3] = 0x80;
        }
      }
    }
    if ((type + 1) === types.trunk) {
      const step = ((block.width - 4) / 4);
      for (let i = 0; i < 4; i += 1) {
        const x = 3 + (i * step);
        for (let y = 2; y < (block.height - 2); y += 1) {
          const index = ((y * atlas.width + x + offset) * 4);
          atlas.data[index] -= 0x10;
          atlas.data[index + 1] -= 0x10;
          atlas.data[index + 2] -= 0x10;
        }
      }
    }
    if ((type + 1) === types.leaves) {
      for (let i = 0; i < 24; i += 1) {
        const x = Math.floor(Math.random() * (block.width - 4)) + 2;
        const y = Math.floor(Math.random() * (block.height - 4)) + 2;
        atlas.data[((y * atlas.width + x + offset) * 4) + 3] = 0x40;
      }
    }
  }
  return PNG.sync.write(atlas);
};
