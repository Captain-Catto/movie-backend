module.exports = {
  apps: [
    {
      name: 'movie-backend',
      script: './dist/main.js',
      instances: 1, // TEMP: Single instance for WebSocket (needs sticky sessions for cluster)
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
        FRONTEND_URL: 'https://movie.lequangtridat.com',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
