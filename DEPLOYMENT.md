# LocalDrop — Deployment Guide

This guide details how to deploy LocalDrop in production environments, covering **Vercel** (frontend), **Render** (all-in-one or signaling only), and **VPS** (Docker/PM2 with Nginx).

---

## 📦 Deployment Options Summary

| Platform | Type | WebSockets (Socket.IO) | Recommendation |
| :--- | :--- | :--- | :--- |
| **Render** | All-in-one Node web service | Yes (Native support) | **Highly Recommended** (Easiest setup) |
| **VPS (Ubuntu/Debian)** | Manual Docker/PM2 + Nginx | Yes (Configured via reverse proxy) | **Highly Recommended** (Full network control) |
| **Vercel** | Static frontend hosting | No (Serverless functions block WebSockets) | **Frontend Only** (Requires external backend) |

---

## 🚀 1. Deploying on Render (Recommended)

Render is the simplest way to deploy LocalDrop because it natively supports persistent WebSocket connections (Socket.IO) and multi-stage Docker builds out-of-the-box.

### Option A: Docker Deployment (All-in-One)
Since the codebase contains a ready-to-run multi-stage [Dockerfile](file:///c:/Users/USER/OneDrive/Desktop/pairdrop/Dockerfile), you can deploy the entire app in one click.

1. Create a new account or log in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the LocalDrop project.
4. Configure the service settings:
   * **Name**: `localdrop`
   * **Region**: Choose the closest region to your users.
   * **Branch**: `main`
   * **Runtime**: `Docker`
5. Click **Advanced** to add environment variables:
   * `PORT`: `3000`
   * `NODE_ENV`: `production`
6. Click **Create Web Service**. Render will automatically build the client using Vite, compile the TypeScript server, bundle everything, and spin it up on your public `.onrender.com` URL.

### Option B: Node.js Web Service (Manual Build)
If you prefer to run it using the Node runtime:
1. Create a **Web Service** on Render.
2. Select **Runtime**: `Node`.
3. Set the following commands:
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm run start`
4. Set environment variables:
   * `NODE_ENV`: `production`

---

## ⚡ 2. Deploying on Vercel (Frontend Only)

Vercel is built for static sites and serverless execution. Because serverless functions have execution limits and cannot maintain stateful TCP connections, **WebSockets (Socket.IO) are not natively supported on Vercel**.

To deploy on Vercel, you must host the **client** on Vercel and the **signaling server** on another host (e.g., Render or a VPS).

### Step 1: Deploy the Signaling Server
Deploy the server workspace (`server/` directory) to Render or a VPS on a public URL (e.g., `https://localdrop-server.onrender.com`).

### Step 2: Configure Client to point to Server
Modify the client's environment variables to point to your deployed signaling backend:
1. Create a `.env.production` file in your client workspace or set the environment variable in Vercel:
   ```env
   VITE_WS_URL=https://localdrop-server.onrender.com
   ```
2. Make sure the socket initialization imports this URL when connecting in [socket.ts](file:///c:/Users/USER/OneDrive/Desktop/pairdrop/client/src/services/socket.ts):
   ```typescript
   const url = import.meta.env.PROD 
     ? (import.meta.env.VITE_WS_URL || window.location.origin) 
     : '';
   ```

### Step 3: Deploy to Vercel
1. Install the Vercel CLI or link your repository at [Vercel](https://vercel.com).
2. Set the root directory of the Vercel project to `client`.
3. Configure Vercel build settings:
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Deploy the project. The static client is now hosted on Vercel's global CDN and connects to your external signaling server.

---

## 🖥 3. Deploying on a VPS (Virtual Private Server)

Deploying on a VPS (like DigitalOcean, Linode, AWS EC2, or Hetzner) gives you full control and is ideal for self-hosting on home servers or private networks.

### Option A: Using Docker Compose (Recommended)
This uses the pre-configured [docker-compose.yml](file:///c:/Users/USER/OneDrive/Desktop/pairdrop/docker-compose.yml).

1. SSH into your VPS:
   ```bash
   ssh user@your-vps-ip
   ```
2. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/yourusername/pairdrop.git localdrop
   cd localdrop
   ```
3. Run the service in the background:
   ```bash
   docker compose up -d --build
   ```
4. Verify the container is running:
   ```bash
   docker compose ps
   ```

### Option B: Using PM2 (Process Manager)
To run LocalDrop natively on Node.js:

1. Install Node.js (version 18+) and PM2 globally on your VPS:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm
   sudo npm install -y -g pm2
   ```
2. Clone and build the project:
   ```bash
   git clone https://github.com/yourusername/pairdrop.git localdrop
   cd localdrop
   npm install
   npm run build
   ```
3. Start the signaling server using PM2:
   ```bash
   pm2 start server/dist/index.js --name localdrop-server
   ```
4. Setup PM2 startup scripts to launch on server reboots:
   ```bash
   pm2 startup
   pm2 save
   ```

---

## 🔒 4. Configuring Nginx Reverse Proxy with SSL (VPS)

WebRTC and clipboard sharing APIs **require a secure connection (HTTPS)** to work in modern mobile and desktop browsers (except when testing on `localhost`).

Use Nginx and Let's Encrypt to configure SSL and forward requests to your LocalDrop container/service (running on port `3000`).

### Step 1: Install Nginx and Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Configure Nginx Server Block
Create a new configuration file `/etc/nginx/sites-available/localdrop`:
```nginx
server {
    listen 80;
    server_name localdrop.yourdomain.com; # Replace with your domain name

    location / {
        proxy_pass http://127.0.0.1:3000; # Forward requests to Node.js app
        proxy_http_version 1.1;
        
        # Enable WebSockets forwarding
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebRTC timeouts extensions
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/localdrop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Obtain SSL Certificate
Run Certbot to fetch and configure the Let's Encrypt SSL certificate automatically:
```bash
sudo certbot --nginx -d localdrop.yourdomain.com
```
Follow the prompts. Nginx will now automatically redirect all HTTP traffic to secure HTTPS, satisfying WebRTC security checks!
