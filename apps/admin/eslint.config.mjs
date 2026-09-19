// ESLint 9 flat config — Admin app (Next.js 14 + TypeScript)
//
// NOTE: @next/eslint-plugin-next@14 is NOT compatible with ESLint 9
// (uses removed `context.getAncestors()` API). Next-plugin rules are
// lint-only style hints (no-duplicate-head, no-img-element etc.) with
// no build/functionality impact, so we omit them here.
// Re-enable once Next 15 + @next/eslint-plugin-next@15 is adopted
// (Step 15 or later), which supports ESLint 9 flat config natively.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'src/app/**/layout.tsx', // layout files use React.Suspense boundaries
      '*.config.*',
    ],
  },

  // Base JS rules (eslint:recommended)
  js.configs.recommended,

  // TypeScript (non-type-checking variant for speed)
  ...tseslint.configs.recommended,

  // React Hooks
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Project overrides — start lenient (Step 15 will tighten)
  {
    rules: {
      // Warnings only — do not break CI on style
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
    },
  },
];