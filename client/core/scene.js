import { Scene as ThreeScene } from './three.js';
import CurveCast from './curvecast.js';
import Peers from './peers.js';
import Player from './player.js';

// A multiplayer VR scene base class

class Scene extends ThreeScene {
  constructor({ camera, renderer: { xr } }) {
    super();

    this.player = new Player({ camera, xr });
    this.player.controllers.forEach(({ marker }) => (
      this.add(marker)
    ));
    this.add(this.player);

    this.peers = new Peers({ listener: this.player.head });
    this.add(this.peers);

    this.translocables = [];

    this.connect();
  }

  onBeforeRender({ animation: { delta }, xr }, scene, camera) {
    const {
      peers,
      player,
      translocables,
    } = this;
    player.onAnimationTick({ delta, camera });
    peers.onAnimationTick({ delta, player });
    player.controllers.forEach((controller) => {
      const {
        buttons: {
          forwards,
          forwardsUp,
          leftwardsDown,
          rightwardsDown,
          secondaryDown,
        },
        hand,
        marker,
        raycaster,
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
        !player.destination
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
      }
      if (secondaryDown) {
        xr.getSession().end();
      }
    });
  }

  onEvent({ type, data }) {
    const { peers, server } = this;
    switch (type) {
      case 'INIT':
        peers.init({
          server,
          peers: data.peers,
        });
        break;
      case 'JOIN':
        peers.join(data);
        break;
      case 'LEAVE':
        peers.leave(data);
        break;
      case 'SIGNAL':
        peers.signal(data);
        break;
      default:
        break;
    }
  }

  onMessage({ data }) {
    let event;
    try {
      event = JSON.parse(data);
    } catch (e) {
      return;
    }
    this.onEvent(event);
  }

  connect() {
    const { peers } = this;
    const url = new URL(window.location);
    url.protocol = url.protocol.replace(/http/, 'ws');
    url.hash = '';
    const server = new WebSocket(url.toString());
    server.addEventListener('close', () => {
      peers.reset();
      setTimeout(() => this.connect(), 1000);
    });
    server.addEventListener('error', () => {});
    server.addEventListener('message', this.onMessage.bind(this));
    this.server = server;
  }
}

export default Scene;
