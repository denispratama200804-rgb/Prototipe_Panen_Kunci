import './style.css';

(function() {
  const canvas = document.getElementById('shader-canvas-ANIMATION_26');

  // Sync the WebGL drawing-buffer size with the CSS-driven layout size.
  // This fires on initial layout and whenever the element is resized.
  function syncSize() {
    const w = canvas.clientWidth  || 1280;
    const h = canvas.clientHeight || 720;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
    }
  }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncSize).observe(canvas);
  }
  syncSize();

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;
  const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
  const fs = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// Kie Catcher Color Palette derived from Design System
// Navy: #00288e -> vec3(0.0, 0.157, 0.557)
// Emerald: #006c49 -> vec3(0.0, 0.424, 0.286)
// Light Surface: #f8f9ff -> vec3(0.973, 0.976, 1.0)

void main() {
    vec2 uv = v_texCoord;
    vec2 mouse = u_mouse / u_resolution;
    
    // Create multiple sine waves for liquid movement
    float wave1 = sin(uv.x * 3.0 + u_time * 0.5) * 0.1;
    float wave2 = cos(uv.y * 2.0 - u_time * 0.3) * 0.1;
    float wave3 = sin((uv.x + uv.y) * 4.0 + u_time * 0.7) * 0.05;
    
    // Interaction with mouse
    float dist = distance(uv, mouse);
    float mouseEffect = smoothstep(0.4, 0.0, dist) * 0.2;
    
    float noise = wave1 + wave2 + wave3 + mouseEffect;
    
    // Color mixing based on noise
    vec3 colorA = vec3(0.973, 0.976, 1.0); // Surface
    vec3 colorB = vec3(0.0, 0.157, 0.557); // Primary Navy
    vec3 colorC = vec3(0.0, 0.424, 0.286); // Secondary Emerald
    
    vec3 finalColor = mix(colorA, colorB, smoothstep(-0.2, 0.8, noise + uv.y * 0.5));
    finalColor = mix(finalColor, colorC, smoothstep(0.5, 1.5, noise + uv.x));
    
    // Subtle opacity control
    gl_FragColor = vec4(finalColor, 0.08); 
}`;
  function cs(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  // u_mouse is in pixel coordinates matching u_resolution (ShaderToy convention).
  // Shaders that need normalized coords should use: u_mouse / u_resolution.
  let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
  window.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = 1.0 - (event.clientY - rect.top) / rect.height;
      mouse.x = nx * canvas.width;
      mouse.y = ny * canvas.height;
    }
  });

  function render(t) {
    if (typeof ResizeObserver === 'undefined') syncSize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
    if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  render(0);
})();
