# Cardinal Showroom

The client-facing sales presentation app for Cardinal Roofing & Renovations.

**Independently deployable, and that is the point.** It has its own repository,
its own Vercel project and its own sign-in, so a change to the Cardinal CRM
cannot destabilise a presentation in front of a customer. There is **no CRM code
here**, and no runtime dependency on `app.cardinalroster.com` — `api/detect.js`
is this project's own copy rather than a call across.

```
index.html           the shell: sign-in, Prepare/Present, project pack, launcher
showroom-images.js   the ONE Showroom-owned image utility (shrink + renditions)
showcase.js/.css     Showcase — before/after, Hall of Fame, The Walk
colors.js/.css       OC Colors — Owens Corning lines, colours, specs
api/detect.js        The Walk's damage detection. Needs GEMINI_API_KEY as a
                     Vercel environment variable — never committed here.
```

Studio and the Exterior Visualizer are **separate applications** and are linked,
never embedded. The Pop-Up Roof is **not** a completed sales tool and is
deliberately absent from the launcher; it is recorded as a future pre-install
customer experience.

Session key is `cr-showroom-auth`: this app keeps its own Supabase session so it
never fights the CRM or Studio over one. Authorisation is enforced by RLS,
server-side — Present mode is a **display** boundary, not an authentication one.

Gates, fixtures and CI live in `.claude/` and `.github/`, excluded from the
deploy by `.vercelignore`.
