const csjs = require('csjs-inject')
const Playproject = require('../') 
const theme = require('theme')

const styles = csjs`
html {
    font-size: 62.5%;
    scroll-behavior: smooth;
}
body {
    font-family: var(--bodyFont);
    color: var(--bodyColor);
    margin: 0;
    padding: 0;
    background-color: var(--bodyBg);
    overflow-x: hidden;
}
a {
    text-decoration: none;
}
button {
    outline: none;
    border: none;
    font-family: var(--titleFont);
    font-size: var(--sectionButtonSize);
    color: var(--titleColor);
    border-radius: 2rem;
    padding: 1.2rem 3.8rem;
    cursor: pointer;
}
img {
    width: 100%;
    height: auto;
}
article {
    font-size: var(--articleSize);
    color: var(--articleColor);
    line-height: 2.5rem;
    padding-bottom: 4rem;
}
@media only screen and (min-width: 2561px) {
    article {
        font-size: calc(var(--articleSize) * 1.5 );
        line-height: calc(2.5rem * 1.5);
    }
    button {
        font-size: calc(var(--sectionButtonSize) * 1.5 );
    }
}
@media only screen and (min-width: 4096px) {
    article {
        font-size: calc(var(--articleSize) * 2.25 );
        line-height: calc(2.5rem * 2.25);
    }
    button {
        font-size: calc(var(--sectionButtonSize) * 2.25 );
    }
}
`

// callback done()
const el = (err, landingPage) => {
    const vars = theme

    if (err) {
        document.body.style = `color: red; font-size: 1.6rem; text-align:center; background-color: #d9d9d9;`
        document.body.innerHTML = `<p>${err.stack}</p>`
    } else {
        document.body.appendChild(landingPage)
    }

    updateTheme(vars)
} 

function updateTheme (vars) {
    Object.keys(vars).forEach(name => {
      document.body.style.setProperty(`--${name}`, vars[name])
    })
}

Playproject({theme}, el, "en")