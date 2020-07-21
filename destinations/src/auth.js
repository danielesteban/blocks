const authService = 'https://blocks.gatunes.com/auth/';

const leadingZero = (v) => (v.length < 2 ? `0${v}` : v);

export const getUserSkin = (id) => (
  `${authService}user/${id}/skin`
);

export const fetchLocations = ({ server, user }) => {
  let endpoint = 'locations';
  if (server) {
    endpoint = `server/${server}/locations`;
  } else if (user) {
    endpoint = `user/${user}/locations`;
  }
  return fetch(`${authService}${endpoint}`)
    .then((res) => res.json())
    .then((locations) => locations.map((location) => {
      const createdAt = new Date(location.createdAt);
      return {
        ...location,
        name: `x:${location.position.x} y:${location.position.y} z:${location.position.z}`,
        date: (
          `${createdAt.getFullYear()}/${leadingZero(`${createdAt.getMonth() + 1}`)}/${leadingZero(`${createdAt.getDate()}`)}`
          + ` ${leadingZero(`${createdAt.getHours()}`)}:${leadingZero(`${createdAt.getMinutes()}`)}`
        ),
        link: `${authService}location/${location._id}`,
        photo: `${authService}location/${location._id}/photo`,
      };
    }));
};

export const fetchServer = (id) => (
  fetch(`${authService}server/${id}/meta`)
    .then((res) => res.json())
    .then((server) => ({
      ...server,
      link: `${authService}server/${server._id}`,
      map: `${server.url}map`,
    }))
);

export const fetchServers = () => (
  fetch(`${authService}servers`)
    .then((res) => res.json())
);

export const fetchUser = (id) => (
  fetch(`${authService}user/${id}/meta`)
    .then((res) => res.json())
    .then((user) => ({
      ...user,
      skin: `${authService}location/${user._id}/skin`,
    }))
);
