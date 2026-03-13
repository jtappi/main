/**
 * PM2 ecosystem config for TrackMyWeek.
 *
 * Usage:
 *   pm2 start trackmyweek/ecosystem.config.cjs
 *   pm2 save
 *
 * NODE_ENV is intentionally set to 'development' to bypass requireAuth.
 * Access control is handled at the nginx layer (Cloudflare + portal login).
 * The trackmyweek Express server is never exposed directly to the internet
 * (nginx only proxies /trackmyweek/* to port 3001 after portal auth).
 */
module.exports = {
  apps: [
    {
      name: 'trackmyweek',
      script: './server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
    },
  ],
};
