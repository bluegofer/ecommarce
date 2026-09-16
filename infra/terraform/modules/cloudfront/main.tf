# CloudFront — 2 distributions (storefront, media).
# Storefront origin: ALB (dynamic SSR). Media origin: S3.

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${var.project}-${var.environment}-media-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Media distribution
resource "aws_cloudfront_distribution" "media" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project}-${var.environment}-media"
  default_root_object = ""
  price_class         = "PriceClass_200"

  origin {
    domain_name              = var.media_bucket_domain
    origin_id                = "s3-media"
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-media"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400   # 1 day
    max_ttl     = 2592000 # 30 days
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.certificate_arn == "" ? true : false
    acm_certificate_arn            = var.certificate_arn == "" ? null : var.certificate_arn
    ssl_support_method             = var.certificate_arn == "" ? null : "sni-only"
    minimum_protocol_version       = var.certificate_arn == "" ? null : "TLSv1.2_2021"
  }

  tags = { Name = "${var.project}-${var.environment}-media-cdn" }
}

# Storefront distribution (ALB origin) — only when enable_storefront=true
resource "aws_cloudfront_distribution" "storefront" {
  count           = var.enable_storefront ? 1 : 0
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.project}-${var.environment}-storefront"
  price_class     = "PriceClass_200"

  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-storefront"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    custom_header {
      name  = "X-Origin-Verify"
      value = var.origin_secret
    }
  }

  default_cache_behavior {
    target_origin_id       = "alb-storefront"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Host", "Accept", "Accept-Language", "Authorization", "Cookie"]
      cookies { forward = "all" }
    }

    min_ttl     = 0
    default_ttl = 60  # 1 min default (dynamic)
    max_ttl     = 300 # 5 min max
  }

  # Static _next assets get longer TTL
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "alb-storefront"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 31536000
    max_ttl     = 31536000
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.certificate_arn == "" ? true : false
    acm_certificate_arn            = var.certificate_arn == "" ? null : var.certificate_arn
    ssl_support_method             = var.certificate_arn == "" ? null : "sni-only"
    minimum_protocol_version       = var.certificate_arn == "" ? null : "TLSv1.2_2021"
  }

  tags = { Name = "${var.project}-${var.environment}-storefront-cdn" }
}