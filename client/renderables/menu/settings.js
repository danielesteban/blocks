// Settings UI

const Settings = ({
  menu,
  pages,
  width,
  height,
}) => {
  const setRenderRadius = (radius) => {
    const [low, mid, high] = buttons; // eslint-disable-line no-use-before-define
    delete low.background;
    delete mid.background;
    delete high.background;
    const options = { 8: low, 12: mid, 16: high };
    options[radius].background = '#393';
    if (menu.page.id === pages.settings) {
      menu.draw();
    }
  };
  const buttons = [
    {
      background: '#393',
      label: 'Low',
      x: width * 0.0625,
      y: height * 0.3125,
      width: width * 0.25,
      height: height * 0.1875,
      onPointer: () => menu.world.updateRenderRadius(8),
    },
    {
      label: 'Mid',
      x: width * 0.375,
      y: height * 0.3125,
      width: width * 0.25,
      height: height * 0.1875,
      onPointer: () => menu.world.updateRenderRadius(12),
    },
    {
      label: 'High',
      x: width * 0.6875,
      y: height * 0.3125,
      width: width * 0.25,
      height: height * 0.1875,
      onPointer: () => menu.world.updateRenderRadius(16),
    },
    {
      label: 'Cancel',
      x: width * 0.0625,
      y: height * 0.75,
      width: width * 0.375,
      height: height * 0.1875,
      onPointer: () => {
        menu.setPage(pages.options);
      },
    },
    {
      background: '#393',
      label: 'Save',
      x: width * 0.5625,
      y: height * 0.75,
      width: width * 0.375,
      height: height * 0.1875,
      onPointer: () => {
        menu.setPage(pages.options);
        localStorage.setItem('blocks::renderRadius', menu.world.renderRadius);
      },
    },
  ];
  const labels = [
    {
      text: 'Render distance',
      x: width * 0.5,
      y: height * 0.1875,
    },
  ];
  return {
    key: 'settings',
    page: { buttons, labels },
    state: { setRenderRadius },
  };
};

export default Settings;
