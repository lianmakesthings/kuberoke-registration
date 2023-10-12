locals {
  base = split("/", get_original_terragrunt_dir())
#  common_vars
  env_name = element(local.base, index(local.base, "environments") + 1)
  env = yamldecode(file("${get_repo_root()}/environments/${local.env_name}/env.yaml"))
}

inputs = {
  environment = local.env_name
}

generate "provider" {
  path = "generated_provider.tf"
  if_exists = "overwrite"
  contents = <<EOF
provider "aws" {
  region = "${local.env.aws_region}"

  default_tags {
    tags = {
      system = "kuberoke"
    }
  }
}
EOF
}

remote_state {
  backend = "s3"

  config = {
    encrypt = true
    bucket = "kuberoke-terraform-state"
    key = "${path_relative_to_include()}/terraform.tfstate"
    region = "${local.env.aws_region}"
    dynamodb_table = "kuberoke-terraform-state-lock"
  }
}