import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneBufferGeometry,
  Vector3,
} from './three.js';

// A general purpose UI class

class UI extends Mesh {
  static setupGeometry() {
    UI.geometry = new PlaneBufferGeometry(1, 1, 1, 1);
  }

  constructor({
    width = 0.5,
    height = 0.5,
    page,
    pages = [],
    styles = {},
    textureWidth = 128,
    textureHeight = 128,
  }) {
    if (!UI.geometry) {
      UI.setupGeometry();
    }
    styles = {
      background: 'rgba(0, 0, 0, .2)',
      color: '#fff',
      font: '700 10px monospace',
      textAlign: 'center',
      textBaseline: 'middle',
      ...styles,
      button: {
        background: '#111',
        border: '#000',
        color: '#fff',
        ...(styles.button || {}),
        disabled: {
          background: '#555',
          border: '#000',
          color: '#777',
          ...(styles.button && styles.button.disabled ? styles.button.disabled : {}),
        },
      },
    };
    const renderer = document.createElement('canvas');
    renderer.width = textureWidth;
    renderer.height = textureHeight;
    const texture = new CanvasTexture(renderer);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    super(
      UI.geometry,
      new MeshBasicMaterial({
        map: texture,
        transparent: true,
      })
    );
    this.matrixAutoUpdate = false;
    this.scale.set(width, height, 1);
    this.context = renderer.getContext('2d');
    this.context.imageSmoothingEnabled = false;
    this.pages = pages;
    this.pointer = new Vector3();
    this.renderer = renderer;
    this.styles = styles;
    this.texture = texture;
    if (page !== undefined) {
      this.setPage(page);
    }
  }

  dispose() {
    const { material, texture } = this;
    material.dispose();
    texture.dispose();
  }

  draw() {
    const {
      page: {
        buttons,
        graphics,
        labels,
      },
      context: ctx,
      renderer,
      styles,
      texture,
    } = this;
    ctx.clearRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = styles.background;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    buttons.forEach(({
      label,
      x,
      y,
      width,
      height,
      background,
      border,
      color,
      font,
      textAlign,
      textBaseline,
      isDisabled,
    }) => {
      const button = isDisabled ? styles.button.disabled : styles.button;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.fillStyle = background || button.background;
      ctx.strokeStyle = border || button.border;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color || button.color;
      ctx.font = font || button.font || styles.font;
      ctx.textAlign = textAlign || button.textAlign || styles.textAlign;
      ctx.textBaseline = textBaseline || button.textBaseline || styles.textBaseline;
      if (label) {
        ctx.fillText(
          label,
          width * 0.5,
          height * 0.5
        );
      }
      ctx.restore();
    });
    labels.forEach(({
      x,
      y,
      color,
      font,
      text,
      textAlign,
      textBaseline,
    }) => {
      ctx.save();
      ctx.fillStyle = color || styles.color;
      ctx.font = font || styles.font;
      ctx.textAlign = textAlign || styles.textAlign;
      ctx.textBaseline = textBaseline || styles.textBaseline;
      ctx.fillText(text, x, y);
      ctx.restore();
    });
    graphics.forEach((draw) => {
      ctx.save();
      draw({ ctx, styles });
      ctx.restore();
    });
    texture.needsUpdate = true;
  }

  onPointer({ point, primary, secondary }) {
    const { page: { buttons }, pointer, renderer } = this;
    this.worldToLocal(pointer.copy(point));
    pointer.set(
      (pointer.x + 0.5) * renderer.width,
      (1 - (pointer.y + 0.5)) * renderer.height,
      0
    );
    if (!primary && !secondary) {
      return;
    }
    const l = buttons.length - 1;
    for (let i = l; i >= 0; i -= 1) {
      const {
        isDisabled,
        x,
        y,
        width,
        height,
        onPointer,
      } = buttons[i];
      if (
        !isDisabled
        && onPointer
        && pointer.x >= x
        && pointer.x <= x + width
        && pointer.y >= y
        && pointer.y <= y + height
      ) {
        onPointer({ primary, secondary });
        break;
      }
    }
  }

  setPage(page) {
    const { pages } = this;
    this.page = {
      id: page,
      buttons: [],
      graphics: [],
      labels: [],
      ...pages[page],
    };
    this.draw();
  }
}

export default UI;
