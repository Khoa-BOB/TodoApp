terraform {
  required_version = ">= 1.8.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

variable "project_id" {
  description = "Existing GCP project with billing enabled."
  type        = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  description = "A zone in the selected region."
  type        = string
  default     = "us-central1-a"
}

variable "github_repo" {
  description = "GitHub repository (owner/name) allowed to deploy to the VM."
  type        = string
  default     = "Khoa-BOB/TodoApp"
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

resource "google_project_service" "required" {
  for_each = toset([
    "compute.googleapis.com", "iam.googleapis.com", "iap.googleapis.com",
    # GitHub Actions login (Workload Identity Federation) and OS Login SSH.
    "iamcredentials.googleapis.com", "sts.googleapis.com", "oslogin.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

resource "google_compute_network" "todoapp" {
  name                    = "todoapp"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.required["compute.googleapis.com"]]
}

resource "google_compute_subnetwork" "todoapp" {
  name          = "todoapp"
  ip_cidr_range = "10.10.0.0/24"
  network       = google_compute_network.todoapp.id
}

resource "google_compute_address" "todoapp" {
  name       = "todoapp"
  depends_on = [google_project_service.required["compute.googleapis.com"]]
}

resource "google_compute_firewall" "web" {
  name          = "todoapp-web"
  network       = google_compute_network.todoapp.id
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["todoapp"]

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
}

resource "google_compute_firewall" "ssh" {
  name          = "todoapp-iap-ssh"
  network       = google_compute_network.todoapp.id
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["todoapp"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

# Docker uses public package registries; the VM needs no project IAM roles.
resource "google_service_account" "todoapp" {
  account_id   = "todoapp-vm"
  display_name = "TodoApp VM"
  depends_on   = [google_project_service.required["iam.googleapis.com"]]
}

resource "google_compute_instance" "todoapp" {
  name         = "todoapp"
  machine_type = "e2-micro"
  tags         = ["todoapp"]

  boot_disk {
    auto_delete = false
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2404-lts-amd64"
      size  = 30
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.todoapp.id
    access_config {
      nat_ip = google_compute_address.todoapp.address
    }
  }

  service_account {
    email  = google_service_account.todoapp.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin         = "TRUE"
    block-project-ssh-keys = "TRUE"
    startup-script         = file("${path.module}/startup.sh")
  }

  lifecycle {
    prevent_destroy = false
  }
}

# --- GitHub Actions deploy access ---------------------------------------------
# GitHub proves its identity to GCP with a short-lived OIDC token, so no
# service account key is ever stored in GitHub. Only pushes to main of
# var.github_repo can use it.
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  depends_on                = [google_project_service.required["iam.googleapis.com"]]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = "assertion.repository == '${var.github_repo}' && assertion.ref == 'refs/heads/main'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "deployer" {
  account_id   = "todoapp-deployer"
  display_name = "TodoApp GitHub deployer"
  depends_on   = [google_project_service.required["iam.googleapis.com"]]
}

# Let the GitHub repository act as the deployer service account.
resource "google_service_account_iam_member" "deployer_github" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

# What the deployer may do: look up the VM, tunnel SSH through IAP, and log in
# with sudo (needed for docker). Same permissions the README lists for humans.
resource "google_project_iam_member" "deployer_viewer" {
  project = var.project_id
  role    = "roles/compute.viewer"
  member  = google_service_account.deployer.member
}

resource "google_compute_instance_iam_member" "deployer_login" {
  instance_name = google_compute_instance.todoapp.name
  role          = "roles/compute.osAdminLogin"
  member        = google_service_account.deployer.member
}

resource "google_iap_tunnel_instance_iam_member" "deployer_tunnel" {
  instance = google_compute_instance.todoapp.name
  role     = "roles/iap.tunnelResourceAccessor"
  member   = google_service_account.deployer.member
}

resource "google_service_account_iam_member" "deployer_vm_sa" {
  service_account_id = google_service_account.todoapp.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.deployer.member
}

output "public_ip" {
  description = "Point your domain's A record to this address."
  value       = google_compute_address.todoapp.address
}

output "ssh_command" {
  value = "gcloud compute ssh todoapp --project=${var.project_id} --zone=${var.zone} --tunnel-through-iap"
}

output "github_workload_identity_provider" {
  description = "GitHub secret GCP_WORKLOAD_IDENTITY_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_service_account" {
  description = "GitHub secret GCP_SERVICE_ACCOUNT."
  value       = google_service_account.deployer.email
}
