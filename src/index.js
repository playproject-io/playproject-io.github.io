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

module.exports = Playproject

function Playproject(opts, done) {
    const {theme} = opts
    const css = styles
    const playLogo = Graphic(css.playLogo, './src/node_modules/assets/svg/logo.svg')
    const landingPage = bel`
        <div class=${css.wrap}>
            ${playLogo}
            ${Topnav()}
            ${Header()}
            ${Datdot()}
            ${SmartcontractUI()}
            ${SmartcontractCodes()}
            ${Roadmap()}
            ${OurTeam()}
            ${Footer()}
        </div>
    `
    return done(null, landingPage)
}

const styles = csjs`
.wrap {
    background: var(--bodyBg);
}
.playLogo {
    position: absolute;
    top: 10px;
    left: 0;
    width: 12vw;
    max-width: calc(15 * 0.53vw);
    min-width: calc(12 * 0.53vw);
    z-index: 9
}
[class^="cloud"] {
    transition: left 0.6s, bottom 0.5s, top 0.5s linear;
}
@media screen and (max-width: 1024px) {
    .playLogo  {
        width: 9vw;
        min-width: 100px;
    }
}
@media screen and (max-width: 812px) {
    .playLogo  {
        top: 20px;
        min-width: 12vw;
    }
}
@media screen and (max-width: 414px) {
    .playLogo  {
        min-width: 20vw;
    }
}
`
