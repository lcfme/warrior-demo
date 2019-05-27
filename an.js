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
  this.currentElement = element;

  if (prevProps.initialize || prevType !== type) {
    this.unmount();
  } else {
    this.update();
  }
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

function render(element, options) {
  if (options === void 0) {
    options = {};
  }

  var _PIXI = getPixi();

  var pixiApp = new _PIXI.Application(options);
  lifycycle.mounted.reset();
  var component = instantiateComponent(element);
  var pixiObj = component.mount();
  pixiApp.stage.addChild(pixiObj);
  lifycycle.mounted.flush();
  pixiApp.__An_Instance__ = component;
  return pixiApp;
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQ29tcG9uZW50LmpzIiwic3JjL0NvbXBvc2l0ZUNvbXBvbmVudC5qcyIsInNyYy9OYXRpdmVDb21wb25lbnQuanMiLCJzcmMvYW4uanMiLCJzcmMvY2JxLmpzIiwic3JjL2NyZWF0ZUVsZW1lbnQuanMiLCJzcmMvZm9yRWFjaFByb3BzLmpzIiwic3JjL2luc3RhbnRpYXRlQ29tcG9uZW50LmpzIiwic3JjL2xpZnljeWNsZS5qcyIsInNyYy9waXhpSW5qZWN0aW9uLmpzIiwic3JjL3BpeGlqc1VNRFNoaW0uanMiLCJzcmMvcmVuZGVyLmpzIiwic3JjL3VwZGF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxXQUFELENBQXZCOztBQUNBLFNBQVMsU0FBVCxDQUFtQixLQUFuQixFQUEwQjtBQUN4QixPQUFLLEtBQUwsR0FBYSxLQUFiO0FBQ0Q7O0FBRUQsU0FBUyxDQUFDLFNBQVYsQ0FBb0IsRUFBcEIsR0FBeUIsRUFBekI7O0FBRUEsU0FBUyxDQUFDLFNBQVYsQ0FBb0IsUUFBcEIsR0FBK0IsVUFBUyxDQUFULEVBQVk7QUFDekMsT0FBSyxLQUFMLEdBQWEsTUFBTSxDQUFDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCLEtBQUssS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBYjtBQUNBLEVBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxJQUFmO0FBQ0QsQ0FIRDs7QUFLQSxNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFqQjs7Ozs7QUNaQSxJQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsYUFBRCxDQUF6Qjs7QUFFQSxJQUFJLE9BQU8sR0FBRyxDQUFkOztBQUNBLFNBQVMsa0JBQVQsQ0FBNEIsT0FBNUIsRUFBcUM7QUFDbkMsT0FBSyxjQUFMLEdBQXNCLE9BQXRCO0FBQ0EsT0FBSyxjQUFMLEdBQXNCLElBQXRCO0FBQ0EsT0FBSyxp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Q0FBQyxPQUFQLEdBQWlCLE1BQWpCOzs7OztBQ2pCQSxJQUFNLGVBQWUsR0FBRyxFQUF4Qjs7QUFFQSxTQUFTLE1BQVQsQ0FBZ0IsS0FBaEIsRUFBdUI7QUFDckIsRUFBQSxLQUFLLENBQUMsWUFBTixDQUFtQixNQUFuQixHQUE0QixJQUE1QjtBQUNBLEVBQUEsZUFBZSxDQUFDLElBQWhCLENBQXFCLEtBQUssQ0FBQyxZQUEzQjtBQUNBLEVBQUEscUJBQXFCO0FBQ3RCOztBQUVELElBQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLFlBQVc7QUFDaEQsRUFBQSxlQUFlLENBQUMsSUFBaEIsQ0FBcUIsVUFBQyxDQUFELEVBQUksQ0FBSixFQUFVO0FBQzdCLFdBQU8sQ0FBQyxDQUFDLEdBQUYsR0FBUSxDQUFDLENBQUMsR0FBakI7QUFDRCxHQUZEO0FBR0EsTUFBSSxFQUFKOztBQUNBLFNBQVEsRUFBRSxHQUFHLGVBQWUsQ0FBQyxLQUFoQixFQUFiLEVBQXVDO0FBQ3JDLFFBQUksQ0FBQyxFQUFFLENBQUMsTUFBUixFQUFnQjtBQUNkO0FBQ0Q7O0FBQ0QsSUFBQSxFQUFFLENBQUMsT0FBSCxDQUFXLEVBQUUsQ0FBQyxjQUFkO0FBQ0Q7QUFDRixDQVhxQyxDQUF0Qzs7QUFhQSxTQUFTLFFBQVQsQ0FBa0IsRUFBbEIsRUFBc0IsS0FBdEIsRUFBNkI7QUFDM0IsTUFBSSxDQUFKO0FBQ0EsU0FBTyxZQUFhO0FBQUEsc0NBQVQsSUFBUztBQUFULE1BQUEsSUFBUztBQUFBOztBQUNsQixJQUFBLFlBQVksQ0FBQyxDQUFELENBQVo7QUFDQSxJQUFBLENBQUMsR0FBRyxVQUFVLENBQUMsWUFBTTtBQUNuQixNQUFBLEVBQUUsTUFBRixTQUFNLElBQU47QUFDRCxLQUZhLEVBRVgsS0FGVyxDQUFkO0FBR0QsR0FMRDtBQU1EOztBQUVELE9BQU8sQ0FBQyxNQUFSLEdBQWlCLE1BQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiY29uc3QgdXBkYXRvciA9IHJlcXVpcmUoXCIuL3VwZGF0b3JcIik7XG5mdW5jdGlvbiBDb21wb25lbnQocHJvcHMpIHtcbiAgdGhpcy5wcm9wcyA9IHByb3BzO1xufVxuXG5Db21wb25lbnQucHJvdG90eXBlLkFuID0ge307XG5cbkNvbXBvbmVudC5wcm90b3R5cGUuc2V0U3RhdGUgPSBmdW5jdGlvbihvKSB7XG4gIHRoaXMuc3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnN0YXRlLCBvKTtcbiAgdXBkYXRvci51cGRhdGUodGhpcyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDtcbiIsImNvbnN0IGxpZnljeWNsZSA9IHJlcXVpcmUoXCIuL2xpZnljeWNsZVwiKTtcblxubGV0IGNvdW50ZXIgPSAwO1xuZnVuY3Rpb24gQ29tcG9zaXRlQ29tcG9uZW50KGVsZW1lbnQpIHtcbiAgdGhpcy5jdXJyZW50RWxlbWVudCA9IGVsZW1lbnQ7XG4gIHRoaXMucHVibGljSW5zdGFuY2UgPSBudWxsO1xuICB0aGlzLnJlbmRlcmVkQ29tcG9uZW50ID0gbnVsbDtcbiAgdGhpcy5faWQgPSBjb3VudGVyKys7XG59XG5cbkNvbXBvc2l0ZUNvbXBvbmVudC5wcm90b3R5cGUubW91bnQgPSBmdW5jdGlvbigpIHtcbiAgY29uc3QgZWxlbWVudCA9IHRoaXMuY3VycmVudEVsZW1lbnQ7XG4gIGNvbnN0IHByb3BzID0gZWxlbWVudC5wcm9wcztcbiAgY29uc3QgdHlwZSA9IGVsZW1lbnQudHlwZTtcbiAgY29uc3QgcHVibGljSW5zdGFuY2UgPSBuZXcgdHlwZShwcm9wcyk7XG4gIHB1YmxpY0luc3RhbmNlLnByb3BzID0gcHJvcHM7XG4gIHB1YmxpY0luc3RhbmNlLl9faW5zdGFuY2VfXyA9IHRoaXM7XG4gIHRoaXMucHVibGljSW5zdGFuY2UgPSBwdWJsaWNJbnN0YW5jZTtcbiAgaWYgKHB1YmxpY0luc3RhbmNlLmJlZm9yZU1vdW50KSB7XG4gICAgcHVibGljSW5zdGFuY2UuYmVmb3JlTW91bnQoKTtcbiAgfVxuICBjb25zdCByZW5kZXJlZEVsZW1lbnQgPSBwdWJsaWNJbnN0YW5jZS5yZW5kZXIoKTtcblxuICBjb25zdCByZW5kZXJlZENvbXBvbmVudCA9IHRoaXMuaW5zdGFudGlhdGVDb21wb25lbnQocmVuZGVyZWRFbGVtZW50KTtcbiAgdGhpcy5yZW5kZXJlZENvbXBvbmVudCA9IHJlbmRlcmVkQ29tcG9uZW50O1xuICBjb25zdCBwaXhpT2JqID0gcmVuZGVyZWRDb21wb25lbnQubW91bnQoKTtcbiAgaWYgKHB1YmxpY0luc3RhbmNlLm1vdW50ZWQpIHtcbiAgICBsaWZ5Y3ljbGUubW91bnRlZC5lbnF1ZXVlKHB1YmxpY0luc3RhbmNlLm1vdW50ZWQuYmluZChwdWJsaWNJbnN0YW5jZSkpO1xuICB9XG4gIHJldHVybiBwaXhpT2JqO1xufTtcblxuQ29tcG9zaXRlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRQaXhpT2JqID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnJlbmRlcmVkQ29tcG9uZW50LmdldFBpeGlPYmooKSB8fCBudWxsO1xufTtcblxuQ29tcG9zaXRlQ29tcG9uZW50LnByb3RvdHlwZS5yZWNlaXZlID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICBjb25zdCBwcmV2RWxlbWVudCA9IHRoaXMuY3VycmVudEVsZW1lbnQ7XG4gIGNvbnN0IHByZXZQcm9wcyA9IHByZXZFbGVtZW50LnByb3BzO1xuICBjb25zdCBwcmV2VHlwZSA9IHByZXZFbGVtZW50LnR5cGU7XG4gIGNvbnN0IHB1YmxpY0luc3RhbmNlID0gdGhpcy5wdWJsaWNJbnN0YW5jZTtcbiAgY29uc3QgcHJldlJlbmRlcmVkQ29tcG9uZW50ID0gdGhpcy5yZW5kZXJlZENvbXBvbmVudDtcbiAgaWYgKHByZXZUeXBlICE9PSBlbGVtZW50LnR5cGUpIHtcbiAgICB0aGlzLnVubW91bnQoKTtcbiAgICB0aGlzLl9kaXJ0eSA9IGZhbHNlO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAocHVibGljSW5zdGFuY2UuYmVmb3JlVXBkYXRlKSB7XG4gICAgcHVibGljSW5zdGFuY2UuYmVmb3JlVXBkYXRlKCk7XG4gIH1cbiAgY29uc3QgcHJvcHMgPSBlbGVtZW50LnByb3BzO1xuICBwdWJsaWNJbnN0YW5jZS5wcm9wcyA9IHByb3BzO1xuICBjb25zdCBuZXh0UmVuZGVyZWRFbGVtZW50ID0gcHVibGljSW5zdGFuY2UucmVuZGVyKCk7XG4gIGlmIChuZXh0UmVuZGVyZWRFbGVtZW50LnR5cGUgIT09IHByZXZSZW5kZXJlZENvbXBvbmVudC5jdXJyZW50RWxlbWVudC50eXBlKSB7XG4gICAgY29uc3QgcHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9iaiA9IHByZXZSZW5kZXJlZENvbXBvbmVudC5nZXRQaXhpT2JqKCk7XG4gICAgY29uc3QgcHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9ialBhcmVudCA9XG4gICAgICBwcmV2UmVuZGVyZWRDb21wb25lbnRQaXhpT2JqLnBhcmVudDtcblxuICAgIHByZXZSZW5kZXJlZENvbXBvbmVudC51bm1vdW50KCk7XG5cbiAgICBpZiAocHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9ialBhcmVudCkge1xuICAgICAgcHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9ialBhcmVudC5yZW1vdmVDaGlsZChcbiAgICAgICAgcHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9ialxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgbmV4dFJlbmRlcmVkQ29tcG9uZW50ID0gdGhpcy5pbnN0YW50aWF0ZUNvbXBvbmVudChcbiAgICAgIG5leHRSZW5kZXJlZEVsZW1lbnRcbiAgICApO1xuICAgIGNvbnN0IG5leHRSZW5kZXJlZENvbXBvbmVudFBpeGlPYmogPSBuZXh0UmVuZGVyZWRDb21wb25lbnQubW91bnQoKTtcbiAgICBwcmV2UmVuZGVyZWRDb21wb25lbnRQaXhpT2JqUGFyZW50LmFkZENoaWxkKG5leHRSZW5kZXJlZENvbXBvbmVudFBpeGlPYmopO1xuICAgIHRoaXMucmVuZGVyZWRDb21wb25lbnQgPSBuZXh0UmVuZGVyZWRDb21wb25lbnQ7XG5cbiAgICBpZiAocHVibGljSW5zdGFuY2UudXBkYXRlZCkge1xuICAgICAgcHVibGljSW5zdGFuY2UudXBkYXRlZCgpO1xuICAgIH1cbiAgICB0aGlzLl9kaXJ0eSA9IGZhbHNlO1xuICAgIHJldHVybjtcbiAgfVxuICBwcmV2UmVuZGVyZWRDb21wb25lbnQucmVjZWl2ZShuZXh0UmVuZGVyZWRFbGVtZW50KTtcbiAgaWYgKHB1YmxpY0luc3RhbmNlLnVwZGF0ZWQpIHtcbiAgICBwdWJsaWNJbnN0YW5jZS51cGRhdGVkKCk7XG4gIH1cbiAgdGhpcy5fZGlydHkgPSBmYWxzZTtcbn07XG5cbkNvbXBvc2l0ZUNvbXBvbmVudC5wcm90b3R5cGUudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICBjb25zdCBwdWJsaWNJbnN0YW5jZSA9IHRoaXMucHVibGljSW5zdGFuY2U7XG4gIGNvbnN0IHJlbmRlcmVkQ29tcG9uZW50ID0gdGhpcy5yZW5kZXJlZENvbXBvbmVudDtcblxuICBpZiAocHVibGljSW5zdGFuY2Uud2lsbFVubW91bnQpIHtcbiAgICBwdWJsaWNJbnN0YW5jZS53aWxsVW5tb3VudCgpO1xuICB9XG4gIHJlbmRlcmVkQ29tcG9uZW50LnVubW91bnQoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9zaXRlQ29tcG9uZW50O1xuIiwiY29uc3QgZm9yRWFjaFByb3BzID0gcmVxdWlyZShcIi4vZm9yRWFjaFByb3BzXCIpO1xuXG5mdW5jdGlvbiBOYXRpdmVDb21wb25lbnQoZWxlbWVudCkge1xuICB0aGlzLmN1cnJlbnRFbGVtZW50ID0gZWxlbWVudDtcbiAgdGhpcy5waXhpT2JqID0gbnVsbDtcbiAgdGhpcy5yZW5kZXJlZENoaWxkcmVuID0gbnVsbDtcbiAgdGhpcy5fbGlzdGVuZXJzID0gbnVsbDtcbn1cblxuTmF0aXZlQ29tcG9uZW50LnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICBjb25zdCBlbGVtZW50ID0gdGhpcy5jdXJyZW50RWxlbWVudDtcbiAgY29uc3QgdHlwZSA9IGVsZW1lbnQudHlwZTtcbiAgY29uc3QgcHJvcHMgPSBlbGVtZW50LnByb3BzO1xuICBjb25zdCBjaGlsZHJlbiA9IHByb3BzLmNoaWxkcmVuO1xuICBjb25zdCBpbml0aWFsaXplID0gcHJvcHMuaW5pdGlhbGl6ZSA/IHByb3BzLmluaXRpYWxpemUuc2xpY2UoKSA6IFtdO1xuXG4gIGxldCBwaXhpT2JqO1xuICBpZiAocHJvcHMubm9OZXcpIHtcbiAgICBwaXhpT2JqID0gdHlwZS5hcHBseShudWxsLCBpbml0aWFsaXplKTtcbiAgfSBlbHNlIHtcbiAgICBwaXhpT2JqID0gbmV3IHR5cGUoLi4uaW5pdGlhbGl6ZSk7XG4gIH1cbiAgZm9yIChsZXQgcHJvcCBpbiBwcm9wcykge1xuICAgIGlmICgvXm9uKFtcXFNcXFNdKykvaS50ZXN0KHByb3ApKSB7XG4gICAgICBjb25zdCBsaXN0ZW5lck5hbWUgPSBwcm9wLm1hdGNoKC9eb24oW1xcU1xcU10rKS8pWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICBjb25zdCBsaXN0ZW5lckZuID0gcHJvcHNbcHJvcF07XG4gICAgICBwaXhpT2JqLm9uKGxpc3RlbmVyTmFtZSwgbGlzdGVuZXJGbik7XG4gICAgICAodGhpcy5fbGlzdGVuZXJzIHx8ICh0aGlzLl9saXN0ZW5lcnMgPSBbXSkpLnB1c2goW1xuICAgICAgICBsaXN0ZW5lck5hbWUsXG4gICAgICAgIGxpc3RlbmVyRm5cbiAgICAgIF0pO1xuICAgIH1cbiAgfVxuXG4gIGZvckVhY2hQcm9wcyhwcm9wcywgKGssIHYpID0+IHtcbiAgICBwaXhpT2JqW2tdID0gdjtcbiAgfSk7XG5cbiAgdGhpcy5waXhpT2JqID0gcGl4aU9iajtcblxuICBpZiAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgY29uc3QgcmVuZGVyZWRDaGlsZHJlbiA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBjb25zdCBjaGlsZCA9IHRoaXMuaW5zdGFudGlhdGVDb21wb25lbnQoY2hpbGRyZW5baV0pO1xuICAgICAgY29uc3QgY2hpbGRQaXhpT2JqID0gY2hpbGQubW91bnQoKTtcbiAgICAgIHBpeGlPYmouYWRkQ2hpbGQoY2hpbGRQaXhpT2JqKTtcbiAgICAgIHJlbmRlcmVkQ2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyZWRDaGlsZHJlbiA9IHJlbmRlcmVkQ2hpbGRyZW47XG4gIH1cblxuICByZXR1cm4gcGl4aU9iajtcbn07XG5cbk5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUucmVjZWl2ZSA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgY29uc3QgcHJldkVsZW1lbnQgPSB0aGlzLmN1cnJlbnRFbGVtZW50O1xuICBjb25zdCBwcmV2VHlwZSA9IHByZXZFbGVtZW50LnR5cGU7XG4gIGNvbnN0IHByZXZQcm9wcyA9IHByZXZFbGVtZW50LnByb3BzO1xuICBjb25zdCB0eXBlID0gZWxlbWVudC50eXBlO1xuICB0aGlzLmN1cnJlbnRFbGVtZW50ID0gZWxlbWVudDtcbiAgaWYgKHByZXZQcm9wcy5pbml0aWFsaXplIHx8IHByZXZUeXBlICE9PSB0eXBlKSB7XG4gICAgdGhpcy51bm1vdW50KCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy51cGRhdGUoKTtcbiAgfVxufTtcblxuTmF0aXZlQ29tcG9uZW50LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgY29uc3QgZWxlbWVudCA9IHRoaXMuY3VycmVudEVsZW1lbnQ7XG4gIGNvbnN0IHByb3BzID0gZWxlbWVudC5wcm9wcztcbiAgY29uc3QgY2hpbGRyZW4gPSBwcm9wcy5jaGlsZHJlbiB8fCBbXTtcbiAgY29uc3QgcGl4aU9iaiA9IHRoaXMucGl4aU9iajtcbiAgY29uc3QgcHJldlJlbmRlcmVkQ2hpbGRyZW4gPSB0aGlzLnJlbmRlcmVkQ2hpbGRyZW4gfHwgW107XG5cbiAgZm9yRWFjaFByb3BzKHByb3BzLCAoaywgdikgPT4ge1xuICAgIHBpeGlPYmpba10gPSB2O1xuICB9KTtcblxuICBjb25zdCBuZXh0UmVuZGVyZWRDaGlsZHJlbiA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgbmV4dENoaWxkRWxlbWVudCA9IGNoaWxkcmVuW2ldO1xuICAgIGNvbnN0IHByZXZDaGlsZCA9IHByZXZSZW5kZXJlZENoaWxkcmVuW2ldO1xuICAgIGlmICghcHJldkNoaWxkKSB7XG4gICAgICBjb25zdCBuZXh0Q2hpbGQgPSB0aGlzLmluc3RhbnRpYXRlQ29tcG9uZW50KG5leHRDaGlsZEVsZW1lbnQpO1xuICAgICAgY29uc3QgbmV4dFBpeGlPYmogPSBuZXh0Q2hpbGQubW91bnQoKTtcbiAgICAgIG5leHRSZW5kZXJlZENoaWxkcmVuLnB1c2gobmV4dENoaWxkKTtcbiAgICAgIHBpeGlPYmouYWRkQ2hpbGQobmV4dFBpeGlPYmopO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHNob3VkVXNlVXBkYXRlID1cbiAgICAgICFuZXh0Q2hpbGRFbGVtZW50LnByb3BzLmluaXRpYWxpemUgJiZcbiAgICAgIHByZXZDaGlsZC5jdXJyZW50RWxlbWVudC50eXBlID09PSBuZXh0Q2hpbGRFbGVtZW50LnR5cGU7XG4gICAgaWYgKCFzaG91ZFVzZVVwZGF0ZSkge1xuICAgICAgY29uc3QgcHJldkNoaWxkUGl4aU9iaiA9IHByZXZDaGlsZC5nZXRQaXhpT2JqKCk7XG4gICAgICBwcmV2Q2hpbGQudW5tb3VudCgpO1xuICAgICAgaWYgKHByZXZDaGlsZFBpeGlPYmoucGFyZW50KSB7XG4gICAgICAgIHByZXZDaGlsZFBpeGlPYmoucGFyZW50LnJlbW92ZUNoaWxkKHByZXZDaGlsZFBpeGlPYmopO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV4dENoaWxkID0gdGhpcy5pbnN0YW50aWF0ZUNvbXBvbmVudChuZXh0Q2hpbGRFbGVtZW50KTtcbiAgICAgIGNvbnN0IG5leHRDaGlsZFBpeGlPYmogPSBuZXh0Q2hpbGQubW91bnQoKTtcbiAgICAgIG5leHRSZW5kZXJlZENoaWxkcmVuLnB1c2gobmV4dENoaWxkKTtcbiAgICAgIHBpeGlPYmouYWRkQ2hpbGQobmV4dENoaWxkUGl4aU9iaik7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgcHJldkNoaWxkLnJlY2VpdmUobmV4dENoaWxkRWxlbWVudCk7XG4gICAgbmV4dFJlbmRlcmVkQ2hpbGRyZW4ucHVzaChwcmV2Q2hpbGQpO1xuICB9XG5cbiAgZm9yIChcbiAgICBsZXQgaiA9IG5leHRSZW5kZXJlZENoaWxkcmVuLmxlbmd0aDtcbiAgICBqIDwgcHJldlJlbmRlcmVkQ2hpbGRyZW4ubGVuZ3RoO1xuICAgIGorK1xuICApIHtcbiAgICBjb25zdCBwcmV2Q2hpbGQgPSBwcmV2UmVuZGVyZWRDaGlsZHJlbltqXTtcbiAgICBjb25zdCBwcmV2Q2hpbGRQaXhpT2JqID0gcHJldkNoaWxkLmdldFBpeGlPYmooKTtcbiAgICBwcmV2Q2hpbGQudW5tb3VudCgpO1xuICAgIGlmIChwcmV2Q2hpbGRQaXhpT2JqLnBhcmVudCkge1xuICAgICAgcHJldkNoaWxkUGl4aU9iai5wYXJlbnQucmVtb3ZlQ2hpbGQocHJldkNoaWxkUGl4aU9iaik7XG4gICAgfVxuICB9XG4gIHRoaXMucmVuZGVyZWRDaGlsZHJlbiA9IG5leHRSZW5kZXJlZENoaWxkcmVuO1xufTtcblxuTmF0aXZlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRQaXhpT2JqID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnBpeGlPYmogfHwgbnVsbDtcbn07XG5cbk5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fbGlzdGVuZXJzICYmIHRoaXMuX2xpc3RlbmVycy5sZW5ndGgpIHtcbiAgICBmb3IgKGxldCBpID0gdGhpcy5fbGlzdGVuZXJzLmxlbmd0aDsgaS0tOyApIHtcbiAgICAgIHRoaXMucGl4aU9iai5vZmYodGhpcy5fbGlzdGVuZXJzW2ldWzBdLCB0aGlzLl9saXN0ZW5lcnNbaV1bMV0pO1xuICAgIH1cbiAgfVxuICB0aGlzLnBpeGlPYmouZGVzdHJveSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOYXRpdmVDb21wb25lbnQ7XG4iLCJjb25zdCBQSVhJID0gcmVxdWlyZSgnLi9waXhpanNVTURTaGltLmpzJyk7XG5leHBvcnRzLmNyZWF0ZUVsZW1lbnQgPSByZXF1aXJlKFwiLi9jcmVhdGVFbGVtZW50XCIpO1xuZXhwb3J0cy5Db21wb25lbnQgPSByZXF1aXJlKFwiLi9Db21wb25lbnRcIik7XG5leHBvcnRzLnJlbmRlciA9IHJlcXVpcmUoXCIuL3JlbmRlclwiKTtcblxucmVxdWlyZShcIi4vcGl4aUluamVjdGlvblwiKS5pbmplY3QoUElYSSk7XG4iLCJmdW5jdGlvbiBDYWxsYmFja1F1ZXVlKCkge1xuICBsZXQgYXJyID0gbnVsbDtcblxuICBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAoYXJyID0gYXJyIHx8IFtdKS5sZW5ndGggPSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gZmx1c2goaSkge1xuICAgIGxldCBlcnJUaG93bjtcbiAgICBhcnIgPSBhcnIgPyBhcnIuc2xpY2UoKSA6IFtdO1xuICAgIHRyeSB7XG4gICAgICBlcnJUaG93biA9IHRydWU7XG4gICAgICBmb3IgKGkgIT09IHVuZGVmaW5lZCA/IGkgOiAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBhcnJbaV07XG4gICAgICAgIGNvbnN0IGZuID0gaXRlbVswXTtcbiAgICAgICAgY29uc3QgY3R4ID0gaXRlbVsxXTtcbiAgICAgICAgY29uc3QgYXJncyA9IGl0ZW1bMl07XG4gICAgICAgIGZuLmFwcGx5KGN0eCwgYXJncyk7XG4gICAgICB9XG4gICAgICBlcnJUaG93biA9IGZhbHNlO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBpZiAoZXJyVGhvd24pIHtcbiAgICAgICAgZmx1c2goaSArIDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzZXQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJlc2V0LFxuICAgIGVucXVldWUoZm4sIGNvbnRleHQpIHtcbiAgICAgIGNvbnN0IGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgICBhcnIgPSBhcnIgfHwgW107XG4gICAgICBhcnIucHVzaChbZm4sIGNvbnRleHQsIGFyZ3NdKTtcbiAgICB9LFxuICAgIGZsdXNoKCkge1xuICAgICAgZmx1c2goMCk7XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBDYWxsYmFja1F1ZXVlO1xuIiwiZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0eXBlLCBwcm9wcykge1xuICBwcm9wcyA9IE9iamVjdC5hc3NpZ24oe30sIHByb3BzKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgY29uc3QgY2hpbGRyZW4gPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcHJvcHMuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgfVxuICByZXR1cm4ge1xuICAgIHR5cGUsXG4gICAgcHJvcHMsXG4gICAgJCR0eXBlb2Y6IFwiQW5cIlxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnQ7XG4iLCJmdW5jdGlvbiBmb3JFYWNoUHJvcHMocHJvcHMsIGNiKSB7XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhwcm9wcyk7XG4gIGZvciAobGV0IGkgPSBrZXlzLmxlbmd0aDsgaS0tOyApIHtcbiAgICBjb25zdCBrZXkgPSBrZXlzW2ldO1xuICAgIGlmIChrZXkgPT09IFwiY2hpbGRyZW5cIiB8fCBrZXkgPT09IFwiaW5pdGlhbGl6ZVwiIHx8IC9eb24vLnRlc3Qoa2V5KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHByb3AgPSBwcm9wc1trZXldO1xuICAgIGNiKGtleSwgcHJvcCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JFYWNoUHJvcHM7XG4iLCJjb25zdCBDb21wb3NpdGVDb21wb25lbnQgPSByZXF1aXJlKFwiLi9Db21wb3NpdGVDb21wb25lbnRcIik7XG5jb25zdCBOYXRpdmVDb21wb25lbnQgPSByZXF1aXJlKFwiLi9OYXRpdmVDb21wb25lbnRcIik7XG5jb25zdCBDb21wb25lbnQgPSByZXF1aXJlKFwiLi9Db21wb25lbnRcIik7XG5cbkNvbXBvc2l0ZUNvbXBvbmVudC5wcm90b3R5cGUuaW5zdGFudGlhdGVDb21wb25lbnQgPSBpbnN0YW50aWF0ZUNvbXBvbmVudDtcbk5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUuaW5zdGFudGlhdGVDb21wb25lbnQgPSBpbnN0YW50aWF0ZUNvbXBvbmVudDtcblxuZnVuY3Rpb24gaW5zdGFudGlhdGVDb21wb25lbnQoZWxlbWVudCkge1xuICBpZiAoZWxlbWVudC50eXBlLnByb3RvdHlwZS5BbiA9PT0gQ29tcG9uZW50LnByb3RvdHlwZS5Bbikge1xuICAgIHJldHVybiBuZXcgQ29tcG9zaXRlQ29tcG9uZW50KGVsZW1lbnQpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgTmF0aXZlQ29tcG9uZW50KGVsZW1lbnQpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5zdGFudGlhdGVDb21wb25lbnQ7XG4iLCJjb25zdCBDYnEgPSByZXF1aXJlKFwiLi9jYnFcIik7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbW91bnRlZDogQ2JxKClcbn07XG4iLCJsZXQgcGl4aSA9IG51bGw7XG5leHBvcnRzLmluamVjdCA9IGZ1bmN0aW9uIGluamVjdChfcGl4aSkge1xuICBwaXhpID0gX3BpeGk7XG59O1xuZXhwb3J0cy5nZXRQaXhpID0gZnVuY3Rpb24gZ2V0UGl4aSgpIHtcbiAgcmV0dXJuIHBpeGk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBQSVhJO1xuIiwiY29uc3QgaW5zdGFudGlhdGVDb21wb25lbnQgPSByZXF1aXJlKFwiLi9pbnN0YW50aWF0ZUNvbXBvbmVudFwiKTtcbmNvbnN0IGxpZnljeWNsZSA9IHJlcXVpcmUoXCIuL2xpZnljeWNsZVwiKTtcbmNvbnN0IGdldFBpeGkgPSByZXF1aXJlKFwiLi9waXhpSW5qZWN0aW9uXCIpLmdldFBpeGk7XG5cbmZ1bmN0aW9uIHJlbmRlcihlbGVtZW50LCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgX1BJWEkgPSBnZXRQaXhpKCk7XG4gIGNvbnN0IHBpeGlBcHAgPSBuZXcgX1BJWEkuQXBwbGljYXRpb24ob3B0aW9ucyk7XG4gIGxpZnljeWNsZS5tb3VudGVkLnJlc2V0KCk7XG4gIGNvbnN0IGNvbXBvbmVudCA9IGluc3RhbnRpYXRlQ29tcG9uZW50KGVsZW1lbnQpO1xuICBjb25zdCBwaXhpT2JqID0gY29tcG9uZW50Lm1vdW50KCk7XG4gIHBpeGlBcHAuc3RhZ2UuYWRkQ2hpbGQocGl4aU9iaik7XG4gIGxpZnljeWNsZS5tb3VudGVkLmZsdXNoKCk7XG4gIHBpeGlBcHAuX19Bbl9JbnN0YW5jZV9fID0gY29tcG9uZW50O1xuXG4gIHJldHVybiBwaXhpQXBwO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlbmRlcjtcbiIsImNvbnN0IGRpcnR5Q29tcG9uZW50cyA9IFtdO1xuXG5mdW5jdGlvbiB1cGRhdGUoY29tcG8pIHtcbiAgY29tcG8uX19pbnN0YW5jZV9fLl9kaXJ0eSA9IHRydWU7XG4gIGRpcnR5Q29tcG9uZW50cy5wdXNoKGNvbXBvLl9faW5zdGFuY2VfXyk7XG4gIHVwZGF0ZURpcnR5Q29tcG9uZW50cygpO1xufVxuXG5jb25zdCB1cGRhdGVEaXJ0eUNvbXBvbmVudHMgPSBkZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgZGlydHlDb21wb25lbnRzLnNvcnQoKGEsIGIpID0+IHtcbiAgICByZXR1cm4gYS5faWQgLSBiLl9pZDtcbiAgfSk7XG4gIGxldCBjYztcbiAgd2hpbGUgKChjYyA9IGRpcnR5Q29tcG9uZW50cy5zaGlmdCgpKSkge1xuICAgIGlmICghY2MuX2RpcnR5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNjLnJlY2VpdmUoY2MuY3VycmVudEVsZW1lbnQpO1xuICB9XG59KTtcblxuZnVuY3Rpb24gZGVib3VuY2UoZm4sIGRlbGF5KSB7XG4gIGxldCB0O1xuICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICBjbGVhclRpbWVvdXQodCk7XG4gICAgdCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgZm4oLi4uYXJncyk7XG4gICAgfSwgZGVsYXkpO1xuICB9O1xufVxuXG5leHBvcnRzLnVwZGF0ZSA9IHVwZGF0ZTtcbiJdfQ==

  });
  