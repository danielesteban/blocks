import {
  AudioListener,
  Matrix4,
  Object3D,
  Quaternion,
  Raycaster,
  Vector3,
} from './three.js';
import DesktopControls from './desktop.js';
import Hand from '../renderables/hand.js';
import Head from '../renderables/head.js';
import Marker from '../renderables/marker.js';
import Pointer from '../renderables/pointer.js';
import Session from './session.js';

// Player controller

class Player extends Object3D {
  constructor({
    camera,
    dialogs,
    dom,
    xr,
  }) {
    super();
    this.add(camera);
    this.auxMatrixA = new Matrix4();
    this.auxMatrixB = new Matrix4();
    this.auxVector = new Vector3();
    this.auxDestination = new Vector3();
    this.attachments = {};
    this.direction = new Vector3();
    this.head = new AudioListener();
    this.head.rotation.order = 'YXZ';
    const onFirstInteraction = () => {
      document.removeEventListener('mousedown', onFirstInteraction);
      const { context } = this.head;
      if (context.state === 'suspended') {
        context.resume();
      }
    };
    document.addEventListener('mousedown', onFirstInteraction);
    this.controllers = [...Array(2)].map((v, i) => {
      const controller = xr.getController(i);
      this.add(controller);
      controller.buttons = {
        forwards: false,
        backwards: false,
        leftwards: false,
        rightwards: false,
        trigger: false,
        grip: false,
        primary: false,
        secondary: false,
      };
      controller.marker = new Marker();
      controller.pointer = new Pointer();
      controller.add(controller.pointer);
      controller.raycaster = new Raycaster();
      controller.raycaster.far = 32;
      controller.worldspace = {
        position: new Vector3(),
        quaternion: new Quaternion(),
      };
      controller.addEventListener('connected', ({ data: { handedness, gamepad } }) => {
        if (controller.hand) {
          return;
        }
        const hand = new Hand({ handedness });
        controller.hand = hand;
        controller.gamepad = gamepad;
        controller.add(hand);
        const attachments = this.attachments[handedness];
        if (attachments) {
          attachments.forEach((attachment) => {
            controller.add(attachment);
          });
        }
      });
      controller.addEventListener('disconnected', () => {
        if (!controller.hand) {
          return;
        }
        const attachments = this.attachments[controller.hand.handedness];
        if (attachments) {
          attachments.forEach((attachment) => {
            controller.remove(attachment);
          });
        }
        controller.remove(controller.hand);
        delete controller.hand;
        delete controller.gamepad;
        controller.marker.visible = false;
        controller.pointer.visible = false;
      });
      return controller;
    });
    this.desktopControls = new DesktopControls({ renderer: dom.renderer, xr });
    this.session = new Session({
      dialogs,
      state: dom.session,
    });
    this.xr = xr;
  }

  onAnimationTick({ camera, delta }) {
    const {
      auxMatrixA: rotation,
      auxVector: vector,
      controllers,
      desktopControls,
      destination,
      direction,
      head,
      position,
      speed,
    } = this;
    camera.matrixWorld.decompose(head.position, head.quaternion, vector);
    head.updateMatrixWorld();
    controllers.forEach(({
      buttons,
      hand,
      gamepad,
      marker,
      matrixWorld,
      pointer,
      raycaster,
      worldspace,
    }) => {
      if (!hand) {
        return;
      }
      marker.visible = false;
      pointer.visible = false;
      [
        ['forwards', gamepad.axes[3] <= -0.5],
        ['backwards', gamepad.axes[3] >= 0.5],
        ['leftwards', gamepad.axes[2] <= -0.5],
        ['rightwards', gamepad.axes[2] >= 0.5],
        ['trigger', gamepad.buttons[0] && gamepad.buttons[0].pressed],
        ['grip', gamepad.buttons[1] && gamepad.buttons[1].pressed],
        ['primary', gamepad.buttons[4] && gamepad.buttons[4].pressed],
        ['secondary', gamepad.buttons[5] && gamepad.buttons[5].pressed],
      ].forEach(([key, value]) => {
        buttons[`${key}Down`] = value && buttons[key] !== value;
        buttons[`${key}Up`] = !value && buttons[key] !== value;
        buttons[key] = value;
      });
      hand.setFingers({
        thumb: gamepad.buttons[3] && gamepad.buttons[3].touched,
        index: gamepad.buttons[0] && gamepad.buttons[0].pressed,
        middle: gamepad.buttons[1] && gamepad.buttons[1].pressed,
      });
      hand.animate({ delta });
      matrixWorld.decompose(worldspace.position, worldspace.quaternion, vector);
      rotation.identity().extractRotation(matrixWorld);
      raycaster.ray.origin
        .addVectors(
          worldspace.position,
          vector.set(0, -0.1 / 3, 0).applyMatrix4(rotation)
        );
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
    });
    desktopControls.onAnimationTick({ camera, delta, player: this });
    if (destination) {
      const step = speed * delta;
      const distance = destination.distanceTo(position);
      if (distance <= step) {
        position.copy(destination);
        delete this.destination;
        return;
      }
      position.addScaledVector(direction, step);
    }
  }

