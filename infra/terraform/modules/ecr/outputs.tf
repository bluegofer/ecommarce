output "repository_urls" {
  description = "Map of repository name to full URL"
  value       = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}
output "registry_id" {
  description = "ECR registry ID (account ID)"
  value       = try(values(aws_ecr_repository.repos)[0].registry_id, "")
}