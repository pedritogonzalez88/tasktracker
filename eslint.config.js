import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import globals from 'globals';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      }
    }
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
