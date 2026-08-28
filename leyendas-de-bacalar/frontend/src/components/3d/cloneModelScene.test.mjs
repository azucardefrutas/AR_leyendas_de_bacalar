import assert from 'node:assert/strict';
import test from 'node:test';
import { Bone, BoxGeometry, Group, MeshBasicMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute, Float32BufferAttribute, Vector3 } from 'three';
import { cloneModelScene } from './cloneModelScene.js';

function riggedScene() {
  const geometry = new BoxGeometry(1, 2, 1);
  const count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Array(count * 4).fill(0), 4));
  const weights = new Float32Array(count * 4);
  for (let index = 0; index < count; index += 1) weights[index * 4] = 1;
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4));
  const bone = new Bone();
  const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial());
  mesh.add(bone);
  mesh.bind(new Skeleton([bone]));
  const root = new Group();
  root.add(mesh);
  root.scale.setScalar(0.01);
  root.position.y = 3;
  // Deliberately leave world transforms stale, as they can be after GLTF loading.
  return { root, mesh };
}

test('cloned skinned models have independent bones and initialized bounds', () => {
  const { root, mesh } = riggedScene();
  const first = cloneModelScene(root);
  const second = cloneModelScene(root);
  const firstMesh = first.children[0];
  const secondMesh = second.children[0];
  assert.notEqual(firstMesh.skeleton, mesh.skeleton);
  assert.notEqual(firstMesh.skeleton.bones[0], secondMesh.skeleton.bones[0]);
  assert.equal(firstMesh.geometry, mesh.geometry);
  assert.equal(firstMesh.frustumCulled, false);
  assert.ok(firstMesh.boundingSphere.radius > 0);
  const worldBounds = firstMesh.boundingBox.clone().applyMatrix4(firstMesh.matrixWorld);
  assert.ok(Math.abs(worldBounds.getCenter(new Vector3()).y - 3) < 1e-6);
  assert.ok(Math.abs(worldBounds.getSize(new Vector3()).y - 0.02) < 1e-6);
  firstMesh.skeleton.bones[0].position.x = 10;
  assert.equal(secondMesh.skeleton.bones[0].position.x, 0);
  assert.equal(mesh.skeleton.bones[0].position.x, 0);
});
