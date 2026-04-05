// This script grabs the <h1> element, clears its text, then types it back out
// one character at a time
// After typing finishes, the border-right cursor keeps blinking via CSS.
//
// Relevant settings:
//   TYPING_SPEED   — milliseconds between each character (lower = faster)
//   INITIAL_DELAY  — milliseconds to wait before typing starts

const TYPING_SPEED  = 50;
const INITIAL_DELAY = 300;  // short pause before typing begins

// Wait for the page to fully load before running
document.addEventListener('DOMContentLoaded', () => {

  const h1 = document.querySelector('header h1');
  const hp = document.querySelector('header p');

  if (!h1 || !hp) return; // single safety check

  const fullText = h1.textContent;
  const fullHPText = hp.textContent;

  h1.textContent = '';
  hp.textContent = '';

  let i = 0;

  function typeNextChar() {
    if (i < fullText.length) {
      h1.textContent += fullText[i];
      i++;
      setTimeout(typeNextChar, TYPING_SPEED);
    } else {
      setTimeout(typeNextHPChar, INITIAL_DELAY);
    }
  }

  let j = 0;

  function typeNextHPChar() {
    if (j < fullHPText.length) {
      hp.textContent += fullHPText[j];
      j++;
      setTimeout(typeNextHPChar, TYPING_SPEED);
    } else {
    }
  }

  setTimeout(typeNextChar, INITIAL_DELAY);

});


//------Cool blob/'metaball' effect-------//

// Canvas is fixed fullscreen behind the page
var canvas = document.getElementById('metaball-canvas') 
  || document.createElement('canvas');
canvas.id = 'metaball-canvas';
document.body.appendChild(canvas);

var width  = canvas.width  = window.innerWidth;
// Use the full page height instead of just the window height
var height = canvas.height = document.body.scrollHeight;

// Get WebGL context with alpha enabled so transparency works
var gl = canvas.getContext('webgl', { alpha: true });

var numMetaballs = 30;
var metaballs = [];

for (var i = 0; i < numMetaballs; i++) {
  var radius = Math.random() * 90 + 20;
  metaballs.push({
    x: Math.random() * (width  - 2 * radius) + radius,
    y: Math.random() * (height - 2 * radius) + radius,
    vx: (Math.random() - 0.5) * 1.5,  
    vy: (Math.random() - 0.5) * 1.5,
    r: radius * 0.75
  });
}

var vertexShaderSrc = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

var fragmentShaderSrc = `
  precision highp float;

  const float WIDTH  = ` + (width  >> 0) + `.0;
  const float HEIGHT = ` + (height >> 0) + `.0;

  uniform vec3 metaballs[` + numMetaballs + `];

  void main(){
    float x = gl_FragCoord.x;
    float y = gl_FragCoord.y;

    float sum = 0.0;
    for (int i = 0; i < ` + numMetaballs + `; i++) {
      vec3 metaball = metaballs[i];
      float dx = metaball.x - x;
      float dy = metaball.y - y;
      float radius = metaball.z;
      sum += (radius * radius) / (dx * dx + dy * dy);
    }

    if (sum >= 0.99) {
    //transparency and color stuff
      float alpha = 0.20;
      gl_FragColor = vec4(
        mix(vec3(x / WIDTH, 1.0 - y / HEIGHT, 1.0), vec3(0.0, 0.1, 0.3), max(0.0, 1.0 - (sum - 0.99) * 100.0)),
        alpha
      );
      return;
    }

    // Outside metaballs: fully transparent (shows the body background)
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  }
`;

var vertexShader   = compileShader(vertexShaderSrc,   gl.VERTEX_SHADER);
var fragmentShader = compileShader(fragmentShaderSrc, gl.FRAGMENT_SHADER);

var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// Enable alpha blending so transparency composites correctly over the page
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

var vertexData = new Float32Array([
  -1.0,  1.0,
  -1.0, -1.0,
   1.0,  1.0,
   1.0, -1.0,
]);
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

var positionHandle = getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle, 2, gl.FLOAT, gl.FALSE, 2 * 4, 0);

var metaballsHandle = getUniformLocation(program, 'metaballs');

loop();
function loop() {
  // Clear to fully transparent each frame
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (var i = 0; i < numMetaballs; i++) {
    var metaball = metaballs[i];
    metaball.x += metaball.vx;
    metaball.y += metaball.vy;
    if (metaball.x < metaball.r || metaball.x > width  - metaball.r) metaball.vx *= -1;
    if (metaball.y < metaball.r || metaball.y > height - metaball.r) metaball.vy *= -1;
  }

  var dataToSendToGPU = new Float32Array(3 * numMetaballs);
  for (var i = 0; i < numMetaballs; i++) {
    var baseIndex = 3 * i;
    var mb = metaballs[i];
    dataToSendToGPU[baseIndex + 0] = mb.x;
    dataToSendToGPU[baseIndex + 1] = mb.y;
    dataToSendToGPU[baseIndex + 2] = mb.r;
  }
  gl.uniform3fv(metaballsHandle, dataToSendToGPU);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(loop);
}

function compileShader(shaderSource, shaderType) {
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}

function getUniformLocation(program, name) {
  var loc = gl.getUniformLocation(program, name);
  if (loc === -1) throw 'Can not find uniform ' + name + '.';
  return loc;
}

function getAttribLocation(program, name) {
  var loc = gl.getAttribLocation(program, name);
  if (loc === -1) throw 'Can not find attribute ' + name + '.';
  return loc;
}
