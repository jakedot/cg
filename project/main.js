/**
 * Created by Samuel Gratzl on 08.02.2016.
 */

 var gl = null;
 var root = null;
 var rotateLight, rotateLight2;

 var flight;

 //variables for camera movement
 var eye = [0,-3,5];
 var center = [0,0,0];
 var lastmouse = [0,0];
 var moveactivated = false;
 var mouseactivated = false;

 //
 var animatedAngle = 0;

// textures
var armTexture;
var bodyTexture;
var headTexture;
var trackTexture;

var runnerNodes = [];
var transRunner = [];

//links to buffer stored on the GPU
var cubeVertexBuffer, cubeIndexBuffer;

var s = 0.3; //size of cube
var cubeVertices = new Float32Array([
   -s,-s,-s, s,-s,-s, s, s,-s, -s, s,-s,
   -s,-s, s, s,-s, s, s, s, s, -s, s, s,
   -s,-s,-s, -s, s,-s, -s, s, s, -s,-s, s,
   s,-s,-s, s, s,-s, s, s, s, s,-s, s,
   -s,-s,-s, -s,-s, s, s,-s, s, s,-s,-s,
   -s, s,-s, -s, s, s, s, s, s, s, s,-s,
]);

var cubeNormals = new Float32Array([
   0,-1,1,  0,-1,1,   0,-1,1,   0,-1,1,
   0,1,1,   0,1,1,    0,1,1,    0,1,1,
   1,0,-1,  1,0,-1,   1,0,-1,   1,0,-1,
   1,0,1,   1,0,1,    1,0,1,    1,0,1,
   -1,1,0,  -1,1,0,   -1,1,0,   -1,1,0,
   0,1,-1,  0,1,-1,   0,1,-1,   0,1,-1,
]);

var cubeIndices =  new Float32Array([
   0,1,2, 0,2,3,
   4,5,6, 4,6,7,
   8,9,10, 8,10,11,
   12,13,14, 12,14,15,
   16,17,18, 16,18,19,
   20,21,22, 20,22,23
]);

var cubeTexCoords = new Float32Array([
  1,0.66,   0.5,0.66, 0.5,0.33, 1,0.33,   // back face
  0.5,0.66, 0,0.66,   0,0.33,   0.5,0.33,  // front face
  0.5,0.66, 0.5,0.33, 1,0.33,   1,0.66,  // left face
  0.5,0.33, 0.5,0,    1,0,      1,0.33,  // right face
  0.5,0.66, 1,0.66,   1,1,      0.5,1,  // down face
  0,0,      0.5,0,    0.5,0.33, 0,0.33]);  // top face

const trophyVertices = [
  -s,-s,-s, -s,-s, s, s,-s, s, s,-s,-s,
  0,0,0,
  -s, s,-s, -s, s, s, s, s, s, s, s,-s,
]

const trophyIndices = [
  0,1,2, 0,2,3,
  0,1,4, 1,2,4, 2,3,4, 3,0,4,
  5,6,4, 6,7,4, 7,8,4, 8,5,4,
  5,6,7, 5,7,8
]


//load the shader resources using a utility function
loadResources({
  vs: 'shader/phong.vs.glsl',
  fs: 'shader/phong.fs.glsl', //gouraud
  vs_single: 'shader/single.vs.glsl',
  fs_single: 'shader/single.fs.glsl',

  //textures
  //runner
  armtexture: 'textures/arm_full.png',
  bodytexture: 'textures/body.png',
  headtexture: 'textures/head_full.png',
  //track
  tracktexture: 'textures/track.jpg',
  // cubemap
  positivex: 'textures/pos-x.png',
  negativex: 'textures/neg-x.png',
  positivey: 'textures/pos-y.png',
  negativey: 'textures/neg-y.png',
  positivez: 'textures/pos-z.png',
  negativez: 'textures/neg-z.png'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
  init(resources);

  render(0);
});

