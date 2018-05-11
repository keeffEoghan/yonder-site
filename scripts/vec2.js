import { vec2 } from 'gl-matrix';

import { atan2Circle } from './utils';

export const angleBetween = (v0, v1) =>
    atan2Circle(Math.atan2(v1[1], v1[0])-Math.atan2(v0[1], v0[0]));

export const angleDiffX = (v0, v1) =>
    atan2Circle(Math.atan2(v0[1]-v1[1], v0[0]-v1[0]));

export const polar = (out, [x, y], a, r) =>
    vec2.set(out, x+(r*Math.cos(a)), y+(r*Math.sin(a)));
