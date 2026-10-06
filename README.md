# NEXUS — Interactive 3D Innovation Lab

A motion-led portfolio experiment focused on WebGL, scroll choreography, physics, shaders, and interaction design in one continuous 3D world.

## Highlights

- Persistent Three.js WebGL scene across the entire experience
- Procedural mechanical reactor hero
- GSAP ScrollTrigger exploded-view choreography
- Camera tunnel transition
- Cannon ES rigid-body physics with click/tap impulses
- Custom GLSL vertex displacement and fresnel/scanline fragment shader
- Interactive material simulator
- Motion-intensity modes
- 3D project galaxy connected to DOM hover states
- Pointer parallax, contextual cursor states, and velocity-reactive typography
- Live FPS and scene telemetry
- Responsive layouts and `prefers-reduced-motion` support

## Stack

The project intentionally has no build step. Browser-ready ESM modules are loaded from CDNs:

- Three.js
- GSAP + ScrollTrigger
- Cannon ES
- Lenis

An internet connection is required so those CDN modules and Google Fonts can load.

## Deploy to Vercel

This repository is configured for static deployment with `vercel.json`.

1. Import `Shehab1001/nexus-3d-lab` into Vercel.
2. Set **Framework Preset** to **Other** if Vercel does not detect it automatically.
3. Keep **Root Directory** as the repository root.
4. Leave **Build Command** empty.
5. Leave **Output Directory** empty.
6. Deploy.

The site is served directly from `index.html`; no Node.js server or serverless function is required.

## Run locally

Do not open `index.html` with a `file://` URL because the project uses browser ES modules.

Run any static HTTP server from the repository directory, for example:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Motion design rationale

1. **Boot / initialization** frames the project as a spatial operating system.
2. **Reactor hero** introduces the persistent 3D object anchoring the experience.
3. **Exploded view** maps scroll progression to physical separation of the shell.
4. **Tunnel transition** uses camera depth instead of a conventional section cut.
5. **Physics lab** changes interaction from passive scrolling to direct manipulation.
6. **Material simulator** demonstrates live visual parameters rather than pre-rendered media.
7. **Project galaxy** connects DOM portfolio content to WebGL state.
8. **Manifesto + CTA** intentionally reduce complexity at the end to restore hierarchy.

## Hiring-team talking points

- Motion is tied to information architecture rather than decorative hover effects.
- One 3D scene persists across several narrative chapters.
- Physics and shaders are real-time.
- The experience includes coarse-pointer and reduced-motion considerations.
- Procedural geometry keeps the project portable without external 3D assets.
