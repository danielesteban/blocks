import UI from '../ui.js';
import Block from './block.js';
import ColorPicker from './colorpicker.js';
import Map from './map.js';
import Photos from './photos.js';
import Settings from './settings.js';
import Skin from './skin.js';
import Tabs from './tabs.js';

// Menu UI

class Menu extends UI {
  constructor({ world }) {
    const width = 512;
    const height = 512;
    super({
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
      textureWidth: width,
      textureHeight: height,
    });
    const pages = {};
    [
      Block,
      ColorPicker,
      Map,
      Photos,
      Settings,
      Skin,
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
    this.size = 0.3;
    this.position.y = -0.1 / 3;
    this.position.z = 0.05;
    this.rotation.set(
      0,
      Math.PI * -0.5,
      Math.PI * 0.5
    );
    this.tabs = new Tabs({
      menu: this,
      pages: [
        { name: 'Block', page: pages.block },
        { name: 'Map', page: pages.map },
        { name: 'Photos', page: pages.photos },
        { name: 'Options', page: pages.settings },
        { name: 'Skin', page: pages.skin },
        { name: 'X', page: 0 },
      ],
    });
    this.add(this.tabs);
    this.setPage(1);
  }

  onPointer({ point, primary }) {
    const { page } = this;
    if (page.id === 0 && primary) {
      this.setPage(1);
      return;
    }
    super.onPointer({ point, primary });
  }

  setPage(page) {
    const {
      position,
      scale,
      size,
      tabs,
    } = this;
    position.x = -0.01 + (page > 0 ? -0.002 : 0);
    scale.set(page > 0 ? size : 0.05, page > 0 ? size : 0.05, page > 0 ? size : 0.05);
    this.updateMatrix();
    this.updateWorldMatrix();
    tabs.setActive(page);
    super.setPage(page);
  }
}

export default Menu;
