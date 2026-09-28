import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import prettier from 'eslint-config-prettier/flat'
import tsParser from '@typescript-eslint/parser'
import tseslint from 'typescript-eslint'

const eslintConfig = defineConfig([
  ...nextVitals,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      ...tseslint.configs.recommendedTypeChecked.rules,
      // eslint-plugin-react-hooks 7.1 widened detection; existing sites are tracked for cleanup
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
        },
      ],
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ['**/actions/**/*.{ts,tsx}', '**/services/**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "TSTypeReference[typeName.name='Result'] > TSTypeParameterInstantiation > TSTypeReference[typeName.name='Error']",
          message:
            'Do not use Result<Error, ...> in Server Actions. Error objects are not serializable to the client. Use Result<string, ...> instead.',
        },
      ],
    },
  },
  {
    // Playwright fixtures take a callback named `use`, which the hooks rule
    // mistakes for React's use().
    files: ['e2e/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
])

export default eslintConfig
