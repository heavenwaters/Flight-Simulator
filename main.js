"use strict";

let gl; let vertices; let normalsArray; let colorData; let faces; let canvas;
let vertBuffer; let normalBuffer; let viewPosLoc;

let x_min = -50; let x_max = 50; let z_min = -60; let z_max = 0;
let width = (x_max - x_min) / 5; let height = (z_max - z_min) /5;
let step = 1 / 4;


// Frustum parameters with constraints 
let left = -2; // [-3,-1]
let right = 2; // [1,3]
let near = 3; // [1,3]
let far = 50; // [14,18]
let top1 = 2; // [1,2]
let bottom = -2; // [-2,-1]
let speed = 0.009; // [0,0.07]

// Matrices that are passed to the GPU
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var nMatrix, nMatrixLoc;

let eye = vec3(0.0, 5.0, 0.0);
let at = vec3(0.0, 5.0, -1.0);
let up = vec3(0.0, 1.0, 0.0);
let dir = normalize(subtract(at, eye), false);

// Defines rotation increment/speed
let deltaTheta = 1;

// All angles contrained to [-90,90]
let pitchAngle = -10; let rollAngle = 0; let yawAngle = 0;

let frame = 0;

window.onload = function init() {

  canvas = document.getElementById("gl-canvas");
  gl = canvas.getContext('webgl2');
  if (!gl) alert("WebGL 2.0 isn't available");

  //  Configure WebGL
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(135 / 255, 206 / 255, 235 / 255, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  //  Load shaders and initialize attribute buffers
  let program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  [vertices, normalsArray] = get_patch(x_min, x_max, z_min, z_max);

  modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
  nMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");
  viewPosLoc = gl.getUniformLocation(program, "viewPos");

  vertBuffer = gl.createBuffer();
  normalBuffer = gl.createBuffer();
  // colorBuffer = gl.createBuffer()

  
  gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
  let vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);
  

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
  let vNormal = gl.getAttribLocation(program, "aNormal");
  gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vNormal);

  
  // Initialize HTML elements to frustum parameters
  document.getElementById("left-value").innerHTML = `Left = ${left}`;
  document.getElementById("right-value").innerHTML = `Right = ${right}`;
  document.getElementById("top-value").innerHTML = `Top = ${top1}`;
  document.getElementById("bottom-value").innerHTML = `Bottom = ${bottom}`;
  document.getElementById("near-value").innerHTML = `Near = ${near}`;
  document.getElementById("far-value").innerHTML = `Far = ${far}`;

  //handles key events
  document.addEventListener('keydown', (event) => {
    HandleKeyControls(event);
  });
  // console.log(vertices.length, normalsArray.length, indicesData.length);

  render();
}



function render()
{
  gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

if (eye[0] <= x_min + width) {
    x_max -= width;
    x_min -= width;
}
if (eye[0] >= x_max - width) {
    x_max += width;
    x_min += width;
}
if (eye[2] <= z_max - height) {
    z_max -= height;
    z_min -= height;
    // vertices = get_patch(x_min, x_max, z_min, z_max);
}
  frame += 1;
  if (frame >= 500)
  {
    [vertices, normalsArray] = get_patch(x_min, x_max, z_min, z_max);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    frame = 0;
    console.log(frame);
  }
  // colorData = setColor(vertices);

  

  // Projection and MVMatrix 
  dir = normalize(subtract(at, eye), false);
  eye = add(eye, scale(speed, dir));
  at = add(eye, dir);

  gl.uniform4f(viewPosLoc, false, at.x, at.y, at.z, 1.0);

  // Roll rotation
  var rollRot = rotate(rollAngle, dir);

  // Yaw rotation
  var yawRot = rotate(yawAngle, up);

  // Pitch rotation
  var right_vector = normalize(cross(dir, up), false);
  var pitchRot = rotate(pitchAngle, right_vector);

  modelViewMatrix = mult(pitchRot, (mult(yawRot, mult(rollRot, lookAt(eye, at, up)))));
  projectionMatrix = frustum(left, right, bottom, top1, near, far);

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  nMatrix = normalMatrix(modelViewMatrix, true);
  gl.uniformMatrix3fv(nMatrixLoc, false, flatten(nMatrix));

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length);

  requestAnimationFrame(render);

}

function get_patch(x_min, x_max, z_min, z_max)
{
  let verts = []
  let normals = []
  for (let z = z_min; z < z_max; z += step) {
    for (let x = x_min; x < x_max; x += step) {
      let y1 = Math.max(getHeight(x, z), 0);
      let y2 = Math.max(getHeight(x + step, z), 0);
      let y3 = Math.max(getHeight(x, z + step), 0);
      let y4 = Math.max(getHeight(x + step, z + step), 0);

      let v1 = vec3(x, y1, z);
      let v2 = vec3(x + step, y2, z);
      let v3 = vec3(x, y3, z + step);

      verts.push(v1);
      verts.push(v2);
      verts.push(v3);

      let edge1 = subtract(v1, v2);
      let edge2 = subtract(v1, v3);
      let normal1 = normalize(cross(edge1, edge2));
      normals.push(normal1);
      normals.push(normal1);
      normals.push(normal1);

      let v4 = vec3(x+step, y4, z+step);
      let v5 = vec3(x, y3, z+step);
      let v6 = vec3(x+step, y2, z);

      verts.push(v4);
      verts.push(v5);
      verts.push(v6);

      let edge3 = subtract(v4, v5);
      let edge4 = subtract(v4, v6);
      let normal2 = normalize(cross(edge3, edge4));
      normals.push(normal2);
      normals.push(normal2);
      normals.push(normal2);
    }
  }
  return [verts, normals];
}

