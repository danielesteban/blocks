const authService = 'https://blocks.gatunes.com/auth/';

const photo = document.getElementById('photo');
const [link] = photo.getElementsByTagName('a');
const [image] = photo.getElementsByTagName('img');
const meta = document.getElementById('meta');
const [title, sharing, user] = meta.getElementsByTagName('div');
const [twitter, facebook] = sharing.getElementsByTagName('a');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

let current;
const locations = [];

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
  user.innerText = (
    `${location.user.name}`
    + ` - ${createdAt.getFullYear()}/${leadingZero(`${createdAt.getMonth() + 1}`)}/${leadingZero(`${createdAt.getDate()}`)}`
    + ` ${leadingZero(`${createdAt.getHours()}`)}:${leadingZero(`${createdAt.getMinutes()}`)}`
  );
  link.href = `/#/location:${location._id}`;
  const permalink = encodeURIComponent(`${authService}location/${location._id}`);
  facebook.href = `https://facebook.com/sharer/sharer.php?u=${permalink}`;
  twitter.href = `https://twitter.com/intent/tweet?url=${permalink}`;
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
