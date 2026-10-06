import { t } from '../../i18n/t'
import type { Locale } from '../../lib/locales'
import type { Page } from '../../payload-types'
import { Contact } from './Contact'
import { Content } from './Content'
import { Cta } from './Cta'
import { Faq } from './Faq'
import { Hero } from './Hero'
import { Pricing } from './Pricing'
import { Steps } from './Steps'

type Block = NonNullable<Page['layout']>[number]

/**
 * `blockType` → component, with no fixed order anywhere.
 *
 * Blocks render in whatever order the editor arranged them; nothing here or in
 * the page assumes a hero comes first, or that a pricing table exists at all.
 * That is the acceptance criterion, and it is also what makes the block set
 * worth having — a layout an editor cannot rearrange is a template with extra
 * steps.
 *
 * **A new block type with no component is a type error.** The `never` in the
 * default branch is the mechanism: TypeScript narrows `block` through the
 * switch, so if the generated union grows a member the switch does not handle,
 * the remaining type is no longer `never` and the assignment fails
 * `npm run typecheck`. Without it a new block would render as nothing — a blank
 * gap on a published page, with no error anywhere.
 */
const renderBlock = (block: Block, locale: Locale): React.ReactNode => {
  const copy = t(locale)

  switch (block.blockType) {
    case 'contact':
      return <Contact block={block} locale={locale} />
    case 'content':
      return <Content block={block} />
    case 'cta':
      return <Cta block={block} />
    case 'faq':
      return <Faq block={block} />
    case 'hero':
      return <Hero block={block} />
    case 'pricing':
      return (
        <Pricing
          block={block}
          duration={copy.sections.estimatedDuration}
          includes={copy.sections.includes}
          locale={locale}
        />
      )
    case 'steps':
      return <Steps block={block} />
    default: {
      const unhandled: never = block

      // Unreachable while the switch is exhaustive; this line is what makes the
      // compiler prove that it is.
      void unhandled

      return null
    }
  }
}

/** Does this layout already provide the page's `<h1>`? */
export const hasHero = (layout: Page['layout']): boolean =>
  (layout ?? []).some((block) => block.blockType === 'hero')

export const RenderBlocks = ({ layout, locale }: { layout: Page['layout']; locale: Locale }) => (
  <>
    {(layout ?? []).map((block) => (
      <div key={block.id ?? `${block.blockType}-${(layout ?? []).indexOf(block)}`}>
        {renderBlock(block, locale)}
      </div>
    ))}
  </>
)
