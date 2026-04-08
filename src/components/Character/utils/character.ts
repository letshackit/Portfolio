import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const loadCharacter = () => {
    return new Promise<GLTF | null>(async (resolve, reject) => {
      try {
        const encryptedBlob = await decryptFile(
          "/models/character.enc?v=4",
          "MyCharacter12"
        );
        const blobUrl = URL.createObjectURL(new Blob([encryptedBlob]));

        let character: THREE.Object3D;
        loader.load(
          blobUrl,
          async (gltf) => {
            character = gltf.scene;
            await renderer.compileAsync(character, camera, scene);
            character.traverse((child: any) => {
              if (child.isMesh) {
                const mesh = child as THREE.Mesh;

                if (mesh.material) {
                  const mat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;

                  if (mesh.name === "avaturn_look_0") {
                    mat.roughness = 0.85;
                    mesh.material = mat;
                  } else if (mesh.name === "avaturn_shoes_0") {
                    mat.roughness = 0.9;
                    mesh.material = mat;
                  } else if (mesh.name === "avaturn_hair_0") {
                    mat.roughness = 0.6;
                    mat.metalness = 0.1;
                    mesh.material = mat;
                  } else if (mesh.name === "avaturn_body") {
                    mat.roughness = 0.75;
                    mat.metalness = 0.0;
                    mesh.material = mat;
                  } else if (mesh.name.startsWith("avaturn_glasses")) {
                    mat.roughness = 0.2;
                    mat.metalness = 0.8;
                    mesh.material = mat;
                  }
                }

                child.castShadow = true;
                child.receiveShadow = true;
                mesh.frustumCulled = true;
              }
            });
            resolve(gltf);
            setCharTimeline(character, camera);
            setAllTimeline();

            dracoLoader.dispose();
          },
          undefined,
          (error) => {
            console.error("Error loading GLTF model:", error);
            reject(error);
          }
        );
      } catch (err) {
        reject(err);
        console.error(err);
      }
    });
  };

  return { loadCharacter };
};

export default setCharacter;
