resource "aws_iam_role" "api_registration_handler" {
  name               = "kuberoke-${var.environment}-api-registration-lambda-role"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "api_registration_handler" {
  name   = "kuberoke-${var.environment}-api-registration-lambda-policy"
  policy = <<EOF
{
    "Statement": [
        {
            "Action": [
                "lambda:UpdateFunctionConfiguration",
                "lambda:GetFunctionConfiguration"
            ],
            "Effect": "Allow",
            "Resource": "${aws_lambda_function.api_registration_handler.arn}"
        },
        {
            "Action": "logs:CreateLogGroup",
            "Effect": "Allow",
            "Resource": "arn:aws:logs:${local.region_name}:${local.account_id}:*"
        },
        {
            "Action": [
                "logs:PutLogEvents",
                "logs:CreateLogStream"
            ],
            "Effect": "Allow",
            "Resource": "arn:aws:logs:${local.region_name}:${local.account_id}:log-group:/aws/lambda/${aws_lambda_function.api_registration_handler.function_name}:*"
        },
        {
            "Action": [
                "dynamodb:UpdateItem"
            ],
            "Effect": "Allow",
            "Resource": "${aws_dynamodb_table.kuberoke.arn}"
        }
    ],
    "Version": "2012-10-17"
}
EOF
}

resource "aws_iam_role_policy_attachment" "api_registration_handler" {
  role       = aws_iam_role.api_registration_handler.name
  policy_arn = aws_iam_policy.api_registration_handler.arn
}

data "archive_file" "api_registration_handler" {
  type        = "zip"
  source_dir  = "${path.root}/../src/lambda/registrations"
  output_path = "${path.root}/../src/lambda/build/registrations_lambda_function.zip"
}

resource "aws_lambda_function" "api_registration_handler" {
  filename         = "${path.root}/../src/lambda/build/registrations_lambda_function.zip"
  function_name    = "kuberoke-${var.environment}-api-reg"
  handler          = "index.handler"
  runtime          = "nodejs16.x"
  role             = aws_iam_role.api_registration_handler.arn
  source_code_hash = data.archive_file.api_registration_handler.output_base64sha256

  environment {
    variables = merge({
      for code, initial_amount in var.ticket_codes : "TICKET_CODE_${upper(code)}" => initial_amount
    }, {
      TABLENAME = aws_dynamodb_table.kuberoke.name
    })
  }

  lifecycle {
    ignore_changes = [
      environment.0.variables
    ]
  }
}