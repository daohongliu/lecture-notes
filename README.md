# Lecture Notes

David's Oxford lecture notes and problem sheets as one illustrated, interactive site: Probability, Measure and Martingales, Computational Learning Theory, Information Theory and Game Theory so far. Each course follows its notes chapter by chapter, keeps the lecturer's numbering, and adds linked results with hover previews, a "beside the text" panel, exercises, figures, a minimap, and an Ask Claude panel that sees what you are reading and what you highlight.

## Run it locally, with Ask Claude

Needs Node 20 or later and Python 3.

```bash
npm install      # once: the Claude Agent SDK and the Claude Code it runs on
npm run login    # once: sign in with your Claude account (Pro/Max)
npm start        # builds the page and serves it at http://localhost:4173
```

`npm start` rebuilds from the sources each time; `npm run serve` starts the server without rebuilding, and `npm run status` shows which account you're signed in with.

Ask Claude goes through `local/server.mjs`, which uses the Claude Agent SDK signed in with your own Claude login (any `ANTHROPIC_API_KEY` in the environment is ignored, so it never bills an API key). Each question is a single answer with no tools and none of your Claude Code settings. Chats are saved as JSON files in `local/data/chats/` (not in git). Dictation is only available when the page is opened inside Claude.

The server listens on localhost only. Anthropic's terms allow your Claude login for your own ordinary use of Claude Code and the Agent SDK; don't give other people access to this server.

## Build only

```bash
python3 build/build.py
```

writes `dist/index.html` (the page itself) and `dist/artifact.html` (the full document published to claude.ai, where Ask Claude, chat history and dictation use Claude's own page capabilities instead of the local server).

## Layout of the sources

- `courses/<course>/src/*.src`: chapters and problem sheets, in a light markup the build turns into HTML (results, proofs, margin notes `[[...]]`, sheet questions, figures `@@name@@`).
- `courses/<course>/inc/`, `courses/<course>/js/`: figures and the code behind the interactive ones.
- `shared/js/`: the site's behaviour (`core.js` links and hover cards, `features.js` contents, minimap, panels and layout, `ask.js` the Ask Claude panel).
- `build/`: the build script and page templates.
- `PROGRESS.md`: what has been done and the decisions behind it.