  editSkin(layer) {
    const { head, session: { skin }, skinEditor } = this;
    if (skinEditor) {
      skinEditor.setLayer(layer);
      return;
    }
    const mesh = new Head();
    mesh.updateTexture(skin, true);
    mesh.setLayer(layer);
    this.add(mesh);
    this.worldToLocal(head.localToWorld(mesh.position.set(0, 0, -0.65)));
    mesh.lookAt(head.position);
    mesh.rotateY(Math.PI);
    this.skinEditor = mesh;
  }

  disposeSkinEditor() {
    const { skinEditor } = this;
    if (!skinEditor) {
      return;
    }
    delete this.skinEditor;
    this.remove(skinEditor);
    skinEditor.dispose();
  }

  saveSkin() {
    const { session, skinEditor } = this;
    if (!skinEditor) {
      return;
    }
    session.updateSkin(skinEditor.renderer.toDataURL());
    session.uploadSkin();
    this.disposeSkinEditor();
  }

  fly({ delta, direction, movement }) {
    const {
      help,
      auxVector: vector,
      position,
    } = this;
    position.addScaledVector(
      vector
        .copy(movement)
        .normalize()
        .applyQuaternion(direction),
      delta * 4
    );
    if (help) {
      help.dispose();
    }
  }

  rotate(radians) {
    const {
      auxMatrixA: transform,
      auxMatrixB: matrix,
      head,
      position,
    } = this;
    transform.makeTranslation(
      head.position.x, position.y, head.position.z
    );
    transform.multiply(
      matrix.makeRotationY(radians)
    );
    transform.multiply(
      matrix.makeTranslation(
        -head.position.x, -position.y, -head.position.z
      )
    );
    this.applyMatrix4(transform);
  }

  translocate(point) {
    const {
      auxDestination: destination,
      direction,
      head,
      position,
    } = this;
    destination
      .subVectors(point, destination.set(
        head.position.x - position.x,
        0,
        head.position.z - position.z
      ));
    this.destination = destination;
    this.speed = Math.max(destination.distanceTo(position) / 0.2, 2);
    direction
      .copy(destination)
      .sub(position)
      .normalize();
  }

  setLocation(location) {
    const {
      auxVector: offset,
      auxDestination: destination,
      head,
      position,
    } = this;
    offset.subVectors(head.position, position);
    destination
      .subVectors(location.position, destination.set(
        offset.x,
        0,
        offset.z
      ));
    position.copy(destination);
    head.position.addVectors(destination, offset);
    if (location.rotation) {
      this.rotate(location.rotation - head.rotation.y);
    }
  }

  setWelcome(mesh) {
    this.disposeWelcome();
    this.add(mesh);
    this.welcome = mesh;
  }

  disposeWelcome() {
    const { welcome } = this;
    if (!welcome) {
      return;
    }
    delete this.welcome;
    this.remove(welcome);
    welcome.dispose();
  }
}

export default Player;
