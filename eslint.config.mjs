import {NFQEslintConfig} from '@nfq/eslint-config';
// eslint-disable-next-line import/extensions
import createFeatureFlags from '@nfq/feature-flags/eslint/import.js';
import {defineConfig} from 'eslint/config';

// eslint-disable-next-line import/extensions
import {withAliasesEslint} from './withAliases.js';

const featureFlags = createFeatureFlags(['@app/features', '@nfq/feature-flags/jsx']);

export default defineConfig([
    {
        ignores: [
            'src/shared/prisma/**',
            'next-env.d.ts',
            'coverage/**',
            '.nyc_output/**',
            '.history/**',
            'public/mockServiceWorker.js',
            '.storybook/mock/mockServiceWorker.js',
            'next.config.js'
        ]
    },
    {
        extends: [NFQEslintConfig],
        rules: {...featureFlags.rules},
        settings: {'import/resolver': withAliasesEslint()}
    }
]);