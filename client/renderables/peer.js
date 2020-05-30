import { Object3D, PositionalAudio } from '../core/three.js';
import Hand from './hand.js';
import Head from './head.js';

// Peer head & hands

class Peer extends Object3D {
  constructor({ peer, connection, listener }) {
    super();
    this.audio = new PositionalAudio(listener);
    this.audio.player = new Audio();
    this.audio.player.muted = true;
    this.connection = connection;
    this.controllers = [...Array(2)].map((v, i) => {
      const controller = new Object3D();
      controller.visible = false;
      controller.hand = new Hand({ handedness: i === 0 ? 'right' : 'left' });
      controller.add(controller.hand);
      this.add(controller);
      return controller;
    });
    this.head = new Head();
    this.head.visible = false;
    this.head.add(this.audio);
    this.add(this.head);
    this.peer = peer;
  }

  dispose() {
    const { audio, connection } = this;
    audio.player.srcObject = null;
    if (audio.source) {
      audio.source.mediaStream.getTracks().forEach((track) => track.stop());
      audio.disconnect();
    }
    if (!connection.destroyed) {
      connection.destroy();
    }
  }

  onTrack(track, stream) {
    const { audio } = this;
    if (track.kind !== 'audio') {
      return;
    }
    if (audio.source) {
      audio.source.mediaStream.getTracks().forEach((track) => track.stop());
      audio.disconnect();
    }
    audio.setMediaStreamSource(stream);
    audio.player.srcObject = stream;
    audio.player.play();
  }

  onData(data) {
    const { controllers, head } = this;
    switch (data[0]) {
      case 0:
        head.updateTexture(data.slice(1).toString());
        break;
      case 1: {
        const view = new Float32Array((new Uint8Array(data.slice(1))).buffer);
        if (view.length >= 7) {
          const { position, quaternion } = head;
          position.fromArray(view);
          quaternion.fromArray(view, 3);
          head.updateMatrixWorld();
          head.visible = true;
        }
        if (view.length >= 22) {
          controllers.forEach((controller, i) => {
            const { hand, position, quaternion } = controller;
            const offset = 7 + (i * 8);
            position.fromArray(view, offset);
            quaternion.fromArray(view, offset + 3);
            controller.updateMatrixWorld();
            hand.setFingers(view[offset + 7]);
            controller.visible = true;
          });
        }
        break;
      }
      default:
        break;
    }
  }
}

export default Peer;