// function to handle key controls
function HandleKeyControls(event) {
  let keysPressed = {};
  keysPressed[event.key] = true;
  var name = event.key;
 
  // alters the bounds of view within constraints 
  if (name == '1') {
    if (left <= -3) {
      return;
    }
    left -= 1;
    document.getElementById("left-value").innerHTML = `Left = ${left}`;
  }
  else if (name == '!') {
    if (left >= -1) {
      return;
    }
    left += 1;
    document.getElementById("left-value").innerHTML = `Left = ${left}`;
  }
  else if (name == '2') {
    if (right <= 1) {
      return;
    }
    right -= 1;
    document.getElementById("right-value").innerHTML = `Right = ${right}`;
  }
  else if (name == '@') {
    if (right >= 3) {
      return;
    }
    right += 1;
    document.getElementById("right-value").innerHTML = `Right = ${right}`;
  }
  else if (name == '3') {
    if (top1 <= 1) {
      return;
    }
    top1 -= 1;
    document.getElementById("top-value").innerHTML = `Top = ${top1}`;
  }
  else if (name == '#') {
    if (top1 >= 2) {
      return;
    }
    top1 += 1;
    document.getElementById("top-value").innerHTML = `Top = ${top1}`;
  }
  else if (name == '4') {
    if (bottom <= -2) {
      return;
    }
    bottom -= 1;
    document.getElementById("bottom-value").innerHTML = `Bottom = ${bottom}`;
  }
  else if (name == '$') {
    if (bottom >= -1) {
      return;
    }
    bottom += 1;
    document.getElementById("bottom-value").innerHTML = `Bottom = ${bottom}`;
  }
  else if (name == '5') {
    if (near <= 1) {
      return;
    }
    near -= 1;
    document.getElementById("near-value").innerHTML = `Near = ${near}`;
  }
  else if (name == '%') {
    if (near >= 3) {
      return;
    }
    near += 1;
    document.getElementById("near-value").innerHTML = `Near = ${near}`;
  }
  else if (name == '6') {
    if (far >= 18) {
      return;
    }
    far += 1;
    document.getElementById("far-value").innerHTML = `Far = ${far}`;
  }
  else if (name == '^') {
    if (far <= 14) {
      return;
    }
    far -= 1;
    document.getElementById("far-value").innerHTML = `Far = ${far}`;
  }
  else if (name == "ArrowUp") {
    if (speed >= 0.07) {
      return;
    }
    else {
      speed += 0.01 / 10;
    }
  }
  else if (name == "ArrowDown") {
    if (speed <= 0.000) {
      return;
    }
    else {
      speed -= 0.01 / 10;
    }
  }
  else if (name == "W" || name == "w") {
    if (pitchAngle <= -50) {
      return;
    }
    else {
      pitchAngle -= deltaTheta;
    }
  }
  else if (name == "S" || name == "s") {
    if (pitchAngle >= 50) {
      return;
    }
    else {
      pitchAngle += deltaTheta;
    }
  }
  else if (name == "A" || name == "a") {
    if (yawAngle >= 50) {
      return;
    }
    else {
      yawAngle += deltaTheta;
    }
  }
  else if (name == "D" || name == "d") {
    if (yawAngle <= -50) {
      return;
    }
    else {
      yawAngle -= deltaTheta;
    }
  }
  else if (name == "Q" || name == "q") {
    if (rollAngle <= -50) {
      return;
    }
    else {
      rollAngle -= deltaTheta;
    }
  }
  else if (name == "E" || name == "e") {
    if (rollAngle >= 50) {
      return;
    }
    else {
      rollAngle += deltaTheta;
    }

  }
  // Quitting
  else if (event.keyCode == 27) {
    alert("Quitting!")
    close();
  }
}

function frustum(left, right, bottom, top, near, far) {

    if (left == right) { throw "frustum(): left and right are equal"; }

    if (bottom == top) { throw "frustum(): bottom and top are equal"; }

    if (near == far) { throw "frustum(): near and far are equal"; }

    let w = right - left;

    let h = top - bottom;

    let d = far - near;

    let result = mat4();

    result[0][0] = 2.0 * near / w;

    result[1][1] = 2.0 * near / h;

    result[2][2] = -(far + near) / d;

    result[0][2] = (right + left) / w;

    result[1][2] = (top + bottom) / h;

    result[2][3] = -2 * far * near / d;

    result[3][2] = -1;

    result[3][3] = 0.0;

    return result;

}

function getHeight(x, z) {
    return noise.perlin2(x, z)*2.5
  }

