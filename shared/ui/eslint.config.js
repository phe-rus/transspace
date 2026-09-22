//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "pnpm/json-enforce-catalog": "off",
      // AC-2: color and background come from a design token, never a raw
      // hex Tailwind utility. Add a row to the spec's Token exceptions
      // table (docs/specs/0001-design-system-ui-foundation/index.md) for
      // a deliberate, one-off exception instead of disabling this rule.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/(?:^|[\\s\"'`])(?:bg|text|border)-\\[#/]",
          message:
            "Raw hex color utility found. Use a design token (see shared/ui/AGENTS.md) or add a row to the spec's Token exceptions table.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(?:^|[\\s\"'`])(?:bg|text|border)-\\[#/]",
          message:
            "Raw hex color utility found. Use a design token (see shared/ui/AGENTS.md) or add a row to the spec's Token exceptions table.",
        },
      ],
    },
  },
  {
    ignores: ["eslint.config.js", ".prettierrc"],
  },
]
