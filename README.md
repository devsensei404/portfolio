# Portfolio

Personal portfolio site for Subhadeep Paul ([@devsensei404](https://github.com/devsensei404)), a Mechanical Engineering undergrad at NIT Durgapur moving into software development and backend engineering. Built with plain HTML, CSS and vanilla JS, no frameworks, no build step.

**Live site:** [devsensei404.is-a.dev](https://devsensei404.is-a.dev)

## Features

- Single-page layout: Hero, About, Projects, Experience, Education, Skills, Interests, Contact
- Flip-and-tilt profile photo card (pointer tilt on desktop, click/Enter to flip to an alternate photo)
- Animated scribble underline that draws in as you scroll
- Copy-to-clipboard email button with a textarea fallback for non-secure contexts
- Dark contact/footer section, light everywhere else
- Respects `prefers-reduced-motion`, responsive down to small screens

## Structure

```
portfolio/
├── index.html
├── style.css
├── script.js
├── assets/
│   ├── photo.jpg
│   └── back.jpg
├── README.md
└── .gitignore
```

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
