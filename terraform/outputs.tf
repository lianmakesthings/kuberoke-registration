output "default_apigatewayv2_stage_invoke_url" {
  value = aws_api_gateway_stage.prod.invoke_url
}

output "api_gw_api_key" {
  value = aws_api_gateway_api_key.kuberoke.value
}

output "frontend_url" {
  value = aws_cloudfront_distribution.kuberoke.domain_name
}