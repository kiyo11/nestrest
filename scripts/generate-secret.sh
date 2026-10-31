#!/bin/bash

# Script to generate a secure random secret for NEXTAUTH_SECRET

echo "Generating secure random secret..."
secret=$(openssl rand -base64 32)

echo ""
echo "Your new NEXTAUTH_SECRET is:"
echo "$secret"
echo ""
echo "Add this to your apps/web/.env.local file:"
echo 'NEXTAUTH_SECRET="'"$secret"'"'
echo ""
