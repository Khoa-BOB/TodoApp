#!/bin/bash

tar --exclude='.git' --exclude='.env' --exclude='.env.*' \
  --exclude='*.db' --exclude='*.db-*' --exclude='node_modules' \
  --exclude='dist' --exclude='bin' --exclude='obj' --exclude='infra' \
  -czf /tmp/todoapp-src.tar.gz .

gcloud compute scp /tmp/todoapp-src.tar.gz todoapp:~/todoapp-src.tar.gz \
  --project="$GCP_PROJECT" --zone="$GCP_ZONE" --tunnel-through-iap

gcloud compute ssh todoapp \
  --project="$GCP_PROJECT" --zone="$GCP_ZONE" --tunnel-through-iap