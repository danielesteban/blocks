import { Euler, Vector2, Vector3 } from './three.js';

// Player desktop controls

class DesktopControls {
  constructor({ mount, xr }) {
    this.aux = {
      euler: new Euler(0, 0, 0, 'YXZ'),
      direction: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
    };
    this.keyboard = new Vector3(0, 0, 0);
    this.pointer = new Vector2(0, 0);
    this.mount = mount;
    this.xr = xr;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onPointerLock = this.onPointerLock.bind(this);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    mount.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLock);
  }

  dispose() {
    const { isLocked, mount } = this;
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    mount.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLock);
    if (isLocked) {
      document.exitPointerLock();
    }
  }

  onAnimationTick({ delta, camera, player }) {
    const {
      keyboard,
      isLocked,
      pointer,
      xr,
    } = this;
    if (!isLocked) {
      return;
    }
    if (xr.isPresenting) {
      document.exitPointerLock();
      return;
    }
    if (pointer.x !== 0 || pointer.y !== 0) {
      const { euler } = this.aux;
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= pointer.x * 0.003;
      euler.x -= pointer.y * 0.003;
      const PI_2 = Math.PI / 2;
      euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
      camera.quaternion.setFromEuler(euler);
      pointer.set(0, 0);
    }
    if (keyboard.x !== 0 || keyboard.y !== 0 || keyboard.z !== 0) {
      const {
        direction,
        forward,
        right,
        worldUp,
      } = this.aux;
      camera.getWorldDirection(forward);
      right.crossVectors(forward, worldUp);
      direction
        .set(0, 0, 0)
        .addScaledVector(right, keyboard.x)
        .addScaledVector(worldUp, keyboard.y)
        .addScaledVector(forward, keyboard.z)
        .normalize();
      player.position.addScaledVector(direction, delta * 6);
      player.disposeWelcome();
    }
  }

  onKeyDown({ keyCode, repeat }) {
    const { keyboard } = this;
    if (repeat) return;
    switch (keyCode) {
      case 16:
        keyboard.y = -1;
        break;
      case 32:
        keyboard.y = 1;
        break;
      case 87:
        keyboard.z = 1;
        break;
      case 83:
        keyboard.z = -1;
        break;
      case 65:
        keyboard.x = -1;
        break;
      case 68:
        keyboard.x = 1;
        break;
      default:
        break;
    }
  }

  onKeyUp({ keyCode, repeat }) {
    const { keyboard } = this;
    if (repeat) return;
    switch (keyCode) {
      case 16:
      case 32:
        keyboard.y = 0;
        break;
      case 87:
      case 83:
        keyboard.z = 0;
        break;
      case 65:
      case 68:
        keyboard.x = 0;
        break;
      default:
        break;
    }
  }

  onMouseDown() {
    const { isLocked, xr } = this;
    if (isLocked || xr.isPresenting) {
      return;
    }
    document.body.requestPointerLock();
  }

  onMouseMove({ movementX, movementY }) {
    const { isLocked, pointer } = this;
    if (!isLocked) {
      return;
    }
    pointer.set(movementX, movementY);
  }

  onPointerLock() {
    this.isLocked = !!document.pointerLockElement;
  }
}

export default DesktopControls;
