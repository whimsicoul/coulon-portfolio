# Thomas Coulon — Portfolio

A personal portfolio where I get to show off things I've been building and experimenting with. The site itself is one of those experiments — instead of a traditional page, projects float in a 3D space scene and expand into interactive architecture graphs when you click them.

**Live site:** [coulon-portfolio.up.railway.app](https://coulon-portfolio.up.railway.app/)

---

## What's in here

The portfolio presents two projects I'm proud of: a **Chess Opening Analyzer** and a **DC SAT Tutor platform**. Each one is represented as a floating 3D card in a space environment. Click a card and it expands into a node graph — each node is a layer of the architecture, and clicking any node shows a detail overlay with descriptions, tech stack info, and screenshots.

**Three-state flow:**
1. **Hero** — Landing view with a "View Projects" button
2. **Selection** — 3D space scene (ISS, astronaut, asteroids) with floating project cards
3. **Exploded view** — Selected project unfolds into an interactive node graph

---

## Tech Stack

| Category | Technologies |
|---|---|
| Framework | React 18, TypeScript, Vite |
| 3D Rendering | Three.js r170, React Three Fiber, Drei |
| Animations | Framer Motion, GSAP |
| Styling | Tailwind CSS, shadcn/ui (Radix UI primitives) |
| Routing | React Router v6 |
| State & Data | React Query, React Context |
| Build & Serving | Vite (SWC), serve |
| Deployment | Railway, Nixpacks |

---

## Local Setup

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:8080)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## Project Structure

```
coulon-portfolio/
├── src/
│   ├── components/
│   │   ├── Portfolio/           # Core 3D portfolio components
│   │   │   ├── Scene3D.tsx      # Main Three.js canvas + node graph
│   │   │   ├── SpaceScene.tsx   # ISS, astronaut, asteroid models
│   │   │   ├── SpaceBackground.tsx
│   │   │   ├── ProjectCard3D.tsx
│   │   │   ├── ChessCard3D.tsx  # Chess project card (3D king model)
│   │   │   ├── TutoringCard3D.tsx
│   │   │   ├── FloatingNode.tsx
│   │   │   ├── FloatingInfoCard.tsx   # Node detail overlay (desktop)
│   │   │   ├── FocusedCardOverlay.tsx # Node detail overlay (mobile)
│   │   │   ├── HeroSection.tsx
│   │   │   ├── BackButton.tsx
│   │   │   └── ProjectTitle.tsx
│   │   └── ui/                  # shadcn/ui primitives
│   ├── data/
│   │   └── projectData.ts       # Project definitions + node schemas
│   ├── hooks/
│   │   └── use-toast.ts
│   ├── lib/
│   │   └── utils.ts
│   └── pages/
│       ├── Index.tsx            # App state manager (hero/selection/exploded)
│       └── NotFound.tsx
├── public/
│   ├── models/                  # 3D GLB models (ISS, astronaut, asteroids, tree)
│   ├── assets3d/                # king.glb (Chess project card model)
│   ├── chess-screenshots/       # 10 Chess app screenshots
│   ├── sat-screenshots/         # 13 SAT tutor screenshots
│   └── fonts/                   # Cinzel font (TTF + JSON)
├── railway.json                 # Railway deployment config
├── nixpacks.toml                # Nixpacks Node.js 20 build config
├── serve.json                   # Cache headers + security policies
└── vite.config.ts
```

---

## 3D Assets

| File | Location | Size | Purpose |
|---|---|---|---|
| `king.glb` | `public/assets3d/` | ~1.5 MB | Chess project card |
| `ISS.glb` | `public/models/` | 661 KB | Space scene |
| `astronaut.glb` | `public/models/` | 767 KB | Space scene |
| `asteroids.glb` | `public/models/` | 4.3 MB | Space scene |
| `low-_poly_cherry_blossom_tree_3d_models.glb` | `public/models/` | 72 KB | Space scene accent |

---

## Deployment

Hosted on **Railway** via Nixpacks. The build pipeline:

1. Nixpacks installs Node.js 20 and runs `npm ci --include=dev`
2. `npm run build` outputs to `dist/`
3. Post-build copies `serve.json` into `dist/` for cache + security headers
4. Production start: `serve dist --single --listen tcp://0.0.0.0:$PORT`

No environment variables are required to run the site locally.
