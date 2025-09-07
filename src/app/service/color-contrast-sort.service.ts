import { Injectable } from '@angular/core';

/**
 * Sorts a list of color codes by first selecting the color with the smallest
 * HSL hue angle, then ordering the remaining colors by increasing Delta E
 * (CIEDE2000) distance from that base color.
 *
 * Supported inputs:
 * - Hex colors: #RGB, #RRGGBB (case-insensitive)
 * - rgb(r, g, b) with r/g/b in [0,255]
 */
@Injectable({ providedIn: 'root' })
export class ColorContrastSortService {
  /**
   * Returns a new array sorted by:
   * 1) Pick base = smallest finite hue
   * 2) Repeatedly append the remaining color with the smallest Delta E from the last picked
   */
  sortByHueThenDeltaE(colors: string[]): string[] {
    if (!Array.isArray(colors)) throw new Error('colors must be an array of strings');
    const parsed = colors.map((c, i) => {
      try {
        const rgb = this.parseColor(c);
        const hsl = this.rgbToHsl(rgb);
        const lab = this.rgbToLab(rgb);
        return { input: c, index: i, rgb, hsl, lab };
      } catch (err) {
        console.error(`Invalid color at index ${i}: ${c}`, err);
        throw err;
      }
    });

    // Choose base color: smallest finite hue; if none finite, fall back to first.
    const withFiniteHue = parsed.filter(p => Number.isFinite(p.hsl.h));
    const base = (withFiniteHue.length > 0
      ? withFiniteHue.reduce((min, p) => (p.hsl.h < min.hsl.h ? p : min))
      : parsed[0]
    );

    const remaining = parsed.filter(p => p !== base);
    const ordered: typeof parsed = [base];
    while (remaining.length > 0) {
      const last = ordered[ordered.length - 1];
      let bestIdx = 0;
      let bestDe = this.deltaE2000(last.lab, remaining[0].lab);
      for (let i = 1; i < remaining.length; i++) {
        const de = this.deltaE2000(last.lab, remaining[i].lab);
        if (de < bestDe - 1e-12) { // tolerance for FP
          bestDe = de;
          bestIdx = i;
        } else if (Math.abs(de - bestDe) <= 1e-12) {
          // Deterministic tie-breakers
          const a = remaining[i];
          const b = remaining[bestIdx];
          const ah = Number.isFinite(a.hsl.h) ? a.hsl.h : Infinity;
          const bh = Number.isFinite(b.hsl.h) ? b.hsl.h : Infinity;
          if (ah !== bh ? ah < bh : a.index < b.index) bestIdx = i;
        }
      }
      ordered.push(remaining.splice(bestIdx, 1)[0]);
    }

    return ordered.map(o => o.input);
  }

  // Public for potential external validations/tests if needed
  deltaE(color1: string, color2: string): number {
    const lab1 = this.rgbToLab(this.parseColor(color1));
    const lab2 = this.rgbToLab(this.parseColor(color2));
    return this.deltaE2000(lab1, lab2);
  }

  // ---------- Color parsing and conversions ----------

  private parseColor(input: string): RGB {
    if (typeof input !== 'string') throw new Error('Color must be a string');
    const s = input.trim().toLowerCase();

    // #rgb or #rrggbb
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) {
      let hex = s.slice(1);
      if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }

    // rgb(r, g, b)
    const rgbMatch = s.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
    if (rgbMatch) {
      const r = Number(rgbMatch[1]);
      const g = Number(rgbMatch[2]);
      const b = Number(rgbMatch[3]);
      if ([r, g, b].some(v => v < 0 || v > 255)) throw new Error('rgb() values out of range');
      return { r, g, b };
    }

