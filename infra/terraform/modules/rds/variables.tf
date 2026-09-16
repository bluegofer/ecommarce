variable "project" {
  description = "Project name for tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for RDS subnet group"
  type        = list(string)
}

variable "rds_sg_id" {
  description = "Security group ID for RDS"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "bluegofer"
}

variable "db_username" {
  description = "Master username"
  type        = string
  default     = "bluegofer_admin"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage_gb" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "multi_az" {
  description = "Enable Multi-AZ (production: true, staging: false)"
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Automated backup retention period"
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "Prevent accidental deletion (production: true)"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on destroy (staging: true, production: false)"
  type        = bool
  default     = true
}