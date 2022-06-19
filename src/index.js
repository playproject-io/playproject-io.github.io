const bel = require('bel')
const csjs = require('csjs-inject')

// pages
const Topnav = require('Topnav')
const Header = require('Header')
const Datdot = require('Datdot')
const SmartcontractUI = require('SmartcontractUI')
const SmartcontractCodes = require('SmartcontractCodes')
const Roadmap = require('Roadmap')
const OurContributors = require('OurContributors')
const Footer = require('Footer')
const data = require('data')

function Playproject(opts, done, lang) {
    switch(lang) {
        case 'zh-tw':
        case 'ja':
        case 'th':
        case 'fr':
            var page = data(`./src/node_modules/lang/${lang}.json`)
            break
        default:
            var page = data(`./src/node_modules/lang/en-us.json`)
    }
    page.then(result => {
        let { menu, header, section1, section2, section3, section4, section5, footer } = result.pages
        const {theme} = opts
        const css = styles
        const landingPage = bel`
        <div id="top" class=${css.wrap}>
            ${Topnav(menu)}
            ${Header(header)}
            ${Datdot(section1)}
            ${SmartcontractUI(section2)}
            ${SmartcontractCodes(section3)}
            ${Roadmap(section4)}
            ${OurContributors(section5)}
            ${Footer(footer)}
        </div>
    `
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
}
`

module.exports = Playproject
