import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { utcToZonedTime } from 'date-fns-tz';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mapTableData, subtractDaysFromWeek } from './utilsTableData';

export type TableData = {
    id: string;
    name: string;
    costs: string;
    hours: string;
    createdAt: string;
};

export type DynamoDb = {
    Items: TableData[];
};

export const isTablePostsFromDBValid = (unknownData: DynamoDb | unknown): unknownData is DynamoDb => {
    const postsFromDB = unknownData as DynamoDb;
    return postsFromDB && postsFromDB.Items !== undefined && Array.isArray(postsFromDB.Items);
};

const client = new DynamoDBClient({ region: process.env.REGION_NAME });
const docClient = DynamoDBDocumentClient.from(client);

export const get_table_data = async (event: APIGatewayProxyEvent) => {
    try {
        const currentDay = utcToZonedTime(new Date(), 'Australia/Sydney');
        const pastDate = subtractDaysFromWeek(currentDay);

        const params = {
            TableName: process.env.DYNAMO_TABLE_NAME,
            FilterExpression: '#createdAt BETWEEN :pastDate AND :currentDay',
            ExpressionAttributeNames: {
                '#createdAt': 'createdAt',
            },
            ExpressionAttributeValues: {
                ':pastDate': pastDate.previousDaysAndWeek.toISOString(),
                ':currentDay': currentDay.toISOString(),
            },
        };

        const response = await docClient.send(new ScanCommand(params));

        if (!isTablePostsFromDBValid(response)) {
            throw new Error('Getting posts from DB there is a undefined/null value');
        }

        const weeklyMappedData = mapTableData(response.Items, pastDate.previousDays);

        return {
            statusCode: 200,
            body: JSON.stringify(weeklyMappedData),
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'There was an error updating post in dynamodb' }),
        };
    }
};
