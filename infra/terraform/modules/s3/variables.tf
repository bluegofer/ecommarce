variable "project" { type = string }
variable "environment" { type = string }
variable "account_id" { type = string }
variable "aws_region" { type = string }
variable "media_bucket_suffix" {
  description = "Unique suffix for media bucket (usually account ID)"
  type        = string
}