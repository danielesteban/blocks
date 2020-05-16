import UI from '../core/ui.js';

// Menu UI

class Menu extends UI {
  constructor() {
    super({
      buttons: [
        {
          background: 'transparent',
          font: '700 24px monospace',
          x: 0,
          y: 0,
          width: 128,
          height: 128,
          onPointer: () => this.toggle(),
        },
      ],
    });
    this.position.y = -0.1 / 3;
    this.position.z = 0.05;
    this.rotation.set(
      0,
      Math.PI * -0.5,
      Math.PI * 0.5
    );
    this.blockColor = {
      r: Math.floor(Math.random() * 0x100),
      g: Math.floor(Math.random() * 0x100),
      b: Math.floor(Math.random() * 0x100),
    };
    this.blockType = 0x01;
    this.isOpen = true;
    this.toggle();
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const {
      blockType,
      buttons,
      isOpen,
      position,
      scale,
    } = this;
    position.x = -(0.01 + (isOpen ? 0.002 : 0));
    scale.set(isOpen ? 0.25 : 0.05, isOpen ? 0.25 : 0.05, 1);
    this.updateMatrix();
    this.updateWorldMatrix();
    buttons.length = 1;
    const [toggle] = buttons;
    if (isOpen) {
      toggle.label = '';
    } else {
      switch (blockType) {
        case 0x01:
          toggle.label = 'Light';
          break;
        case 0x02:
          toggle.label = 'Block';
          break;
        default:
          toggle.label = '';
          break;
      }
    }
    toggle.border = isOpen ? '' : 'transparent';
    if (isOpen) {
      buttons.push(
        {
          label: 'Block',
          background: blockType === 0x02 ? '#393' : undefined,
          x: 16,
          y: 20,
          width: 96,
          height: 24,
          onPointer: () => {
            this.blockType = 0x02;
            this.toggle();
          },
        },
        {
          label: 'Light',
          background: blockType === 0x01 ? '#393' : undefined,
          x: 16,
          y: 52,
          width: 96,
          height: 24,
          onPointer: () => {
            this.blockType = 0x01;
            this.toggle();
          },
        },
        {
          isDisabled: true,
          label: 'Color Picker',
          x: 16,
          y: 84,
          width: 96,
          height: 24,
        }
      );
    }
    this.draw();
  }
}

export default Menu;
