import 'source-map-support/register';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

type DeleteBody = {
    imageNames?: string[];
};

const dynamoClient = new DynamoDBClient({ region: process.env.REGION_NAME });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.REGION_NAME });
const cloudfrontClient = new CloudFrontClient({ region: process.env.REGION_NAME });

export const deleteFileFromS3 = async (imageName: string): Promise<void> => {
    try {
        const command = new DeleteObjectCommand({
            Key: imageName,
            Bucket: process.env.S3_BUCKET_NAME,
        });

        const response = await s3Client.send(command);

        if (response.$metadata.httpStatusCode != 204) {
            throw new Error(
                `There was an issue deleting image at s3 - code: ${response?.$metadata.httpStatusCode}, result:${response} `,
            );
        }

        const invalidationParams = {
            DistributionId: process.env.CLOUDFRONT_DIST_ID,
            InvalidationBatch: {
                CallerReference: imageName,
                Paths: {
                    Quantity: 1,
                    Items: [`/${imageName}`],
                },
            },
        };

        await cloudfrontClient.send(new CreateInvalidationCommand(invalidationParams));
    } catch (err) {
        throw err;
    }
};

export const delete_post_from_dynamodb = async (event: APIGatewayProxyEvent) => {
    console.log('Starting delete_post_from_dynamodb');
    try {
        const parsedBody: DeleteBody = JSON.parse(event.body);
        const createdAt = event.pathParameters.postId;

        if (!createdAt) {
            throw new Error('Id or createdAt is missing from path');
        }

        parsedBody.imageNames &&
            (await Promise.all(
                parsedBody.imageNames.map(async (image) => {
                    await deleteFileFromS3(image);
                }),
            ));

        const params = {
            TableName: process.env.DYNAMO_TABLE_NAME,
            Key: { id: process.env.POST_ID, createdAt },
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
        console.error(err);
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
