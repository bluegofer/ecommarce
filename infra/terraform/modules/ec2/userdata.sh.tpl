#!/bin/bash
# Userdata — runs once on first boot. Installs Docker + Redis, prepares app dir.
set -euo pipefail

# Update + base tools
dnf update -y
dnf install -y docker git curl amazon-cloudwatch-agent

# Docker
systemctl enable --now docker
usermod -aG docker ec2-user || true

# Redis (self-hosted, TDD §9 baseline)
dnf install -y redis6 || dnf install -y redis
cat > /etc/redis/redis.conf <<EOF
bind 127.0.0.1 -::1
protected-mode yes
port 6379
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
dir /var/lib/redis
EOF
systemctl enable --now redis || systemctl enable --now redis6

# App directory
mkdir -p /opt/${project}/${environment}
chown ec2-user:ec2-user /opt/${project}/${environment}

# CloudWatch agent (basic config)
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<EOF
{
  "metrics": { "namespace": "${project}/${environment}", "metrics_collected": { "mem": { "measurement": ["mem_used_percent"] }, "disk": { "measurement": ["used_percent"], "resources": ["/"] } } },
  "logs": { "logs_collected": { "files": { "collect_list": [ { "file_path": "/var/log/messages", "log_group_name": "${project}-${environment}-syslog", "log_stream_name": "{instance_id}" } ] } } }
}
EOF
systemctl enable amazon-cloudwatch-agent || true

# Docker credential helper for ECR
dnf install -y amazon-ecr-credential-helper

echo "Userdata complete — ${project}/${environment} ready." > /var/log/userdata-done.log