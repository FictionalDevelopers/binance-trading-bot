module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  env: {
    es6: true,
    node: true,
    commonjs: true,
  },
  globals: {
    window: true,
    self: true,
    __DEV__: true,
  },
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/standard',
  ],
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module',
  },
  plugins: ['prettier', 'standard', '@typescript-eslint'],
  rules: {
    'prettier/prettier': 'error',
    semi: [2, 'always'],
  },
};
