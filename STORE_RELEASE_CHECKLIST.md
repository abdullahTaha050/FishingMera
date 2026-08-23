# Store release checklist

Source-complete items are marked; account-, legal- or device-bound items remain explicit gates.

## Shared

- [x] Stable identifier `app.mera.mobile`, semantic version, native build numbers, opaque 1024+ icon and SDK 57 splash plugin.
- [x] In-app privacy summary and authenticated/anonymous account deletion with local purge.
- [x] Turkish privacy policy draft and data-flow/security documentation.
- [ ] Replace every bracketed owner field in `PRIVACY_POLICY_TR.md`, obtain legal review and publish it at a public HTTPS URL.
- [ ] Create a monitored support email and support URL; provide legal business/person name and address.
- [ ] Complete store privacy/data-safety declarations from the final deployed providers and retention policy.
- [ ] Capture phone/tablet screenshots from signed release builds; verify icon masks, splash, sunlight contrast and Dynamic Type.
- [ ] Complete `DEVICE_TEST_CHECKLIST.md` on physical iOS and Android devices and archive evidence.

## Apple App Store Connect

- [ ] Owner accepts the Apple Developer agreement and controls membership/payment.
- [ ] Create the App Store record for bundle ID `app.mera.mobile`; add age rating, category, support/privacy URLs and review notes.
- [ ] Complete App Privacy answers, including precise location, user content, identifiers and diagnostics according to the shipped configuration.
- [ ] Produce an EAS production iOS build, upload to TestFlight, test account deletion/OTP/reconnect, then submit manually after review.

## Google Play Console

- [ ] Owner accepts the Google Play Developer agreement, payment and identity verification.
- [ ] Create the app for package `app.mera.mobile`; add store listing, content rating, target audience, ads declaration and app access instructions.
- [ ] Complete Data safety and account deletion declarations, including the required public deletion/help URL if Play requests an external path.
- [ ] Produce the EAS production AAB, upload to Internal testing, test the preview/production artifacts, then promote only after acceptance passes.

Do not claim store readiness or production MVP completion while any required unchecked gate remains.
