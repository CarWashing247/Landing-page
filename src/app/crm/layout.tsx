/*
 * CRM (Payload admin) root layout. The shape of this file is dictated by Payload —
 * change it only to match a Payload upgrade.
 *
 * It deliberately does not import globals.css: the admin panel ships its own
 * styles, and Tailwind's preflight would fight them. That separation is the
 * reason the landing-page and crm folders each own a layout.
 *
 * That file imports the shared brand tokens, not globals.css, so no Tailwind
 * reaches the admin.
 */
import type { ServerFunctionClient } from 'payload'
import type { ReactNode } from 'react'

import config from '@payload-config'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'

import { inter, interTight } from '../../lib/fonts'

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

 */
import '@payloadcms/next/css'

/**
 * The brand chrome (T-19C). Must come after Payload's own stylesheet, which it
 * overrides in a handful of places; see the file for what it deliberately does
 * not touch.
 */
import './admin.css'

import { importMap } from './admin/importMap.js'

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
  <RootLayout
    config={config}
    htmlProps={{ className: `${inter.variable} ${interTight.variable}` }}
    importMap={importMap}
    serverFunction={serverFunction}
  >
    {children}
  </RootLayout>
)

export default PayloadLayout
