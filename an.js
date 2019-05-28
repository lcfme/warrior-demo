;(function(f) {
  // CommonJS
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f(require('pixi.js'));

  // RequireJS
  } else if (typeof define === "function" && define.amd) {
    define(['pixi.js'], f);

  // <script>
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      // works providing we're not in "use strict";
      // needed for Java 8 Nashorn
      g = this;
    }
    g.An = f(g.PIXI);
  }
})(function(PIXI) {
  if (!PIXI) {
    throw new Error('An.js requires pixi.js as peer dependency.');
  }
  return (function(f){return f()})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

var updator = require("./updator");

function Component(props) {
this.props = props;
}

Component.prototype.An = {};

Component.prototype.setState = function (o) {
this.state = Object.assign({}, this.state, o);
updator.update(this);
};

module.exports = Component;

},{"./updator":13}],2:[function(require,module,exports){
"use strict";

var lifycycle = require("./lifycycle");

var counter = 0;

function CompositeComponent(element) {
this.currentElement = element;
this.publicInstance = null;
this.renderedComponent = null;
this._id = counter++;
}

CompositeComponent.prototype.mount = function () {
var element = this.currentElement;
var props = element.props;
var type = element.type;
var publicInstance = new type(props);
publicInstance.props = props;
publicInstance.__instance__ = this;
this.publicInstance = publicInstance;

if (props.ref) {
  props.ref(publicInstance);
}

if (publicInstance.beforeMount) {
  publicInstance.beforeMount();
}

var renderedElement = publicInstance.render();
var renderedComponent = this.instantiateComponent(renderedElement);
this.renderedComponent = renderedComponent;
var pixiObj = renderedComponent.mount();

if (publicInstance.mounted) {
  lifycycle.mounted.enqueue(publicInstance.mounted.bind(publicInstance));
}

return pixiObj;
};

CompositeComponent.prototype.getPixiObj = function () {
return this.renderedComponent.getPixiObj() || null;
};

CompositeComponent.prototype.receive = function (element) {
var prevElement = this.currentElement;
var prevProps = prevElement.props;
var prevType = prevElement.type;
var publicInstance = this.publicInstance;
var prevRenderedComponent = this.renderedComponent;

if (prevType !== element.type) {
  this.unmount();
  this._dirty = false;
  return;
}

this.currentElement = element;

if (publicInstance.beforeUpdate) {
  publicInstance.beforeUpdate();
}

var props = element.props;
publicInstance.props = props;
var nextRenderedElement = publicInstance.render();

if (nextRenderedElement.type !== prevRenderedComponent.currentElement.type) {
  var prevRenderedComponentPixiObj = prevRenderedComponent.getPixiObj();
  var prevRenderedComponentPixiObjParent = prevRenderedComponentPixiObj.parent;
  prevRenderedComponent.unmount();

  if (prevRenderedComponentPixiObjParent) {
    prevRenderedComponentPixiObjParent.removeChild(prevRenderedComponentPixiObj);
  }

  var nextRenderedComponent = this.instantiateComponent(nextRenderedElement);
  var nextRenderedComponentPixiObj = nextRenderedComponent.mount();
  prevRenderedComponentPixiObjParent.addChild(nextRenderedComponentPixiObj);
  this.renderedComponent = nextRenderedComponent;

  if (publicInstance.updated) {
    publicInstance.updated();
  }

  this._dirty = false;
  return;
}

prevRenderedComponent.receive(nextRenderedElement);

if (publicInstance.updated) {
  publicInstance.updated();
}

this._dirty = false;
};

CompositeComponent.prototype.unmount = function () {
var publicInstance = this.publicInstance;
var renderedComponent = this.renderedComponent;
var element = this.currentElement;
var props = element.props;

if (props.ref) {
  props.ref(null);
}

if (publicInstance.willUnmount) {
  publicInstance.willUnmount();
}

renderedComponent.unmount();
};

module.exports = CompositeComponent;

},{"./lifycycle":9}],3:[function(require,module,exports){
"use strict";

function isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _construct(Parent, args, Class) { if (isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var forEachProps = require("./forEachProps");

function NativeComponent(element) {
this.currentElement = element;
this.pixiObj = null;
this.renderedChildren = null;
this._listeners = null;
}

NativeComponent.prototype.mount = function () {
var element = this.currentElement;
var type = element.type;
var props = element.props;
var children = props.children;
var initialize = props.initialize ? props.initialize.slice() : [];
var pixiObj;

if (props.noNew) {
  pixiObj = type.apply(null, initialize);
} else {
  pixiObj = _construct(type, initialize);
}

if (props.ref) {
  props.ref(pixiObj);
}

for (var prop in props) {
  if (/^on([\S\S]+)/i.test(prop)) {
    var listenerName = prop.match(/^on([\S\S]+)/)[1].toLowerCase();
    var listenerFn = props[prop];
    pixiObj.on(listenerName, listenerFn);
    (this._listeners || (this._listeners = [])).push([listenerName, listenerFn]);
  }
}

forEachProps(props, function (k, v) {
  pixiObj[k] = v;
});
this.pixiObj = pixiObj;

if (children && children.length) {
  var renderedChildren = [];

  for (var i = 0, l = children.length; i < l; i++) {
    var child = this.instantiateComponent(children[i]);
    var childPixiObj = child.mount();
    pixiObj.addChild(childPixiObj);
    renderedChildren.push(child);
  }

  this.renderedChildren = renderedChildren;
}

return pixiObj;
};

NativeComponent.prototype.receive = function (element) {
var prevElement = this.currentElement;
var prevType = prevElement.type;
var prevProps = prevElement.props;
var type = element.type;

if (prevProps.initialize || prevType !== type) {
  this.unmount();
  return;
}

this.currentElement = element;
this.update();
};

NativeComponent.prototype.update = function () {
var element = this.currentElement;
var props = element.props;
var children = props.children || [];
var pixiObj = this.pixiObj;
var prevRenderedChildren = this.renderedChildren || [];
forEachProps(props, function (k, v) {
  pixiObj[k] = v;
});
var nextRenderedChildren = [];

for (var i = 0; i < children.length; i++) {
  var nextChildElement = children[i];
  var prevChild = prevRenderedChildren[i];

  if (!prevChild) {
    var nextChild = this.instantiateComponent(nextChildElement);
    var nextPixiObj = nextChild.mount();
    nextRenderedChildren.push(nextChild);
    pixiObj.addChild(nextPixiObj);
    continue;
  }

  var shoudUseUpdate = !nextChildElement.props.initialize && prevChild.currentElement.type === nextChildElement.type;

  if (!shoudUseUpdate) {
    var prevChildPixiObj = prevChild.getPixiObj();
    prevChild.unmount();

    if (prevChildPixiObj.parent) {
      prevChildPixiObj.parent.removeChild(prevChildPixiObj);
    }

    var _nextChild = this.instantiateComponent(nextChildElement);

    var nextChildPixiObj = _nextChild.mount();

    nextRenderedChildren.push(_nextChild);
    pixiObj.addChild(nextChildPixiObj);
    continue;
  }

  prevChild.receive(nextChildElement);
  nextRenderedChildren.push(prevChild);
}

for (var j = nextRenderedChildren.length; j < prevRenderedChildren.length; j++) {
  var _prevChild = prevRenderedChildren[j];

  var _prevChildPixiObj = _prevChild.getPixiObj();

  _prevChild.unmount();

  if (_prevChildPixiObj.parent) {
    _prevChildPixiObj.parent.removeChild(_prevChildPixiObj);
  }
}

this.renderedChildren = nextRenderedChildren;
};

NativeComponent.prototype.getPixiObj = function () {
return this.pixiObj || null;
};

NativeComponent.prototype.unmount = function () {
var element = this.currentElement;
var props = element.props;

if (props.ref) {
  props.ref(null);
}

if (this._listeners && this._listeners.length) {
  for (var i = this._listeners.length; i--;) {
    this.pixiObj.off(this._listeners[i][0], this._listeners[i][1]);
  }
}

this.pixiObj.destroy();
};

module.exports = NativeComponent;

},{"./forEachProps":7}],4:[function(require,module,exports){
"use strict";

var PIXI = require('./pixijsUMDShim.js');

exports.createElement = require("./createElement");
exports.Component = require("./Component");
exports.render = require("./render");

require("./pixiInjection").inject(PIXI);

},{"./Component":1,"./createElement":6,"./pixiInjection":10,"./pixijsUMDShim.js":11,"./render":12}],5:[function(require,module,exports){
"use strict";

function CallbackQueue() {
var arr = null;

function reset() {
  (arr = arr || []).length = 0;
}

function _flush(i) {
  var errThown;
  arr = arr ? arr.slice() : [];

  try {
    errThown = true;

    for (i !== undefined ? i : 0; i < arr.length; i++) {
      var item = arr[i];
      var fn = item[0];
      var ctx = item[1];
      var args = item[2];
      fn.apply(ctx, args);
    }

    errThown = false;
  } finally {
    if (errThown) {
      _flush(i + 1);
    } else {
      reset();
    }
  }
}

return {
  reset: reset,
  enqueue: function enqueue(fn, context) {
    var args = [].slice.call(arguments, 2);
    arr = arr || [];
    arr.push([fn, context, args]);
  },
  flush: function flush() {
    _flush(0);
  }
};
}

exports = module.exports = CallbackQueue;

},{}],6:[function(require,module,exports){
"use strict";

function createElement(type, props) {
props = Object.assign({}, props);

if (arguments.length > 2) {
  var children = [].slice.call(arguments, 2);
  props.children = children;
}

return {
  type: type,
  props: props,
  $$typeof: "An"
};
}

module.exports = createElement;

},{}],7:[function(require,module,exports){
"use strict";

function forEachProps(props, cb) {
var keys = Object.keys(props);

for (var i = keys.length; i--;) {
  var key = keys[i];

  if (key === "children" || key === "initialize" || /^on/.test(key)) {
    continue;
  }

  var prop = props[key];
  cb(key, prop);
}
}

module.exports = forEachProps;

},{}],8:[function(require,module,exports){
"use strict";

var CompositeComponent = require("./CompositeComponent");

var NativeComponent = require("./NativeComponent");

var Component = require("./Component");

CompositeComponent.prototype.instantiateComponent = instantiateComponent;
NativeComponent.prototype.instantiateComponent = instantiateComponent;

function instantiateComponent(element) {
if (element.type.prototype.An === Component.prototype.An) {
  return new CompositeComponent(element);
} else {
  return new NativeComponent(element);
}
}

module.exports = instantiateComponent;

},{"./Component":1,"./CompositeComponent":2,"./NativeComponent":3}],9:[function(require,module,exports){
"use strict";

var Cbq = require("./cbq");

module.exports = {
mounted: Cbq()
};

},{"./cbq":5}],10:[function(require,module,exports){
"use strict";

var pixi = null;

exports.inject = function inject(_pixi) {
pixi = _pixi;
};

exports.getPixi = function getPixi() {
return pixi;
};

},{}],11:[function(require,module,exports){
"use strict";

module.exports = PIXI;

},{}],12:[function(require,module,exports){
"use strict";

var instantiateComponent = require("./instantiateComponent");

var lifycycle = require("./lifycycle");

var getPixi = require("./pixiInjection").getPixi;

function render(element, displayContObj) {
if (displayContObj.__An_Instance__) {
  displayContObj.__An_Instance__.unmount();
}

lifycycle.mounted.reset();
var component = instantiateComponent(element);
var pixiObj = component.mount();
displayContObj.addChild(pixiObj);
lifycycle.mounted.flush();
displayContObj.__An_Instance__ = component;
return pixiObj;
}

module.exports = render;

},{"./instantiateComponent":8,"./lifycycle":9,"./pixiInjection":10}],13:[function(require,module,exports){
"use strict";

var dirtyComponents = [];

function update(compo) {
compo.__instance__._dirty = true;
dirtyComponents.push(compo.__instance__);
updateDirtyComponents();
}

var updateDirtyComponents = debounce(function () {
dirtyComponents.sort(function (a, b) {
  return a._id - b._id;
});
var cc;

while (cc = dirtyComponents.shift()) {
  if (!cc._dirty) {
    return;
  }

  cc.receive(cc.currentElement);
}
});

function debounce(fn, delay) {
var t;
return function () {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  clearTimeout(t);
  t = setTimeout(function () {
    fn.apply(void 0, args);
  }, delay);
};
}

exports.update = update;

},{}]},{},[4])(4)
});

});
