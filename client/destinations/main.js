const authService = 'https://blocks.gatunes.com/auth/';

const [image] = document.getElementById('photo').getElementsByTagName('img');
const meta = document.getElementById('meta');
const [title, user] = meta.getElementsByTagName('div');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

let locations;
let current;

const renderLocation = (index) => {
  current = index;
  const location = locations[index];
  image.src = `${authService}location/${location._id}/photo`;
  const leadingZero = (v) => (v.length < 2 ? `0${v}` : v);
  const createdAt = new Date(location.createdAt);
  title.innerText = (
    `x:${location.position.x} y:${location.position.y} z:${location.position.z}`
    + ` - ${location.server.name}`
  );
  user.innerText = (
    `${location.user.name}`
    + ` - ${createdAt.getFullYear()}/${leadingZero(`${createdAt.getMonth() + 1}`)}/${leadingZero(`${createdAt.getDate()}`)}`
    + ` ${leadingZero(`${createdAt.getHours()}`)}:${leadingZero(`${createdAt.getMinutes()}`)}`
  );
};

const fetchLocations = (page = 0) => (
  fetch(`${authService}locations?page=${page}`)
    .then((res) => res.json())
    .then((json) => {
      locations = json;
      renderLocation(0);
    })
);

fetchLocations();

next.className = 'enabled';
next.addEventListener('click', () => {
  if (next.className !== 'enabled') {
    return;
  }
  prev.className = 'enabled';
  renderLocation(current + 1);
  if (current === locations.length - 1) {
    // TODO: fetch next page!
    next.className = '';
  }
});
prev.addEventListener('click', () => {
  if (prev.className !== 'enabled') {
    return;
  }
  next.className = 'enabled';
  renderLocation(current - 1);
  if (current === 0) {
    prev.className = '';
  }
});
