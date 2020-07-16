import { Color } from '../../core/three.js';

// ColorPicker UI

const PaletteStorageKey = 'blocks::palette';

const ColorPicker = ({
  menu,
  pages,
  width,
  height,
}) => {
  const aux = new Color();
  const color = new Color(Math.random() * 0xFFFFFF);
  const area = {
    color: color.clone(),
    x: width * 0.05,
    y: height * 0.05,
    width: width * 0.75,
    height: height * 0.75,
  };
  const palette = {
    count: 7,
    colors: JSON.parse(localStorage.getItem(PaletteStorageKey) || '[]'),
    x: width * 0.05,
    y: height * 0.85,
    size: width * 0.1,
    spacing: width * 0.033,
    update() {
      const { buttons, colors } = this;
      const hex = color.getHex();
      const exists = colors.indexOf(hex);
      if (~exists) {
        colors.splice(exists, 1);
      }
      colors.unshift(hex);
      localStorage.setItem(PaletteStorageKey, JSON.stringify(colors));
      buttons.forEach(((button, i) => {
        button.background = `#${aux.setHex(colors[i] || 0).getHexString()}`;
      }));
    },
  };
  palette.buttons = [...Array(palette.count)].map((v, i) => ({
    background: `#${aux.setHex(palette.colors[i] || 0).getHexString()}`,
    x: palette.x + ((palette.size + palette.spacing) * i),
    y: palette.y,
    width: palette.size,
    height: palette.size,
    onPointer: () => {
      color.setHex(palette.colors[i]);
      area.color.copy(color);
      palette.update();
      menu.setPage(menu.page.back);
    },
  }));
  const state = {
    color,
    setColor: ({ r, g, b }) => {
      color.setRGB(r / 0xFF, g / 0xFF, b / 0xFF);
      area.color.copy(color);
      palette.update();
      if (
        menu.page.id === pages.picker
        || menu.page.id === pages.skin
      ) {
        menu.draw();
      }
    },
  };
  const strip = {
    x: width * 0.85,
    y: height * 0.05,
    width: width * 0.1,
    height: height * 0.75,
  };
  const graphics = [
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
      [
        '255,0,0',
        '255,0,255',
        '0,0,255',
        '0,255,255',
        '0,255,0',
        '255,255,0',
        '255,0,0',
      ].forEach((color, i) => {
        grd.addColorStop(Math.min(0.17 * i, 1), `rgb(${color})`);
      });
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);
    },
  ];
  const buttons = [
    {
      x: 0,
      y: 0,
      width,
      height,
      isVisible: false,
      onPointer: () => {
        const { context: ctx, page, pointer } = menu;
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
            color.setRGB(
              imageData[0] / 0xFF,
              imageData[1] / 0xFF,
              imageData[2] / 0xFF
            );
            palette.update();
            if (i === 0) {
              menu.setPage(page.back);
            } else {
              area.color.setRGB(
                imageData[0] / 0xFF,
                imageData[1] / 0xFF,
                imageData[2] / 0xFF
              );
              menu.draw();
            }
            break;
          }
        }
      },
    },
    ...palette.buttons,
  ];
  return {
    key: 'picker',
    page: { buttons, graphics },
    state,
  };
};

export default ColorPicker;
