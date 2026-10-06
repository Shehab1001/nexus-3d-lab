# NEXUS — Interactive 3D Innovation Lab

A deliberately complex motion-led portfolio piece designed to demonstrate art direction, WebGL/3D interaction, scroll choreography, physics and shader work in one continuous experience.

## What is inside

- Persistent Three.js WebGL world across the entire page
- Procedural mechanical reactor hero — no external 3D model required
- GSAP ScrollTrigger exploded-view choreography
- Camera tunnel transition through the core
- Cannon ES rigid-body physics scene with click/tap impulses
- Custom GLSL vertex displacement + fresnel/scanline fragment shader
- Interactive material simulator with four visual presets
- Motion-intensity modes that alter the 3D system in real time
- 3D project galaxy linked to DOM hover states
- Pointer parallax, cursor states, scroll-velocity typography skew
- Live scene/FPS telemetry
- Mobile layout and `prefers-reduced-motion` handling

## Libraries

The project imports browser-ready ESM builds from CDNs:

- Three.js
- GSAP + ScrollTrigger
- Cannon ES
- Lenis

That keeps the folder small and makes it easy to review without a build step. An internet connection is required the first time the page loads those libraries.

## Run locally

### Windows — easiest option

Do **not** double-click `index.html`. The experience uses browser ES modules, and browsers block this module graph when the page is opened with a `file://` URL.

Instead, double-click:

```text
START_NEXUS.bat
```

The launcher automatically starts a local HTTP server and opens:

```text
http://localhost:8080
```

It first looks for Python (`py` / `python`) and falls back to Node.js using the included zero-dependency `server.js`.

### Manual option

From a terminal opened in the project folder:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

You can also deploy the folder directly to Netlify, Vercel static hosting, GitHub Pages, Cloudflare Pages, or any simple web server.

## Motion design rationale

1. **Boot / initialization** establishes the project as a spatial operating system rather than a conventional portfolio.
2. **Reactor hero** introduces the single persistent object that anchors the whole experience.
3. **Exploded view** maps scroll distance to the physical separation of the reactor shell.
4. **Tunnel transition** uses camera depth instead of a normal section cut.
5. **Physics lab** changes interaction from passive scrolling to direct manipulation.
6. **Material simulator** proves the scene is a system with live parameters rather than a rendered video.
7. **Project galaxy** reconnects the WebGL world to portfolio content by linking DOM hover state to 3D scale/state.
8. **Manifesto + CTA** remove visual complexity at the end so the final message has maximum hierarchy.

## Hiring-team talking points

- Motion is tied to information architecture instead of decorative hover effects.
- One 3D scene persists through several interface chapters.
- Physics and shaders are real-time, not pre-rendered assets.
- The site demonstrates graceful degradation for coarse pointers and reduced-motion users.
- Geometry is procedural, so the project is portable and does not depend on downloaded models.


## Windows one-click launcher (fixed)

Do **not** open `index.html` directly. Double-click `START_NEXUS.bat`.

The launcher now uses the Windows built-in PowerShell runtime and includes its own static HTTP server (`START_NEXUS.ps1`). It does not require Python or Node.js. The server binds to `127.0.0.1` and chooses the first available port from `8080` through `8090`, then opens the browser automatically. Keep the server window open while reviewing the site.
