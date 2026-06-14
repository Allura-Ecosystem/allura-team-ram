# License Notice for Huashu-Design Integration

## Huashu-Design Original License

The skill `huashu-design` is authored by 花叔 (Alchain / @AlchainHust).

**License terms:**
- **Personal Use**: Free and unrestricted for personal learning, research, private creation, side projects, social media posts.
- **Commercial Use**: **Prohibited without explicit authorization.**
  - This includes integrating the skill into company products, using it as a primary creation tool for client deliverables, or embedding it in SaaS features.

**What counts as commercial use (requires authorization):**
- Deploying huashu-design within Allura's client-facing features
- Using huashu-design output as the main creative method in paid client projects
- Redistributing or sublicensing the skill
- Integrating into a commercial product or service

**Authorization contact:**
- X/Twitter: @AlchainHust
- WeChat: 花叔 (search "花叔")
- Website: https://www.huasheng.ai/

## Allura-Design Wrapper License

This wrapper (`allura-design`) is a governance layer that Allura created for internal use. It does not modify or redistribute huashu-design. It merely:
1. Searches Allura Brain for existing design context
2. Delegates to the user's existing huashu-design installation
3. Persists design outputs back to Allura Brain

This wrapper adds no new design functionality — it only adds memory governance.

## Decision Matrix for Allura Usage

| Scenario | Allowed? | Action |
|---|---|---|
| Internal prototype for feature exploration | ✅ Yes | No authorization needed |
| Design mockup for Allura's own marketing | ⚠️ Yes, if personal | Observe huashu-design license |
| Client deliverable where client pays for the design work | ❌ No | Obtain authorization from 花叔 |
| Client deliverable where design is only a small auxiliary component | 🔶 Gray area | Obtain authorization to stay safe |
| SaaS feature where users can generate designs via Allura | ❌ No | This is redistribution; requires authorization |

## Recommendation for Allura Team

Before using huashu-design in any client-facing or commercial context:
1. Contact 花叔 for commercial authorization
2. Or replace huashu-design with a fully open-source alternative (e.g., build our own design skill or use MIT-licensed tools)
3. Or use huashu-design only for personal/internal inspiration, then recreate the final output with independent tooling

## Disclaimer

Allura does not claim ownership of huashu-design. This wrapper is an integration convenience. All copyright and licensing terms of the original skill remain in full force.
