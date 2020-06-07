import { Color } from '../../core/three.js';

// ColorPicker UI

const PaletteStorageKey = 'blocks::palette';

const ColorPicker = ({ width, height }) => {
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
    count: 5,
    colors: JSON.parse(localStorage.getItem(PaletteStorageKey) || '[]'),
    x: width * 0.05,
    y: height * 0.85,
    size: width * 0.1,
    spacing: width * 0.03,
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
      /* eslint-disable no-use-before-define */
      if (state.isPicking) {
        picker.toggle();
      }
      /* eslint-enable no-use-before-define */
    },
  };
  palette.buttons = [...Array(palette.count)].map((v, i) => ({
    background: `#${aux.setHex(palette.colors[i] || 0).getHexString()}`,
    x: palette.x + ((palette.size + palette.spacing) * i),
    y: palette.y,
    width: palette.size,
    height: palette.size,
    onPointer: ({ target }) => {
      color.setHex(palette.colors[i]);
      area.color.copy(color);
      palette.update();
      target.setPage(target.page.back);
    },
  }));
  const state = {
    color,
    update: ({ r, g, b }) => {
      color.setRGB(r, g, b);
      area.color.copy(color);
      palette.update();
    },
  };
  const strip = {
    x: width * 0.85,
    y: height * 0.05,
    width: width * 0.1,
    height: height * 0.75,
  };
  const picker = {
    label: 'Block',
    x: width - palette.x - (palette.size * 2.5),
    y: palette.y,
    width: palette.size * 2.5,
    height: palette.size,
    toggle: () => {
      state.isPicking = !state.isPicking;
      picker.background = state.isPicking ? '#393' : undefined;
    },
    onPointer({ target }) {
      picker.toggle();
      target.draw();
    },
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
  ];
  const buttons = [
    {
      x: 0,
      y: 0,
      width,
      height,
      isVisible: false,
      onPointer: ({ target }) => {
        const { context: ctx, page, pointer } = target;
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
              target.setPage(page.back);
            } else {
              area.color.setRGB(
                imageData[0] / 0xFF,
                imageData[1] / 0xFF,
                imageData[2] / 0xFF
              );
              target.draw();
            }
            break;
          }
        }
      },
    },
    ...palette.buttons,
    picker,
  ];
  return {
    page: { buttons, graphics },
    state,
  };
};

export default ColorPicker;
