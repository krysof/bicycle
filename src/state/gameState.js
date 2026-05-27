export function createInitialState() {
  return {
    screen: "home",
    answers: {},
    config: null,
    route: [],
    delivered: [],
    player: { x: -4300, y: -2850, facing: 1, headingX: 0.78, headingY: 0.62, headingAngle: 0.67 },
    keys: new Set(),
    isPlaying: false,
    isPaused: false,
    message: "阿铃：今天见到你真高兴。",
    lastTime: performance.now(),
    floatTime: 0,
  };
}

export function currentTarget(state) {
  return state.route[state.delivered.length];
}
