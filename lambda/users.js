'use strict';

const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');

const xRay = AWSXRay.captureAWS(require('aws-sdk'));

const singleTableDdb = process.env.SINGLE_TABLE_DDB;
const awsRegion = process.env.AWS_REGION;

AWS.config.update({
    region: awsRegion,
});

const ddbClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    console.debug('event and context:', event, context);

    const method = event.httpMethod;

    if (event.resource === '/users') {
        if (method === 'GET') {
            const data = await getAllUsers();
            return {
                statusCode: 200,
                body: JSON.stringify(data.Items)
            }
        }
    } else if (event.resource === '/users/username/{username}') {
        const username = event.pathParameters.username;

        if (method === 'GET') {
            const data = await getUser(username);
            if (!data || !data.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`User ${username} not found`),
                }
            }
            return {
                statusCode: 200,
                body: JSON.stringify(data.Item),
            }
        } else if (method === 'POST') {
            const user = JSON.parse(event.body);
            user.username = username;
            const result = await createUser(user);

            return {
                statusCode: 201,
                body: JSON.stringify(user),
            };
        } else if (method === 'PUT') {
            const data = await getUser(username);
            if (!data || !data.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`User ${username} not found`),
                }
            }
            const user = JSON.parse(event.body);
            user.username = username;
            const result = await updateUser(user);
            return {
                statusCode: 200,
                body: JSON.stringify(user),
            };
        } else if (method === 'DELETE') {
            const data = await getUser(username);
            if (!data || !data.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`User ${username} not found`),
                }
            }
            const result = deleteUser(username);
            return {
                statusCode: 200,
                body: `User ${username} deleted successfully.`,
            };
        }
    }

    return {
        statusCode: 400,
        headers: {},
        body: JSON.stringify('Bad Request!'),
    };
}

async function getAllUsers() {
    try {
        const params = {
            TableName: singleTableDdb,
            KeyConditionExpression: 'pk = :user',
            ExpressionAttributeValues: {
                ':user': `USER#`
            },
        };
        return ddbClient.query(params).promise();
    } catch (err) {
        return err;
    }
}

async function getUser(username) {
    try {
        const params = {
            TableName: singleTableDdb,
            Key: {
                pk: `USER#`,
                sk: `PROFILE#${username}`
            },
        };
        return ddbClient.get(params).promise();
    } catch (err) {
        return err;
    }
}

function createUser(user) {
    try {
        return ddbClient.put({
            TableName: singleTableDdb,
            Item: {
                pk: `USER#`,
                sk: `PROFILE#${user.username}`,
                fullName: user.fullName,
                email: user.email,
                addresses: user.addresses,
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

function updateUser(user) {
    try {
        const params = {
            TableName: singleTableDdb,
            Key: {
                pk: `USER#`,
                sk: `PROFILE#${user.username}`,
            },
            UpdateExpression: 'set fullName = :fn, email = :e, addresses= :a',
            ExpressionAttributeValues: {
                ':fn': user.fullName,
                ':e': user.email,
                ':a': user.addresses
            },
        };
        return ddbClient.update(params).promise();
    } catch (err) {
        return err;
    }
}

function deleteUser(username) {
    try {
        return ddbClient.delete({
            TableName: singleTableDdb,
            Key: {
                pk: `USER#`,
                sk: `PROFILE#${username}`,
            },
        }).promise();
    } catch (err) {
        return err;
    }
}