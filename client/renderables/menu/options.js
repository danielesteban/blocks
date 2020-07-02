// Options UI

const Options = ({
  menu,
  pages,
  width,
  height,
}) => {
  const state = { blockType: 0x01 };
  const setBlockType = (type) => {
    const [block, glass, light] = buttons; // eslint-disable-line no-use-before-define
    delete block.background;
    delete glass.background;
    delete light.background;
    const options = { 0x01: block, 0x02: glass, 0x03: light };
    if (options[type]) {
      options[type].background = '#393';
    }
    state.blockType = type;
    if (menu.page.id === pages.options) {
      menu.setPage(pages.options);
    }
  };
  state.setBlockType = setBlockType;
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
      x: width * 0.0625,
      y: height * 0.0625,
      width: width * 0.25,
      height: height * 0.1875,
      onPointer: () => setBlockType(0x01),
    },
    {
      label: 'Glass',
      x: width * 0.375,
      y: height * 0.0625,
      width: width * 0.25,
      height: height * 0.1875,
      onPointer: () => setBlockType(0x02),
    },
    {
      label: 'Light',
      x: width * 0.6875,
      y: height * 0.0625,
      width: width * 0.25,
      height: height * 0.1875,
      onPointer: () => setBlockType(0x03),
    },
    {
      background: 'transparent',
      x: width * 0.0625,
      y: height * 0.3125,
      width: width * 0.1875,
      height: width * 0.1875,
      onPointer: () => menu.setPage(pages.picker),
    },
    {
      label: 'Color Picker',
      x: width * 0.25,
      y: height * 0.3125,
      width: width * 0.6875,
      height: height * 0.1875,
      onPointer: () => menu.setPage(pages.picker),
    },
    {
      background: '#393',
      label: 'Teleport',
      x: width * 0.0625,
      y: height * 0.5625,
      width: width * 0.40625,
      height: height * 0.1875,
      onPointer: () => setLocomotion('teleport'),
    },
    {
      label: 'Fly',
      x: width * 0.53125,
      y: height * 0.5625,
      width: width * 0.40625,
      height: height * 0.1875,
      onPointer: () => setLocomotion('fly'),
    },
    {
      label: 'Skin',
      x: width * 0.0625,
      y: height * 0.8125,
      width: width * 0.40625,
      height: height * 0.125,
      onPointer: () => menu.skin.setLayer('transparent'),
    },
    {
      label: 'Settings',
      x: width * 0.53125,
      y: height * 0.8125,
      width: width * 0.40625,
      height: height * 0.125,
      onPointer: () => menu.setPage(pages.settings),
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
    key: 'options',
    page: { buttons, graphics },
    state,
  };
};

export default Options;
