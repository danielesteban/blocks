import {
  AudioListener,
  Matrix4,
  Object3D,
  Quaternion,
  Raycaster,
  Vector3,
} from './three.js';
import Hand from '../renderables/hand.js';
import Marker from '../renderables/marker.js';

// Player controller

class Player extends Object3D {
  constructor({ camera, xr }) {
    super();
    this.add(camera);
    this.auxMatrixA = new Matrix4();
    this.auxMatrixB = new Matrix4();
    this.auxVector = new Vector3();
    this.auxDestination = new Vector3();
    this.direction = new Vector3();
    this.head = new AudioListener();
    const onFirstInteraction = () => {
      window.removeEventListener('mousedown', onFirstInteraction);
      const { context } = this.head;
      if (context.state === 'suspended') {
        context.resume();
      }
    };
    window.addEventListener('mousedown', onFirstInteraction);
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
      controller.raycaster = new Raycaster();
      controller.raycaster.far = 16;
      controller.worldspace = {
        position: new Vector3(),
        quaternion: new Quaternion(),
      };
      controller.addEventListener('connected', ({ data: { handedness, gamepad } }) => {
        const hand = new Hand({ handedness });
        controller.hand = hand;
        controller.gamepad = gamepad;
        controller.add(hand);
      });
      controller.addEventListener('disconnected', () => {
        controller.remove(controller.hand);
        delete controller.hand;
        delete controller.gamepad;
        controller.marker.visible = false;
      });
      return controller;
    });
  }

  onAnimationTick({ delta, camera }) {
    const {
      auxMatrixA: rotation,
      auxVector: vector,
      controllers,
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
      raycaster,
      worldspace,
    }) => {
      if (!hand) {
        return;
      }
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
      marker.visible = false;
      matrixWorld.decompose(worldspace.position, worldspace.quaternion, vector);
      rotation.identity().extractRotation(matrixWorld);
      raycaster.ray.origin
        .addVectors(
          worldspace.position,
          vector.set(0, -0.1 / 3, 0).applyMatrix4(rotation)
        );
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
    });
    if (!destination) {
      return;
    }
    const step = speed * delta;
    const distance = destination.distanceTo(position);
    if (distance <= step) {
      position.copy(destination);
      delete this.destination;
      return;
    }
    position.addScaledVector(direction, step);
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
}

export default Player;
