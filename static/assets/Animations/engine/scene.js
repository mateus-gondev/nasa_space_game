import { Mesh } from 'three';

/** Native geometry composition used by the MARS 01 model. */
export function addMesh(parent, geometry, material, {
  position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1],
  castShadow = false, receiveShadow = false,
} = {}) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  return mesh;
}
