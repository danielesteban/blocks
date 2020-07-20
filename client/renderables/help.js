import { Vector2 } from '../core/three.js';
import UI from './ui.js';

// Help UI

class Help extends UI {
  constructor() {
    const width = 256;
    const height = 512;
    const fonts = {
      default: `700 ${Math.max(width, height) * 0.025}px monospace`,
      heading: `700 ${Math.max(width, height) * 0.05}px monospace`,
    };
    super({
      styles: {
        font: fonts.default,
      },
      pages: [
        {
          labels: [
            {
              text: 'blocks',
              font: fonts.heading,
              x: width * 0.5,
              y: height * 0.25,
            },
            {
              text: 'A multiplayer VR experience',
              x: width * 0.5,
              y: height * 0.325,
            },
            {
              text: 'dani@gatunes © 2020',
              x: width * 0.5,
              y: height * 0.375,
            },
            {
              text: 'BE KIND TO EACH OTHER',
              x: width * 0.5,
              y: height * 0.65,
            },
          ],
        },
        {
          labels: [
            {
              text: 'Controls',
              font: fonts.heading,
              x: width * 0.5,
              y: height * 0.125,
            },
            {
              text: 'RIGHT JOYSTICK: Teleport',
              x: width * 0.5,
              y: height * 0.25,
            },
            {
              text: 'LEFT JOYSTICK: Rotate View',
              x: width * 0.5,
              y: height * 0.35,
            },
            {
              text: 'TRIGGER: Place Block',
              x: width * 0.5,
              y: height * 0.45,
            },
            {
              text: 'GRIP: Remove Block',
              x: width * 0.5,
              y: height * 0.55,
            },
            {
              text: 'A BUTTON: Take Photo',
              x: width * 0.5,
              y: height * 0.65,
            },
            {
              text: 'X BUTTON: Pick Block',
              x: width * 0.5,
              y: height * 0.75,
            },
          ],
        },
      ],
      width: 1,
      height: 2,
      textureWidth: width,
      textureHeight: height,
    });
    const cornersCells = 16;
    const cornersSize = cornersCells * 8;
    const cornersCell = cornersSize / cornersCells;
    const cornersHCell = cornersCell * 0.5;
    const cornersOffsets = [
      { x: 0, y: height - cornersSize },
      { x: width - cornersSize, y: height - cornersSize },
      { x: width - cornersSize, y: 0 },
      { x: 0, y: 0 },
    ];
    const aux = new Vector2();
    const center = new Vector2(width * 0.5, height * 0.5);
    const radius = Math.min(width, height) - 2;
    const corners = ({ ctx }) => {
      cornersOffsets.forEach((offset) => {
        for (let y = 0; y < cornersCells; y += 1) {
          for (let x = 0; x < cornersCells; x += 1) {
            aux.set(
              offset.x + (x * cornersCell) + cornersHCell,
              offset.y + (y * cornersCell) + cornersHCell
            );
            if (aux.distanceTo(center) > radius) {
              ctx.clearRect(aux.x - cornersHCell, aux.y - cornersHCell, cornersCell, cornersCell);
            }
          }
        }
      });
    };
    const pagination = ({ ctx }) => {
      ctx.translate(width * 0.5, height * 0.925);
      const size = width * 0.05;
      const spacing = width * 0.025;
      const offset = this.pages.length * -0.5 * (size + spacing) + size * 0.25;
      this.pages.forEach((v, id) => {
        ctx.fillStyle = this.page.id === id ? '#393' : '#000';
        ctx.fillRect(offset + (size + spacing) * id, 0, size, size);
      });
    };
    this.pages.forEach((page) => {
      if (!page.graphics) {
        page.graphics = [];
      }
      page.graphics.push(pagination);
      page.graphics.push(corners);
    });
    this.position.set(-1.5, 1.75, -2.5);
    this.updateMatrix();
    this.lookAt(0, 1.75, 0);
    this.updateMatrix();
    this.updateWorldMatrix();
    this.lastPageSwap = 0;
    this.setPage(0);
  }

  onBeforeRender({ animation: { time } }) {
    const { lastPageSwap, page, pages } = this;
    if (lastPageSwap + 6 > time) {
      return;
    }
    this.lastPageSwap = time;
    this.setPage((page.id + 1) % pages.length);
  }
}

export default Help;
