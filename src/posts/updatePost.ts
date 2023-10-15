import 'source-map-support/register';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';

const client = new DynamoDBClient({ region: process.env.REGION_NAME });
const docClient = DynamoDBDocumentClient.from(client);

type UpdateData = {
    report: string;
    buildSite: string;
};

const UpdateSchema = z.object({
    Attributes: z.object({
        buildSite: z.string(),
        imageNames: z.array(z.string()).optional(),
        report: z.string(),
        costs: z.string(),
        createdAt: z.string(),
        hours: z.string(),
        id: z.string(),

        name: z.string(),
    }),
});

type UpdateResponse = z.infer<typeof UpdateSchema>;

const isUpdateSchemaValid = (data: unknown): data is UpdateResponse => {
    UpdateSchema.parse(data);
    return true;
};

export const update_post_in_dynamodb = async (event: APIGatewayProxyEvent) => {
    console.log('Starting update_post_in_dynamodb');
    try {
        const data: UpdateData = JSON.parse(event.body);

        if (!data.report || !data.buildSite || !event.pathParameters?.postId) {
            throw new Error(
                `Value missing to update id: ${event.pathParameters?.id} buildSite: ${data.buildSite} report: ${data.report} `,
            );
        }

        const params = {
            TableName: process.env.DYNAMO_TABLE_NAME,
            Key: { postId: event.pathParameters.postId },
            UpdateExpression: 'SET report = :report, buildSite = :buildSite',
            ExpressionAttributeValues: {
                ':report': data.report,
                ':buildSite': data.buildSite,
            },
            ReturnValues: 'ALL_NEW',
        };

        const command = new UpdateCommand(params);
        const response = await docClient.send(command);

        if (!isUpdateSchemaValid(response)) throw new Error();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT',
            },
            body: JSON.stringify(response.Attributes),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT',
            },
            body: JSON.stringify({ message: 'There was an error updating post in dynamodb' }),
        };
    }
};
