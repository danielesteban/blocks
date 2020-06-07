// Skin UI

const Skin = ({ menu, pages }) => {
  const setLayer = (layer) => {
    const [opaque, transparent] = buttons; // eslint-disable-line no-use-before-define
    delete opaque.background;
    delete transparent.background;
    const options = { opaque, transparent };
    options[layer].background = '#393';
    menu.world.player.editSkin(layer);
    menu.setPage(pages.skin);
  };
  const buttons = [
    {
      label: 'Head',
      x: 8,
      y: 8,
      width: 52,
      height: 24,
      onPointer: () => setLayer('opaque'),
    },
    {
      label: 'Hair',
      x: 68,
      y: 8,
      width: 52,
      height: 24,
      onPointer: () => setLayer('transparent'),
    },
    {
      x: 8,
      y: 40,
      width: 24,
      height: 24,
      onPointer: () => setTimeout(() => menu.setPage(pages.picker), 0),
    },
    {
      label: 'Color Picker',
      x: 32,
      y: 40,
      width: 88,
      height: 24,
      onPointer: () => setTimeout(() => menu.setPage(pages.picker), 0),
    },
    {
      label: 'Randomize',
      x: 16,
      y: 72,
      width: 96,
      height: 16,
      onPointer: () => (
        menu.world.player.skinEditor.regenerate()
      ),
    },
    {
      label: 'Cancel',
      x: 8,
      y: 96,
      width: 48,
      height: 24,
      onPointer: () => {
        menu.setPage(pages.options);
        menu.world.player.disposeSkinEditor();
      },
    },
    {
      background: '#393',
      label: 'Save',
      x: 72,
      y: 96,
      width: 48,
      height: 24,
      onPointer: () => {
        menu.setPage(pages.options);
        menu.world.player.saveSkin();
      },
    },
  ];
  const graphics = [
    ({ ctx }) => {
      ctx.translate(8, 40);
      ctx.fillStyle = `#${menu.picker.color.getHexString()}`;
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.rect(0, 0, 24, 24);
      ctx.fill();
      ctx.stroke();
    },
  ];
  return {
    page: { buttons, graphics },
    state: { setLayer },
  };
};

export default Skin;
