const { v4: uuid } = require('uuid');

class Room {
  constructor() {
    this.clients = [];
  }

  onClose(client) {
    const { clients, pingInterval } = this;
    const index = clients.findIndex(({ id }) => (id === client.id));
    if (~index) {
      clients.splice(index, 1);
      this.broadcast({
        type: 'LEAVE',
        data: client.id,
      });
      if (!clients.length && pingInterval) {
        clearInterval(pingInterval);
        delete this.pingInterval;
      }
    }
  }

  onClient(client) {
    const { clients, pingInterval } = this;
    client.id = uuid();
    client.send(JSON.stringify({
      type: 'INIT',
      data: {
        peers: clients.map(({ id }) => (id)),
        ...(this.onInit ? this.onInit(client) : {}),
      },
    }), () => {});
    this.broadcast({
      type: 'JOIN',
      data: client.id,
    });
    clients.push(client);
    client.isAlive = true;
    client.once('close', () => this.onClose(client));
    client.on('message', (data) => this.onMessage(client, data));
    client.on('pong', () => {
      client.isAlive = true;
    });
    if (!pingInterval) {
      this.pingInterval = setInterval(this.ping.bind(this), 60000);
    }
  }

  onMessage(client, data) {
    let request;
    try {
      request = JSON.parse(data);
    } catch (e) {
      return;
    }
    this.onRequest(client, request);
  }

  onRequest(client, request) {
    const { clients } = this;
    switch (request.type) {
      case 'SIGNAL': {
        let { peer, signal } = request.data;
        peer = `${peer}`;
        signal = `${signal}`;
        if (!(
          !peer
          || !signal
          || clients.findIndex(({ id }) => (id === peer)) === -1
        )) {
          if (client) {
            this.broadcast({
              type: 'SIGNAL',
              data: {
                peer: client.id,
                signal,
              },
            }, {
              include: peer,
            });
          }
        }
        break;
      }
      default:
        break;
    }
  }

  broadcast(event, { exclude, include } = {}) {
    const { clients } = this;
    const encoded = JSON.stringify(event);
    if (exclude && !Array.isArray(exclude)) {
      exclude = [exclude];
    }
    if (include && !Array.isArray(include)) {
      include = [include];
    }
    clients.forEach((client) => {
      if (
        (!include || ~include.indexOf(client.id))
        && (!exclude || exclude.indexOf(client.id) === -1)
      ) {
        client.send(encoded, () => {});
      }
    });
  }

  ping() {
    const { clients } = this;
    clients.forEach((client) => {
      if (client.isAlive === false) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping(() => {});
    });
  }
}

module.exports = Room;
