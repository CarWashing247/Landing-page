import type { WidgetServerProps } from 'payload'

import type { AdminMessageKey } from '../../../i18n/admin-translations'
import { adminMessage } from '../../../i18n/admin-translations'
import { Panel, PanelHead } from './shared'

/**
 * The editorial checklist from the prototype: the order in which a page
 * actually gets finished here.
 *
 * It is static on purpose. Making it tick itself would mean inferring "has this
 * been reviewed" from data that does not record it, and a checklist that marks
 * an unfinished step complete is worse than one that marks nothing. These are
 * the four steps the project's own rules imply: both locales (T-04A), the SEO
 * tab and share image (T-08), the live preview (T-12), then publish.
 */

const STEPS = [
  'dashboardStepLocales',
  'dashboardStepSeo',
  'dashboardStepPreview',
  'dashboardStepPublish',
] as const satisfies readonly AdminMessageKey[]

export const ChecklistWidget = ({ req }: WidgetServerProps) => (
  <Panel>
    <PanelHead title={adminMessage(req, 'dashboardChecklistTitle')} />
    <ol className="pd-steps">
      {STEPS.map((step, index) => (
        <li className="pd-steps__row" key={step}>
          <span aria-hidden="true" className="pd-steps__number">
            {index + 1}
          </span>
          {adminMessage(req, step)}
        </li>
      ))}
    </ol>
  </Panel>
)
