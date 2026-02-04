# Deployment Guide - Collab App

This guide explains how to deploy your P2P Collaboration App. Because of the **Universal Connectivity** architecture, you have two deployment options:

1.  **Serverless (Recommended)**: Deploy only the Frontend. The app uses public P2P nodes.
2.  **Custom Infrastructure**: Deploy Frontend + Your Own Relay Server (for higher performance).

---

## 🚀 Option 1: Serverless (Easiest)

**Ideal for:** MVP, Demos, Hackathons.
**Backend:** None (Uses Protocol Labs' public generic relays).

### 1. Frontend Deployment (Vercel/Netlify)
This app is a standard Next.js application.

1.  **Push your code** to GitHub/GitLab.
2.  **Import Project** into [Vercel](https://vercel.com/new).
    -   **Framework Preset**: Next.js
    -   **Build Command**: `next build`
    -   **Install Command**: `bun install` (or `npm install`)
3.  **Deploy**.

### How it works
Your `lib/p2p/node.ts` detects it is running in Production (`NODE_ENV !== 'development'`) and **automatically** switches connection logic:
-   **Local**: Connects to `127.0.0.1:9090` (Your local relay).
-   **Production**: Connects to `bootstrap.libp2p.io` (Public nodes).

**✅ Done!** Your app is live.

---

## ⚡ Option 2: Custom Relay (High Performance)

**Ideal for:** Production apps, private networks, faster connection times.
**Backend:** You host the `server/relay.ts` on a cloud provider.

### Why do this?
Public nodes can be slow or rate-limited. Running your own Relay guarantees your users can always find each other instantly, just like in local dev.

### 1. Prepare the Relay
You need a server (VPS) with a public IP (DigitalOcean, AWS, Railway, etc.).

1.  **Create a Dockerfile** in your project root:
    ```dockerfile
    # Simple Dockerfile for the Relay
    FROM oven/bun:1
    WORKDIR /app
    COPY package.json bun.lockb ./
    RUN bun install --production
    COPY server/relay.ts ./server/
    COPY peer-id.json ./
    
    # Expose the Relay Port
    EXPOSE 9090
    
    CMD ["bun", "run", "server/relay.ts"]
    ```

### 2. Deploy to Cloud (e.g., Railway/Fly.io)
1.  **Push** the Dockerfile to your repo.
2.  Connect your repo to [Railway](https://railway.app/).
3.  Railway will detect the Dockerfile and build it.
4.  **Important**: You will get a Public Domain (e.g., `my-relay.up.railway.app`).

### 3. Update Frontend Config
Once your Relay is live, update your `lib/p2p/node.ts` to use *your* relay instead of the public ones.

```typescript
// lib/p2p/node.ts

const PRODUCTION_RELAY = '/dns4/my-relay.up.railway.app/tcp/443/wss/p2p/12D3...' 

const bootstrapList = process.env.NODE_ENV === 'development' 
    ? [LOCAL_RELAY] 
    : [PRODUCTION_RELAY, ...PUBLIC_BOOTSTRAP] // Prioritize your relay
```

---

## 🌐 IPFS Deployment (Optional)

Since the frontend is just static assets (mostly), you can deploy to IPFS using Fleek.

1.  **Build Static Export**:
    Update `next.config.ts`:
    ```ts
    const nextConfig = {
      output: 'export',  // Enables static HTML export
      images: { unoptimized: true } // Required for IPFS
    }
    ```
2.  Run `bun run build`.
3.  Upload the `out/` folder to IPFS (via Fleek, Pinata, or IPFS Desktop).

*Note: Next.js SSR features (API Routes) won't work on IPFS, but the P2P client logic WILL work!*
