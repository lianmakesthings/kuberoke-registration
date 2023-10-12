resource "aws_s3_bucket" "frontend_origin" {
  bucket = "kuberoke-${var.environment}-frontend-origin"
}

resource "aws_s3_bucket_policy" "frontend_origin" {
  bucket = aws_s3_bucket.frontend_origin.id
  policy = <<EOF
{
    "Version": "2008-10-17",
    "Id": "PolicyForCloudFrontPrivateContent",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "${aws_s3_bucket.frontend_origin.arn}/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "${aws_cloudfront_distribution.kuberoke.arn}"
                }
            }
        }
    ]
}
EOF
}

resource "aws_s3_object" "frontend" {
  bucket = aws_s3_bucket.frontend_origin.id
  key    = "index.html"
  source = "${path.root}/../src/website/index.html"

  content_type = "text/html"

  etag = filemd5("${path.root}/../src/website/index.html")
}

resource "aws_cloudfront_function" "auth" {
  name    = "kuberoke-${var.environment}-basic-auth"
  runtime = "cloudfront-js-1.0"
  comment = "basic auth function to limit access to front end"
  publish = true
  code    = file("${path.root}/../src/website/auth-function.js")
}

resource "aws_cloudfront_origin_access_control" "acl" {
  name                              = "kuberoke-${var.environment}-cf-origin-acl"
  description                       = "default kuberoke policy"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

locals {
  s3_origin_id = "kuberoke-${var.environment}-s3-origin"
}

resource "aws_cloudfront_distribution" "kuberoke" {
  origin {
    domain_name              = aws_s3_bucket.frontend_origin.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.acl.id
    origin_id                = local.s3_origin_id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    cache_policy_id  = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    function_association {
      event_type   = "viewer-request"
      function_arn   = aws_cloudfront_function.auth.arn
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}