function init(resources) {
  flight = new CameraFlight();
  //create a GL context
  gl = createContext();

  //enable depth test to let objects in front occluse objects further away
  gl.enable(gl.DEPTH_TEST);

  initTextures(resources);
  initInteraction();
  initRunners();
  // initCubeBuffer(gl);
  root = createSceneGraph(gl, resources);
  // initCubeMap(gl, resources);
}

function initTextures(r) {
  headTexture = r.headtexture;
  bodyTexture = r.bodytexture;
  armTexture = r.armtexture;
  trackTexture = r.tracktexture;
}

function createSceneGraph(gl, resources) {
  //create scenegraph
  const root = new ShaderSGNode(createProgram(gl, resources.vs, resources.fs));

  function createLightSphere() {
    return new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single), [
      new RenderSGNode(makeSphere(.2,10,10))
    ]);
  }

  {
    let trophy = new TrophyRenderNode();
    root.append(trophy);
  }

  {
    //TASK 3-6 create white light node at [0, -2, 2]
    let light = new LightSGNode();
    light.ambient = [0, 0, 0, 1];
    light.diffuse = [1, 1, 1, 1];
    light.specular = [1, 1, 1, 1];
    light.position = [0, -2, 2];
    light.append(createLightSphere());
    //TASK 4-1 animated light using rotateLight transformation node
    rotateLight = new TransformationSGNode(glm.translate(2, -3, 2), [
        light
    ]);
  }


  {
    //TASK 5-1 create red light node at [2, 0.2, 0]
    let light2 = new LightSGNode();
    light2.uniform = 'u_light2';
    light2.diffuse = [1, 0, 0, 1];
    light2.specular = [1, 0, 0, 1];
    light2.position = [2, 0.2, 0];
    light2.append(createLightSphere());
    rotateLight2 = new TransformationSGNode(glm.translate(0, -2, 2), [
        light2
    ]);
    rotateLight = new TransformationSGNode(mat4.create(), [rotateLight, rotateLight2]);
    root.append(rotateLight);
  }

  createRunner();
  runnerNodes.forEach(r=>transRunner.push(new TransformationSGNode(glm.transform({ translate: [0,0.8, 0], rotateX : 270, scale: 1 }),[r])));
  transRunner.forEach(t=>root.append(t));

  {
    let floor = new AdvancedTextureSGNode(
      resources.tracktexture,
      new RenderSGNode(makeRectText(3,16,[0, 0 /**/, 20, 0 /**/, 20, 20 /**/, 0, 20]))
    );
    floor.wrapS = gl.REPEAT;
    floor.wrapT = gl.REPEAT;
    //TASK 2-5 wrap with material node
    floor = new MaterialSGNode([
      floor
    ]);

    //dark
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.5, 0.5, 0.5, 1];
    floor.specular = [1, 1, 1, 1];

    root.append(new TransformationSGNode(glm.transform({ translate: [0,0.6,-13], rotateX: 90}), [
      floor
    ]));
  }

  {
    //start
    var positions = [
      [[-3.1,0,-1], [1,2,1]],
      [[2.5,0,-1], [1,2,1]],
      [[-0.5,0.6,-1], [9,0.1,0.5]],
      [[-3.1,0,-13], [1,2,1]],
      [[2.5,0,-13], [1,2,1]],
      [[-0.5,0.6,-13], [9,0.1,0.5]],
      [[-3.1,0,-26.5], [1,2,1]],
      [[2.5,0,-26.5], [1,2,1]],
      [[-0.5,0.6,-26.5], [9,0.1,0.5]],
    ];

    positions.forEach(r=>{
      var mat = new MaterialSGNode();

      mat.ambient = [1, 0.75, 0.33, 0.15];
      mat.diffuse = [1, 0.75, 0.33, 1];
      mat.specular = [1, 0.75, 0.33, 1];
      mat.shininess = 1;

      root.append(mat.append(new TransformationSGNode(glm.transform({translate:r[0], scale: r[1]}),
        [new CubeRenderNode()]
      )));
    })
  }

  return root;
}

