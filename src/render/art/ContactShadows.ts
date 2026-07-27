import * as THREE from 'three';

/**
 * Soft blob shadows drawn on the ground under every unit.
 *
 * The shadow map alone never sells contact: it is low-resolution, biased away
 * from the surface, and at RTS zoom a unit's own shadow is a few pixels. A
 * cheap darkened blob directly beneath each unit is what actually makes it look
 * like it is standing on the terrain rather than hovering above it — and it
 * does so regardless of what the shadow map is doing.
 *
 * One instanced quad pool, one draw call for the whole army.
 */
const MAX_SHADOWS = 600;

export class ContactShadows {
  readonly mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private count = 0;

  constructor() {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(geo, makeMaterial(), MAX_SHADOWS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.count = 0;
    // A shadow must never shadow anything itself, nor occlude the ground.
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
  }

  /** Call once per frame before adding shadows. */
  begin(): void {
    this.count = 0;
  }

  /** Add a blob of the given ground radius at a world position. */
  add(x: number, z: number, radius: number, y = 0.03): void {
    if (this.count >= MAX_SHADOWS) return;
    this.dummy.position.set(x, y, z);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.scale.set(radius * 2, 1, radius * 2);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.count++, this.dummy.matrix);
  }

  /** Call once per frame after all shadows are added. */
  end(): void {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/**
 * A radial falloff generated in the shader rather than from a texture, so this
 * needs no canvas and works identically in every environment.
 *
 * Straight alpha-blended black rather than a multiply blend: multiply looked
 * correct on paper but rendered as opaque white quads in practice, and a plain
 * transparent black disc is both unambiguous and cheaper to reason about.
 */
function makeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        if (d > 1.0) discard;
        float a = 1.0 - smoothstep(0.15, 1.0, d);
        gl_FragColor = vec4(0.04, 0.05, 0.03, a * 0.38);
      }`,
  });
}
