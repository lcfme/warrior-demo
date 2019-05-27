class DieAction {
  get currentSrc() {
    return this.imgList[this.at];
  }
  constructor(inst) {
    this.inst = inst;
    this._t = null;
    this.imgList = [
      "img/_DIE_000.png",
      "img/_DIE_001.png",
      "img/_DIE_002.png",
      "img/_DIE_003.png",
      "img/_DIE_004.png",
      "img/_DIE_005.png",
      "img/_DIE_006.png"
    ];
    this.at = 0;
  }
  perform() {
    clearInterval(this._t);
    this.at = 0;
    this._t = setInterval(() => {
      this.at = (this.at + 1) % this.imgList.length;
      this.inst.setState({});
    }, 1000 / 6);
    this.isPerforming = true;
  }
  stop() {
    clearInterval(this._t);
    this.isPerforming = false;
  }
}

class Warrior extends An.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.dieAction = new DieAction(this);
    this.dieAction.perform();
  }
  render() {
    return An.createElement(
      PIXI.Container,
      null,
      An.createElement(PIXI.Sprite.from, {
        initialize: [this.dieAction.currentSrc],
        interactive: true,
        onpointerup: () => {
          if (this.dieAction.isPerforming) {
            this.dieAction.stop();
          } else {
            this.dieAction.perform();
          }
        },
        noNew: true,
        x: 10,
        y: 10,
        height: 342.25 * ZOOM_RATE,
        width: 460.25 * ZOOM_RATE
      })
    );
  }
}

const pixiApp = An.render(An.createElement(Warrior), {
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0xf8f8f8
});
document.body.appendChild(pixiApp.view);
