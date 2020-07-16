import UI from '../ui.js';

// Tabs UI

class Tabs extends UI {
  constructor({ menu, pages }) {
    const width = 96;
    const height = 512;
    const step = height / pages.length;
    super({
      page: 0,
      pages: [
        {
          buttons: pages.map(({ name, page }, i) => ({
            label: name,
            x: 0,
            y: step * i,
            width,
            height: step,
            page,
            onPointer: () => {
              if (menu.page.id !== page) {
                menu.setPage(page);
              }
            },
          })),
        },
      ],
      width: 0.25,
      height: 1,
      textureWidth: width,
      textureHeight: height,
    });
    this.position.x = -0.625;
    this.position.z = 0.0625;
    this.rotation.y = Math.PI * 0.15;
    this.updateMatrix();
    this.updateWorldMatrix();
  }

  setActive(page) {
    if (page === 0) {
      this.visible = false;
      return;
    }
    const { buttons: pages } = this.pages[0];
    if (!pages.find((button) => (button.page === page))) {
      return;
    }
    pages.forEach((button) => {
      button.background = button.page === page ? '#393' : undefined;
    });
    this.draw();
    this.visible = true;
  }
}

export default Tabs;
