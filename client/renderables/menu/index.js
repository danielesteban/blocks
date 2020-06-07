import Panel from '../panel.js';
import ColorPicker from './colorpicker.js';

// Menu UI

class Menu extends Panel {
  constructor({ world }) {
    const { pages } = Menu;
    const width = 128;
    const height = 128;
    const picker = ColorPicker({ width, height });
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
        {
          buttons: [
            {
              background: '#393',
              label: 'Block',
              x: 8,
              y: 8,
              width: 32,
              height: 24,
              onPointer: () => this.setBlock(0x01),
            },
            {
              label: 'Glass',
              x: 48,
              y: 8,
              width: 32,
              height: 24,
              onPointer: () => this.setBlock(0x02),
            },
            {
              label: 'Light',
              x: 88,
              y: 8,
              width: 32,
              height: 24,
              onPointer: () => this.setBlock(0x03),
            },
            {
              x: 8,
              y: 40,
              width: 24,
              height: 24,
              onPointer: () => setTimeout(() => this.setPage(pages.picker), 0),
            },
            {
              label: 'Color Picker',
              x: 32,
              y: 40,
              width: 88,
              height: 24,
              onPointer: () => setTimeout(() => this.setPage(pages.picker), 0),
            },
            {
              background: '#393',
              label: 'Teleport',
              x: 8,
              y: 72,
              width: 52,
              height: 24,
              onPointer: () => this.setLocomotion('teleport'),
            },
            {
              label: 'Fly',
              x: 68,
              y: 72,
              width: 52,
              height: 24,
              onPointer: () => this.setLocomotion('fly'),
            },
            {
              label: 'Edit Avatar',
              x: 16,
              y: 104,
              width: 96,
              height: 16,
              onPointer: () => {
                this.setLayer('transparent');
                this.setPage(pages.skin);
              },
            },
          ],
          graphics: [
            ({ ctx }) => {
              ctx.translate(8, 40);
              ctx.fillStyle = `#${picker.state.color.getHexString()}`;
              ctx.strokeStyle = '#000';
              ctx.beginPath();
              ctx.rect(0, 0, 24, 24);
              ctx.fill();
              ctx.stroke();
            },
          ],
        },
        {
          buttons: [
            {
              label: 'Head',
              x: 8,
              y: 8,
              width: 52,
              height: 24,
              onPointer: () => this.setLayer('opaque'),
            },
            {
              label: 'Hair',
              x: 68,
              y: 8,
              width: 52,
              height: 24,
              onPointer: () => this.setLayer('transparent'),
            },
            {
              x: 8,
              y: 40,
              width: 24,
              height: 24,
              onPointer: () => setTimeout(() => this.setPage(pages.picker), 0),
            },
            {
              label: 'Color Picker',
              x: 32,
              y: 40,
              width: 88,
              height: 24,
              onPointer: () => setTimeout(() => this.setPage(pages.picker), 0),
            },
            {
              label: 'Randomize',
              x: 16,
              y: 72,
              width: 96,
              height: 16,
              onPointer: () => (
                world.player.skinEditor.regenerate()
              ),
            },
            {
              label: 'Cancel',
              x: 8,
              y: 96,
              width: 48,
              height: 24,
              onPointer: () => {
                this.setPage(pages.menu);
                world.player.disposeSkinEditor();
              },
            },
            {
              background: '#393',
              label: 'Save',
              x: 72,
              y: 96,
              width: 48,
              height: 24,
              onPointer: () => {
                this.setPage(pages.menu);
                world.player.saveSkin();
              },
            },
          ],
          graphics: [
            ({ ctx }) => {
              ctx.translate(8, 40);
              ctx.fillStyle = `#${picker.state.color.getHexString()}`;
              ctx.strokeStyle = '#000';
              ctx.beginPath();
              ctx.rect(0, 0, 24, 24);
              ctx.fill();
              ctx.stroke();
            },
          ],
        },
        picker.page,
      ],
    });
    this.blockType = 0x01;
    this.picker = picker.state;
    this.world = world;
  }

  setBlock(type) {
    const {
      pages: [/* toggle */, { buttons: [block, glass, light] }],
    } = this;
    const { pages } = Menu;
    delete block.background;
    delete glass.background;
    delete light.background;
    const buttons = { 0x01: block, 0x02: glass, 0x03: light };
    buttons[type].background = '#393';
    this.blockType = type;
    this.setPage(pages.menu);
  }

  setColor(value) {
    const { page, picker } = this;
    picker.update(value);
    this.setPage(page.back);
  }

  setLayer(layer) {
    const {
      pages: [/* toggle */, /* menu */, { buttons: [opaque, transparent] }],
      world,
    } = this;
    const { pages } = Menu;
    delete opaque.background;
    delete transparent.background;
    const buttons = { opaque, transparent };
    buttons[layer].background = '#393';
    world.player.editSkin(layer);
    this.setPage(pages.skin);
  }

  setLocomotion(type) {
    const {
      pages: [
        /* toggle */, // eslint-disable-line comma-style
        {
          buttons: [
            /* block */,
            /* glass */,
            /* light */,
            /* color */,
            /* picker */, // eslint-disable-line comma-style
            teleport,
            fly,
          ],
        },
      ],
    } = this;
    const { pages } = Menu;
    delete fly.background;
    delete teleport.background;
    const buttons = { fly, teleport };
    buttons[type].background = '#393';
    const locomotions = { fly: 0, teleport: 1 };
    this.world.locomotion = locomotions[type];
    this.setPage(pages.menu);
  }
}

Menu.pages = {
  menu: 1,
  skin: 2,
  picker: 3,
};

export default Menu;
