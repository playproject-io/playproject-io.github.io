(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){

// ------------------------------------------
// Rellax.js
// Buttery smooth parallax library
// Copyright (c) 2016 Moe Amaya (@moeamaya)
// MIT license
//
// Thanks to Paraxify.js and Jaime Cabllero
// for parallax concepts
// ------------------------------------------

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.Rellax = factory();
  }
}(typeof window !== "undefined" ? window : global, function () {
  var Rellax = function(el, options){
    "use strict";

    var self = Object.create(Rellax.prototype);

    var posY = 0;
    var screenY = 0;
    var posX = 0;
    var screenX = 0;
    var blocks = [];
    var pause = true;

    // check what requestAnimationFrame to use, and if
    // it's not supported, use the onscroll event
    var loop = window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      function(callback){ return setTimeout(callback, 1000 / 60); };

    // store the id for later use
    var loopId = null;

    // Test via a getter in the options object to see if the passive property is accessed
    var supportsPassive = false;
    try {
      var opts = Object.defineProperty({}, 'passive', {
        get: function() {
          supportsPassive = true;
        }
      });
      window.addEventListener("testPassive", null, opts);
      window.removeEventListener("testPassive", null, opts);
    } catch (e) {}

    // check what cancelAnimation method to use
    var clearLoop = window.cancelAnimationFrame || window.mozCancelAnimationFrame || clearTimeout;

    // check which transform property to use
    var transformProp = window.transformProp || (function(){
        var testEl = document.createElement('div');
        if (testEl.style.transform === null) {
          var vendors = ['Webkit', 'Moz', 'ms'];
          for (var vendor in vendors) {
            if (testEl.style[ vendors[vendor] + 'Transform' ] !== undefined) {
              return vendors[vendor] + 'Transform';
            }
          }
        }
        return 'transform';
      })();

    // Default Settings
    self.options = {
      speed: -2,
	    verticalSpeed: null,
	    horizontalSpeed: null,
      breakpoints: [576, 768, 1201],
      center: false,
      wrapper: null,
      relativeToWrapper: false,
      round: true,
      vertical: true,
      horizontal: false,
      verticalScrollAxis: "y",
      horizontalScrollAxis: "x",
      callback: function() {},
    };

    // User defined options (might have more in the future)
    if (options){
      Object.keys(options).forEach(function(key){
        self.options[key] = options[key];
      });
    }

    function validateCustomBreakpoints () {
      if (self.options.breakpoints.length === 3 && Array.isArray(self.options.breakpoints)) {
        var isAscending = true;
        var isNumerical = true;
        var lastVal;
        self.options.breakpoints.forEach(function (i) {
          if (typeof i !== 'number') isNumerical = false;
          if (lastVal !== null) {
            if (i < lastVal) isAscending = false;
          }
          lastVal = i;
        });
        if (isAscending && isNumerical) return;
      }
      // revert defaults if set incorrectly
      self.options.breakpoints = [576, 768, 1201];
      console.warn("Rellax: You must pass an array of 3 numbers in ascending order to the breakpoints option. Defaults reverted");
    }

    if (options && options.breakpoints) {
      validateCustomBreakpoints();
    }

    // By default, rellax class
    if (!el) {
      el = '.rellax';
    }

    // check if el is a className or a node
    var elements = typeof el === 'string' ? document.querySelectorAll(el) : [el];

    // Now query selector
    if (elements.length > 0) {
      self.elems = elements;
    }

    // The elements don't exist
    else {
      console.warn("Rellax: The elements you're trying to select don't exist.");
      return;
    }

    // Has a wrapper and it exists
    if (self.options.wrapper) {
      if (!self.options.wrapper.nodeType) {
        var wrapper = document.querySelector(self.options.wrapper);

        if (wrapper) {
          self.options.wrapper = wrapper;
        } else {
          console.warn("Rellax: The wrapper you're trying to use doesn't exist.");
          return;
        }
      }
    }

    // set a placeholder for the current breakpoint
    var currentBreakpoint;

    // helper to determine current breakpoint
    var getCurrentBreakpoint = function (w) {
      var bp = self.options.breakpoints;
      if (w < bp[0]) return 'xs';
      if (w >= bp[0] && w < bp[1]) return 'sm';
      if (w >= bp[1] && w < bp[2]) return 'md';
      return 'lg';
    };

    // Get and cache initial position of all elements
    var cacheBlocks = function() {
      for (var i = 0; i < self.elems.length; i++){
        var block = createBlock(self.elems[i]);
        blocks.push(block);
      }
    };


    // Let's kick this script off
    // Build array for cached element values
    var init = function() {
      for (var i = 0; i < blocks.length; i++){
        self.elems[i].style.cssText = blocks[i].style;
      }

      blocks = [];

      screenY = window.innerHeight;
      screenX = window.innerWidth;
      currentBreakpoint = getCurrentBreakpoint(screenX);

      setPosition();

      cacheBlocks();

      animate();

      // If paused, unpause and set listener for window resizing events
      if (pause) {
        window.addEventListener('resize', init);
        pause = false;
        // Start the loop
        update();
      }
    };

    // We want to cache the parallax blocks'
    // values: base, top, height, speed
    // el: is dom object, return: el cache values
    var createBlock = function(el) {
      var dataPercentage = el.getAttribute( 'data-rellax-percentage' );
      var dataSpeed = el.getAttribute( 'data-rellax-speed' );
      var dataXsSpeed = el.getAttribute( 'data-rellax-xs-speed' );
      var dataMobileSpeed = el.getAttribute( 'data-rellax-mobile-speed' );
      var dataTabletSpeed = el.getAttribute( 'data-rellax-tablet-speed' );
      var dataDesktopSpeed = el.getAttribute( 'data-rellax-desktop-speed' );
      var dataVerticalSpeed = el.getAttribute('data-rellax-vertical-speed');
      var dataHorizontalSpeed = el.getAttribute('data-rellax-horizontal-speed');
      var dataVericalScrollAxis = el.getAttribute('data-rellax-vertical-scroll-axis');
      var dataHorizontalScrollAxis = el.getAttribute('data-rellax-horizontal-scroll-axis');
      var dataZindex = el.getAttribute( 'data-rellax-zindex' ) || 0;
      var dataMin = el.getAttribute( 'data-rellax-min' );
      var dataMax = el.getAttribute( 'data-rellax-max' );
      var dataMinX = el.getAttribute('data-rellax-min-x');
      var dataMaxX = el.getAttribute('data-rellax-max-x');
      var dataMinY = el.getAttribute('data-rellax-min-y');
      var dataMaxY = el.getAttribute('data-rellax-max-y');
      var mapBreakpoints;
      var breakpoints = true;

      if (!dataXsSpeed && !dataMobileSpeed && !dataTabletSpeed && !dataDesktopSpeed) {
        breakpoints = false;
      } else {
        mapBreakpoints = {
          'xs': dataXsSpeed,
          'sm': dataMobileSpeed,
          'md': dataTabletSpeed,
          'lg': dataDesktopSpeed
        };
      }

      // initializing at scrollY = 0 (top of browser), scrollX = 0 (left of browser)
      // ensures elements are positioned based on HTML layout.
      //
      // If the element has the percentage attribute, the posY and posX needs to be
      // the current scroll position's value, so that the elements are still positioned based on HTML layout
      var wrapperPosY = self.options.wrapper ? self.options.wrapper.scrollTop : (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);
      // If the option relativeToWrapper is true, use the wrappers offset to top, subtracted from the current page scroll.
      if (self.options.relativeToWrapper) {
        var scrollPosY = (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);
        wrapperPosY = scrollPosY - self.options.wrapper.offsetTop;
      }
      var posY = self.options.vertical ? ( dataPercentage || self.options.center ? wrapperPosY : 0 ) : 0;
      var posX = self.options.horizontal ? ( dataPercentage || self.options.center ? self.options.wrapper ? self.options.wrapper.scrollLeft : (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft) : 0 ) : 0;

      var blockTop = posY + el.getBoundingClientRect().top;
      var blockHeight = el.clientHeight || el.offsetHeight || el.scrollHeight;

      var blockLeft = posX + el.getBoundingClientRect().left;
      var blockWidth = el.clientWidth || el.offsetWidth || el.scrollWidth;

      // apparently parallax equation everyone uses
      var percentageY = dataPercentage ? dataPercentage : (posY - blockTop + screenY) / (blockHeight + screenY);
      var percentageX = dataPercentage ? dataPercentage : (posX - blockLeft + screenX) / (blockWidth + screenX);
      if(self.options.center){ percentageX = 0.5; percentageY = 0.5; }

      // Optional individual block speed as data attr, otherwise global speed
      var speed = (breakpoints && mapBreakpoints[currentBreakpoint] !== null) ? Number(mapBreakpoints[currentBreakpoint]) : (dataSpeed ? dataSpeed : self.options.speed);
      var verticalSpeed = dataVerticalSpeed ? dataVerticalSpeed : self.options.verticalSpeed;
      var horizontalSpeed = dataHorizontalSpeed ? dataHorizontalSpeed : self.options.horizontalSpeed;

      // Optional individual block movement axis direction as data attr, otherwise gobal movement direction
      var verticalScrollAxis = dataVericalScrollAxis ? dataVericalScrollAxis : self.options.verticalScrollAxis;
      var horizontalScrollAxis = dataHorizontalScrollAxis ? dataHorizontalScrollAxis : self.options.horizontalScrollAxis;

      var bases = updatePosition(percentageX, percentageY, speed, verticalSpeed, horizontalSpeed);

      // ~~Store non-translate3d transforms~~
      // Store inline styles and extract transforms
      var style = el.style.cssText;
      var transform = '';

      // Check if there's an inline styled transform
      var searchResult = /transform\s*:/i.exec(style);
      if (searchResult) {
        // Get the index of the transform
        var index = searchResult.index;

        // Trim the style to the transform point and get the following semi-colon index
        var trimmedStyle = style.slice(index);
        var delimiter = trimmedStyle.indexOf(';');

        // Remove "transform" string and save the attribute
        if (delimiter) {
          transform = " " + trimmedStyle.slice(11, delimiter).replace(/\s/g,'');
        } else {
          transform = " " + trimmedStyle.slice(11).replace(/\s/g,'');
        }
      }

      return {
        baseX: bases.x,
        baseY: bases.y,
        top: blockTop,
        left: blockLeft,
        height: blockHeight,
        width: blockWidth,
        speed: speed,
        verticalSpeed: verticalSpeed,
        horizontalSpeed: horizontalSpeed,
        verticalScrollAxis: verticalScrollAxis,
        horizontalScrollAxis: horizontalScrollAxis,
        style: style,
        transform: transform,
        zindex: dataZindex,
        min: dataMin,
        max: dataMax,
        minX: dataMinX,
        maxX: dataMaxX,
        minY: dataMinY,
        maxY: dataMaxY
      };
    };

    // set scroll position (posY, posX)
    // side effect method is not ideal, but okay for now
    // returns true if the scroll changed, false if nothing happened
    var setPosition = function() {
      var oldY = posY;
      var oldX = posX;

      posY = self.options.wrapper ? self.options.wrapper.scrollTop : (document.documentElement || document.body.parentNode || document.body).scrollTop || window.pageYOffset;
      posX = self.options.wrapper ? self.options.wrapper.scrollLeft : (document.documentElement || document.body.parentNode || document.body).scrollLeft || window.pageXOffset;
      // If option relativeToWrapper is true, use relative wrapper value instead.
      if (self.options.relativeToWrapper) {
        var scrollPosY = (document.documentElement || document.body.parentNode || document.body).scrollTop || window.pageYOffset;
        posY = scrollPosY - self.options.wrapper.offsetTop;
      }


      if (oldY != posY && self.options.vertical) {
        // scroll changed, return true
        return true;
      }

      if (oldX != posX && self.options.horizontal) {
        // scroll changed, return true
        return true;
      }

      // scroll did not change
      return false;
    };

    // Ahh a pure function, gets new transform value
    // based on scrollPosition and speed
    // Allow for decimal pixel values
    var updatePosition = function(percentageX, percentageY, speed, verticalSpeed, horizontalSpeed) {
      var result = {};
      var valueX = ((horizontalSpeed ? horizontalSpeed : speed) * (100 * (1 - percentageX)));
      var valueY = ((verticalSpeed ? verticalSpeed : speed) * (100 * (1 - percentageY)));

      result.x = self.options.round ? Math.round(valueX) : Math.round(valueX * 100) / 100;
      result.y = self.options.round ? Math.round(valueY) : Math.round(valueY * 100) / 100;

      return result;
    };

    // Remove event listeners and loop again
    var deferredUpdate = function() {
      window.removeEventListener('resize', deferredUpdate);
      window.removeEventListener('orientationchange', deferredUpdate);
      (self.options.wrapper ? self.options.wrapper : window).removeEventListener('scroll', deferredUpdate);
      (self.options.wrapper ? self.options.wrapper : document).removeEventListener('touchmove', deferredUpdate);

      // loop again
      loopId = loop(update);
    };

    // Loop
    var update = function() {
      if (setPosition() && pause === false) {
        animate();

        // loop again
        loopId = loop(update);
      } else {
        loopId = null;

        // Don't animate until we get a position updating event
        window.addEventListener('resize', deferredUpdate);
        window.addEventListener('orientationchange', deferredUpdate);
        (self.options.wrapper ? self.options.wrapper : window).addEventListener('scroll', deferredUpdate, supportsPassive ? { passive: true } : false);
        (self.options.wrapper ? self.options.wrapper : document).addEventListener('touchmove', deferredUpdate, supportsPassive ? { passive: true } : false);
      }
    };

    // Transform3d on parallax element
    var animate = function() {
      var positions;
      for (var i = 0; i < self.elems.length; i++){
        // Determine relevant movement directions
        var verticalScrollAxis = blocks[i].verticalScrollAxis.toLowerCase();
        var horizontalScrollAxis = blocks[i].horizontalScrollAxis.toLowerCase();
        var verticalScrollX = verticalScrollAxis.indexOf("x") != -1 ? posY : 0;
        var verticalScrollY = verticalScrollAxis.indexOf("y") != -1 ? posY : 0;
        var horizontalScrollX = horizontalScrollAxis.indexOf("x") != -1 ? posX : 0;
        var horizontalScrollY = horizontalScrollAxis.indexOf("y") != -1 ? posX : 0;

        var percentageY = ((verticalScrollY + horizontalScrollY - blocks[i].top + screenY) / (blocks[i].height + screenY));
        var percentageX = ((verticalScrollX + horizontalScrollX - blocks[i].left + screenX) / (blocks[i].width + screenX));

        // Subtracting initialize value, so element stays in same spot as HTML
        positions = updatePosition(percentageX, percentageY, blocks[i].speed, blocks[i].verticalSpeed, blocks[i].horizontalSpeed);
        var positionY = positions.y - blocks[i].baseY;
        var positionX = positions.x - blocks[i].baseX;

        // The next two "if" blocks go like this:
        // Check if a limit is defined (first "min", then "max");
        // Check if we need to change the Y or the X
        // (Currently working only if just one of the axes is enabled)
        // Then, check if the new position is inside the allowed limit
        // If so, use new position. If not, set position to limit.

        // Check if a min limit is defined
        if (blocks[i].min !== null) {
          if (self.options.vertical && !self.options.horizontal) {
            positionY = positionY <= blocks[i].min ? blocks[i].min : positionY;
          }
          if (self.options.horizontal && !self.options.vertical) {
            positionX = positionX <= blocks[i].min ? blocks[i].min : positionX;
          }
        }

        // Check if directional min limits are defined
        if (blocks[i].minY != null) {
            positionY = positionY <= blocks[i].minY ? blocks[i].minY : positionY;
        }
        if (blocks[i].minX != null) {
            positionX = positionX <= blocks[i].minX ? blocks[i].minX : positionX;
        }

        // Check if a max limit is defined
        if (blocks[i].max !== null) {
          if (self.options.vertical && !self.options.horizontal) {
            positionY = positionY >= blocks[i].max ? blocks[i].max : positionY;
          }
          if (self.options.horizontal && !self.options.vertical) {
            positionX = positionX >= blocks[i].max ? blocks[i].max : positionX;
          }
        }

        // Check if directional max limits are defined
        if (blocks[i].maxY != null) {
            positionY = positionY >= blocks[i].maxY ? blocks[i].maxY : positionY;
        }
        if (blocks[i].maxX != null) {
            positionX = positionX >= blocks[i].maxX ? blocks[i].maxX : positionX;
        }

        var zindex = blocks[i].zindex;

        // Move that element
        // (Set the new translation and append initial inline transforms.)
        var translate = 'translate3d(' + (self.options.horizontal ? positionX : '0') + 'px,' + (self.options.vertical ? positionY : '0') + 'px,' + zindex + 'px) ' + blocks[i].transform;
        self.elems[i].style[transformProp] = translate;
      }
      self.options.callback(positions);
    };

    self.destroy = function() {
      for (var i = 0; i < self.elems.length; i++){
        self.elems[i].style.cssText = blocks[i].style;
      }

      // Remove resize event listener if not pause, and pause
      if (!pause) {
        window.removeEventListener('resize', init);
        pause = true;
      }

      // Clear the animation loop to prevent possible memory leak
      clearLoop(loopId);
      loopId = null;
    };

    // Init
    init();

    // Allow to recalculate the initial values whenever we want
    self.refresh = init;

    return self;
  };
  return Rellax;
}));

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
(function (__filename){(function (){
/******************************************************************************
  STATE
******************************************************************************/
const STATE = require('STATE')
const name = 'app'
const statedb = STATE(__filename)
const shopts = { mode: 'closed' }
// ----------------------------------------
const { sdb, subs: [get], sub_modules } = statedb(fallback_module, fallback_instance)
function fallback_module () {
  return {
    _: {
      topnav: {},
      theme_widget: {},
      header: {},
      footer: {}
    }
  }
}
function fallback_instance () {
  return {
    _: {
      topnav: {},
      theme_widget: {},
      header: {},
      footer: {}
    },
    inputs: {
      'app.css': {
        $ref: new URL('src/node_modules/css/default/app.css', location).href
      }
    }
  }
}
function override ([topnav]) {
  const data = topnav()
  console.log(data)
  data['topnav.json'].data.links.push({
    id: 'app',
    text: 'app',
    url: 'app'
  })
  return data
}
/******************************************************************************
  MAKE_PAGE COMPONENT
******************************************************************************/
const IO = require('io')
const modules = {
  [sub_modules.theme_widget]: require('theme_widget'),
  [sub_modules.topnav]: require('topnav'),
  [sub_modules.header]: require('header'),
  //  datdot : require('datdot'),
  //  editor : require('editor'),
  //  smartcontract_codes : require('smartcontract_codes'),
  //  supporters : require('supporters'),
  //  our_contributors : require('our_contributors'),
  [sub_modules.footer]: require('footer')
}
module.exports = app

async function app (opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid)
  const on = {
    jump,
    css: inject
  }

  const send = await IO(id, name, on)
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
  <div id="top" class='wrap'></div>
  <style></style>`
  const style = shadow.querySelector('style')
  const main = shadow.querySelector('div')

  const subs = await sdb.watch(onbatch)

  console.log(subs, modules)
  main.append(...await Promise.all(
    subs.map(async ({ sid, type }) => {
      const el = document.createElement('div')
      el.name = type
      const shadow = el.attachShadow(shopts)
      shadow.append(await modules[type]({ sid, hub: [id] }))
      return el
    })))
  return el

  function onbatch (batch) {
    for (const { type, data } of batch) {
      on[type](data)
    }
  }
  async function jump ({ data }) {
    main.querySelector('#' + data).scrollIntoView({ behavior: 'smooth' })
  }
  async function inject (data) {
    style.innerHTML = data.join('\n')
  }
}

}).call(this)}).call(this,"/src/app.js")
},{"STATE":3,"footer":4,"header":9,"io":10,"theme_widget":14,"topnav":16}],3:[function(require,module,exports){
const localdb = require('localdb')
const io = require('io')

let db
/** Data stored in a entry in db by STATE (Schema): 
 * id (String): Node Path 
 * name (String/Optional): Any (To be used in theme_widget)
 * type (String): Module Name for module / Module id for instances
 * hubs (Array): List of hub-nodes
 * subs (Array): List of sub-nodes
 * inputs (Array): List of input files
 */
// Constants and initial setup (global level)
const VERSION = 13
const HELPER_MODULES = ['io', 'localdb', 'STATE']
const FALLBACK_POST_ERROR = '\nFor more info visit https://github.com/alyhxn/playproject/blob/main/doc/state/temp.md#defining-fallbacks'
const FALLBACK_SYNTAX_POST_ERROR = '\nFor more info visit https://github.com/alyhxn/playproject/blob/main/doc/state/temp.md#key-descriptions'
const FALLBACK_SUBS_POST_ERROR = '\nFor more info visit https://github.com/alyhxn/playproject/blob/main/doc/state/temp.md#shadow-dom-integration'
const status = {
  root_module: true, 
  root_instance: true, 
  overrides: {},
  tree: {},
  tree_pointers: {},
  modulepaths: {},
  addresses: {},
  inits: [],
  open_branches: {},
  db,
  local_statuses: {},
  listeners: {},
  missing_supers: new Set(),
  imports: {},
  expected_imports: {},
  used_ids: new Set(),
  a2i: {},
  i2a: {},
  s2i: {},
  i2s: {},
  services: {},
  args: {},
  callbacks: [],
  root_datasets: [],
  dataset_types: {},
  helpers: {
    listify
  }
}
window.STATEMODULE = status



// Symbol mappings
let admins = [0]

// Inner Function
function STATE (address, modulepath, dependencies) {
  status.modulepaths[modulepath] = 0
  status.addresses[modulepath] = address
  //Variables (module-level)
  
  const local_status = {
    name: extract_filename(address),
    module_id: modulepath,
    deny: {},
    sub_modules: [],
    sub_instances: {}
  }
  status.local_statuses[modulepath] = local_status
  if(status.ROOT_ID)
    return statedb
  const sdb = statedb
  sdb.admin = admin
  return sdb
  
  function admin (imported_db = localdb) {
    db = imported_db()
    status.db = db
    // Version check and initialization
    status.fallback_check = Boolean(check_version())
    status.fallback_check && db.add(['playproject_version'], VERSION)
    status.ROOT_ID = modulepath
    return { on }
    function on (callback) {
      status.callback = callback
    }
  }
  function statedb (fallback) {
    if(!status.ROOT_ID)
      throw new Error('Admin access required! Call statedb.admin() first.' + FALLBACK_POST_ERROR)

    const data = fallback(status.args[modulepath], { listify: tree => listify(tree, modulepath), tree: status.tree_pointers[modulepath] })
    local_status.fallback_instance = data.api
    const super_id = modulepath.split(/>(?=[^>]*$)/)[0]
    
    if(super_id === status.current_node)
      status.expected_imports[super_id].splice(status.expected_imports[super_id].indexOf(modulepath), 1)
    else if((status?.current_node?.split('>').length || 0) < super_id.split('>').length){
      let temp = super_id
      while(temp !== status.current_node && temp.includes('>')){
        status.open_branches[temp] = 0
        temp = temp.split(/>(?=[^>]*$)/)[0]
      }
    }
    else{
      let temp = status.current_node
      while(temp !== super_id && temp.includes('>')){
        status.open_branches[temp] = 0
        temp = temp.split(/>(?=[^>]*$)/)[0]
      }
    }

    if(data._){
      status.open_branches[modulepath] = Object.values(data._).filter(node => node).length
      status.expected_imports[modulepath] = Object.keys(data._)
      status.current_node = modulepath
    }

    local_status.fallback_module = new Function(`return ${fallback.toString()}`)()
    verify_imports(modulepath, dependencies, data)
    const updated_status = append_tree_node(modulepath, status)
    Object.assign(status.tree_pointers, updated_status.tree_pointers)
    Object.assign(status.open_branches, updated_status.open_branches)
    status.inits.push(init_module)
    
    // console.log(Object.values(status.open_branches).reduce((acc, curr) => acc + curr, 0))
    if(!Object.values(status.open_branches).reduce((acc, curr) => acc + curr, 0)){
      status.inits.forEach(init => init())
    }
    
    const sdb = create_statedb_interface(local_status, modulepath, xtype = 'module')
    sdb.id = modulepath
    status.dataset = sdb.private_api

    const get = init_instance
    const extra_fallbacks = Object.entries(local_status.fallback_instance || {})
    extra_fallbacks.length && extra_fallbacks.forEach(([key]) => {
      get[key] = (sid) => get(sid, key)
    })
    if(!status.a2i[modulepath]){
      status.i2a[status.a2i[modulepath] = encode(modulepath)] = modulepath
    }
    
    try {
      status.callback && status.callback({ type: 'create sdb', data: modulepath })
      return {
      id: modulepath,
      sdb: sdb.public_api,
      get: init_instance,
      io: io(status.a2i[modulepath], modulepath, status.callback)
      // sub_modules
    }
    } catch (error) {
      throw new Error(`ID: ${modulepath}\n`+error)
    }
    
  }
  function append_tree_node (id, status) {
    const [super_id, name] = id.split(/>(?=[^>]*$)/)

    if(Object.keys(status.tree).length){
      if(status.tree_pointers[super_id]){
        status.tree_pointers[super_id]._[name] = { $: { _: {} } }
        status.tree_pointers[id] = status.tree_pointers[super_id]._[name].$
        status.open_branches[super_id]--
      }
      else{
        let new_name = name
        let new_super_id = super_id


        while(!status.tree_pointers[new_super_id]){
          [new_super_id, temp_name] = new_super_id.split(/>(?=[^>]*$)/)
          new_name = temp_name + '>' + new_name
        }
        status.tree_pointers[new_super_id]._[new_name] = { $: { _: {} } }
        status.tree_pointers[id] = status.tree_pointers[new_super_id]._[new_name].$
        if(!status.missing_supers.has(super_id))
          status.open_branches[new_super_id]--
        status.missing_supers.add(super_id)
      }
    }
    else{
      status.tree[id] = { $: { _: {} } }
      status.tree_pointers[id] = status.tree[id].$
    }
    return status
  }
  function init_module () {
    const {statedata, state_entries, newstatus, updated_local_status} = get_module_data(local_status.fallback_module)
    statedata.orphan && (local_status.orphan = true)
    //side effects
    if (status.fallback_check) {
      Object.assign(status.root_module, newstatus.root_module)
      Object.assign(status.overrides, newstatus.overrides)
      console.log('Main module: ', statedata.id, '\n', state_entries)
      updated_local_status && Object.assign(local_status, updated_local_status)
      // console.log('Local status: ', local_status.fallback_instance, statedata.api)
      const old_fallback = local_status.fallback_instance
      
      if(local_status.fallback_instance ? local_status.fallback_instance?.toString() === statedata.api?.toString() : false)
        local_status.fallback_instance = statedata.api
      else
        local_status.fallback_instance = (args, tools) => {
          return statedata.api(args, tools, [old_fallback])
        }
      const extra_fallbacks = Object.entries(old_fallback || {})
      extra_fallbacks.length && extra_fallbacks.forEach(([key, value]) => {
        local_status.fallback_instance[key] = (args, tools) => {
          console.log('Extra fallback: ', statedata.api[key] ? statedata.api[key] : old_fallback[key])
          return (statedata.api[key] ? statedata.api[key] : old_fallback[key])(args, tools, [value])
        }
      })
      db.append(['state'], state_entries)
      db.add(['root_datasets'], [
        { name: 'state' }
      ])
      // add_source_code(statedata.inputs) // @TODO: remove side effect
    }
    [local_status.sub_modules, symbol2ID, ID2Symbol, address2ID, ID2Address] = symbolfy(statedata, local_status)
    Object.assign(status.s2i, symbol2ID)
    Object.assign(status.i2s, ID2Symbol)
    Object.assign(status.a2i, address2ID)
    Object.assign(status.i2a, ID2Address)
    
    //Setup local data (module level)
    if(status.root_module){
      status.root_module = false
      statedata.admins && admins.push(...statedata.admins)
    }
    // @TODO: handle sub_modules when dynamic require is implemented
    // const sub_modules = {}
    // statedata.subs && statedata.subs.forEach(id => {
    //   sub_modules[db.read(['state', id]).type] = id
    // })
  }
  function init_instance (sid, fallback_key) {
    const fallback = local_status.fallback_instance[fallback_key] || local_status.fallback_instance
    const {statedata, state_entries, newstatus} = get_instance_data(sid, fallback)
    
    if (status.fallback_check) {
      Object.assign(status.root_module, newstatus.root_module)
      Object.assign(status.overrides, newstatus.overrides)
      Object.assign(status.tree, newstatus.tree)
      console.log('Main instance: ', statedata.id, '\n', state_entries)
      db.append(['state'], state_entries)
    }
    [local_status.sub_instances[statedata.id], symbol2ID, ID2Symbol, address2ID, ID2Address] = symbolfy(statedata, local_status)
    Object.assign(status.s2i, symbol2ID)
    Object.assign(status.i2s, ID2Symbol)
    Object.assign(status.a2i, address2ID)
    Object.assign(status.i2a, ID2Address)
    
    const sdb = create_statedb_interface(local_status, statedata.id, xtype = 'instance')
    sdb.id = statedata.id

    const sanitized_event = {}
    statedata.net && Object.keys(statedata.net).forEach(node => {
      statedata.net[node].id = status.a2i[node] || (status.a2i[node] = encode(node))
    })

    status.callback && status.callback({ type:'create sdb', data:statedata.id })
    return {
      id: statedata.id,
      net: statedata.net,
      sdb: sdb.public_api,
      io: io(status.a2i[statedata.id], modulepath, status.callback),
    }
  }
  function get_module_data (fallback) {
    let data = db.read(['state', modulepath])
    if (status.fallback_check) {
      if (data) {
        var {sanitized_data, updated_status} = preprocess({ fun_status: status, fallback, xtype: 'module', pre_data: data })
      } 
      else if (status.root_module) {
        var {sanitized_data, updated_status} = preprocess({ fun_status: status, fallback, xtype: 'module', pre_data: {id: modulepath}})
      } 
      else {
        var {sanitized_data, updated_status, updated_local_status} = find_super({ xtype: 'module', fallback, fun_status:status, local_status })
      }
      data = sanitized_data.entry
    }
    return {
      statedata: data,
      state_entries: sanitized_data?.entries,
      newstatus: updated_status,
      updated_local_status
    }
  }
  function get_instance_data (sid, fallback) {
    let id = status.s2i[sid]
    if(id && (id.split(':')[0] !== modulepath || !id.includes(':')))
        throw new Error(`Access denied! Wrong SID '${id}' used by instance of '${modulepath}'` + FALLBACK_SUBS_POST_ERROR)
    if(status.used_ids.has(id))
      throw new Error(`Access denied! SID '${id}' is already used` + FALLBACK_SUBS_POST_ERROR)

    id && status.used_ids.add(id)
    let data = id && db.read(['state', id])
    let sanitized_data, updated_status = status
    if (status.fallback_check) {
      if (!data && !status.root_instance) {
        ({sanitized_data, updated_status} = find_super({ xtype: 'instance', fallback, fun_status: status }))
      } else {
        ({sanitized_data, updated_status} = preprocess({
          fun_status: status,
          fallback, 
          xtype: 'instance',
          pre_data: data || {id: get_instance_path(modulepath)}
        }))
        updated_status.root_instance = false
      }
      data = sanitized_data.entry
    }
    else if (status.root_instance) {
      data = db.read(['state', id || get_instance_path(modulepath)])
      updated_status.tree = JSON.parse(JSON.stringify(status.tree))
      updated_status.root_instance = false
    }
    
    if (!data && local_status.orphan) {
      data = db.read(['state', get_instance_path(modulepath)])
    }
    return {
      statedata: data,
      state_entries: sanitized_data?.entries,
      newstatus: updated_status,
    }
  }
  function find_super ({ xtype, fallback, fun_status, local_status }) {
    let modulepath_super = modulepath.split(/\>(?=[^>]*$)/)[0]
    let modulepath_grand = modulepath_super.split(/\>(?=[^>]*$)/)[0]
    if(status.modulepaths[modulepath_super] !== undefined){
      throw new Error(`Node "${modulepath}" is not defined in the fallback of "${modulepath_super}"` + FALLBACK_SUBS_POST_ERROR)
    }
    const split = modulepath.split('>')
    let data
    const entries = {}
    if(xtype === 'module'){
      let name = split.at(-1)
      while(!data && modulepath_grand.includes('>')){
        data = db.read(['state', modulepath_super])
        const split = modulepath_super.split(/\>(?=[^>]*$)/)
        modulepath_super = split[0]
        name = split[1] + '>' + name
      }
      console.log(data)
      data.path = data.id = modulepath_super + '>' + name
      modulepath = modulepath_super + '>' + name
      local_status.name = name

      const super_data = db.read(['state', modulepath_super])
      super_data.subs.forEach((sub_id, i) => {
        if(sub_id === modulepath_super){
          super_data.subs.splice(i, 1)
          return
        }
      })
      super_data.subs.push(data.id)
      entries[super_data.id] = super_data
    }
    else{
      //@TODO: Make the :0 dynamic
      let instance_path_super = modulepath_super + ':0'
      let temp
      while(!data && temp !== modulepath_super){
        data = db.read(['state', instance_path_super])
        temp = modulepath_super
        modulepath_grand = modulepath_super = modulepath_super.split(/\>(?=[^>]*$)/)[0]
        instance_path_super = modulepath_super + ':0'
      }
      data.path = data.id = get_instance_path(modulepath)
      temp = null
      let super_data
      let instance_path_grand = modulepath_grand.includes('>') ? modulepath_grand + ':0' : modulepath_grand

      while(!super_data?.subs && temp !== modulepath_grand){
        super_data = db.read(['state', instance_path_grand])
        temp = modulepath_grand
        modulepath_grand = modulepath_grand.split(/\>(?=[^>]*$)/)[0]
        instance_path_grand = modulepath_grand.includes('>') ? modulepath_grand + ':0' : modulepath_grand
      }
      
      super_data.subs.forEach((sub_id, i) => {
        if(sub_id === instance_path_super){
          super_data.subs.splice(i, 1)
          return
        }
      })
      super_data.subs.push(data.id)
      entries[super_data.id] = super_data
    }
    data.name = split.at(-1)
    return { updated_local_status: local_status,
      ...preprocess({ 
      fun_status,
      fallback, xtype, 
      pre_data: data, 
      orphan_check: true, entries }) }
  }
  function preprocess ({ fallback, xtype, pre_data = {}, orphan_check, fun_status, entries }) {
    const used_keys = new Set()
    let {id: pre_id, hubs: pre_hubs, mapping} = pre_data
    const fallback_args = [status.args[pre_id], { listify: tree => listify(tree, modulepath), tree: status.tree_pointers[modulepath] }]
    let fallback_data = fallback(...fallback_args)
    try {
      validate(fallback_data, xtype)
    } catch (error) {
      throw new Error(`in fallback function of ${pre_id} ${xtype}\n${error.stack}`)
    }
    const overrides = fun_status.overrides[pre_id]
    if(overrides){
      // console.log('Before: ', JSON.parse(JSON.stringify(fallback_data)))
      const override = overrides.fun.shift()
      fallback_data = override(...fallback_args, get_fallbacks({ fallback_data, overrides: overrides.fun, modulepath, instance_path: pre_id }))
      // console.log('After: ', JSON.parse(JSON.stringify(fallback_data)))
      console.log('Override used: ', pre_id, overrides.by, )
      overrides.by.splice(0, 1)
      overrides.fun.splice(0, 1)
    }
    
    // console.log('fallback_data: ', fallback)
    fun_status.overrides = register_overrides({ overrides: fun_status.overrides, tree: fallback_data, path: modulepath, id: pre_id, address })
    console.log('overrides: ', Object.keys(fun_status.overrides))
    orphan_check && (fallback_data.orphan = orphan_check)
    //This function makes changes in fun_status (side effect)
    return {
      sanitized_data: sanitize_state({ local_id: '', entry: fallback_data, path: pre_id, xtype, mapping, entries }),
      updated_status: fun_status
    }
    
    function sanitize_state ({ local_id, entry, path, hub_entry, local_tree, entries = {}, xtype, mapping, xkey }) {
      [path, entry, local_tree] = extract_data({ local_id, entry, path, hub_entry, local_tree, xtype, xkey })

      entry.id =  path
      entry.name = entry.name || local_id.split(':')[0] || local_status.name
      mapping && (entry.mapping = mapping)
      
      entries = {...entries, ...sanitize_subs({ local_id, entry, path, local_tree, xtype, mapping })}
      delete entry._
      entries[entry.id] = entry
      // console.log('Entry: ', entry)
      return {entries, entry}
    }
    function extract_data ({ local_id, entry, path, hub_entry, xtype, xkey }) {
      if (local_id) {
        entry.hubs = [hub_entry.id]
        if (xtype === 'instance') {
          let temp_path = path.split(':')[0]
          temp_path = temp_path ? temp_path + '>' : temp_path
          const module_id = temp_path + local_id
          entry.type = module_id
          path = module_id + ':' + xkey
          temp = Number(xkey)+1
          temp2 = db.read(['state', path])
          while(temp2 || used_keys.has(path)){
            path = module_id + ':' + temp
            temp2 = db.read(['state', path])
            temp++
          }
        }
        else {
          entry.type = local_id
          path = path ? path + '>' : ''
          path = path + local_id
        }
      } 
      else {
        if (xtype === 'instance') {
          entry.type = local_status.module_id
        } else {
          local_tree = JSON.parse(JSON.stringify(entry))
          // @TODO Handle JS file entry
          // console.log('pre_id:', pre_id)
          // const file_id = local_status.name + '.js'
          // entry.drive || (entry.drive = {})
          // entry.drive[file_id] = { $ref: address }
          entry.type = local_status.name
        }
        pre_hubs && (entry.hubs = pre_hubs)
      }
      return [path, entry, local_tree]
    }
    function sanitize_subs ({ local_id, entry, path, local_tree, xtype, mapping }) {
      const entries = {}
      if (!local_id) {
        entry.subs = []

        if (entry.drive) {
          // entry.drive.theme && (entry.theme = entry.drive.theme)
          // entry.drive.lang && (entry.lang = entry.drive.lang)
          entry.inputs = []
          const new_drive = []
          const map_drive = {}
          const path_def = {}
          Object.entries(entry.drive).forEach(([dataset_type, dataset]) => {
            if(dataset_type.split('/')[1]){
              path_def[dataset_type] = dataset
              return
            }
            dataset_type = dataset_type.split('/')[0]

            const new_dataset = { files: [], mapping: {}, name: 'default' }
            Object.entries(dataset).forEach(([key, value]) => {
              new_dataset.files.push(append_file(key, value, entry, entries))
            })
            new_dataset.id = entry.id + '.default.' + dataset_type + '.dataset'
            Object.assign(new_dataset, fill_dataset(new_dataset, dataset_type))
            activate_dataset(new_dataset, dataset_type)
            new_drive.push(new_dataset.id)

          })
          if (Object.keys(path_def).length) {
            Object.entries(path_def).forEach(([path, value]) =>{
              const [dataset_type, file_name] = path.split('/')
              const new_dataset = map_drive[dataset_type] || (map_drive[dataset_type] = { files: [], mapping: {}, name: 'default' })
              
              if(!new_dataset.id){
                new_dataset.id = entry.id + '.default.' + dataset_type + '.dataset'
                if(new_drive.includes(new_dataset.id)){
                  console.warn(`Both JSON and path definitions used for dataset "${dataset_type}" in the drive of "${entry.id}"`)
                  return
                }
                Object.assign(new_dataset, fill_dataset(new_dataset, dataset_type))
              }
              new_dataset.files.push(append_file(file_name, value, entry, entries))
              activate_dataset(new_dataset, dataset_type)
            })
            new_drive.push(...Object.values(map_drive).map(dataset => dataset.id))
          }
          entry.drive = new_drive
        }
        else
          entry.drive = []

        if(entry._){
          //@TODO refactor when fallback structure improves
          Object.entries(entry._).forEach(([local_id, value]) => {
            value.mapping = sanitize_mapping(value.mapping)
            Object.entries(value).forEach(([key, override]) => {
              if(key === 'mapping' || (key === '$' && xtype === 'instance'))
                return
              const sub_instance = sanitize_state({ local_id, entry: value, path, hub_entry: entry, local_tree, xtype: key === '$' ? 'module' : 'instance', mapping: value['mapping'], xkey: key }).entry
              entries[sub_instance.id] = JSON.parse(JSON.stringify(sub_instance))
              entry.subs.push(sub_instance.id)
              used_keys.add(sub_instance.id)
            })
        })}

      }
      return entries

      function append_file (key, value, entry, entries) {
        const sanitized_file = sanitize_file(key, value, entry, entries)
        entries[sanitized_file.id] = sanitized_file
        return sanitized_file.id
      }
      function fill_dataset (dataset, dataset_type) {
        dataset.type = status.dataset_types[dataset_type] || dataset_type
        dataset.xtype = dataset_type
        dataset.id = db.gen_id(dataset.id)
        dataset.node_id = entry.id
        entries[dataset.id] = dataset
      }
      function activate_dataset (dataset, dataset_type) {
        let check_name = true
        entry.inputs.forEach(dataset_id => {
          const ds = entries[dataset_id]
          if(ds.type === dataset.type)
            check_name = false
        })
        check_name && entry.inputs.push(dataset.id)

        if(status.root_module)
          fun_status.root_datasets.push(dataset.type)
        else {
          const hub_entry = db.read(['state', entry.hubs[0]])
          if(!hub_entry.inputs)
            throw new Error(`Node "${hub_entry.id}" has no "drive" defined in its fallback` + FALLBACK_SUBS_POST_ERROR)
          if(!mapping?.[dataset_type])
            throw new Error(`No mapping found for dataset "${dataset_type}" of subnode "${entry.id}" in node "${hub_entry.id}"\nTip: Add a mapping prop for "${dataset.type}" dataset in "${hub_entry.id}"'s fallback for "${entry.id}"` + FALLBACK_POST_ERROR)
          const mapped_file_type = mapping[dataset.type]
          hub_entry.inputs.some(input_id => {
            const input = db.read(['state', input_id])
            if(mapped_file_type === input.type){
              input.mapping[entry.id] = dataset.id
              entries[input_id] = input
              return
            }
          })
        }
      }
      function sanitize_mapping (mapping) {
        if(!mapping)
          return mapping
        console.log('Sanitizing mapping: ', mapping, entry.id)
        const new_mapping = mapping
        Object.entries(mapping).forEach(([key, value]) => {
          if(status.root_datasets.includes(value)){
            fun_status.dataset_types[key] = value
          }
          else if(status.dataset_types[value]){
            new_mapping[key] = status.dataset_types[value]
            fun_status.dataset_types[key] = status.dataset_types[value]
          }
          else
            throw new Error(`Mapped dataset "${value}" of "${entry.id}" can't be mapped to any root datasets` + FALLBACK_POST_ERROR)
        })
        return new_mapping
      }
    }
    function sanitize_file (file_id, file, entry, entries) {
      const type = file_id.split('.').at(-1)

      if (!isNaN(Number(file_id))) return file_id

      const raw_id = local_status.name + '.' + type
      file.id = raw_id
      file.name = file.name || file_id
      file.type = type
      file[file.type === 'js' ? 'subs' : 'hubs'] = [entry.id]
      if(file.$ref){
        file.address = file.address || address
      }
      file.id = db.gen_id(file.id)
      while(entries[file.id]){
        const no = file.id.split(':')[1]
        file.id = raw_id + ':' + (Number(no || 0) + 1)
      }
      return file
    }
  }
}

