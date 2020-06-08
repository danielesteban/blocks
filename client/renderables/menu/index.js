import Panel from '../panel.js';
import ColorPicker from './colorpicker.js';
import Options from './options.js';
import Skin from './skin.js';

// Menu UI

class Menu extends Panel {
  constructor({ world }) {
    const { pages } = Menu;
    const width = 128;
    const height = 128;
    super({
      handedness: 'left',
      textureWidth: width,
      textureHeight: height,
      pages: [
        {
          labels: [
            {
              text: 'Menu',
              font: `700 ${Math.max(width, height) * 0.25}px monospace`,
              x: width * 0.5,
              y: height * 0.5,
            },
          ],
        },
      ],
    });
    const pageIds = {};
    pages.forEach((Page, index) => {
      const { key, page, state } = Page({
        menu: this,
        pages: pageIds,
        width,
        height,
      });
      this.pages.push(page);
      pageIds[key] = (index + 1);
      this[key] = state;
    });
    this.world = world;
  }
}

Menu.pages = [
  Options,
  Skin,
  ColorPicker,
];

export default Menu;
