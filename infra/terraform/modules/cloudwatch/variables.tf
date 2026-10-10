variable "project" { type = string }
variable "environment" { type = string }
variable "alert_email" {
  description = "Email for alarm notifications"
  type        = string
}
variable "ec2_instance_id" {
  description = "EC2 instance to monitor"
  type        = string
}
variable "rds_instance_id" {
  description = "RDS instance to monitor"
  type        = string
}