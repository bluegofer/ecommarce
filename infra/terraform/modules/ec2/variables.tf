variable "project" { type = string }
variable "environment" { type = string }
variable "public_subnet_id" {
  description = "Public subnet ID (internet-facing, for SSM without NAT)"
  type        = string
}
variable "app_sg_id" { type = string }
variable "instance_type" {
  type    = string
  default = "t3.medium"
}
variable "key_name" {
  description = "EC2 key pair name for SSH"
  type        = string
  default     = ""
}
variable "root_volume_size_gb" {
  type    = number
  default = 30
}
variable "ecr_registry" {
  description = "ECR registry URL for app images"
  type        = string
  default     = ""
}
variable "github_repo" {
  description = "GitHub repo (owner/name) for reference"
  type        = string
  default     = "bluegofer/ecommarce"
}
