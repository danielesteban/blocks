import { Scene as ThreeScene } from './three.js';
import CurveCast from './curvecast.js';
import Peers from './peers.js';
import Player from './player.js';

// A multiplayer VR scene base class

class Scene extends ThreeScene {
  constructor({
    camera,
    debug,
    mount,
    renderer: { xr },
  }) {
    super();

    this.locomotion = Scene.locomotions.teleport;
    this.debug = debug;

    this.player = new Player({ camera, mount, xr });
    this.player.controllers.forEach(({ marker }) => (
      this.add(marker)
    ));
    this.add(this.player);

    this.peers = new Peers({ listener: this.player.head });
    this.add(this.peers);

    this.translocables = [];
    this.ui = [];

    this.connect();
  }

  onBeforeRender({ animation: { delta }, xr }, scene, camera) {
    const { locomotions } = Scene;
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

  onEvent({ type, data }) {
    const { peers, server } = this;
    switch (type) {
      case 'ERROR':
        server.error = data.message;
        break;
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
      if (server.error) {
        const dialog = document.createElement('div');
        dialog.id = 'error';
        dialog.innerText = server.error;
        document.body.appendChild(dialog);
        return;
      }
      setTimeout(() => this.connect(), 1000);
    });
    server.addEventListener('error', () => {});
    server.addEventListener('message', this.onMessage.bind(this));
    this.server = server;
  }
}

Scene.locomotions = {
  fly: 0,
  teleport: 1,
};

export default Scene;
