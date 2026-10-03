variable "project" { type = string }
variable "environment" { type = string }
variable "rate_limit_per_ip" {
  description = "Requests allowed per 5-min window per IP"
  type        = number
  default     = 2000
}