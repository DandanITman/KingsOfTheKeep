/**
 * Low-poly primitive builders shared by unit/building mesh factories.
 * Everything is BufferGeometry merged into few draw calls per archetype.
 */

import * as THREE from 'three';

export const MAT_CACHE = new Map<number, THREE.MeshLambertMaterial>();

export function mat(color: number): THREE.MeshLambertMaterial {
  let m = MAT_CACHE.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    MAT_CACHE.set(color, m);
  }
  return m;
}

export function box(
  w: number,
  h: number,
  d: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  ry = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  return mesh;
}

export function cylinder(
  rTop: number,
  rBottom: number,
  h: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  segments = 6,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

export function cone(r: number, h: number, color: number, x = 0, y = 0, z = 0, segments = 6): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

export function sphere(r: number, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

/** Group helper. */
export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}

/** Team-colored banner on a pole. The cloth is tagged so views can flutter it. */
export function banner(teamColor: number, height = 1.6, x = 0, z = 0): THREE.Group {
  const pole = cylinder(0.03, 0.03, height, 0x5a4426, x, height / 2, z, 4);
  const cloth = box(0.04, 0.35, 0.5, teamColor, x, height - 0.25, z + 0.28);
  cloth.userData.bannerCloth = true;
  cloth.userData.flutterPhase = Math.random() * Math.PI * 2;
  return group(pole, cloth);
}
