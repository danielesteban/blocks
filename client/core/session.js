import Head from '../renderables/head.js';

class Session {
  constructor({
    dialogs,
    state,
  }) {
    this.dialogs = dialogs;
    this.state = state;
    Object.keys(dialogs).forEach((dialog) => {
      dialog = dialogs[dialog];
      dialog.addEventListener('click', ({ target }) => {
        if (target === dialog) {
          dialog.className = 'dialog';
        }
      });
    });
    {
      const [form] = dialogs.login.getElementsByTagName('form');
      const [alternative] = dialogs.login.getElementsByTagName('a');
      form.addEventListener('submit', this.onLoginSubmit.bind(this));
      alternative.addEventListener('click', () => this.showDialog('register'));
    }
    {
      const [form] = dialogs.register.getElementsByTagName('form');
      const [alternative] = dialogs.register.getElementsByTagName('a');
      form.addEventListener('submit', this.onRegisterSubmit.bind(this));
      alternative.addEventListener('click', () => this.showDialog('login'));
    }
    {
      const skin = localStorage.getItem('blocks::skin');
      if (skin) {
        this.skin = skin;
        this.renderSkin();
      } else {
        this.updateSkin();
      }
    }
    {
      const session = localStorage.getItem('blocks::session');
      if (session) {
        this.session = JSON.parse(session);
        this.refreshSession();
      }
      this.renderState();
    }
    state.style.display = '';
  }

