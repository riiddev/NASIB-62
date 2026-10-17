# Computer-player strategy

NASIB +62 keeps its own local game engine. Computer decisions are isolated in `src/ai/strategy.js` as pure functions: they receive a game snapshot and return a decision plus an explanation, without mutating gameplay state.

The evaluator considers:

- **Liquidity:** each difficulty keeps a different cash buffer after purchases or house construction.
- **Return on investment:** rent relative to purchase/construction cost.
- **Region sets:** completing a region earns a strategic bonus.
- **Counter-play:** buying the last open property can prevent a rival from completing a region.
- **Explainable decisions:** the game log can show why a bot buys, passes, or delays a house investment.

## Why the agent repositories are references, not browser dependencies

[OpenClaw](https://github.com/openclaw/openclaw) is a self-hosted assistant built around a gateway and pluggable agent/model runtimes. [OpenCode](https://github.com/anomalyco/opencode) is a coding agent with distinct planning/building roles. They are useful references for separating responsibilities and keeping decisions explicit, but shipping either complete application inside this browser game would add an unrelated runtime and unnecessary complexity. This project uses a small, dependency-free decision module instead; it does not copy their source code.

Both upstream repositories currently expose MIT license files. If code is ever copied or adapted, re-check the license at the exact upstream commit and preserve required notices.
