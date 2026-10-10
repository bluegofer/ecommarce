variable "domain_name" { type = string }
variable "route53_zone_id" {
  description = "Route 53 zone ID for DNS validation"
  type        = string
}
variable "aws_region" {
  description = "Region (for context; ACM for CloudFront must be us-east-1)"
  type        = string
  default     = "ap-south-1"
}