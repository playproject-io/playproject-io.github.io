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
