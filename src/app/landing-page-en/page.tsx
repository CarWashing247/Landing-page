import type { Metadata } from 'next'

import { HomePage, homeMetadata } from '../../components/HomePage'

const LOCALE = 'en' as const

export const generateMetadata = async (): Promise<Metadata> => homeMetadata(LOCALE)

const Page = () => <HomePage locale={LOCALE} />

export default Page
