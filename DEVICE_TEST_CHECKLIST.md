# Real-device MVP acceptance checklist

Run on one current Android phone and one supported iPhone. Record device, OS, app commit, seed version and result.

The `.maestro/offline-core.yaml` and `.maestro/offline-catch.yaml` flows automate the repeatable subset; permission, compass accuracy, privacy cross-account and visual checks remain manual.

- [ ] Clean install and first launch with airplane mode enabled.
- [ ] Seed spots, species and basic map context appear without network.
- [ ] Onboarding saves Beginner, Shore and 270 cm / 10–30 g / 3000 Spin gear.
- [ ] Location permission accepted and Hendek-area position is shown.
- [ ] 100 km İstavrit recommendation returns deterministic ranked results.
- [ ] Each card shows score factors, straight-line distance and data age.
- [ ] Spot can be favorited and remains after force-close/restart.
- [ ] Sakarya North Coast offline region completes and remains after restart.
- [ ] With airplane mode, offline map, pins and GPS marker remain visible.
- [ ] Compass shows bearing, distance and GPS accuracy; route disclaimer visible.
- [ ] Vehicle position saves locally; return-to-car works after moving.
- [ ] Low/unreliable magnetic accuracy displays calibration guidance.
- [ ] Offline catch report survives force-close and appears pending.
- [ ] Camera/library photos are stripped of EXIF, survive force-close and upload once after reconnect.
- [ ] Reconnect triggers one idempotent upload; no duplicate report is created.
- [ ] Cached weather/marine shows exact age; failed refresh never labels it current.
- [ ] Denied/revoked location and sensor permissions have useful fallback screens.
- [ ] Private spot is absent from another account and public API/recommendations.
- [ ] Approximate spot never exposes its exact coordinate.
- [ ] New private spot created offline appears locally and syncs once without public coordinate exposure.
- [ ] Guest account upgrades with a 6-digit email OTP without changing ownership; another device can sign in by OTP.
- [ ] Account deletion rejects an incorrect confirmation; exact confirmation removes cloud Auth/data/photos and local personal data, then the deleted OTP account cannot sign in.
- [ ] Anonymous user cannot publish a public/approximate spot or public catch report.
- [ ] “Daha fazla mera ara” labels web candidates as unverified and opens every cited source.
- [ ] Regulation card shows version/check date and remains available in airplane mode.
- [ ] Dark mode, sunlight contrast, Dynamic Type and 44/48 pt touch targets checked.
