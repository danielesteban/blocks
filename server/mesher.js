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
  const getLightingAO = ({ light, sunlight }, neighbors) => neighbors.map((neighbors) => {
    let n1 = types[neighbors[0].type].hasAO;
    let n2 = types[neighbors[1].type].hasAO;
    let n3 = (n1 && n2) || (types[neighbors[2].type].hasAO);
    const ao = [n1, n2, n3].reduce((ao, n) => (
      ao - (n ? 0.2 : 0)
    ), 1);
    let c = 1;
    let l = light;
    let s = sunlight;
    n1 = types[neighbors[0].type].isTransparent;
    n2 = types[neighbors[1].type].isTransparent;
    n3 = (n1 || n2) && types[neighbors[2].type].isTransparent;
    [n1, n2, n3].forEach((n, i) => {
      if (n) {
        l += neighbors[i].light;
        s += neighbors[i].sunlight;
        c += 1;
      }
    });
    l = Math.round(l / c);
    s = Math.round(s / c);
    return {
      ao,
      light: (l << 4) | s,
      combined: ao * (l + s) * 0.5,
    };
  });
  const getLighting = ({ light, sunlight }) => [...Array(4)].map(() => ({
    ao: 1,
    light: (light << 4) | sunlight,
    combined: (light + sunlight) * 0.5,
  }));
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
    p1,
    p2,
    p3,
    p4,
    color,
    lighting,
    isTransparent,
    texture,
    facing
  ) => {
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
            get: (nx, ny, nz) => get(x + nx, y + ny, z + nz),
            top: get(x, y + 1, z),
            bottom: get(x, y - 1, z),
            south: get(x, y, z + 1),
            north: get(x, y, z - 1),
            west: get(x - 1, y, z),
            east: get(x + 1, y, z),
          };
          const { textures, hasAO, isTransparent } = types[voxel.type];
          const faces = types[voxel.type].faces({ neighbors, types, voxel });
          faces.forEach(({
            facing,
            offset,
            size,
            texture,
          }) => {
            switch (facing) {
              case 'top': {
                const o = getOrigin(x, y + 1, z + 1, offset.x, -offset.z, -offset.y);
                let lighting;
                if (hasAO) {
                  const n = get(x, y + 1, z - 1);
                  const e = get(x + 1, y + 1, z);
                  const w = get(x - 1, y + 1, z);
                  const s = get(x, y + 1, z + 1);
                  lighting = getLightingAO(
                    neighbors.top,
                    [
                      [w, s, get(x - 1, y + 1, z + 1)],
                      [e, s, get(x + 1, y + 1, z + 1)],
                      [e, n, get(x + 1, y + 1, z - 1)],
                      [w, n, get(x - 1, y + 1, z - 1)],
                    ]
                  );
                } else {
                  lighting = getLighting(voxel);
                }
                pushFace(
                  [o.x, o.y, o.z],
                  [o.x + size.x, o.y, o.z],
                  [o.x + size.x, o.y, o.z - size.y],
                  [o.x, o.y, o.z - size.y],
                  voxel.color,
                  lighting,
                  isTransparent,
                  textures[texture],
                  0
                );
                break;
              }
              case 'bottom': {
                const o = getOrigin(x, y, z, offset.x, offset.z, offset.y);
                let lighting;
                if (hasAO) {
                  const n = get(x, y - 1, z - 1);
                  const e = get(x + 1, y - 1, z);
                  const w = get(x - 1, y - 1, z);
                  const s = get(x, y - 1, z + 1);
                  lighting = getLightingAO(
                    neighbors.bottom,
                    [
                      [w, n, get(x - 1, y - 1, z - 1)],
                      [e, n, get(x + 1, y - 1, z - 1)],
                      [e, s, get(x + 1, y - 1, z + 1)],
                      [w, s, get(x - 1, y - 1, z + 1)],
                    ]
                  );
                } else {
                  lighting = getLighting(voxel);
                }
                pushFace(
                  [o.x, o.y, o.z],
                  [o.x + size.x, o.y, o.z],
                  [o.x + size.x, o.y, o.z + size.y],
                  [o.x, o.y, o.z + size.y],
                  voxel.color,
                  lighting,
                  isTransparent,
                  textures[texture],
                  1
                );
                break;
              }
              case 'south': {
                const o = getOrigin(x, y, z + 1, offset.x, offset.y, -offset.z);
                let lighting;
                if (hasAO) {
                  const e = get(x + 1, y, z + 1);
                  const w = get(x - 1, y, z + 1);
                  const t = get(x, y + 1, z + 1);
                  const b = get(x, y - 1, z + 1);
                  lighting = getLightingAO(
                    neighbors.south,
                    [
                      [w, b, get(x - 1, y - 1, z + 1)],
                      [e, b, get(x + 1, y - 1, z + 1)],
                      [e, t, get(x + 1, y + 1, z + 1)],
                      [w, t, get(x - 1, y + 1, z + 1)],
                    ]
                  );
                } else {
                  lighting = getLighting(voxel);
                }
                pushFace(
                  [o.x, o.y, o.z],
                  [o.x + size.x, o.y, o.z],
                  [o.x + size.x, o.y + size.y, o.z],
                  [o.x, o.y + size.y, o.z],
                  voxel.color,
                  lighting,
                  isTransparent,
                  textures[texture],
                  2
                );
                break;
              }
              case 'north': {
                const o = getOrigin(x + 1, y, z, -offset.x, offset.y, offset.z);
                let lighting;
                if (hasAO) {
                  const e = get(x + 1, y, z - 1);
                  const w = get(x - 1, y, z - 1);
                  const t = get(x, y + 1, z - 1);
                  const b = get(x, y - 1, z - 1);
                  lighting = getLightingAO(
                    neighbors.north,
                    [
                      [e, b, get(x + 1, y - 1, z - 1)],
                      [w, b, get(x - 1, y - 1, z - 1)],
                      [w, t, get(x - 1, y + 1, z - 1)],
                      [e, t, get(x + 1, y + 1, z - 1)],
                    ]
                  );
                } else {
                  lighting = getLighting(voxel);
                }
                pushFace(
                  [o.x, o.y, o.z],
                  [o.x - size.x, o.y, o.z],
                  [o.x - size.x, o.y + size.y, o.z],
                  [o.x, o.y + size.y, o.z],
                  voxel.color,
                  lighting,
                  isTransparent,
                  textures[texture],
                  3
                );
                break;
              }
              case 'west': {
                const o = getOrigin(x, y, z, offset.z, offset.y, offset.x);
                let lighting;
                if (hasAO) {
                  const n = get(x - 1, y, z - 1);
                  const s = get(x - 1, y, z + 1);
                  const t = get(x - 1, y + 1, z);
                  const b = get(x - 1, y - 1, z);
                  lighting = getLightingAO(
                    neighbors.west,
                    [
                      [n, b, get(x - 1, y - 1, z - 1)],
                      [s, b, get(x - 1, y - 1, z + 1)],
                      [s, t, get(x - 1, y + 1, z + 1)],
                      [n, t, get(x - 1, y + 1, z - 1)],
                    ]
                  );
                } else {
                  lighting = getLighting(voxel);
                }
                pushFace(
                  [o.x, o.y, o.z],
                  [o.x, o.y, o.z + size.x],
                  [o.x, o.y + size.y, o.z + size.x],
                  [o.x, o.y + size.y, o.z],
                  voxel.color,
                  lighting,
                  isTransparent,
                  textures[texture],
                  4
                );
                break;
              }
              case 'east': {
                const o = getOrigin(x + 1, y, z + 1, -offset.z, offset.y, -offset.x);
                let lighting;
                if (hasAO) {
                  const n = get(x + 1, y, z - 1);
                  const s = get(x + 1, y, z + 1);
                  const t = get(x + 1, y + 1, z);
                  const b = get(x + 1, y - 1, z);
                  lighting = getLightingAO(
                    neighbors.east,
                    [
                      [s, b, get(x + 1, y - 1, z + 1)],
                      [n, b, get(x + 1, y - 1, z - 1)],
                      [n, t, get(x + 1, y + 1, z - 1)],
                      [s, t, get(x + 1, y + 1, z + 1)],
                    ]
                  );
                } else {
                  lighting = getLighting(voxel);
                }
                pushFace(
                  [o.x, o.y, o.z],
                  [o.x, o.y, o.z - size.x],
                  [o.x, o.y + size.y, o.z - size.x],
                  [o.x, o.y + size.y, o.z],
                  voxel.color,
                  lighting,
                  isTransparent,
                  textures[texture],
                  5
                );
                break;
              }
              default:
                break;
            }
          });
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
