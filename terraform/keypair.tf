resource "aws_secretsmanager_secret" "keypair" {
  name = "kuberoke-${var.environment}-keypair"
}