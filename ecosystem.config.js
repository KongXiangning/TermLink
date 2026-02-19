// pm2 Ecosystem Configuration for TermLink Server (Windows)
// Usage: pm2 start ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'termlink',
            script: 'src/server.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',        // fork mode required for node-pty
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production'
            },
            // Log management
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/termlink-error.log',
            out_file: './logs/termlink-out.log',
            merge_logs: true,
            // Restart policy
            autorestart: true,
            max_restarts: 20,
            min_uptime: '10s',
            restart_delay: 3000
        }
    ]
};
