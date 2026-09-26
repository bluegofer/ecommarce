# WAF module outputs — conditional (count-based resource)
# When enable_waf = false → outputs return empty string

output "web_acl_arn" {
  description = "WAF Web ACL ARN (empty if disabled)"
  value       = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].arn : ""
}

output "web_acl_id" {
  description = "WAF Web ACL ID (empty if disabled)"
  value       = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].id : ""
}

output "web_acl_name" {
  description = "WAF Web ACL name (empty if disabled)"
  value       = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].name : ""
}