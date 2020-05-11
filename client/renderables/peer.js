import {
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PositionalAudio,
  SphereGeometry,
  VertexColors,
} from '../core/three.js';
import Hand from './hand.js';

// Peer head & hands

class Peer extends Object3D {
  static setupGeometry() {
    const sphere = new SphereGeometry(0.15, 16, 32);
    sphere.faces.forEach((face, i) => {
      if (i % 2 === 1) {
        face.color.offsetHSL(0, 0, Math.random() * -0.1);
        sphere.faces[i - 1].color.copy(face.color);
      }
    });
    const geometry = (new BufferGeometry()).fromGeometry(sphere);
    delete geometry.attributes.normal;
    delete geometry.attributes.uv;
    Peer.geometry = geometry;
  }

  static setupMaterial() {
    Peer.material = new MeshBasicMaterial({
      vertexColors: VertexColors,
    });
  }

  constructor({ peer, connection, listener }) {
    if (!Peer.geometry) {
      Peer.setupGeometry();
    }
    if (!Peer.material) {
      Peer.setupMaterial();
    }
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
    this.head = new Mesh(
      Peer.geometry,
      Peer.material
    );
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

  onUpdate({ buffer }) {
    const { controllers, head } = this;
    const view = new Float32Array(buffer);
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
  }
}

export default Peer;