function createRunner() {
  runnerNodes.push(new RunnerNode([-2,1.4,0],.022,[0,0,1]));
  runnerNodes.push(new RunnerNode([-1,1.4,0],.02,[0,0,1]));
  runnerNodes.push(new RunnerNode([0,1.4,0],.021,[0,0,1]));
  runnerNodes.push(new RunnerNode([1,1.4,0],.023,[0,0,1]));
}

function initRunners() {
  var state = RunnerState.starting;

  document.getElementById("start").addEventListener("click", e=>runnerNodes.forEach(r=>r.state=r.state===RunnerState.starting?RunnerState.running:RunnerState.starting));

  document.getElementById("reset").addEventListener("click", e=>runnerNodes.forEach(r=>r.reset()));

  document.getElementById("end").addEventListener("click", e=>runnerNodes.forEach((r,i)=>r.state=i===3?RunnerState.jubilating:RunnerState.depressed));
}

function initCubeMap(gl, resources) {
  root.append(new class extends SGNode {
    constructor(resources, children) {
      super(children);
      this.textureUnit = 0;
      this.uniform = 'u_cube';
      this.useuniform = 'u_useEnv';
      this.textureId = -1;
      this.resources = resources;
    }

    init(gl) {
      this.textureId = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureId);

      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, this.magFilter || gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, this.minFilter || gl.LINEAR);

      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, this.wrapS || gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, this.wrapT || gl.CLAMP_TO_EDGE);

      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureId);
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.resources.positivex);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureId);
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.resources.negativex);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureId);
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.resources.positivey);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureId);
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.resources.negativey);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureId);
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.resources.positivez);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureId);
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.resources.negativez);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }

    render(context) {
      if (this.textureId < 0) {
        this.init(context.gl);
      }
      //set additional shader parameters
      gl.uniform1i(gl.getUniformLocation(context.shader, this.uniform), this.textureUnit);
      gl.uniform1i(gl.getUniformLocation(context.shader, this.useuniform), true);

      //activate and bind texture
      gl.activeTexture(gl.TEXTURE0 + this.textureUnit);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureId);

      //render children
      super.render(context);

      //clean up
      gl.activeTexture(gl.TEXTURE0 + this.textureUnit);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }
  } (resources, new TransformationSGNode(glm.transform({scale: 50}), [new CubeRenderNode()])));

}

function initInteraction() {
  //event handlers for camera
  document.onkeydown = handleKeyPress;
  document.onmousemove = handleMouseMove;
  document.onmousedown = handleMouseDown;
  document.onmouseup = handleMouseUp;
}

function handleKeyPress(event) {
  if (event.keyCode == 38) {  //keyUp
    updateEye(0.1);
  } else if (event.keyCode == 40) { //keyDown
    updateEye(-0.1);
  } else if (event.keyCode == 67) { //c
    moveactivated = true;
	  flight.activated = false;
  }
}

function handleMouseMove(event) {
  if (moveactivated && mouseactivated) {
    center[0] += 0.1 * (lastmouse[0] - event.clientX);
    center[1] += 0.1 * (lastmouse[1] - event.clientY);
    lastmouse[0] = event.clientX;
    lastmouse[1] = event.clientY;
  }
}

function updateEye(ammount) {
  if (moveactivated) {
    eye[0] += (center[0] - eye[0]) * ammount;
    eye[1] += (center[1] - eye[1]) * ammount;
    eye[2] += (center[2] - eye[2]) * ammount;

    for (var r of runnerNodes) {
      r.tryNear();
    }
  }
}

function handleMouseDown(event) {
  if (!mouseactivated) {
    mouseactivated = true;
    lastmouse[0] = event.clientX;
    lastmouse[1] = event.clientY;
  }
}

function handleMouseUp(event) {
  if (mouseactivated) mouseactivated = false;
}


