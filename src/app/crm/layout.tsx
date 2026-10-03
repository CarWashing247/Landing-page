/*
 * CRM (Payload admin) root layout. The shape of this file is dictated by Payload —
 * change it only to match a Payload upgrade.
 *
 * It deliberately does not import globals.css: the admin panel ships its own
 * styles, and Tailwind's preflight would fight them. That separation is the
 * reason the landing-page and crm folders each own a layout.
 */
import type { ServerFunctionClient } from 'payload'
import type { ReactNode } from 'react'

import config from '@payload-config'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'

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
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default PayloadLayout
