# Secrets Manager — containers only. Values injected manually (Console) or
# via separate terraform-managed random_password for JWT secrets.

resource "aws_secretsmanager_secret" "app" {
  for_each = toset(var.secret_names)

  name                    = "${var.project}/${var.environment}/${each.value}"
  description             = "${each.value} for ${var.project} ${var.environment}"
  recovery_window_in_days = 0

  tags = { Name = "${var.project}-${var.environment}-${each.value}" }
}