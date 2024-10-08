# Gcore WebRTC ingest demo app

## Configuration

Obtain an [API key](https://api.gcore.com/docs/iam#section/Authentication/APIKey) an assign it to `NUXT_API_KEY` env var.

Built with [Nuxt](https://nuxt.com/docs/getting-started/introduction).
You can use [Vercel](https://vercel.com/) to deploy to the Internet.

## UI

Add the `token=XXX` URL query parameter to reveal the **host** tab in the UI. Parameter value can be arbitrary non-empty character string.

## Nuxt starter app

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm run dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm run build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm run preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
