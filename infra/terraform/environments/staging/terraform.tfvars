# Staging environment values.
# Non-secret values only — secrets live in Secrets Manager.

aws_region       = "ap-south-1"
project          = "bluegofer"
environment      = "staging"
account_id       = "390630836942"
domain_name      = "nolimitshopping.com"
alert_email      = "cloud.bluegofer@gmail.com"
allowed_ssh_cidr = "178.78.136.30/32"

# Staging-specific: single AZ RDS, no deletion protection
rds_multi_az            = false
rds_deletion_protection = false
rds_skip_final_snapshot = true

# Staging EC2: keep t3.medium (same as prod baseline for realistic testing)
ec2_instance_type = "t3.medium"