"use client";

import { useEffect, useRef, type ComponentType } from "react";

/*
 * RemoTap card designs. Each design is a tiny WebGL fragment shader in the
 * brand colours (#8C52FF purple, #3776FF blue, #00000E ink) plus a CSS
 * gradient that is shown while WebGL starts, when it is unavailable, and in
 * small thumbnails where a live canvas would be wasteful.
 */

const HEADER = /* glsl */ `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
const vec3 PURPLE = vec3(0.549, 0.322, 1.0);
const vec3 BLUE = vec3(0.216, 0.463, 1.0);
const vec3 INK = vec3(0.0, 0.0, 0.055);
const vec3 CYAN = vec3(0.184, 0.839, 0.961);
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
`;

export type CardDesign = {
  id: string;
  name: { en: string; ar: string };
  css: string;
  frag: string;
};

export const CARD_DESIGNS: CardDesign[] = [
  {
    id: "midnight",
    name: { en: "Midnight", ar: "ميدنايت" },
    css: "radial-gradient(120% 90% at 85% 10%, rgba(140,82,255,.45), transparent 55%), radial-gradient(90% 80% at 10% 100%, rgba(55,118,255,.35), transparent 60%), #05050f",
    frag: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * 0.12;
  float n = fbm(uv * 2.2 + vec2(t, -t * 0.6));
  vec3 col = INK + vec3(0.02, 0.02, 0.04);
  float glowA = smoothstep(0.75, 0.0, distance(uv, vec2(0.88 + 0.05 * sin(t * 3.0), 0.9)));
  float glowB = smoothstep(0.8, 0.0, distance(uv, vec2(0.08, 0.05 + 0.05 * cos(t * 2.0))));
  col += PURPLE * glowA * (0.35 + 0.25 * n);
  col += BLUE * glowB * (0.3 + 0.2 * n);
  float sheen = smoothstep(0.02, 0.0, abs(uv.x + uv.y * 0.6 - fract(t * 0.5) * 2.4 + 0.4)) * 0.18;
  col += sheen;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "aurora",
    name: { en: "Aurora", ar: "أورورا" },
    css: "linear-gradient(135deg, #1a0b3d 0%, #8C52FF 45%, #3776FF 80%, #0a1a4a 100%)",
    frag: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * 0.25;
  float w = sin(uv.x * 4.0 + t + fbm(uv * 3.0 + t * 0.3) * 3.0) * 0.5 + 0.5;
  float w2 = sin(uv.x * 7.0 - t * 1.3 + uv.y * 3.0) * 0.5 + 0.5;
  vec3 col = mix(INK, PURPLE, smoothstep(0.2, 0.9, w * (1.0 - uv.y * 0.4)));
  col = mix(col, BLUE, smoothstep(0.4, 1.0, w2 * uv.y));
  col += CYAN * 0.12 * smoothstep(0.85, 1.0, w * w2);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "pulse",
    name: { en: "Pulse", ar: "بلس" },
    css: "repeating-radial-gradient(circle at 20% 50%, rgba(140,82,255,.55) 0 2px, transparent 3px 18px), radial-gradient(circle at 20% 50%, #3776FF33, #05050f 70%)",
    frag: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - vec2(u_res.x * 0.22, u_res.y * 0.5)) / u_res.y;
  float d = length(p);
  float rings = sin(d * 28.0 - u_time * 3.0);
  float ring = smoothstep(0.92, 1.0, rings) * smoothstep(1.4, 0.0, d);
  vec3 col = INK + vec3(0.015, 0.01, 0.04);
  col += mix(PURPLE, BLUE, clamp(d, 0.0, 1.0)) * ring * 0.9;
  col += PURPLE * 0.25 * smoothstep(0.35, 0.0, d);
  col += BLUE * 0.12 * uv.x;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "mesh",
    name: { en: "Mesh", ar: "ميش" },
    css: "radial-gradient(at 20% 20%, #8C52FF, transparent 50%), radial-gradient(at 80% 30%, #3776FF, transparent 50%), radial-gradient(at 50% 90%, #2FD6F5, transparent 55%), #140a33",
    frag: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * 0.35;
  vec2 a = vec2(0.25 + 0.2 * sin(t), 0.3 + 0.2 * cos(t * 0.8));
  vec2 b = vec2(0.75 + 0.2 * cos(t * 0.7), 0.35 + 0.25 * sin(t * 1.1));
  vec2 c = vec2(0.5 + 0.3 * sin(t * 0.5), 0.85 + 0.1 * cos(t));
  float wa = 1.0 / (0.02 + pow(distance(uv, a), 2.0));
  float wb = 1.0 / (0.02 + pow(distance(uv, b), 2.0));
  float wc = 1.0 / (0.03 + pow(distance(uv, c), 2.0));
  vec3 col = (PURPLE * wa + BLUE * wb + CYAN * 0.8 * wc) / (wa + wb + wc);
  col *= 0.85 + 0.15 * fbm(uv * 6.0 + t);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "holo",
    name: { en: "Holo", ar: "هولو" },
    css: "linear-gradient(115deg, #c9b8ff 0%, #8C52FF 25%, #2FD6F5 50%, #3776FF 70%, #f0d9ff 100%)",
    frag: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * 0.3;
  float band = uv.x * 1.6 + uv.y * 0.9 + fbm(uv * 4.0 + t * 0.2) * 0.6 + t;
  vec3 col = 0.55 + 0.45 * cos(6.2831 * (band + vec3(0.0, 0.18, 0.36)));
  col = mix(col, mix(PURPLE, BLUE, uv.x), 0.45);
  col += 0.25 * smoothstep(0.97, 1.0, sin(band * 12.0));
  gl_FragColor = vec4(col * 0.95, 1.0);
}`,
  },
  {
    id: "grid",
    name: { en: "Circuit", ar: "سيركت" },
    css: "linear-gradient(rgba(55,118,255,.25) 1px, transparent 1px) 0 0/18px 18px, linear-gradient(90deg, rgba(140,82,255,.25) 1px, transparent 1px) 0 0/18px 18px, #04040d",
    frag: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 g = gl_FragCoord.xy / (u_res.y / 9.0);
  vec2 f = abs(fract(g) - 0.5);
  float line = smoothstep(0.47, 0.5, max(f.x, f.y));
  float scan = smoothstep(0.18, 0.0, abs(uv.x - fract(u_time * 0.18) * 1.4 + 0.2));
  float dots = step(0.93, hash(floor(g))) * (0.5 + 0.5 * sin(u_time * 2.0 + hash(floor(g)) * 20.0));
  vec3 col = INK;
  col += mix(PURPLE, BLUE, uv.y) * line * (0.25 + scan * 0.9);
  col += CYAN * dots * 0.35 * (1.0 - line);
  col += PURPLE * 0.1 * scan;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "liquid",
    name: { en: "Liquid", ar: "ليكويد" },
    css: "conic-gradient(from 200deg at 40% 60%, #3776FF, #8C52FF, #1b0f45, #3776FF)",
    frag: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res.y;
  float t = u_time * 0.15;
  vec2 q = vec2(fbm(uv * 2.0 + t), fbm(uv * 2.0 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(uv * 2.0 + 4.0 * q + vec2(1.7, 9.2) + t), fbm(uv * 2.0 + 4.0 * q + vec2(8.3, 2.8)));
  float f = fbm(uv * 2.0 + 4.0 * r);
  vec3 col = mix(INK, PURPLE, clamp(f * f * 2.2, 0.0, 1.0));
  col = mix(col, BLUE, clamp(length(q) * 0.7, 0.0, 1.0));
  col = mix(col, vec3(0.9, 0.85, 1.0), smoothstep(0.75, 1.0, r.x) * 0.35);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "nebula",
    name: { en: "Nebula", ar: "نيبولا" },
    css: "radial-gradient(circle at 30% 40%, rgba(140,82,255,.7), transparent 45%), radial-gradient(circle at 75% 65%, rgba(55,118,255,.6), transparent 45%), #02020a",
    frag: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * 0.05;
  float n = fbm(uv * 3.0 + vec2(t, t * 0.4));
  float n2 = fbm(uv * 5.0 - vec2(t * 0.7, t));
  vec3 col = INK;
  col += PURPLE * smoothstep(0.45, 0.85, n) * 0.9;
  col += BLUE * smoothstep(0.5, 0.9, n2) * 0.7;
  vec2 sp = floor(gl_FragCoord.xy / 2.0);
  float star = step(0.996, hash(sp)) * (0.6 + 0.4 * sin(u_time * 3.0 + hash(sp + 3.0) * 30.0));
  col += star;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "chrome",
    name: { en: "Chrome", ar: "كروم" },
    css: "linear-gradient(160deg, #e8e8f5 0%, #8a8aa6 30%, #f5f5ff 48%, #5b5b78 70%, #c9c9e0 100%)",
    frag: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * 0.2;
  float bands = sin((uv.y * 3.0 + uv.x * 1.2 + t) * 3.1416 + fbm(uv * 3.0) * 1.5);
  float brushed = noise(vec2(uv.x * 400.0, uv.y * 3.0)) * 0.06;
  vec3 steel = vec3(0.55, 0.56, 0.66) + 0.4 * bands + brushed;
  steel = mix(steel, steel * mix(PURPLE, BLUE, uv.x) * 1.6, 0.18);
  gl_FragColor = vec4(clamp(steel, 0.0, 1.0), 1.0);
}`,
  },
];

const VERT = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/** Full-bleed animated shader. Pauses when off screen; one still frame when reduced motion is on. */
export function ShaderCanvas({ design }: { design: CardDesign }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) return;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, HEADER + design.frag);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const start = performance.now() - Math.random() * 20000;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };
    const draw = () => {
      size();
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.style.opacity = "1";
    };
    const loop = () => {
      draw();
      if (visible && !reduce) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) loop();
    });
    io.observe(canvas);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [design]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500"
    />
  );
}

/** Same shape as the original component's SHADERS_MAP: one component per design. */
export const SHADERS_MAP: ComponentType[] = CARD_DESIGNS.map((d) => {
  function Shader() {
    return (
      <div className="absolute inset-0" style={{ background: d.css }}>
        <ShaderCanvas design={d} />
      </div>
    );
  }
  Shader.displayName = `Shader_${d.id}`;
  return Shader;
});
