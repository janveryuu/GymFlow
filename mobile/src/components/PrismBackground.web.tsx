import React, { useEffect, useRef } from 'react';

export interface PrismProps {
  height?: number;
  baseWidth?: number;
  animationType?: 'rotate' | 'hover' | '3drotate';
  glow?: number;
  offset?: { x?: number; y?: number };
  noise?: number;
  transparent?: boolean;
  scale?: number;
  hueShift?: number;
  colorFrequency?: number;
  hoverStrength?: number;
  inertia?: number;
  bloom?: number;
  suspendWhenOffscreen?: boolean;
  timeScale?: number;
  lightMode?: boolean;
  tintColor?: string;
  gradientColor?: string;
  style?: React.CSSProperties | any;
}

const vertex = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragment = `
  precision highp float;

  uniform vec2  iResolution;
  uniform float iTime;

  uniform float uHeight;
  uniform float uBaseHalf;
  uniform mat3  uRot;
  uniform int   uUseBaseWobble;
  uniform float uGlow;
  uniform vec2  uOffsetPx;
  uniform float uNoise;
  uniform float uSaturation;
  uniform float uScale;
  uniform float uHueShift;
  uniform float uColorFreq;
  uniform float uBloom;
  uniform float uCenterShift;
  uniform float uInvBaseHalf;
  uniform float uInvHeight;
  uniform float uMinAxis;
  uniform float uPxScale;
  uniform float uTimeScale;
  uniform float uLightMode;
  uniform vec3  uTintColor;
  uniform vec3  uGradientColor;
  uniform int   uUseTint;
  uniform int   uUseGradient;

  vec4 tanh4(vec4 x){
    vec4 e2x = exp(2.0*x);
    return (e2x - 1.0) / (e2x + 1.0);
  }

  float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float sdOctaAnisoInv(vec3 p){
    vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
    float m = q.x + q.y + q.z - 1.0;
    return m * uMinAxis * 0.5773502691896258;
  }

  float sdPyramidUpInv(vec3 p){
    float oct = sdOctaAnisoInv(p);
    float halfSpace = -p.y;
    return max(oct, halfSpace);
  }

  mat3 hueRotation(float a){
    float c = cos(a), s = sin(a);
    mat3 W = mat3(
      0.299, 0.587, 0.114,
      0.299, 0.587, 0.114,
      0.299, 0.587, 0.114
    );
    mat3 U = mat3(
       0.701, -0.587, -0.114,
      -0.299,  0.413, -0.114,
      -0.300, -0.588,  0.886
    );
    mat3 V = mat3(
       0.168, -0.331,  0.500,
       0.328,  0.035, -0.500,
      -0.497,  0.296,  0.201
    );
    return W + U * c + V * s;
  }

  void main(){
    vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;

    float z = 5.0;
    float d = 0.0;

    vec3 p;
    vec4 o = vec4(0.0);

    float centerShift = uCenterShift;
    float cf = uColorFreq;

    mat2 wob = mat2(1.0);
    if (uUseBaseWobble == 1) {
      float t = iTime * uTimeScale;
      float c0 = cos(t + 0.0);
      float c1 = cos(t + 33.0);
      float c2 = cos(t + 11.0);
      wob = mat2(c0, c1, c2, c0);
    }

    const int STEPS = 100;
    for (int i = 0; i < STEPS; i++) {
      p = vec3(f, z);
      p.xz = p.xz * wob;
      p = uRot * p;
      vec3 q = p;
      q.y += centerShift;
      d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
      z -= d;
      o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
    }

    o = tanh4(o * o * (uGlow * uBloom) / 1e5);

    vec3 col = o.rgb;
    float n = rand(gl_FragCoord.xy + vec2(iTime));
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);

    float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);

    if (uUseTint == 1) {
      float intensity = dot(col, vec3(0.299, 0.587, 0.114));

      if (uUseGradient == 1) {
        // Extract chromatic phase from raymarched wave fields
        float dx = 2.0 * col.r - col.g - col.b;
        float dy = 1.7320508 * (col.g - col.b);
        float len = sqrt(dx * dx + dy * dy);
        float band = (len > 0.001) ? (0.5 + 0.5 * (dx / len)) : 0.5;

        // Harmonious gradient interpolation between electric cyan and crisp white
        vec3 facetColor = mix(uTintColor, uGradientColor, band);

        // Depth shaping with deep cyan tone in shadows
        vec3 deepTone = uTintColor * 0.55;
        vec3 surface = mix(deepTone, facetColor, smoothstep(0.04, 0.45, intensity));
        vec3 lit = surface * pow(intensity, 0.82) * 1.65;

        // Specular caustic reflections bloom into radiant white
        float spec = pow(clamp(intensity, 0.0, 1.0), 1.9);
        col = clamp(mix(lit, uGradientColor, spec * 0.65), 0.0, 1.0);
      } else {
        vec3 deepTone = uTintColor * 0.65;
        vec3 tinted = mix(deepTone, uTintColor, smoothstep(0.05, 0.65, intensity)) * pow(intensity, 0.85) * 1.65;
        float spec = pow(clamp(intensity, 0.0, 1.0), 2.2);
        vec3 specularColor = mix(uTintColor, vec3(0.85, 0.98, 1.0), 0.75);
        col = clamp(mix(tinted, specularColor, spec * 0.45), 0.0, 1.0);
      }
      col *= smoothstep(0.005, 0.1, o.a);
    } else {
      if(abs(uHueShift) > 0.0001){
        col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
      }
    }

    if (uLightMode > 0.5) {
      float peak = max(col.r, max(col.g, col.b));
      vec3 chroma = pow(clamp(col / max(peak, 0.0001), 0.0, 1.0), vec3(1.14));
      gl_FragColor = vec4(mix(vec3(1.0), chroma, o.a * 0.94), 1.0);
    } else {
      gl_FragColor = vec4(col, o.a);
    }
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[Prism] Shader compilation error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

const setMat3FromEuler = (
  yawY: number,
  pitchX: number,
  rollZ: number,
  out: Float32Array
): Float32Array => {
  const cy = Math.cos(yawY), sy = Math.sin(yawY);
  const cx = Math.cos(pitchX), sx = Math.sin(pitchX);
  const cz = Math.cos(rollZ), sz = Math.sin(rollZ);

  out[0] = cy * cz + sy * sx * sz;
  out[1] = cx * sz;
  out[2] = -sy * cz + cy * sx * sz;
  out[3] = -cy * sz + sy * sx * cz;
  out[4] = cx * cz;
  out[5] = sy * sz + cy * sx * cz;
  out[6] = sy * cx;
  out[7] = -sx;
  out[8] = cy * cx;
  return out;
};

function parseColorToRgb(colorStr?: string): [number, number, number] | null {
  if (!colorStr) return null;
  const c = colorStr.trim();
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(ch => ch + ch).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      return [r, g, b];
    }
  }
  const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    return [
      parseInt(rgbMatch[1], 10) / 255,
      parseInt(rgbMatch[2], 10) / 255,
      parseInt(rgbMatch[3], 10) / 255,
    ];
  }
  return null;
}

export const PrismBackground: React.FC<PrismProps> = ({
  height = 3.5,
  baseWidth = 5.5,
  animationType = 'rotate',
  glow = 1,
  offset = { x: 0, y: 0 },
  noise = 0.5,
  transparent = true,
  scale = 1.8,
  hueShift = 0,
  colorFrequency = 1,
  hoverStrength = 2,
  inertia = 0.05,
  bloom = 1,
  suspendWhenOffscreen = false,
  timeScale = 0.5,
  lightMode = false,
  tintColor,
  gradientColor,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tintRgb = parseColorToRgb(tintColor);
    const gradientRgb = parseColorToRgb(gradientColor);

    const H = Math.max(0.001, height);
    const BW = Math.max(0.001, baseWidth);
    const BASE_HALF = BW * 0.5;
    const GLOW = Math.max(0.0, glow);
    const NOISE = Math.max(0.0, noise);
    const offX = offset?.x ?? 0;
    const offY = offset?.y ?? 0;
    const SAT = transparent ? 1.5 : 1;
    const SCALE = Math.max(0.001, scale);
    const HUE = hueShift || 0;
    const CFREQ = Math.max(0.0, colorFrequency || 1);
    const BLOOM = Math.max(0.0, bloom || 1);
    const RSX = 1;
    const RSY = 1;
    const RSZ = 1;
    const TS = Math.max(0, timeScale || 1);
    const HOVSTR = Math.max(0, hoverStrength || 1);
    const INERT = Math.max(0, Math.min(1, inertia || 0.12));

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      pointerEvents: 'none',
    });
    container.appendChild(canvas);

    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const gl =
      canvas.getContext('webgl2', { alpha: transparent, antialias: false }) ||
      canvas.getContext('webgl', { alpha: transparent, antialias: false });

    if (!gl) {
      console.warn('[Prism] WebGL is not supported on this browser.');
      return;
    }

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    const vs = createShader(gl, gl.VERTEX_SHADER, vertex);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[Prism] Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const locs = {
      iResolution: gl.getUniformLocation(program, 'iResolution'),
      iTime: gl.getUniformLocation(program, 'iTime'),
      uHeight: gl.getUniformLocation(program, 'uHeight'),
      uBaseHalf: gl.getUniformLocation(program, 'uBaseHalf'),
      uUseBaseWobble: gl.getUniformLocation(program, 'uUseBaseWobble'),
      uRot: gl.getUniformLocation(program, 'uRot'),
      uGlow: gl.getUniformLocation(program, 'uGlow'),
      uOffsetPx: gl.getUniformLocation(program, 'uOffsetPx'),
      uNoise: gl.getUniformLocation(program, 'uNoise'),
      uSaturation: gl.getUniformLocation(program, 'uSaturation'),
      uScale: gl.getUniformLocation(program, 'uScale'),
      uHueShift: gl.getUniformLocation(program, 'uHueShift'),
      uColorFreq: gl.getUniformLocation(program, 'uColorFreq'),
      uBloom: gl.getUniformLocation(program, 'uBloom'),
      uCenterShift: gl.getUniformLocation(program, 'uCenterShift'),
      uInvBaseHalf: gl.getUniformLocation(program, 'uInvBaseHalf'),
      uInvHeight: gl.getUniformLocation(program, 'uInvHeight'),
      uMinAxis: gl.getUniformLocation(program, 'uMinAxis'),
      uPxScale: gl.getUniformLocation(program, 'uPxScale'),
      uTimeScale: gl.getUniformLocation(program, 'uTimeScale'),
      uLightMode: gl.getUniformLocation(program, 'uLightMode'),
      uTintColor: gl.getUniformLocation(program, 'uTintColor'),
      uGradientColor: gl.getUniformLocation(program, 'uGradientColor'),
      uUseTint: gl.getUniformLocation(program, 'uUseTint'),
      uUseGradient: gl.getUniformLocation(program, 'uUseGradient'),
    };

    // Full-screen triangle
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    let drawingWidth = 1;
    let drawingHeight = 1;

    const resize = () => {
      const w = Math.max(1, Math.floor((container.clientWidth || 1) * dpr));
      const h = Math.max(1, Math.floor((container.clientHeight || 1) * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      drawingWidth = w;
      drawingHeight = h;
      gl.viewport(0, 0, w, h);
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(container);
    }
    resize();

    const rotBuf = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const NOISE_IS_ZERO = NOISE < 1e-6;
    let raf = 0;
    const t0 = performance.now();

    const startRAF = () => {
      if (raf) return;
      raf = requestAnimationFrame(render);
    };
    const stopRAF = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const rnd = () => Math.random();
    const wX = (0.3 + rnd() * 0.6) * RSX;
    const wY = (0.2 + rnd() * 0.7) * RSY;
    const wZ = (0.1 + rnd() * 0.5) * RSZ;
    const phX = rnd() * Math.PI * 2;
    const phZ = rnd() * Math.PI * 2;

    let yaw = 0, pitch = 0, roll = 0;
    let targetYaw = 0, targetPitch = 0;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const pointer = { x: 0, y: 0, inside: true };
    const onMove = (e: MouseEvent | PointerEvent) => {
      const ww = Math.max(1, window.innerWidth);
      const wh = Math.max(1, window.innerHeight);
      const cx = ww * 0.5;
      const cy = wh * 0.5;
      const nx = (e.clientX - cx) / (ww * 0.5);
      const ny = (e.clientY - cy) / (wh * 0.5);
      pointer.x = Math.max(-1, Math.min(1, nx));
      pointer.y = Math.max(-1, Math.min(1, ny));
      pointer.inside = true;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    const onBlur = () => {
      pointer.inside = false;
    };

    let onPointerMove: ((e: PointerEvent) => void) | null = null;
    let useBaseWobble = 1;

    if (animationType === 'hover') {
      onPointerMove = (e: PointerEvent) => {
        onMove(e);
        startRAF();
      };
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('mouseleave', onLeave);
      window.addEventListener('blur', onBlur);
      useBaseWobble = 0;
    } else if (animationType === '3drotate') {
      useBaseWobble = 0;
    } else {
      useBaseWobble = 1;
    }

    const render = (t: number) => {
      const time = (t - t0) * 0.001;
      let continueRAF = true;

      if (animationType === 'hover') {
        const maxPitch = 0.6 * HOVSTR;
        const maxYaw = 0.6 * HOVSTR;
        targetYaw = (pointer.inside ? -pointer.x : 0) * maxYaw;
        targetPitch = (pointer.inside ? pointer.y : 0) * maxPitch;
        const prevYaw = yaw;
        const prevPitch = pitch;
        const prevRoll = roll;
        yaw = lerp(prevYaw, targetYaw, INERT);
        pitch = lerp(prevPitch, targetPitch, INERT);
        roll = lerp(prevRoll, 0, 0.1);
        setMat3FromEuler(yaw, pitch, roll, rotBuf);

        if (NOISE_IS_ZERO) {
          const settled =
            Math.abs(yaw - targetYaw) < 1e-4 &&
            Math.abs(pitch - targetPitch) < 1e-4 &&
            Math.abs(roll) < 1e-4;
          if (settled) continueRAF = false;
        }
      } else if (animationType === '3drotate') {
        const tScaled = time * TS;
        yaw = tScaled * wY;
        pitch = Math.sin(tScaled * wX + phX) * 0.6;
        roll = Math.sin(tScaled * wZ + phZ) * 0.5;
        setMat3FromEuler(yaw, pitch, roll, rotBuf);
        if (TS < 1e-6) continueRAF = false;
      } else {
        rotBuf[0] = 1; rotBuf[1] = 0; rotBuf[2] = 0;
        rotBuf[3] = 0; rotBuf[4] = 1; rotBuf[5] = 0;
        rotBuf[6] = 0; rotBuf[7] = 0; rotBuf[8] = 1;
        if (TS < 1e-6) continueRAF = false;
      }

      gl.useProgram(program);

      gl.uniform2f(locs.iResolution, drawingWidth, drawingHeight);
      gl.uniform1f(locs.iTime, time);
      gl.uniform1f(locs.uHeight, H);
      gl.uniform1f(locs.uBaseHalf, BASE_HALF);
      gl.uniform1i(locs.uUseBaseWobble, useBaseWobble);
      gl.uniformMatrix3fv(locs.uRot, false, rotBuf);
      gl.uniform1f(locs.uGlow, GLOW);
      gl.uniform2f(locs.uOffsetPx, offX * dpr, offY * dpr);
      gl.uniform1f(locs.uNoise, NOISE);
      gl.uniform1f(locs.uSaturation, SAT);
      gl.uniform1f(locs.uScale, SCALE);
      gl.uniform1f(locs.uHueShift, HUE);
      gl.uniform1f(locs.uColorFreq, CFREQ);
      gl.uniform1f(locs.uBloom, BLOOM);
      gl.uniform1f(locs.uCenterShift, H * 0.25);
      gl.uniform1f(locs.uInvBaseHalf, 1 / BASE_HALF);
      gl.uniform1f(locs.uInvHeight, 1 / H);
      gl.uniform1f(locs.uMinAxis, Math.min(BASE_HALF, H));
      gl.uniform1f(locs.uPxScale, 1 / ((drawingHeight || 1) * 0.1 * SCALE));
      gl.uniform1f(locs.uTimeScale, TS);
      gl.uniform1f(locs.uLightMode, lightMode ? 1.0 : 0.0);
      if (tintRgb) {
        gl.uniform1i(locs.uUseTint, 1);
        gl.uniform3f(locs.uTintColor, tintRgb[0], tintRgb[1], tintRgb[2]);
        if (gradientRgb) {
          gl.uniform1i(locs.uUseGradient, 1);
          gl.uniform3f(locs.uGradientColor, gradientRgb[0], gradientRgb[1], gradientRgb[2]);
        } else {
          gl.uniform1i(locs.uUseGradient, 0);
          gl.uniform3f(locs.uGradientColor, 1.0, 1.0, 1.0);
        }
      } else {
        gl.uniform1i(locs.uUseTint, 0);
        gl.uniform1i(locs.uUseGradient, 0);
        gl.uniform3f(locs.uTintColor, 1.0, 1.0, 1.0);
        gl.uniform3f(locs.uGradientColor, 1.0, 1.0, 1.0);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (continueRAF) {
        raf = requestAnimationFrame(render);
      } else {
        raf = 0;
      }
    };

    let io: IntersectionObserver | null = null;
    if (suspendWhenOffscreen && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(entries => {
        const vis = entries.some(e => e.isIntersecting);
        if (vis) startRAF();
        else stopRAF();
      });
      io.observe(container);
    } else {
      startRAF();
    }

    return () => {
      stopRAF();
      ro?.disconnect();
      io?.disconnect();
      if (animationType === 'hover') {
        if (onPointerMove) window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('mouseleave', onLeave);
        window.removeEventListener('blur', onBlur);
      }
      try {
        container.removeChild(canvas);
      } catch {}
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [
    height,
    baseWidth,
    animationType,
    glow,
    noise,
    offset?.x,
    offset?.y,
    scale,
    transparent,
    hueShift,
    colorFrequency,
    timeScale,
    hoverStrength,
    inertia,
    bloom,
    suspendWhenOffscreen,
    lightMode,
    tintColor,
    gradientColor,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
    />
  );
};

export default PrismBackground;
