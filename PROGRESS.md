# Progress / handoff

Branch `illustrated` replaces the earlier explainer build with the illustrated version David preferred
(published so far as a claude.ai artifact: https://claude.ai/artifact/8fUSQZVyo5a4ii591VfEvY).
The spec David wants is in his message of 2026-11-04 (left TOC, section estimates, named exercises,
problem sheets with "now do question N" prompts, open-beside panel, private notes, LLM guidance,
per-course style variation, three.js where apt). Scope agreed: PMM Chapters 0–5 only (skip 6–7 for now),
Computational Learning Theory Chapters 1–5 (up to and including cryptographic hardness).
Everything ships as ONE artifact (both courses), notes stored in the artifact's `db`
(rules: owner-only), with a localStorage fallback when the db is unavailable (e.g. served from the repo).

## Layout
- `build/build.py` — builds `dist/index.html` from course sources (python3, no deps).
- `build/templates/` — head (CSS, MathJax config), shell, templates.
- `shared/js/core.js` — drawing helpers, router, xref previews, back button, TOC sidebar.
- `courses/<id>/src/chN.src`, `sheetN.src` — chapter/sheet sources (compact markup, see build.py docstring).
- `courses/<id>/inc/*.html` — figure markup included with `@@name@@`.
- `courses/<id>/js/chN.js` — figure code, registered with `reg('<view id>', name, fn)`.
- `dist/index.html` — last good build (currently the PMM 0–5 artifact as published, version 5).

## Status
- [x] PMM Chapters 0–5 written, 30 figures, cross-references, wide-maths fixes.
- [x] build.py multi-course (`courses/<id>/course.json`; CLT ids prefixed `clt-`), hub view `#contents`, course homes `#pmm`/`#clt`.
- [x] features.js: left contents sidebar with progress + minutes left (permanent ≥1300px), section estimates
      (`## Title {page} [dN iN]` → difficulty/importance), beside panel (⇥ on hover cards), private notes
      (select text or double-click a formula → ✎ note; db `notes` owner-only, localStorage fallback; drawer with export .md), LLM note per view.
- [x] PMM sheets 1–4 transcribed (`courses/pmm/src/sheetN.src`, `<qn n= t=>`), prompts `<sheet n= qs=>` in chapters,
      all exercises named, new fun exercises in ch0, ch2, ch3, ch4, ch5.
- [x] CLT Chapters 1–5 with 12 figures (Fig 3.3 uses three.js r128, loaded lazily), sheets 1–4 with the official hints folded, prompts in chapters.
- [x] Published as version 6 of https://claude.ai/artifact/8fUSQZVyo5a4ii591VfEvY with capabilities
      {db:{rules:[{path:"notes",read:"owner",write:"owner"}]}, downloads:true}; db checked (empty `notes`).

- [x] Structure pass: sec-block/sub-block indentation, proofs attached and always titled "Proof of X.", thm kinds coloured,
      every result has a short description (`d=`), shown in the sidebar when there is no name.
- [x] Roles: `<role r= a=>` gutter labels (intro, motivation, intuition, link, …; ROLE_TIPS in build.py). Annotations are
      HTML-escaped (an unescaped `<` once broke autolinking for whole chapters).
- [x] Layout: fluid column up to 50rem at ≥1300px; VS Code-style minimap on the right; chapter mind maps
      (`courses/<c>/maps/chN.json`, nodes/edges/ext links to other chapters) in the strip left of the minimap.
- [x] Figures renumbered by order of appearance (FIGID); 7 extra "fun" diagrams.
- [x] Search (features.js, end): `/` or ⌘K or topbar button; index built from the DOM before MathJax, TeX "detexed"
      to unicode via TEXMAP; ranks results > sections > figures > exercises/questions > background > text; PMM/CLT filter.
- [x] Published as version 15 (search + autolink fix).

- [x] Computational Game Theory (`courses/gt`, prefix `gt-`, slide numbers as "slide N" via `pagelabel`): Chapters 1–7
      (whole course, slides 1–427), Tutorials 1–3, 18 figures + 3 sheet figures, chapter maps. `<pm r= c= p1= p2= br ne mm>`
      draws payoff matrices (no p2 = zero-sum; math entries need spaces around `,` and `;` because convert_math swallows
      trailing punctuation). JS helpers in `courses/gt/js/a-common.js` (gtTable editable matrices, gtDrawTree game trees,
      gtDrawFSM automata, gtRun). Corrections to the slides are sidenotes (folk theorem minmax vs maximin, finite PD
      "dominant", NE uniqueness, discounted-sum index, SEP typo, v̄/v̲ swap, TFT head-to-head, Hawk-Dove baseline fitness).

- [x] Information Theory Chapters 4–5 (channel capacity, Shannon's second theorem with full proof, Hamming codes;
      entropy rate, Markov chains, source–channel separation, Wonham filter, Viterbi), 6 figures (it-fig4-1..3,
      it-fig5-1..3), maps. Corrections as sidenotes, notably Example 5.19 (min→max, π₄¹ = 0.0261 not 0.0043, so the
      notes' "path disagrees with final state" remark fails there; a disagreeing preset is in Fig 5.3). The notes have
      Problem Sheet 3 (MT26) added later, with prompts in Chapters 1, 3 and 4.

- [x] Ask Claude side panel (`shared/js/ask.js`, sample capability): highlight text → "Ask Claude" chip, or the "ask" button;
      sends the selection, the enclosing block (statement+proof), neighbouring blocks in the section and the location, with maths
      recovered as TeX from `data-tex`. Chat kept in memory; model and effort pickers in the panel (default Opus 5.5 / medium, remembered in localStorage partb-ask-model/-effort; modelTier from the model as fallback, with a note when the named model did not answer). Resizable (drag left edge, width in localStorage), reading position kept on open/close/resize via askKeepPlace. Publish with capabilities {sample:{}, db:{}, user:{}} (db+user are for chat history).
      Chat history: saved after each answer to db at data/users/<uid>/ask/{chats,bodies}/<id> (meta for the list, body with msgs+turns,
      trimmed under 256 KB); falls back to localStorage 'partb-ask-chats' (40 most recent). "history" button lists, searches, reopens, deletes.
      Formula picking: SVG maths can't be selected natively, so click a symbol / drag across symbols / click again (or Alt+↑) to widen;
      hit-testing is geometric over g[data-mml-node] leaves; the pick is linearised back to LaTeX (mLin) and sent with the whole formula's TeX.

- [x] Text selection across maths: mjx-assistive-mml (display:block) hidden, since it broke triple-click and drag selections
      at each formula; the svg gets aria-label = TeX instead. Formulas inside a selection get .mjx-insel (tint). A drag that starts
      in a formula and leaves it turns into a native selection anchored on the far side of the formula (mToNative).
- [x] CLT: the notes' end-of-chapter exercises are sections 1.7, 2.4, 3.6, 4.3 (ids clt-exN-M via <qn id label>); the ones set on
      sheets point there, the rest (1.2, 2.1, 2.2, 3.4, 4.2) are stated in full. "Exercise N.M" and Exercise "Name" (pause ids ex-slug) autolink.
- [x] Mixed selections: a selection may start or end partway through a formula. EDGE.start (drag began in a formula, set in
      mToNative) / EDGE.end (pointer over a formula during a native drag, edgeTrack) hold {box, leaf, prefix|suffix}; mPart picks
      the pieces, drawn as .msel-edge overlays; askTarget stretches the range over those formulas and askTex writes only the part.
      mLeafChars recovers \mathcal/\mathbb/\mathbf from the glyph's font, and multi-letter operators become \limsup etc.
- [x] Chapter maps switched off at David's request (CMAP_ON = false in features.js; data still built).
- [x] Minimap click jumps the window to sit centred under the pointer (mmScrollForSlider), then drags, as in VS Code.
- [x] Every .thm[id]/.algo[id] gets a "put beside" button (addPinButtons in features.js; shows on hover, toggles, keeps the result in place on screen; hidden ≤900px).
- [x] All right-hand panels resizable via panelGrip() in ask.js (Ask: --askw, "beside the text": --sidew, both in localStorage).
- [x] Minimap works like VS Code: fixed scale (sy = max(sx·1.15, 0.055)), so the viewport window is a constant size; short
      chapters give a short map, long ones slide under the strip proportionally; dragging the window follows the pointer.
- [x] Autolink: fixed stack bug (refs inside sidenotes/margin labels/sheet prompts weren't linked); equation numbers like (4.4.1)
      and "Sheet N, Question M" mentions now link when the target exists.

## Ideas not done yet
- PMM Chapters 6–7 (martingales, applications); CLT Chapters 6–9.
- GT timeline (Fig 1.1) and automata figure are small on phones; could switch to a vertical layout under 560px.
- An independent read-through of the CLT chapters for maths slips (the PMM chapters had one).
- Mobile check of every figure at 390px.

## Testing
`node <scratchpad>/t3.js "" view1,view2 [notes]` (run from the scratchpad dir) screenshots desk 1440 and phone 390.

- [x] Removed: private notes (features.js, topbar button, hub text) and the flashcard button, at David's request. Artifact capabilities cleared to {}.

- [x] Information Theory (B8.4) added as a third course: courses/it (prefix `it-`), Introduction + Chapters 1–3 and Sheets 1–2
      (sources on David's Desktop: Part B/Information Theory). 12 interactive figures (js/ch0–3.js, shared helpers in js/a-common.js:
      entropy, Huffman, binomial logs), 4 chapter maps, mulberry/saffron colour scheme, 'bits' header strip.
      Corrections vs the notes flagged in sidenotes: Remark 2.13 nats/bits; Theorem 3.4 epsilon_1 term.
      Not done: Chapters 4–5 (channel coding). Sheet data files (letter counts, IMC.csv) are not included.
