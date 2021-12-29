'use strict';

const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const uuid = require('uuid');

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

    const username = event.pathParameters.username;
    const userData = await getUser(username);
    if (!userData || !userData.Item) {
        return {
            statusCode: 404,
            body: JSON.stringify(`User ${username} not found`),
        }
    }

    if (event.resource === '/orders/username/{username}') {
        if (method === 'GET') {
            const data = await getAllUserOrders(username);

            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            }
        } else if (method === 'POST') {

            const order = JSON.parse(event.body);
            order.username = username;
            order.id = uuid.v4();
            order.fullName = userData.Item.fullName;
            order.address = userData.Item.addresses[0];

            const result = await createOrder(order);

            return {
                statusCode: 201,
                body: JSON.stringify(order),
            };
        }
    } else if (event.resource === '/orders/username/{username}/status/{status}') {
        const status = event.pathParameters.status;
        if (method === 'GET') {
            const data = await getAllUserOrdersByStatus(username, status);

            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            }
        }
    } else if (event.resource === '/orders/username/{username}/id/{id}') {
        const orderId = event.pathParameters.id;

        if (method === 'GET') {
            const data = await getUserOrderById(username, orderId);

            if (!data || !data.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`Order with id ${orderId} not found`),
                }
            }

            return {
                body: JSON.stringify(data.Item),
            }
        } else if (method === 'PUT') {
            const data = await getUserOrderById(username, orderId);

            if (!data || !data.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`Order with id ${orderId} not found`),
                }
            }

            const order = JSON.parse(event.body);
            order.username = username;
            order.id = orderId;
            order.fullName = userData.Item.fullName;
            order.address = userData.Item.addresses[0];

            const result = await updateOrder(order);

            return {
                statusCode: 200,
                body: JSON.stringify(order),
            }
        } else if (method === 'DELETE') {
            const data = await getUserOrderById(username, orderId);

            if (!data || !data.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`Order with id ${orderId} not found`),
                }
            }

            await deleteOrder(username, orderId);

            return {
                statusCode: 200,
                body: JSON.stringify(`Order with id ${orderId} from user ${username} was deleted`),
            }
        }
    }

    return {
        statusCode: 400,
        headers: {},
        body: JSON.stringify('Bad Request!'),
    };
};

function getUser(username) {
    try {
        return ddbClient.get({
            TableName: singleTableDdb,
            Key: {
                pk: `USER#`,
                sk: `PROFILE#${username}`,
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

function getAllUserOrders(username) {
    try {
        const params = {
            TableName: singleTableDdb,
            KeyConditionExpression: 'pk = :username',
            ExpressionAttributeValues: {
                ':username': `ORDER#${username}`
            },
        };
        return ddbClient.query(params).promise();
    } catch (err) {
        return err;
    }
}

function getAllUserOrdersByStatus(username, status) {
    try {
        const params = {
            TableName: singleTableDdb,
            IndexName: 'orderStatusIdx',
            KeyConditionExpression: 'orderStatus = :s AND pk = :u',
            ExpressionAttributeValues: {
                ':s': status,
                ':u': `ORDER#${username}`,
            },
        };
        return ddbClient.query(params).promise();
    } catch (err) {
        return err;
    }
}

function getUserOrderById(username, orderId) {
    try {
        return ddbClient.get({
            TableName: singleTableDdb,
            Key: {
                pk: `ORDER#${username}`,
                sk: `ORDER#${orderId}`,
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

function createOrder(order) {
    try {
        return ddbClient.put({
            TableName: singleTableDdb,
            Item: {
                pk: `ORDER#${order.username}`,
                sk: `ORDER#${order.id}`,
                orderStatus: order.orderStatus,
                items: order.items,
                fullName: order.fullName,
                address: order.address,
            },
        }).promise();
    } catch (err) {
        return err;
    }
}

function updateOrder(order) {
    try {
        return ddbClient.update({
            TableName: singleTableDdb,
            Key: {
                pk: `ORDER#${order.username}`,
                sk: `ORDER#${order.id}`,
            },
            UpdateExpression: 'set orderStatus = :st, #order_items = :it, fullName = :fn, address = :ad',
            ExpressionAttributeValues: {
                ':st': order.orderStatus,
                ':it': order.items,
                ':fn': order.fullName,
                ':ad': order.address,
            },
            ExpressionAttributeNames: {
                "#order_items": "items"
            },
            ReturnValues: 'UPDATED_NEW',
        }).promise();
    } catch (err) {
        return err;
    }
}

function deleteOrder(username, orderId) {
    try {
        return ddbClient.delete({
            TableName: singleTableDdb,
            Key: {
                pk: `ORDER#${username}`,
                sk: `ORDER#${orderId}`,
            }
        }).promise();
    } catch (err) {
        return err;
    }
}