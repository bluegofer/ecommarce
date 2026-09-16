# Staging environment — composes all modules.
# Apply order: vpc → security-groups → rds → ec2 → s3 → ecr → route53 → acm
# → cloudfront → secrets → iam-extras → cloudwatch → ses → waf

variable "aws_region" { type = string }
variable "project" { type = string }
variable "environment" { type = string }
variable "account_id" { type = string }
variable "domain_name" { type = string }
variable "alert_email" { type = string }
variable "allowed_ssh_cidr" { type = string }
variable "rds_multi_az" { type = bool }
variable "rds_deletion_protection" { type = bool }
variable "rds_skip_final_snapshot" { type = bool }
variable "ec2_instance_type" { type = string }

# ---------------------------------------------------------------------------
# VPC
# ---------------------------------------------------------------------------
module "vpc" {
  source             = "../../modules/vpc"
  project            = var.project
  environment        = var.environment
  aws_region         = var.aws_region
  enable_nat_gateway = false # $47 baseline: skip NAT ($32/mo saved)
}

# ---------------------------------------------------------------------------
# Provider alias for CloudFront-scoped resources (WAF) — must be us-east-1
# ---------------------------------------------------------------------------
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}


# ---------------------------------------------------------------------------
# Security Groups
# ---------------------------------------------------------------------------
module "security_groups" {
  source           = "../../modules/security-groups"
  project          = var.project
  environment      = var.environment
  vpc_id           = module.vpc.vpc_id
  allowed_ssh_cidr = var.allowed_ssh_cidr
}

# ---------------------------------------------------------------------------
# S3 buckets (media + logs)
# ---------------------------------------------------------------------------
module "s3" {
  source              = "../../modules/s3"
  project             = var.project
  environment         = var.environment
  account_id          = var.account_id
  aws_region          = var.aws_region
  media_bucket_suffix = var.account_id
}

# ---------------------------------------------------------------------------
# ECR (Docker registry for api, storefront, admin)
# ---------------------------------------------------------------------------
module "ecr" {
  source      = "../../modules/ecr"
  project     = var.project
  environment = var.environment
}

# ---------------------------------------------------------------------------
# RDS PostgreSQL
# ---------------------------------------------------------------------------
module "rds" {
  source                = "../../modules/rds"
  project               = var.project
  environment           = var.environment
  private_subnet_ids    = module.vpc.private_subnet_ids
  rds_sg_id             = module.security_groups.rds_sg_id
  instance_class        = "db.t3.micro"
  allocated_storage_gb  = 20
  multi_az              = var.rds_multi_az
  backup_retention_days = 7
  deletion_protection   = var.rds_deletion_protection
  skip_final_snapshot   = var.rds_skip_final_snapshot
}

# ---------------------------------------------------------------------------
# EC2 (app server)
# ---------------------------------------------------------------------------
module "ec2" {
  source              = "../../modules/ec2"
  project             = var.project
  environment         = var.environment
  private_subnet_id   = module.vpc.private_subnet_ids[0]
  app_sg_id           = module.security_groups.app_sg_id
  instance_type       = var.ec2_instance_type
  root_volume_size_gb = 30
  ecr_registry        = module.ecr.registry_id
}

# ---------------------------------------------------------------------------
# Route 53 hosted zone (records added later, once CloudFront exists)
# ---------------------------------------------------------------------------
module "route53" {
  source         = "../../modules/route53"
  domain_name    = var.domain_name
  create_records = false # Toggle to true after first apply to create records
}

# ---------------------------------------------------------------------------
# ACM wildcard certificate (DNS validated via Route 53)
# ---------------------------------------------------------------------------
module "acm" {
  source          = "../../modules/acm"
  domain_name     = var.domain_name
  route53_zone_id = module.route53.zone_id
  aws_region      = var.aws_region
}

# ---------------------------------------------------------------------------
# CloudFront (media + storefront distributions)
# ---------------------------------------------------------------------------
module "cloudfront" {
  source              = "../../modules/cloudfront"
  project             = var.project
  environment         = var.environment
  domain_name         = var.domain_name
  certificate_arn     = module.acm.certificate_arn
  media_bucket_domain = module.s3.media_bucket_domain
  alb_dns_name        = "" # Set once ALB exists; storefront CDN added later
  origin_secret       = "staging-origin-verify-${var.account_id}"
    enable_storefront   = false
}

# ---------------------------------------------------------------------------
# Secrets Manager containers (values injected manually)
# ---------------------------------------------------------------------------
module "secrets" {
  source      = "../../modules/secrets"
  project     = var.project
  environment = var.environment
}

# ---------------------------------------------------------------------------
# IAM extras — GitHub OIDC deploy role
# ---------------------------------------------------------------------------
module "iam_extras" {
  source               = "../../modules/iam-extras"
  project              = var.project
  environment          = var.environment
  github_org           = "bluegofer"
  github_repo          = "ecommarce"
  create_oidc_provider = false # Set true only on first apply, then false again
}

# ---------------------------------------------------------------------------
# CloudWatch alarms
# ---------------------------------------------------------------------------
module "cloudwatch" {
  source          = "../../modules/cloudwatch"
  project         = var.project
  environment     = var.environment
  alert_email     = var.alert_email
  ec2_instance_id = module.ec2.instance_id
  rds_instance_id = module.rds.db_instance_id
}

# ---------------------------------------------------------------------------
# SES — domain verify + DKIM
# ---------------------------------------------------------------------------
module "ses" {
  source          = "../../modules/ses"
  domain_name     = var.domain_name
  route53_zone_id = module.route53.zone_id
}

# ---------------------------------------------------------------------------
# WAF — web ACL for CloudFront
# ---------------------------------------------------------------------------
module "waf" {
  providers = {
    aws.us_east_1 = aws.us_east_1
  }
  source      = "../../modules/waf"
  project     = var.project
  environment = var.environment
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "route53_nameservers" {
  description = "Paste these into GoDaddy as custom nameservers"
  value       = module.route53.nameservers
}

output "route53_zone_id" { value = module.route53.zone_id }
output "ec2_elastic_ip" { value = module.ec2.elastic_ip }
output "ec2_instance_id" { value = module.ec2.instance_id }
output "rds_endpoint" { value = module.rds.db_endpoint }
output "rds_secret_arn" { value = module.rds.db_password_secret_arn }
output "media_bucket" { value = module.s3.media_bucket_id }
output "logs_bucket" { value = module.s3.logs_bucket_id }
output "ecr_urls" { value = module.ecr.repository_urls }
output "acm_certificate_arn" { value = module.acm.certificate_arn }
output "cloudfront_media_domain" { value = module.cloudfront.media_domain }
output "cloudfront_storefront_domain" { value = module.cloudfront.storefront_domain }
output "github_deploy_role_arn" { value = module.iam_extras.github_deploy_role_arn }
output "sns_alerts_arn" { value = module.cloudwatch.sns_topic_arn }
output "ses_dkim_tokens" { value = module.ses.dkim_tokens }
output "waf_web_acl_id" { value = module.waf.web_acl_id }