  static getLocation(id) {
    const { authService, formatDate } = Session;
    return fetch(`${authService}location/${id}/meta`)
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }
        return res
          .json()
          .then((location) => ({
            ...location,
            createdAt: formatDate(location.createdAt),
            photo: `${authService}location/${location._id}/photo`,
          }));
      });
  }

  getLocations() {
    const { authService, getLocation } = Session;
    const { session } = this;
    return fetch(`${authService}user/locations`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((res) => res.json())
      .then((locations) => locations.map((location) => ({
        ...location,
        getMeta: () => getLocation(location._id),
      })));
  }

  onLoginSubmit(e) {
    const { target: form } = e;
    const { authService } = Session;
    const { dialogs: { login: dialog } } = this;
    const { email, password, submit } = form;
    const [error] = dialog.getElementsByClassName('error');
    e.preventDefault();
    error.style.display = '';
    submit.disabled = true;
    fetch(`${authService}user`, {
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    })
      .then((res) => {
        submit.disabled = false;
        if (res.status !== 200) {
          throw new Error();
        }
        form.reset();
        dialog.className = 'dialog';
        return res
          .json()
          .then((session) => this.updateSession(session));
      })
      .catch(() => {
        error.style.display = 'block';
        error.innerText = 'Invalid email/password combination';
      });
  }

  onRegisterSubmit(e) {
    const { target: form } = e;
    const { authService } = Session;
    const { dialogs: { register: dialog }, skin } = this;
    const {
      name,
      email,
      password,
      confirmPassword,
      submit,
    } = form;
    const [error] = dialog.getElementsByClassName('error');
    e.preventDefault();
    if (password.value !== confirmPassword.value) {
      error.style.display = 'block';
      error.innerText = 'Passwords don\'t match!';
      return;
    }
    error.style.display = '';
    submit.disabled = true;
    fetch(`${authService}users`, {
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        password: password.value,
        skin: skin.substr(skin.indexOf(',') + 1),
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
      .then((res) => {
        submit.disabled = false;
        if (res.status !== 200) {
          throw new Error();
        }
        form.reset();
        dialog.className = 'dialog';
        return res
          .json()
          .then((session) => this.updateSession(session));
      })
      .catch(() => {
        error.style.display = 'block';
        error.innerText = 'That email has already registered';
      });
  }

  renderSkin() {
    const {
      skin,
      state,
    } = this;
    const [/* name */, user] = state.getElementsByTagName('div');
    const [image] = user.getElementsByTagName('canvas');
    image.width = 64;
    image.height = 64;
    const ctx = image.getContext('2d');
    const texture = new Image();
    texture.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, image.width, image.height);
      ctx.drawImage(texture, 8, 8, 8, 8, 0, 0, image.width, image.height);
      ctx.drawImage(texture, 40, 8, 8, 8, 0, 0, image.width, image.height);
    };
    texture.src = skin;
  }

  renderState() {
    const {
      session,
      state,
    } = this;
    const [name] = state.getElementsByTagName('div');
    const [button] = state.getElementsByTagName('button');
    if (session) {
      name.innerText = session.name;
      button.innerText = 'Logout';
      button.className = '';
      button.onclick = () => this.updateSession();
    } else {
      name.innerText = 'Guest';
      button.innerText = 'Login';
      button.className = 'primary';
      button.onclick = () => this.showDialog('login');
    }
  }

  refreshSession() {
    const { authService } = Session;
    const { session: { token } } = this;
    fetch(`${authService}user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status !== 200) {
          this.updateSession();
          return;
        }
        res
          .json()
          .then((session) => this.updateSession(session));
      });
  }

  refreshSkin() {
    const { authService } = Session;
    const { session: { token } } = this;
    fetch(`${authService}user/skin`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          const { result: skin } = reader;
          if (this.skin !== skin) {
            this.updateSkin(skin);
          }
        };
        reader.readAsDataURL(blob);
      });
  }

  showDialog(id) {
    const { dialogs } = this;
    Object.keys(dialogs).forEach((key) => {
      dialogs[key].className = 'dialog';
    });
    dialogs[id].className = 'dialog open';
  }

  showLocation(id) {
    const { getLocation } = Session;
    const { dialogs: { location: dialog } } = this;
    return getLocation(id)
      .then((location) => {
        const [container] = dialog.getElementsByTagName('div');
        const [image] = container.getElementsByTagName('img');
        const [info] = container.getElementsByTagName('div');
        const [title, user] = info.getElementsByTagName('div');
        image.src = location.photo;
        title.innerText = (
          `x:${location.position.x} y:${location.position.y} z:${location.position.z}`
          + ` - ${location.server.name}`
        );
        user.innerText = (
          `${location.user.name}`
          + ` - ${location.createdAt.date}`
          + ` ${location.createdAt.time}`
        );
        this.showDialog('location');
        return location;
      });
  }

  updateSession(session) {
    this.session = session;
    if (session) {
      localStorage.setItem('blocks::session', JSON.stringify(session));
      this.refreshSkin();
    } else {
      localStorage.removeItem('blocks::session');
      this.updateSkin();
    }
    this.renderState();
  }

  updateSkin(skin) {
    this.skin = skin || Head.generateTexture().toDataURL();
    localStorage.setItem('blocks::skin', this.skin);
    this.renderSkin();
  }

  uploadSkin() {
    const { authService } = Session;
    const { session, skin } = this;
    if (!session) {
      return;
    }
    fetch(`${authService}user`, {
      body: JSON.stringify({
        skin: skin.substr(skin.indexOf(',') + 1),
      }),
      headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });
  }

  uploadLocation({
    blob,
    position,
    rotation,
  }) {
    const { authService } = Session;
    const { session, server } = this;
    if (!session || !server) {
      return Promise.reject();
    }
    const body = new FormData();
    body.append('photo', blob);
    body.append('positionX', position.x);
    body.append('positionY', position.y);
    body.append('positionZ', position.z);
    body.append('rotation', rotation);
    body.append('server', server);
    return fetch(`${authService}locations`, {
      body,
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      method: 'POST',
    });
  }

  static formatDate(date) {
    const leadingZero = (v) => (v.length < 2 ? `0${v}` : v);
    date = new Date(date);
    return {
      date: `${date.getFullYear()}/${leadingZero(`${date.getMonth() + 1}`)}/${leadingZero(`${date.getDate()}`)}`,
      time: `${leadingZero(`${date.getHours()}`)}:${leadingZero(`${date.getMinutes()}`)}`,
    };
  }
}

Session.authService = 'https://blocks.gatunes.com/auth/';

export default Session;
