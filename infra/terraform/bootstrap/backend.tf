terraform {
  required_version = ">= 1.9.0"
  backend "s3" {
    bucket       = "bluegofer-terraform-state-390630836942-ap-south-1-an"
    key          = "bootstrap/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.60" }
  }
}