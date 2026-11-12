// Transición de tinta: una mancha con borde orgánico cubre la pantalla, se cambia lo de debajo
// (salto de sala) y la tinta se retira secándose por zonas. Un pase de pantalla completa, ~1,5 s.
const FRAGMENTO = `precision highp float;
uniform vec2 R, O; uniform float P, Q;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p), u = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+1.), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.03; a *= .5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / R, p = (uv - O) * vec2(R.x / R.y, 1.);
  float d = length(p), ang = atan(p.y, p.x);
  float borde = fbm(p * 3.) * .5 + fbm(vec2(ang * 9., d * 5.)) * .12;
  float f = d - P * 2.2 + borde * min(1., P * 3.);
  float tinta = 1. - smoothstep(-.003, .003, f);
  float aro = smoothstep(.05, 0., -f) * .14;
  float seca = smoothstep(Q - .06, Q, fbm(p * 5. + 7.));
  float a = tinta * (.88 + aro + .06 * fbm(p * 40.)) * seca;
  gl_FragColor = vec4(vec3(.06, .055, .05), a);
}`;

export function transicionTinta(alCubrir, { origen = [0.5, 0.5], ms = 1400 } = {}) {
  const lienzo = document.createElement('canvas');
  lienzo.setAttribute('aria-hidden', 'true');
  lienzo.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none';
  document.body.append(lienzo);
  const d = Math.min(devicePixelRatio, 1.5);
  lienzo.width = innerWidth * d; lienzo.height = innerHeight * d;
  const gl = lienzo.getContext('webgl', { premultipliedAlpha: false });
  if (!gl) { lienzo.remove(); alCubrir?.(); return Promise.resolve(); }
  const sombreador = (tipo, fuente) => { const s = gl.createShader(tipo); gl.shaderSource(s, fuente); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sombreador(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0, 1); }'));
  gl.attachShader(prog, sombreador(gl.FRAGMENT_SHADER, FRAGMENTO));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const U = (k) => gl.getUniformLocation(prog, k);
  gl.uniform2f(U('R'), lienzo.width, lienzo.height);
  gl.uniform2f(U('O'), origen[0], 1 - origen[1]);
  const facil = (t) => 1 - Math.pow(1 - t, 3);
  let t0 = null; let cubierto = false;
  return new Promise((resolver) => {
    const cuadro = (ahora) => {
      t0 ??= ahora;
      const t = (ahora - t0) / ms;
      const p = facil(Math.min(1, t * 1.6));
      const q = Math.max(0, (t - 0.7) / 0.3) * 1.1;
      if (p >= 1 && !cubierto) { cubierto = true; alCubrir?.(); }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U('P'), p); gl.uniform1f(U('Q'), q);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (t < 1.7) requestAnimationFrame(cuadro);
      else { lienzo.remove(); gl.getExtension('WEBGL_lose_context')?.loseContext(); resolver(); }
    };
    requestAnimationFrame(cuadro);
  });
}
