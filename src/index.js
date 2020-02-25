const bel = require('bel')
const csjs = require('csjs-inject')
// widgets
const Graphic = require('Graphic')
// pages
const Topnav = require('Topnav')
const Header = require('Header')
const Datdot = require('Datdot')
const SmartcontractUI = require('SmartcontractUI')
const SmartcontractCodes = require('SmartcontractCodes')
const Roadmap = require('Roadmap')
const OurTeam = require('OurTeam')
const Footer = require('Footer')
const data = require('data')

function Playproject(opts, done, lang) {
    switch(lang) {
        case 'zh-tw':
            var page = data(`./src/node_modules/lang/${lang}.json`)
            break
        case 'ja':
            var page = data(`./src/node_modules/lang/${lang}.json`)
            break
        case 'th':
            var page = data(`./src/node_modules/lang/${lang}.json`)
            break
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
        const playLogo = Graphic(css.playLogo, './src/node_modules/assets/svg/logo.svg')
        const landingPage = bel`
        <div class=${css.wrap}>
            ${playLogo}
            ${Topnav(menu)}
            ${Header(header)}
            ${Datdot(section1)}
            ${SmartcontractUI(section2)}
            ${SmartcontractCodes(section3)}
            ${Roadmap(section4)}
            ${OurTeam(section5)}
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
.playLogo {
    position: absolute;
    top: 10px;
    left: 0;
    width: 15rem;
    z-index: 9
}
[class^="cloud"] {
    transition: left 0.6s, bottom 0.5s, top 0.5s linear;
}
@meida only screen and (min-width: 2561px) {
    .playLogo {

    }
}
@media only screen and (max-width: 1024px) {
    .playLogo  {
        width: 9vw;
        min-width: 100px;
    }
}
@media only screen and (max-width: 812px) {
    .playLogo  {
        top: 20px;
        min-width: 12vw;
    }
}
@media only screen and (max-width: 414px) {
    .playLogo  {
        min-width: 20vw;
    }
}
`

module.exports = Playproject