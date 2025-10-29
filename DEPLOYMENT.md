# 🚀 Production Deployment Guide - Movie Backend

Complete guide to deploy NestJS backend + PostgreSQL to VPS.

## 📋 Prerequisites

- VPS with Ubuntu 20.04/22.04 (Recommended: 2GB RAM minimum)
- Domain name (optional but recommended)
- Root or sudo access to VPS

---

## 🔧 Part 1: VPS Initial Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x.x
npm --version
```

### 1.3 Install PostgreSQL 15
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

### 1.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 1.5 Install Nginx (Reverse Proxy)
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.6 Install Git
```bash
sudo apt install -y git
```

---

## 🗄️ Part 2: PostgreSQL Database Setup

### 2.1 Create Database and User
```bash
sudo -u postgres psql
```

Inside PostgreSQL prompt:
```sql
-- Create database
CREATE DATABASE movie_db;

-- Create user with password
CREATE USER movie_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE movie_db TO movie_user;

-- For PostgreSQL 15+, grant schema privileges
\c movie_db
GRANT ALL ON SCHEMA public TO movie_user;

-- Exit
\q
```

### 2.2 Configure PostgreSQL for Network Access (if needed)
```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```
Find and update:
```
listen_addresses = 'localhost'  # Keep localhost for security
```

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```
Add:
```
# IPv4 local connections:
host    movie_db    movie_user    127.0.0.1/32    md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 2.3 Test Database Connection
```bash
psql -h localhost -U movie_user -d movie_db
# Enter password when prompted
# Type \q to exit
```

---

## 📦 Part 3: Deploy Backend Application

### 3.1 Create Application Directory
```bash
sudo mkdir -p /var/www/movie-backend
sudo chown -R $USER:$USER /var/www/movie-backend
cd /var/www/movie-backend
```

### 3.2 Clone or Upload Your Code

**Option A: Using Git (Recommended)**
```bash
git clone https://github.com/yourusername/movie-backend.git .
```

**Option B: Using SCP from local machine**
```bash
# On your local machine (Windows)
scp -r e:\movie\movie-backend/* user@your-vps-ip:/var/www/movie-backend/
```

### 3.3 Setup Environment Variables
```bash
cd /var/www/movie-backend
cp .env.production.example .env.production
nano .env.production
```

Update the following critical values:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=movie_user
DB_PASSWORD=your_strong_password_here  # The password you created in step 2.1
DB_DATABASE=movie_db
DB_SYNCHRONIZE=false  # IMPORTANT!

JWT_SECRET=generate_a_random_64_character_string_here
JWT_REFRESH_SECRET=generate_another_random_64_character_string_here

TMDB_API_KEY=your_tmdb_api_key

CORS_ORIGIN=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

### 3.4 Install Dependencies and Build
```bash
npm install
npm run build
```

### 3.5 Run Database Migrations (First time only)
```bash
# If DB_SYNCHRONIZE=true in .env.production
node dist/main.js  # Start once to create tables
# Ctrl+C to stop

# Then set DB_SYNCHRONIZE=false for production
nano .env.production  # Change DB_SYNCHRONIZE to false
```

### 3.6 Start Application with PM2
```bash
chmod +x deploy.sh
./deploy.sh
```

Or manually:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 3.7 Check Application Status
```bash
pm2 status
pm2 logs movie-backend
curl http://localhost:8080/api/health  # Test if backend is running
```

---

## 🌐 Part 4: Nginx Reverse Proxy Setup

### 4.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/movie-backend
```

Paste the following configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Change to your domain

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket support
        proxy_read_timeout 86400;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/movie-backend-access.log;
    error_log /var/log/nginx/movie-backend-error.log;
}
```

### 4.2 Enable Site and Test
```bash
sudo ln -s /etc/nginx/sites-available/movie-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3 Test External Access
```bash
curl http://api.yourdomain.com/api/health
# Or from browser: http://api.yourdomain.com/api/health
```

---

## 🔒 Part 5: SSL Certificate (HTTPS)

### 5.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d api.yourdomain.com
```

Follow the prompts:
- Enter email
- Agree to terms
- Choose redirect HTTP to HTTPS (option 2)

### 5.3 Auto-renewal Test
```bash
sudo certbot renew --dry-run
```

---

## 🔄 Part 6: Continuous Deployment

### 6.1 Update Deployment Script
```bash
cd /var/www/movie-backend
nano update.sh
```

```bash
#!/bin/bash
echo "🔄 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm ci --production

echo "🔨 Building..."
npm run build

echo "♻️ Reloading PM2..."
pm2 reload ecosystem.config.js --env production

echo "✅ Update complete!"
pm2 logs movie-backend --lines 50
```

Make executable:
```bash
chmod +x update.sh
```

### 6.2 Quick Update Command
```bash
./update.sh
```

---

## 📊 Part 7: Monitoring & Maintenance

### 7.1 View Logs
```bash
# PM2 logs
pm2 logs movie-backend
pm2 logs movie-backend --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/movie-backend-access.log
sudo tail -f /var/log/nginx/movie-backend-error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### 7.2 PM2 Commands
```bash
pm2 status              # Check status
pm2 restart movie-backend   # Restart
pm2 stop movie-backend      # Stop
pm2 delete movie-backend    # Remove from PM2
pm2 monit              # Real-time monitoring
```

### 7.3 Database Backup
```bash
# Create backup script
nano ~/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo mkdir -p $BACKUP_DIR
sudo -u postgres pg_dump movie_db > $BACKUP_DIR/movie_db_$TIMESTAMP.sql
echo "✅ Backup created: movie_db_$TIMESTAMP.sql"
```

```bash
chmod +x ~/backup-db.sh
```

### 7.4 Setup Automated Backups (Cron)
```bash
crontab -e
```

Add daily backup at 2 AM:
```
0 2 * * * /home/your-username/backup-db.sh
```

---

## 🔥 Part 8: Firewall Configuration

### 8.1 Setup UFW
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## ✅ Part 9: Final Checklist

- [ ] PostgreSQL running and accessible
- [ ] Database created with correct user/password
- [ ] Backend code deployed to `/var/www/movie-backend`
- [ ] `.env.production` configured correctly
- [ ] Application built successfully (`npm run build`)
- [ ] PM2 running application (`pm2 status`)
- [ ] Nginx configured and running
- [ ] SSL certificate installed (HTTPS working)
- [ ] Firewall configured
- [ ] Database backups scheduled
- [ ] Application accessible at `https://api.yourdomain.com`

---

## 🆘 Troubleshooting

### Backend not starting
```bash
pm2 logs movie-backend
# Check for errors in logs
```

### Database connection error
```bash
# Test database connection
psql -h localhost -U movie_user -d movie_db

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Nginx 502 Bad Gateway
```bash
# Check if backend is running
curl http://localhost:8080/api/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Port already in use
```bash
# Find what's using port 8080
sudo lsof -i :8080
sudo kill -9 <PID>
```

---

## 📞 Support

If you encounter issues:
1. Check logs: `pm2 logs movie-backend`
2. Verify environment variables: `cat .env.production`
3. Test database connection
4. Check Nginx configuration: `sudo nginx -t`

---

## 🎉 Success!

Your backend should now be live at: `https://api.yourdomain.com`

Test endpoints:
- Health check: `https://api.yourdomain.com/api/health`
- API docs: `https://api.yourdomain.com/api`
