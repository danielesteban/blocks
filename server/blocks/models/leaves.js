const block = require('./block');

module.exports = {
  ...block,
  isTransparent: true,
  textures: {
    block: 'leaves.js',
  },
};
