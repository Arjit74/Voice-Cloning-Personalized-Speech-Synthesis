# Voice Cloning – Personalized Speech Synthesis (Frontend)

 > Note: On first load, please wait 2–3 minutes. The app initializes several 3D elements which can take time to fetch and compile in the browser, including examples like:
 > - Spline-powered scenes and backgrounds
 > - Interactive Orb (Three.js) with real-time interaction
 > - Particle Field and Floating Elements
 > - Speaker/Microphone 3D scenes and visualizers

 This repository contains the fully custom-built frontend for a Voice Cloning and Personalized Speech Synthesis application.

 - Modern, responsive UI with smooth 3D visuals and an accessible design system.

 ---

 ## Overview

The frontend provides:

- A clean interface to enroll voice samples and synthesize speech.
- Real-time audio recording, waveform visualization, and playback controls.
- Rich 3D/animated visuals to enhance the user experience (Spline and Three.js).
- A component-driven architecture for maintainability and reusability.

 ---

 ## Features

- Audio
  - Audio recorder and waveform visualization
  - Error boundaries and robust UI states

- 3D & Visuals
  - Spline background scenes
  - Interactive Orb, Particle Field, Floating Elements
  - Speaker/Microphone scenes and animated transitions

- UI/UX
  - shadcn/ui components with Tailwind CSS
  - Responsive, accessible design
  - Theming and utility-first styling

 ---

 ## Tech Stack

 - Vite (bundler & dev server)
 - React (UI) + TypeScript
 - Tailwind CSS + PostCSS
 - shadcn/ui component library
 - Three.js & Spline (3D scenes and interactions)
 - ESLint (code quality) and modern TS configs

 ---

 ## Getting Started

Prerequisites:

 - Node.js and npm installed (recommend using nvm)

Install and run:

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal. First load may take 2–3 minutes due to 3D assets.

 ---

 ## Available Scripts

 - `npm run dev` – Start the development server
 - `npm run build` – Build for production into `dist/`
 - `npm run preview` – Preview the production build locally

 ---

 ## Project Structure (high level)

 - `src/`
   - `components/`
     - `audio/` – Recorder, waveform, audio UI
     - `three/` – Interactive Orb, Particle Field, Speaker/Mic scenes, Spline background
     - `ui/` – shadcn/ui component wrappers and utilities
   - `pages/` – App pages and routing
   - `lib/` – Utility functions

 - `public/` – Static assets (icons, placeholders, robots.txt)
 - `tailwind.config.ts`, `postcss.config.js` – Styling configuration
 - `eslint.config.js` – Linting configuration

 ---

 ## Deployment

Build a production bundle:

```bash
npm run build
npm run preview
```

Deploy the contents of `dist/` to your hosting of choice (e.g., Netlify, Vercel, GitHub Pages, or a static server).

 ---

## License

Copyright The project owner. All rights reserved.
