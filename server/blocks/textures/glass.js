const { PNG } = require('pngjs');
const block = require('./block');

const texture = new PNG({
  width: block.width,
  height: block.height,
  colorType: 6, // RGBA
});

block.bitblt(texture, 0, 0, block.width, block.height, 0, 0);
for (let y = 0; y < texture.height; y += 1) {
  for (let x = 0; x < texture.width; x += 1) {
    texture.data[((y * texture.width + x) * 4) + 3] = 0x80;
  }
}

module.exports = texture;
