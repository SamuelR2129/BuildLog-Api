import { APIGatewayProxyEvent } from 'aws-lambda';
import 'source-map-support/register';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

export type PostFromDB = {
    _id: string;
    name: string;
    report: string;
    buildSite: string;
    createdAt: string;
    imageNames?: string[];
    imageUrls?: string[];
};

export type DynamoDb = {
    Items: PostFromDB[];
    LastEvaluatedKey: object;
};

export const isPostsFromDBValid = (unknownData: DynamoDb | unknown): unknownData is DynamoDb => {
    const postsFromDB = unknownData as DynamoDb;
    return postsFromDB && postsFromDB.Items !== undefined && Array.isArray(postsFromDB.Items);
};

export const sortDatesNewestToOldest = (posts: PostFromDB[]): PostFromDB[] => {
    return posts.sort(
        (post1: PostFromDB, post2: PostFromDB) => Date.parse(post2.createdAt) - Date.parse(post1.createdAt),
    );
};

const client = new DynamoDBClient({ region: process.env.REGION_NAME });
const docClient = DynamoDBDocumentClient.from(client);

export const get_posts_from_dynamodb = async (event: APIGatewayProxyEvent) => {
    console.log('Starting get_posts_from_dynamodb');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const LastEvaluatedKey = event?.queryStringParameters?.LastEvaluatedKey as unknown as
        | Record<string, any>
        | undefined;

    try {
        const command = new ScanCommand({
            TableName: process.env.DYNAMO_TABLE_NAME,
            Limit: Number(event?.queryStringParameters?.limit) + 1,
            ExclusiveStartKey: LastEvaluatedKey,
        });

        const response = await docClient.send(command);

        if (!isPostsFromDBValid(response)) {
            throw new Error('Getting posts from DB there is a undefined/null value');
        }

        const mappedPosts = sortDatesNewestToOldest(response.Items);

        return {
            statusCode: 200,
            body: JSON.stringify(mappedPosts),
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'There was an error getting posts from dynamodb' }),
        };
    }
};
