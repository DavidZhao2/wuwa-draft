# Team database maintenance

The intelligence system reads `public/team-database.js`. It is deliberately a small, manually reviewed dataset rather than a scraper or an implied public API.

## Record format

Each team record must include a stable `id`, exactly three existing character names, three slot roles, a classification (`Optimal`, `Viable`, `Experimental`, or `Unrated`), a confidence label, a concise synergy summary, evidence notes, direct source URLs, and a `lastReviewed` date.

Substitutes live under their zero-based slot number. Every substitute needs a character, explanation, confidence, and direct source. A substitution only applies to that team and slot; it is never a global interchangeability rule.

Boss compatibility is keyed by the exact in-app boss name. Add a rating only when the cited evidence directly supports that team/boss relationship. Accepted qualitative ratings are `favored`, `neutral`, and `unfavorable`. Do not infer ratings solely from a general tier list or an element label.

## Review workflow

1. Confirm every character and boss name against `server.js`.
2. Open and manually review the proposed source. Check its terms before any automated collection.
3. Add the smallest factual record supported by the source; paraphrase explanations and avoid copying guide text.
4. Add slot-specific substitutes only when the source identifies that slot relationship.
5. Leave missing matchup fields empty. The UI will show **Insufficient Data**.
6. Update `lastReviewed`, run `npm test` and `npm run check`, then test a room with the relevant roster.

## Probability calibration

The exact best-of-five calculator is implemented, but percentages remain hidden until defensible per-boss probabilities are available. Adding probabilities requires a documented, empirically validated calibration method. Arbitrary team scores must not be presented as real win chances.

## Current scope

The database contains manually curated Version 3.7 compositions and slot-specific substitutes from the WuWa Wiki Team Builder. Records that depend on an elemental Rover variant are omitted because the draft currently stores every Rover form under one ambiguous `Rover` ID. The other requested reference sites remain listed for future cross-review, but are not treated as evidence for records that were not directly verified. Boss compatibility is currently empty, so boss rankings and match percentages intentionally report insufficient data.
