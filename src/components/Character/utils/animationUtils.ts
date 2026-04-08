import * as THREE from "three";
import { GLTF } from "three-stdlib";

const EXCLUDED_BONES = ["Head", "Neck"];

function filterHeadTracks(clip: THREE.AnimationClip): THREE.AnimationClip {
  const filtered = clip.tracks.filter(
    (track) => !EXCLUDED_BONES.some((bone) => track.name.includes(bone))
  );
  return new THREE.AnimationClip(clip.name + "_noHead", clip.duration, filtered);
}

const setAnimations = (gltf: GLTF) => {
  const character = gltf.scene;
  const mixer = new THREE.AnimationMixer(character);

  if (gltf.animations && gltf.animations.length > 0) {
    const idleClip = gltf.animations[0];
    if (idleClip) {
      const filteredClip = filterHeadTracks(idleClip);
      const idleAction = mixer.clipAction(filteredClip);
      idleAction.setLoop(THREE.LoopRepeat, Infinity);
      idleAction.play();
    }
  }

  function startIntro() {}

  function hover(_gltf: GLTF, _hoverDiv: HTMLDivElement) {}

  return { mixer, startIntro, hover };
};

export default setAnimations;
