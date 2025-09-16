(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

function fallback_module () { // -> set database defaults or load from database
	return {
    api: fallback_instance,
    _: {
      "head": {
        $: ''
      },
      "foot": {
        $: ''
      },
    }
  }
  function fallback_instance () {
    return {
      _: {
        "head": {
          0: ''
        },
        "foot": {
          0: ''
        },
      }
    }
  }
}

/******************************************************************************
  PAGE
******************************************************************************/
const head = require('head')
const foot = require('foot')

module.exports = app
async function app(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const on = {
    css: inject,
    json: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    <style></style>`
  const style = shadow.querySelector('style')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  { // nav
    shadow.append(await head(subs[0]), await foot(subs[1]))
  }
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
  }
}

}).call(this)}).call(this,"/doc/state/example2/node_modules/app.js")
},{"STATE":11,"foot":4,"head":5}],2:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

function fallback_module () {
  return {
    api: fallback_instance,
    _: {
      icon: {
        $: ''
      }
    }
  }
  function fallback_instance () {
    return {
      _: {
        icon: {
          0: ''
        }
      },
      drive: {
        'lang/': {
          'en-us.json': {
            raw: {
              title: 'Click me'
            }
          }
        }
      }
    }
  }
}
/******************************************************************************
  BTN
******************************************************************************/
delete require.cache[require.resolve('icon')]
const icon = require('icon')

module.exports = {btn, btn_small}
async function btn(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const on = {
    theme: inject,
    lang: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    <button></button>
    <style>
      button{
        padding: 10px 40px;
      }
    </style>`
  const style = shadow.querySelector('style')
  const button = shadow.querySelector('button')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  {
    button.append(await icon(subs[0]))
  }
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
    button.append(data.title)
  }
}
async function btn_small(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const on = {
    css: inject,
    json: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    <button></button>
    <style></style>`
  const style = shadow.querySelector('style')
  const button = shadow.querySelector('button')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  {
    button.append(await icon(subs[0]))
  }
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
    button.innerHTML = data.title
  }
}

}).call(this)}).call(this,"/doc/state/example2/node_modules/btn.js")
},{"STATE":11,"icon":6}],3:[function(require,module,exports){
function fallback_module () { // -> set database defaults or load from database
	return {
    _: {
      "nav": {},
      "nav#1": {}
    }
  }
}
function fallback_instance () {
  return {
    _: {
      "nav": {
        0: override_nav
      },
      "nav#1": {},
    }
  }
}
function override_nav ([nav]) {
  const data = nav()
  console.log(JSON.parse(JSON.stringify(data)))
  data.inputs['nav.json'].data.links.push('Page')
  return data
}
/******************************************************************************
  FOO
******************************************************************************/
const nav = require('nav')

module.exports = foo
async function foo(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    <style></style>`
  const main = shadow.querySelector('nav')
  const style = shadow.querySelector('style')
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  { // nav
    shadow.append(await nav())
  }
  return el
}

},{"nav":8}],4:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

function fallback_module () {
  return {
    api: fallback_instance,
    _:{
      text: {
        $: ''
      }
    }
  }
  function fallback_instance () {
    return {
      _:{
        text: {
          0: ''
        }
      }
    }
  }
}
/******************************************************************************
  FOOT
******************************************************************************/
const text = require('text')

module.exports = foot
async function foot(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const on = {
    css: inject,
    json: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    <style></style>`
  const style = shadow.querySelector('style')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  {
    shadow.prepend(await text(subs[0]))
  }
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
  }
}

}).call(this)}).call(this,"/doc/state/example2/node_modules/foot.js")
},{"STATE":11,"text":9}],5:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

function fallback_module () { // -> set database defaults or load from database
	return {
    api: fallback_instance,
    _: {
      "foo": {
        $: ''
      }
    }
  }
  function fallback_instance () {
    return {
      _: {
        "foo": {
          0: ''
        },
      }
    }
  }
}
/******************************************************************************
  HEAD
******************************************************************************/
const foo = require('foo')

module.exports = head
async function head(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const on = {
    css: inject,
    json: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    <style></style>`
  const style = shadow.querySelector('style')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  { // nav
    shadow.append(await foo(subs[0]))
  }
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
  }
}

}).call(this)}).call(this,"/doc/state/example2/node_modules/head.js")
},{"STATE":11,"foo":3}],6:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

