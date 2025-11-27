#!/bin/bash
# Script to purge Cloudflare cache for webpack chunks
# This fixes the RSC hydration issue caused by cached webpack files
#
# Usage:
#   CF_API_TOKEN=your_token CF_ZONE_ID=your_zone_id ./purge-cloudflare-cache.sh
#
# To get these values:
# 1. CF_API_TOKEN: Cloudflare Dashboard > My Profile > API Tokens > Create Token
#    - Use "Edit zone DNS" template or custom with Cache Purge permission
# 2. CF_ZONE_ID: Cloudflare Dashboard > Your Site > Overview > Zone ID (right sidebar)

set -e

if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ZONE_ID" ]; then
    echo "Error: CF_API_TOKEN and CF_ZONE_ID environment variables are required"
    echo ""
    echo "Usage:"
    echo "  CF_API_TOKEN=your_token CF_ZONE_ID=your_zone_id $0"
    echo ""
    echo "Or set them in your .env file and run:"
    echo "  source .env && $0"
    exit 1
fi

DOMAIN=${CF_DOMAIN:-"incepta.nullbytes.app"}

echo "Purging Cloudflare cache for webpack chunks on $DOMAIN..."

# Purge webpack and main-app chunks
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
     -H "Authorization: Bearer $CF_API_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{
       "files": [
         "https://'"$DOMAIN"'/_next/static/chunks/webpack-337c8af61f851e77.js",
         "https://'"$DOMAIN"'/_next/static/chunks/main-app-337c8af61f851e77.js"
       ]
     }' | jq .

echo ""
echo "If specific files are unknown, purge everything:"

# Option to purge everything
read -p "Do you want to purge ALL cache? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
         -H "Authorization: Bearer $CF_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"purge_everything":true}' | jq .
    echo "Full cache purge requested."
fi

echo ""
echo "Cache purge complete. Wait 30 seconds then test: https://$DOMAIN/dashboard"
