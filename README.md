# Kuberoke registration app

## Words of Warning

This project is still very much experimental. Deploying this on an AWS account should be entirely eligible for free tier with normal use, but be aware that no safeguards are in place! Use at your own discretion, no guarantees. If you need any support, reach out to us on your preferred platform linked on https://kuberoke.love/

It is strongly recommended to deploy a testing setup for you to play around before / alongside your production setup. All state is stored in one dynamoDB table (user data and invitation state) and the environment of one lambda function (invite code availability).

Currently, sending mails is only supported with sendgrid. Any other mail provider will need to be configured in code by the end user.

Feel free to use the code in this repo as you see fit. Spread the kuberoke love!

## Setup

- Check out this repo
- create an AWS account and configure your AWS credentials whichever way you like (e.g. IAM user)
- copy the `environments/test` folder and rename it to something identifying your event, e.g. `environments/kc-2023-chi`
- update `env.yaml` to select your desired AWS region
- inside the environment, update `ticket_codes` in the inputs inside `terragrunt.hcl` - all inputs will be upper-cased
- configure `event_start_timestamp` (JS timestamp) and `default_minutes_to_arrive` in your inputs
  - To get the timestamp, run `$ node` in a terminal
  - Run `const start = new Date("03-20-2024T20:00:00.00Z")` for the correct time/date of your event in GMT.
  - Run `start.getValue()`
- update `email_config.yaml` with the desired configuration for your emails
- run `npm install` in `/src/lambda/dynamoStreamhandler`
- create a docker container `docker run -it -e SENDGRID_API_KEY="<api key>" -v ~/.ssh:/root/.ssh -v ~/.aws:/root/.aws -v ./:/data devopsinfra/docker-terragrunt:aws-tf-1.3.9-tg-0.44.4 /bin/bash`
- inside the container, make sure your AWS credentials are loaded correctly (e.g. set `AWS_PROFILE` env var in the container shell or in the command above if not using `default` profile)
- `cd` into your environment and run `terragrunt apply --terragrunt-source /data//terraform` to deploy your local code to the AWS account
- execute `src/generate_key.js` and put the public key into `website/index.html`
- put the private key into the secret inside AWS secrets manager (`kuberoke-[event]-keypair`, format: `{"PRIVATE_KEY":"[value from script in previous step]"}` - make sure when copying the value you don't copy any extra characters! The key should not contain spaces and the linebreaks should be replaced by `\n` in the value)
- fill in the other missing values in `website/index.html` (search for 'TODO')
  - Get your API Key from the AWS API Gateway console, under the API Keys menu
- set a basic auth verification value in `website/auth-function.js`

## TODOs

- support placeholders in email text (probably treat text inputs as JS template strings and update lambda to render them with the user data)
- improve user auth for static front end (e.g. cognito from list of admin user email instead of basic auth)
- replace env vars hack for ticket code availability with something more robust (timing issues here with many requests at the same time, sometimes an update may get lost - dynamo table with conditional updates?)
- improve automation so setup is possible with terragrunt inputs and AWS secret configuration only (e.g. sendgrid api key ends up in state file currently, so treat it as sensitive file) - most of the front end config could be loaded dynamically (except back end url, which can be templated into the html file after API GW creation) or templated into the JS logic (e.g. in which order to handle sponsor codes)
- improve front end functionality (confirmation for invite button, better feedback for invited users, auto-refresh list after invite, paginated list, better selection for which users to invite, ...)
- support custom domains and/or kuberoke.love for admin panel and API
- add a nice kuberoke logo to the QR code just so it looks nicer

## QR code contents

The generated QR contains a JSON string with the following properties:

```
{
  email,          # as entered by the user
  name,           # as entered by the user
  code,           # as entered by the user, UPPERCASED
  timestamp,      # ms since epoch when user sent invitation confirmation by the system, probably want to use Date(timestamp)
  qrsentat,       # ms since epoch when user was sent a QR code by the system, probably want to use Date(qrsentat)
  minutestoarrive,# integer, the user was supposed to arrive within minutestoarrive from when the system sent out their QR code 
  signature       # cryptographic signature, use a public key to verify the rest of the data in the QR code with this signature
}
```

In order to verify the data, a signature is added on the server side unsing a private key which can be verified with on the client side with the corresponding public key. Once the public key is loaded on a device, the scanning and verification is possible without an active internet connection. Only inviting more guests requires an active connection for obvious reasons.

## Viewing front end locally

Use something like `npx http-server -S -a 0.0.0.0` to host the `index.html` file in `src/website` in an https context.

Check the `TODO`s in the file for pointers on what needs updating (simply scanning doesn't strictly require any of the values, but signature verification requires the pub key for the private key that generated the signature).

## Contributing to this repo

There is no currently established process. We recommend you fork this repo and create a PR from your fork which we can review.