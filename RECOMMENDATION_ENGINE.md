# Recommendation engine

The score is deterministic and fully covered by unit tests.

## Base weights

| Factor | Default | Beginner |
| --- | ---: | ---: |
| Species/spot match | 25 | 22 |
| Weather/marine | 20 | 20 |
| Gear | 15 | 13 |
| Safety/access | 15 | 25 |
| Season | 10 | 8 |
| Recent reports | 10 | 7 |
| Straight-line distance | 5 | 5 |

Each factor yields `0..1`, multiplied by normalized weights. Missing data is explicitly penalized or neutral according to factor configuration; it is never silently treated as ideal.

## Hard gates

A result is excluded or capped below recommendation rank when any active rule matches: prohibited area; harbour security area; extreme wave/gust threshold; access known closed; exact point unverified; only hazardous rock access for a beginner. Thresholds live in versioned config and are deliberately conservative. Weather model output can only say conditions appear relatively suitable or adverse.

## Explanation

The engine returns structured reason codes with measured values and source timestamps. Turkish templates render these codes locally. An optional server-side LLM may improve prose but cannot introduce facts, numbers, coordinates, safety claims or score changes.

