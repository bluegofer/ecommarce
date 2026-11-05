variable "project" { type = string }
variable "environment" { type = string }
variable "domain_name" { type = string }
variable "certificate_arn" {
  description = "ACM cert ARN in us-east-1 (for CloudFront)"
  type        = string
  default     = ""
}
variable "media_bucket_domain" {
  description = "S3 media bucket regional domain"
  type        = string
}
variable "alb_dns_name" {
  description = "ALB DNS for dynamic origins (api/admin)"
  type        = string
  default     = ""
}
variable "origin_secret" {
  description = "Secret for CloudFront → ALB custom header"
  type        = string
  sensitive   = true
  default     = "change-me-later"
}
variable "enable_storefront" {
  description = "Create storefront CloudFront distribution (needs ALB origin)"
  type        = bool
  default     = true
}