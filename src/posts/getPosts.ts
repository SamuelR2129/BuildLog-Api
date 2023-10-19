import { APIGatewayProxyEvent } from 'aws-lambda';
import 'source-map-support/register';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { utcToZonedTime } from 'date-fns-tz';

interface Params {
    TableName: string;
    KeyConditionExpression: string;
    ExclusiveStartKey?: { id: string; createdAt: string };
    FilterExpression?: string;
    ExpressionAttributeNames: {
        [key: string]: string;
    };
    ExpressionAttributeValues: {
        [key: string]: any;
    };
    ScanIndexForward: boolean;
    Limit: number;
}

const PostFromDBSchema = z.object({
    id: z.string(),
    postId: z.string(),
    name: z.string(),
    report: z.string(),
    buildSite: z.string(),
    createdAt: z.string(),
    imageNames: z.array(z.string()).optional(),
    imageUrls: z.array(z.string()).optional(),
});

const DynamoDbSchema = z.object({
    Items: z.array(PostFromDBSchema),
    LastEvaluatedKey: z.unknown(),
});

type DynamoDb = z.infer<typeof DynamoDbSchema>;
type PostFromDB = z.infer<typeof PostFromDBSchema>;

export const isPostsFromDBValid = (unknownData: unknown): unknownData is DynamoDb => {
    DynamoDbSchema.parse(unknownData);
    return true;
};

export const sortDatesNewestToOldest = (posts: PostFromDB[]): PostFromDB[] => {
    return posts.sort(
        (post1: PostFromDB, post2: PostFromDB) => Date.parse(post2.createdAt) - Date.parse(post1.createdAt),
    );
};

const getImageUrls = (posts: PostFromDB[]): PostFromDB[] => {
    return posts.map((post) => {
        if (!post.imageNames) {
            return post;
        }

        post.imageUrls = post.imageNames.map((imageName) => {
            return `${process.env.CLOUDFRONT_URL}${imageName}`;
        });

        return post;
    });
};

const client = new DynamoDBClient({ region: process.env.REGION_NAME });
const docClient = DynamoDBDocumentClient.from(client);

export const get_posts_from_dynamodb = async (event: APIGatewayProxyEvent) => {
    console.log('Starting get_posts_from_dynamodb');
    try {
        const LastEvaluatedKey = event.queryStringParameters.LastEvaluatedKey && {
            id: process.env.POST_ID,
            createdAt: event.queryStringParameters.LastEvaluatedKey,
        };

        const buildSite = event.queryStringParameters.buildSite;

        const params: Params = {
            TableName: process.env.DYNAMO_TABLE_NAME,
            KeyConditionExpression: '#id = :id AND #createdAt <= :date',
            Limit: Number(event?.queryStringParameters?.limit) + 1,
            ExclusiveStartKey: LastEvaluatedKey,
            ExpressionAttributeNames: {
                '#id': 'id',
                '#createdAt': 'createdAt',
            },
            ExpressionAttributeValues: {
                ':id': process.env.POST_ID,
                ':date': utcToZonedTime(new Date(), 'Australia/Sydney').toISOString(),
            },
            ScanIndexForward: false,
        };

        if (buildSite) {
            params.ExpressionAttributeNames['#buildSite'] = 'buildSite';
            params.ExpressionAttributeValues[':buildSiteKey'] = buildSite;
            params.FilterExpression = '#buildSite = :buildSiteKey';
        }

        const response = await docClient.send(new QueryCommand(params));

        if (!isPostsFromDBValid(response)) throw new Error();

        const mappedPosts = sortDatesNewestToOldest(response.Items);

        const postsWithImages = getImageUrls(mappedPosts);

        const scanBody = {
            LastEvaluatedKey: response.LastEvaluatedKey,
            posts: postsWithImages,
        };

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
            },
            body: JSON.stringify(scanBody),
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
            },
            body: JSON.stringify({ message: 'There was an error getting posts from dynamodb' }),
        };
    }
};
