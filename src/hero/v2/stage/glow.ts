import { CanvasTexture, SRGBColorSpace } from 'three';

let soft: CanvasTexture | null = null;

/** One shared soft round falloff, used by the drone halos and the beam packets. Created on first use. */
export function getSoftTexture(): CanvasTexture {
  if (soft) return soft;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.7)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  }
  soft = new CanvasTexture(c);
  soft.colorSpace = SRGBColorSpace;
  return soft;
}

export function disposeSoftTexture(): void {
  soft?.dispose();
  soft = null;
}
