# Architecture diagram

Companion to [`Design.md`](./Design.md). That file is the source of truth;
this one is the same architecture drawn, so the shape is visible at a glance.
If they disagree, `Design.md` wins and this file is stale.

Diagrams are Mermaid, which GitHub renders inline.

---

## 1. System

One Next.js deploy, two external stores. The CMS is **not** a separate
service: `/admin` and the public pages run in the same process, which is why
a content change needs no build.

```mermaid
graph TB
    subgraph clients["Who asks"]
        visitor["Visitor<br/><i>browser, runs JS</i>"]
        crawler["Googlebot · Facebook · Zalo · Coc Coc<br/><i>Zalo and Coc Coc run no JS</i>"]
        editor["Editor<br/><i>non-technical staff</i>"]
    end

    edge["Vercel edge<br/><b>cached HTML per tag</b>"]

    subgraph deploy["One Next.js deploy — one repo, one domain"]
        rewrites["next.config.mjs<br/><b>rewrites + redirects</b><br/><i>public URL → plain folder, carries locale</i>"]

        subgraph app["src/app"]
            landing["landing-page/<br/><i>static pages, metadata,<br/>sitemap, JSON-LD</i>"]
            crm["crm/admin/<br/><i>Payload CMS UI</i>"]
            restapi["crm/api/<br/><i>Payload REST</i>"]
            revalidate["api/revalidate<br/><i>purges cache tags</i>"]
            draft["api/draft<br/><i>enables draftMode()</i>"]
        end

        payload["Payload core<br/><i>in-process · access control ·<br/>hooks · localization</i>"]
    end

    pg[("PostgreSQL<br/><i>all content, per locale</i>")]
    r2[("Cloudflare R2<br/><i>media + generated sizes</i>")]

    visitor --> edge
    crawler --> edge
    edge -->|"miss"| rewrites
    rewrites --> landing
    editor -->|"/admin"| rewrites
    rewrites --> crm
    rewrites --> restapi

    landing --> payload
    crm --> payload
    restapi --> payload
    draft --> landing
    payload --> pg
    payload -->|"afterChange"| revalidate
    revalidate -->|"revalidateTag"| edge
    crawler -. "img src" .-> r2
    visitor -. "img src" .-> r2
    payload -->|"uploads"| r2

    classDef store fill:#1f3a5f,stroke:#5b9bd5,color:#fff
    classDef infra fill:#2d2d3a,stroke:#8a8aa3,color:#fff
    class pg,r2 store
    class edge,rewrites infra
```

**Why images bypass the deploy.** `disablePayloadAccessControl` makes
`next/image` and crawlers fetch straight from R2's public host. Proxying the
media library through the Next server would put every image on the critical
path for LCP, and AGENT.md section 5.5 targets mobile Lighthouse at 90.

---

## 2. How a URL becomes a page

Route folders under `src/app` are plain words, so the filesystem does not
produce the public URLs — the rewrite table does. The locale rides along the
same mechanism that already carries path depth.

```mermaid
graph LR
    url["GET /en/pricing"] --> redir{"redirects"}
    redir -->|"internal path<br/>asked for directly"| out["308 → public URL"]
    redir -->|"ok"| rw{"rewrites<br/><i>afterFiles</i>"}

    rw -->|"/api/**"| api["crm/api/slug<br/><i>slug from request path</i>"]
    rw -->|"/admin/**"| adm["crm/admin/segements<br/><i>segments from __p</i>"]
    rw -->|"/en/**"| en["landing-page<br/><i>locale=en, __p=pricing</i>"]
    rw -->|"everything else"| vi["landing-page<br/><i>locale=vi (default)</i>"]

    en --> resolve["localeFromPath()<br/><b>one place</b>"]
    vi --> resolve
    resolve --> query["tagged query<br/><i>page:en:pricing</i>"]
    query --> html["HTML + hreflang<br/><i>vi · en · x-default</i>"]

    classDef gate fill:#3a2d1f,stroke:#d5a05b,color:#fff
    class redir,rw gate
```

**The cost, stated plainly.** Every route added from here needs a rule in
this table, in both locales, or it 404s while the build still passes — which
is why the e2e suite walks the table rather than trusting it. And
`generateStaticParams()` cannot prerender per slug behind a literal folder
name, which localization multiplies by the number of locales. See
`Design.md` section 5a: **decide this before T-09.**

---

## 3. Locales

| | `vi` (default) | `en` |
| --- | --- | --- |
| URL | unprefixed — `/bang-gia` | `/en` prefix — `/en/pricing` |
| Slug | localized, its own keyword | localized, its own keyword |
| Cache tag | `page:vi:bang-gia` | `page:en:pricing` |
| `og:locale` | `vi_VN` | `en_US` |
| `hreflang` | `vi` + `x-default` | `en` |

```mermaid
graph TB
    doc["One Pages document"]
    doc --> viv["vi: title, slug, layout, meta"]
    doc --> env["en: title, slug, layout, meta"]
    doc --> shared["not localized:<br/>_status, price, image"]

    viv --> viurl["/bang-gia<br/>tag page:vi:bang-gia"]
    env --> enurl["/en/pricing<br/>tag page:en:pricing"]

    viurl <-->|"reciprocal hreflang"| enurl

    env -.->|"SEO tab empty"| noindex["forced noindex<br/><i>out of the sitemap</i>"]

    classDef warn fill:#3a1f1f,stroke:#d55b5b,color:#fff
    class noindex warn
```

An untranslated locale is **excluded, not published**. Payload's field
fallback would otherwise render Vietnamese text under an `/en/` URL — thin
duplicate content competing with the page it was copied from. The guard
reuses `meta.noindex`, which T-13 already honours, so there is no new
concept for the handover to explain.

---

## 4. Trust boundaries

What is reachable without a session, and what each control actually is.

```mermaid
graph TB
    subgraph public["Public — no session"]
        p1["/ · /en · content routes"]
        p2["/sitemap.xml · /robots.txt"]
        p3["R2 image URLs"]
        p4["GET /api/media"]
    end

    subgraph secret["Shared secret"]
        s1["/api/revalidate<br/><i>REVALIDATE_SECRET · 401 otherwise</i>"]
        s2["/api/draft<br/><i>PREVIEW_SECRET</i>"]
    end

    subgraph staff["Signed in"]
        e1["editor<br/><i>read + update content<br/>create media · no delete</i>"]
        a1["admin<br/><i>everything, incl. Users</i>"]
    end

    blocked["Not reachable<br/><i>GraphQL disabled ·<br/>/crm/** redirects out</i>"]

    classDef pub fill:#1f3a2d,stroke:#5bd58a,color:#fff
    classDef sec fill:#3a2d1f,stroke:#d5a05b,color:#fff
    classDef stf fill:#1f2d3a,stroke:#5b9bd5,color:#fff
    classDef no fill:#3a1f1f,stroke:#d55b5b,color:#fff
    class p1,p2,p3,p4 pub
    class s1,s2 sec
    class e1,a1 stf
    class blocked no
```

Two of these are load-bearing and were found by testing, not by reading:

- **Media must be publicly readable.** Payload's default denies anonymous
  reads, which 403s every image for visitors and crawlers alike.
- **The last administrator cannot be removed.** `role` is admin-only at
  field level and `Users` is hidden from editors, so zero admins means
  nobody can promote anyone and only SQL recovers it.
