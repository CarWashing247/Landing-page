import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      // Generated — never hand-edited, so never linted (AGENT.md section 3).
      'src/payload-types.ts',
      'src/app/crm/admin/importMap.js',
      'src/migrations/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
]

export default config
