import type { Metadata } from 'next'
import { BenefitsBlock } from './blocks/BenefitsBlock'
import { CTABlock } from './blocks/CTABlock'
import { FAQBlock } from './blocks/FAQBlock'
import { HeroBlock } from './blocks/HeroBlock'
import { PricingBlock } from './blocks/PricingBlock'
import { StepsBlock } from './blocks/StepsBlock'
import { TechnologyBlock } from './blocks/TechnologyBlock'
import { Footer } from './layout/Footer'
import { Header } from './layout/Header'
import { loadServices, loadSiteSettings } from '../lib/content'
import type { Locale } from '../lib/locales'
import { LOCALES, pathForHome } from '../lib/locales'
import { buildMetadata } from './seo/metadata'

export const HomePage = async ({ locale }: { locale: Locale }) => {
  const services = await loadServices(locale)
  return (
    <>
      <Header locale={locale} />
      <main>
        <HeroBlock />
        <BenefitsBlock />
        <StepsBlock />
        <PricingBlock services={services} locale={locale} />
        <TechnologyBlock />
        <FAQBlock />
        <CTABlock />
      </main>
      <Footer locale={locale} />
    </>
  )
}

export const homeMetadata = async (locale: Locale): Promise<Metadata> =>
  buildMetadata({
    locale,
    paths: Object.fromEntries(LOCALES.map((candidate) => [candidate, pathForHome(candidate)])),
    settings: await loadSiteSettings(locale),
  })
