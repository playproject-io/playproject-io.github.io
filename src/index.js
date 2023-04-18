const bel = require('bel')
const csjs = require('csjs-inject')

// pages
const topnav = require('topnav')
const Header = require('header')
const datdot = require('datdot')
const editor = require('editor')
const smartcontract_codes = require('smartcontract-codes')
const supporters = require('supporters')
const our_contributors = require('our-contributors')
const Footer = require('footer')
const fetch_data = require('fetch-data')

module.exports = make_page

function make_page(opts, done, lang) {
  switch(lang) {
    case 'zh-tw':
    case 'ja':
    case 'th':
    case 'fr':
      var path = `./src/node_modules/lang/${lang}.json`
      break
    default:
      var path = `./src/node_modules/lang/en-us.json`
  }
  fetch_data(path).then(text => {
    let { menu, header, section1, section2, section3, section4, section5, footer } = text.pages
    const {theme} = opts
    const css = styles
    const landingPage = bel`
      <div id="top" class=${css.wrap}>
        ${topnav(menu)}
        ${Header(header)}
        ${datdot(section1)}
        ${editor(section2)}
        ${smartcontract_codes(section3)}
        ${supporters(section4)}
        ${our_contributors(section5)}
        ${Footer(footer)}
      </div>`
  return done(null, landingPage)

  }).catch( err => {
    return done(err, null)
  })
}

const styles = csjs`
.wrap {
    background: var(--bodyBg);
}
[class^="cloud"] {
    transition: left 0.6s, bottom 0.5s, top 0.5s linear;
}`
