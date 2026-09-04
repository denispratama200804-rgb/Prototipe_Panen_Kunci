/**
 * ShaderCanvasComponent
 * Prinsip: Single Responsibility Principle (SRP)
 * Menangani rendering WebGL ambient background dengan interaksi mouse/touch dan wave dynamic.
 */
export class ShaderCanvasComponent {
  constructor() {
    this._canvas = null;
    this._gl = null;
    this._program = null;
    this._animationFrameId = null;
    this._startTime = Date.now();
    this._mouse = [0.5, 0.5];
  }

  mount(containerEl) {
    const wrapper = document.createElement('div');
    wrapper.id = 'shader-bg-wrapper';
    wrapper.className = 'fixed inset-0 pointer-events-none z-[-1] opacity-40 overflow-hidden';
    
    this._canvas = document.createElement('canvas');
    this._canvas.id = 'shader-canvas';
    this._canvas.className = 'w-full h-full object-cover';
    wrapper.appendChild(this._canvas);

    containerEl.appendChild(wrapper);

    this._initWebGL();
  }

  _initWebGL() {
    const canvas = this._canvas;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;
    this._gl = gl;

    const syncSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    window.addEventListener('resize', syncSize);
    syncSize();

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision mediump float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

void main() {
    vec2 uv = v_texCoord;
    vec2 mouse = u_mouse;
    
    float wave1 = sin(uv.x * 3.0 + u_time * 0.4) * 0.08;
    float wave2 = cos(uv.y * 2.5 - u_time * 0.3) * 0.08;
    float wave3 = sin((uv.x + uv.y) * 3.5 + u_time * 0.5) * 0.04;
    
    float dist = distance(uv, mouse);
    float mouseEffect = smoothstep(0.4, 0.0, dist) * 0.15;
    float noise = wave1 + wave2 + wave3 + mouseEffect;
    
    // Theme palette: subtle soft surface to soft navy/emerald accents
    vec3 colorA = vec3(0.973, 0.976, 1.0);  // #f8f9ff
    vec3 colorB = vec3(0.92, 0.95, 0.99);   // Surface container low
    vec3 colorC = vec3(0.85, 0.93, 0.90);   // Subtle Emerald tint
    
    vec3 mix1 = mix(colorA, colorB, smoothstep(-0.2, 0.6, noise + uv.y * 0.4));
    vec3 finalColor = mix(mix1, colorC, smoothstep(0.3, 0.9, noise + uv.x * 0.3));
    
    gl_FragColor = vec4(finalColor, 0.7);
}`;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    gl.useProgram(program);
    this._program = program;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const mouseLoc = gl.getUniformLocation(program, 'u_mouse');

    window.addEventListener('mousemove', (e) => {
      this._mouse = [e.clientX / window.innerWidth, 1.0 - (e.clientY / window.innerHeight)];
    });

    const render = () => {
      const elapsed = (Date.now() - this._startTime) * 0.001;
      gl.uniform1f(timeLoc, elapsed);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform2f(mouseLoc, this._mouse[0], this._mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this._animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  unmount() {
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
    }
  }
}
