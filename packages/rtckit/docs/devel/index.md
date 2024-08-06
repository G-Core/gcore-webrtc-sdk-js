# Project maintenance and contributin

## Project Setup

```sh
npm install
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Checking dependencies licenses

```sh
npx license-checker \
    --onlyAllow 'Apache-1.0;Apache-1.1;Apache-2.0;0BSD;BSD-2-Clause;BSD-3-Clause;ISC;MIT' \
    --summary
```

## Publish

Once you've made the desired changes:

```
$ npm version [major|minor|patch]
$ npm run build
$ npm publish --access public
```

### NPM
https://www.npmjs.com/package/@gcorevideo/rtckit
