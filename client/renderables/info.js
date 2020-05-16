import UI from '../core/ui.js';

// Info UI

class Info extends UI {
  constructor() {
    const toggle = {
      background: 'transparent',
      border: 'transparent',
      x: 0,
      y: 0,
      width: 64,
      height: 64,
      onPointer: () => this.setPage((this.page.id + 1) % this.pages.length),
    };
    super({
      width: 0.05,
      height: 0.05,
      pages: [
        {
          buttons: [toggle],
          labels: [
            {
              text: '0fps',
              x: 32,
              y: 32,
            },
          ],
        },
        {
          buttons: [toggle],
          labels: [
            {
              text: 'x: 0',
              x: 32,
              y: 16,
            },
            {
              text: 'y: 0',
              x: 32,
              y: 32,
            },
            {
              text: 'z: 0',
              x: 32,
              y: 48,
            },
          ],
        },
        {
          buttons: [toggle],
          labels: [
            {
              text: 'players',
              x: 32,
              y: 24,
            },
            {
              text: '0',
              x: 32,
              y: 40,
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
    this.position.set(0.01, -0.1 / 3, 0.05);
    this.rotation.set(
      0,
      Math.PI * 0.5,
      Math.PI * -0.5
    );
    this.updateMatrix();
  }

  onBeforeRender({ fps }, { chunks: { player }, peers: { peers } }) {
    const { page: { id, labels } } = this;
    let hasUpdated = false;
    switch (id) {
      case Info.pages.fps: {
        const value = `${fps || 0}fps`;
        if (labels[0].text !== value) {
          labels[0].text = value;
          hasUpdated = true;
        }
        break;
      }
      case Info.pages.chunk: {
        ['x', 'y', 'z'].forEach((coord, i) => {
          const scaled = `${Math.floor(player[coord] * 2)}`;
          const value = `${coord}: ${scaled.length < 3 ? ' ' : ''}${scaled.length < 2 ? ' ' : ''}${scaled}`;
          if (labels[i].text !== value) {
            labels[i].text = value;
            hasUpdated = true;
          }
        });
        break;
      }
      case Info.pages.players: {
        const value = `${peers.length + 1}`;
        if (labels[1].text !== value) {
          labels[1].text = value;
          hasUpdated = true;
        }
        break;
      }
      default:
        break;
    }
    if (hasUpdated) {
      this.draw();
    }
  }
}

Info.pages = {
  fps: 0,
  chunk: 1,
  players: 2,
};

export default Info;
