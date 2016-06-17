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
  tracktexture: 'textures/track.jpg'
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
    let light = new LightNode();
    light.ambient = [0, 0, 0, 1];
    light.diffuse = [1, 1, 1, 1];
    light.specular = [1, 1, 1, 1];
    light.position = [0, -2, 2];
    light.append(createLightSphere());
    //TASK 4-1 animated light using rotateLight transformation node
    rotateLight = new TransformationSGNode(mat4.create(), [
        light
    ]);
    root.append(rotateLight);
  }


  {
    //TASK 5-1 create red light node at [2, 0.2, 0]
    let light2 = new LightNode();
    light2.uniform = 'u_light2';
    light2.diffuse = [1, 0, 0, 1];
    light2.specular = [1, 0, 0, 1];
    light2.position = [2, 0.2, 0];
    light2.append(createLightSphere());
    rotateLight2 = new TransformationSGNode(mat4.create(), [
        light2
    ]);
    root.append(rotateLight2);
  }

  createRunner();

  for (var runner of runnerNodes) {
    //TASK 2-4 wrap with material node
    let matRun = new MaterialSGNode([
      runner
    ]);
    //gold
    matRun.ambient = [0.24725, 0.1995, 0.0745, 1];
    matRun.diffuse = [0.75164, 0.60648, 0.22648, 1];
    matRun.specular = [0.628281, 0.555802, 0.366065, 1];
    matRun.shininess = 0.4;

    transRunner.push(//new TransformationSGNode(mat4.create(), [
      new TransformationSGNode(glm.transform({ translate: [0,1, 0], rotateX : 180, scale: 0.8 }),  [
        matRun
      //])
    ]));
  }
  transRunner.forEach(t=>root.append(t));

  {
    //TASK 2-5 wrap with material node
    let floor = new MaterialSGNode([
      new RenderSGNode(makeRect())
    ]);
    floor.emission = [0,0,0,0];

    //dark
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.1, 0.1, 0.1, 1];
    floor.specular = [0.5, 0.5, 0.5, 1];

    root.append(new TransformationSGNode(glm.transform({ translate: [0,1,0], rotateX: 90, scale: 2}), [
      floor
    ]));
  }

  return root;
}

function createRunner() {
  runnerNodes.push(new RunnerNode([-2,1,0],.012,[0,0,1]));
  runnerNodes.push(new RunnerNode([-1,1,0],.01,[0,0,1]));
  runnerNodes.push(new RunnerNode([0,1,0],.011,[0,0,1]));
  runnerNodes.push(new RunnerNode([1,1,0],.013,[0,0,1]));
}

function initRunners() {
  var state = RunnerState.starting;

  document.getElementById("start").addEventListener("click", e=>runnerNodes.forEach(r=>r.state=r.state===RunnerState.starting?RunnerState.running:RunnerState.starting));

  document.getElementById("reset").addEventListener("click", e=>runnerNodes.forEach(r=>r.reset()));

  document.getElementById("end").addEventListener("click", e=>runnerNodes.forEach((r,i)=>r.state=i===0?RunnerState.jubilating:RunnerState.depressed));
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

  console.log(context.sceneMatrix);

  context.viewMatrix = mat4.lookAt(mat4.create(), eye, center, [0,1,0]);

  //TASK 4-2 enable light rotation
  rotateLight.matrix = glm.rotateY(timeInMilliseconds*0.05);
  //TASK 5-2 enable light rotation
  rotateLight2.matrix = glm.rotateY(-timeInMilliseconds*0.1);

  root.render(context);

  //animate based on elapsed time
  animatedAngle = timeInMilliseconds/10;

  //animate
  requestAnimationFrame(render);
}

class CameraFlight {
  constructor() {
    this.elapsed = 0;
    this.last = 0;
    this.activated = true;
	  this.lastSceneMatrix = mat4.create();
  }

  getSceneMatrix(context, time) {
    if (this.activated) {
      this.elapsed = time - this.last;
      this.last = time;
  		if (this.elapsed == 0) {
  			this.lastSceneMatrix = mat4.multiply(mat4.create(), this.lastSceneMatrix, glm.rotateY(0));
  		}
    }
	  return this.lastSceneMatrix;
  }
}

/**
 * a light node represents a light including light position and light properties (ambient, diffuse, specular)
 * the light position will be transformed according to the current model view matrix
 */
class LightNode extends TransformationSGNode {

  constructor(position, children) {
    super(children);
    this.position = position || [0, 0, 0];
    this.ambient = [0, 0, 0, 1];
    this.diffuse = [1, 1, 1, 1];
    this.specular = [1, 1, 1, 1];
    //uniform name
    this.uniform = 'u_light';
  }

  /**
   * computes the absolute light position in world coordinates
   */
  computeLightPosition(context) {
    //transform with the current model view matrix
    const modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    const pos = [...this.position, 1];
    return vec4.transformMat4(vec4.create(), pos, modelViewMatrix);
  }

  setLightUniforms(context) {
    const gl = context.gl,
      shader = context.shader,
      position = this.computeLightPosition(context, this.position);

    //TASK 3-5 set uniforms
    gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.ambient'), this.ambient);
    gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.diffuse'), this.diffuse);
    gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.specular'), this.specular);

    gl.uniform3f(gl.getUniformLocation(shader, this.uniform+'Pos'), position[0], position[1], position[2]);
  }

  render(context) {
    this.setLightUniforms(context);

    //since this a transformation node update the matrix according to my position
    this.matrix = glm.translate(this.position[0], this.position[1], this.position[2]);

    //render children
    super.render(context);
  }
}

class CubeRenderNode extends RenderSGNode {
  constructor() {
    super({
      index: cubeIndices,
      position: cubeVertices,
      texture: cubeTexCoords
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
        super(matrix, [new AdvancedTextureSGNode(texture, [new CubeRenderNode()])]);
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
        this.rotation = limbRotation();
        this.position = add(this.position,scale(this.speed, this.direction));

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

        break;
      case RunnerState.jubilating:
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
        break;
      case RunnerState.depressed:
        break;
    }

    // render head, body, limbs
    super.render(context);
  }
};

return RunnerNode;
}();

function convertDegreeToRadians(degree) {
  return degree * Math.PI / 180;
}
