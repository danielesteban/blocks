import Panel from './panel.js';

// Map UI

class Map extends Panel {
  constructor() {
    super({
      handedness: 'right',
      pages: [
        {
          labels: [
            {
              text: 'Map',
              font: '700 128px monospace',
              x: 272,
              y: 272,
            },
          ],
        },
        {
          buttons: [
            {
              background: '#555',
              border: 'transparent',
              x: 0,
              y: 0,
              width: 544,
              height: 544,
              onPointer: () => this.setPage(0),
            },
          ],
          graphics: [
            ({ ctx }) => {
              const {
                chunk,
                image,
                renderer: { width, height },
              } = this;
              if (!chunk) {
                return;
              }
              if (image.loaded) {
                ctx.drawImage(image, 0, 0, width, height);
              }
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const radius = 8;
              const size = ((radius * 2) + 1);
              const ratio = width / size;
              ctx.font = `${ratio * 0.3}px monospace`;
              for (let x = 2; x < size; x += 3) {
                ctx.fillText(
                  `${(chunk.x - radius) + x}`,
                  (x + 0.5) * ratio, ratio * 0.5
                );
              }
              for (let z = 2; z < size; z += 3) {
                ctx.fillText(
                  `${(chunk.z - radius) + z}`,
                  width - 1 - (ratio * 0.5), (z + 0.5) * ratio
                );
              }
            },
          ],
        },
      ],
      size: 0.4,
      textureWidth: 544,
      textureHeight: 544,
    });
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      image.loaded = true;
      if (this.page.id === 1) {
        this.draw();
      }
    };
    this.image = image;
  }

  dispose() {
    super.dispose();
    const { image } = this;
    image.onload = null;
  }

  loadImage() {
    const { chunk, image } = this;
    image.src = `/map/@${chunk.x},${chunk.z}`;
  }

  setChunk({ x, z }) {
    const { image, page } = this;
    this.chunk = { x, z };
    delete image.loaded;
    if (page.id === 1) {
      this.loadImage();
    }
  }

  setPage(page) {
    const { image } = this;
    if (page === 1 && !image.loaded) {
      this.loadImage();
    }
    super.setPage(page);
  }
}

export default Map;
