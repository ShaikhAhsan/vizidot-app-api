#!/usr/bin/env node
/**
 * Resolve DB_HOST to a numeric IP using public DNS (Google 8.8.8.8).
 * Use this when your DB hostname resolves to 127.0.0.1/127.0.1.1 inside Docker/Coolify.
 *
 * Run: node scripts/resolve-db-host.js
 * Or:  DB_HOST=srv1149167.hstgr.cloud node scripts/resolve-db-host.js
 *
 * Then set DB_HOST_IP=<printed IP> in your deployment environment (e.g. Coolify).
 */

const dns = require('dns').promises;
const host = process.env.DB_HOST || 'srv1149167.hstgr.cloud';

async function main() {
  try {
    // Use Google DNS so we get the public IP, not container loopback
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    const addresses = await dns.resolve4(host);
    const ip = addresses && addresses[0];
    if (ip) {
      console.log(ip);
      console.error('Set in Coolify (Environment): DB_HOST_IP=' + ip);
    } else {
      console.error('No A record for', host);
      process.exit(1);
    }
  } catch (e) {
    console.error('Resolve failed:', e.message);
    process.exit(1);
  }
}

main();
