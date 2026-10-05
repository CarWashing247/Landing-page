import { BenefitsBlock } from './BenefitsBlock'
import { CTABlock } from './CTABlock'
import { FAQBlock } from './FAQBlock'
import { HeroBlock } from './HeroBlock'
import { PricingBlock } from './PricingBlock'
import { StepsBlock } from './StepsBlock'
import { TechnologyBlock } from './TechnologyBlock'

type Block = { id?: string | null; blockType: string; [key: string]: unknown }

export const BlockRenderer = ({ blocks }: { blocks?: Block[] | null }) => (
  <>
    {blocks?.map((block) => {
      switch (block.blockType) {
        case 'hero': return <HeroBlock key={block.id} />
        case 'benefits': return <BenefitsBlock key={block.id} />
        case 'steps': return <StepsBlock key={block.id} />
        case 'pricing': return <PricingBlock key={block.id} />
        case 'technology': return <TechnologyBlock key={block.id} />
        case 'faq': return <FAQBlock key={block.id} />
        case 'cta': return <CTABlock key={block.id} />
        default: return null
      }
    })}
  </>
)
