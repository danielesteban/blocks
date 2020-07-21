// Photos UI

const Photos = ({
  menu,
  pages,
  width,
  height,
}) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    image.loaded = true;
    if (menu.page.id === pages.photos) {
      menu.draw();
    }
  };
  const buttons = [
    {
      label: 'Teleport',
      x: width * 0.35,
      y: height * 0.828,
      width: width * 0.3,
      height: width * 0.05,
      isVisible: false,
      onPointer: () => {
        // eslint-disable-next-line no-use-before-define
        const { location } = state;
        if (location) {
          menu.world.goToLocation(location);
        }
      },
    },
    {
      label: '<',
      x: width * 0.025,
      y: height * 0.9,
      width: width * 0.075,
      height: width * 0.075,
      isVisible: false,
      onPointer: () => {
        // eslint-disable-next-line no-use-before-define
        const { location, locations } = state;
        if (locations) {
          // eslint-disable-next-line no-use-before-define
          displayLocation(
            (location.index > 0 ? location.index : locations.length) - 1
          );
        }
      },
    },
    {
      label: '>',
      x: width * 0.9,
      y: height * 0.9,
      width: width * 0.075,
      height: width * 0.075,
      isVisible: false,
      onPointer: () => {
        // eslint-disable-next-line no-use-before-define
        const { location, locations } = state;
        if (locations) {
          // eslint-disable-next-line no-use-before-define
          displayLocation(
            (location.index + 1) % locations.length
          );
        }
      },
    },
  ];
  const labels = [
    {
      font: '700 30px monospace',
      x: width * 0.5,
      y: height * 0.11,
    },
    {
      font: '700 30px monospace',
      x: width * 0.5,
      y: height * 0.94,
    },
    {
      text: 'Press the A button',
      font: '700 30px monospace',
      x: width * 0.5,
      y: height * 0.45,
    },
    {
      text: 'to take your first photo',
      font: '700 30px monospace',
      x: width * 0.5,
      y: height * 0.55,
    },
  ];
  const graphics = [
    ({ ctx }) => {
      if (image.loaded) {
        const h = (image.height * width) / image.width;
        const y = (height - h) / 2;
        ctx.drawImage(
          image,
          0,
          0,
          image.width,
          image.height,
          0,
          y,
          width,
          h
        );
      } else {
        // eslint-disable-next-line no-use-before-define
        loadImage();
      }
    },
  ];
  const state = {
    update: () => {
      if (!menu.world.player.session.session) {
        buttons.forEach((button) => {
          button.isVisible = false;
          button.isDisabled = true;
        });
        labels.forEach((label, index) => {
          label.isVisible = index > 1;
        });
      } else {
        menu.world.player.session.getLocations()
          .then((locations) => {
            const hasLocations = locations.length !== 0;
            buttons.forEach((button) => {
              button.isVisible = hasLocations;
              button.isDisabled = !hasLocations;
            });
            labels.forEach((label, index) => {
              label.isVisible = (index <= 1 && hasLocations) || (index > 1 && !hasLocations);
            });
            if (locations.length) {
              state.locations = locations;
              // eslint-disable-next-line no-use-before-define
              displayLocation(0);
            } else if (menu.page.id === pages.photos) {
              menu.draw();
            }
          });
      }
    },
  };
  const loadImage = () => {
    const { location } = state;
    if (location) {
      image.src = location.photo;
    }
  };
  const displayLocation = (index) => {
    const { locations } = state;
    const [title, date] = labels;
    locations[index].getMeta()
      .then((location) => {
        const { server, createdAt } = location;
        state.location = {
          ...location,
          index,
        };
        title.text = server.name;
        date.text = `${createdAt.date} - ${createdAt.time}`;
        delete image.loaded;
        if (menu.page.id === pages.photos) {
          loadImage();
        }
      });
  };
  return {
    key: 'photos',
    page: {
      buttons,
      labels,
      graphics,
      onPageUpdate: (prev, current) => {
        // @incomplete:
        // This should be fired by an event listening to session changes.
        // This way it will also properly react to the user login/logout
        if (current === pages.photos && !state.locations) {
          state.update();
        }
      },
    },
    state,
  };
};

export default Photos;
