module.exports = {
    root: true,
    env: {
        es6: true,
        node: true,
        commonjs: true
    },
    globals: {
        window: true,
        self: true,
        __DEV__: true
    },
    extends: ['standard', 'prettier', 'prettier/standard'],
    parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module'
    },
    plugins: ['prettier', 'standard'],
    rules: {
        'prettier/prettier': 'error',
        semi: [2, 'always']
    }
};
