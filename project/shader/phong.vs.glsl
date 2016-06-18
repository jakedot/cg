/**
 * a phong shader implementation
 * Created by Samuel Gratzl on 29.02.2016.
 */
 #define MAX 10

 precision mediump float;
 precision mediump int;

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;

uniform int viewportWidth;
uniform int viewportHeight;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;

// values for motion blur (number of samples, distance, direction)
uniform int numSamples;
uniform float distance;
uniform float direction;

//TASK 3-3 light position as uniform
//vec3 lightPos = vec3(0, -2, 2);
uniform vec3 u_lightPos;
//TASK 5-3 second light source
uniform vec3 u_light2Pos;

//output of this shader
varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;
varying vec3 v_light2Vec;
varying vec2 v_texCoord;
varying float weightMiddle;
varying float weights[MAX];
varying vec2 offsetsRight[MAX];
varying vec2 offsetsLeft[MAX];
varying vec2 vUv;

float gaussianConstant = 1.0 / sqrt( 2.0 * radians(180.0) );

float gaussian(float x) {
  // see http://bl.ocks.org/phil-pedruco/88cb8a51cdce45f13c7e
  float mean = 0.0;
  float sigma = 1.0;
  x = (x - mean) / sigma;
  float y = gaussianConstant * exp(-.5 * x * x) / sigma;
  return y;
}

// simplified gaussian function version, with mean=0 and sigma=1, and
// where x-range of [-4,+4] is mapped to [-1,+1]
// and y-range of [0,0.4] mapped to [0,1.0]
//
float gaussianMapped(float x) {
  x *= 4.0;
  float y = gaussianConstant * exp(-.5 * x * x);
  y = y * (1.0 / 0.4);
  return y;
}

void main() {
	vec4 eyePosition = u_modelView * vec4(a_position,1);
  vUv = a_texCoord;

	v_texCoord = a_texCoord;

  v_normalVec = u_normalMatrix * a_normal;

  v_eyeVec = - eyePosition.xyz;
	//TASK 3-4 light position as uniform
	v_lightVec = u_lightPos + v_eyeVec;
	//TASK 5-4 second light source position
	v_light2Vec = u_light2Pos + v_eyeVec;

	gl_Position = u_projection * eyePosition;

  // [1] calculate relative weights for each sample

  float step = 1.0 / float(numSamples+1);
  float sum = 0.0;
  sum += 1.0;  // accounts for middle element

  for (int i = 0; i < MAX; i++)
  {
    if (i < numSamples)
    {
      // semi-circle (not right)
      // float deg = float(i) * step * 90.0;
      // float val = cos( radians(deg) );

      float val = gaussianMapped( float(i) * step );

      weights[i] = val;
      sum += val * 2.0;  // accounts for left and right sides
    }
    else
    {
      weights[i] = 0.0;
    }
  }

  for (int i = 0; i < MAX; i++)  // make sure weights total 1.0
  {
    weights[i] /= sum;
  }

  weightMiddle = 1.0 / sum;


  // [2] calculate uv offsets (rem, offsets and weights are parallel arrays)

  float stepx = cos( radians(direction) ) * (distance / float(viewportWidth));
  float stepy = sin( radians(direction) ) * (distance / float(viewportHeight));

  for (int i = 0; i < MAX; i++)
  {
    if (i < numSamples)
    {
      vec2 v = vec2( float(i+1) * stepx, float(i+1) * stepy );
      offsetsRight[i] = vUv  +  v;
      offsetsLeft[i]  = vUv  -  v;
    }
    else
    {
      offsetsRight[i] = vec2(0.0, 0.0);
      offsetsLeft[i] = vec2(0.0, 0.0);
    }
  }
}
