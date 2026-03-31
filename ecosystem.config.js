module.exports = {
  apps: [
    {
      name: 'cerebro-ui',
      script: 'npm',
      args: 'run start',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