// External Function (helper)
function validate (data, xtype) {
  /**  Expected structure and types
   * Sample : "key1|key2:*:type1|type2"
   * ":" : separator
   * "|" : OR
   * "*" : Required key
   * */
  const expected_structure = {
    'api::function': () => {},
    '_::object': {
      ":*:object|number": {
        ":*:function|string|object": '',
        "mapping::": {}
      }
    },
    'drive::object': {
      "::object": {
        "::object|string": { // Required key, any name allowed
          "raw|$ref:*:object|string": {}, // data or $ref are names, required, object or string are types
          "$ref": "string",
          "address": "string",
        }
      },
    },
    'net::object': {}
  }

  validate_shape(data, expected_structure)

  function validate_shape (obj, expected, super_node = 'root', path = '') {
    const keys = Object.keys(obj)
    const values = Object.values(obj)
    let strict = Object.keys(expected).length

    const all_keys = []
    Object.entries(expected).forEach(([expected_key, expected_value]) => {
      let [expected_key_names, required, expected_types] = expected_key.split(':')
      expected_types = expected_types ? expected_types.split('|') : [typeof(expected_value)]
      let absent = true
      if(expected_key_names)
        expected_key_names.split('|').forEach(expected_key_name => {
          const value = obj[expected_key_name]
          if(value !== undefined){
            all_keys.push(expected_key_name)
            const type = typeof(value)
            absent = false

            if(expected_types.includes(type))
              type === 'object' && validate_shape(value, expected_value, expected_key_name, path + '/' + expected_key_name)
            else
              throw new Error(`Type mismatch: Expected "${expected_types.join(' or ')}" got "${type}" for key "${expected_key_name}" at:` + path + FALLBACK_POST_ERROR)
          }
        })
      else{
        strict = false
        values.forEach((value, index) => {
          absent = false
          const type = typeof(value)

          if(expected_types.includes(type))
            type === 'object' && validate_shape(value, expected_value, keys[index], path + '/' + keys[index])
          else
            throw new Error(`Type mismatch: Expected "${expected_types.join(' or ')}" got "${type}" for key "${keys[index]}" at: ` + path + FALLBACK_POST_ERROR)
        })
      }
      if(absent && required){
        if(expected_key_names)
          throw new Error(`Can't find required key "${expected_key_names.replace('|', ' or ')}" at: ` + path + FALLBACK_POST_ERROR)
        else
          throw new Error(`No sub-nodes found for super key "${super_node}" at sub: ` + path + FALLBACK_POST_ERROR)
      }
    })

    strict && keys.forEach(key => {
      if(!all_keys.includes(key)){
        throw new Error(`Unknown key detected: '${key}' is an unknown property at: ${path || 'root'}` + FALLBACK_POST_ERROR)
      }
    })
  }
}
function extract_filename (address) {
  const parts = address.split('/node_modules/')
  const last = parts.at(-1).split('/')
  if(last.at(-1) === 'index.js')
    return last.at(-2)
  return last.at(-1).slice(0, -3)
}
function get_instance_path (modulepath, modulepaths = status.modulepaths) {
  return modulepath + ':' + modulepaths[modulepath]++
}
async function get_input ({ id, name, $ref, type, raw, address }) {
  const xtype = (typeof(id) === "number" ? name : id).split('.').at(-1)
  let result = db.read(['state', id])?.raw
  if (!result) {
    if (raw === undefined){
      // Patch: Prepend GitHub project name if running on GitHub Pages
      let github_project = ''
      if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
        const path_parts = window.location.pathname.split('/').filter(Boolean)
        if (path_parts.length > 0 && !$ref.startsWith('/' + path_parts[0])) {
          github_project = '/' + path_parts[0] + ($ref.startsWith('/') ? '' : '/')
        }
      }
      const ref = github_project + address.substring(0, address.lastIndexOf("/")) + '/'  + $ref
      const response = await fetch(ref, { cache: 'no-store' })

      if (!response.ok) 
        throw new Error(`Failed to fetch data from '${ref}' for '${id}'` + FALLBACK_SYNTAX_POST_ERROR)
      else
        result = await response[xtype === 'json' ? 'json' : 'text']()
    }
    else
      result = raw
    db.add(['state', id], { id, name, type, address, $ref, raw: result })
  }
  return result
}
function compare(before, after, address) {
  if (typeof after !== "object" || after === null) return after

  for (const key in after) {
    if (key === "$ref") {
      if (!before || before[key] !== after[key]) {
        //@TODO: What if before is from an override not fallback
        after.address = address
      }
    } else {
      after[key] = compare(before ? before[key] : undefined, after[key], address)
    }
  }
  return after
}
//Unavoidable side effect
function add_source_code (hubs) {
  hubs.forEach(async id => {
    const data = db.read(['state', id])
    if (data.type === 'js') {
      data.data = await get_input(data)
      db.add(['state', data.id], data)
      return
    }
  })
}
function verify_imports (id, imports, data) {
  const state_address = imports.find(imp => imp.includes('STATE'))
  HELPER_MODULES.push(state_address)
  imports = imports.filter(imp => !HELPER_MODULES.includes(imp))
  if(!data._){
    if(imports.length > 1){
      imports.splice(imports.indexOf(state_address), 1)
      throw new Error(`No sub-nodes found for required modules "${imports.join(', ')}" in the fallback of "${status.local_statuses[id].module_id}"` + FALLBACK_POST_ERROR)
    }
    else return
  }
  const fallback_imports = Object.keys(data._)

  imports.forEach(imp => {
    let check = true
    fallback_imports.forEach(fallimp => {
      if(imp === fallimp)
        check = false
    })

    if(check)
      throw new Error('Required module "'+imp+'" is not defined in the fallback of '+status.local_statuses[id].module_id + FALLBACK_POST_ERROR)
  })
  
  fallback_imports.forEach(fallimp => {
    let check = true
    imports.forEach(imp => {
      if(imp === fallimp)
        check = false
    })
    
    if(check)
      throw new Error('Module "'+fallimp+'" defined in the fallback of '+status.local_statuses[id].module_id+' is not required')
  })

}
function symbolfy (data) {
  const i2s = {}
  const s2i = {}
  const i2a = {}
  const a2i = {}
  const subs = []
  data.subs && data.subs.forEach(sub => {
    const substate = db.read(['state', sub])
    i2a[a2i[sub] = encode(sub)] = sub
    s2i[i2s[sub] = Symbol(a2i[sub])] = sub
    subs.push({ sid: i2s[sub], type: substate.type })
  })
  return [subs, s2i, i2s, a2i, i2a]
}
function encode(text) {
  let code = ''
  while (code.length < 10) {
    for (let i = 0; i < text.length && code.length < 10; i++) {
      code += Math.floor(10 + Math.random() * 90)
    }
  }
  return code
}
function listify(tree, prefix = '') {
  if (!tree)
    return []
  
  const result = []

  function walk(current, prefix = '') {
    for (const key in current) {
      if (key === '$' && current[key]._ && typeof current[key]._ === 'object') {
        walk(current[key]._, prefix)
      } else {
        const path = prefix ? `${prefix}>${key}` : key
        result.push(path)
        if (current[key]?.$?._ && typeof current[key].$._ === 'object') {
          walk(current[key].$._, path)
        }
      }
    }
  }

  if (tree._ && typeof tree._ === 'object') {
    walk(tree._, prefix)
  }

  return result
}
function register_overrides ({overrides, address, ...args}) {
  const { id: root_id } = args
  recurse(args)
  return overrides
  function recurse ({ tree, path = '', id, xtype = 'instance', local_modulepaths = {} }) {

    tree._ && Object.entries(tree._).forEach(([type, instances]) => {
      const sub_path = path + '>' + type
      Object.entries(instances).forEach(([id, branch]) => {
        const resultant_path = id === '$' ? sub_path : sub_path + ':' + id
        if(typeof(branch) === 'function'){
          const override = mutate
          function mutate (...all) {
            const before = JSON.parse(JSON.stringify(all[2][0]()))
            const after = compare(before, branch(...all), address)
            if(after.api){
              const api = after.api
              after.api = (...all) => {
                const before = JSON.parse(JSON.stringify(all[2][0]()))
                return compare(before, api(...all), address)
              }
            }
            return after
          }
          if(overrides[resultant_path]){
            overrides[resultant_path].fun.push(override)
            overrides[resultant_path].by.push(root_id)
          }
          else
            overrides[resultant_path] = {fun: [override], by: [root_id]}
        }
        else if ( ['object', 'string'].includes(typeof(branch)) && id !== 'mapping' && branch._ === undefined)
          status.args[resultant_path] = structuredClone(branch)
        else
          recurse({ tree: branch, path: sub_path, id, xtype, local_modulepaths })
      })
    })
  }
}
function get_fallbacks ({ fallback_data, overrides, modulepath, instance_path }) {
  return [mutated_fallback, ...overrides]
    
  function mutated_fallback () {
    const data = fallback_data

    merge_trees(data, modulepath)
    return data

    function merge_trees (data, path) {
      if (data._) {
        Object.entries(data._).forEach(([type, data]) => merge_trees(data, path + '>' + type.split('$')[0].replace('.', '>')))
      } else {
        data.$ = { _: status.tree_pointers[path]?._ }
      }
    }
  }
}
function check_version () {
  if (db.read(['playproject_version']) != VERSION) {
    db.wash()
    return true
  }
}
function download (data, name) {
  const dataStr = JSON.stringify(data, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name}.json`
  a.click()
}
// Public Function
function create_statedb_interface (local_status, node_id, xtype) {
  const drive = {
        get: (path) => get(path), has: (path) => has(path), 
        put: (path, buffer) => put(path, buffer), list: (path) => list(path)
      }
  const admin_drive = { get, has, put, list }
  const api =  {
    public_api: {
      watch, get_sub, drive, get: get_drive
    },
    private_api: {
      drive: admin_drive,
      xget: (id) => db.read(['state', id]),
      get_all: () => db.read_all(['state']),
      get_dataset,
      register,
      load: (snapshot) => {
        db.wash()
        Object.entries(snapshot).forEach(([key, value]) => {
          db.add([key], JSON.parse(value), true)
        })
        window.location.reload()
      },
      swtch,
      unregister,
      status,
      export_db,
      import_db,
      export_root,
      import_root,
      register_callback
    }
  }
  node_id === status.ROOT_ID && (api.public_api.admin = api.private_api)
  return api

  async function watch (listener, on) {
    if(on)
      status.services[node_id] = Object.keys(on)
    const data = db.read(['state', node_id])
    if(listener){
      (status.listeners[data.id] = status.listeners[data.id] || []).push(listener)
      await listener(await make_input_map(data.inputs))
    }
    return xtype === 'module' ? local_status.sub_modules : local_status.sub_instances[node_id]
  }
  function register_callback (callbacks) {
    status.callbacks.push(...callbacks)
  }
  function export_db (result) {
    const datasets = get_dataset(result)
    result.dataset = {}
    datasets.forEach(dataset_id => {
      const dataset = db.read(['state', dataset_id])
      const node_id = dataset.node_id
      const files = dataset.files || []
      result.dataset[node_id] = {}
      files.forEach(file_id => {
        const file = db.read(['state', file_id])
        result.dataset[node_id][file.name] = { raw: file.raw}
      })
    })
    
    download(result, `${result.name}-${result.type}`)
  }
  function import_db (data) {
    register(data)
    status.callback({ type: 'import', data })
  }
  function export_root ({name}) {
    const result = db.read_all([name])
    console.log(name, result)
    download(result, name)
  }
  function import_root (data, name) {
    Object.entries(data).forEach(([key, value]) => {
      db.add([name, key], value)
    })
    console.log('hello')
    db.push(['root_datasets'], { name: name })
    status.callback({ type: 'import', data })
  }
  function get_sub (type) {
    const subs = xtype === 'module' ? local_status.sub_modules : local_status.sub_instances[node_id]
    return subs.filter(sub => sub.type === type)
  }
  function get_dataset ({ root = 'state', type: dataset_type, name: dataset_name } = { root: 'state'}) {
    const node = db.read([root, status.ROOT_ID])
    if(dataset_type){
      const dataset_list = []
      node.drive.forEach(dataset_id => {
        const dataset = db.read([root, dataset_id])
        if(dataset.type === dataset_type)
          dataset_list.push(dataset.name)
      })
      if(dataset_name){
        return recurse(status.ROOT_ID, dataset_type)
      }
      return dataset_list
    }
    const datasets = []
    node.inputs && node.inputs.forEach(dataset_id => {
      datasets.push(db.read([root, dataset_id]).type)
    })
    return datasets
  
    function recurse (node_id, dataset_type){
      const node_list = []
      const entry = db.read(['state', node_id])
      entry.drive && entry.drive.forEach(dataset_id => {
        const dataset = db.read(['state', dataset_id])
        if(dataset.type === dataset_type && dataset.name === dataset_name){
          node_list.push(dataset_id)
          return
        }
      })
      entry.subs && entry.subs.forEach(sub_id => node_list.push(...recurse(sub_id, dataset_type)))
      return node_list
    }
  }
  function register ({ type: dataset_type, name: dataset_name, dataset}) {
    Object.entries(dataset).forEach(([node_id, files]) => {
      const new_dataset = { files: [] }
      const node = db.read(['state', node_id])

      Object.entries(files).forEach(([file_id, file]) => {
        const type = file_id.split('.').at(-1)
        
        file.id = db.gen_id(node.name + '.' + type)
        file.name = file_id
        file.type = type
        file[file.type === 'js' ? 'subs' : 'hubs'] = [node_id]
        
        
        db.add(['state', file.id], file)
        new_dataset.files.push(file.id)
      })
  
      new_dataset.id = db.gen_id(node_id + '.' + dataset_name + '.' + dataset_type + '.dataset')
      new_dataset.name = dataset_name
      new_dataset.type = dataset_type
      //@TODO: Make dataset xtypes dynamic
      new_dataset.xtype = dataset_type
      new_dataset.node_id = node_id
      
      node.drive.push(new_dataset.id) //@TODO: Rethink how to simplify this push
      db.add(['state', node.id], node)
      db.add(['state', new_dataset.id], new_dataset)
    })
    console.log(' registered ' + dataset_name + '.' + dataset_type)
  }
  function unregister ({ type: dataset_type, name: dataset_name } = {}) {
    return recurse(status.ROOT_ID)

    function recurse (node_id){
      const node = db.read(['state', node_id])
      node.drive && node.drive.some(dataset_id => {
        const dataset = db.read(['state', dataset_id])
        if(dataset.name === dataset_name && dataset.type === dataset_type){
          node.drive.splice(node.drive.indexOf(dataset_id), 1)
          return true
        }
      })
      node.inputs && node.inputs.some(dataset_id => {
        const dataset = db.read(['state', dataset_id])
        if(dataset.name === dataset_name && dataset.type === dataset_type){
          node.inputs.splice(node.inputs.indexOf(dataset_id), 1)
          swtch(dataset_type)
          return true
        }
      })
      db.add(['state', node_id], node)
      node.subs.forEach(sub_id => recurse(sub_id))
    }
  }
  function swtch ({ type: dataset_type, name: dataset_name = 'default'}) {
    recurse(dataset_type, dataset_name, status.ROOT_ID)

    async function recurse (target_type, target_name, id) {
      const node = db.read(['state', id])
      
      let target_dataset
      node.drive && node.drive.forEach(dataset_id => {
        const dataset = db.read(['state', dataset_id])
        if(target_name === dataset.name && target_type === dataset.type){
          target_dataset = dataset
          return
        }
      })
      if(target_dataset){
        node.inputs.forEach((dataset_id, i) => {
          const dataset = db.read(['state', dataset_id])
          if(target_type === dataset.type){
            node.inputs.splice(i, 1)
            return
          }
        })
        node.inputs.push(target_dataset.id)
      }
      db.add(['state', id], node)
      const input_map = await make_input_map(node.inputs)
      status.listeners[id] && status.listeners[id].forEach(async listener => {
        await listener(input_map)
      })
      node.subs && node.subs.forEach(sub_id => {
        const subdataset_id = target_dataset?.mapping?.[sub_id] 
        recurse(target_type, db.read(['state', subdataset_id])?.name || target_name, sub_id)
      })
    }
  }
  function get_drive (sid){
    const id = status.s2i[sid]
    if(!id)
      throw new Error(`No drive found for symbol "${sid}"`)
    return {
      list: (path) => list(path, id),
      get: (path) => get(path, id),
      has: (path) => has(path, id),
      on
    }
    function on (listener) {
      (status.listeners[id] = status.listeners[id] || []).push(listener)
    }
  }
  //Node specific functions
  function list (path, id = node_id) {
    const node = db.read(['state', id])
    if(!node.drive)
      throw new Error(`Node "${id}" has no drive`)
    const dataset_names = node.drive.map(dataset_id => {
      return dataset_id.split('.').at(-2) + '/'
    })
    if (path) {
      let index
      dataset_names.some((dataset_name, i) => {
        if (path.includes(dataset_name)) {
          index = i
          return true
        }
      })
      if (index === undefined)
        throw new Error(`Dataset "${path}" not found in node "${node.name}"`) 
      const dataset = db.read(['state', node.drive[index]])
      return dataset.files.map(fileId => {
        const file = db.read(['state', fileId])
        return file.name
      })
    }
    return dataset_names
  }
  async function get (path, id = node_id) {
    const [dataset_name, file_name] = path.split('/')
    const node = db.read(['state', id])
    let dataset
    if(!node.drive)
      throw new Error(`Node ${node.id} has no drive defined in its fallback` + FALLBACK_POST_ERROR)
    node.inputs.some(dataset_id => {
      if (dataset_name === dataset_id.split('.').at(-2)) {
        dataset = db.read(['state', dataset_id])
        return true
      }
    })
    if (!dataset) 
      throw new Error(`Dataset "${dataset_name}" not found in node "${node.name}"`)
    
    let target_file
    for (const file_id of dataset.files) {
      const file = db.read(['state', file_id])
      if (file.name === file_name) {
        target_file =  { id: file.id, name: file.name, type: file.type, raw: await get_input(file)}
        break
      }
    }
    if (!target_file){
      throw new Error(`File "${path}" not found in node "${node.id}"`)
    }
    return target_file
  }
  async function put (path, buffer, id = node_id) {
    const [dataset_name, filename] = path.split('/')
    let dataset
    const node = db.read(['state', id])
    node.drive.some(dataset_id => {
      if (dataset_name === dataset_id.split('.').at(-2)) {
        dataset = db.read(['state', dataset_id])
        return true
      }
    })
    if (!dataset) 
      throw new Error(`Dataset "${dataset_name}" not found in node "${node.name}"`)
    const type = filename.split('.').pop()
    const raw_id = node.name + '.' + type
    const file = {
      id: raw_id,
      name: filename,
      type,
      raw: buffer
    }
    for (const file_id of dataset.files) {
      const temp_file = db.read(['state', file_id])
      if(temp_file.name === filename){
        file.id = file_id
        break
      }
    }
    if(!dataset.files.includes(file.id)){
      file.id = db.gen_id(file.id)
      dataset.files.push(file.id)
      db.add(['state', dataset.id], dataset)
    }
    db.add(['state', file.id], file)
    const input_map = await make_input_map(node.inputs)
    status.listeners[node.id].forEach(async listener => {
      await listener(input_map)
    })
    status.callback && status.callback({ type: 'put', data: id })

    return { id: file.id, name: filename, type, raw: buffer }
  }
  function has (path, id = node_id) {
    const [dataset_name, filename] = path.split('/')
    let dataset
    const node = db.read(['state', id])
    node.drive.some(dataset_id => {
      if (dataset_name === dataset_id.split('.').at(-2)) {
        dataset = db.read(['state', dataset_id])
        return true
      }
    })
    if (!dataset) 
      throw new Error(`Dataset "${dataset_name}" not found in node "${node.name}"`)
    return dataset.files.some(file_id => {
      const file = db.read(['state', file_id])
      return file && file.name === filename
    })
  }
}
async function make_input_map (inputs) {
  const input_map = []   
  if (inputs) {
    await Promise.all(inputs.map(async input => {
      let files = []
      const dataset = db.read(['state', input])
      await Promise.all(dataset.files.map(async file_id => {
        const input_state = db.read(['state', file_id])
        files.push(dataset.id.split('.').at(-2) + '/' + input_state.name)
      }))
      input_map.push({ type: dataset.xtype, paths: files })
    }))
  }
  return input_map
}


module.exports = STATE
},{"io":10,"localdb":12}],4:[function(require,module,exports){
(function (__filename){(function (){
const graphic = require('graphic')
const IO = require('io')
const STATE = require('STATE')
const name = 'footer'
const statedb = STATE(__filename)
// ----------------------------------------
const { sdb, subs: [get] } = statedb(fallback_module, fallback_instance)
function fallback_module () { 
	return {}
}
function fallback_instance () { 
	const data = require('./instance.json')
	data.inputs['footer.css'] = {
		$ref: new URL('src/node_modules/css/default/footer.css', location).href
	}
	return data 
}
/******************************************************************************
  APP FOOTER COMPONENT
******************************************************************************/
// ----------------------------------------
const shopts = { mode: 'closed' }
// ----------------------------------------
module.exports = footer

async function footer (opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) 
  const on = {
		css: inject,
		scroll,
		json: fill
	}
	
  const send = await IO(id, name, on)
  // ----------------------------------------
  // OPTS
  // ----------------------------------------
  let island = await graphic('island', './src/node_modules/assets/svg/deco-island.svg')
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
      <footer class='footer'>
      </footer>
    <style></style>`
  // ----------------------------------------
  const style = shadow.querySelector('style')
  const footer = shadow.querySelector('footer')

	sdb.watch(onbatch)
  return el

  function onbatch(batch){
		for (const {type, data} of batch) {
      on[type](data)
    }  
	}
	async function inject (data){
		style.innerHTML = data.join('\n')
	}
  async function fill ([ opts ]) {
    const graphics = opts.icons.map(icon => graphic('icon', icon.imgURL))
    const icons = await Promise.all(graphics)
    footer.innerHTML = `
          <div class='scene'>
              ${island.outerHTML}
              <nav class='contacts'>
                  ${opts.icons.map((icon, i) => 
                      `<a href=${icon.url} 
                      title=${icon.name} 
                      target="${icon.url.includes('http') ? "_blank" : null}"
                      >${icons[i].outerHTML}</a>`
                  )}
              </nav>
          </div>
          <p class='copyright'>${new Date().getFullYear()+' '+opts.copyright}</p>
      `
  }
  async function scroll () {
    el.scrollIntoView({behavior: 'smooth'})
    el.tabIndex = '0'
    el.focus()
    el.onblur = () => {
      el.tabIndex = '-1'
      el.onblur = null
    }
  }
}

}).call(this)}).call(this,"/src/node_modules/footer/footer.js")
},{"./instance.json":5,"STATE":3,"graphic":8,"io":10}],5:[function(require,module,exports){
module.exports={
  "inputs": {
    "footer.json": {
      "data": {
        "copyright": " PlayProject",
        "icons": [
          {
            "id": "1",
            "name": "email",
            "imgURL": "./src/node_modules/assets/svg/email.svg",
            "url": "mailto:ninabreznik@gmail.com"
          },
          {
            "id": "2",
            "name": "twitter",
            "imgURL": "./src/node_modules/assets/svg/twitter.svg",
            "url": "https://twitter.com/playproject_io"
          },
          {
            "id": "3",
            "name": "Github",
            "imgURL": "./src/node_modules/assets/svg/github.svg",
            "url": "https://github.com/playproject-io"
          },
          {
            "id": "4",
            "name": "Gitter",
            "imgURL": "./src/node_modules/assets/svg/gitter.svg",
            "url": "https://gitter.im/playproject-io/community"
          }
        ]
      }
    }
  }
}
},{}],6:[function(require,module,exports){
(function (__filename){(function (){
/******************************************************************************
  STATE
******************************************************************************/
const STATE = require('STATE')
const localdb = require('localdb')
const name = 'graph_explorer'
const statedb = STATE(__filename)
const default_slots = [['hubs', 'subs'], ['inputs', 'outputs']]
// ----------------------------------------
const { sdb, subs: [get] } = statedb(fallback_module, fallback_instance)
function fallback_module () { 
  return {}
}
function fallback_instance () {
  return {
    inputs: {
      'graph_explorer.css': {
        $ref: new URL('src/node_modules/css/default/graph_explorer.css', location).href
      }
    }
  }
}

const IO = require('io')
const {copy, get_color, download_json} = require('helper')
/******************************************************************************
  GRAPH COMPONENT
******************************************************************************/
// ----------------------------------------
const shopts = { mode: 'closed' }
// ----------------------------------------

module.exports = graph_explorer

async function graph_explorer (opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const db = localdb()
  const { id, sdb } = await get(opts.sid)
  const hub_id = opts.hub[0]
  const status = { tab_id: 0, count: 0, entry_types: {}, menu_ids: [] }
  const on = {
    init,
    css: inject,
    scroll
  }

  const on_add = {
    entry: add_entry,
    entry_compact: add_entry_compact,
    menu: add_action
  }
  const admin = sdb.req_access(opts.sid)
  const send = await IO(id, name, on)
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shadow = el.attachShadow(shopts)
  const style = document.createElement('style')
  await sdb.watch(onbatch)
  shadow.innerHTML = `
  <div>
    <button class="export">
      Export
    </button>
    <button class="import">
      Import
    </button>
    <input style="display: none;" class="upload" type='file' />
  </div>
  <span>Compact mode</span>
  <label class="toggle_switch">
    <input type="checkbox">
    <span class="slider"></span>
  </label>
  <main>

  </main>`
  const main = shadow.querySelector('main')
  const compact_switch = shadow.querySelector('.toggle_switch > input')
  const upload = shadow.querySelector('.upload')
  const import_btn = shadow.querySelector('.import')
  const export_btn = shadow.querySelector('.export')
  shadow.append(style)
  shadow.addEventListener('copy', oncopy)
  /************************************
   Listeners
  *************************************/
  compact_switch.onchange = e => add_root(e.target.checked)
  export_btn.onclick = export_fn
  import_btn.onclick = () => upload.click()
  upload.onchange = import_fn
  return el

  /******************************************
   Mix
  ******************************************/
  function onbatch (batch) {
    for (const {type, data} of batch) {
      on[type](data)
    }  
  }
  async function oncopy (e) {
    const selection = shadow.getSelection()
    e.clipboardData.setData('text/plain', copy(selection))
    e.preventDefault()
  }
  function export_fn () {
    const blob = new Blob([JSON.stringify(localStorage, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = 'snapshot.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  function import_fn () {
    const file = upload.files[0]
    const reader = new FileReader()
    reader.onload = e => {
      const blob = JSON.parse(e.target.result)
      admin.load(blob)
    }
    reader.readAsText(file)
  }
  async function init ({ data }) {
    let id = Object.keys(data).length + 1

    add({ id, name: 'edit', type: 'action', hubs: [] })
    add({ id, name: 'link', type: 'action', hubs: [] })
    add({ id, name: 'unlink', type: 'action', hubs: [] })
    add({ id, name: 'drop', type: 'action', hubs: [] })

    status.graph = data
    add_root(false)

    function add (args){
      status.menu_ids.push(args.id)
      data[id++] = args
    }
  }
  async function add_root(compact) {
    status.xentry = null
    status.entry_types = {}
    status.count = 0
    status.tab_id = 0
    main.innerHTML = ''
    const root_entries = Object.values(status.graph).filter(entry => !entry.hubs)
    if(compact)
      root_entries.forEach((data, i) => add_entry_compact({hub_el: main, data, last: i === root_entries.length - 1, ancestry:[] }))
    else  
      root_entries.forEach((data, i) => add_entry({hub_el: main, data, last: i === root_entries.length - 1, ancestry:[] }))
  }
  function html_template (data, space, pos){
    const element = document.createElement('div')
    element.classList.add(data.type, 'entry', 'a'+data.id)
    element.tabIndex = '0'
    element.dataset.space = space
    element.dataset.pos = pos
    return element
  }
  /******************************************
   Addition Operation
  ******************************************/
  // function add_el ({ data, parent, space, grand_last, type }){
  //   const is_single = parent.children.length ? false : true
  //   if(data.root){
  //     parent.prepend(add_root({ data, last: false}))
  //     return
  //   }
  //   //hub or sub node check
  //   if(type === 'inputs')
  //     parent.append(on_add[type]({ data, space, grand_last, first: is_single}))
  //   else
  //     parent.prepend(on_add[type]({ data, space, grand_last, last: is_single}))
  // }

  function add_action ({ hub_el, data, last, space = '' }) {
    const element = html_template(data, last, space)
    hub_el.append(element)
    !status.entry_types[data.type] && (status.entry_types[data.type] = Object.keys(status.entry_types).length)

    element.innerHTML = `
    <div class="slot_list">
      <span class="odd">${space}</span>
      <span class="type_emo odd"></span>
      <span class="name odd">${data.name}</span>
    </div>`
    const name = element.querySelector('.slot_list > .name')
    name.onclick = () => send({ type: 'click', to: hub_id, data })

  }
  function add_entry_compact ({ hub_el, data, first, last, space = '', pos, ancestry }) {
    //Init
    const element = html_template(data, last, space, pos)
    !status.entry_types[data.type] && (status.entry_types[data.type] = Object.keys(status.entry_types).length)
    ancestry = [...ancestry]
    let lo_space = space + (last ? '&nbsp;' : '│')
    let hi_space = space + (first ? '&nbsp;' : '│')
    const space_handle = [], els = []
    let slot_no = 0, slot_on

    //HTML
    element.innerHTML = `
      <div class="slot_list">
        <span class="space odd"><!--
        -->${space}<span>${last ? '└' : first ? "┌" : '├'}</span><!--
        --><span class='on'>${last ? '┗' : first ? "┏" : '┠'}</span>
        </span><!--
        --><span class="menu_emo"></span><!--
        --><span class="type_emo odd"></span><!--
        --><span class="name odd">${data.name}</span>
      </div>
      <div class="menu entries"></div>
    `

    //Unavoidable mix
    const slot_list = element.querySelector('.slot_list')
    const name = element.querySelector('.slot_list > .name')
    hub_el.append(element)
    const copies = main.querySelectorAll('.a'+data.id + '> .slot_list')
    if(copies.length > 1){
      copies.forEach(copy => !copy.previousElementSibling && (copy.style.color = '#000000'))
    }
    if(ancestry.includes(data.id)){
      name.onclick = () => {
        const copies = main.querySelectorAll('.a'+data.id + '> .slot_list')
        copies.forEach((copy, i) => {
          if(copy === slot_list)
            return
          const temp1 = copy.style.color
          const temp2 = copy.style.backgroundColor
          copy.style.color = '#fff'
          copy.style.backgroundColor = '#000000'
          setTimeout(() => {
            copy.style.color = temp1
            copy.style.backgroundColor = temp2
          }, 1000)
        })
      }
      return
    }
    ancestry.push(data.id)

    //Elements
    const menu_emo = element.querySelector('.slot_list > .menu_emo')
    const type_emo = element.querySelector('.slot_list > .type_emo')
    const menu = element.querySelector('.menu')

    //Listeners
    type_emo.onclick = type_click
    name.onclick = () => send({ type: 'click', to: hub_id, data })
    const slotmap = []
    const data_keys = Object.keys(data)
    const new_pair = [[], []]
    const slot_handle = []
    let check = false
    default_slots.forEach(pair => {
      pair.forEach((slot, i) => {
        if(data_keys.includes(slot)){
          new_pair[i].push(slot)
          check = true
        }
      })
    })
    check && slotmap.push(new_pair)
    slotmap.forEach(handle_slot)
    menu_click({el: menu, emo: menu_emo, data: status.menu_ids, pos: 0, type: 'menu'})
    if(getComputedStyle(type_emo, '::before').content === 'none')
      type_emo.innerHTML = `[${status.entry_types[data.type]}]`

    //Procedures
    async function handle_slot (pair, i) {
      const slot_check = [false, false]
      const slot_emo = document.createElement('span')
      slot_emo.innerHTML = '<span>─</span><span></span>'
      menu_emo.before(slot_emo)
      slot_no++

      pair.forEach((x, j) => {
        let gap, mode, emo_on
        const pos = !j
        const count = status.count++
        const style = document.createElement('style')
        const entries = document.createElement('div')
        entries.classList.add('entries')

        element.append(style)
        if(pos){
          slot_list.before(entries)
          mode= 'hi'
          gap = hi_space
          hi_space += `<span class="space${count}"><span class="hi">&nbsp;</span>${x.length ? '<span class="xhi">│</span>' : ''}&nbsp;&nbsp;</span>`
        }
        else{
          menu.after(entries)
          mode = 'lo'
          gap = lo_space
          lo_space += `<span class="space${count}"><span class="lo">&nbsp;</span>${x.length ? '<span class="xlo">│</span>' : ''}&nbsp;&nbsp;</span>`
        }
        style.innerHTML = `.space${count} > .x${mode}{display: none;}`
        els.push(slot_emo)
        space_handle.push(() => style.innerHTML = `.space${count}${slot_on ? ` > .x${mode}` : ''}{display: none;}`)
        if(!x.length){
          const space = document.createElement('span')
          space.innerHTML = '&nbsp;&nbsp;&nbsp;'
          return
        }
        slot_emo.classList.add('compact')

        slot_handle.push(() => {
          slot_emo.classList.add('on')
          style.innerHTML = `.space${count} > .${emo_on ? 'x' : ''}${mode}{display: none;}`
          // emo_on && space_handle[i]()
          slot_check[j] = emo_on = !emo_on
          if(slot_check[0] && slot_check[1])
            slot_emo.children[0].innerHTML = '┼'
          else if(slot_check[0] && !slot_check[1])
            slot_emo.children[0].innerHTML = '┴'
          else if(!slot_check[0] && slot_check[1])
            slot_emo.children[0].innerHTML = '┬'
          else{
            slot_emo.children[0].innerHTML = '─'
            slot_emo.classList.remove('on')
          }
          const ids = []
          x.forEach(slot => ids.push(...data[slot]))
          handle_click({space: gap, pos, el: entries, data: ids, ancestry, type: 'entry_compact' })
        })
      })
      if(getComputedStyle(slot_emo, '::before').content === 'none')
        slot_emo.innerHTML = `<span>─</span><span>${slot_no}─</span>`
    }
    async function type_click() {
      slot_on = !slot_on
      // if(status.xentry === type_emo)
      //   status.xentry = null
      // else{
      //   status.xentry?.click()
      //   status.xentry = type_emo
      // }
      slot_list.classList.toggle('on')
      let temp = element
      //Find path to root
      while(temp.tagName !== 'MAIN'){
        if(temp.classList.contains('entry')){
          slot_on ? temp.classList.add('on') : temp.classList.remove('on')
          while(temp.previousElementSibling){
            temp = temp.previousElementSibling
            slot_on ? temp.classList.add('on') : temp.classList.remove('on')
          }
        }
        temp = temp.parentElement
      }
      els.forEach((emo, i) => {
        if(!emo.classList.contains('on')){
          space_handle[i]()
        }
      })
      slot_handle[0] && slot_handle[0]()
      slot_handle[1] && slot_handle[1]()
    }
    async function menu_click({ emo, emo_on, ...rest }, i) {
      emo.onclick = () => {
        emo.classList.toggle('on')
        emo_on = !emo_on
        handle_click({space: lo_space, ...rest })
      }
    }
  }
  function add_entry ({ hub_el, data, first, last, space = '', pos, ancestry }) {
    //Init
    const element = html_template(data, last, space, pos)
    !status.entry_types[data.type] && (status.entry_types[data.type] = Object.keys(status.entry_types).length)
    ancestry = [...ancestry]
    let lo_space = space + (last ? '&nbsp;&nbsp;&nbsp;' : '│&nbsp;&nbsp;')
    let hi_space = space + (first ? '&nbsp;&nbsp;&nbsp;' : '│&nbsp;&nbsp;')
    const space_handle = [], els = []
    let slot_no = 0, slot_on

    //HTML
    element.innerHTML = `
      <div class="slot_list">
        <span class="space odd"><!--
        -->${space}<span>${last ? '└' : first ? "┌" : '├'}</span><!--
        --><span class='on'>${last ? '┗' : first ? "┏" : '┠'}</span>
        </span><!--
        --><span class="menu_emo"></span><!--
        --><span class="type_emo odd"></span><!--
        --><span class="name odd">${data.name}</span>
      </div>
      <div class="menu entries"></div>
    `

    //Unavoidable mix
    const slot_list = element.querySelector('.slot_list')
    const name = element.querySelector('.slot_list > .name')
    hub_el.append(element)
    const copies = main.querySelectorAll('.a'+data.id + '> .slot_list')
    if(copies.length > 1){
      copies.forEach(copy => !copy.previousElementSibling && (copy.style.color = '#000000'))
    }
    if(ancestry.includes(data.id)){
      name.onclick = () => {
        const copies = main.querySelectorAll('.a'+data.id + '> .slot_list')
        copies.forEach((copy, i) => {
          if(copy === slot_list)
            return
          const temp1 = copy.style.color
          const temp2 = copy.style.backgroundColor
          copy.style.color = '#fff'
          copy.style.backgroundColor = '#000000'
          setTimeout(() => {
            copy.style.color = temp1
            copy.style.backgroundColor = temp2
          }, 1000)
        })
      }
      return
    }
    ancestry.push(data.id)

    //Elements
    const menu_emo = element.querySelector('.slot_list > .menu_emo')
    const type_emo = element.querySelector('.slot_list > .type_emo')
    const space_emo = element.querySelector('.slot_list > .space')
    const menu = element.querySelector('.menu')

    //Listeners
    space_emo.onclick = () => type_click(0)
    type_emo.onclick = () => type_click(1)
    name.onclick = () => send({ type: 'click', to: hub_id, data })
    const slotmap = []
    const data_keys = Object.keys(data)
    const new_pair = [[], []]
    const slot_handle = []
    let check = false
    default_slots.forEach(pair => {
      pair.forEach((slot, i) => {
        if(data_keys.includes(slot)){
          new_pair[i].push(slot)
          check = true
        }
      })
    })
    check && slotmap.push(new_pair)
    slotmap.forEach(handle_slot)
    menu_click({el: menu, emo: menu_emo, data: status.menu_ids, pos: 0, type: 'menu'})
    if(getComputedStyle(type_emo, '::before').content === 'none')
      type_emo.innerHTML = `[${status.entry_types[data.type]}]`

    //Procedures
    async function handle_slot (pair, i) {
      const slot_check = [false, false]
      const slot_emo = document.createElement('span')
      slot_emo.innerHTML = '<span></span><span>─</span>'
      menu_emo.before(slot_emo)
      slot_no++

      pair.forEach((x, j) => {
        let gap, mode, emo_on
        const pos = !j
        const count = status.count++
        const style = document.createElement('style')
        const entries = document.createElement('div')
        entries.classList.add('entries')

        element.append(style)
        if(pos){
          slot_list.before(entries)
          mode= 'hi'
          gap = hi_space
          hi_space += `<span class="space${count}"><span class="hi">&nbsp;</span>${x.length ? '<span class="xhi">│</span>' : ''}&nbsp;&nbsp;</span>`
        }
        else{
          menu.after(entries)
          mode = 'lo'
          gap = lo_space
          lo_space += `<span class="space${count}"><span class="lo">&nbsp;</span>${x.length ? '<span class="xlo">│</span>' : ''}&nbsp;&nbsp;</span>`
        }
        style.innerHTML = `.space${count} > .x${mode}{display: none;}`
        els.push(slot_emo)
        space_handle.push(() => style.innerHTML = `.space${count}${slot_on ? ` > .x${mode}` : ''}{display: none;}`)
        if(!x.length){
          const space = document.createElement('span')
          space.innerHTML = '&nbsp;&nbsp;&nbsp;'
          return
        }
        slot_emo.classList.add('compact')

        slot_handle.push(() => {
          slot_emo.classList.add('on')
          style.innerHTML = `.space${count} > .${emo_on ? 'x' : ''}${mode}{display: none;}`
          // emo_on && space_handle[i]()
          slot_check[j] = emo_on = !emo_on
          if(slot_check[0] && slot_check[1])
            slot_emo.children[1].innerHTML = '┼'
          else if(slot_check[0] && !slot_check[1])
            slot_emo.children[1].innerHTML = '┴'
          else if(!slot_check[0] && slot_check[1])
            slot_emo.children[1].innerHTML = '┬'
          else{
            slot_emo.children[1].innerHTML = '─'
            slot_emo.classList.remove('on')
          }
          const ids = []
          x.forEach(slot => ids.push(...data[slot]))
          handle_click({space: gap, pos, el: entries, data: ids, ancestry })
        })
      })
      if(getComputedStyle(slot_emo, '::before').content === 'none')
        slot_emo.innerHTML = `<span>${slot_no}─</span><span>─</span>`
    }
    async function type_click(i) {
      slot_on = !slot_on
      // if(status.xentry === type_emo)
      //   status.xentry = null
      // else{
      //   status.xentry?.click()
      //   status.xentry = type_emo
      // }
      slot_list.classList.toggle('on')
      let temp = element
      //Find path to root
      while(temp.tagName !== 'MAIN'){
        if(temp.classList.contains('entry')){
          slot_on ? temp.classList.add('on') : temp.classList.remove('on')
          while(temp.previousElementSibling){
            temp = temp.previousElementSibling
            slot_on ? temp.classList.add('on') : temp.classList.remove('on')
          }
        }
        temp = temp.parentElement
      }
      els.forEach((emo, i) => {
        if(!emo.classList.contains('on')){
          space_handle[i]()
        }
      })
      // slot_handle[0] && slot_handle[0]()
      slot_handle[i] && slot_handle[i]()
    }

    async function menu_click({ emo, emo_on, ...rest }, i) {
      emo.onclick = () => {
        emo.classList.toggle('on')
        emo_on = !emo_on
        handle_click({space: lo_space, ...rest })
      }
    }
  }
  // async function add_node_data (name, type, parent_id, users, author){
  //   const node_id = status.graph.length
  //   status.graph.push({ id: node_id, name, type: state.code_words[type], room: {}, users })
  //   if(parent_id){
  //     save_msg({
  //         head: [id],
  //         type: 'save_msg',
  //         data: {username: 'system', content: author + ' added ' + type.slice(0,-1)+': '+name, chat_id: parent_id}
  //       })
  //     //Add a message in the chat
  //     if(state.chat_task && parent_id === state.chat_task.id.slice(1))
  //       channel_up.send({
  //         head: [id, channel_up.send.id, channel_up.mid++],
  //         type: 'render_msg',
  //         data: {username: 'system', content: author+' added '+type.slice(0,-1)+': '+name}
  //       })
  //     const sub_nodes = graph[parent_id][state.add_words[type]]
  //     sub_nodes ? sub_nodes.push(node_id) : graph[parent_id][state.add_words[type]] = [node_id]
  //   }
  //   else{
  //     graph[node_id].root = true
  //     graph[node_id].users = [opts.host]
  //   }
  //   save_msg({
  //     head: [id],
  //     type: 'save_msg',
  //     data: {username: 'system', content: author + ' created ' + type.slice(0,-1)+': '+name, chat_id: node_id}
  //   })
  //   const channel = state.net[state.aka.taskdb]
  //   channel.send({
  //     head: [id, channel.send.id, channel.mid++],
  //     type: 'set',
  //     data: graph
  //   })
    
  // }
  // async function on_add_node (data) {
  //   const node = data.id ? shadow.querySelector('#a' + data.id + ' > .'+data.type) : main
  //   node && node.children.length && add_el({ data: { name: data.name, id: status.graph.length, type: state.code_words[data.type] }, parent: node, grand_last: data.grand_last, type: data.type, space: data.space })
  //   add_node_data(data.name, data.type, data.id, data.users, data.user)
  // }
  /******************************************
   Event handlers
  ******************************************/
  function handle_focus (e) {
    state.xtask = e.target
    state.xtask.classList.add('focus')
    state.xtask.addEventListener('blur', e => {
      if(e.relatedTarget && e.relatedTarget.classList.contains('noblur'))
        return
      state.xtask.classList.remove('focus')
      state.xtask = undefined
    }, { once: true })
  }
  function handle_popup (e) {
    const el = e.target
    el.classList.add('show')
    popup.style.top = el.offsetTop - 20 + 'px'
    popup.style.left = el.offsetLeft - 56 + 'px'
    popup.focus()
    popup.addEventListener('blur', () => {
      el.classList.remove('show')
    }, { once: true })
  }
  function handle_click ({ el, data, pos, hub_id, type = 'entry', ...rest }) {
    el.classList.toggle('show')
    if(data && el.children.length < 1){
      length = data.length - 1
      data.forEach((value, i) => on_add[type]({ hub_el: el, data: {...status.graph[value], hub_id}, first: pos ? 0 === i : false, last: pos ? false : length === i, pos, ...rest }))
    }
  }
  async function handle_export () {
    const data = await traverse( state.xtask.id.slice(1) )
    download_json(data)
  }
  async function handle_add (data) {
    data = data.slice(2).trim().toLowerCase() + 's'
    const input = document.createElement('input')
    let node, task_id, space = '', grand_last = true, root = true
    //expand other siblings
    if(state.xtask){
      node = state.xtask.querySelector('.' + data)
      task_id = state.xtask.id.slice(1)
      const before = state.xtask.querySelector('.' + data.slice(0,3))
      before.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable: true, view: window}))
      node.classList.add('show')
      grand_last = state.xtask.dataset.grand_last
      space = state.xtask.dataset.space
      state.xtask.classList.remove('focus')
      state.xtask = undefined
      root = false
    }
    else{
      node = main
      task_id = ''
    }
    node.prepend(input)
    input.onkeydown = async (event) => {
      if (event.key === 'Enter') {
        input.blur()
        add_el({ data : { name: input.value, id: status.graph.length, type: state.code_words[data], root }, space, grand_last, type: data, parent: node })
        const users = task_id ? graph[task_id].users : [host]
        add_node_data(input.value, data, task_id, users, host)
        //sync with other users
        if(users.length > 1)
          channel_up.send({
            head: [id, channel_up.send.id, channel_up.mid++],
            type: 'send',
            data: {to: 'task_explorer', route: ['up', 'task_explorer'], users: graph[task_id].users.filter(user => user !== host), type: 'on_add_node', data: {name: input.value, id: task_id, type: data, users, grand_last, space, user: host} }
          })
      }
    }
    input.focus()
    input.onblur = () => input.remove()
  }
  /******************************************
   Tree traversal
  ******************************************/
  async function jump (e){
    let target_id = e.currentTarget.dataset.id
    const el = main.querySelector('#a'+target_id)
    if(el)
      el.focus()
    else{
      const path = []
      let temp
      for(temp = status.graph[target_id]; temp.hub; temp = status.graph[temp.hub[0]])
        path.push(temp.id)
      temp = main.querySelector('#a'+temp.id)
      target_id = 'a'+target_id
      while(temp.id !== target_id){
        const sub_emo = temp.querySelector('.sub_emo')
        sub_emo.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable: true, view: window}))
        temp.classList.add('show')
        temp = temp.querySelector('#a'+path.pop())
      }
      temp.focus()
    }
      
  }
  async function traverse (id) {
    state.result = []
    state.track = []
    recurse(id)
    return state.result
  }
  function recurse (id){
    if(state.track.includes(id))
      return
    state.result.push(graph[id])
    state.track.push(id)
    for(temp = 0; graph[id].sub && temp < graph[id].sub.length; temp++)
      recurse(graph[id].sub[temp])
    for(temp = 0; graph[id].inputs && temp < graph[id].inputs.length; temp++)
      recurse(graph[id].inputs[temp])
    for(temp = 0; graph[id].outputs && temp < graph[id].outputs.length; temp++)
      recurse(graph[id].outputs[temp])
  }
  /******************************************
   Communication
  ******************************************/
  async function scroll () {
    el.scrollIntoView({behavior: 'smooth'})
    el.tabIndex = '0'
    el.focus()
    el.onblur = () => {
      el.tabIndex = '-1'
      el.onblur = null
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
}
}).call(this)}).call(this,"/src/node_modules/graph_explorer/graph_explorer.js")
},{"STATE":3,"helper":7,"io":10,"localdb":12}],7:[function(require,module,exports){
function copy (selection) {
  const range = selection.getRangeAt(0)
  const selectedElements = []
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ELEMENT,
    {
        acceptNode: function(node) {
            return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        }
    },
    false
  )

  while (walker.nextNode()) {
      walker.currentNode.tagName === 'SPAN' && selectedElements.push(walker.currentNode)
  }
  let text = ''
  selectedElements.forEach(el => {
    const before = getComputedStyle(el, '::before').content
    text += (before === 'none' ? '' : before.slice(1, -1)) + el.textContent
    text += el.classList.contains('name') ? '\n' : ''
  })
  return text
}
function get_color () {
  const letters = 'CDEF89'
  let color = '#'
  for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * letters.length)]
  }
  return color;
}
function download_json (data) {
  const json_string = JSON.stringify(data, null, 2);
  const blob = new Blob([json_string], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'data.json';
  link.click();
}
module.exports = {copy, get_color, download_json}
},{}],8:[function(require,module,exports){
const loadSVG = require('loadSVG')

function graphic(className, url) {
  
  return new Promise((resolve, reject) => {
    const el = document.createElement('div')
    el.classList.add(className)
    loadSVG(url, (err, svg) => {
      if (err) return console.error(err)
      el.append(svg)
      resolve(el)
    })
  })
}   

module.exports = graphic
},{"loadSVG":11}],9:[function(require,module,exports){
(function (__filename){(function (){
const graphic = require('graphic')
const Rellax = require('rellax')
const IO = require('io')
const STATE = require('STATE')
const name = 'header'
const statedb = STATE(__filename)
const shopts = { mode: 'closed' }
/******************************************************************************
  HEADER COMPONENT
******************************************************************************/

// ----------------------------------------
const { sdb, subs: [get] } = statedb(fallback_module, fallback_instance)
function fallback_module () { 
  return {}
}
function fallback_instance () {
  return {
    inputs: {
      'header.css': {
        $ref: new URL('src/node_modules/css/default/header.css', location).href
      },
      "header.json": {
        data: {
          "title": "Infrastructure for the next-generation Internet"
        }
      }
    }
  }
}
module.exports = header

async function header (opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid)
  const on = {
    css: inject,
    json: fill,
    scroll
  }
  const send = await IO(id, name, on)
  // ----------------------------------------
  // OPTS
  // ----------------------------------------
  var graphics = [
    graphic('playIsland', './src/node_modules/assets/svg/play-island.svg'),
    graphic('sun', './src/node_modules/assets/svg/sun.svg'),
    graphic('cloud1', './src/node_modules/assets/svg/cloud.svg'),
    graphic('cloud2', './src/node_modules/assets/svg/cloud.svg'),
    graphic('cloud3', './src/node_modules/assets/svg/cloud.svg'),
    graphic('cloud4', './src/node_modules/assets/svg/cloud.svg'),
    graphic('cloud5', './src/node_modules/assets/svg/cloud.svg'),
    graphic('cloud6', './src/node_modules/assets/svg/cloud.svg'),
    graphic('cloud7', './src/node_modules/assets/svg/cloud.svg'),
  ]

  const [playIsland, sun, cloud1, cloud2, cloud3, cloud4, cloud5, cloud6, cloud7] = await Promise.all(graphics)

  // Parallax effects
  // let playRellax = new Rellax(playIsland, { speed: 2 })
  let sunRellax = new Rellax(sun, { speed: 2 })
  let cloud1Rellax = new Rellax(cloud1, { speed: 4 })
  let cloud2Rellax = new Rellax(cloud2, { speed: 2 })
  let cloud3Rellax = new Rellax(cloud3, { speed: 4 })
  let cloud4Rellax = new Rellax(cloud4, { speed: 2 })
  let cloud5Rellax = new Rellax(cloud5, { speed: 4 })
  let cloud6Rellax = new Rellax(cloud6, { speed: 3 })
  let cloud7Rellax = new Rellax(cloud7, { speed: 3 })
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
  <div class='header'>
      <h1 class='title'></h1>
      <section class='scene'>
          <div class='sunCloud'>
          </div>
      </section>
  </div>
  <style></style>`
  // ----------------------------------------
  const style = shadow.querySelector('style')
  const scene = shadow.querySelector('.scene')
  const sunCloud = shadow.querySelector('.sunCloud')
  const title = shadow.querySelector('.title')
  await sdb.watch(onbatch)
  scene.append(cloud3, cloud4, cloud5, cloud6, cloud7, playIsland)
  sunCloud.append(cloud1, sun, cloud2)
  
  return el

  function onbatch(batch) {
    for (const {type, data} of batch) {
      on[type](data)
    }  
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill ([ opts ]) {
    title.innerHTML = opts.title
  }
  async function scroll () {
    el.scrollIntoView({behavior: 'smooth'})
    el.tabIndex = '0'
    el.focus()
    el.onblur = () => {
      el.tabIndex = '-1'
      el.onblur = null
    }
  }
}


}).call(this)}).call(this,"/src/node_modules/header/header.js")
},{"STATE":3,"graphic":8,"io":10,"rellax":1}],10:[function(require,module,exports){
const taken = {}

module.exports = io
function io(seed, alias) {
  if (taken[seed]) throw new Error(`seed "${seed}" already taken`)
  // const pk = seed.slice(0, seed.length / 2)
  // const sk = seed.slice(seed.length / 2, seed.length)
  const self = taken[seed] = { id: seed, alias, peer: {} }
  const io = { at, on }
  return io

  async function at (id, signal = AbortSignal.timeout(1000)) {
    if (id === seed) throw new Error('cannot connect to loopback address')
    if (!self.online) throw new Error('network must be online')
    const peer = taken[id] || {}
    // if (self.peer[id] && peer.peer[pk]) {
    //   self.peer[id].close() || delete self.peer[id]
    //   peer.peer[pk].close() || delete peer.peer[pk]
    //   return console.log('disconnect')
    // }
    // self.peer[id] = peer
    if (!peer.online) return wait() // peer with id is offline or doesnt exist
    return connect()
    function wait () {
      const { resolve, reject, promise } = Promise.withResolvers()
      signal.onabort = () => reject(`timeout connecting to "${id}"`)
      peer.online = { resolve }
      return promise.then(connect)
    }
    function connect () {
      signal.onabort = null
      const { port1, port2 } = new MessageChannel()
      port2.by = port1.to = id
      port2.to = port1.by = seed
      self.online(self.peer[id] = port1)
      peer.online(peer.peer[seed] = port2)
      return port1
    }
  }
  function on (online) { 
    if (!online) return self.online = null
    const resolve = self.online?.resolve
    self.online = online
    if (resolve) resolve(online)
  }
}
},{}],11:[function(require,module,exports){
async function loadSVG (url, done) { 
    const parser = document.createElement('div')
    let response = await fetch(url)
    if (response.status == 200) {
      let svg = await response.text()
      parser.innerHTML = svg
      return done(null, parser.children[0])
    }
    throw new Error(response.status)
}

module.exports = loadSVG
},{}],12:[function(require,module,exports){
/******************************************************************************
  LOCALDB COMPONENT
******************************************************************************/
module.exports = localdb

function localdb () {
  const prefix = '153/'
  return { add, read_all, read, drop, push, length, append, find, wash, gen_id }

  function length (keys) {
    const address = prefix + keys.join('/')
    return Object.keys(localStorage).filter(key => key.includes(address)).length
  }
  /**
   * Assigns value to the key of an object already present in the DB
   * 
   * @param {String[]} keys 
   * @param {any} value 
   */
  function add (keys, value, precheck) {
    localStorage[(precheck ? '' : prefix) + keys.join('/')] = JSON.stringify(value)
  }
  /**
   * Appends values into an object already present in the DB
   * 
   * @param {String[]} keys 
   * @param {any} value 
   */
  function append (keys, data) {
    const pre = keys.join('/')
    Object.entries(data).forEach(([key, value]) => {
      localStorage[prefix + pre+'/'+key] = JSON.stringify(value)
    })
  }
  /**
   * Pushes value to an array already present in the DB
   * 
   * @param {String[]} keys
   * @param {any} value 
   */
  function push (keys, value) {
    const independent_key = keys.slice(0, -1)
    const data = JSON.parse(localStorage[prefix + independent_key.join('/')])
    data[keys.at(-1)].push(value)
    localStorage[prefix + independent_key.join('/')] = JSON.stringify(data)
  }
  function read (keys) {
    const result = localStorage[prefix + keys.join('/')]
    return result && JSON.parse(result)
  }
  function read_all (addresses) {
    let result = localStorage
    addresses.forEach(address => {
      const temp = {}
      Object.entries(result).forEach(([key, value]) => {
        if(key.includes(address))
          temp[key] = value
      })
      result = temp
    })
    const temp = {}
    Object.entries(result).forEach(([key, value]) => {
      temp[key.replace(/^([^/]+\/){2}/, '')] = JSON.parse(value)
    })
    return temp
  }
  function drop (keys) {
    if(keys.length > 1){
      const data = JSON.parse(localStorage[keys[0]])
      let temp = data
      keys.slice(1, -1).forEach(key => {
        temp = temp[key]
      })
      if(Array.isArray(temp))
        temp.splice(keys[keys.length - 1], 1)
      else
        delete(temp[keys[keys.length - 1]])
      localStorage[keys[0]] = JSON.stringify(data)
    }
    else
      delete(localStorage[keys[0]])
  }
  function find (keys, filters, index = 0) {
    let index_count = 0
    const address = prefix + keys.join('/')
    const target_key = Object.keys(localStorage).find(key => {
      if(key.includes(address)){
        const entry = JSON.parse(localStorage[key])
        let count = 0
        Object.entries(filters).some(([search_key, value]) => {
          if(entry[search_key] !== value)
            return
          count++
        })
        if(count === Object.keys(filters).length){
          if(index_count === index)
            return key
          index_count++
        }
      }
    }, undefined)
    return target_key && JSON.parse(localStorage[target_key])
  } 
  function wash () {
    localStorage.clear()
  }
  function gen_id (raw_id) {
    const seed = raw_id.replace(/:0$/, "")
    const copies = Object.keys(read_all(['state', seed]))
    if (copies.length) {
      const id = copies.sort().at(-1).split(':')[1]
      raw_id = seed + ':' + (Number(id || 0) + 1)
    }
    return raw_id
  }
}
},{}],13:[function(require,module,exports){
(function (__filename){(function (){
/******************************************************************************
  STATE
******************************************************************************/
const STATE = require('STATE')
const name = 'theme_editor'
const statedb = STATE(__filename)
// ----------------------------------------
const { sdb, subs: [get] } = statedb(fallback_module, fallback_instance)
function fallback_module () { 
  return {}
}
function fallback_instance () {
  return {
    inputs: {
      'theme_editor.css': {
        $ref: new URL('src/node_modules/css/default/theme_editor.css', location).href
      }
    }
  }
}
/******************************************************************************
  THEME_EDITOR COMPONENT
******************************************************************************/
const DB = require('localdb')
const IO = require('io')
// ----------------------------------------
const shopts = { mode: 'closed' }
// ----------------------------------------
module.exports = theme_editor
async function theme_editor (opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const status = { tab_id: 0 }
  const db = DB()
  const on = {
    init,
    hide,
    css: inject
  }
  const {xget} = sdb.req_access(opts.sid)
  const send = await IO(id, name, on)
  
  status.themes = {
    builtin: Object.keys(opts.paths),
    saved: Object.keys(JSON.parse(localStorage.index || (localStorage.index = '{}')))
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shadow = el.attachShadow(shopts)
  const style = document.createElement('style')
  await sdb.watch(onbatch)

  shadow.innerHTML = `
  <main>
    <div class="content">
    </div>
    <div class="relative">
      <input list="themes" class="theme" placeholder='Enter theme' />
      <div id="themes" class="theme"></div>
    </div>
    <button class="load single">
      Load
    </button>
    <button class="inject">
      Inject
    </button>
    <button class="save_file single">
      Save file
    </button>
    <button class="save_pref">
      Save pref
    </button>
    <button class="drop_theme single">
      Drop theme
    </button>
    <button class="drop_file single">
      Drop file
    </button>
    <button class="reset single">
      Reset
    </button>
    <button class="export single">
      Export
    </button>
    <button class="import single">
      Import
    </button>
    <input style="display: none;" class="upload" type='file' />
    <button class="add">
      Add
    </button>
    <h3>
    </h3>
    <div class="tabs">
      <div class="box"></div>
      <span class="plus">+</span>
    </div>
  </main>`
  const main = shadow.querySelector('main')
  const inject_btn = shadow.querySelector('.inject')
  const load_btn = shadow.querySelector('.load')
  const save_file_btn = shadow.querySelector('.save_file')
  const save_pref_btn = shadow.querySelector('.save_pref')
  const add_btn = shadow.querySelector('.add')
  const drop_theme_btn = shadow.querySelector('.drop_theme')
  const drop_file_btn = shadow.querySelector('.drop_file')
  const reset_btn = shadow.querySelector('.reset')
  const upload = shadow.querySelector('.upload')
  const import_btn = shadow.querySelector('.import')
  const export_btn = shadow.querySelector('.export')
  const title = shadow.querySelector('h3')
  const content = shadow.querySelector('.content')
  const tabs = shadow.querySelector('.tabs > .box')
  const plus = shadow.querySelector('.plus')
  const select_theme = shadow.querySelector('div.theme')
  const input = shadow.querySelector('input.theme')

  input.onfocus = () => select_theme.classList.add('active')
  input.onblur = () => setTimeout(() => select_theme.classList.remove('active'), 200)
  input.oninput = update_select_theme
  inject_btn.onclick = on_inject
  load_btn.onclick = () => load(input.value, false)
  save_file_btn.onclick = save_file
  save_pref_btn.onclick = save_pref
  add_btn.onclick = () => add(input.value)
  drop_theme_btn.onclick = drop_theme
  drop_file_btn.onclick = drop_file
  export_btn.onclick = export_fn
  import_btn.onclick = () => upload.click()
  upload.onchange = import_fn
  reset_btn.onclick = () => {localStorage.clear(), location.reload()}
  plus.onclick = () => add_tab('New')
  shadow.append(style)
  update_select_theme()
  
  return el

  function onbatch(batch){
    for (const {type, data} of batch) {
      on[type](data)
    }  
  }
  async function hide () {
    main.classList.toggle('select')
    status.select = !status.select
  }
  async function export_fn () {
    const theme = db.read([ input.value ])
    const index = db.read([ 'index', input.value ])
    const blob = new Blob([JSON.stringify({theme, index}, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = input.value
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  async function import_fn () {
    const file = upload.files[0]
    const name = file.name.split('.')[0]
    await add(name)
    const reader = new FileReader()
    reader.onload = e => {
      const blob = JSON.parse(e.target.result)
      db.add([name], blob.theme)
      db.add(['index', name], blob.index)
      load(name)
    }
    reader.readAsText(file)
  }
  async function add (theme) {
    db.add([theme], [])
    status.themes.saved.push(theme)
    db.add(['index', theme], [])
    update_select_theme()
  }
  async function drop_theme () {
    db.drop([input.value])
    db.drop(['index', input.value])
    status.themes.saved = status.themes.saved.filter(v => v != input.value)
    update_select_theme()
    input.value = 'default'
    load('default')
  }
  async function drop_file () {
    db.drop([status.active_tab.dataset.theme, status.active_tab.dataset.id])
    db.drop(['index', status.active_tab.dataset.theme, status.active_tab.dataset.id])
    close_tab(status.active_tab)
  }
  async function forget_changes () {
    status.active_el.classList.remove('dirty')
    const dirt = JSON.parse(localStorage.dirt)
    delete(dirt[status.title])
    localStorage.dirt = JSON.stringify(dirt)
  }
  async function save_file () {
    // forget_changes()
    if(db.read([input.value])){
      db.push(['index', input.value], status.active_tab.dataset.name)
      db.push([input.value], status.textarea.value)
    }
  }
  async function save_pref () {
    const pref = db.read(['pref'])
    if(status.select){
      var ids = await get_select()
      ids.forEach(id => pref[id] = [])
    }
    pref[status.instance_id] = []
    pref[status.title] = []
    Array.from(tabs.children).forEach(tab => {
      if(tab.dataset.access === "uniq"){
        if(ids)
          ids.forEach(id => 
          pref[id].push({theme: tab.dataset.theme, id: tab.dataset.id, local: status.themes.builtin.includes(tab.dataset.theme)})
        )
        else
          pref[status.instance_id].push({theme: tab.dataset.theme, id: tab.dataset.id, local: status.themes.builtin.includes(tab.dataset.theme)})
      }
      else
        pref[status.title].push({theme: tab.dataset.theme, id: tab.dataset.id, local: status.themes.builtin.includes(tab.dataset.theme) })
    })
    db.add(['pref'], pref)
  }
  async function unsave () {
    status.active_el.classList.add('dirty')
    let theme = localStorage[input.value] && JSON.parse(localStorage[input.value])
    if(theme){
      theme.css[status.title] = textarea.value
      localStorage[input.value] = JSON.stringify(theme)
      const dirt = JSON.parse(localStorage.dirt)
      dirt[status.title] = input.value
      localStorage.dirt = JSON.stringify(dirt)
    }
    else{
      const name = input.value + '*'
      theme = localStorage[name] && JSON.parse(localStorage[name])
      if(theme){
        theme.css[status.title] = textarea.value
        localStorage[name] = JSON.stringify(theme)
        const dirt = JSON.parse(localStorage.dirt)
        dirt[status.title] = name
        localStorage.dirt = JSON.stringify(dirt)
      }
      else{
        theme = { theme: true, css: {} }
        theme.css[status.title] = textarea.value
        localStorage[name] = JSON.stringify(theme)
        status.themes.saved.push(name)
        const dirt = JSON.parse(localStorage.dirt)
        dirt[status.title] = name
        localStorage.dirt = JSON.stringify(dirt)
        update_select_theme()
        input.value = name
      }
    }
  }
  async function on_inject () {
    if(status.active_tab.dataset.type === 'json'){
      const id = add_data(status.textarea.value)
      const hub = xget(xget(id).hub).id
      send({type: 'refresh', to: hub})
    }
    else{
      if(status.select){
        const ids = await get_select()
        ids.forEach(id => {
          send({ type: 'inject', to: id, data: status.textarea.value })
        })
      }
      else
        send({ type: 'inject', to: status.node_data.hub_id, data: status.textarea.value })
    }
  }
  async function get_select () {
    return await send({ type: 'get_select', to: 'theme_widget'})
  }
  async function load (theme, clear = true) {
    if(clear){
      content.innerHTML = ''
      tabs.innerHTML = ''
    }
    if(status.themes.builtin.includes(theme)){
      const index = opts.paths[theme].length
      for(let i = 0; i < index; i++){
        const temp = await fetch(`./src/node_modules/css/${theme}/${i}.css`)
        add_tab(i, await temp.text(), '', theme, status.title)
      }
    }
    else{
      const temp = db.read([theme])
      temp.forEach((file, i) => {
          add_tab(i, file, '', theme, status.title)
      })
    }
    // forget_changes()
  }
  async function init ({ data }) {
    title.innerHTML = data.id
    status.title = data.type
    status.instance_id = data.id
    let value = data.file ? db.read([data.xtype, data.id]) : data
    if(data.type === 'json' || !data.file)
      value = JSON.stringify(value, null, 2)
    add_tab(data.name, value)
  }
  async function add_tab (id, value = '', access = 'uniq', theme = 'default') {
    if(id === 'New' && status.themes.builtin.includes(theme)){
      theme += '*'
      add(theme)
    }
    const tab = document.createElement('span')
    const tab_id = '_' + status.tab_id++
    tab.id = tab_id
    const index = opts.paths[theme] || db.read(['index', theme])
    tabs.append(tab)
    const btn = document.createElement('span')
    btn.innerHTML = index[id] || id
    tab.dataset.id = id
    tab.dataset.name = btn.innerHTML
    tab.dataset.theme = theme
    tab.dataset.access = access
    btn.onclick = () => switch_tab(tab.id)
    btn.ondblclick = rename
    const btn_x = document.createElement('span')
    btn_x.innerHTML = 'x'
    tab.append(btn, btn_x)
    tab.tabIndex = '0'
    tab.onkeydown = e => {
      if(e.key === 'ArrowRight' && tab.nextElementSibling)
        tab.nextElementSibling.after(tab)
      else if(e.key === 'ArrowLeft' && tab.previousElementSibling)
        tab.previousElementSibling.before(tab)
      tab.focus()
    }
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.id = tab_id
    content.append(textarea)
    btn_x.onclick = () => close_tab(tab)
    switch_tab(tab_id)
  }
  async function close_tab (tab) {
    content.querySelector('#' + tab.id).remove()
    tab.remove()
    if(tabs.children.length)
      switch_tab(tabs.children[tabs.children.length - 1].id)
    else
      add_tab('New')
  }
  async function switch_tab (tab_id) {
    status.textarea && status.textarea.classList.remove('active')
    status.textarea = content.querySelector('#' + tab_id)
    status.textarea.classList.add('active')
    status.active_tab && status.active_tab.classList.remove('active')
    status.active_tab = tabs.querySelector('#' + tab_id)
    status.active_tab.classList.add('active')
    status.active_tab.focus()
    input.value = status.active_tab.dataset.theme
  }
  async function rename (e) {
    const btn = e.target
    const hub = btn.parentElement
    const input = document.createElement('input')
    input.value = btn.innerHTML
    btn.innerHTML = ''
    btn.append(input)
    input.onkeydown = e => {
      if(e.key === 'Enter'){
        btn.innerHTML = input.value
        db.add([hub.dataset.theme, hub.dataset.id], input.value)
      }
    }
    input.onblur = e => {
      if(e.relatedTarget)
        btn.innerHTML = hub.dataset.name
    }
    input.focus()
  }
  async function update_select_theme () {
    const builtin = document.createElement('div')
    builtin.classList.add('cat')
    status.themes.builtin.forEach(theme => {
      const el = document.createElement('div')
      el.innerHTML = theme
      el.onclick = () => input.value = theme
      theme.includes(input.value) && builtin.append(el)
    })
    builtin.innerHTML && builtin.insertAdjacentHTML('afterbegin', '<b>builtin</b>')
    const saved = document.createElement('div')
    saved.classList.add('cat')
    status.themes.saved.forEach(theme => {
      const el = document.createElement('div')
      el.innerHTML = theme
      el.onclick = () => input.value = theme
      theme.includes(input.value) && saved.append(el)
    })
    saved.innerHTML && saved.insertAdjacentHTML('afterbegin', '<b>saved</b>')
    select_theme.innerHTML = ''
    select_theme.append(builtin, saved)
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
}

}).call(this)}).call(this,"/src/node_modules/theme_editor/theme_editor.js")
},{"STATE":3,"io":10,"localdb":12}],14:[function(require,module,exports){
(function (__filename){(function (){
/******************************************************************************
  STATE
******************************************************************************/
const STATE = require('STATE')
const name = 'theme_widget'
const statedb = STATE(__filename)
const shopts = { mode: 'closed' }
// ----------------------------------------
const { sdb, subs: [get] } = statedb(fallback_module, fallback_instance)
function fallback_module () { 
  return {
    _: {
      'theme_editor': {},
      'graph_explorer': {}
    }
  }
}
function fallback_instance () {
  return {
    _: {
      'theme_editor': {},
      'graph_explorer': {}
    },
    inputs: {
      'theme_widget.css': {
        $ref: new URL('src/node_modules/css/default/theme_widget.css', location).href
      }
    }
  }
}
/******************************************************************************
  THEME_WIDGET COMPONENT
******************************************************************************/
const theme_editor = require('theme_editor')
const graph_explorer = require('graph_explorer')
const IO = require('io')
// ----------------------------------------
module.exports = theme_widget

async function theme_widget (opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const status = { tab_id: 0, init_check: true }
  const on = {
    refresh,
    get_select,
    css: inject,
    scroll,
    click
  }
  const {get_all} = sdb.req_access(opts.sid)
  const send = await IO(id, name, on)

  status.clickables = ['css', 'json', 'js']
  status.dirts = JSON.parse(localStorage.dirt || (localStorage.dirt = '{}'))
  localStorage.pref || (localStorage.pref = '{}')
  const paths =  JSON.parse(await(await fetch('./src/node_modules/css/index.json')).text())
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
  <section>
    <div class="btn">
      ⚙️
    </div>
    <div class="popup">
      <div class="box">
        <span class="stats">
          Entries: 
        </span>
        <button class="select">Select</button>
        <input min="0" max="100" value="75" type="range"/>
      </div>
      <div class="editor">
      </div>
    </div>
  </section>
  <style></style>`
  const style = shadow.querySelector('style')
  const btn = shadow.querySelector('.btn')
  const popup = shadow.querySelector('.popup')
  const box = popup.querySelector('.box')
  const list = box.querySelector('.list')
  const editor = popup.querySelector('.editor')
  const stats = box.querySelector('.stats')
  const select = box.querySelector('.select')
  const slider = box.querySelector('input')

  const theme_editor_sub = sdb.get_sub('theme_editor')
  const graph_explorer_sub = sdb.get_sub('graph_explorer')
  await sdb.watch(onbatch)

  editor.append(await theme_editor({ sid: theme_editor_sub[0].sid, hub: [id], paths }))
  box.prepend(await graph_explorer({ sid: graph_explorer_sub[0].sid, hub: [id] }))
  select.onclick = on_select
  slider.oninput = blur
  return el

  function onbatch(batch){
    for (const {type, data} of batch) {
      on[type](data)
    }  
  }
  async function blur(e) {
    popup.style.opacity = e.target.value/100
  }
  async function on_select () {
    list.classList.toggle('active')
    send({to: 'theme_editor', type: 'hide'})
  }
  async function get_select () {
    const inputs = list.querySelectorAll('input')
    const output = []
    inputs.forEach(el => el.checked && output.push(el.nextElementSibling.id))
    send({type: 'send', to: 'theme_editor', data: output})
  }
  async function refresh () {
    const data = get_all()
    status.tree = data
    stats.innerHTML = `Entries: ${Object.keys(data).length}`
    btn.onclick = () => {
      popup.classList.toggle('active')
      status.init_check && send({type: 'init', to: 'graph_explorer' , data:status.tree})
      status.init_check = false
    }
  }
  async function click ({ data }) {
    send({ to: 'theme_editor', type: 'init', data})
    status.active_el && status.active_el.classList.remove('active')
    if(status.instance_id === data.id)
      editor.classList.toggle('active')
    else{
      editor.classList.add('active')
      el.classList.add('active')
    }
    status.instance_id = data.id
    status.active_el = el
  }
  async function scroll () {
    el.scrollIntoView({behavior: 'smooth'})
    el.tabIndex = '0'
    el.focus()
    el.onblur = () => {
      el.tabIndex = '-1'
      el.onblur = null
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
}

}).call(this)}).call(this,"/src/node_modules/theme_widget/theme_widget.js")
},{"STATE":3,"graph_explorer":6,"io":10,"theme_editor":13}],15:[function(require,module,exports){
module.exports={
  "inputs": {
    "topnav.json": {
      "type": "content",
      "data": {
        "links": [
        {
          "id": "datdot",
          "text": "DatDot",
          "url": "datdot"
        },
        {
          "id": "editor",
          "text": "Play Editor",
          "url": "editor"
        },
        {
          "id": "smartcontract_codes",
          "text": "Smart Contract Codes",
          "url": "smartcontract_codes"
        },
        {
          "id": "supporters",
          "text": "Supporters",
          "url": "supporters"
        },
        {
          "id": "our_contributors",
          "text": "Contributors",
          "url": "our_contributors"
        }
      ]
      }
    }
  }

}
},{}],16:[function(require,module,exports){
(function (__filename){(function (){
/******************************************************************************
  STATE
******************************************************************************/
const STATE = require('STATE')
const name = 'topnav'
const statedb = STATE(__filename)
// ----------------------------------------
const { sdb, subs: [get] } = statedb(fallback_module, fallback_instance)
function fallback_module () { 
	return {}
}
function fallback_instance () { 
	const data = require('./instance.json')
	data.inputs['topnav.css'] = {
		$ref: new URL('src/node_modules/css/default/topnav.css', location).href
	}
	return data 
}

/******************************************************************************
  OUR CONTRIBUTORS COMPONENT
******************************************************************************/
const graphic = require('graphic')
const IO = require('io')
// ----------------------------------------
const shopts = { mode: 'closed' }
// ----------------------------------------
module.exports = topnav

async function topnav (opts) {
	// ----------------------------------------
	// ID + JSON STATE
	// ----------------------------------------
	const { id, sdb } = await get(opts.sid) 
	const status = {}
	const on = {
		css: inject,
		scroll,
		content: fill
	}
	
  const send = await IO(id, name, on)
	// ----------------------------------------
	// OPTS
	// ----------------------------------------

	const playLogo = await graphic('playLogo', './src/node_modules/assets/svg/logo.svg')
	// ----------------------------------------
	// TEMPLATE
	// ----------------------------------------
	const el = document.createElement('div')
	const shadow = el.attachShadow(shopts)
	shadow.innerHTML = `
		<section class='topnav'>
				<a href="#top">${playLogo.outerHTML}</a>
				<nav class='menu'>
				</nav>
		</section>
	<style></style>`
  const style = shadow.querySelector('style')
	const menu = shadow.querySelector('.menu')
	const body = shadow.querySelector('section')
	const scrollUp = 'scrollUp'
	const scrollDown = 'scrollDown'
	let lastScroll = 0
	
	window.addEventListener('scroll', ()=> {
		if (window.innerWidth >= 1024) {
			let currentScroll = window.pageYOffset
			if (currentScroll < 1) {
					body.classList.remove(scrollUp)
					body.classList.remove(scrollDown)
					return
			}
			if (currentScroll > lastScroll && !body.classList.contains(scrollDown)) {
					body.classList.add(scrollDown)
					body.classList.remove(scrollUp)
			} else if (currentScroll < lastScroll) {
					body.classList.add(scrollUp)
					body.classList.remove(scrollDown)
			}
			lastScroll = currentScroll
		}
	})

	window.addEventListener('resize', ()=> {
		if (window.innerWidth <= 1024) {
			body.classList.remove(scrollUp)
			body.classList.remove(scrollDown)
		}
	})
	sdb.watch(onbatch)
  
	return el

	function onbatch(batch){
		for (const {type, data} of batch) {
      on[type](data)
    }  
	}
	async function inject (data){
		style.innerHTML = data.join('\n')
	}
	function fill ([ opts ]) { 
		menu.replaceChildren(...opts.links.map(make_link))
	}
	function click(url) {
		send({to:'index', type: 'jump', data: url })
	}
	function make_link(link){
		const a = document.createElement('a')
		a.href = `#${link.url}`
		a.textContent = link.text
		a.onclick = () => click(link.url)
		return a
	}
	async function scroll () {
		el.scrollIntoView({behavior: 'smooth'})
		el.tabIndex = '0'
		el.focus()
		el.onblur = () => {
			el.tabIndex = '-1'
			el.onblur = null
		}
	}
}

}).call(this)}).call(this,"/src/node_modules/topnav/topnav.js")
},{"./instance.json":15,"STATE":3,"graphic":8,"io":10}],17:[function(require,module,exports){
patch_cache_in_browser(arguments[4], arguments[5])

function patch_cache_in_browser (source_cache, module_cache) {
  const meta = { modulepath: [], paths: {} }
  for (const key of Object.keys(source_cache)) {
    const [module, names] = source_cache[key]
    const dependencies = names || {}
    source_cache[key][0] = patch(module, dependencies, meta)
  }
  function patch (module, dependencies, meta) {
    const MAP = {}
    for (const [name, number] of Object.entries(dependencies)) MAP[name] = number
    return (...args) => {
      const original = args[0]
      require.cache = module_cache
      require.resolve = resolve
      args[0] = require
      return module(...args)
      function require (name) {
        const identifier = resolve(name)
        if (name.endsWith('node_modules/STATE')) {
          const modulepath = meta.modulepath.join('/')
          const original_export = require.cache[identifier] || (require.cache[identifier] = original(name))
          const exports = (...args) => original_export(...args, modulepath)
          return exports
        } else if (require.cache[identifier]) return require.cache[identifier]
        else {
          const counter = meta.modulepath.concat(name).join('/')
          if (!meta.paths[counter]) meta.paths[counter] = 0
          const localid = `${name}${meta.paths[counter] ? '#' + meta.paths[counter] : ''}`
          meta.paths[counter]++
          meta.modulepath.push(localid)
        }
        const exports = require.cache[identifier] = original(name)
        if (!name.endsWith('node_modules/STATE')) meta.modulepath.pop(name)
        return exports
      }
    }
    function resolve (name) { return MAP[name] }
  }
}
require('./demo') // or whatever is otherwise the main entry of our project

},{"./demo":18}],18:[function(require,module,exports){
(function (__filename,__dirname){(function (){
const STATE = require('../src/node_modules/STATE')
/******************************************************************************
  INITIALIZE PAGE
******************************************************************************/
const statedb = STATE(__filename)
const { sdb, subs: [get] } = statedb(fallback_module, fallback_instance)

const make_page = require('../src/app')

function fallback_module () { // -> set database defaults or load from database
  return {
    admins: ['theme_editor', 'theme_widget', 'graph_explorer'],
    _: {
      app: {}
    }
  }
}
function fallback_instance () {
  return {
    _: {
      app: {
        0: override
      }
    },
    inputs: {
      'demo.css': {
        $ref: new URL('src/node_modules/css/default/demo.css', location).href
      }
    }
  }
}
function override ([app], path) {
  const data = app()
  console.log(path._.app._.topnav)
  return data
}
/******************************************************************************
  CSS & HTML Defaults
******************************************************************************/
const sheet = new CSSStyleSheet()
config().then(() => boot({ }))

async function config () {
  const path = path => new URL(`../src/node_modules/${path}`, `file://${__dirname}`).href.slice(8)
  const html = document.documentElement
  const meta = document.createElement('meta')
  const appleTouch = '<link rel="apple-touch-icon" sizes="180x180" href="./src/node_modules/assets/images/favicon/apple-touch-icon.png">'
  const icon32 = '<link rel="icon" type="image/png" sizes="32x32" href="./src/node_modules/assets/images/favicon/favicon-32x32.png">'
  const icon16 = '<link rel="icon" type="image/png" sizes="16x16" href="./src/node_modules/assets/images/favicon/favicon-16x16.png">'
  const webmanifest = '<link rel="manifest" href="./src/node_modules/assets/images/favicon/site.webmanifest"></link>'
  const font = 'https://fonts.googleapis.com/css?family=Nunito:300,400,700,900|Slackey&display=swap'
  const loadFont = `<link href=${font} rel='stylesheet' type='text/css'>`
  html.setAttribute('lang', 'en')
  meta.setAttribute('name', 'viewport')
  meta.setAttribute('content', 'width=device-width,initial-scale=1.0')
  // @TODO: use font api and cache to avoid re-downloading the font data every time
  document.head.append(meta)
  document.head.innerHTML += appleTouch + icon16 + icon32 + webmanifest + loadFont
  document.adoptedStyleSheets = [sheet]
  await document.fonts.ready // @TODO: investigate why there is a FOUC
}
/******************************************************************************
  PAGE BOOT
******************************************************************************/
async function boot () {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get('') // hub is "parent's" io "id" to send/receive messages
  const [opts] = sdb.get_sub('app')
  const on = {
    css: inject
  }
  sdb.watch(onbatch)
  const status = {}
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.body
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.adoptedStyleSheets = [sheet]
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  { // desktop
    const element = await make_page(opts)
    shadow.append(element)
  }
  // ----------------------------------------
  // INIT
  // ----------------------------------------

  function onbatch (batch) {
    for (const { type, data } of batch) {
      on[type](data)
    }
  }
}
async function inject (data) {
  sheet.replaceSync(data.join('\n'))
}

}).call(this)}).call(this,"/web/demo.js","/web")
},{"../src/app":2,"../src/node_modules/STATE":3}]},{},[17]);