function render(timeInMilliseconds) {
  checkForWindowResize(gl);

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  //set background color to light gray
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  //clear the buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), 30, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);

  context.sceneMatrix = flight.getSceneMatrix(context, timeInMilliseconds);

  context.viewMatrix = mat4.lookAt(mat4.create(), eye, center, [0,1,0]);

  root.render(context);

  //animate based on elapsed time
  animatedAngle = timeInMilliseconds/10;

  //animate
  requestAnimationFrame(render);
}

class CameraFlight {
  constructor() {
    this.activated = true;
	  this.lastSceneMatrix = mat4.create();
    this.running = false;
  }

  getSceneMatrix(context, time) {
    if (this.activated) {

  		if (time == 0) {  //turning behind runners
  			this.lastSceneMatrix = mat4.multiply(mat4.create(), this.lastSceneMatrix, glm.rotateY(0));
  		} else if (time < 5000) { //standing up, turning to side
        this.lastSceneMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY((time / 5000) * 130));
        rotateLight.matrix = glm.rotateY((time / 5000) * 360);
      } else if (time < 25000) {  //flying with runners
        if (!this.running) {
          this.running = true;
          runnerNodes.forEach(r=>r.state=RunnerState.running);
        }
        this.lastSceneMatrix = mat4.multiply(mat4.create(), glm.rotateY(130), glm.translate(0,0,((time - 5000) / 800)));
        rotateLight.matrix = glm.translate(0,0,-((time - 5000) / 800));
      } else if (time < 30000) {  //jubilating
        if (this.running) {
          this.running = false;
          runnerNodes.forEach((r,i)=>r.state=i===3?RunnerState.jubilating:RunnerState.depressed);
        }
        this.lastSceneMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(130+(time-25000)/5000*410));
        this.lastSceneMatrix = mat4.multiply(mat4.create(), this.lastSceneMatrix, glm.translate(0,0,25));
      }
    }
	  return this.lastSceneMatrix;
  }
}

class CubeRenderNode extends RenderSGNode {
  constructor() {
    super({
      index: cubeIndices,
      position: cubeVertices,
      texture: cubeTexCoords,
      normal: cubeNormals
    })
  }
}

class TrophyRenderNode extends RenderSGNode {
  constructor() {
    super({
      index: trophyIndices,
      position: cubeVertices
    })
  }
}

RunnerState = {
  starting : Symbol("starting"),
  running : Symbol("running"),
  jubilating : Symbol("jubilating"),
  depressed : Symbol("depressed"),
  resting : Symbol("resting"),

  is: s => Object.keys(RunnerState).map(k=>s===RunnerState[k]).reduce((a,b)=>a||b)
},

/**
 * Runner node class with static private consts and vars
 */
