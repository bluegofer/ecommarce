output "certificate_arn" { value = aws_acm_certificate.wildcard.arn }
output "certificate_status" { value = aws_acm_certificate.wildcard.status }