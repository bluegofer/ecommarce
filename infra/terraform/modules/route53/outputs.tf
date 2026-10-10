output "zone_id" { value = aws_route53_zone.main.zone_id }
output "nameservers" {
  description = "Route 53 NS records — paste into GoDaddy nameservers"
  value       = aws_route53_zone.main.name_servers
}
output "domain_name" { value = aws_route53_zone.main.name }