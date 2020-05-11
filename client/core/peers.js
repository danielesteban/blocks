
import SimplePeer from './simplepeer.js';
import { Object3D } from './three.js';
import Peer from '../renderables/peer.js';

class Peers extends Object3D {
  constructor({ listener }) {
    super();
    this.listener = listener;
    this.peers = [];
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(this.onUserMedia.bind(this))
        .catch(() => {});
    }
  }

  onAnimationTick({ delta, player }) {
    const { peers } = this;
    peers.forEach(({ controllers }) => controllers.forEach((controller) => {
      if (controller.visible) {
        controller.hand.animate({ delta });
      }
    }));
    this.broadcast(player);
  }

  onUserMedia(stream) {
    const { peers } = this;
    this.userMedia = stream;
    peers.forEach(({ connection }) => {
      if (!connection.destroyed) {
        connection.addStream(stream);
      }
    });
  }

  broadcast({ controllers, head }) {
    const { peers } = this;
    const hands = controllers
      .filter(({ hand }) => (!!hand))
      .sort(({ hand: { handedness: a } }, { hand: { handedness: b } }) => b.localeCompare(a));
    const payload = new Float32Array([
      ...head.position.toArray(),
      ...head.quaternion.toArray(),
      ...(hands.length === 2 ? (
        hands.reduce((hands, { hand: { state }, worldspace: { position, quaternion } }) => {
          hands.push(
            ...position.toArray(),
            ...quaternion.toArray(),
            state
          );
          return hands;
        }, [])
      ) : []),
    ]);
    peers.forEach(({ connection }) => {
      if (
        connection
        && connection._channel
        && connection._channel.readyState === 'open'
      ) {
        connection.send(payload);
      }
    });
  }

  connect({ id, initiator = false }) {
    const {
      listener,
      server,
      userMedia,
    } = this;
    const connection = new SimplePeer({
      initiator,
      stream: userMedia,
    });
    const peer = new Peer({ peer: id, connection, listener });
    connection.on('error', () => {});
    connection.on('data', peer.onUpdate.bind(peer));
    connection.on('signal', (signal) => (
      server.send(JSON.stringify({
        type: 'SIGNAL',
        data: {
          peer: id,
          signal: JSON.stringify(signal),
        },
      }))
    ));
    connection.on('track', peer.onTrack.bind(peer));
    this.add(peer);
    return peer;
  }

  init({
    server,
    peers,
  }) {
    this.server = server;
    this.peers = peers.map((id) => this.connect({ id, initiator: true }));
  }

  join(peer) {
    const { peers } = this;
    peers.push(this.connect({ id: peer }));
  }

  leave(peer) {
    const { peers } = this;
    const index = peers.findIndex(({ peer: id }) => (id === peer));
    if (~index) {
      const [peer] = peers.splice(index, 1);
      this.remove(peer);
      peer.dispose();
    }
  }

  signal({ peer, signal }) {
    const { peers } = this;
    const { connection } = peers[
      peers.findIndex(({ peer: id }) => (id === peer))
    ] || {};
    if (connection && !connection.destroyed) {
      try {
        signal = JSON.parse(signal);
      } catch (e) {
        return;
      }
      connection.signal(signal);
    }
  }

  reset() {
    const { peers } = this;
    peers.forEach((peer) => {
      this.remove(peer);
      peer.dispose();
    });
    this.peers = [];
    delete this.server;
  }
}

export default Peers;
