const { PNG } = require('pngjs');
const block = require('./block');

const texture = new PNG({
  width: block.width,
  height: block.height,
  colorType: 6, // RGBA
});

const step = ((block.width - 4) / 4);
block.bitblt(texture, 0, 0, block.width, block.height, 0, 0);
for (let i = 0; i < 4; i += 1) {
  const x = 3 + (i * step);
  for (let y = 2; y < (texture.height - 2); y += 1) {
    const index = ((y * texture.width + x) * 4);
    texture.data[index] -= 0x10;
    texture.data[index + 1] -= 0x10;
    texture.data[index + 2] -= 0x10;
  }
}

module.exports = texture;
