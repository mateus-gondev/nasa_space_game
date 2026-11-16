/** Dispose resources owned by a scene, including shared materials only once. */
export function disposeScene(scene, extra = []) {
  const resources = new Set(extra);
  scene.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    if (object.shadow) resources.add(object.shadow);
    if (object.isInstancedMesh) resources.add(object);
    const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
    for (const material of materials) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  for (const resource of resources) resource.dispose();
}
