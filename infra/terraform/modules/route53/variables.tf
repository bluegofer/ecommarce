variable "domain_name" {
  description = "Primary domain (e.g., nolimitshopping.com)"
  type        = string
}

variable "cloudfront_storefront_domain" {
  description = "CloudFront domain for storefront distribution"
  type        = string
  default     = ""
}

variable "cloudfront_media_domain" {
  description = "CloudFront domain for media distribution"
  type        = string
  default     = ""
}

variable "alb_dns_name" {
  description = "ALB DNS name for api/admin subdomains"
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID (for alias records)"
  type        = string
  default     = ""
}

variable "create_records" {
  description = "Create DNS records (set false if ACM validation only)"
  type        = bool
  default     = false
}