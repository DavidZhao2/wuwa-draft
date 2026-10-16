# WuWa Draft Arena

A real-time two-player Wuthering Waves pick/ban room with spectators, chat, boss planning, Team Lab, and optional evidence-backed draft intelligence.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`. Use two browser tabs to join the same six-character room code.

## Intelligence features

The room host chooses three independent settings during creation:

- Team Lab Auto Build
- Smart Draft Analyzer
- Win Probability

Assisted Draft enables all three. Classic Draft disables all three and keeps the original room experience after creation. Recommendations use the small reviewed database in `public/team-database.js`; missing boss evidence is shown as **Insufficient Data**, and uncalibrated probabilities are withheld.

See [Team database maintenance](docs/TEAM_DATABASE.md) before adding records.

## Verification

```bash
npm test
npm run check
```

The project has no separate bundling step; `npm start` serves the production application directly.
