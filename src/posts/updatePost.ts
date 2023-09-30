import 'source-map-support/register';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import * as parser from 'lambda-multipart-parser';

const client = new DynamoDBClient({ region: process.env.REGION_NAME });
const docClient = DynamoDBDocumentClient.from(client);

export const update_post_in_dynamodb = async (event: APIGatewayProxyEvent) => {
    console.log('Starting update post in dynamodb');
    try {
        const data = await parser.parse(event);

        if (!data.report || !data.buildSite || !event.pathParameters?.id) {
            throw new Error(
                `Value missing to update id: ${event.pathParameters?.id} buildSite: ${data.buildSite} report: ${data.report} `,
            );
        }

        const params = {
            TableName: process.env.DYNAMO_TABLE_NAME,
            Key: { id: event.pathParameters.id },
            UpdateExpression: 'SET report = :report, buildSite = :buildSite',
            ExpressionAttributeValues: {
                ':report': data.report,
                ':buildSite': data.buildSite,
            },
            ReturnValues: 'ALL_NEW',
        };

        const command = new UpdateCommand(params);
        const response = await docClient.send(command);

        if (response.$metadata.httpStatusCode !== 200) {
            throw new Error(`There was an issue updating the post statusCode:${response.$metadata.httpStatusCode}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify(response),
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'There was an error updating post in dynamodb' }),
        };
    }
};
