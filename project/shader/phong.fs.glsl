/**
 * a phong shader implementation
 * Created by Samuel Gratzl on 29.02.2016.
 */
 #define MAX 10

 precision mediump float;
 precision mediump int;

/**
 * definition of a material structure containing common properties
 */
struct Material {
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
	float shininess;
};

/**
 * definition of the light properties related to material properties
 */
struct Light {
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
};

// values for motion blur (number of samples, distance, direction)
uniform int numSamples;
uniform float distance;
uniform float direction;

uniform Material u_material;
uniform Light u_light;

uniform Light u_light2;
uniform vec3 l2dir;

uniform sampler2D u_tex;

uniform float u_alpha;

//varying vectors for light computation
varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;
varying vec3 v_light2Vec;
varying vec2 v_texCoord;

// varyings for blur
varying float weightMiddle;
varying float weights[MAX];
varying vec2 offsetsRight[MAX];
varying vec2 offsetsLeft[MAX];
varying vec2 vUv;

vec4 getBlurredText() {
  vec4 c_em = vec4( 0.0 );

  // middle element
  c_em += texture2D(u_tex, vec2(vUv.x,vUv.y) ) * weightMiddle;

  // elements to the left and right
  for (int i = 0; i < MAX; i++) 	//
  {
    c_em += texture2D(u_tex, offsetsRight[i] ) * weights[i];
    c_em += texture2D(u_tex, offsetsLeft[i] ) * weights[i];

    if (i >= numSamples) break;
  }

  return c_em;
}

float angle(vec3 x, vec3 y) {
  return dot(x, y)/(sqrt(dot(x,x)) * sqrt(dot(y,y)));
}

vec4 calculateSimplePointLight(Light light, Material material, vec3 lightVec, vec3 normalVec, vec3 eyeVec) {
	lightVec = normalize(lightVec);
	normalVec = normalize(normalVec);
	eyeVec = normalize(eyeVec);

		//TASK 1-1 implement phong shader
	//compute diffuse term
	float diffuse = max(dot(normalVec,lightVec),0.0);

	//compute specular term
	vec3 reflectVec = reflect(-lightVec,normalVec);
	float spec = pow( max( dot(reflectVec, eyeVec), 0.0), material.shininess);

	vec4 c_amb  = clamp(light.ambient * material.ambient, 0.0, 1.0);
	vec4 c_diff = clamp(diffuse * light.diffuse * material.diffuse, 0.0, 1.0);
	vec4 c_spec = clamp(spec * light.specular * material.specular, 0.0, 1.0);
  vec4 c_em = getBlurredText();

  vec4 color = (c_amb + c_diff + c_spec + c_em) * 0.25;

	return vec4(color.rgb, c_em.a);
}

vec4 calculateSpotLight(Light light, Material material, vec3 lightVec, vec3 normalVec, vec3 eyeVec) {
  if (angle(l2dir, lightVec) < 0.995) {
    lightVec = normalize(lightVec);
  	normalVec = normalize(normalVec);
  	eyeVec = normalize(eyeVec);

    vec4 c_amb  = clamp(light.ambient * material.ambient, 0.0, 1.0);
    vec4 c_em = getBlurredText();

    vec4 color = (c_amb + c_em) * 0.5;
    return vec4(color.rgb, c_em.a);
  } else {
    return calculateSimplePointLight(light, material, lightVec, normalVec, eyeVec);
  }
}

void main() {
	//TASK 2-3 use material uniform
	//TASK 3-2 use light uniform
	//TASK 5-6 use second light source
	gl_FragColor =
		calculateSimplePointLight(u_light, u_material, v_lightVec, v_normalVec, v_eyeVec)
		+ calculateSpotLight(u_light2, u_material, v_light2Vec, v_normalVec, v_eyeVec);
}
