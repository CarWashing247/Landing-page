/*
 * CRM (Payload admin) root layout. The shape of this file is dictated by Payload —
 * change it only to match a Payload upgrade.
 *
 * It deliberately does not import globals.css: the admin panel ships its own
 * styles, and Tailwind's preflight would fight them. That separation is the
 * reason the landing-page and crm folders each own a layout.
 *
 * The one addition to Payload's own shape is `./admin.css`, the brand theme
 * (T-19A). Payload 3 has no `admin.css` config key — the installed types offer
 * `admin.meta`, `admin.components`, `admin.theme` and `admin.livePreview` and
 * nothing for a stylesheet — so a layout import is the only place it can go.
 * That file imports the shared brand tokens, not globals.css, so no Tailwind
 * reaches the admin.
 */
import type { ServerFunctionClient } from 'payload'
import type { ReactNode } from 'react'

import config from '@payload-config'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'

/**
 * Payload's own stylesheet, and **the admin had no styles at all without it.**
 *
 * Payload 3's admin layout is required to import this; the file was written
 * without it, so every screen of the panel has rendered as unstyled HTML —
 * serif headings, blue underlined links, no cards, no navigation chrome —
 * since the admin was created. Nothing failed, which is why it survived: the
 * panel works, it just looks like a 1996 form. Found by screenshotting
 * `/admin/login` while theming it in T-19A, and confirmed by screenshotting it
 * again with this task's own stylesheet removed.
 *
 * It must come before `./admin.css`, which overrides values this file defines.
 */
import '@payloadcms/next/css'

import { importMap } from './admin/importMap.js'

/** The brand theme (T-19A). See the note in the file itself. */
import './admin.css'

type Args = {
  children: ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const PayloadLayout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default PayloadLayout
