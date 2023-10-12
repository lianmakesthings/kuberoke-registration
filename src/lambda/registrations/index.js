const AWS = require('aws-sdk')

const lambda = new AWS.Lambda()
const dynamodb = new AWS.DynamoDB()

const TableName = process.env.TABLENAME


const handler = async (event, context) => {
  let message = ''
  let statusCode = 200
  const dt = + new Date

  const body = JSON.parse(event.body)

  const code = body.code?.toUpperCase()

  const params = {
    ExpressionAttributeNames: {
     "#n": "name", 
     "#dt": "datetime"
    }, 
    ExpressionAttributeValues: {
      ":n": {
        S: body.name
       },
      ":dt": {
        N: dt.toString()
      },
    }, 
    Key: {
     "email": {
       S: body.email
      }
    },
    ConditionExpression: "attribute_not_exists(email)",
    ReturnValues: "NONE",
    TableName,
    UpdateExpression: "SET #n = :n, #dt = :dt"
  };
  
  if (body.email && body.name) {
    if (code) {
      if (parseInt(process.env[`TICKET_CODE_${code}`], 10) > 0) {
        const res = await lambda.getFunctionConfiguration({FunctionName: context.functionName }).promise()

        const envVars = res.Environment.Variables
        envVars[`TICKET_CODE_${code}`] = (parseInt(process.env[`TICKET_CODE_${code}`], 10) - 1).toString()
        await lambda.updateFunctionConfiguration({FunctionName: context.functionName, Environment: { Variables: envVars }}).promise()

        params.ExpressionAttributeNames['#c'] = "code"
        params.ExpressionAttributeValues[':c'] = { S: code }
        params.UpdateExpression += ", #c = :c"

      } else {
        statusCode = 400
        message = 'This ticket code is invalid.'
        if (parseInt(process.env[`TICKET_CODE_${code}`], 10) == 0) {
          message = 'This ticket code is no longer valid.'
        }
      }
    }
  }

  try {
    if (statusCode == 200) await dynamodb.updateItem(params).promise()
  } catch (e) {
    statusCode = 400
    console.error(body, e)
    message = "Something went wrong. Please try again later."
    if (e.code === 'ConditionalCheckFailedException') {
      message = "This email is already registered."
      if (code && parseInt(process.env[`TICKET_CODE_${code}`], 10) >= 0) {
        const res = await lambda.getFunctionConfiguration({FunctionName: context.functionName}).promise()

        const envVars = res.Environment.Variables
        envVars[`TICKET_CODE_${code}`] = (parseInt(process.env[`TICKET_CODE_${code}`], 10) + 1).toString()
        await lambda.updateFunctionConfiguration({FunctionName: context.functionName, Environment: { Variables: envVars }}).promise()
      }
    }
  }

  let response = {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({message})
  };

  console.debug("response: " + JSON.stringify(response))

  return response
};

module.exports = { handler }