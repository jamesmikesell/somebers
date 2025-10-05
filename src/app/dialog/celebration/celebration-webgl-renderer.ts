import { CelebrationConfig } from './celebration-launcher.service';

interface ProgramHandles {
  position?: number;
  time?: WebGLUniformLocation | null;
}

interface ConfettiHandles {
  position?: number;
  color?: number;
  size?: number;
  resolution?: WebGLUniformLocation | null;
  time?: WebGLUniformLocation | null;
  angle?: number;
  ratio?: number;
}

interface TextHandles {
  position?: number;
  texCoord?: number;
  texture?: WebGLUniformLocation | null;
  opacity?: WebGLUniformLocation | null;
  scale?: WebGLUniformLocation | null;
}

interface FireworkHandles {
  position?: number;
  color?: number;
  size?: number;
  intensity?: number;
  resolution?: WebGLUniformLocation | null;
}

interface ConfettiPaletteEntry {
  r: number;
  g: number;
  b: number;
}

export class CelebrationWebglRenderer {
  private readonly config: CelebrationConfig;

  private canvas: HTMLCanvasElement | null = null;
  private overlay: HTMLDivElement | null = null;

  private gl: WebGLRenderingContext | null = null;
  private backgroundProgram: WebGLProgram | null = null;
  private confettiProgram: WebGLProgram | null = null;
  private textProgram: WebGLProgram | null = null;
  private fireworkProgram: WebGLProgram | null = null;

  private backgroundBuffer: WebGLBuffer | null = null;
  private confettiPositionBuffer: WebGLBuffer | null = null;
  private confettiColorBuffer: WebGLBuffer | null = null;
  private confettiSizeBuffer: WebGLBuffer | null = null;
  private confettiAngleBuffer: WebGLBuffer | null = null;
  private confettiRatioBuffer: WebGLBuffer | null = null;
  private fireworkPositionBuffer: WebGLBuffer | null = null;
  private fireworkColorBuffer: WebGLBuffer | null = null;
  private fireworkSizeBuffer: WebGLBuffer | null = null;
  private fireworkIntensityBuffer: WebGLBuffer | null = null;
  private textBuffer: WebGLBuffer | null = null;
  private textTexture: WebGLTexture | null = null;

  private readonly backgroundHandles: ProgramHandles = {};
  private readonly confettiHandles: ConfettiHandles = {};
  private readonly textHandles: TextHandles = {};
  private readonly fireworkHandles: FireworkHandles = {};

  private animationFrameId: number | null = null;
  private resizeObserver?: ResizeObserver;

  private readonly confettiCount = 180;
  private readonly confettiPositions = new Float32Array(this.confettiCount * 2);
  private readonly confettiVelocities = new Float32Array(this.confettiCount * 2);
  private readonly confettiColors = new Float32Array(this.confettiCount * 3);
  private readonly confettiSizes = new Float32Array(this.confettiCount);
  private readonly confettiFlutterPhase = new Float32Array(this.confettiCount);
  private readonly confettiFlutterSpeed = new Float32Array(this.confettiCount);
  private readonly confettiFlutterMagnitude = new Float32Array(this.confettiCount);
  private readonly confettiAngles = new Float32Array(this.confettiCount);
  private readonly confettiAngularVelocity = new Float32Array(this.confettiCount);
  private readonly confettiAspectRatios = new Float32Array(this.confettiCount);
  private confettiInitialized = false;
  private confettiNeedsRatioUpload = false;

  private readonly fireworksPerBurst = 48;
  private readonly fireworkPoolSize = this.fireworksPerBurst * 6;
  private readonly fireworkPositions = new Float32Array(this.fireworkPoolSize * 2);
  private readonly fireworkVelocities = new Float32Array(this.fireworkPoolSize * 2);
  private readonly fireworkColors = new Float32Array(this.fireworkPoolSize * 3);
  private readonly fireworkSizes = new Float32Array(this.fireworkPoolSize);
  private readonly fireworkIntensity = new Float32Array(this.fireworkPoolSize);
  private readonly fireworkLifeRemaining = new Float32Array(this.fireworkPoolSize);
  private readonly fireworkLifeDuration = new Float32Array(this.fireworkPoolSize);
  private readonly fireworkBaseSize = new Float32Array(this.fireworkPoolSize);
  private nextFireworkTime = 0;

  private lastFrame = performance.now();
  private startTime = this.lastFrame;
  private active = false;

  private readonly renderFrame = (timestamp: number) => this.drawScene(timestamp);
  private readonly handleResize = () => this.syncCanvasSize();

  constructor(config: CelebrationConfig) {
    this.config = config;
  }

  initialize(canvas: HTMLCanvasElement, overlay: HTMLDivElement): boolean {
    this.canvas = canvas;
    this.overlay = overlay;
    this.active = true;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      this.active = false;
      return false;
    }

