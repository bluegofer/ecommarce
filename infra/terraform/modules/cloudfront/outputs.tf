# CloudFront module outputs — conditional (count-based resource)
# When enable_cloudfront = false → outputs return empty string

output "media_domain" {
  description = "CloudFront media distribution domain (empty if disabled)"
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.media[0].domain_name : ""
}

output "media_distribution_id" {
  description = "CloudFront media distribution ID (empty if disabled)"
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.media[0].id : ""
}

output "storefront_domain" {
  description = "CloudFront storefront domain (not yet provisioned — empty)"
  value       = ""
}