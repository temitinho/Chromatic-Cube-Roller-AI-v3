
import { ColorType } from './types';

export const GRID_SIZE = 5;
export const ROTATION_DURATION = 0.5; // seconds
export const START_POS: [number, number] = [2, 2];

export const ALL_COLORS: ColorType[] = [
  ColorType.GREEN,
  ColorType.RED,
  ColorType.BLUE,
  ColorType.YELLOW,
  ColorType.PINK,
  ColorType.WHITE
];

export const INITIAL_CUBE_FACES = {
  top: ColorType.WHITE,
  bottom: ColorType.PINK,
  front: ColorType.RED,
  back: ColorType.BLUE,
  left: ColorType.GREEN,
  right: ColorType.YELLOW
};
