import { Color } from '../core/three.js';
import Panel from './panel.js';

// Menu UI

class Menu extends Panel {
  constructor({ world }) {
    const width = 128;
    const height = 128;
    const color = new Color(Math.random() * 0xFFFFFF);
    const area = {
      color: color.clone(),
      x: width * 0.05,
      y: height * 0.05,
      width: width * 0.75,
      height: height * 0.9,
    };
    const strip = {
      x: width * 0.85,
      y: height * 0.05,
      width: width * 0.1,
      height: height * 0.75,
    };
    super({
      handedness: 'left',
      pages: [
        {
          labels: [
            {
              text: 'Menu',
              font: '700 28px monospace',
              x: 64,
              y: 64,
            },
          ],
        },
        {
          buttons: [
            {
              label: 'Block',
              x: 8,
              y: 20,
              width: 32,
              height: 24,
              onPointer: () => this.setBlock(0x01),
            },
            {
              label: 'Glass',
              x: 48,
              y: 20,
              width: 32,
              height: 24,
              onPointer: () => this.setBlock(0x02),
            },
            {
              background: '#393',
              label: 'Light',
              x: 88,
              y: 20,
              width: 32,
              height: 24,
              onPointer: () => this.setBlock(0x03),
            },
            {
              x: 8,
              y: 52,
              width: 24,
              height: 24,
              onPointer: () => setTimeout(() => this.setPage(2), 0),
            },
            {
              label: 'Color Picker',
              x: 32,
              y: 52,
              width: 88,
              height: 24,
              onPointer: () => setTimeout(() => this.setPage(2), 0),
            },
            {
              background: '#393',
              label: 'Teleport',
              x: 8,
              y: 84,
              width: 52,
              height: 24,
              onPointer: () => this.setLocomotion('teleport'),
            },
            {
              label: 'Fly',
              x: 68,
              y: 84,
              width: 52,
              height: 24,
              onPointer: () => this.setLocomotion('fly'),
            },
          ],
          graphics: [
            ({ ctx }) => {
              ctx.translate(8, 52);
              ctx.fillStyle = `#${color.getHexString()}`;
              ctx.strokeStyle = '#000';
              ctx.beginPath();
              ctx.rect(0, 0, 24, 24);
              ctx.fill();
              ctx.stroke();
            },
          ],
        },
        {
          graphics: [
            ({ ctx }) => {
              const {
                x,
                y,
                width,
                height,
              } = area;
              ctx.translate(x, y);
              ctx.fillStyle = `#${area.color.getHexString()}`;
              ctx.fillRect(0, 0, width, height);

              const grdWhite = ctx.createLinearGradient(0, 0, width, 0);
              grdWhite.addColorStop(0, 'rgba(255,255,255,1)');
              grdWhite.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.fillStyle = grdWhite;
              ctx.fillRect(0, 0, width, height);

              const grdBlack = ctx.createLinearGradient(0, 0, 0, height);
              grdBlack.addColorStop(0, 'rgba(0,0,0,0)');
              grdBlack.addColorStop(1, 'rgba(0,0,0,1)');
              ctx.fillStyle = grdBlack;
              ctx.fillRect(0, 0, width, height);
            },
            ({ ctx }) => {
              const {
                x,
                y,
                width,
                height,
              } = strip;
              ctx.translate(x, y);
              const grd = ctx.createLinearGradient(0, 0, 0, height);
              grd.addColorStop(0, 'rgba(255, 0, 0, 1)');
              grd.addColorStop(0.17, 'rgba(255, 255, 0, 1)');
              grd.addColorStop(0.34, 'rgba(0, 255, 0, 1)');
              grd.addColorStop(0.51, 'rgba(0, 255, 255, 1)');
              grd.addColorStop(0.68, 'rgba(0, 0, 255, 1)');
              grd.addColorStop(0.85, 'rgba(255, 0, 255, 1)');
              grd.addColorStop(1, 'rgba(255, 0, 0, 1)');
              ctx.fillStyle = grd;
              ctx.fillRect(0, 0, width, height);
            },
            ({ ctx }) => {
              ctx.translate(width * 0.85, height * 0.85);
              ctx.fillStyle = `#${color.getHexString()}`;
              ctx.strokeStyle = '#333';
              ctx.beginPath();
              ctx.rect(0, 0, width * 0.1, width * 0.1);
              ctx.fill();
              ctx.stroke();
            },
          ],
        },
      ],
    });
    this.blockColor = color;
    this.blockType = 0x03;
    this.world = world;
    this.picker = { area, strip };
  }

  onPointer({ point, primary, secondary }) {
    super.onPointer({ point, primary, secondary });
    const {
      blockColor,
      context: ctx,
      page,
      pointer,
      picker: { area, strip },
    } = this;
    if (page.id === 2 && (primary || secondary)) {
      for (let i = 0; i < 2; i += 1) {
        const {
          x,
          y,
          width,
          height,
        } = i === 0 ? area : strip;
        if (
          pointer.x >= x
          && pointer.x <= x + width
          && pointer.y >= y
          && pointer.y <= y + height
        ) {
          const imageData = ctx.getImageData(pointer.x, pointer.y, 1, 1).data;
          blockColor.setRGB(
            imageData[0] / 0xFF,
            imageData[1] / 0xFF,
            imageData[2] / 0xFF
          );
          if (i === 1) {
            area.color.setRGB(
              imageData[0] / 0xFF,
              imageData[1] / 0xFF,
              imageData[2] / 0xFF
            );
          }
          this.setPage(i === 0 ? 1 : 2);
          break;
        }
      }
    }
  }

  setBlock(type) {
    const {
      pages: [/* toggle */, { buttons: [block, glass, light] }],
    } = this;
    delete block.background;
    delete glass.background;
    delete light.background;
    const buttons = { 0x01: block, 0x02: glass, 0x03: light };
    buttons[type].background = '#393';
    this.blockType = type;
    this.setPage(1);
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
    delete fly.background;
    delete teleport.background;
    const buttons = { fly, teleport };
    buttons[type].background = '#393';
    const locomotions = { fly: 0, teleport: 1 };
    this.world.locomotion = locomotions[type];
    this.setPage(1);
  }
}

export default Menu;
