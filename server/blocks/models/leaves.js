const block = require('./block');

module.exports = {
  ...block,
  name: 'Leaves',
  isTransparent: true,
  textures: {
    block: 'leaves.js',
  },
};
