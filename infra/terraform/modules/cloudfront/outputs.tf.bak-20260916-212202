output "storefront_domain" {
  value = var.enable_storefront ? aws_cloudfront_distribution.storefront[0].domain_name : ""
}
output "storefront_distribution_id" {
  value = var.enable_storefront ? aws_cloudfront_distribution.storefront[0].id : ""
}
output "media_domain" { value = aws_cloudfront_distribution.media.domain_name }
output "media_distribution_id" { value = aws_cloudfront_distribution.media.id }
output "media_oac_id" { value = aws_cloudfront_origin_access_control.media.id }