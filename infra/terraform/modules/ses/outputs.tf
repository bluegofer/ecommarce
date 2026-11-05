output "domain_identity_arn" { value = aws_ses_domain_identity.main.arn }
output "dkim_tokens" { value = aws_ses_domain_dkim.main.dkim_tokens }
output "mail_from_domain" { value = aws_ses_domain_mail_from.main.mail_from_domain }