const authService = 'https://blocks.gatunes.com/auth/';

const photo = document.getElementById('photo');
const [link] = photo.getElementsByTagName('a');
const [image] = photo.getElementsByTagName('img');
const meta = document.getElementById('meta');
const [title, sharing, user] = meta.getElementsByTagName('div');
const [twitter, facebook] = sharing.getElementsByTagName('a');
const [skinCanvas] = user.getElementsByTagName('canvas');
const [username] = user.getElementsByTagName('div');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

let current;
const locations = [];

const skin = {
  canvas: skinCanvas,
  ctx: skinCanvas.getContext('2d'),
  texture: new Image(),
};
skin.canvas.width = 32;
skin.canvas.height = 32;
skin.ctx.imageSmoothingEnabled = false;
skin.texture.onload = () => {
  const { canvas, ctx, texture } = skin;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(texture, 8, 8, 8, 8, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(texture, 40, 8, 8, 8, 0, 0, canvas.width, canvas.height);
};

const renderLocation = (index) => {
  current = index;
  const location = locations[index];
  image.src = `${authService}location/${location._id}/photo`;
  image.style.display = '';
  const leadingZero = (v) => (v.length < 2 ? `0${v}` : v);
  const createdAt = new Date(location.createdAt);
  title.innerText = (
    `x:${location.position.x} y:${location.position.y} z:${location.position.z}`
    + ` - ${location.server.name}`
  );
  skin.texture.src = `${authService}user/${location.user._id}/skin`;
  username.innerText = (
    `${location.user.name}`
    + ` - ${createdAt.getFullYear()}/${leadingZero(`${createdAt.getMonth() + 1}`)}/${leadingZero(`${createdAt.getDate()}`)}`
    + ` ${leadingZero(`${createdAt.getHours()}`)}:${leadingZero(`${createdAt.getMinutes()}`)}`
  );
  link.href = `${authService}location/${location._id}`;
  const url = encodeURIComponent(link.href);
  facebook.href = `https://facebook.com/sharer/sharer.php?u=${url}`;
  twitter.href = `https://twitter.com/intent/tweet?url=${url}`;
};

[facebook, twitter].forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(link.href, '', 'width=640,height=720');
  });
  link.target = '_blank';
});
next.className = 'enabled';
next.addEventListener('click', () => {
  if (next.className !== 'enabled') {
    return;
  }
  prev.className = 'enabled';
  renderLocation(current + 1);
  if (current === locations.length - 1) {
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

const fetchLocations = (page = 1) => (
  fetch(`${authService}locations?page=${page}`)
    .then((res) => (
      res
        .json()
        .then((entries) => ({
          entries,
          pages: parseInt(res.headers.get('X-Total-Pages'), 10),
        }))
    ))
    .then(({ entries, pages }) => {
      locations.push(...entries);
      if (page === 1) {
        renderLocation(0);
      }
      if (page < Math.min(pages, 5)) {
        return fetchLocations(page + 1);
      }
      return false;
    })
);

fetchLocations();
