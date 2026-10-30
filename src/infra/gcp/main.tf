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

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

resource "google_project_service" "required" {
  for_each           = toset(["compute.googleapis.com", "iam.googleapis.com", "iap.googleapis.com"])
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

output "public_ip" {
  description = "Point your domain's A record to this address."
  value       = google_compute_address.todoapp.address
}

output "ssh_command" {
  value = "gcloud compute ssh todoapp --project=${var.project_id} --zone=${var.zone} --tunnel-through-iap"
}
