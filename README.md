# coulon-portfolio

A personal developer portfolio built with React and Three.js, featuring an interactive 3D space scene for showcasing projects.

## Overview

The portfolio presents projects as explorable 3D cards floating in a space environment. Selecting a card expands the project into an interactive node graph — each node represents a layer of the architecture, and clicking a node opens a detail overlay with descriptions, tech stack, and screenshots.

**Flow:**
1. **Hero** — Landing view with name, bio, and a "View Projects" button
2. **Selection** — 3D space scene (ISS, astronaut, asteroids) with floating project cards
3. **Exploded view** — Selected project expands into an interactive node graph; clicking any node opens a detail overlay

## Tech Stack

| Layer | Tools |
|---|---|
| Framework | React 18, TypeScript, Vite |
| 3D Rendering | Three.js, React Three Fiber, Drei |
| Animations | Framer Motion, GSAP |
| Styling | Tailwind CSS, Radix UI (dialog, tooltip, toast) |
| Routing | React Router v6 |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
  components/
    Portfolio/     # Core portfolio components
      SpaceScene.tsx       # ISS, astronaut, asteroid 3D models
      Scene3D.tsx          # Node graph canvas
      ProjectCard3D.tsx    # Floating project card in space
      ChessCard3D.tsx      # Chess project card with 3D king model
      HeroSection.tsx      # Landing hero
      FloatingInfoCard.tsx # Node detail overlay (desktop)
      FocusedCardOverlay.tsx # Node detail overlay (mobile/focused)
      FloatingNode.tsx     # Individual node in the graph
      SpaceBackground.tsx  # Starfield background
      BackButton.tsx       # Navigation back button
      ProjectTitle.tsx     # Project title display
    ui/            # Radix UI primitives (button, dialog, tooltip, toast, sonner)
  data/
    projectData.ts # Project definitions and 3D node positions
  hooks/
    use-toast.ts   # Toast state management
  pages/
    Index.tsx      # Main page — manages app state (hero/selection/exploded)
    NotFound.tsx   # 404 page
```

## Adding a Project

Projects are defined in `src/data/projectData.ts`. Each project has a title, subtitle, description, and an array of `ComponentNode` objects. Each node has a label, description, tech stack, 3D position, color, and category (`core`, `frontend`, `backend`, `database`, or `feature`).

```ts
{
  id: 'my-project',
  title: 'My Project',
  subtitle: 'Short tagline',
  description: 'Longer description shown in the exploded view.',
  components: [
    {
      id: 'my-project-core',
      label: 'Core',
      description: 'Central application layer.',
      techStack: ['React', 'TypeScript'],
      position: [0, 0, 0],
      color: '#38bdf8',
      category: 'core',
    },
    // ...more nodes
  ],
}
```
