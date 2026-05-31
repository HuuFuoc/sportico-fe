# Taste Skill — Sportico Frontend Application

Source: https://github.com/leonxlnx/taste-skill

## Installation

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
npx skills add https://github.com/Leonxlnx/taste-skill --skill "redesign-existing-projects"
npx skills add https://github.com/Leonxlnx/taste-skill --skill "full-output-enforcement"
```

Installed skills are symlinked under `.agents/skills/` in the project root.

## Applied rules for this project

### Visual direction
- Sportico is a **premium badminton / sports coaching SaaS** targeting Vietnam.
- UI must feel sport-specific, disciplined, and high-quality — not a generic admin dashboard.
- Primary color: indigo `#3525cd` with violet accents.

### Anti-patterns to avoid
- No random oversized gradient hero blocks unrelated to data
- No fake AI badges unless backed by real data
- No glassmorphism-heavy sections
- No bloated card layouts with excessive decorative elements
- No mixed Vietnamese/English text on the same page
- No fake mock data showing as real coaches (System accounts, ₫0/hr, 0.0 ratings)

### Required patterns
- Strong visual hierarchy: size + color, not random weight variation
- Consistent spacing: 4/8/16/24/32px scale
- Consistent radius: 6px (inputs/buttons), 10px (cards), 14-18px (sections)
- Coach cards: name, sport, location (if available), rating (only if > 0), experience, CTA
- Empty states: informative, actionable, Vietnamese copy
- Error states: clear message, retry button, no raw JSON
- Loading states: skeleton or spinner, not flash-of-content

### Specific to redesign-existing-projects
- Inspect actual pages before redesigning
- Do not break working functionality while redesigning
- Redesign must be based on **real backend capabilities** — no decorative sections for features that don't exist
- Prefer improving existing components over creating entirely new ones
- Keep component splitting logical (max ~300 lines per component)

### full-output-enforcement
- Always produce complete, runnable code — no `// ... rest of implementation`
- Never leave placeholder comments in shipped code
- All TypeScript types must be explicit, no implicit `any`
- Verify builds after changes
