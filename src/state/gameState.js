export function createInitialState() {
  return {
    screen: "home",
    answers: {},
    config: null,
    route: [],
    delivered: [],
    player: { x: -350, y: 18, facing: 1 },
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
