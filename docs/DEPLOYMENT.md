# Production Deployment Guide - Movie Backend

Complete guide to deploy NestJS backend + PostgreSQL to VPS.

## Prerequisites

- VPS with Ubuntu 20.04/22.04 (Recommended: 2GB RAM minimum)
- Domain name (optional but recommended)
- Root or sudo access to VPS

---

## Part 1: VPS Initial Setup

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

## Part 2: PostgreSQL Database Setup

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

Alternative: run bundled SQL script

```bash
sudo -u postgres psql -f scripts/db/setup-database.sql
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

If you hit permissions errors later, you can re-apply permissions:

```bash
sudo -u postgres psql -f scripts/db/fix-db-permissions.sql
```

### 2.3 Test Database Connection
```bash
psql -h localhost -U movie_user -d movie_db
# Enter password when prompted
# Type \q to exit
```

---

## Part 3: Deploy Backend Application

### 3.1 Create Application Directory
```bash
sudo mkdir -p /var/www/movie-backend
sudo chown -R $USER:$USER /var/www/movie-backend
cd /var/www/movie-backend
```

### 3.2 Clone or Upload Your Code

Option A: Using Git (Recommended)
```bash
git clone https://github.com/yourusername/movie-backend.git .
```

Option B: Using SCP from local machine
```bash
# On your local machine (Windows)
scp -r e:\\movie\\movie-backend\\* user@your-vps-ip:/var/www/movie-backend/
```

### 3.3 Setup Environment Variables
```bash
cd /var/www/movie-backend
cp .env.production.example .env.production
nano .env.production
```

Update the following critical values:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=movie_user
DATABASE_PASSWORD=your_strong_password_here
DATABASE_NAME=movie_db

TYPEORM_SYNCHRONIZE=false

JWT_SECRET=generate_a_random_64_character_string_here
TMDB_API_KEY=your_tmdb_api_key

# Optional
CORS_ORIGIN=https://yourdomain.com
```

### 3.4 Install Dependencies and Build
```bash
npm install
npm run build
```

### 3.5 Run Database Migrations (First time only)
```bash
npm run migrate
```

### 3.6 Start Application with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 3.7 Check Application Status
```bash
pm2 status
pm2 logs movie-backend
```

---

## Part 4: Nginx Reverse Proxy Setup

### 4.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/movie-backend
```

Paste the following configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

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

        proxy_read_timeout 86400;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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

---

## Part 5: SSL Certificate (HTTPS)

### 5.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d api.yourdomain.com
```

### 5.3 Auto-renewal Test
```bash
sudo certbot renew --dry-run
```

---

## Part 6: Monitoring & Maintenance

### 6.1 View Logs
```bash
pm2 logs movie-backend
sudo tail -f /var/log/nginx/movie-backend-access.log
sudo tail -f /var/log/nginx/movie-backend-error.log
```

---

## Part 7: Final Checklist

- PostgreSQL running and accessible
- Database created with correct user/password
- Backend built successfully (`npm run build`)
- Migrations applied (`npm run migrate`)
- PM2 running application (`pm2 status`)
- Nginx configured and running
- SSL certificate installed (if using HTTPS)
