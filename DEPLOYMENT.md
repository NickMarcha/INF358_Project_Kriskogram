# GitHub Pages Deployment Guide

This guide explains how to deploy your Kriskogram project to GitHub Pages.

## 🚀 Automatic Deployment (Recommended)

The project is configured for automatic deployment using GitHub Actions. Every push to the `main` or `master` branch will automatically build and deploy your site.

### Setup Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit with GitHub Pages setup"
   git push origin main
   ```

2. **Enable GitHub Pages** (REQUIRED - One-time setup)
   - Go to your repository on GitHub: `https://github.com/NickMarcha/INF358_Project_Kriskogram`
   - Navigate to **Settings** → **Pages** (in the left sidebar)
   - Under **Build and deployment**:
     - **Source**: Select "Deploy from a branch"
     - **Branch**: Select `gh-pages` and `/ (root)`
     - Click **Save**
   - GitHub will start deploying (takes 1-2 minutes)

3. **Access your site**
   - Your site will be available at: `https://nickmarcha.github.io/INF358_Project_Kriskogram/`
   - Wait 1-2 minutes after enabling Pages for the first time

## 🔧 Manual Deployment

If you prefer manual deployment or want to test locally:

### Prerequisites
```bash
npm install
```

### Build for Production
```bash
npm run build:gh-pages
```

### Deploy to GitHub Pages
```bash
npm run deploy
```

### Preview Locally
```bash
npm run preview
```

## 📁 Project Structure

The deployment setup includes:

- **`.github/workflows/deploy.yml`** - GitHub Actions workflow
- **`vite.config.ts`** - Vite configuration with GitHub Pages base path
- **`package.json`** - Deployment scripts

## ⚙️ Configuration Details

### Base Path Configuration
The Vite config automatically sets the correct base path:
- **Development**: `/` (localhost)
- **Production**: `/INF358_Project_Kriskogram/` (GitHub Pages)

### Build Output
- **Directory**: `dist/`
- **Assets**: `dist/assets/`

## 🔍 Troubleshooting

### Common Issues

1. **404 Errors on GitHub Pages**
   - Ensure the base path is correctly set in `vite.config.ts`
   - Check that your repository name matches the base path

2. **Assets Not Loading**
   - Verify the build output includes the `assets` directory
   - Check that relative paths are correctly resolved

3. **Routing Issues**
   - TanStack Router should handle client-side routing automatically
   - Ensure all routes are properly configured

### Debug Steps

1. **Check build output**:
   ```bash
   npm run build:gh-pages
   ls -la dist/
   ```

2. **Test locally**:
   ```bash
   npm run preview
   ```

3. **Check GitHub Actions**:
   - Go to **Actions** tab in your repository
   - Look for failed workflows and error messages

## 🌐 Custom Domain (Optional)

To use a custom domain:

1. **Add CNAME file**:
   ```bash
   echo "your-domain.com" > public/CNAME
   ```

2. **Update GitHub Actions**:
   - Uncomment the `cname` line in `.github/workflows/deploy.yml`
   - Replace with your domain

3. **Configure DNS**:
   - Point your domain to GitHub Pages servers
   - Add CNAME record: `your-domain.com` → `[username].github.io`

## 📊 Deployment Status

After deployment, you can check:
- **GitHub Actions**: Repository → Actions tab
- **Pages Settings**: Repository → Settings → Pages
- **Live Site**: `https://[username].github.io/Kriskogram/`

## 🎯 Next Steps

1. Push your code to trigger the first deployment
2. Wait for the GitHub Action to complete
3. Visit your live site
4. Share your Kriskogram visualization with the world!

---

**Note**: The first deployment may take a few minutes. Subsequent deployments will be faster as GitHub caches the build environment.
