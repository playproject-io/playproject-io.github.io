const bel = require('bel')
const csjs = require('csjs-inject')
const make_page = require('../') 
const theme = require('theme')

const appleTouch = bel`<link rel="apple-touch-icon" sizes="180x180" href="./src/node_modules/assets/images/favicon/apple-touch-icon.png">`
const icon32 = bel`<link rel="icon" type="image/png" sizes="32x32" href="./src/node_modules/assets/images/favicon/favicon-32x32.png">`
const icon16 = bel`<link rel="icon" type="image/png" sizes="16x16" href="./src/node_modules/assets/images/favicon/favicon-16x16.png">`
const webmanifest = bel`<link rel="manifest" href="./src/node_modules/assets/images/favicon/site.webmanifest"></link>`
document.head.append(appleTouch, icon32, icon16, webmanifest)

const params = new URL(location.href).searchParams
const lang = params.get('lang')

if (lang === 'en') {
	params.delete('lang')
	location.search = params
}

const styles = csjs`
html {
	font-size: 82.5%;
	scroll-behavior: smooth;
}
body {
	font-family: var(--bodyFont);
	font-size: 1.4rem;
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

make_page({theme}, el, lang)