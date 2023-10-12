variable "environment" {
  type        = string
  description = "Name of the environment"
}

variable "ticket_codes" {
  type        = map
  description = "Ticket codes to be created on initial setup. Changes of the values will be ignored by terraform."

  default = {
    invalid = "0"
  }
}

variable "sendgrid_api_key" {
  type        = string
  description = "API key for sendgrid"
}

variable "default_minutes_to_arrive" {
  type        = string
  description = "Minutes that an invitee has to arrive at the location of the event after their invite was sent out"
}

variable "event_start_timestamp" {
  type        = string
  description = "JS timestamp when the event starts - invites sent before event start time will be treated as if sent at this timestamp"
}

variable "email_config" {
  type = map
  description = "Configuration for emails"
}