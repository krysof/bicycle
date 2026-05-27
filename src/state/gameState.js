export function createInitialState() {
  return {
    screen: "home",
    answers: {},
    config: null,
    route: [],
    delivered: [],
    player: { x: -4300, y: -2850, facing: 1, headingX: 0.65, headingY: 0.76, headingAngle: 0 },
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
