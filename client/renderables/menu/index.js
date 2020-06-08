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
    const picker = ColorPicker({
      menu: this,
      pages,
      width,
      height,
    });
    const options = Options({
      menu: this,
      pages,
      width,
      height,
    });
    const skin = Skin({
      menu: this,
      pages,
      width,
      height,
    });
    this.pages.push(
      options.page,
      picker.page,
      skin.page
    );
    this.options = options.state;
    this.picker = picker.state;
    this.skin = skin.state;
    this.world = world;
    this.setPage(2);
  }
}

Menu.pages = {
  options: 1,
  picker: 2,
  skin: 3,
};

export default Menu;
