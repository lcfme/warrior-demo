class Action {
  get currentSrc() {
    return this.imgList[this.at];
  }
  constructor(inst) {
    this.inst = inst;
    this._t = null;
    this.imgList = null;
    this.at = 0;
  }
  perform(onlyOnce) {
    clearInterval(this._t);
    this.at = 0;
    this._t = setInterval(() => {
      if (onlyOnce && this.at === this.imgList.length - 1) {
        this.stop();
        return;
      }
      this.at = (this.at + 1) % this.imgList.length;
      this.inst.setState({});
    }, 1000 / 16);
    this.isPerforming = true;
  }
  stop() {
    clearInterval(this._t);
    this.isPerforming = false;
  }
}

class DieAction extends Action {
  constructor(inst) {
    super(inst);
    this.imgList = [
      "img/_DIE_000.png",
      "img/_DIE_001.png",
      "img/_DIE_002.png",
      "img/_DIE_003.png",
      "img/_DIE_004.png",
      "img/_DIE_005.png",
      "img/_DIE_006.png"
    ];
  }
}

function __createInterval() {
  let t;
  return (fn, time) => {
    clearInterval(t);
    t = setInterval(() => {
      if (fn() === false) {
        clearInterval(t);
      }
    }, time);
    return () => {
      clearInterval(t);
    };
  };
}

const createInterval = __createInterval();

class WalkAction extends Action {
  constructor(inst) {
    super(inst);
    this.imgList = [
      "img/_WALK_000.png",
      "img/_WALK_001.png",
      "img/_WALK_002.png",
      "img/_WALK_003.png",
      "img/_WALK_004.png",
      "img/_WALK_005.png",
      "img/_WALK_006.png"
    ];
  }
}

class Warrior extends An.Component {
  constructor(props) {
    super(props);

    this.onClick = this.onClick.bind(this);
    this.dieAction = new DieAction(this);
    this.walkAction = new WalkAction(this);
    this.state = {
      x: 100,
      y: 100,
      currentAction: this.walkAction
    };
  }
  getCont(cont) {
    this._cont = cont;
  }
  getSprit(sprit) {
    this._sprit = sprit;
  }
  mounted() {
    this._cont.interactive = true;
    this._cont.hitArea = new PIXI.Rectangle(
      0,
      0,
      pixiApp.screen.width,
      pixiApp.screen.height
    );

    this._cont.on("pointerup", this.onClick);
  }
  onClick(e) {
    const x = e.data.global.x - this._sprit.width / 2;
    const y = e.data.global.y - this._sprit.height / 2;
    const dx = x - this.state.x;
    const dy = y - this.state.y;
    if (
      Math.abs(dx) > pixiApp.screen.width ||
      Math.abs(dy) > pixiApp.screen.width
    ) {
      if (this.state.currentAction !== this.dieAction) {
        this.setState({
          currentAction: this.dieAction
        });
      }
      this.dieAction.perform(true);
      return;
    }
    if (this.state.currentAction !== this.walkAction) {
      this.setState({
        currentAction: this.walkAction
      });
    }
    const times = 10;
    const ddx = dx / times;
    const ddy = dy / times;
    this.walkAction.perform();
    createInterval(() => {
      let xx = this.state.x;
      let yy = this.state.y;
      if (Math.floor(xx) !== Math.floor(x)) {
        xx += ddx;
      }
      if (Math.floor(yy) !== Math.floor(y)) {
        yy += ddy;
      }
      this.setState({
        x: xx,
        y: yy
      });
      if (
        Math.floor(xx) === Math.floor(x) &&
        Math.floor(yy) === Math.floor(y)
      ) {
        this.walkAction.stop();
        return false;
      }
    }, 1000 / 16);
  }
  render() {
    return An.createElement(
      PIXI.Container,
      {
        ref: this.getCont.bind(this)
      },
      An.createElement(PIXI.Sprite.from, {
        ref: this.getSprit.bind(this),
        initialize: [this.state.currentAction.currentSrc],
        interactive: true,
        onpointerup: e => {
          if (this.state.currentAction.isPerforming) {
            this.state.currentAction.stop();
          } else {
            this.state.currentAction.perform(true);
          }
        },
        noNew: true,
        x: this.state.x,
        y: this.state.y,
        height: 342.25 * ZOOM_RATE,
        width: 460.25 * ZOOM_RATE
      })
    );
  }
  destory() {
    debugger;
  }
}

const pixiApp = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  transparent: true
});

function loadImage(src) {
  return new Promise((r, j) => {
    var img = new Image();
    img.src = src;
    img.onload = () => {
      r(img);
    };
    img.onerror = err => {
      j(err);
    };
  });
}

const allRes = [
  "img/_DIE_000.png",
  "img/_DIE_001.png",
  "img/_DIE_002.png",
  "img/_DIE_003.png",
  "img/_DIE_004.png",
  "img/_DIE_005.png",
  "img/_DIE_006.png",
  "img/_WALK_000.png",
  "img/_WALK_001.png",
  "img/_WALK_002.png",
  "img/_WALK_003.png",
  "img/_WALK_004.png",
  "img/_WALK_005.png",
  "img/_WALK_006.png"
];

const loader = PIXI.Loader.shared;

allRes.forEach(k => {
  loader.add(k, k);
});

loader.load(() => {
  An.render(An.createElement(Warrior), pixiApp.stage);
});

document.body.appendChild(pixiApp.view);
