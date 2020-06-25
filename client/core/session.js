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

  onLoginSubmit(e) {
    const { authService } = Session;
    const { dialogs: { login: dialog } } = this;
    const { target: form } = e;
    const { email, password, submit } = form;
    e.preventDefault();
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
        if (res.status === 200) {
          form.reset();
          dialog.className = 'dialog';
          res
            .json()
            .then((session) => this.updateSession(session));
        }
      });
  }

  onRegisterSubmit(e) {
    const { authService } = Session;
    const { dialogs: { register: dialog }, skin } = this;
    const { target: form } = e;
    const {
      name,
      email,
      password,
      confirmPassword,
      submit,
    } = form;
    e.preventDefault();
    if (password.value !== confirmPassword.value) {
      return;
    }
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
        if (res.status === 200) {
          form.reset();
          dialog.className = 'dialog';
          res
            .json()
            .then((session) => this.updateSession(session));
        }
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
    const { authService } = Session;
    const { dialogs: { location: dialog } } = this;
    return fetch(`${authService}location/${id}/meta`)
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }
        return res
          .json()
          .then((location) => {
            const [container] = dialog.getElementsByTagName('div');
            const [image] = container.getElementsByTagName('img');
            const [info] = container.getElementsByTagName('div');
            const [title, user] = info.getElementsByTagName('div');
            image.src = `${authService}location/${location._id}/photo`;
            const leadingZero = (v) => (v.length < 2 ? `0${v}` : v);
            const createdAt = new Date(location.createdAt);
            title.innerText = (
              `x:${location.position.x} y:${location.position.y} z:${location.position.z}`
              + ` - ${location.server.name}`
            );
            user.innerText = (
              `${location.user.name}`
              + ` - ${createdAt.getFullYear()}/${leadingZero(createdAt.getMonth() + 1)}/${leadingZero(createdAt.getDate())}`
              + ` ${leadingZero(createdAt.getHours())}:${leadingZero(createdAt.getMinutes())}`
            );
            this.showDialog('location');
            return {
              server: location.server.url,
              position: location.position,
              rotation: location.rotation,
            };
          });
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
      return;
    }
    const body = new FormData();
    body.append('photo', blob);
    body.append('positionX', position.x);
    body.append('positionY', position.y);
    body.append('positionZ', position.z);
    body.append('rotation', rotation);
    body.append('server', server);
    fetch(`${authService}locations`, {
      body,
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      method: 'POST',
    });
  }
}

Session.authService = 'https://blocks.gatunes.com/auth/';

export default Session;