RunnerNode = function() {
  const bodyTransformationMatrix = glm.scale(1,1,0.5),
        headTransformationMatrix = mat4.multiply(mat4.create(),glm.translate(0.0,0.4,0),glm.scale(0.4,0.33,0.4)),
        limbScale = glm.scale(0.2,1,0.2),
        legTrans = [.16,-.6,0],
        armTrans = [.365,0,0],

        add = ([a,b,c],[x,y,z]) => [a+x,b+y,c+z],
        mult = ([a,b,c],[x,y,z]) => [a*x,b*y,c*z],

        scale = (s,[x,y,z]) => mult([s,s,s],[x,y,z]),
        xScale = (s,xyz) => mult([s,1,1],xyz),
        yScale = (s,xyz) => mult([1,s,1],xyz),
        zScale = (s,xyz) => mult([1,1,s],xyz),
        xMirror = xScale.bind(null,-1),
        yMirror = yScale.bind(null,-1),
        zMirror = zScale.bind(null,-1),

        vecLength = ([x,y,z]) => Math.sqrt(x*x+y*y+z*z),

        leftLegTransformationMatrix = mat4.multiply(mat4.create(), glm.translate(...legTrans), limbScale),
        rightLegTransformationMatrix = mat4.multiply(mat4.create(), glm.translate(...xMirror(legTrans)), limbScale),
        leftArmTransformationMatrix = mat4.multiply(mat4.create(), glm.translate(...armTrans), limbScale),
        rightArmTransformationMatrix = mat4.multiply(mat4.create(), glm.translate(...xMirror(armTrans)), limbScale),

        limbRotation = () => Math.sin((animatedAngle%180)/45*(Math.PI/2))*45,

        // local variables
        position = Symbol("position"),
        initPosition = Symbol("initPosition"),
        initMatrix = Symbol("initMatrix"),
        state = Symbol("state"),
        stopping = Symbol("stopping")
        rotation = Symbol("rotation"),
        forward = Symbol("forward"),
        backward = Symbol("backward")
        lastState = Symbol("lastState");

  class LimbNode extends TransformationSGNode {
    constructor(matrix, texture) {
      var mat = new MaterialSGNode(new AdvancedTextureSGNode(texture, [new CubeRenderNode()]));
      mat.ambient = [0, 0, 0, 1];
      mat.diffuse = [0.5, 0.5, 0.5, 1];
      mat.specular = [1, 1, 1, 1];
      super(matrix, [mat]);
      this[initMatrix] = matrix;
    }

    reset() {
      this.matrix = this[initMatrix];
    }
  }

  /**
   * runner node class
   * arguments:
   *   position: glm.translate(x,y,z)
   *   direction: glm.translate(x,y,z)
   *   speed: float
   */
  class RunnerNode extends TransformationSGNode {
    get rotation() {
      return this[rotation];
    }

    set rotation(rot) {
      this[rotation] = rot;
      this[forward] = glm.rotateX(rot);
      this[backward] = glm.rotateX(-rot);
    }

    get [Symbol.toStringTag]() {
      return 'RunnerNode';
    }

    set position(arg) {
      this[position] = arg;
      super.matrix = glm.translate(...arg);
    }

    get position() {
      return this[position];
    }

    set state(arg) {
      if (!RunnerState.is(arg)) throw new TypeError();
      this[lastState] = this[state];
      this[state] = arg;
    }

    get state() {
      return this[state];
    }

    constructor(
      position = [0,0,0],
      speed = 1.0,
      direction = [0,0,0],
      state = RunnerState.starting
    ) {
      super(glm.translate(...position)); // add limbs later

      this.position = this[initPosition] = position;
      this.speed = speed;
      this.direction = direction;
      this.state = this[state] = state; // initializing [state] and [lastState] with state
      this.near = false;  //boolean for finding if camera is near
      this.absPos = [];

      //body
      this.append(this.body = new LimbNode(bodyTransformationMatrix, bodyTexture));

      //head
      this.head = new LimbNode(headTransformationMatrix, headTexture);
      this.append(this.head);

      //transformation of left leg
      this.leftLeg = new LimbNode(leftLegTransformationMatrix, armTexture);
      this.append(this.leftLeg);

      //transformation of right leg
      this.rightLeg = new LimbNode(rightLegTransformationMatrix, armTexture);
      this.append(this.rightLeg);

      //transformation of left arm
      this.leftArm = new LimbNode(leftArmTransformationMatrix, armTexture);
      this.append(this.leftArm);

      //transformation of right arm
      this.rightArm = new LimbNode(rightArmTransformationMatrix, armTexture);
      this.append(this.rightArm);
  }

  reset() {
    this.position = this[initPosition];
    this.state = RunnerState.starting;
    this.resetLimbs();
  }

  tryNear() {
    if (-this.absPos[2] < 2) {
      this.near = true;
    }
    else this.near = false;
  }

  resetLimbs() {
    for (var c of this.children) {
      if (c instanceof LimbNode) c.reset();
    }
  }

  render(context) {
    // state transitions
    if (this[state] !== this[lastState]) {
      switch(this[state]) {
        case RunnerState.starting:
        case RunnerState.jubilating:
        case RunnerState.depressed: this.resetLimbs();
        case RunnerState.running: this.rotation = 0; break;
      }
      this.state = this[state];
    }

    switch(this.state) {
      case RunnerState.running:
        if (flight.activated || this.near) {
          this.rotation = limbRotation();
          if (!this.near) this.position = add(this.position,scale(this.speed, this.direction));

          //update transformation of runner
          //transformation of left leg
          var rotatedLimb = mat4.multiply(mat4.create(), this[forward], leftLegTransformationMatrix);
          this.leftLeg.matrix = rotatedLimb;

          //transformation of right leg
          rotatedLimb = mat4.multiply(mat4.create(), this[backward], rightLegTransformationMatrix);
          this.rightLeg.matrix = rotatedLimb;

          //transformation of left arm
          var leftArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0,0.3,0));
          leftArmTransformationMatrix = mat4.multiply(mat4.create(), leftArmTransformationMatrix, this[backward]);
          leftArmTransformationMatrix = mat4.multiply(mat4.create(), leftArmTransformationMatrix, glm.translate(...add(armTrans,[0,-0.3,0])));
          leftArmTransformationMatrix = mat4.multiply(mat4.create(), leftArmTransformationMatrix, limbScale);
          this.leftArm.matrix = leftArmTransformationMatrix;

          //transformation of right arm
          var rightArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0,0.3,0));
          rightArmTransformationMatrix = mat4.multiply(mat4.create(), rightArmTransformationMatrix, this[forward]);
          rightArmTransformationMatrix = mat4.multiply(mat4.create(), rightArmTransformationMatrix, glm.translate(...xMirror(add(armTrans,[0,-0.3,0]))));
          rightArmTransformationMatrix = mat4.multiply(mat4.create(), rightArmTransformationMatrix, limbScale);
          this.rightArm.matrix = rightArmTransformationMatrix;
        }

        break;
      case RunnerState.jubilating:
        if (flight.activated || this.near) {
          this.rotation = limbRotation() + 180;
          //transformation of left arm
          var leftArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0,0.3,0));
          leftArmTransformationMatrix = mat4.multiply(mat4.create(), leftArmTransformationMatrix, this[backward]);
          leftArmTransformationMatrix = mat4.multiply(mat4.create(), leftArmTransformationMatrix, glm.translate(...add(armTrans,[0,-0.3,0])));
          leftArmTransformationMatrix = mat4.multiply(mat4.create(), leftArmTransformationMatrix, limbScale);
          this.leftArm.matrix = leftArmTransformationMatrix;

          //transformation of right arm
          var rightArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0,0.3,0));
          rightArmTransformationMatrix = mat4.multiply(mat4.create(), rightArmTransformationMatrix, this[forward]);
          rightArmTransformationMatrix = mat4.multiply(mat4.create(), rightArmTransformationMatrix, glm.translate(...xMirror(add(armTrans,[0,-0.3,0]))));
          rightArmTransformationMatrix = mat4.multiply(mat4.create(), rightArmTransformationMatrix, limbScale);
          this.rightArm.matrix = rightArmTransformationMatrix;
        }
        break;
      case RunnerState.depressed:
        break;
      case RunnerState.starting:
        if (flight.activated) { //standup during start
          transRunner.forEach(r=>r.matrix = glm.transform({ translate: [0,0.7+(0.3*animatedAngle*10/5000), 0], rotateX : 270-(90*animatedAngle*10/5000), scale: 1 }));
        } else if (this.near) {
          this.rotation = (limbRotation() + 45) / 90;
          transRunner.forEach(r=>r.matrix = glm.transform({ translate: [0,0.7+(this.rotation*0.3), 0], rotateX : 270-(90*this.rotation), scale: 1 }));
        }
        break;
    }

    var modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    this.absPos = [...this.position, 1];
    this.absPos = vec4.transformMat4(vec4.create(), this.absPos, modelViewMatrix);

    // render head, body, limbs
    super.render(context);
  }
};

return RunnerNode;
}();

function makeRectText(width, height, textures) {
  var r = makeRect(width, height);
  return {
    position: r.position,
    normal: r.normal,
    texture: textures,
    index: r.index
  };
}

function convertDegreeToRadians(degree) {
  return degree * Math.PI / 180;
}
