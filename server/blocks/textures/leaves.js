const { PNG } = require('pngjs');
const block = require('./block');

const texture = new PNG({
  width: block.width,
  height: block.height,
  colorType: 6, // RGBA
});

block.bitblt(texture, 0, 0, block.width, block.height, 0, 0);
for (let i = 0; i < 24; i += 1) {
  const x = Math.floor(Math.random() * (texture.width - 4)) + 2;
  const y = Math.floor(Math.random() * (texture.height - 4)) + 2;
  texture.data[((y * texture.width + x) * 4) + 3] = 0x40;
}

module.exports = texture;
