import 'source-map-support/register';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

type DeleteBody = {
    imageNames?: string[];
    files?: File[];
};

export const isDeleteBodyValid = (unknown: unknown): unknown is DeleteBody => {
    const body = unknown as DeleteBody;
    return body !== undefined;
};

const client = new DynamoDBClient({ region: process.env.REGION_NAME });
const docClient = DynamoDBDocumentClient.from(client);
const s3 = new S3Client({ region: process.env.REGION_NAME });

export const deleteFileFromS3 = async (imageNames: string) => {
    try {
        const command = new DeleteObjectCommand({
            Key: imageNames,
            Bucket: process.env.S3_BUCKET_NAME,
        });

        const response = await s3.send(command);

        if (!response || response.$metadata.httpStatusCode != 204) {
            throw new Error(
                `There was an issue deleting image at s3 - code: ${response?.$metadata.httpStatusCode}, result:${response} `,
            );
        }

        return response;
    } catch (err) {
        throw err;
    }
};

export const delete_post_from_dynamodb = async (event: APIGatewayProxyEvent) => {
    console.log('Starting delete_post_from_dynamodb');
    try {
        const postId = event.pathParameters?.postId;

        const parsedBody = JSON.parse(event.body);

        if (!postId) {
            throw new Error('Id is missing from path');
        }

        if (!isDeleteBodyValid(parsedBody)) {
            throw new Error('The body to delete a post is missing information');
        }

        parsedBody.imageNames &&
            (await Promise.all(
                parsedBody?.imageNames?.map(async (image) => {
                    return await deleteFileFromS3(image);
                }),
            ));

        const params = {
            TableName: process.env.DYNAMO_TABLE_NAME,
            Key: { postId: postId },
        };

        const command = new DeleteCommand(params);
        const response = await docClient.send(command);

        if (response.$metadata.httpStatusCode !== 200) {
            throw new Error(`There was an issue deleting the post statusCode:${response.$metadata.httpStatusCode}`);
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'DELETE',
            },
            body: JSON.stringify(response),
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'DELETE',
            },
            body: JSON.stringify({ message: 'There was an error deleting posts from dynamodb' }),
        };
    }
};
