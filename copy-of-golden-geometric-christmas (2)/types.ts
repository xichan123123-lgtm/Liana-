export enum AppState {
  TREE = 0,
  EXPLODED = 1,
  TEXT = 2
}

export interface ParticleData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}
