import { default as sgMail } from '@sendgrid/mail'
import * as qr from 'qrcode'
import * as crypto from 'crypto'
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import texts from "./texts.json" assert { type: "json" }

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const client = new SecretsManagerClient()

const command = new GetSecretValueCommand({
  SecretId: process.env.SECRET_ID
})

const response = await client.send(command)
const PRIVATE_KEY = JSON.parse(response.SecretString).PRIVATE_KEY

const sendConfirmationEmail = async (data) => {
  const msg = {
    to: data.email,
    from: texts.confirmation.sender,
    subject: texts.confirmation.subject,
    text: texts.confirmation.textContent,
    html: texts.confirmation.htmlContent
  }

  try {
    console.log(`sending confirmation to ${data.email}`)
    await sgMail.send(msg)
    return
  } catch (error) {
    console.error(error)

    if (error.response) {
      console.error(error.response.body)
    }
  }
}

const sendQr = async (data) => {
  const url = await qr.toDataURL(JSON.stringify(data))
  const msg = {
    to: data.email,
    from: texts.invitation.sender,
    subject: texts.invitation.subject,
    text: texts.invitation.textContent,
    html: texts.invitation.htmlContent,
    attachments: [
      {
        content: url.split(',')[1],
        filename: 'qrcode.png',
        type: 'image/png',
        disposition: 'attachment',
        content_id: 'qrcode'
      },
    ],
  }

  try {
    console.log(`sending QR code to ${data.email}`)
    await sgMail.send(msg)
    return
  } catch (error) {
    console.error(error)

    if (error.response) {
      console.error(error.response.body)
    }
  }
}

export const handler = async (event, context) => {
  await Promise.all(event['Records'].map(record => {
    const newEmail = record.dynamodb?.NewImage?.email?.S
    const oldEmail = record.dynamodb?.OldImage?.email?.S

    const qrsentat = record.dynamodb?.NewImage?.qrsentat?.N
    const qrsentatBefore = record.dynamodb?.OldImage?.qrsentat?.N

    const data = {
      email: newEmail,
      name: record.dynamodb?.NewImage?.name?.S,
      code: record.dynamodb?.NewImage?.code?.S || '',
      timestamp: record.dynamodb?.NewImage?.datetime?.N,
      qrsentat,
      minutestoarrive: record.dynamodb?.NewImage?.minutestoarrive?.N || 20
    }

    if (qrsentat !== undefined && qrsentatBefore === undefined) {
      const payload = JSON.stringify(data);

      const signature = crypto.sign("sha256", Buffer.from(payload, 'utf-8'), {
        key: PRIVATE_KEY.split('\\n').join('\n'),
        padding: crypto.constants.RSA_PKCS1_PADDING,
      });

      data.signature = signature.toString('base64')

      return sendQr(data)
    } else if (newEmail !== undefined && oldEmail === undefined) {
      return sendConfirmationEmail(data)
    }
  }))
}
