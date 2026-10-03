variable "project" { type = string }
variable "environment" { type = string }
variable "secret_names" {
  description = "List of secret container names (values added manually via Console)"
  type        = list(string)
  default = [
    "jwt-access-secret",
    "jwt-refresh-secret",
    "bkash-credentials",
    "nagad-credentials",
    "sslcommerz-credentials",
    "pathao-credentials",
    "sms-api-key",
    "ga4-credentials",
    "meta-capi-token",
  ]
}