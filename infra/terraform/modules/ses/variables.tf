variable "domain_name" { type = string }
variable "route53_zone_id" { type = string }
variable "mail_from_subdomain" {
  description = "Subdomain for MAIL FROM (usually 'mail')"
  type        = string
  default     = "mail"
}