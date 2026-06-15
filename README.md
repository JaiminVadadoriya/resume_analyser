# Resume Analyser

An AI-powered resume analysis tool built with **Angular 22** and **TensorFlow.js**. Upload your PDF resume, paste a job description, and instantly receive a semantic match score, a skill gap report, and actionable recommendations — all computed locally in the browser with no data ever sent to a server.

[![CI/CD](https://github.com/JaiminVadadoriya/resume_analyser/actions/workflows/deploy.yml/badge.svg)](https://github.com/JaiminVadadoriya/resume_analyser/actions/workflows/deploy.yml)

🔗 **Live app:** [https://jaiminvadadoriya.github.io/resume_analyser/](https://jaiminvadadoriya.github.io/resume_analyser/)

---

## Features

| Feature | Description |
|---------|-------------|
| 📄 PDF Parsing | Extracts plain text from uploaded PDF resumes via `pdfjs-dist` |
| 🧠 Semantic Similarity | Computes cosine similarity of resume ↔ JD embeddings using Universal Sentence Encoder Lite (TF.js) |
| 🔍 Skill Gap Analysis | Matches 50+ tech skills against a curated catalog across Frontend, Backend, DevOps, AI/Data, and more |
| 💡 Recommendations | Generates score-aware, actionable advice for the candidate |
| 🕑 Local History | Every analysis run is saved to `localStorage` and can be reviewed or deleted at any time |
| 🔒 100% Client-Side | No backend, no API calls — all inference runs in WebAssembly/WebGL inside the browser |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 22 (standalone components, OnPush change detection) |
| UI | Angular Material 22 (tabs, chips, progress bar, icons) |
| AI / ML | TensorFlow.js 4 + Universal Sentence Encoder Lite |
| PDF Extraction | pdfjs-dist 6 |
| Styling | Vanilla CSS (Inter + Outfit fonts via Google Fonts) |
| Tests | Vitest 4 + jsdom |
| Linting | ESLint 9 + angular-eslint 22 + typescript-eslint 8 |
| CI/CD | GitHub Actions → GitHub Pages |

---

## Project Structure

```
resume_analyser/
├── public/
│   ├── favicon.ico
│   └── models/
│       └── use-lite/          # TF.js model weights (shards gitignored, downloaded by CI)
│           ├── model.json     ✔ committed
│           ├── vocab.json     ✔ committed
│           └── group1-shard*  ✗ gitignored — too large; CI downloads them at build time
│
├── src/
│   ├── index.html             # App shell; loads Inter & Outfit fonts
│   ├── main.ts                # Angular bootstrapApplication entry point
│   ├── styles.css             # Global design tokens and resets
│   │
│   └── app/
│       ├── app.ts             # Root component — orchestrates all UI interactions
│       ├── app.html           # Template: file drop zone, JD textarea, results tabs, history
│       ├── app.css            # Component styles (glassmorphism cards, animations)
│       ├── app.config.ts      # ApplicationConfig: router, animations
│       ├── app.routes.ts      # Route definitions (currently single-page)
│       ├── app.spec.ts        # Root component unit tests
│       │
│       └── services/
│           ├── analyzer.service.ts          # TF.js model loading, similarity scoring, skill gap
│           ├── analyzer.service.spec.ts     # Unit tests for AnalyzerService
│           ├── history.service.ts           # localStorage persistence of analysis history
│           ├── history.service.spec.ts      # Unit tests for HistoryService
│           ├── resume-parser.service.ts     # pdfjs-dist PDF → plain text extraction
│           └── resume-parser.service.spec.ts
│
├── .github/
│   └── workflows/
│       └── deploy.yml         # 3-job CI/CD: Lint+Test → Build → Deploy to GitHub Pages
│
├── angular.json               # Angular CLI project config; assets: public/**
├── package.json               # Dependencies + npm overrides (TF.js peer dep fix)
├── tsconfig.json              # Strict TypeScript + Angular compiler options
├── vitest.config.ts           # Vitest: jsdom env, url: http://localhost, src/**/*.spec.ts
└── eslint.config.js           # Flat ESLint config (angular-eslint + typescript-eslint)
```

---

## Services

### `AnalyzerService`

The core AI service. Loaded as a root singleton on app startup.

```
AnalyzerService
 ├── modelStatus   signal<'idle' | 'loading' | 'loaded' | 'error'>
 ├── loadingProgress  signal<number>   (0–100)
 ├── loadModel()   → fetches model.json + weight shards from /models/use-lite/
 ├── analyze(resumeText, jdText)  → AnalysisResult
 │     ├── calculateSimilarity()  → cosine similarity → normalized score 0–100
 │     └── extractSkillGaps()     → matchedSkills[], missingSkills[]
 └── generateRecommendations()   → string[]
```

**Model URL resolution** uses `document.baseURI` at runtime so the path works both in local dev (`http://localhost:4200/`) and on GitHub Pages (`https://…/resume_analyser/`).

```ts
const baseUrl = document.baseURI.endsWith('/') ? document.baseURI : `${document.baseURI}/`;
// → e.g. "https://jaiminvadadoriya.github.io/resume_analyser/"
modelUrl: `${baseUrl}models/use-lite/model.json`
```

---

### `ResumeParserService`

Extracts all plain text from a PDF `File` object using `pdfjs-dist`.

- Configures `GlobalWorkerOptions.workerSrc` from the CDN only in browser environments (skipped in Node/test).
- Returns a trimmed, newline-separated string of all page texts.
- Throws a descriptive `Error` with the original cause attached if parsing fails.

---

### `HistoryService`

Persists analysis runs to `localStorage` under the key `resume_analyser_history`.

```
HistoryService
 ├── historyRecords  signal<HistoryRecord[]>   (reactive, loaded on construction)
 ├── saveRecord(resumeName, jdText, result)    → prepends record; persists to localStorage
 ├── deleteRecord(id)                          → filters out & persists
 └── clearHistory()                            → empties signal + removes localStorage key
```

`HistoryRecord` shape:

```ts
interface HistoryRecord {
  id: string;           // random alphanumeric + timestamp
  resumeName: string;   // PDF filename or 'Uploaded Resume'
  jdTitle: string;      // First 40 chars of JD text
  result: AnalysisResult;
}
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 22.22.3
- **npm** ≥ 8

### Install

```bash
npm ci
```

No `--legacy-peer-deps` needed. A `package.json` `overrides` block resolves the TF.js v3 peer dependency conflict from `@tensorflow-models/universal-sentence-encoder`:

```json
"overrides": {
  "@tensorflow-models/universal-sentence-encoder": {
    "@tensorflow/tfjs-converter": "^4.22.0",
    "@tensorflow/tfjs-core": "^4.22.0"
  }
}
```

### Development Server

```bash
npm start
# or
ng serve
```

Open [http://localhost:4200](http://localhost:4200). Hot-reload is enabled.

> **Note:** The TF.js weight shards (`group1-shard*`) must be present in `public/models/use-lite/` for model loading to work locally. They are gitignored due to their size (~27 MB total). See [TF Model Assets](#tf-model-assets) below.

### Build

```bash
npm run build
```

Output: `dist/resume-analyser/browser/`

### Run Tests

```bash
npm test
```

Runs all 9 unit tests via Vitest in a jsdom environment. No browser needed.

```
✓ src/app/services/analyzer.service.spec.ts     (2 tests)
✓ src/app/services/history.service.spec.ts      (4 tests)
✓ src/app/services/resume-parser.service.spec.ts (1 test)
✓ src/app/app.spec.ts                           (2 tests)
```

### Lint

```bash
npm run lint
```

Uses ESLint 9 flat config with angular-eslint and typescript-eslint. Must pass with 0 errors before any merge to `main`.

---

## TF Model Assets

The Universal Sentence Encoder Lite model is split into binary weight shards. They are too large to commit to Git so they are listed in `.gitignore`:

```
/public/models/use-lite/group1-shard*
```

**In local development** — download them manually once:

```bash
MODEL_DIR="public/models/use-lite"
mkdir -p "$MODEL_DIR"

# 1. Download model.json (already committed, but safe to re-download)
curl -fSL "https://tfhub.dev/tensorflow/tfjs-model/universal-sentence-encoder-lite/1/default/1/model.json?tfjs-format=file" \
  -o "$MODEL_DIR/model.json"

# 2. Download each weight shard listed in model.json
node -e "
  const fs = require('fs');
  const model = JSON.parse(fs.readFileSync('$MODEL_DIR/model.json', 'utf8'));
  const shards = model.weightsManifest.flatMap(g => g.paths);
  console.log(shards.join('\n'));
" | while IFS= read -r shard; do
  curl -fSL "https://tfhub.dev/tensorflow/tfjs-model/universal-sentence-encoder-lite/1/default/1/${shard}?tfjs-format=file" \
    -o "$MODEL_DIR/${shard}"
  echo "Downloaded: ${shard}"
done
```

**In CI** — the `build` job in `deploy.yml` runs this automatically when it detects the shards are missing.

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs three sequential jobs on every push to `main` or PR targeting `main`:

```
push/PR to main
       │
       ▼
┌─────────────────────┐
│  JOB 1: ci          │  (runs on all events)
│  - npm ci           │
│  - npm run lint      │
│  - npm test         │
└────────┬────────────┘
         │ needs: ci
         │ only on push to main
         ▼
┌─────────────────────────────────┐
│  JOB 2: build                   │
│  - npm ci                       │
│  - Download USE Lite shards      │
│  - ng build --base-href /repo/   │
│  - touch .nojekyll              │
│  - Upload pages artifact        │
└────────┬────────────────────────┘
         │ needs: build
         │ only on push to main
         ▼
┌─────────────────────┐
│  JOB 3: deploy      │
│  - deploy-pages@v4  │
└─────────────────────┘
```

The build uses a dynamic `--base-href` derived from the repository name so deployments always match the GitHub Pages subdirectory:

```bash
REPO_NAME=$(echo "${{ github.repository }}" | cut -d'/' -f2)
npx ng build --configuration production --base-href "/${REPO_NAME}/"
```

### GitHub Pages Setup (one-time)

Before the first deployment succeeds, you must enable GitHub Actions as the Pages source:

1. Go to **Settings → Pages** in your repository.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Save. The next push to `main` will trigger a full build and deploy.

---

## Configuration Files

| File | Purpose |
|------|---------|
| `angular.json` | Build targets, asset glob (`public/**`), production budgets (3 MB warn / 5 MB error) |
| `tsconfig.json` | Strict TS mode, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, target ES2022 |
| `tsconfig.app.json` | App-specific TS references |
| `tsconfig.spec.json` | Spec-specific TS references |
| `vitest.config.ts` | jsdom environment, `url: http://localhost`, includes `src/**/*.spec.ts` |
| `eslint.config.js` | Flat ESLint 9 config: angular-eslint + typescript-eslint strict rules |
| `.gitignore` | Ignores `dist/`, `node_modules/`, `.angular/cache/`, `test/`, and model weight shards |

---

## License

MIT
