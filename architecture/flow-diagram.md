# Flow diagram

Companion to [`Design.md`](./Design.md) section 1.2. The read path and the
write path are independent, and that independence is the whole point of the
architecture: it is why a non-developer can change a meta description and
see it live in seconds, with no build.

If this file and `Design.md` disagree, `Design.md` wins.

---

## 1. Read path — visitor or crawler

```mermaid
sequenceDiagram
    autonumber
    participant C as Visitor / crawler
    participant E as Vercel edge
    participant N as Next (landing-page)
    participant P as Payload
    participant DB as PostgreSQL
    participant R2 as Cloudflare R2

    C->>E: GET /en/pricing
    alt cache hit
        E-->>C: pre-rendered HTML · no JS required
        Note over C,E: Zalo and Coc Coc get a complete page.<br/>This is the common case.
    else cache miss
        E->>N: forward
        N->>N: rewrites → landing-page, locale=en
        N->>P: find pages, slug=pricing, locale=en
        P->>DB: SELECT (locale-scoped)
        DB-->>P: document
        P-->>N: content
        N->>N: buildMetadata() → title, og:*, hreflang
        N-->>E: HTML, tagged page:en:pricing
        E-->>C: HTML and cache it
    end
    C->>R2: GET image (public host, not via Next)
    R2-->>C: bytes
```

**What can go wrong here**

| Symptom | First thing to check |
| --- | --- |
| Page renders but is empty for a crawler | content fetched in a client component or `useEffect` |
| Share on Zalo has no image | `metadataBase` missing, so `og:image` is relative |
| New route 404s though the build passed | no rewrite rule for it, in either locale |
| English URL shows Vietnamese text | locale not resolved; field fallback filling in |
| Route shows `ƒ` not `○` in the build | not statically generated — see `Design.md` 5a |

---

## 2. Write path — editor publishes

No CI run is involved. A content change never triggers a build.

```mermaid
sequenceDiagram
    autonumber
    participant Ed as Editor
    participant A as /admin (crm)
    participant P as Payload
    participant DB as PostgreSQL
    participant RV as /api/revalidate
    participant E as Vercel edge

    Ed->>A: edit English meta.description, Publish
    A->>P: update, locale=en
    P->>P: access control · field-level guards
    P->>DB: write
    P->>RV: POST tags (afterChange)
    Note over P,RV: both the new and previous slug,<br/>scoped to the locale that changed
    RV->>RV: verify REVALIDATE_SECRET
    alt secret missing or wrong
        RV-->>P: 401 — nothing purged
    else ok
        RV->>E: revalidateTag(page:en:pricing, sitemap)
        E-->>RV: 200
    end
    Ed->>E: reload /en/pricing
    E->>E: miss → rebuild from DB
    E-->>Ed: new description, within ~10s

    Note over P,E: Publishing English leaves page:vi:bang-gia<br/>cached and untouched.
```

**Why the hook never blocks the save.** A failed purge is logged and
swallowed; the `revalidate: 3600` floor is the safety net, so the worst case
is a stale page for an hour rather than an editor who cannot publish.

**What can go wrong here**

| Symptom | First thing to check |
| --- | --- |
| Edit does not appear live | the query feeding that page has no tag, so there is nothing to purge |
| Old URL still serves after a slug change | `afterChange` not sending `previousDoc.slug` |
| Vietnamese page went stale after an English edit | tag missing its locale — purging too broadly |
| Edit appears only after an hour | the webhook is failing; the floor is covering for it |

---

## 3. Draft preview

The one case that deliberately bypasses the cache, scoped to a cookie
holder.

```mermaid
sequenceDiagram
    autonumber
    participant Ed as Editor
    participant D as /api/draft
    participant N as Next
    participant P as Payload
    participant Anon as Logged-out visitor

    Ed->>D: Preview (slug + PREVIEW_SECRET)
    alt secret wrong
        D-->>Ed: 401
    else ok
        D->>D: draftMode().enable()
        D-->>Ed: redirect to the page
        Ed->>N: GET the page (draft cookie)
        N->>P: find, draft: true, locale
        P-->>N: unpublished content
        N-->>Ed: draft HTML · not cached, does not populate the cache
    end
    Anon->>N: GET the same URL (no cookie)
    N-->>Anon: published version, or 404
    Note over Anon: A draft is never in the sitemap<br/>and never served to a crawler.
```

---

## 4. Upload

```mermaid
graph LR
    up["Editor uploads<br/><i>a create on Media</i>"] --> hasAlt{"alt filled?"}
    hasAlt -->|"no"| rej["400 · NOT NULL in Postgres,<br/>not merely required in the UI"]
    hasAlt -->|"yes"| sizes["sharp generates<br/>thumbnail · card · hero · og"]
    sizes --> small{"source smaller<br/>than target?"}
    small -->|"og"| grow["enlarge to exactly 1200x630<br/><i>dimensions beat sharpness</i>"]
    small -->|"others"| keep["fall back to the original<br/><i>never upscaled</i>"]
    grow --> store[("R2")]
    keep --> store
    store --> pub["public URL · served direct"]

    classDef warn fill:#3a1f1f,stroke:#d55b5b,color:#fff
    class rej warn
```

Left to its default, Payload **omits** a size larger than the source and
says nothing — a 600x400 upload produced no `og` at all, meaning no
Facebook or Zalo preview image. Every size now sets `withoutEnlargement`
explicitly.

---

## 5. Where the gates sit

```mermaid
graph LR
    subgraph p1["Phase 1"]
        t1["T-01 bootstrap"] --> t4["T-04 deploy"]
        t1 --> t4a["<b>T-04A localization</b>"]
    end
    g1{{"Gate 1<br/>login · green deploy ·<br/>both locales"}}
    subgraph p2["Phase 2 — content and SEO"]
        t6["T-06/07 collections"] --> t8["T-08 SEO group"] --> t9["T-09 buildMetadata"] --> t10["T-10 cache tags"] --> t14["T-14 JSON-LD"]
    end
    g2{{"Gate 2<br/>meta + hreflang + JSON-LD<br/>in both locales"}}
    subgraph p3["Phase 3 — interface"]
        t15a["T-15A catalog"] --> t17["T-17 blocks"] --> t20["T-20 performance"]
    end
    g3{{"Gate 3<br/>mobile Lighthouse 90+"}}
    subgraph p4["Phase 4 — launch"]
        t23["T-23 seed"] --> t24["T-24 handover"]
    end
    g4{{"Gate 4<br/>indexed · editor publishes unaided"}}

    t4 --> g1
    t4a --> g1
    g1 --> t6
    t14 --> g2
    g2 --> t15a
    t20 --> g3
    g3 --> t23
    t24 --> g4

    classDef gate fill:#3a2d1f,stroke:#d5a05b,color:#fff
    class g1,g2,g3,g4 gate
```

Each arrow into a gate is a thing that cannot be retrofitted cheaply:
**T-04A** fixes the schema, the cache key and the routing; **Phase 2** makes
SEO a property of the data layer; **T-15A** gives interface strings a home
before the components exist. Reordering any of them turns the next phase
into extraction work.