function fallback_module () {
  return {
    api: fallback_instance,
  }
  function fallback_instance () {
    return {}
  }
}
/******************************************************************************
  ICON
******************************************************************************/
module.exports = icon
async function icon(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const on = {
    css: inject,
    json: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    🗃
    <style></style>`
  const style = shadow.querySelector('style')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
  }
}

}).call(this)}).call(this,"/doc/state/example2/node_modules/icon.js")
},{"STATE":11}],7:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

function fallback_module () {
  return {
    api: fallback_instance,
    _: {
      btn: {
        $: ''
      },
    }
  }
  function fallback_instance () {
    return {
      _: {
        btn: {
          0: ''
        },
        'btn$small': {
          0: ''
        },
      },
      drive: {
        'style/': {
          'theme.css': {
            raw: `
              .title{
                background: linear-gradient(currentColor 0 0) 0 100% / var(--underline-width, 0) .1em no-repeat;
                transition: color .5s ease, background-size .5s;
                cursor: pointer;
              }
              .title:hover{
                --underline-width: 100%
              }
              ul{
                background: #273d3d;
                list-style: none;
                display: none;
                position: absolute;
                padding: 10px;
                box-shadow: 0px 1px 6px 1px gray;
                border-radius: 5px;
              }
              ul.active{
                display: block;
              }
            `
          }
        },
        'lang/': {
          'en-us.json': {
            raw: {
              title: 'menu',
              links: ['link1', 'link2'],
            }
          },
        },
      }
    }
  }
}
/******************************************************************************
  MENU
******************************************************************************/
delete require.cache[require.resolve('btn')]
const {btn, btn_small} = require('btn')


module.exports = {menu, menu_hover}
async function menu(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const admin = sdb.req_access(opts.sid)
  const on = {
    style: inject,
    lang: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    <div tabindex='0' class='title'></div>
    <ul>
    </ul>
    <style></style>`
  const main = shadow.querySelector('ul')
  const title = shadow.querySelector('.title')
  const style = shadow.querySelector('style')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // EVENT LISTENERS
  // ----------------------------------------
  title.onclick = () => {
    main.classList.toggle('active')
    admin.register('theme', 'rainbow', {
      'page': {
        'style.css': {
          raw: `body { font-family: cursive; }`,
        }
      },
      'page/app/head/foo/nav:0': {
        'style.css': {
              raw: `
                nav{
                  display: flex;
                  gap: 20px;
                  padding: 20px;
                  background: #4b2d6d;
                  color: white;
                  box-shadow: 0px 1px 6px 1px gray;
                  margin: 5px;
                }
                .title{
                  background: linear-gradient(currentColor 0 0) 0 100% / var(--underline-width, 0) .1em no-repeat;
                  transition: color .5s ease, background-size .5s;
                  cursor: pointer;
                }
                .box{
                  display: flex;
                  gap: 20px;
                }
                .title:hover{
                  --underline-width: 100%
                }
              `
            }
      },
      
    })
  }
  title.onblur = () => {
    main.classList.remove('active')
  }
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  { //btn
    main.append(await btn(subs[0]), await btn_small(subs[1]))
  }
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
    title.replaceChildren(data.title)
    main.replaceChildren(...data.links.map(link => {
      const el = document.createElement('li')
      el.innerHTML = link
      return el
    }))
  }
}
async function menu_hover(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const on = {
    style: inject,
    lang: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    <div tabindex='0' class='title'></div>
    <ul>
    </ul>
    <style></style>`
  const main = shadow.querySelector('ul')
  const title = shadow.querySelector('.title')
  const style = shadow.querySelector('style')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // EVENT LISTENERS
  // ----------------------------------------
  title.onmouseover = () => {
    main.classList.add('active')
  }
  title.onmouseout = () => {
    main.classList.remove('active')
  }
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  { //btn
    main.append(await btn(subs[0]), await btn_small(subs[1]))
  }
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
    title.replaceChildren(data.title)
    main.replaceChildren(...data.links.map(link => {
      const el = document.createElement('li')
      el.innerHTML = link
      return el
    }))
  }
}

}).call(this)}).call(this,"/doc/state/example2/node_modules/menu.js")
},{"STATE":11,"btn":2}],8:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

function fallback_module () { // -> set database defaults or load from database
	return {
    api: fallback_instance,
    _: {
      'menu':{
        $: ''
      },
    }
  }
  function fallback_instance () {
    return {
      _: {
        'menu':{
          0: override_menu
        },
        'menu$hover': {
          0: override_menu_hover
        }
      },
      drive: {
        'theme/': {
          'style.css': {
            raw: `
              nav{
                display: flex;
                gap: 20px;
                padding: 20px;
                background: #4b6d6d;
                color: white;
                box-shadow: 0px 1px 6px 1px gray;
                margin: 5px;
              }
              .title{
                background: linear-gradient(currentColor 0 0) 0 100% / var(--underline-width, 0) .1em no-repeat;
                transition: color .5s ease, background-size .5s;
                cursor: pointer;
              }
              .box{
                display: flex;
                gap: 20px;
              }
              .title:hover{
                --underline-width: 100%
              }
            `
          }
        },
        'lang/': {
          'en-us.json': {
            raw: {
              links: ['Home', 'About', 'Contact']
            }
          }
        }
      }
    }
  }
  function override_menu ([menu], path){
    const data = menu()
    data.drive['lang/']['en-us.json'].raw = {
      title: 'Services',
      links: ['Marketing', 'Design', 'Web Dev', 'Ad Compaign']
    }
    return data
  }
  function override_menu_hover ([menu], path){
    const data = menu()
    data.drive['lang/']['en-us.json'].raw = {
      title: 'Services#hover',
      links: ['Marketing', 'Design', 'Web Dev', 'Ad Compaign']
    }
    return data
  }
}
/******************************************************************************
  NAV
******************************************************************************/
delete require.cache[require.resolve('menu')]
const {menu, menu_hover} = require('menu')

module.exports = nav
async function nav(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts?.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const on = {
    theme: inject,
    lang: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    <nav>
      <div class="box">

      <div>
    </nav>
    <style></style>`
  const main = shadow.querySelector('nav')
  const div = shadow.querySelector('div')
  const style = shadow.querySelector('style')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  { //menu
    main.append(await menu(subs[0]), await menu_hover(subs[1]))
  }
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
    div.replaceChildren(...data.links.map(link => {
      const el = document.createElement('div')
      el.classList.add('title')
      el.innerHTML = link
      return el
    }))
  }
}

}).call(this)}).call(this,"/doc/state/example2/node_modules/nav.js")
},{"STATE":11,"menu":7}],9:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

