module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'build', 'node_modules', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    // This codebase does not use PropTypes; typing is not enforced here.
    'react/prop-types': 'off',
    // react-three-fiber renders custom JSX elements with props ESLint treats as unknown
    // DOM attributes (position, args, intensity, rotation...). Off to avoid false positives.
    'react/no-unknown-property': 'off',
    // Pre-existing backlog is reported as warnings (not build-blocking) for gradual cleanup.
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
