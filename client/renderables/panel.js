import UI from '../core/ui.js';

// Panel UI

class Panel extends UI {
  constructor({
    handedness = 'right',
    page = 0,
    pages,
    textureWidth,
    textureHeight,
  }) {
    super({
      pages,
      textureWidth,
      textureHeight,
    });
    this.handedness = handedness;
    this.position.y = -0.1 / 3;
    this.position.z = 0.05;
    this.rotation.set(
      0,
      Math.PI * 0.5 * (handedness === 'right' ? 1 : -1),
      Math.PI * 0.5 * (handedness === 'right' ? -1 : 1)
    );
    this.setPage(page);
  }

  dispose() {
    super.dispose();
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  onPointer({ point, primary, secondary }) {
    const { page } = this;
    if (page.id === 0) {
      this.setPage(1);
    }
    super.onPointer({ point, primary, secondary });
  }

  setPage(page) {
    const {
      handedness,
      position,
      scale,
      timer,
    } = this;
    position.x = (0.01 + (page > 0 ? 0.002 : 0)) * (handedness === 'right' ? 1 : -1);
    scale.set(page > 0 ? 0.25 : 0.05, page > 0 ? 0.25 : 0.05, 1);
    this.updateMatrix();
    this.updateWorldMatrix();
    if (timer) {
      clearTimeout(timer);
    }
    if (this.page && this.page.id !== 0 && page === 1) {
      this.timer = setTimeout(() => this.setPage(0), 300);
    }
    super.setPage(page);
  }
}

export default Panel;
