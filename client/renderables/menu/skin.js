// Skin UI

const Skin = ({
  menu,
  pages,
  width,
  height,
}) => {
  const setLayer = (layer) => {
    const [opaque, transparent] = buttons; // eslint-disable-line no-use-before-define
    delete opaque.background;
    delete transparent.background;
    const options = { opaque, transparent };
    options[layer].background = '#393';
    menu.world.player.editSkin(layer);
    if (menu.page.id === pages.skin) {
      menu.draw();
    }
  };
  const buttons = [
    {
      label: 'Head',
      x: width * 0.0625,
      y: height * 0.0625,
      width: width * 0.40625,
      height: height * 0.1875,
      onPointer: () => setLayer('opaque'),
    },
    {
      label: 'Hair',
      x: width * 0.53125,
      y: height * 0.0625,
      width: width * 0.40625,
      height: height * 0.1875,
      onPointer: () => setLayer('transparent'),
    },
    {
      background: 'transparent',
      x: width * 0.0625,
      y: height * 0.3125,
      width: width * 0.1875,
      height: height * 0.1875,
      onPointer: () => setTimeout(() => menu.setPage(pages.picker), 0),
    },
    {
      label: 'Color Picker',
      x: width * 0.25,
      y: height * 0.3125,
      width: width * 0.6875,
      height: height * 0.1875,
      onPointer: () => setTimeout(() => menu.setPage(pages.picker), 0),
    },
    {
      label: 'Randomize',
      x: width * 0.125,
      y: height * 0.5625,
      width: width * 0.75,
      height: height * 0.125,
      onPointer: () => (
        menu.world.player.skinEditor.regenerate()
      ),
    },
    {
      background: '#393',
      label: 'Save',
      x: width * 0.3125,
      y: height * 0.75,
      width: width * 0.375,
      height: height * 0.1875,
      onPointer: () => {
        menu.world.player.saveSkin();
        menu.setPage(0);
      },
    },
  ];
  const graphics = [
    ({ ctx }) => {
      ctx.translate(width * 0.0625, height * 0.3125);
      ctx.fillStyle = `#${menu.picker.color.getHexString()}`;
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.rect(0, 0, width * 0.1875, width * 0.1875);
      ctx.fill();
      ctx.stroke();
    },
  ];
  return {
    key: 'skin',
    page: {
      buttons,
      graphics,
      onPageUpdate: (prev, current) => {
        const isEditing = !!menu.world.player.skinEditor;
        if (
          !isEditing
          && current === pages.skin
        ) {
          setLayer('transparent');
        }
        if (
          isEditing
          && current !== pages.picker
          && current !== pages.skin
        ) {
          menu.world.player.disposeSkinEditor();
        }
      },
    },
    state: {},
  };
};

export default Skin;
