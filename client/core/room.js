import CurveCast from './curvecast.js';
import Pako from './pako.js';
import Peers from './peers.js';
import Player from './player.js';
import { protocol } from './protocol.js';
import { Scene } from './three.js';

// A multiplayer VR room base class

class Room extends Scene {
  constructor({
    camera,
    dialogs,
    dom,
    renderer: { xr },
  }) {
    super();

    this.locomotion = Room.locomotions.teleport;
    this.dom = dom;

    this.player = new Player({
      camera,
      dialogs,
      dom,
      xr,
    });
    this.player.controllers.forEach(({ marker }) => (
      this.add(marker)
    ));
    this.add(this.player);

    this.peers = new Peers({ listener: this.player.head });
    this.add(this.peers);

    this.translocables = [];
    this.ui = [];
  }

  onBeforeRender({ animation: { delta }, xr }, scene, camera) {
    const { locomotions } = Room;
    const {
      locomotion,
      peers,
      player,
      translocables,
      ui,
    } = this;
    player.onAnimationTick({ delta, camera });
    peers.onAnimationTick({ delta, player });
    player.controllers.forEach((controller) => {
      const {
        buttons: {
          backwards,
          forwards,
          forwardsUp,
          leftwards,
          leftwardsDown,
          rightwards,
          rightwardsDown,
          secondaryDown,
          trigger,
          triggerUp,
        },
        hand,
        marker,
        pointer,
        raycaster,
        worldspace,
      } = controller;
      if (!hand) {
        return;
      }
      if (
        !player.destination
        && hand.handedness === 'left'
        && (leftwardsDown || rightwardsDown)
      ) {
        player.rotate(
          Math.PI * 0.25 * (leftwardsDown ? 1 : -1)
        );
      }
      if (
        locomotion === locomotions.teleport
        && !player.destination
        && hand.handedness === 'right'
        && (forwards || forwardsUp)
      ) {
        const { hit, points } = CurveCast({
          intersects: translocables,
          raycaster,
        });
        if (hit) {
          if (forwardsUp) {
            player.translocate(hit.point);
          } else {
            marker.update({ hit, points });
          }
        }
        player.disposeWelcome();
      }
      if (
        locomotion === locomotions.fly
        && hand.handedness === 'right'
        && (backwards || forwards || leftwards || rightwards)
      ) {
        const movement = { x: 0, y: 0, z: 0 };
        if (backwards) {
          movement.z = 1;
        }
        if (forwards) {
          movement.z = -1;
        }
        if (leftwards) {
          movement.x = -1;
        }
        if (rightwards) {
          movement.x = 1;
        }
        player.fly({
          delta,
          direction: worldspace.quaternion,
          movement,
        });
        player.disposeWelcome();
      }
      if (trigger || triggerUp) {
        const hit = raycaster.intersectObjects(ui)[0] || false;
        if (hit) {
          pointer.update({
            distance: hit.distance,
            origin: raycaster.ray.origin,
          });
          hit.object.onPointer({
            point: hit.point,
            primary: triggerUp,
          });
        }
      }
      if (secondaryDown) {
        xr.getSession().end();
      }
    });
  }

  onEvent({
    type,
    text,
    json,
    signal,
  }) {
    const {
      dom,
      peers,
      player,
      server,
    } = this;
    switch (type) {
      case 'ERROR':
        server.error = text;
        break;
      case 'INIT':
        player.session.server = json.id;
        peers.init({
          server,
          peers: json.peers,
        });
        break;
      case 'JOIN':
        peers.join(text);
        break;
      case 'LEAVE':
        peers.leave(text);
        break;
      case 'SIGNAL':
        peers.signal(signal);
        break;
      default:
        break;
    }
    if (
      type === 'INIT' || type === 'JOIN' || type === 'LEAVE'
    ) {
      dom.players.innerText = peers.peers.length + 1;
    }
  }

  onMessage({ data }) {
    let event;
    try {
      event = Room.decode(new Uint8Array(data));
    } catch (e) {
      return;
    }
    this.onEvent(event);
  }

  connect(url) {
    const { peers } = this;
    if (this.server) {
      this.server.onclose = null;
      this.server.onmessage = null;
      this.server.close();
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      const error = document.getElementById('error');
      if (error) {
        error.parentNode.removeChild(error);
      }
      peers.reset();
    }
    const socket = new URL(url);
    socket.protocol = socket.protocol.replace(/http/, 'ws');
    socket.hash = '';
    const server = new WebSocket(socket.toString());
    server.binaryType = 'arraybuffer';
    server.sendEvent = (event) => (
      server.send(Room.encode(event))
    );
    server.onerror = () => {};
    server.onclose = () => {
      peers.reset();
      if (server.error) {
        const dialog = document.createElement('div');
        dialog.id = 'error';
        dialog.innerText = server.error;
        document.body.appendChild(dialog);
        return;
      }
      if (!this.player.spawn) {
        const position = this.player.head.position.clone();
        position.y = this.player.position.y;
        this.player.spawn = {
          position,
        };
      }
      this.reconnectTimer = setTimeout(() => this.connect(url), 1000);
    };
    server.onmessage = this.onMessage.bind(this);
    server.serverURL = url;
    this.server = server;
  }

  static decode(buffer) {
    if (buffer[0] === 0x78 && buffer[1] === 0x9c) {
      buffer = Pako.inflate(buffer);
    }
    const message = protocol.Message.decode(buffer);
    message.type = protocol.Message.Type[message.type];
    if (message.json) {
      message.json = JSON.parse(message.json);
    }
    return message;
  }

  static encode(message) {
    message.type = protocol.Message.Type[message.type];
    if (message.json) {
      message.json = JSON.stringify(message.json);
    }
    return protocol.Message.encode(protocol.Message.create(message)).finish();
  }
}

Room.locomotions = {
  fly: 0,
  teleport: 1,
};

export default Room;
