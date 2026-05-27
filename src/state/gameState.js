export function createInitialState() {
  return {
    screen: "home",
    answers: {},
    config: null,
    route: [],
    delivered: [],
    player: { x: -4320, y: -3240, facing: 1, headingX: 1, headingY: 0, headingAngle: 0 },
    keys: new Set(),
    isPlaying: false,
    isPaused: false,
    message: "阿铃：今天见到你真高兴。",
    lastTime: performance.now(),
    floatTime: 0,
    delivery: null,
    comic: null,
    houseReaction: null,
    lastNavHintAt: -99,
  };
}

export function currentTarget(state) {
  return state.route[state.delivered.length];
}
