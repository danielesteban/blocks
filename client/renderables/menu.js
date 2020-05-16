import { Color } from '../core/three.js';
import UI from '../core/ui.js';

// Menu UI

class Menu extends UI {
  constructor() {
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
      pages: [
        {
          buttons: [
            {
              background: 'transparent',
              border: 'transparent',
              label: 'Light',
              font: '700 28px monospace',
              x: 0,
              y: 0,
              width,
              height,
              onPointer: () => this.setPage(1),
            },
          ],
        },
        {
          buttons: [
            {
              label: 'Block',
              x: 16,
              y: 20,
              width: 96,
              height: 24,
              onPointer: () => this.setBlock('Block'),
            },
            {
              background: '#393',
              label: 'Light',
              x: 16,
              y: 52,
              width: 96,
              height: 24,
              onPointer: () => this.setBlock('Light'),
            },
            {
              label: 'Color Picker',
              x: 16,
              y: 84,
              width: 96,
              height: 24,
              onPointer: () => this.setPage(2),
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
    this.position.y = -0.1 / 3;
    this.position.z = 0.05;
    this.rotation.set(
      0,
      Math.PI * -0.5,
      Math.PI * 0.5
    );
    this.updateMatrix();
    this.blockColor = color;
    this.blockType = 0x01;
    this.picker = { area, strip };
  }

  onPointer(point) {
    super.onPointer(point);
    const {
      blockColor,
      context: ctx,
      page,
      pointer,
      picker: { area, strip },
    } = this;
    if (page.id !== 2) {
      return;
    }
    [area, strip].forEach((object) => {
      const {
        x,
        y,
        width,
        height,
      } = object;
      if (
        pointer.x < x
        || pointer.x > x + width
        || pointer.y < y
        || pointer.y > y + height
      ) {
        return;
      }
      const imageData = ctx.getImageData(pointer.x, pointer.y, 1, 1).data;
      if (object === strip) {
        area.color.setRGB(
          imageData[0] / 0xFF,
          imageData[1] / 0xFF,
          imageData[2] / 0xFF
        );
      }
      blockColor.setRGB(
        imageData[0] / 0xFF,
        imageData[1] / 0xFF,
        imageData[2] / 0xFF
      );
      this.draw();
    });
  }

  setBlock(type) {
    const {
      pages: [
        { buttons: [toggle] },
        { buttons: [block, light] },
      ],
    } = this;
    toggle.label = type;
    delete block.background;
    delete light.background;
    switch (type) {
      case 'Light':
        this.blockType = 0x01;
        light.background = '#393';
        break;
      case 'Block':
        this.blockType = 0x02;
        block.background = '#393';
        break;
      default:
        break;
    }
    this.setPage(0);
  }

  setPage(page) {
    const {
      position,
      scale,
    } = this;
    position.x = -(0.01 + (page > 0 ? 0.002 : 0));
    scale.set(page > 0 ? 0.25 : 0.05, page > 0 ? 0.25 : 0.05, 1);
    this.updateMatrix();
    this.updateWorldMatrix();
    super.setPage(page);
  }
}

export default Menu;
