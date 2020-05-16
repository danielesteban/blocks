import UI from '../core/ui.js';

// FPS meter UI

class FPSMeter extends UI {
  constructor() {
    super({
      width: 0.05,
      height: 0.05,
      pages: [
        {
          labels: [
            {
              text: '0fps',
              x: 32,
              y: 32,
            },
          ],
        },
      ],
      styles: {
        font: '700 14px monospace',
      },
      textureWidth: 64,
      textureHeight: 64,
    });
    const [label] = this.page.labels;
    this.label = label;
    this.position.set(-0.01, -0.1 / 3, 0.05);
    this.rotation.set(
      0,
      Math.PI * -0.5,
      Math.PI * 0.5
    );
    this.updateMatrix();
  }

  onBeforeRender({ fps }) {
    if (this.fps === fps) {
      return;
    }
    this.fps = fps;
    this.label.text = `${fps || 0}fps`;
    this.draw();
  }
}

export default FPSMeter;
