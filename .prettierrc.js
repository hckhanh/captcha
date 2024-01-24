export default {
    trailingComma: 'es5',
    tabWidth: 4,
    semi: false,
    singleQuote: true,
    printWidth: 120,
    overrides: [
        {
            files: [
                '*.md',
                '*.html',
                '*.ts',
                '*.tsx',
                '*.js',
                '*.jsx',
                '*.mjs',
                '*.cjs',
                '*.json',
                '*.yaml',
                '*.yml',
                '*.toml',
                '*.d.ts',
                '*.cts',
                '*.mts',
                '.*.json',
                '.*.js',
                '.*.mjs',
                '.*.cjs',
                '.*.yaml',
                '.*.yml',
                '.*.toml',
                'tsconfig.json',
            ],
        },
    ],
}
