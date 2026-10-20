# Portfolio

Personal portfolio site for Subhadeep Paul ([@devsensei404](https://github.com/devsensei404)), a Mechanical Engineering undergrad at NIT Durgapur moving into software development and backend engineering. Built with plain HTML, CSS and vanilla JS, no frameworks, no build step.

**Live site:** [devsensei404.is-a.dev](https://devsensei404.is-a.dev)

## Features

- Single-page layout: Hero, About, Projects, Experience, Education, Skills, Interests, Contact
- Hero sized to the viewport height, so the intro, the "open to SDE internships" line and the call to action stay above the fold on short laptop screens
- Word-by-word headline reveal that stays hidden until it animates (no flash of unstyled text on load)
- Flip-and-tilt profile photo card (pointer tilt on desktop, click/Enter to flip to an alternate photo)
- Animated scribble underline that draws in as you scroll
- Copy-to-clipboard email button with a textarea fallback for non-secure contexts
- **Buddy**, a small mascot that lives on the page (see below)
- Dark contact/footer section, light everywhere else
- Respects `prefers-reduced-motion` (Buddy is switched off), responsive down to small screens

## Structure

```
portfolio/
├── index.html
├── style.css
├── script.js
├── buddy.js          # the Buddy mascot
├── assets/
│   ├── photo.jpg
│   └── back.jpg
├── README.md
└── .gitignore
```

## Buddy

`buddy.js` adds a small character that reacts to how you browse:

- Sleeps on the nav bar at the top of the page and wakes when you start scrolling
- Follows your cursor, and hops over to sit beside whatever you pause on (projects, experience and education rows, interests, the photo card), with a short comment
- Goes back to sleep when you scroll to the top
- On touch devices it follows your finger, rests in the bottom-right corner, and comments on whatever is in the middle of the screen. On narrow screens it avoids covering text
- Switched off when `prefers-reduced-motion` is set

To change what Buddy says, edit the `LINES` object at the top of `buddy.js`. The hover delay, spring feel and cursor offset are the constants just below it.

## Run locally

Clone the repo and open `index.html` in your browser.

```bash
git clone https://github.com/devsensei404/portfolio.git
cd portfolio
```

Fonts (Geist, Newsreader, Syne) load from Google Fonts, so you'll need an internet connection to see them rendered correctly.

## Deployment

Hosted on Vercel as a static site: framework preset "Other", no build command, root directory as the output. Custom domain via [is-a.dev](https://is-a.dev).

## Contact

- Email: devsensei404@gmail.com
- LinkedIn: [linkedin.com/in/devsensei404](https://www.linkedin.com/in/devsensei404)
- GitHub: [@devsensei404](https://github.com/devsensei404)
