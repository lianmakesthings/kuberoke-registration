output "default_apigatewayv2_stage_invoke_url" {
  value = aws_api_gateway_stage.prod.invoke_url
}

output "frontend_url" {
  value = aws_cloudfront_distribution.kuberoke.domain_name
}