import Panel from '../panel.js';
import ColorPicker from './colorpicker.js';
import Options from './options.js';
import Settings from './settings.js';
import Skin from './skin.js';

// Menu UI

class Menu extends Panel {
  constructor({ world }) {
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
    const pages = {};
    [
      Options,
      Settings,
      Skin,
      ColorPicker,
    ].forEach((Page) => {
      const { key, page, state } = Page({
        menu: this,
        pages,
        width,
        height,
      });
      pages[key] = this.pages.length;
      this.pages.push(page);
      this[key] = state;
    });
    this.world = world;
  }
}

export default Menu;
