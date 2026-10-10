# GitHub OIDC provider + deploy role.
# Avoids long-lived AWS keys in GitHub Actions. OIDC short-lived tokens.

# OIDC provider — one per AWS account (create on first env only)
resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = { Name = "github-actions-oidc" }
}

# Deploy role — assumed by GitHub Actions
resource "aws_iam_role" "github_deploy" {
  name = "${var.project}-${var.environment}-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::390630836942:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [
            "repo:${var.github_org}/${var.github_repo}:*",
            "repo:${var.github_org}@*/${var.github_repo}@*:*"
          ]
        }
      }
    }]
  })

  tags = { Name = "${var.project}-${var.environment}-github-deploy" }
}

# Deploy policy — ECR push, SSM deploy to EC2, S3 artifacts
resource "aws_iam_role_policy" "github_deploy" {
  name = "${var.project}-${var.environment}-deploy-policy"
  role = aws_iam_role.github_deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ssm:ListCommandInvocations"
        ]
        Resource = "*"
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# EC2 role — S3 access for backups + ad-hoc file transfer.
# Step 15.12.4 — Redis BGSAVE-to-S3 + script/diagnostic transfer.
#
# Scope:
#   - s3:ListBucket / GetBucketLocation : whole bucket (prefix discovery)
#   - redis-backups/* : read + write + delete (backup push + verify + cleanup)
#   - tmp/*           : read + write + delete (ad-hoc file transfer)
#   - backups/*       : write-only       (future DB dumps)
# ---------------------------------------------------------------------------
resource "aws_iam_role_policy" "ec2_s3_backup_access" {
  name = "${var.project}-${var.environment}-ec2-s3-backup-access"
  role = "${var.project}-${var.environment}-ec2-role"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = "arn:aws:s3:::${var.project}-${var.environment}-logs-${var.account_id}"
      },
      {
        Sid    = "RedisBackupsWriteAndVerify"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload"
        ]
        Resource = "arn:aws:s3:::${var.project}-${var.environment}-logs-${var.account_id}/redis-backups/*"
      },
      {
        Sid    = "TmpBidirectionalTransfer"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload"
        ]
        Resource = "arn:aws:s3:::${var.project}-${var.environment}-logs-${var.account_id}/tmp/*"
      },
      {
        Sid    = "FutureBackupsWriteOnly"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:AbortMultipartUpload"
        ]
        Resource = "arn:aws:s3:::${var.project}-${var.environment}-logs-${var.account_id}/backups/*"
      }
    ]
  })
}