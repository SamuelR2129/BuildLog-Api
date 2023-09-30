import 'source-map-support/register';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { utcToZonedTime } from 'date-fns-tz';
import * as parser from 'lambda-multipart-parser';

type MakePost = {
    name: string;
    hours: string;
    costs: string;
    report: string;
    buildSite: string;
    imageNames?: string[];
    files?: File[];
};

export const isPostBodyValid = (unknown: unknown): unknown is MakePost => {
    const body = unknown as MakePost;
    return (
        body &&
        body.name !== undefined &&
        body.costs !== undefined &&
        body.hours !== undefined &&
        body.report !== undefined
    );
};

const s3 = new S3Client({ region: process.env.REGION_NAME });
const client = new DynamoDBClient({ region: process.env.REGION_NAME });
const docClient = DynamoDBDocumentClient.from(client);

export const uploadImageToS3 = async (image: parser.MultipartFile): Promise<string> => {
    console.log('Starting the s3_image_uploader');

    const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Body: image.content,
        Key: image.filename,
        ContentType: 'image/png',
    };

    const uploadFileResult = await s3.send(new PutObjectCommand(uploadParams));

    if (!uploadFileResult || uploadFileResult?.$metadata?.httpStatusCode != 200) {
        throw new Error(
            `There was an issue uploading image to s3 - code: ${uploadFileResult?.$metadata.httpStatusCode}`,
        );
    }

    const command = new GetObjectCommand({
        Key: image.filename,
        Bucket: process.env.S3_BUCKET_NAME,
    });

    const imageUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    if (!imageUrl) {
        throw new Error('Image url path from s3 returned null/undefined');
    }

    return imageUrl;
};

export const save_post_to_dynamodb = async (event: APIGatewayProxyEvent) => {
    try {
        console.log('Starting save_post_to_dynamodb');

        const parsedBody = await parser.parse(event);

        if (!isPostBodyValid(parsedBody)) {
            throw new Error('The body to create a post is missing information');
        }

        const imageUrls = await Promise.all(
            parsedBody?.files?.map(async (image) => {
                return await uploadImageToS3(image);
            }),
        );

        const command = new PutCommand({
            TableName: process.env.DYNAMO_TABLE_NAME,
            Item: {
                id: randomUUID(),
                name: parsedBody.name,
                hours: parsedBody.hours,
                costs: parsedBody.costs,
                report: parsedBody.report,
                buildSite: parsedBody.buildSite,
                imageNames: parsedBody.imageNames || [],
                imageUrls: imageUrls || [],
                createdAt: utcToZonedTime(new Date(), 'Australia/Sydney').toISOString(),
            },
        });

        const response = await docClient.send(command);

        if (response?.$metadata?.httpStatusCode !== 200 || !response?.$metadata?.requestId) {
            throw new Error('Failed to upload post to dynamoDB');
        }

        return {
            statusCode: 200,
            body: JSON.stringify(response),
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'There was an error saving post to dynamodb' }),
        };
    }
};
