# Deployment Guide

This document explains how to deploy the FRC Mechanism Code Generator to various platforms.

## GitHub Pages Deployment

GitHub Pages is a free hosting service that makes it easy to deploy static websites directly from a GitHub repository.

### Manual Deployment

1. Build the static site:
   ```bash
   pnpm build
   ```

2. The static site will be generated in the `out` directory.

3. Push the `out` directory to the `gh-pages` branch:
   ```bash
   git add out/ -f
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix out origin gh-pages
   ```

4. Configure GitHub Pages in your repository settings to use the `gh-pages` branch.

### Automated Deployment with GitHub Actions

You can automate the deployment process using GitHub Actions:

1. Create a file at `.github/workflows/deploy.yml` with the following content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          run_install: false

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Deploy
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: out
          branch: gh-pages
```

2. Push this file to your repository.

3. GitHub Actions will automatically build and deploy your site when you push to the main branch.

## Configuration for Deployment

Before deploying, make sure to update the `next.config.mjs` file:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  basePath: '/your-repo-name',  // Change this to your repository name
  trailingSlash: true,
  output: 'export',
  distDir: 'out',
};

export default nextConfig;
```

## Deploying to Other Platforms

### Vercel

1. Push your code to GitHub, GitLab, or Bitbucket.
2. Import your repository in Vercel.
3. Vercel will automatically detect Next.js and deploy your site.
4. Configure the build command to use pnpm:
   - Build Command: `pnpm build`
   - Output Directory: `out`

### Netlify

1. Push your code to GitHub, GitLab, or Bitbucket.
2. Import your repository in Netlify.
3. Configure the build settings:
   - Build Command: `pnpm build`
   - Publish Directory: `out`
4. Add an environment variable:
   - Key: `NPM_FLAGS`
   - Value: `--version`

## Custom Domain

If you want to use a custom domain:

1. Add your domain in your hosting provider's settings.
2. Update your DNS settings to point to your hosting provider.
3. If using GitHub Pages, create a `CNAME` file in the `public` directory with your domain name.
