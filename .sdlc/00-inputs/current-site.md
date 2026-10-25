# Current site (what exists before the revamp)

Stack: Vite 5, React 18, TS strict, GSAP 3.14 (ScrollSmoother + SplitText from core), Three.js
0.168 + three-stdlib, React Three Fiber 8 + drei + rapier + postprocessing, react-icons,
react-fast-marquee. Single content file `src/data/portfolio.ts`. Entry `src/main.tsx` → `App.tsx`
(LoadingProvider → MainContainer with lazy CharacterModel + TechStack).

Sections today: Loading screen (percent + "Welcome" button) → Landing (name + looping headline
words + 3D avatar) → About → WhatIDo (4 hover-expanding cards) → Career (timeline) → Work
(carousel of 5 highlights) → TechStack (Rapier physics spheres with tool labels, desktop only)
→ Contact (hero, direct channels, education/certs/research cards, footer). Fixed Navbar,
SocialIcons rail, custom cursor, GSAP scroll timelines in `src/components/utils/GsapScroll.ts`,
intro text FX in `initialFX.ts`, per-section CSS under `src/components/styles/`.

Kept conceptually: ScrollSmoother wrapper/content structure, `.para`/`.title` SplitText reveal
pattern, custom cursor, content-in-one-file.

Removed in the revamp: `src/components/Character/**` (avatar, decrypt, draco), `public/models/*`,
`public/draco/*`, `src/*.glb`, `public/Akash_Malhotra.pdf`, `test.js`, `TechStack.tsx` physics
scene, `WorkImage.tsx` (dead), `exports.ts` (empty), `boneData.ts`.

Design tokens today: `--accentColor: #5eead4` (teal), `--backgroundColor: #0a0e17` (navy),
text `#eae5ec`, font Geist. These change.

Known lint debt (18 errors): prefer-const / no-var / unused params in Scene.tsx, character.ts,
resizeUtils.ts, animationUtils.ts, Loading.tsx, initialFX.ts. Most of those files are deleted.
