/*
This code is begging for a refactor.
It has gone through a bunch of patches
and it's pretty horrible.. but, also:
It works and it's reasonably fast.
So.. for now I just going to keep it
in this file, hidden out of my sight.
*/
module.exports = ({
  get,
  from,
  to,
  types,
}) => {
  const getLighting = (hasAO, light, sunlight, neighbors) => {
    let ao = 1;
    let n1;
    let n2;
    let n3;
    if (hasAO) {
      n1 = types[neighbors[0].type].hasAO;
      n2 = types[neighbors[1].type].hasAO;
      n3 = (n1 && n2) || (types[neighbors[2].type].hasAO);
      ao = [n1, n2, n3].reduce((ao, n) => (
        ao - (n ? 0.2 : 0)
      ), 1);
      n1 = types[neighbors[0].type].isTransparent;
      n2 = types[neighbors[1].type].isTransparent;
      n3 = (n1 || n2) && types[neighbors[2].type].isTransparent;
      let c = 1;
      [n1, n2, n3].forEach((n, i) => {
        if (n) {
          light += neighbors[i].light;
          sunlight += neighbors[i].sunlight;
          c += 1;
        }
      });
      light = Math.round(light / c);
      sunlight = Math.round(sunlight / c);
    }
    return {
      ao,
      light: (light << 4) | sunlight,
      combined: ao * (light + sunlight) * 0.5,
    };
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
    y: (y - from.y) * 8 + oy,
    z: z * 8 + oz,
  });
  const geometry = {
    opaque: {
      color: [],
      light: [],
      position: [],
      uv: [],
    },
    transparent: {
      color: [],
      light: [],
      position: [],
      uv: [],
    },
  };
  const pushFace = (
    p1, n1, // bottom left point + neighbors
    p2, n2, // bottom right point + neighbors
    p3, n3, // top right point + neighbors
    p4, n4, // top left point + neighbors
    color,
    { light, sunlight },
    hasAO,
    isTransparent,
    texture,
    facing
  ) => {
    const lighting = [
      getLighting(hasAO, light, sunlight, n1),
      getLighting(hasAO, light, sunlight, n2),
      getLighting(hasAO, light, sunlight, n3),
      getLighting(hasAO, light, sunlight, n4),
    ];
    const uvs = [
      [(texture * 2) + 1, (facing * 2)],
      [(texture + 1) * 2, (facing * 2)],
      [(texture + 1) * 2, (facing * 2) + 1],
      [(texture * 2) + 1, (facing * 2) + 1],
    ];
    const vertices = [p1, p2, p3, p4];
    if (
      lighting[0].combined + lighting[2].combined < lighting[1].combined + lighting[3].combined
    ) {
      lighting.unshift(lighting.pop());
      uvs.unshift(uvs.pop());
      vertices.unshift(vertices.pop());
    }
    const mesh = isTransparent ? geometry.transparent : geometry.opaque;
    lighting.forEach((lighting) => {
      mesh.color.push(
        Math.round(color.r * lighting.ao),
        Math.round(color.g * lighting.ao),
        Math.round(color.b * lighting.ao)
      );
      mesh.light.push(lighting.light);
    });
    uvs.forEach((uv) => mesh.uv.push(...uv));
    vertices.forEach((vertex) => mesh.position.push(...vertex));
  };
  for (let x = from.x; x < to.x; x += 1) { // eslint-disable-line prefer-destructuring
    for (let y = from.y; y < to.y; y += 1) { // eslint-disable-line prefer-destructuring
      for (let z = from.z; z < to.z; z += 1) { // eslint-disable-line prefer-destructuring
        const voxel = get(x, y, z);
        if (voxel.type !== types.air) {
          const neighbors = {
            top: get(x, y + 1, z),
            bottom: get(x, y - 1, z),
            south: get(x, y, z + 1),
            north: get(x, y, z - 1),
            west: get(x - 1, y, z),
            east: get(x + 1, y, z),
          };
          const { textures, hasAO, isTransparent } = types[voxel.type];
          let { faces } = types[voxel.type];
          faces = faces({ neighbors, types, voxel });
          if (faces.top) {
            const { offset, size, texture } = faces.top;
            const o = getOrigin(x, y + 1, z + 1, offset.x, -offset.z, -offset.y);
            const n = get(x, y + 1, z - 1);
            const e = get(x + 1, y + 1, z);
            const w = get(x - 1, y + 1, z);
            const s = get(x, y + 1, z + 1);
            pushFace(
              [o.x, o.y, o.z], [w, s, get(x - 1, y + 1, z + 1)],
              [o.x + size.x, o.y, o.z], [e, s, get(x + 1, y + 1, z + 1)],
              [o.x + size.x, o.y, o.z - size.y], [e, n, get(x + 1, y + 1, z - 1)],
              [o.x, o.y, o.z - size.y], [w, n, get(x - 1, y + 1, z - 1)],
              voxel.color,
              hasAO ? neighbors.top : voxel,
              hasAO,
              isTransparent,
              textures[texture],
              0
            );
          }
          if (faces.bottom) {
            const { offset, size, texture } = faces.bottom;
            const o = getOrigin(x, y, z, offset.x, offset.z, offset.y);
            const n = get(x, y - 1, z - 1);
            const e = get(x + 1, y - 1, z);
            const w = get(x - 1, y - 1, z);
            const s = get(x, y - 1, z + 1);
            pushFace(
              [o.x, o.y, o.z], [w, n, get(x - 1, y - 1, z - 1)],
              [o.x + size.x, o.y, o.z], [e, n, get(x + 1, y - 1, z - 1)],
              [o.x + size.x, o.y, o.z + size.y], [e, s, get(x + 1, y - 1, z + 1)],
              [o.x, o.y, o.z + size.y], [w, s, get(x - 1, y - 1, z + 1)],
              voxel.color,
              hasAO ? neighbors.bottom : voxel,
              hasAO,
              isTransparent,
              textures[texture],
              1
            );
          }
          if (faces.south) {
            const { offset, size, texture } = faces.south;
            const o = getOrigin(x, y, z + 1, offset.x, offset.y, -offset.z);
            const e = get(x + 1, y, z + 1);
            const w = get(x - 1, y, z + 1);
            const t = get(x, y + 1, z + 1);
            const b = get(x, y - 1, z + 1);
            pushFace(
              [o.x, o.y, o.z], [w, b, get(x - 1, y - 1, z + 1)],
              [o.x + size.x, o.y, o.z], [e, b, get(x + 1, y - 1, z + 1)],
              [o.x + size.x, o.y + size.y, o.z], [e, t, get(x + 1, y + 1, z + 1)],
              [o.x, o.y + size.y, o.z], [w, t, get(x - 1, y + 1, z + 1)],
              voxel.color,
              hasAO ? neighbors.south : voxel,
              hasAO,
              isTransparent,
              textures[texture],
              2
            );
          }
          if (faces.north) {
            const { offset, size, texture } = faces.north;
            const o = getOrigin(x + 1, y, z, -offset.x, offset.y, offset.z);
            const e = get(x + 1, y, z - 1);
            const w = get(x - 1, y, z - 1);
            const t = get(x, y + 1, z - 1);
            const b = get(x, y - 1, z - 1);
            pushFace(
              [o.x, o.y, o.z], [e, b, get(x + 1, y - 1, z - 1)],
              [o.x - size.x, o.y, o.z], [w, b, get(x - 1, y - 1, z - 1)],
              [o.x - size.x, o.y + size.y, o.z], [w, t, get(x - 1, y + 1, z - 1)],
              [o.x, o.y + size.y, o.z], [e, t, get(x + 1, y + 1, z - 1)],
              voxel.color,
              hasAO ? neighbors.north : voxel,
              hasAO,
              isTransparent,
              textures[texture],
              3
            );
          }
          if (faces.west) {
            const { offset, size, texture } = faces.west;
            const o = getOrigin(x, y, z, offset.z, offset.y, offset.x);
            const n = get(x - 1, y, z - 1);
            const s = get(x - 1, y, z + 1);
            const t = get(x - 1, y + 1, z);
            const b = get(x - 1, y - 1, z);
            pushFace(
              [o.x, o.y, o.z], [n, b, get(x - 1, y - 1, z - 1)],
              [o.x, o.y, o.z + size.x], [s, b, get(x - 1, y - 1, z + 1)],
              [o.x, o.y + size.y, o.z + size.x], [s, t, get(x - 1, y + 1, z + 1)],
              [o.x, o.y + size.y, o.z], [n, t, get(x - 1, y + 1, z - 1)],
              voxel.color,
              hasAO ? neighbors.west : voxel,
              hasAO,
              isTransparent,
              textures[texture],
              4
            );
          }
          if (faces.east) {
            const { offset, size, texture } = faces.east;
            const o = getOrigin(x + 1, y, z + 1, -offset.z, offset.y, -offset.x);
            const n = get(x + 1, y, z - 1);
            const s = get(x + 1, y, z + 1);
            const t = get(x + 1, y + 1, z);
            const b = get(x + 1, y - 1, z);
            pushFace(
              [o.x, o.y, o.z], [s, b, get(x + 1, y - 1, z + 1)],
              [o.x, o.y, o.z - size.x], [n, b, get(x + 1, y - 1, z - 1)],
              [o.x, o.y + size.y, o.z - size.x], [n, t, get(x + 1, y + 1, z - 1)],
              [o.x, o.y + size.y, o.z], [s, t, get(x + 1, y + 1, z + 1)],
              voxel.color,
              hasAO ? neighbors.east : voxel,
              hasAO,
              isTransparent,
              textures[texture],
              5
            );
          }
        }
      }
    }
  }
  return ['opaque', 'transparent'].reduce((meshes, key) => {
    const {
      color,
      light,
      position,
      uv,
    } = geometry[key];
    meshes[key] = {
      color: new Uint8Array(color),
      light: new Uint8Array(light),
      position: new Uint8Array(position),
      uv: new Uint8Array(uv),
    };
    return meshes;
  }, {});
};
