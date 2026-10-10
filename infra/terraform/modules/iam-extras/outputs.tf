output "github_deploy_role_arn" {
  description = "IAM role ARN for GitHub Actions (put in repo secret AWS_DEPLOY_ROLE_ARN)"
  value       = aws_iam_role.github_deploy.arn
}