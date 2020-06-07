// Options UI

const Options = ({ menu, pages }) => {
  const state = { blockType: 0x01 };
  const setBlock = (type) => {
    const [block, glass, light] = buttons; // eslint-disable-line no-use-before-define
    delete block.background;
    delete glass.background;
    delete light.background;
    const options = { 0x01: block, 0x02: glass, 0x03: light };
    options[type].background = '#393';
    state.blockType = type;
    menu.setPage(pages.options);
  };
  const setLocomotion = (type) => {
    const [
      /* block */,
      /* glass */,
      /* light */,
      /* color */,
      /* picker */, // eslint-disable-line comma-style
      teleport,
      fly,
    ] = buttons; // eslint-disable-line no-use-before-define
    delete fly.background;
    delete teleport.background;
    const options = { fly, teleport };
    options[type].background = '#393';
    const locomotions = { fly: 0, teleport: 1 };
    menu.world.locomotion = locomotions[type];
    menu.setPage(pages.options);
  };
  const buttons = [
    {
      background: '#393',
      label: 'Block',
      x: 8,
      y: 8,
      width: 32,
      height: 24,
      onPointer: () => setBlock(0x01),
    },
    {
      label: 'Glass',
      x: 48,
      y: 8,
      width: 32,
      height: 24,
      onPointer: () => setBlock(0x02),
    },
    {
      label: 'Light',
      x: 88,
      y: 8,
      width: 32,
      height: 24,
      onPointer: () => setBlock(0x03),
    },
    {
      x: 8,
      y: 40,
      width: 24,
      height: 24,
      onPointer: () => menu.setPage(pages.picker),
    },
    {
      label: 'Color Picker',
      x: 32,
      y: 40,
      width: 88,
      height: 24,
      onPointer: () => menu.setPage(pages.picker),
    },
    {
      background: '#393',
      label: 'Teleport',
      x: 8,
      y: 72,
      width: 52,
      height: 24,
      onPointer: () => setLocomotion('teleport'),
    },
    {
      label: 'Fly',
      x: 68,
      y: 72,
      width: 52,
      height: 24,
      onPointer: () => setLocomotion('fly'),
    },
    {
      label: 'Edit Avatar',
      x: 16,
      y: 104,
      width: 96,
      height: 16,
      onPointer: () => menu.skin.setLayer('transparent'),
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
    state,
  };
};

export default Options;
