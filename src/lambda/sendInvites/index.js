const AWS = require('aws-sdk');

const dynamo = new AWS.DynamoDB.DocumentClient();

const TableName = process.env.TABLENAME
const EventStartTime = parseInt(process.env.EVENT_START_TS, 10)
const defaultMinutesToArrive = process.env.DEFAULT_TIME_TO_ARRIVE

const getData = async ExclusiveStartKey => {
    const params = {
      TableName,
      AttributesToGet: [
        'email',
        'name',
        'code',
        'datetime',
        'qrsentat',
        'minutestoarrive'
      ],
      ReturnConsumedCapacity: 'NONE',
    }
    
    if (ExclusiveStartKey) params.ExclusiveStartKey = ExclusiveStartKey
    
    return await dynamo.scan(params).promise().then(async res => {
        let items = res.Items
        
        if (res.LastEvaluatedKey) {
            const otherItems = await getData(res.LastEvaluatedKey)
            items = items.concat(otherItems)
        }
        
        return items
    })
}

const inviteEmails = async (emails, mta) => {
    let d = + new Date

    const startTime = + new Date(EventStartTime)

    if (d < startTime) d = startTime

    return await Promise.all(emails.map(email => {
        var params = {
            TableName,
            Key: { email },
            UpdateExpression: 'set #qrsa = :qrsa, #mta = :mta',
            ConditionExpression: 'attribute_not_exists(qrsentat) AND attribute_exists(email)',
            ExpressionAttributeNames: {
              '#qrsa' : 'qrsentat',
              '#mta': 'minutestoarrive'
            },
            ExpressionAttributeValues: {
                ':qrsa' : d,
                ':mta' : mta,
            }
        };

        return dynamo.update(params).promise().catch(e => {
          if (e.code === 'ConditionalCheckFailedException') {
            return false
          }
          return e
        })
    }))
}

exports.handler = async (event, context) => {
    let body;
    let statusCode = '200';
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        switch (event.httpMethod) {
            case 'GET':
                body = await getData();
                break;
            case 'POST':
                const data = JSON.parse(event.body)
                const result = await inviteEmails(data.emails, parseInt(data.minutestoarrive || defaultMinutesToArrive, 10))

                body = JSON.stringify({'inviteCount': result.filter(p => p !== false).length})
                break;
            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err) {
        statusCode = '400';
        body = err.message;
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers,
    };
};
