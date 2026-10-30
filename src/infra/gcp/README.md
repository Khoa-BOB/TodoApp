# Deploy TodoApp on GCP with OpenTofu

This provisions one Ubuntu VM, a static public IP, a dedicated VPC/subnet,
HTTP/HTTPS firewall rules, and SSH access through Identity-Aware Proxy (IAP).
The startup script installs Docker Engine and Compose from Docker's apt repository.
The app runs using `src/compose.prod.yaml`: Caddy serves React over HTTPS and
proxies `/api/*` to the .NET API. SQLite and Caddy certificates use Docker volumes
on the VM's persistent boot disk. This is a single-instance deployment.
The API accepts forwarded HTTPS headers so secure CSRF cookies work behind Caddy;
keep its port unpublished and only attach trusted services to the Compose network.

## Provision infrastructure

Install OpenTofu and the Google Cloud CLI. Use an existing GCP project with billing
enabled. Your provisioning account needs permission to enable APIs, manage Compute
Engine resources, create service accounts, and act as the VM service account.
For SSH/SCP, it also needs `roles/iap.tunnelResourceAccessor`,
`roles/compute.osAdminLogin`, and `roles/iam.serviceAccountUser` on the VM service
account (or equivalent permissions). The VM service account receives no project
IAM roles. See [IAP TCP forwarding](https://cloud.google.com/iap/docs/using-tcp-forwarding)
and [OS Login permissions](https://cloud.google.com/compute/docs/oslogin/set-up-oslogin).

The configured `e2-micro` has limited memory. If image builds are killed for lack
of memory, use `e2-medium` during builds or build images on a larger machine.
Changing the VM machine type requires stopping it; set
`allow_stopping_for_update = true` on the instance before applying that change.

From `src/infra/gcp`:

```sh
gcloud auth login
gcloud auth application-default login
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project ID and matching region/zone.
tofu init
tofu fmt -check
tofu validate
tofu plan -out=deploy.tfplan
tofu apply deploy.tfplan
tofu output -raw public_ip
```

These resources incur charges. State, plans, and local `.tfvars` are ignored by
Git; keep state private and backed up. Commit `.terraform.lock.hcl` to retain the
provider version and checksums. No application secrets are passed through OpenTofu.

Create a DNS **A** record for your hostname (for example `todo.example.com`)
pointing to `public_ip`. Remove any conflicting AAAA record unless you configure
IPv6 separately. Caddy obtains a certificate once DNS resolves to the VM and
ports 80/443 are reachable.

## Upload the app

On your computer, set these values to match `terraform.tfvars`:

```sh
export GCP_PROJECT="your-project-id"
export GCP_ZONE="us-central1-a"
```

From `src`, package the current source (including uncommitted changes) without
local secrets, databases, dependencies, build output, or infrastructure state:

```sh
tar --exclude='.git' --exclude='.env' --exclude='.env.*' \
  --exclude='*.db' --exclude='*.db-*' --exclude='node_modules' \
  --exclude='dist' --exclude='bin' --exclude='obj' --exclude='infra' \
  -czf /tmp/todoapp-src.tar.gz .

gcloud compute scp /tmp/todoapp-src.tar.gz todoapp:~/todoapp-src.tar.gz \
  --project="$GCP_PROJECT" --zone="$GCP_ZONE" --tunnel-through-iap

gcloud compute ssh todoapp \
  --project="$GCP_PROJECT" --zone="$GCP_ZONE" --tunnel-through-iap
```

On the VM, check that the startup script finished successfully. If Docker is not
ready yet, inspect the journal and wait for startup to finish before continuing:

```sh
sudo journalctl -u google-startup-scripts.service --no-pager -n 60
sudo docker compose version
sudo tar -xzf ~/todoapp-src.tar.gz -C /opt/todoapp
cd /opt/todoapp
```

Generate the signing key **once** on the VM. Replace the hostname below before
running. The command refuses to overwrite an existing `.env`:

```sh
sudo bash -c 'umask 077; set -o noclobber; printf "DOMAIN=todo.example.com\nJWT_KEY=%s\n" "$(openssl rand -hex 32)" > .env'
sudo docker compose -f compose.prod.yaml config --quiet
sudo docker compose -f compose.prod.yaml up -d --build
sudo docker compose -f compose.prod.yaml ps
sudo docker compose -f compose.prod.yaml logs --tail=100
```

Open `https://todo.example.com` and register an account. Production does not seed
the development administrator. Check `/api/auth/csrf` returns a token, then sign
in, create a task, refresh, and restart the containers to verify persistence:

```sh
curl -f https://todo.example.com/api/auth/csrf
sudo docker compose -f compose.prod.yaml restart
```

## Updates and data safety

Upload and extract updated source using the same commands, then run
`sudo docker compose -f compose.prod.yaml up -d --build` in `/opt/todoapp`.
The archive excludes `.env`, so the signing key survives updates.

Production applies EF migrations before accepting requests. Use a fresh production
database for the first deployment; an old Development database created with
`EnsureCreated()` has no migration history and needs a separate migration plan.
Back up before releases that change the database schema. Startup migrations are
intended for this one API instance; move migrations to a deployment job before
running multiple instances.

Never run `docker compose down -v`: it deletes the database and certificate
volumes. Stop the app before taking a consistent GCP disk snapshot, then restart
it. Keep independent backups and test restoring them.

OpenTofu `prevent_destroy` blocks deleting/replacing the VM while the resource is
in this configuration. Startup script edits use metadata and take effect at the
next VM boot; they do not replace the VM. The boot disk is also retained on VM
deletion. These settings do not replace backups or protect against manual disk
deletion. To intentionally remove infrastructure, back up first, remove the
`prevent_destroy` guard, review the plan, and delete any retained disks separately
only when their data is no longer needed.