    this.gl = gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.createPrograms();
    this.setupBuffers();
    this.syncCanvasSize(true);

    if (this.overlay && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.overlay);
    }

    this.startTime = performance.now();
    this.lastFrame = this.startTime;
    this.animationFrameId = requestAnimationFrame(this.renderFrame);

    return true;
  }

  destroy(): void {
    this.active = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.resizeObserver && this.overlay) {
      this.resizeObserver.unobserve(this.overlay);
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }

    if (!this.gl) return;

    if (this.textTexture) {
      this.gl.deleteTexture(this.textTexture);
      this.textTexture = null;
    }

    if (this.backgroundBuffer) {
      this.gl.deleteBuffer(this.backgroundBuffer);
      this.backgroundBuffer = null;
    }
    if (this.confettiPositionBuffer) {
      this.gl.deleteBuffer(this.confettiPositionBuffer);
      this.confettiPositionBuffer = null;
    }
    if (this.confettiColorBuffer) {
      this.gl.deleteBuffer(this.confettiColorBuffer);
      this.confettiColorBuffer = null;
    }
    if (this.confettiSizeBuffer) {
      this.gl.deleteBuffer(this.confettiSizeBuffer);
      this.confettiSizeBuffer = null;
    }
    if (this.confettiAngleBuffer) {
      this.gl.deleteBuffer(this.confettiAngleBuffer);
      this.confettiAngleBuffer = null;
    }
    if (this.confettiRatioBuffer) {
      this.gl.deleteBuffer(this.confettiRatioBuffer);
      this.confettiRatioBuffer = null;
    }
    if (this.fireworkPositionBuffer) {
      this.gl.deleteBuffer(this.fireworkPositionBuffer);
      this.fireworkPositionBuffer = null;
    }
    if (this.fireworkColorBuffer) {
      this.gl.deleteBuffer(this.fireworkColorBuffer);
      this.fireworkColorBuffer = null;
    }
    if (this.fireworkSizeBuffer) {
      this.gl.deleteBuffer(this.fireworkSizeBuffer);
      this.fireworkSizeBuffer = null;
    }
    if (this.fireworkIntensityBuffer) {
      this.gl.deleteBuffer(this.fireworkIntensityBuffer);
      this.fireworkIntensityBuffer = null;
    }
    if (this.textBuffer) {
      this.gl.deleteBuffer(this.textBuffer);
      this.textBuffer = null;
    }

    if (this.backgroundProgram) {
      this.gl.deleteProgram(this.backgroundProgram);
      this.backgroundProgram = null;
    }
    if (this.confettiProgram) {
      this.gl.deleteProgram(this.confettiProgram);
      this.confettiProgram = null;
    }
    if (this.textProgram) {
      this.gl.deleteProgram(this.textProgram);
      this.textProgram = null;
    }
    if (this.fireworkProgram) {
      this.gl.deleteProgram(this.fireworkProgram);
      this.fireworkProgram = null;
    }

    this.gl = null;
  }

  private createPrograms(): void {
    if (!this.gl) return;

    this.backgroundProgram = this.linkProgram(
      `attribute vec2 a_position;\n\n      varying vec2 v_uv;\n\n      void main() {\n        vec2 uv = (a_position * 0.5) + 0.5;\n        v_uv = vec2(uv.x, 1.0 - uv.y);\n        gl_Position = vec4(a_position, 0.0, 1.0);\n      }`,
      `precision mediump float;\n\n      varying vec2 v_uv;\n      uniform float u_time;\n\n      void main() {\n        vec3 dawn = vec3(1.0, 0.42, 0.42);\n        vec3 dusk = vec3(0.35, 0.08, 0.24);\n        vec3 noon = vec3(0.99, 0.82, 0.35);\n        vec3 midnight = vec3(0.1, 0.19, 0.32);\n\n        float motion = sin((v_uv.y + u_time * 0.05) * 8.0) * 0.1;\n        float blend = clamp(v_uv.y + motion, 0.0, 1.0);\n        vec3 rowA = mix(dawn, dusk, blend);\n        vec3 rowB = mix(noon, midnight, blend);\n\n        float radial = smoothstep(0.9, 0.2, distance(v_uv, vec2(0.5, 0.35)));\n        vec3 accent = vec3(0.28, 0.86, 0.98);\n        vec3 base = mix(rowA, rowB, v_uv.x);\n        vec3 color = mix(base, accent, radial * 0.45);\n\n        gl_FragColor = vec4(color, 0.95);\n      }`,
    );

    this.confettiProgram = this.linkProgram(
      `attribute vec2 a_position;\n      attribute vec3 a_color;\n      attribute float a_size;\n      attribute float a_angle;\n      attribute float a_ratio;\n\n      uniform vec2 u_resolution;\n      uniform float u_time;\n\n      varying vec3 v_color;\n      varying float v_time;\n      varying float v_angle;\n      varying float v_ratio;\n\n      void main() {\n        vec2 zeroToOne = a_position / u_resolution;\n        zeroToOne.y = 1.0 - zeroToOne.y;\n        vec2 clip = zeroToOne * 2.0 - 1.0;\n        gl_Position = vec4(clip, 0.0, 1.0);\n        gl_PointSize = a_size;\n        v_color = a_color;\n        v_time = u_time;\n        v_angle = a_angle;\n        v_ratio = a_ratio;\n      }`,
      `precision mediump float;\n\n      varying vec3 v_color;\n      varying float v_time;\n      varying float v_angle;\n      varying float v_ratio;\n\n      void main() {\n        vec2 centered = gl_PointCoord - vec2(0.5);\n        float s = sin(v_angle);\n        float c = cos(v_angle);\n        vec2 rotated = vec2(c * centered.x - s * centered.y, s * centered.x + c * centered.y);\n        float halfWidth = max(0.12, 0.5 * v_ratio);
        float halfHeight = 0.5;
        float alphaX = 1.0 - smoothstep(halfWidth - 0.1, halfWidth, abs(rotated.x));
        float alphaY = 1.0 - smoothstep(halfHeight - 0.1, halfHeight, abs(rotated.y));
        float alpha = alphaX * alphaY;
        if (alpha <= 0.0) {
          discard;
        }
        float shimmer = 0.7 + 0.3 * sin(v_time * 10.0 + rotated.x * 9.0 + v_angle * 1.3);
        gl_FragColor = vec4(v_color * shimmer, alpha);
      }`,
    );

    this.textProgram = this.linkProgram(
      `attribute vec2 a_position;\n      attribute vec2 a_texCoord;\n\n      uniform float u_scale;\n\n      varying vec2 v_texCoord;\n\n      void main() {\n        vec2 scaled = a_position * u_scale;\n        gl_Position = vec4(scaled, 0.0, 1.0);\n        v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y);\n      }`,
      `precision mediump float;\n\n      varying vec2 v_texCoord;\n      uniform sampler2D u_texture;\n      uniform float u_opacity;\n\n      void main() {\n        vec4 texColor = texture2D(u_texture, v_texCoord);\n        if (texColor.a < 0.01) {\n          discard;\n        }\n        gl_FragColor = vec4(texColor.rgb, texColor.a * u_opacity);\n      }`,
    );

    this.fireworkProgram = this.linkProgram(
      `attribute vec2 a_position;\n      attribute vec3 a_color;\n      attribute float a_size;\n      attribute float a_intensity;\n\n      uniform vec2 u_resolution;\n\n      varying vec3 v_color;\n      varying float v_intensity;\n\n      void main() {\n        vec2 zeroToOne = a_position / u_resolution;\n        zeroToOne.y = 1.0 - zeroToOne.y;\n        vec2 clip = zeroToOne * 2.0 - 1.0;\n        gl_Position = vec4(clip, 0.0, 1.0);\n        gl_PointSize = a_size * a_intensity;\n        v_color = a_color;\n        v_intensity = a_intensity;\n      }`,
      `precision mediump float;\n\n      varying vec3 v_color;\n      varying float v_intensity;\n\n      void main() {\n        if (v_intensity <= 0.0) {\n          discard;\n        }\n        vec2 coord = gl_PointCoord - vec2(0.5);\n        float dist = dot(coord, coord);\n        if (dist > 0.25) {\n          discard;\n        }\n        float fade = smoothstep(0.25, 0.0, dist);\n        float alpha = clamp(v_intensity * fade, 0.0, 1.0);\n        vec3 color = v_color * (0.6 + 0.4 * v_intensity);\n        gl_FragColor = vec4(color, alpha);\n      }`,
    );

    if (this.backgroundProgram && this.confettiProgram && this.textProgram && this.fireworkProgram) {
      this.backgroundHandles.position = this.gl!.getAttribLocation(this.backgroundProgram, 'a_position');
      this.backgroundHandles.time = this.gl!.getUniformLocation(this.backgroundProgram, 'u_time');

      this.confettiHandles.position = this.gl!.getAttribLocation(this.confettiProgram, 'a_position');
      this.confettiHandles.color = this.gl!.getAttribLocation(this.confettiProgram, 'a_color');
      this.confettiHandles.size = this.gl!.getAttribLocation(this.confettiProgram, 'a_size');
      this.confettiHandles.angle = this.gl!.getAttribLocation(this.confettiProgram, 'a_angle');
      this.confettiHandles.ratio = this.gl!.getAttribLocation(this.confettiProgram, 'a_ratio');
      this.confettiHandles.resolution = this.gl!.getUniformLocation(this.confettiProgram, 'u_resolution');
      this.confettiHandles.time = this.gl!.getUniformLocation(this.confettiProgram, 'u_time');

      this.textHandles.position = this.gl!.getAttribLocation(this.textProgram, 'a_position');
      this.textHandles.texCoord = this.gl!.getAttribLocation(this.textProgram, 'a_texCoord');
      this.textHandles.texture = this.gl!.getUniformLocation(this.textProgram, 'u_texture');
      this.textHandles.opacity = this.gl!.getUniformLocation(this.textProgram, 'u_opacity');
      this.textHandles.scale = this.gl!.getUniformLocation(this.textProgram, 'u_scale');

      this.fireworkHandles.position = this.gl!.getAttribLocation(this.fireworkProgram, 'a_position');
      this.fireworkHandles.color = this.gl!.getAttribLocation(this.fireworkProgram, 'a_color');
      this.fireworkHandles.size = this.gl!.getAttribLocation(this.fireworkProgram, 'a_size');
      this.fireworkHandles.intensity = this.gl!.getAttribLocation(this.fireworkProgram, 'a_intensity');
      this.fireworkHandles.resolution = this.gl!.getUniformLocation(this.fireworkProgram, 'u_resolution');
    }
  }

  private linkProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Failed to link WebGL program:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Failed to compile shader:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private setupBuffers(): void {
    const gl = this.gl;
    if (!gl || !this.backgroundProgram || !this.confettiProgram || !this.textProgram || !this.fireworkProgram) return;

    this.backgroundBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.backgroundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    this.confettiPositionBuffer = gl.createBuffer();
    this.confettiColorBuffer = gl.createBuffer();
    this.confettiSizeBuffer = gl.createBuffer();
    this.confettiAngleBuffer = gl.createBuffer();
    this.confettiRatioBuffer = gl.createBuffer();

    this.populateConfettiDefaults();

    this.fireworkPositionBuffer = gl.createBuffer();
    this.fireworkColorBuffer = gl.createBuffer();
    this.fireworkSizeBuffer = gl.createBuffer();
    this.fireworkIntensityBuffer = gl.createBuffer();

    this.initializeFireworks();

    this.textBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1, 0, 0,
        1, -1, 1, 0,
        -1, 1, 0, 1,
        1, 1, 1, 1,
      ]),
      gl.STATIC_DRAW,
    );
  }

  private populateConfettiDefaults(): void {
    const gl = this.gl;
    if (!gl || !this.confettiColorBuffer || !this.confettiSizeBuffer) return;

    const palette: ConfettiPaletteEntry[] = [
      { r: 1.0, g: 0.42, b: 0.42 },
      { r: 0.28, g: 0.86, b: 0.98 },
      { r: 0.84, g: 0.16, b: 0.52 },
      { r: 1.0, g: 0.9, b: 0.43 },
      { r: 0.35, g: 0.93, b: 0.52 },
    ];

    for (let i = 0; i < this.confettiCount; i++) {
      const color = palette[i % palette.length];
      const offset = i * 3;
      this.confettiColors[offset] = color.r;
      this.confettiColors[offset + 1] = color.g;
      this.confettiColors[offset + 2] = color.b;
      this.confettiSizes[i] = 8 + Math.random() * 10;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.confettiColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.confettiColors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.confettiSizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.confettiSizes, gl.STATIC_DRAW);

    if (this.confettiRatioBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.confettiRatioBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.confettiAspectRatios, gl.DYNAMIC_DRAW);
      this.confettiNeedsRatioUpload = false;
    }
  }

  private initializeFireworks(): void {
    const gl = this.gl;
    if (!gl || !this.fireworkPositionBuffer || !this.fireworkColorBuffer || !this.fireworkSizeBuffer || !this.fireworkIntensityBuffer) return;

    this.fireworkPositions.fill(0);
    this.fireworkVelocities.fill(0);
    this.fireworkSizes.fill(0);
    this.fireworkIntensity.fill(0);
    this.fireworkLifeRemaining.fill(0);
    this.fireworkLifeDuration.fill(1);
    this.fireworkBaseSize.fill(0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.fireworkPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.fireworkPositions, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.fireworkColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.fireworkColors, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.fireworkSizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.fireworkSizes, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.fireworkIntensityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.fireworkIntensity, gl.DYNAMIC_DRAW);

    this.nextFireworkTime = 0;
  }

  private syncCanvasSize(forceTexture = false): void {
    if (!this.gl || !this.overlay || !this.canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(this.overlay.clientWidth * dpr));
    const height = Math.max(1, Math.floor(this.overlay.clientHeight * dpr));

    const sizeChanged = this.canvas.width !== width || this.canvas.height !== height;

    if (sizeChanged) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.width = `${this.overlay.clientWidth}px`;
      this.canvas.style.height = `${this.overlay.clientHeight}px`;
      this.gl.viewport(0, 0, width, height);
      this.resetConfettiPositions(width, height);
      this.uploadConfettiPositions();
      this.uploadConfettiAngles();
      if (this.confettiNeedsRatioUpload) {
        this.uploadConfettiRatios();
        this.confettiNeedsRatioUpload = false;
      }
    }

    if (sizeChanged || forceTexture) {
      this.updateTextTexture(width, height);
    }
  }

  private resetConfettiPositions(width: number, height: number): void {
    for (let i = 0; i < this.confettiCount; i++) {
      this.resetConfettiParticle(i, width, height, !this.confettiInitialized);
    }
    this.confettiInitialized = true;
  }

  private resetConfettiParticle(index: number, width: number, height: number, spawnAcross = false): void {
    const i2 = index * 2;
    const startX = Math.random() * width;
    const startY = spawnAcross ? Math.random() * height : -Math.random() * height * 0.2;

    this.confettiPositions[i2] = startX;
    this.confettiPositions[i2 + 1] = startY;

    this.confettiVelocities[i2] = (Math.random() - 0.5) * width * 0.05;
    this.confettiVelocities[i2 + 1] = height * (0.055 + Math.random() * 0.06);

    this.confettiFlutterPhase[index] = Math.random() * Math.PI * 2;
    this.confettiFlutterSpeed[index] = 2 + Math.random() * 2.8;
    this.confettiFlutterMagnitude[index] = 16 + Math.random() * 28;
    this.confettiAngles[index] = Math.random() * Math.PI * 2;
    this.confettiAngularVelocity[index] = (Math.random() - 0.5) * 3.5;
    this.confettiAspectRatios[index] = 0.32 + Math.random() * 0.55;
    this.confettiNeedsRatioUpload = true;
  }

  private updateConfetti(delta: number, width: number, height: number, elapsed: number): void {
    for (let i = 0; i < this.confettiCount; i++) {
      const idx = i * 2;

      const phase = this.confettiFlutterPhase[i] + this.confettiFlutterSpeed[i] * delta;
      this.confettiFlutterPhase[i] = phase % (Math.PI * 2);
      const flutterMagnitude = this.confettiFlutterMagnitude[i];
      const flutterVelocityX = Math.sin(phase + elapsed * 0.35) * flutterMagnitude;
      const flutterVelocityY = Math.cos((phase + elapsed) * 0.9) * flutterMagnitude * 0.35;

      const spinDrift = Math.sin(elapsed * 2.1 + i * 0.3) * 0.8;
      this.confettiAngles[i] += (this.confettiAngularVelocity[i] + spinDrift) * delta;
      this.confettiAngularVelocity[i] += Math.sin(phase * 1.2 + elapsed * 0.7) * delta * 0.6;
      this.confettiAngularVelocity[i] = Math.max(-6, Math.min(6, this.confettiAngularVelocity[i]));

      this.confettiPositions[idx] += (this.confettiVelocities[idx] + flutterVelocityX) * delta;
      this.confettiPositions[idx + 1] += (this.confettiVelocities[idx + 1] + flutterVelocityY) * delta;

      this.confettiVelocities[idx] *= 0.99;
      this.confettiVelocities[idx + 1] += height * (0.06 + Math.sin(phase * 0.8) * 0.015) * delta;
      this.confettiVelocities[idx + 1] = Math.min(this.confettiVelocities[idx + 1], height * 0.2);

      if (Math.random() < delta * 0.05) {
        this.confettiFlutterMagnitude[i] = 14 + Math.random() * 32;
        this.confettiFlutterSpeed[i] = 1.8 + Math.random() * 3.2;
      }

      if (this.confettiPositions[idx] < -40) {
        this.confettiPositions[idx] = width + 40;
      } else if (this.confettiPositions[idx] > width + 40) {
        this.confettiPositions[idx] = -40;
      }

      if (this.confettiPositions[idx + 1] > height + 40) {
        this.resetConfettiParticle(i, width, height, false);
      }
    }

    if (this.confettiNeedsRatioUpload) {
      this.uploadConfettiRatios();
      this.confettiNeedsRatioUpload = false;
    }
  }

  private uploadConfettiPositions(): void {
    if (!this.gl || !this.confettiPositionBuffer) return;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.confettiPositionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.confettiPositions, this.gl.DYNAMIC_DRAW);
  }

  private uploadConfettiAngles(): void {
    if (!this.gl || !this.confettiAngleBuffer) return;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.confettiAngleBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.confettiAngles, this.gl.DYNAMIC_DRAW);
  }

  private uploadConfettiRatios(): void {
    if (!this.gl || !this.confettiRatioBuffer) return;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.confettiRatioBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.confettiAspectRatios, this.gl.DYNAMIC_DRAW);
  }

  private maybeSpawnFirework(elapsed: number, width: number, height: number): void {
    if (elapsed < this.nextFireworkTime) return;

    let safety = 0;
    while (elapsed >= this.nextFireworkTime && safety < 3) {
      this.spawnFirework(width, height);
      this.nextFireworkTime = elapsed + 0.45 + Math.random() * 0.75;
      safety++;
    }
  }

  private spawnFirework(width: number, height: number): void {
    const palette: ConfettiPaletteEntry[] = [
      { r: 1.0, g: 0.78, b: 0.28 },
      { r: 0.95, g: 0.33, b: 0.54 },
      { r: 0.42, g: 0.82, b: 1.0 },
      { r: 0.52, g: 1.0, b: 0.72 },
      { r: 0.99, g: 0.52, b: 0.15 },
    ];

    const centerX = width * (0.15 + Math.random() * 0.7);
    const centerY = height * (0.2 + Math.random() * 0.45);
    const baseColor = palette[Math.floor(Math.random() * palette.length)];

    for (let i = 0; i < this.fireworksPerBurst; i++) {
      const slot = this.acquireFireworkSlot();
      if (slot === -1) break;

      const angle = (i / this.fireworksPerBurst) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const speed = height * (0.18 + Math.random() * 0.22);
      const offset = slot * 2;
      this.fireworkPositions[offset] = centerX;
      this.fireworkPositions[offset + 1] = centerY;
      this.fireworkVelocities[offset] = Math.cos(angle) * speed;
      this.fireworkVelocities[offset + 1] = Math.sin(angle) * speed - height * 0.18;

      const colorOffset = slot * 3;
      const fireTint = 0.75 + Math.random() * 0.25;
      this.fireworkColors[colorOffset] = Math.min(1, baseColor.r * fireTint);
      this.fireworkColors[colorOffset + 1] = Math.min(1, baseColor.g * fireTint);
      this.fireworkColors[colorOffset + 2] = Math.min(1, baseColor.b * fireTint);

      const size = 10 + Math.random() * 14;
      this.fireworkBaseSize[slot] = size;
      this.fireworkSizes[slot] = size;

      const life = 0.9 + Math.random() * 0.6;
      this.fireworkLifeDuration[slot] = life;
      this.fireworkLifeRemaining[slot] = life;
      this.fireworkIntensity[slot] = 1;
    }
  }

  private acquireFireworkSlot(): number {
    for (let i = 0; i < this.fireworkPoolSize; i++) {
      if (this.fireworkLifeRemaining[i] <= 0) {
        return i;
      }
    }
    return -1;
  }

  private updateFireworks(delta: number, width: number, height: number): void {
    const gravity = height * 0.45;
    for (let i = 0; i < this.fireworkPoolSize; i++) {
      let life = this.fireworkLifeRemaining[i];
      if (life <= 0) continue;

      const idx = i * 2;
      this.fireworkPositions[idx] += this.fireworkVelocities[idx] * delta;
      this.fireworkPositions[idx + 1] += this.fireworkVelocities[idx + 1] * delta;

      this.fireworkVelocities[idx] *= 0.96;
      this.fireworkVelocities[idx + 1] = this.fireworkVelocities[idx + 1] * 0.96 + gravity * delta * 0.6;

      life -= delta;
      if (life <= 0) {
        this.fireworkLifeRemaining[i] = 0;
        this.fireworkIntensity[i] = 0;
        this.fireworkSizes[i] = 0;
        continue;
      }

      this.fireworkLifeRemaining[i] = life;
      const progress = life / this.fireworkLifeDuration[i];
      const eased = Math.pow(progress, 0.6);
      this.fireworkIntensity[i] = eased;
      this.fireworkSizes[i] = this.fireworkBaseSize[i] * (0.7 + eased * 0.5);
    }
  }

  private uploadFireworkBuffers(): void {
    if (!this.gl || !this.fireworkPositionBuffer || !this.fireworkColorBuffer || !this.fireworkSizeBuffer || !this.fireworkIntensityBuffer) return;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fireworkPositionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.fireworkPositions, this.gl.DYNAMIC_DRAW);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fireworkColorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.fireworkColors, this.gl.DYNAMIC_DRAW);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fireworkSizeBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.fireworkSizes, this.gl.DYNAMIC_DRAW);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fireworkIntensityBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.fireworkIntensity, this.gl.DYNAMIC_DRAW);
  }

  private updateTextTexture(width: number, height: number): void {
    if (!this.gl || width === 0 || height === 0) return;

    const title = this.config?.title ?? '';
    const subtitle = this.config?.subtitle ?? '';

    const textCanvas = document.createElement('canvas');
    textCanvas.width = width;
    textCanvas.height = height;

    const ctx = textCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = width / 2;
    const titleSize = Math.max(48, Math.min(width, height) * 0.12);
    ctx.font = `900 ${titleSize}px "Montserrat", "Roboto", system-ui`;
    const titleY = height * 0.42;
    const shadowUnit = titleSize * 0.035;
    const titleLineHeight = titleSize * 1.15;
    const titleLines = this.wrapText(ctx, title, width * 0.82);
    const titleStartY = titleLines.length > 0 ? titleY - ((titleLines.length - 1) * titleLineHeight) / 2 : titleY;
    const titleShadows: Array<{ offsetX: number; offsetY: number; alpha: number }> = [
      { offsetX: shadowUnit * 0.6, offsetY: shadowUnit * 0.7, alpha: 0.35 },
      { offsetX: shadowUnit * 1.4, offsetY: shadowUnit * 1.6, alpha: 0.22 },
      { offsetX: shadowUnit * 2.4, offsetY: shadowUnit * 2.6, alpha: 0.12 },
    ];

    for (let i = 0; i < titleLines.length; i++) {
      const lineY = titleStartY + i * titleLineHeight;
      for (const layer of titleShadows) {
        ctx.fillStyle = `rgba(0, 0, 0, ${layer.alpha})`;
        ctx.fillText(titleLines[i], centerX + layer.offsetX, lineY + layer.offsetY);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.fillText(titleLines[i], centerX, lineY);
    }

    const subtitleSize = Math.max(32, Math.min(width, height) * 0.05);
    ctx.font = `600 ${subtitleSize}px "Montserrat", "Roboto", system-ui`;
    const subtitleLineHeight = subtitleSize * 1.2;
    const subtitleLines = this.wrapText(ctx, subtitle, width * 0.86);
    const titleBottom = titleLines.length > 0 ? titleStartY + (titleLines.length - 1) * titleLineHeight + titleLineHeight / 2 : titleY;
    const subtitleCenterY = subtitleLines.length > 0 ? Math.max(height * 0.56, titleBottom + subtitleLineHeight * 0.9) : height * 0.56;
    const subtitleStartY = subtitleLines.length > 0 ? subtitleCenterY - ((subtitleLines.length - 1) * subtitleLineHeight) / 2 : subtitleCenterY;

    for (let i = 0; i < subtitleLines.length; i++) {
      ctx.fillStyle = 'rgba(20, 20, 20, 0.94)';
      ctx.fillText(subtitleLines[i], centerX, subtitleStartY + i * subtitleLineHeight);
    }

    if (!this.textTexture) {
      this.textTexture = this.gl.createTexture();
    }

    if (!this.textTexture) return;

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, textCanvas);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    if (!text.trim()) return [];

    const effectiveMaxWidth = Math.max(maxWidth, 1);
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        if (lines.length > 0) lines.push('');
        continue;
      }

      const words = trimmed.split(/\s+/);
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = `${currentLine} ${word}`;
        if (ctx.measureText(testLine).width <= effectiveMaxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }

      lines.push(currentLine);
    }

    return lines;
  }

  private drawScene(timestamp: number): void {
    if (!this.active || !this.gl || !this.canvas) return;

    const elapsed = (timestamp - this.startTime) / 1000;
    const delta = Math.min((timestamp - this.lastFrame) / 1000, 0.1);
    this.lastFrame = timestamp;

    this.updateConfetti(delta, this.canvas.width, this.canvas.height, elapsed);
    this.maybeSpawnFirework(elapsed, this.canvas.width, this.canvas.height);
    this.updateFireworks(delta, this.canvas.width, this.canvas.height);
    this.uploadConfettiPositions();
    this.uploadConfettiAngles();
    this.uploadFireworkBuffers();

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.drawBackground(elapsed);
    this.drawConfetti(elapsed, this.canvas.width, this.canvas.height);
    this.drawFireworks(this.canvas.width, this.canvas.height);
    this.drawText(elapsed);

    this.animationFrameId = requestAnimationFrame(this.renderFrame);
  }

  private drawBackground(time: number): void {
    if (!this.gl || !this.backgroundProgram || !this.backgroundBuffer || this.backgroundHandles.position === undefined) return;

    this.gl.useProgram(this.backgroundProgram);
    if (this.backgroundHandles.time) {
      this.gl.uniform1f(this.backgroundHandles.time, time);
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.backgroundBuffer);
    this.gl.enableVertexAttribArray(this.backgroundHandles.position);
    this.gl.vertexAttribPointer(this.backgroundHandles.position, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  private drawConfetti(time: number, width: number, height: number): void {
    if (!this.gl || !this.confettiProgram || !this.confettiPositionBuffer || !this.confettiColorBuffer || !this.confettiSizeBuffer) return;
    if (this.confettiHandles.position === undefined || this.confettiHandles.color === undefined || this.confettiHandles.size === undefined) return;

    this.gl.useProgram(this.confettiProgram);
    if (this.confettiHandles.resolution) {
      this.gl.uniform2f(this.confettiHandles.resolution, width, height);
    }
    if (this.confettiHandles.time) {
      this.gl.uniform1f(this.confettiHandles.time, time);
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.confettiPositionBuffer);
    this.gl.enableVertexAttribArray(this.confettiHandles.position);
    this.gl.vertexAttribPointer(this.confettiHandles.position, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.confettiColorBuffer);
    this.gl.enableVertexAttribArray(this.confettiHandles.color);
    this.gl.vertexAttribPointer(this.confettiHandles.color, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.confettiSizeBuffer);
    this.gl.enableVertexAttribArray(this.confettiHandles.size);
    this.gl.vertexAttribPointer(this.confettiHandles.size, 1, this.gl.FLOAT, false, 0, 0);

    if (this.confettiHandles.angle !== undefined && this.confettiHandles.angle >= 0 && this.confettiAngleBuffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.confettiAngleBuffer);
      this.gl.enableVertexAttribArray(this.confettiHandles.angle);
      this.gl.vertexAttribPointer(this.confettiHandles.angle, 1, this.gl.FLOAT, false, 0, 0);
    }

    if (this.confettiHandles.ratio !== undefined && this.confettiHandles.ratio >= 0 && this.confettiRatioBuffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.confettiRatioBuffer);
      this.gl.enableVertexAttribArray(this.confettiHandles.ratio);
      this.gl.vertexAttribPointer(this.confettiHandles.ratio, 1, this.gl.FLOAT, false, 0, 0);
    }

    this.gl.drawArrays(this.gl.POINTS, 0, this.confettiCount);
  }

  private drawFireworks(width: number, height: number): void {
    if (!this.gl || !this.fireworkProgram || !this.fireworkPositionBuffer || !this.fireworkColorBuffer || !this.fireworkSizeBuffer || !this.fireworkIntensityBuffer) return;
    if (this.fireworkHandles.position === undefined || this.fireworkHandles.color === undefined || this.fireworkHandles.size === undefined || this.fireworkHandles.intensity === undefined) return;

    this.gl.useProgram(this.fireworkProgram);
    if (this.fireworkHandles.resolution) {
      this.gl.uniform2f(this.fireworkHandles.resolution, width, height);
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fireworkPositionBuffer);
    this.gl.enableVertexAttribArray(this.fireworkHandles.position);
    this.gl.vertexAttribPointer(this.fireworkHandles.position, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fireworkColorBuffer);
    this.gl.enableVertexAttribArray(this.fireworkHandles.color);
    this.gl.vertexAttribPointer(this.fireworkHandles.color, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fireworkSizeBuffer);
    this.gl.enableVertexAttribArray(this.fireworkHandles.size);
    this.gl.vertexAttribPointer(this.fireworkHandles.size, 1, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fireworkIntensityBuffer);
    this.gl.enableVertexAttribArray(this.fireworkHandles.intensity);
    this.gl.vertexAttribPointer(this.fireworkHandles.intensity, 1, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.POINTS, 0, this.fireworkPoolSize);
  }

  private drawText(elapsed: number): void {
    if (!this.gl || !this.textProgram || !this.textBuffer || !this.textTexture) return;
    if (this.textHandles.position === undefined || this.textHandles.texCoord === undefined) return;

    const appear = Math.min(1, elapsed / 0.85);
    const scale = 0.85 + 0.15 * this.easeOutBack(appear) + Math.max(0, Math.sin((elapsed - 0.6) * 3.2) * 0.02);
    const opacity = Math.min(1, appear * 1.1);

    this.gl.useProgram(this.textProgram);
    if (this.textHandles.scale) {
      this.gl.uniform1f(this.textHandles.scale, scale);
    }
    if (this.textHandles.opacity) {
      this.gl.uniform1f(this.textHandles.opacity, opacity);
    }
    if (this.textHandles.texture) {
      this.gl.uniform1i(this.textHandles.texture, 0);
    }

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTexture);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textBuffer);
    this.gl.enableVertexAttribArray(this.textHandles.position);
    this.gl.vertexAttribPointer(this.textHandles.position, 2, this.gl.FLOAT, false, 16, 0);

    this.gl.enableVertexAttribArray(this.textHandles.texCoord);
    this.gl.vertexAttribPointer(this.textHandles.texCoord, 2, this.gl.FLOAT, false, 16, 8);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
