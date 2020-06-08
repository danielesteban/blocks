import UI from './ui.js';

// Help UI

class Help extends UI {
  constructor() {
    const width = 256;
    const height = 512;
    const fonts = {
      default: `700 ${Math.max(width, height) * 0.03}px monospace`,
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
              y: height * 0.1,
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
              text: 'A/X BUTTON: Pick Color',
              x: width * 0.5,
              y: height * 0.65,
            },
          ],
        },
        {
          labels: [
            {
              text: 'Menu and Map',
              font: fonts.heading,
              x: width * 0.5,
              y: height * 0.1,
            },
            {
              text: 'Hold TRIGGER and point',
              x: width * 0.5,
              y: height * 0.25,
            },
            {
              text: 'to the back of your...',
              x: width * 0.5,
              y: height * 0.3,
            },
            {
              text: 'LEFT HAND: For the menu',
              x: width * 0.5,
              y: height * 0.45,
            },
            {
              text: 'RIGHT HAND: For the map',
              x: width * 0.5,
              y: height * 0.55,
            },
          ],
        },
      ],
      width: 1,
      height: 2,
      textureWidth: width,
      textureHeight: height,
    });
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
    if (lastPageSwap + 5 > time) {
      return;
    }
    this.lastPageSwap = time;
    this.setPage((page.id + 1) % pages.length);
  }
}

export default Help;
