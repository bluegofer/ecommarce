variable "project" { type = string }
variable "environment" { type = string }
variable "repositories" {
  description = "List of image repositories to create (api, storefront, admin)"
  type        = list(string)
  default     = ["api", "storefront", "admin"]
}