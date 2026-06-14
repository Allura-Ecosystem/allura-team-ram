---
name: payload-launch-preflight
description: "Use before launching or handing off a Payload website. Tracks client approval, Ronin approval, DNS, SSL, live route checks, accessibility, admin sanity checks, evidence packets, and explicit launch blockers."
---

# Payload Launch Preflight

Use this before production launch, DNS flip, client review, or final handoff of a Payload website.

## Principle

Launch is blocked until evidence says otherwise. Allura memory can record context, but it is not proof of Done.

## Preflight Checklist

1. Approval:
   - client approval received or explicitly blocked
   - Ronin approval received or explicitly blocked
   - review packet sent and recorded when needed

2. Deployment:
   - target URL confirmed
   - deployment/build status checked
   - environment variables present
   - migrations/seeds handled

3. DNS and SSL:
   - apex and `www` targets checked
   - SSL certificate valid
   - redirects are intentional
   - old deployment target is no longer unexpectedly serving production

4. Public route verification:
   - route smoke harness passes on live target
   - canonical routes checked
   - 404 behavior checked
   - metadata/Open Graph spot checked

5. Admin/backend verification:
   - admin login works where expected
   - core collections/globals accessible
   - no obvious console/network failures

6. Accessibility and visual:
   - basic WCAG pass or audit result recorded
   - mobile navigation checked
   - focus/skip/target-size issues reviewed
   - screenshots must show real rendered content

7. Evidence packet:
   - command outputs or artifact paths
   - browser check notes
   - DNS/SSL receipts
   - unresolved risks
   - handoff status

## Blocker Language

If approval, DNS, SSL, live checks, accessibility, or admin checks are missing, call the launch blocked and name the exact missing item.

## Done Standard

Launch preflight is done only when blockers are closed or clearly documented with owner and next action.
