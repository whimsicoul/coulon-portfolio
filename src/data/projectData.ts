export interface ComponentNode {
  id: string;
  label: string;
  summary?: string;
  description: string;
  techStack: string[];
  position: [number, number, number];
  color: string;
  category: 'core' | 'frontend' | 'backend' | 'database' | 'feature';
  screenshot?: string;
  screenshots?: string[];
  implementationNote?: string;
}

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  url?: string;
  components: ComponentNode[];
}

export const projects: Project[] = [
  {
    id: 'chess',
    title: 'Chess Opening Analyzer',
    subtitle: 'Interactive chess repertoire analysis tool',
    description: 'A full-stack application for analyzing chess openings, tracking deviations, and building personalized repertoires with data from Lichess.',
    url: 'https://chess-opening-analyzer.up.railway.app',
    components: [
      {
        id: 'chess-frontend',
        label: 'Frontend Architecture',
        summary: 'React 19 + Vite SPA structured around a centralized API layer. Server is the source of truth — components stay lean, with state scoped locally using useState and custom hooks.',
        description: `api.js: Axios instance with JWT interceptors that auto-attach the\ntoken and redirect on 401. No Redux — auth state lives in Context,\neverything else in local useState.\n\nuseEngine.js: custom hook managing the full Stockfish WASM worker\nlifecycle (spawn, UCI handshake, position queue, stop/restart).\nTries Lichess Cloud Eval first; falls back to local Stockfish 18\nWASM Web Worker running depth-18 multipv-3 analysis.\n\nBoard: react-chessboard + chess.js for move validation, FEN/SAN\nparsing, and PGN export. react-resizable-panels for the draggable\nlayout between board, opening book, and engine panel.`,
        techStack: ['React 19', 'Vite', 'Axios', 'chess.js', 'react-chessboard', 'Stockfish WASM', 'Context API'],
        position: [-4.2, 2.5, 1.0],
        color: '#38bdf8',
        category: 'frontend',
        screenshots: ['/chess-screenshots/white-repertoire.png', '/chess-screenshots/home.png'],
        implementationNote: 'useEngine queues positions during worker init, stops analysis before switching FENs, and accumulates PV lines per depth level — so the UI never shows stale evaluations.',
      },
      {
        id: 'chess-backend',
        label: 'Backend Architecture',
        summary: 'FastAPI REST API backed by Neon Postgres with connection pooling. Eight tables covering auth, dual opening trees, games, and deviation records.',
        description: `8-table schema:\n  Auth:        users, email_verifications\n  Repertoire:  white_opening + white_opening_tree\n               black_opening + black_opening_tree\n  Games:       games, game_deviations\n\nOpening tree tables use a parent_id adjacency structure (parent_id=0\nfor root). On every save or delete, _sync_tree() tears down and\nfully rebuilds the tree from the flat opening lines — guaranteeing\nconsistency with no orphaned nodes.\n\nAuth flow: register → Gmail SMTP sends 6-digit code (15-min DB\nexpiry, one-time use) → verify → login returns 7-day JWT (HS256).\nAxios interceptor attaches token; "Remember me" controls\nlocalStorage vs sessionStorage.\n\nDeviation detection: python-chess parses PGN; a tree-walk follows\ngame moves through the opening_tree table and records the first\nposition where the game diverges from the user's saved lines.`,
        techStack: ['FastAPI', 'Python', 'PostgreSQL', 'Neon', 'psycopg2', 'python-chess', 'JWT', 'bcrypt', 'Gmail SMTP'],
        position: [-4.2, -2.5, 0.5],
        color: '#f472b6',
        category: 'backend',
        screenshots: ['/chess-screenshots/games.png', '/chess-screenshots/login.png'],
        implementationNote: 'db.py uses psycopg2 SimpleConnectionPool (min 1, max 5) with RealDictCursor and auto-rollback on context exit — Neon-aware (strips -pooler from the connection string for persistent connections).',
      },
      {
        id: 'chess-features',
        label: 'Key Features',
        summary: 'Four user-facing capabilities: build your opening book, import real games and see where you went wrong, explore your repertoire visually, and get guided onboarding from day one.',
        description: `Repertoire Builder — play moves on the board to construct your\npersonal opening tree for White and Black. ECO codes auto-fetched\nfrom Lichess Opening Explorer.\n\nGame Import & Deviation Analysis — fetch games from Lichess or\nChess.com by username. Each game is color-coded against your\nrepertoire: green = stayed in book, red = you deviated,\namber = opponent deviated. Click any game to replay the exact\ndeviation on a board.\n\nOpening Tree Visualization — D3.js sunburst (480px, 8 rings).\nEach arc is a move; depth = move number; color = win rate\n(green 60%+ → yellow 50% → red <40%). Hover for ECO, stats,\navg opponent rating. Click to zoom into subtree.\n\nTutorial Wizard — animated spotlight guides new users through\nevery feature: making a first repertoire move, using the opening\nbook, switching between Cloud Eval and Stockfish, and importing\ngames. Covers White repertoire (9 steps), Black (2 steps),\nand Game Import (4 steps).`,
        techStack: ['D3.js', 'Recharts', 'Lichess API', 'Chess.com API', 'react-chessboard'],
        position: [0.0, -3.8, -0.5],
        color: '#34d399',
        category: 'feature',
        screenshots: ['/chess-screenshots/opening-visualization-ss.png', '/chess-screenshots/tutorial.png'],
      },
      {
        id: 'chess-decisions',
        label: 'Technical Decisions',
        summary: 'The hardest problems weren\'t features — they were structural: maintaining two independent opening trees in SQL, keeping them consistent across edits, and bundling a chess engine in the browser.',
        description: `Dual opening trees (White & Black):\n  Two separate table pairs (white_opening_tree, black_opening_tree)\n  each with parent_id adjacency. The hard part: keeping them\n  consistent when moves are deleted or reordered. Solved by the\n  full-rebuild strategy — _sync_tree() deletes all nodes and\n  reconstructs from the flat opening table on every write, so the\n  tree is always a deterministic projection of the flat lines.\n\nFlat SQL + server-side rebuild:\n  Moves stored flat in white_opening with a moves TEXT column\n  (space-separated SAN). The tree is never persisted as JSON —\n  it's rebuilt from scratch on every mutation. Tradeoff: reads are\n  slightly heavier, but inserts/deletes are atomic and there are\n  no orphaned subtrees.\n\nStockfish WASM bundling:\n  stockfish-18-lite-single.js loaded as a Web Worker in Vite.\n  Required custom worker config and UCI handshake before any\n  position can be sent. useEngine manages a position queue so\n  analysis never starts on a stale FEN.\n\nPython over Node for backend:\n  FastAPI chosen specifically for python-chess — PGN parsing and\n  move-tree traversal in Python is significantly cleaner than\n  any JS equivalent.`,
        techStack: ['PostgreSQL', 'parent_id adjacency', 'Stockfish WASM', 'FastAPI', 'python-chess'],
        position: [4.2, -2.5, -0.5],
        color: '#a78bfa',
        category: 'core',
        screenshots: ['/chess-screenshots/black-repertoire.png', '/chess-screenshots/white-repertoire.png'],
        implementationNote: 'The full-rebuild approach trades write performance for correctness — acceptable for opening trees (max ~50 lines) where consistency matters more than throughput.',
      },
      {
        id: 'chess-deployment',
        label: 'Deployment',
        summary: 'Two separate Railway services — React/Vite frontend and FastAPI backend — backed by Neon serverless Postgres. CORS and connection pooling were the two main deployment challenges.',
        description: `Architecture: frontend and backend deployed as independent Railway\nservices. VITE_API_URL points directly to the backend service URL\n— no proxy rewrites, which eliminated the 502 errors that appear\nwhen Railway routes requests between services incorrectly.\n\nCORS: explicitly allowlisted FRONTEND_URL + localhost:5173/4173 in\nFastAPI middleware. Forgetting this is the most common failure when\nservices are on separate origins.\n\nNeon Postgres: serverless connection pooling handles Railway's\nephemeral container lifecycle without exhausting connections.\ndb.py strips the -pooler suffix for persistent connections when\nneeded. Auto-migration runs on startup via FastAPI lifespan context\n— no migration tool required.\n\nSecrets: VITE_API_URL, DATABASE_URL, JWT_SECRET, SMTP credentials\nall managed via Railway environment variables.`,
        techStack: ['Railway', 'Neon Postgres', 'Docker', 'CORS', 'Environment Variables'],
        position: [4.2, 2.5, 0.0],
        color: '#facc15',
        category: 'backend',
        screenshots: ['/chess-screenshots/home.png'],
        implementationNote: 'FastAPI\'s lifespan context manager runs _migrate() before the first request, creating all 8 tables if they don\'t exist — safe to run on every deploy.',
      },
    ],
  },
  {
    id: 'tutoring',
    title: 'DC SAT Tutor',
    subtitle: 'Multi-role tutoring platform for DC-area SAT prep',
    description: 'A production Next.js 14 platform connecting DC-area students with SAT tutors. Features role-gated portals for students, tutors, and admins — with session scheduling, PDF problem sets, test score tracking, and email notifications.',
    url: 'https://dc-sat-tutor.up.railway.app/',
    components: [
      {
        id: 'sat-frontend',
        label: 'Frontend & Routing',
        summary: 'Next.js 14 App Router with three role-gated portals. Middleware enforces JWT role on every request — wrong role redirects immediately. All UI built with shadcn/ui + Tailwind.',
        description: `Next.js 14 App Router structures the app into three\nprotected portals: /admin/*, /tutor/*, /student/*.\n\nmiddleware.ts intercepts every request, reads the\nNextAuth JWT, and redirects to /login if the role\ndoesn't match the route prefix — no client-side\nguards needed.\n\nreact-big-calendar renders the schedule views for\nboth student and tutor portals, displaying sessions\ncolor-coded by status (pending/approved/denied).\n\nreact-hook-form + Zod handle all form validation:\nsession proposals, problem set uploads, user\ncreation, and test score entry.\n\nshadcn/ui provides the base component library\n(cards, dialogs, inputs, selects) styled with\nTailwind. Sonner handles toast notifications.`,
        techStack: ['Next.js 14', 'App Router', 'TypeScript', 'shadcn/ui', 'Tailwind CSS', 'react-big-calendar', 'Zod', 'react-hook-form'],
        position: [-4.2, 2.5, 1.0],
        color: '#38bdf8',
        category: 'frontend',
        screenshots: ['/sat-screenshots/landing.png', '/sat-screenshots/student-schedule.png'],
      },
      {
        id: 'sat-auth',
        label: 'Authentication',
        summary: 'NextAuth v5 credentials provider with role-embedded JWTs. "Remember me" switches between 1-day and 30-day token expiry via a custom encode() override.',
        description: `NextAuth v5 with credentials provider — no OAuth.\nUsers log in with email + password only.\n\nbcryptjs (salt 12) hashes passwords at creation.\nAdmin sets passwords when creating accounts; users\ncan change their own via /api/user/password.\n\nJWT strategy with two expiry modes controlled by\na custom encode() override:\n  rememberMe=true  → 30-day token\n  rememberMe=false → 1-day token\nThe rememberMe flag is passed as a hidden credential\nfield during sign-in and stored on the JWT.\n\nRole (student | tutor | admin) is embedded in the\nJWT at sign-in and surfaced on session.user.role\nvia the session callback — accessible server-side\nin every Server Component and API route.\n\nSoft-delete: users have an active boolean. Inactive\naccounts are rejected at the authorize() step.`,
        techStack: ['NextAuth v5', 'JWT', 'bcryptjs', 'Credentials Provider'],
        position: [-4.2, -2.5, 0.5],
        color: '#a78bfa',
        category: 'core',
        screenshots: ['/sat-screenshots/login.png'],
      },
      {
        id: 'sat-admin',
        label: 'Admin Dashboard',
        summary: 'Full platform oversight: live stat cards, user CRUD, tutor-student pairing, bulk session approval, problem set upload, and SAT score entry — all in one portal.',
        description: `The /admin portal is the operational hub.\n\nDashboard fires 5 parallel SQL queries on render:\nactive tutor count, active student count, sessions\nthis week, pending approvals, and the next 5\nupcoming sessions. All Server Components — no\nclient fetching.\n\nUser management: create students and tutors\n(admin sets initial password), activate or\ndeactivate accounts (soft-delete via active=false),\nand filter the user table by role.\n\nAssignments: formal tutor-student pairings in\ntutor_student_assignments with a unique constraint\n— prevents duplicate pairs. Scopes which problem\nsets each tutor can assign.\n\nTest results: admin enters total score + math\n+ reading/writing per test, with optional notes\nand PDF attachment. Students see the full history.\n\nBulk session management: approve or deny multiple\npending sessions in one action via\nPATCH /api/admin/sessions/bulk.`,
        techStack: ['Next.js Server Components', 'Neon Postgres', 'UploadThing', 'date-fns'],
        position: [0.0, 3.5, 0.0],
        color: '#34d399',
        category: 'feature',
        screenshots: ['/sat-screenshots/admin-dashboard.png', '/sat-screenshots/admin-users.png', '/sat-screenshots/admin-test-results.png'],
      },
      {
        id: 'sat-student',
        label: 'Student Portal',
        summary: 'Students download assigned PDFs, view their calendar of sessions with status badges, approve or deny proposed times, and track their SAT score history.',
        description: `Three pages under /student/:\n\nProblem Sets — lists PDFs assigned by the tutor,\nshowing title, tutor name, and upload date.\nDownload links point directly to UploadThing URLs.\n\nSchedule — react-big-calendar monthly view.\nSessions are color-coded: green=approved,\nyellow=pending, red=denied. Clicking a session\nshows the proposed time, tutor name, attached\nproblem sheets, and approve/deny buttons.\nApproving triggers a Resend email to the tutor;\ndenying does the same. Sessions export as .ics\nor open directly in Google Calendar.\n\nTest Results — full score history table: test\nname, date, total score, math, reading/writing,\ntutor notes, and optional score PDF download.\nRows ordered newest first.`,
        techStack: ['React', 'react-big-calendar', 'Next.js', 'date-fns', 'Resend'],
        position: [-1.5, -3.5, 0.0],
        color: '#38bdf8',
        category: 'frontend',
        screenshots: ['/sat-screenshots/student-problem-sets.png', '/sat-screenshots/student-test-results.png'],
      },
      {
        id: 'sat-tutor',
        label: 'Tutor Portal',
        summary: 'Tutors upload problem set PDFs per student, propose one-off or recurring sessions, attach worksheets to specific sessions, and export calendars as .ics or Google Calendar links.',
        description: `Two pages under /tutor/:\n\nProblem Sets — upload problem PDF + optional\nanswer key PDF per assigned student via UploadThing\n(16 MB limit, restricted to tutor + admin roles).\nLists all sets with student name, title, and date.\n\nSchedule — react-big-calendar view of all sessions.\n"Propose Session" opens a form: pick student,\ndate/time. On submit, creates a pending session\nand fires a Resend email to the student.\n\nRecurring sessions: a separate form accepts an\nRRULE string (FREQ=WEEKLY;BYDAY=WE;BYHOUR=17)\nplus start/end dates and bulk-creates up to 52\nindividual session rows linked by series_id.\n\nSession detail: attach problem sets directly\nto a session (many-to-many via session_problem_sets).\nStudents see the attached sheets when they open\nthe session in their calendar.`,
        techStack: ['UploadThing', 'Resend', 'ics', 'google-calendar-url', 'react-hook-form'],
        position: [1.5, -3.5, 0.0],
        color: '#38bdf8',
        category: 'frontend',
        screenshots: ['/sat-screenshots/tutor-problem-sets.png', '/sat-screenshots/tutor-schedule.png'],
      },
      {
        id: 'sat-scheduling',
        label: 'Session Scheduling',
        summary: 'Tutor proposes → student approves/denies. Recurring series stored as RRULE strings that generate up to 52 sessions at once. Calendar exports via .ics and Google Calendar deep-links.',
        description: `Session lifecycle: pending → approved | denied.\nTutors propose; students respond. Both sides\nreceive Resend transactional emails on each\nstate change.\n\nRecurring sessions: a session_series row stores\nthe RRULE (e.g. FREQ=WEEKLY;BYDAY=MO;BYHOUR=16),\nstart_date, and optional end_date. The API\nexpands the rule and bulk-inserts up to 52 session\nrows, each with series_id so the series can be\nidentified or deleted as a group.\n\nCalendar integration:\n  ics → generates RFC 5545 .ics files served\n  from /api/sessions/[id]/ics\n\n  google-calendar-url → builds Google Calendar\n  TEMPLATE deep-links with title and time\n  pre-filled, opening in the user's calendar.\n\nAdmin can approve/deny individually or bulk-update\nvia PATCH /api/admin/sessions/bulk — single SQL\nround-trip using ANY($2::uuid[]).`,
        techStack: ['RRULE', 'ics', 'Resend', 'date-fns', 'google-calendar-url'],
        position: [4.2, 0.5, 0.5],
        color: '#f472b6',
        category: 'backend',
        screenshots: ['/sat-screenshots/admin-schedule.png', '/sat-screenshots/admin-assignments.png'],
      },
      {
        id: 'sat-db',
        label: 'Database & API',
        summary: 'Neon serverless Postgres with raw tagged-template SQL (no ORM). 8 tables, 29 API routes. All queries parameterized via @neondatabase/serverless.',
        description: `@neondatabase/serverless — tagged-template SQL\nwith automatic parameterization. No ORM, no\nmigration framework: schema applied once via\nscripts/migrate.sql.\n\n8-table schema:\n  users          — id, name, email,\n                   hashed_password, role, active\n  sessions       — tutor_id, student_id,\n                   proposed_time, status, series_id\n  session_series — RRULE, start/end dates\n  problem_sets   — title, tutor_id, student_id,\n                   problem_pdf_url, answer_pdf_url\n  session_problem_sets — many-to-many junction\n  tutor_student_assignments — unique pairs\n  test_results   — scores, notes, pdf_url\n  testimonials   — public landing page content\n\n29 API routes under /app/api/ covering full\nCRUD for every entity. Role checked on every\nhandler — 401 if unauthenticated, 403 if wrong\nrole. Zod validates all request bodies before\nthey touch the database.`,
        techStack: ['Neon Postgres', '@neondatabase/serverless', 'Next.js API Routes', 'Zod'],
        position: [4.2, -2.5, 0.0],
        color: '#facc15',
        category: 'database',
        screenshots: ['/sat-screenshots/admin-problem-sets.png'],
      },
    ],
  },
];
