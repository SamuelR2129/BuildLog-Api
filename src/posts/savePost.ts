import 'source-map-support/register';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { utcToZonedTime } from 'date-fns-tz';
import { z } from 'zod';

type NewItem = {
    id: string;
    createdAt: string;
    name: string;
    hours: string;
    costs: string;
    report: string;
    buildSite: string;
    imageNames?: string[];
};
const MakePostSchema = z.object({
    name: z.string(),
    hours: z.string(),
    costs: z.string(),
    report: z.string(),
    buildSite: z.string(),
    imageNames: z.string().array().optional(),
});

type MakePost = z.infer<typeof MakePostSchema>;

export const isPostBodyValid = (unknown: unknown): unknown is MakePost => {
    MakePostSchema.parse(unknown);
    return true;
};

const s3 = new S3Client({ region: process.env.REGION_NAME });
const client = new DynamoDBClient({ region: process.env.REGION_NAME });
const docClient = DynamoDBDocumentClient.from(client);

export const getUploadImageUrl = async (image: string): Promise<string> => {
    console.log('Getting the s3 upload urls');

    const command = new PutObjectCommand({
        Key: image,
        Bucket: process.env.S3_BUCKET_NAME,
    });

    const imageUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    if (!imageUrl) {
        throw new Error('Image upload url from s3 returned null/undefined');
    }

    return imageUrl;
};

export const save_post_to_dynamodb = async (event: APIGatewayProxyEvent) => {
    try {
        console.log('Starting save_post_to_dynamodb');

        const parsedBody = JSON.parse(event.body);

        if (!isPostBodyValid(parsedBody)) throw new Error();

        const imageUrls =
            parsedBody.imageNames &&
            (await Promise.all(
                parsedBody?.imageNames?.map(async (image) => {
                    return await getUploadImageUrl(image);
                }),
            ));

        const newItem: NewItem = {
            id: randomUUID(),
            name: parsedBody.name,
            hours: parsedBody.hours,
            costs: parsedBody.costs,
            report: parsedBody.report,
            buildSite: parsedBody.buildSite,
            createdAt: utcToZonedTime(new Date(), 'Australia/Sydney').toISOString(),
        };

        if (parsedBody.imageNames) {
            newItem.imageNames = parsedBody.imageNames;
        }

        const command = new PutCommand({
            TableName: process.env.DYNAMO_TABLE_NAME,
            Item: newItem,
        });

        const response = await docClient.send(command);

        if (response?.$metadata?.httpStatusCode !== 200) {
            throw new Error('Failed to upload post to dynamoDB');
        }

        const body = {
            newPost: newItem,
            imageUploadUrls: imageUrls,
            responseData: response,
        };

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
            },
            body: JSON.stringify(body),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
            },
            body: JSON.stringify({ message: 'There was an error saving post to dynamodb' }),
        };
    }
};
