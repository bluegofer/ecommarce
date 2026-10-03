output "instance_id" { value = aws_instance.app.id }
output "instance_private_ip" { value = aws_instance.app.private_ip }
output "elastic_ip" { value = aws_eip.app.public_ip }
output "iam_role_arn" { value = aws_iam_role.app.arn }
output "iam_instance_profile_name" { value = aws_iam_instance_profile.app.name }