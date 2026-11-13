// Transición de tinta: la tinta cubre la pantalla, se cambia lo de debajo (salto de sala) y se retira.
// Dos modos (un solo pase de pantalla completa, ~1,5 s, y nada al terminar):
// - 'mancha': una gota que se expande con dedos de capilaridad entre las fibras, salpicaduras por
//   delante del frente y un secado que avanza desde el borde de la mancha hacia el origen, con el
//   anillo oscuro que deja la tinta al secarse.
// - 'pincelada': una pincelada ancha que barre la pantalla desde el lado del origen, con vetas de
//   cerdas; al retirarse se seca en kasure, primero por la cola.
const FRAGMENTO = `precision highp float;
uniform vec2 R, O; uniform float P, Q, M, S, D, X;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p), u = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+1.), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.03; a *= .5; } return v; }
const vec3 TINTA = vec3(.055, .05, .045);

float mancha(vec2 p){
  float d = length(p), ang = atan(p.y, p.x);
  float frente = P * (D + .75);
  float borde = fbm(p * 3. + S) * .5 + fbm(vec2(ang * 9., d * 5.)) * .12;
  float dedos = pow(n(vec2(ang * 26. + S, .5)), 5.) * .22 + pow(n(vec2(ang * 63. + S * 2., 3.)), 8.) * .14;
  float f = d - frente + (borde - dedos * smoothstep(.0, .25, P)) * min(1., P * 3.);
  float tinta = 1. - smoothstep(-.003, .003, f);
  // Salpicaduras: gotitas sueltas por delante del frente
  vec2 cel = p * 13.; vec2 id = floor(cel); vec2 fr = fract(cel) - .5;
  vec2 c = (vec2(h(id + 3.1 + S), h(id + 7.7)) - .5) * .5;
  float r = .05 + .14 * h(id + 11.);
  float gotita = step(.84, h(id + S)) * (1. - smoothstep(r - .04, r, length(fr - c)));
  gotita *= step(length((id + .5 + c) / 13.), frente + .32) * step(.04, P);
  tinta = max(tinta, gotita);
  // Tono: el frente húmedo y el centro encharcados; grano de papel
  float aro = smoothstep(.06, 0., -f) * .1;
  float a = tinta * (.9 + aro + .1 * smoothstep(.5, 0., d) + .06 * fbm(p * 42.));
  // Secado: desde el borde de la mancha (lejos del origen) hacia dentro, por zonas
  float umbral = (D - d) + fbm(p * 4. + 7.) * .5 - .25;
  float s = Q * (D + .55);
  float seca = smoothstep(umbral - .05, umbral + .02, s);
  float anillo = smoothstep(.08, 0., abs(s - umbral + .08)) * step(.001, Q);
  a = (a + anillo * .1) * (1. - seca) * (1. - .3 * smoothstep(umbral - .4, umbral, s));
  return a;
}

float pincelada(vec2 uv){
  float W = R.x / R.y;
  float xa = uv.x * W;
  float u = (X > 0. ? xa : W - xa) + .4;
  float v = uv.y - mix(O.y, .5, .65);
  float cabeza = P * (W + .95);
  // Ancho: el pincel se aplasta al entrar y la tinta se abre hasta cubrir al final del barrido
  float medio = .42 + .12 * smoothstep(0., .6, u) + .85 * smoothstep(.55, 1., P);
  float flecos = .05 * fbm(vec2(u * 3. + S, v > 0. ? 1. : 5.)) + .06 * pow(n(vec2(u * .9, abs(v) * 45.)), 3.);
  float dentro = 1. - smoothstep(-.004, .004, abs(v) - medio + flecos);
  float vv = v / medio;
  float punta = cabeza - .14 * vv * vv - .07 * n(vec2(v * 26., S));
  dentro *= 1. - smoothstep(-.004, .004, u - punta);
  // Vetas de cerdas a lo largo del trazo; más secas cerca de los bordes
  float veta = n(vec2(u * .55 + S, v * 62.));
  float hueco = smoothstep(.72, .9, veta) * smoothstep(.55, 1., abs(vv)) * (1. - smoothstep(.5, 1., P));
  float tono = .9 + .1 * n(vec2(u * 1.3, v * 30.)) + .06 * fbm(uv * 60.);
  float a = dentro * tono * (1. - hueco);
  // Retirada en kasure: las vetas flojas se van primero, y la cola antes que la cabeza
  float uu = clamp(u / (W + .4), 0., 1.);
  float k = veta * .6 + fbm(uv * vec2(2., 9.) + S) * .3;
  float seca = smoothstep(-.03, .03, Q * 1.55 - (k + .6 * uu));
  return a * (1. - seca);
}

void main(){
  vec2 uv = gl_FragCoord.xy / R, p = (uv - O) * vec2(R.x / R.y, 1.);
  float a = M > .5 ? pincelada(uv) : mancha(p);
  gl_FragColor = vec4(TINTA, clamp(a, 0., 1.));
}`;

/**
 * Cubre la pantalla de tinta, llama a alCubrir() cuando está cubierta y se retira.
 * opciones: origen [x, y] (0–1 de la ventana), ms (duración), modo 'mancha' | 'pincelada'.
 */
export function transicionTinta(alCubrir, { origen = [0.5, 0.5], ms = 1400, modo = 'mancha' } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { alCubrir?.(); return Promise.resolve(); }
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
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { lienzo.remove(); alCubrir?.(); return Promise.resolve(); }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const U = (k) => gl.getUniformLocation(prog, k);
  const aspecto = lienzo.width / lienzo.height;
  const [ox, oy] = [origen[0], 1 - origen[1]];
  // Distancia del origen a la esquina más lejana (en unidades de alto): hasta ahí llega la mancha
  const lejos = Math.max(...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => Math.hypot((x - ox) * aspecto, y - oy)));
  const pincel = modo === 'pincelada';
  gl.uniform2f(U('R'), lienzo.width, lienzo.height);
  gl.uniform2f(U('O'), ox, oy);
  gl.uniform1f(U('M'), pincel ? 1 : 0);
  gl.uniform1f(U('S'), Math.random() * 50);
  gl.uniform1f(U('D'), lejos);
  gl.uniform1f(U('X'), ox <= 0.5 ? 1 : -1);
  // La mancha se expande rápido y frena; la pincelada acelera y frena como un brazo.
  const facil = pincel ? (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) : (t) => 1 - Math.pow(1 - t, 3);
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
