import 'source-map-support/register';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as parser from 'lambda-multipart-parser';

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
    console.log('Starting delete post from dynamodb');
    try {
        const postId = event.pathParameters?.id;

        const parsedBody = await parser.parse(event);

        if (!postId) {
            throw new Error('Id is missing from path');
        }

        if (!isDeleteBodyValid(parsedBody)) {
            throw new Error('The body to delete a post is missing information');
        }

        await Promise.all(
            parsedBody?.files?.map(async (image) => {
                return await deleteFileFromS3(image.filename);
            }),
        );

        const params = {
            TableName: process.env.DYNAMO_TABLE_NAME,
            Key: { id: postId },
        };

        const command = new DeleteCommand(params);
        const response = await docClient.send(command);

        if (response.$metadata.httpStatusCode !== 200) {
            throw new Error(`There was an issue deleting the post statusCode:${response.$metadata.httpStatusCode}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify(response),
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'There was an error deleting posts from dynamodb' }),
        };
    }
};
