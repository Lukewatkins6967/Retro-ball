# Combined App (Hybrid Basketball)

This is a hybrid basketball game that uses:
- NBA-draft prospect stats to create player ratings (Shooting / Speed / Playmaking / Defense)
- Retro Bowl-style franchise flow (draft -> roster -> contracts -> simple trades)
- Arcade basketball gameplay (top-down, 2v2) driven by those ratings

## Run

From `combined-app/`:

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal (default: `http://127.0.0.1:5173/`).

## Controls
- `W A S D` move (ball handler)
- `Space` shoot
- `Click` or `P` pass

## Notes
- The app is now self-contained for deployment. The draft class data it needs lives inside `combined-app/src/`.
- Save data uses `localStorage`, so each browser/device keeps its own franchise save unless you later add a backend.

## Deploy To Vercel

### Before you deploy

If you are making a new GitHub repo just for this game, use the contents of `combined-app/` as the repo root.

If you are pushing the whole `Basketball-Project/` folder to GitHub, that also works, but in Vercel you must set the project Root Directory to `combined-app`.

### Local deploy check

From `combined-app/`:

```bash
npm install
npm run build
```

If the build passes locally, Vercel should be able to build the same project.

### Auto-updating deploy flow

1. Push the code to GitHub.
2. Sign in to Vercel.
3. Click `Add New...` -> `Project`.
4. Import your GitHub repository.
5. If your repo root is the whole workspace, set `Root Directory` to `combined-app`.
6. Confirm these settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
7. Click `Deploy`.

After that, every push to your connected branch will auto-deploy on Vercel.

### Recommended Git commands

If you are turning this into a new repo from inside `combined-app/`:

```bash
git init
git add .
git commit -m "Prepare Hybrid Basketball for Vercel deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Important note

Because saves are stored in browser `localStorage`, updating the site on Vercel will not erase a player's save in the same browser, but saves will not sync across different devices unless you later add cloud save support.
