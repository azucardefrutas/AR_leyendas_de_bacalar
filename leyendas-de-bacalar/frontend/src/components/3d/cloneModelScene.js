import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

export function cloneModelScene(scene) {
  const copy = cloneSkeleton(scene);
  // Center/Bounds must see the complete bone hierarchy, including scaled armatures.
  copy.updateMatrixWorld(true);
  copy.traverse((object) => {
    if (!object.isSkinnedMesh) return;
    object.frustumCulled = false;
    object.computeBoundingBox();
    object.computeBoundingSphere();
  });
  return copy;
}
