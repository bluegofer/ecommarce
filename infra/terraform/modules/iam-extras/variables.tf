variable "project" { type = string }
variable "environment" { type = string }
variable "github_org" {
  description = "GitHub org/user name (e.g., musavi-fardin)"
  type        = string
}
variable "github_repo" {
  description = "GitHub repo name (e.g., ecommarce)"
  type        = string
}
variable "create_oidc_provider" {
  description = "Set true only if OIDC provider doesn't exist yet (once per account)"
  type        = bool
  default     = false
}

variable "account_id" {
  description = "AWS account ID (used for globally-unique S3 bucket names)"
  type        = string
}