    throw new Error(`Unsupported color format: ${input}`);
  }

  private rgbToHsl({ r, g, b }: RGB): HSL {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    let h: number; let s: number;
    if (max === min) {
      h = NaN; // undefined hue for achromatic
      s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max - min);
      switch (max) {
        case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
        case gn: h = (bn - rn) / d + 2; break;
        default: h = (rn - gn) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s, l };
  }

  // sRGB (D65) -> XYZ -> Lab
  private rgbToLab(rgb: RGB): LAB {
    const { x, y, z } = this.rgbToXyz(rgb);
    return this.xyzToLab(x, y, z);
  }

  private rgbToXyz({ r, g, b }: RGB): { x: number, y: number, z: number } {
    // Convert sRGB 0..255 to linear RGB 0..1
    const srgb = [r, g, b].map(v => v / 255).map(u => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4)));
    const [rl, gl, bl] = srgb;
    // sRGB D65
    const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
    const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
    const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;
    return { x: x * 100, y: y * 100, z: z * 100 };
  }

  private xyzToLab(x: number, y: number, z: number): LAB {
    // Reference white D65
    const Xn = 95.047, Yn = 100.0, Zn = 108.883;
    let xr = x / Xn, yr = y / Yn, zr = z / Zn;
    const epsilon = 216 / 24389; // 0.008856
    const kappa = 24389 / 27; // 903.3
    const fx = xr > epsilon ? Math.cbrt(xr) : (kappa * xr + 16) / 116;
    const fy = yr > epsilon ? Math.cbrt(yr) : (kappa * yr + 16) / 116;
    const fz = zr > epsilon ? Math.cbrt(zr) : (kappa * zr + 16) / 116;
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    return { L, a, b };
  }

  // CIEDE2000 Delta E implementation
  private deltaE2000(lab1: LAB, lab2: LAB): number {
    // Based on https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
    const { L: L1, a: a1, b: b1 } = lab1;
    const { L: L2, a: a2, b: b2 } = lab2;

    const avgLp = (L1 + L2) / 2;
    const C1 = Math.hypot(a1, b1);
    const C2 = Math.hypot(a2, b2);
    const avgC = (C1 + C2) / 2;

    const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;
    const C1p = Math.hypot(a1p, b1);
    const C2p = Math.hypot(a2p, b2);

    const h1p = this.atan2Deg(b1, a1p);
    const h2p = this.atan2Deg(b2, a2p);

    const dLp = L2 - L1;
    const dCp = C2p - C1p;

    let dhp = h2p - h1p;
    if (C1p * C2p === 0) dhp = 0;
    else if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;

    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(this.degToRad(dhp / 2));

    const avgLpM = (L1 + L2) / 2;
    const avgCp = (C1p + C2p) / 2;

    let hpSum = h1p + h2p;
    let avgHp: number;
    if (C1p * C2p === 0) avgHp = hpSum; // both hue undefined => just sum, not used further
    else if (Math.abs(h1p - h2p) <= 180) avgHp = hpSum / 2;
    else avgHp = (hpSum + 360 * (hpSum < 360 ? 1 : -1)) / 2;

    const T = 1 - 0.17 * Math.cos(this.degToRad(avgHp - 30))
      + 0.24 * Math.cos(this.degToRad(2 * avgHp))
      + 0.32 * Math.cos(this.degToRad(3 * avgHp + 6))
      - 0.20 * Math.cos(this.degToRad(4 * avgHp - 63));

    const dTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
    const Rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
    const Sl = 1 + (0.015 * Math.pow(avgLpM - 50, 2)) / Math.sqrt(20 + Math.pow(avgLpM - 50, 2));
    const Sc = 1 + 0.045 * avgCp;
    const Sh = 1 + 0.015 * avgCp * T;
    const Rt = -Math.sin(this.degToRad(2 * dTheta)) * Rc;

    const dE = Math.sqrt(
      Math.pow(dLp / Sl, 2) +
      Math.pow(dCp / Sc, 2) +
      Math.pow(dHp / Sh, 2) +
      Rt * (dCp / Sc) * (dHp / Sh)
    );
    return dE;
  }

  private atan2Deg(y: number, x: number): number {
    let deg = this.radToDeg(Math.atan2(y, x));
    if (deg < 0) deg += 360;
    return deg;
  }

  private degToRad(deg: number): number { return (deg * Math.PI) / 180; }
  private radToDeg(rad: number): number { return (rad * 180) / Math.PI; }
}


// Types at bottom per repo guidelines
interface RGB { r: number; g: number; b: number; }
interface HSL { h: number; s: number; l: number; }
interface LAB { L: number; a: number; b: number; }
