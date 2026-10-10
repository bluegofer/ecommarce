# Security Groups — TDD §9.1 + §10.4.
# Three SGs: alb (public), app (private, from ALB), rds (private, from app).

# ---------------------------------------------------------------------------
# ALB Security Group — internet-facing, HTTPS + HTTP
# ---------------------------------------------------------------------------
resource "aws_security_group" "alb" {
  name        = "${var.project}-${var.environment}-alb-sg"
  description = "ALB: allow HTTP/HTTPS from internet"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "To app instances"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project}-${var.environment}-alb-sg"
  }
}

# ---------------------------------------------------------------------------
# App Security Group — EC2 instances (NestJS + Next.js)
# ---------------------------------------------------------------------------
resource "aws_security_group" "app" {
  name        = "${var.project}-${var.environment}-app-sg"
  description = "App EC2: allow ALB traffic + SSH from admin"
  vpc_id      = var.vpc_id

  ingress {
    description     = "App API port from ALB only"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Storefront port from ALB only"
    from_port       = var.storefront_port
    to_port         = var.storefront_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Admin port from ALB only"
    from_port       = var.admin_port
    to_port         = var.admin_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "SSH from admin IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  egress {
    description = "All outbound (for apt, ECR pull, external APIs)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project}-${var.environment}-app-sg"
  }
}

# ---------------------------------------------------------------------------
# RDS Security Group — PostgreSQL only from app SG
# ---------------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name        = "${var.project}-${var.environment}-rds-sg"
  description = "RDS: PostgreSQL only from app SG"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from app instances"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    description = "All outbound (for minor version upgrades)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project}-${var.environment}-rds-sg"
  }
}

# ---------------------------------------------------------------------------
# Redis Security Group — from app SG (self-hosted Redis on EC2)
# ---------------------------------------------------------------------------
resource "aws_security_group" "redis" {
  name        = "${var.project}-${var.environment}-redis-sg"
  description = "Redis: from app SG only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from app instances"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project}-${var.environment}-redis-sg"
  }
}