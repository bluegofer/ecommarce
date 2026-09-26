# Route 53 — hosted zone + subdomain records.
# Nameservers output feeds GoDaddy config.

resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "Primary hosted zone for ${var.domain_name}"

  tags = { Name = var.domain_name }
}

# Root — CloudFront (storefront)
resource "aws_route53_record" "root" {
  count   = var.create_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_storefront_domain
    zone_id                = "Z2FDTNDATAQYW2" # CloudFront global hosted zone ID
    evaluate_target_health = false
  }
}

# www — CloudFront
resource "aws_route53_record" "www" {
  count   = var.create_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_storefront_domain
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

# api — ALB
resource "aws_route53_record" "api" {
  count   = var.create_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# admin — ALB
resource "aws_route53_record" "admin" {
  count   = var.create_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "admin.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# media — CloudFront (S3 origin)
resource "aws_route53_record" "media" {
  count   = var.create_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "media.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_media_domain
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}