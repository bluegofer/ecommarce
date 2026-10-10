variable "project" {
  description = "Project name for tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where security groups will be created"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into app instances (your home/office IP/32)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_port" {
  description = "Application port (NestJS API)"
  type        = number
  default     = 4000
}

variable "storefront_port" {
  description = "Storefront port (Next.js)"
  type        = number
  default     = 3000
}

variable "admin_port" {
  description = "Admin port (Next.js)"
  type        = number
  default     = 3001
}