function fallback_module () {
  return {
    api: fallback_instance,
  }
  function fallback_instance () {
    return {}
  }
}
/******************************************************************************
  TEXT
******************************************************************************/
module.exports = text
async function text(opts) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const { id, sdb } = await get(opts.sid) // hub is "parent's" io "id" to send/receive messages
  const { drive } = sdb
  const on = {
    css: inject,
    json: fill
  }
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shopts = { mode: 'closed' }
  const shadow = el.attachShadow(shopts)
  shadow.innerHTML = `
    Copyright © 2024  Playproject Inc.
    <style></style>`
  const style = shadow.querySelector('style')
  const subs = await sdb.watch(onbatch)
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  return el

  async function onbatch(batch){
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
  async function inject (data){
    style.innerHTML = data.join('\n')
  }
  async function fill([data]) {
  }
}

}).call(this)}).call(this,"/doc/state/example2/node_modules/text.js")
},{"STATE":11}],10:[function(require,module,exports){
(function (__filename,__dirname){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb } = statedb(fallback_module)

function fallback_module () { // -> set database defaults or load from database
  return {
    _: {
      app: {
        $: '',
        0: ''
      }
    },
    drive: {
      'theme/': {
        'style.css': {
          raw: 'body { font-family: \'system-ui\'; }'
        }
      },
      'lang/': {}
    }
  }
  function override_app ([app]) {
    const data = app()
    console.log(JSON.parse(JSON.stringify(data._.head)))
    data._.head[0] = page$head_override
    return data
  }
  function page$head_override ([head]) {
    const data = head()
    data._['foo.nav'] = {
      0: page$nav_override
    }
    return data
  }
  function page$foo_override ([foo]) {
    const data = foo()
    data._.nav[0] = page$nav_override
    return data
  }
  function page$nav_override ([nav]) {
    const data = nav()
    data._.menu[0] = page$menu_override
    return data
  }
  function page$menu_override ([menu]) {
    const data = menu()
    console.log(data)
    data.drive['lang/']['en-us.json'].raw = {
      links: ['custom', 'menu'],
      title: 'Custom'
    }
    return data
  }
}
/******************************************************************************
  PAGE
******************************************************************************/
const app = require('app')
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
  const on = {
    theme: inject
  }
  const { drive } = sdb
  const subs = await sdb.watch(onbatch)
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
    shadow.append(await app(subs[0]))
  }
  // ----------------------------------------
  // INIT
  // ----------------------------------------

  async function onbatch (batch) {
    for (const {type, paths} of batch) {
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      on[type] && on[type](data)
    }
  }
}
async function inject (data) {
  console.log('inject', data)
  sheet.replaceSync(data.join('\n'))
}

}).call(this)}).call(this,"/doc/state/example2/page.js","/doc/state/example2")
},{"STATE":11,"app":1}],11:[function(require,module,exports){

},{}]},{},[10]);
