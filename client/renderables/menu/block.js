import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
} from '../../core/three.js';
import Voxels from '../voxels.js';

// Block UI

const Block = ({
  menu,
  pages,
  width,
  height,
}) => {
  if (!Voxels.materials) {
    Voxels.setupMaterials();
  }
  const block = new Mesh(
    new BufferGeometry(),
    Voxels.materials.ui
  );
  block.scale.setScalar(1 / 32);
  block.position.set(-0.125, -0.125, 0);
  block.updateMatrix();
  block.matrixAutoUpdate = false;
  block.visible = false;
  const buttons = [
    {
      label: '<',
      x: width * 0.05,
      y: height * 0.425,
      width: width * 0.15,
      height: width * 0.15,
      font: '700 30px monospace',
      onPointer: () => {
        // eslint-disable-next-line no-use-before-define
        const { blocks, type, setType } = state;
        if (blocks) {
          const index = blocks.findIndex(({ id }) => (id === type));
          setType(
            blocks[(index > 0 ? index : blocks.length) - 1].id
          );
        }
      },
    },
    {
      label: '>',
      x: width * 0.8,
      y: height * 0.425,
      width: width * 0.15,
      height: width * 0.15,
      font: '700 30px monospace',
      onPointer: () => {
        // eslint-disable-next-line no-use-before-define
        const { blocks, type, setType } = state;
        if (blocks) {
          const index = blocks.findIndex(({ id }) => (id === type));
          setType(
            blocks[(index + 1) % blocks.length].id
          );
        }
      },
    },
    {
      background: 'transparent',
      x: width * 0.0625,
      y: height * 0.75625,
      width: width * 0.1875,
      height: height * 0.1875,
      onPointer: () => setTimeout(() => menu.setPage(pages.picker), 0),
    },
    {
      label: 'Color Picker',
      x: width * 0.25,
      y: height * 0.75625,
      width: width * 0.6875,
      height: height * 0.1875,
      onPointer: () => setTimeout(() => menu.setPage(pages.picker), 0),
    },
  ];
  const graphics = [
    ({ ctx }) => {
      ctx.translate(width * 0.0625, height * 0.75625);
      ctx.fillStyle = `#${menu.picker.color.getHexString()}`;
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.rect(0, 0, width * 0.1875, width * 0.1875);
      ctx.fill();
      ctx.stroke();
    },
  ];
  const labels = [
    {
      x: width * 0.5,
      y: height * 0.15,
      font: '700 30px monospace',
      text: '',
    },
  ];
  const state = {
    type: 0x01,
    setBlocks: (blocks) => {
      state.blocks = blocks;
      state.setType(state.type);
      block.visible = true;
    },
    setType: (id) => {
      state.type = id;
      const { blocks } = state;
      if (!blocks) {
        return;
      }
      const [label] = labels;
      const { name, faces, textures } = blocks.find(({ id: type }) => (type === id));
      label.text = name;
      {
        const { geometry } = block;
        const index = [];
        const light = [];
        const position = [];
        const uv = [];
        let face = 0;
        const pushFace = (
          p1,
          p2,
          p3,
          p4,
          texture,
          facing
        ) => {
          [p1, p2, p3, p4].forEach((vertex) => {
            light.push(0xF);
            position.push(...vertex);
          });
          [
            [(texture * 2) + 1, (facing * 2)],
            [(texture + 1) * 2, (facing * 2)],
            [(texture + 1) * 2, (facing * 2) + 1],
            [(texture * 2) + 1, (facing * 2) + 1],
          ].forEach((vertex) => (
            uv.push(...vertex)
          ));
          index.push(
            face,
            face + 1,
            face + 2,
            face + 2,
            face + 3,
            face
          );
          face += 4;
        };
        const getOrigin = (
          x,
          y,
          z,
          ox,
          oy,
          oz
        ) => ({
          x: x * 8 + ox,
          y: y * 8 + oy,
          z: z * 8 + oz,
        });
        faces.forEach(({
          facing,
          offset,
          size,
          texture,
        }) => {
          switch (facing) {
            case 'top': {
              const o = getOrigin(0, 1, 1, offset.x, -offset.z, -offset.y);
              pushFace(
                [o.x, o.y, o.z],
                [o.x + size.x, o.y, o.z],
                [o.x + size.x, o.y, o.z - size.y],
                [o.x, o.y, o.z - size.y],
                textures[texture],
                0
              );
              break;
            }
            case 'bottom': {
              const o = getOrigin(0, 0, 0, offset.x, offset.z, offset.y);
              pushFace(
                [o.x, o.y, o.z],
                [o.x + size.x, o.y, o.z],
                [o.x + size.x, o.y, o.z + size.y],
                [o.x, o.y, o.z + size.y],
                textures[texture],
                1
              );
              break;
            }
            case 'south': {
              const o = getOrigin(0, 0, 1, offset.x, offset.y, -offset.z);
              pushFace(
                [o.x, o.y, o.z],
                [o.x + size.x, o.y, o.z],
                [o.x + size.x, o.y + size.y, o.z],
                [o.x, o.y + size.y, o.z],
                textures[texture],
                2
              );
              break;
            }
            case 'north': {
              const o = getOrigin(1, 0, 0, -offset.x, offset.y, offset.z);
              pushFace(
                [o.x, o.y, o.z],
                [o.x - size.x, o.y, o.z],
                [o.x - size.x, o.y + size.y, o.z],
                [o.x, o.y + size.y, o.z],
                textures[texture],
                3
              );
              break;
            }
            case 'west': {
              const o = getOrigin(0, 0, 0, offset.z, offset.y, offset.x);
              pushFace(
                [o.x, o.y, o.z],
                [o.x, o.y, o.z + size.x],
                [o.x, o.y + size.y, o.z + size.x],
                [o.x, o.y + size.y, o.z],
                textures[texture],
                4
              );
              break;
            }
            case 'east': {
              const o = getOrigin(1, 0, 1, -offset.z, offset.y, -offset.x);
              pushFace(
                [o.x, o.y, o.z],
                [o.x, o.y, o.z - size.x],
                [o.x, o.y + size.y, o.z - size.x],
                [o.x, o.y + size.y, o.z],
                textures[texture],
                5
              );
              break;
            }
            default:
              break;
          }
        });
        geometry.setAttribute('position', new BufferAttribute(new Uint8Array(position), 3));
        geometry.setAttribute('uv', new BufferAttribute(new Uint8Array(uv), 2));
        geometry.setAttribute('light', new BufferAttribute(new Uint8Array(light), 1));
        geometry.setIndex(new BufferAttribute(new Uint16Array(index), 1));
        geometry.computeBoundingSphere();
      }
      block.material.color.copy(menu.picker.color);
      if (menu.page.id === pages.block) {
        menu.draw();
      }
    },
  };
  return {
    key: 'block',
    page: {
      buttons,
      graphics,
      labels,
      onPageUpdate: (prev, current) => {
        if (prev === pages.block) {
          menu.remove(block);
        } else if (current === pages.block) {
          block.material.color.copy(menu.picker.color);
          menu.add(block);
        }
      },
    },
    state,
  };
};

export default Block;
