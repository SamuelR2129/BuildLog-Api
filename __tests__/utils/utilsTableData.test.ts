import { TableData } from '../../src/table/getTableData';
import {
    DataMappedToDay,
    addDailyUserEntriesTogether,
    addUpHowManyHoursWorked,
    addUpHowMuchUserSpent,
    addValuesTogether,
    sortDataByDay,
    sortDataByWeek,
    subtractDaysFromWeek,
} from '../../src/table/utilsTableData';

describe('subtractDaysFromWeek', () => {
    //Mon: 1, Tues: 2, Wed: 3, Thur: 4, Fri: 5, Sat: 6, Sun: 0

    it('returns the correct date when currentDay is a Sunday', () => {
        const currentDay = new Date('2023-07-02'); // Sunday
        const result = subtractDaysFromWeek(currentDay);
        expect(result.previousDays).toEqual(new Date('2023-06-26')); // Previous Monday
    });

    it('returns the correct date when currentDay is a Monday', () => {
        const currentDay = new Date('2023-07-03'); // Monday
        const result = subtractDaysFromWeek(currentDay);
        expect(result.previousDays).toEqual(new Date('2023-07-03')); // Returns Just Monday
    });

    it('returns the correct date when currentDay is a Tuesday', () => {
        const currentDay = new Date('2023-07-04'); // Tuesday
        const result = subtractDaysFromWeek(currentDay);
        expect(result.previousDays).toEqual(new Date('2023-07-03')); // Previous Monday
    });

    it('returns the correct date when currentDay is a Saturday', () => {
        const currentDay = new Date('2023-07-08'); // Saturday
        const result = subtractDaysFromWeek(currentDay);
        expect(result.previousDays).toEqual(new Date('2023-07-03')); // Previous Monday
    });

    it('returns the correct 2wk date when currentDay is a Saturday', () => {
        const currentDay = new Date('2023-07-02'); // Saturday
        const result = subtractDaysFromWeek(currentDay);
        expect(result.previousDaysAndWeek).toEqual(new Date('2023-06-19')); // Previous Monday
    });
});

describe('sortDataByDay', () => {
    it('should sort data by day correctly', () => {
        const data = [
            { createdAt: '2023-07-08'.toString() }, // Saturday
            { createdAt: '2023-06-26'.toString() }, // Monday
            { createdAt: '2023-07-04'.toString() }, // Tuesday
            { createdAt: '2023-07-02'.toString() }, // Sunday
            { createdAt: '2023-07-05'.toString() }, // Wednesday
            { createdAt: '2023-07-06'.toString() }, // Thursday
            { createdAt: '2023-07-07'.toString() }, // Friday
            { createdAt: '2023-07-10'.toString() }, // Monday (additional post)
            { createdAt: '2023-07-13'.toString() }, // Thursday (additional post)
        ] as TableData[];

        const result = sortDataByDay(data);

        expect(result.monday).toEqual([
            { createdAt: '2023-06-26' }, // Monday
            { createdAt: '2023-07-10' }, // Monday (additional post)
        ]);
        expect(result.tuesday).toEqual([
            { createdAt: '2023-07-04' }, // Tuesday
        ]);
        expect(result.wednesday).toEqual([
            { createdAt: '2023-07-05' }, // Wednesday
        ]);
        expect(result.thursday).toEqual([
            { createdAt: '2023-07-06' }, // Thursday
            { createdAt: '2023-07-13' }, // Thursday (additional post)
        ]);
        expect(result.friday).toEqual([
            { createdAt: '2023-07-07' }, // Friday
        ]);
        expect(result.saturday).toEqual([
            { createdAt: '2023-07-08' }, // Saturday
        ]);
        expect(result.sunday).toEqual([
            { createdAt: '2023-07-02' }, // Sunday
        ]);
    });

    it('should handle an empty data array', () => {
        const data: TableData[] = [];
        const result = sortDataByDay(data);

        expect(result).toEqual({
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
        });
    });
});

describe('addUpHowMuchUserSpent', () => {
    test('should return an empty object if the input data is empty', () => {
        const data = [] as TableData[];
        const result = addUpHowMuchUserSpent(data);
        expect(result).toEqual({});
    });

    test('should correctly calculate the total costs for each user', () => {
        const data = [
            { name: 'John', costs: '10' },
            { name: 'Jane', costs: '20' },
            { name: 'John', costs: '15' },
            { name: 'Jane', costs: '5' },
            { name: 'Bob', costs: '30' },
        ] as TableData[];
        const result = addUpHowMuchUserSpent(data);
        expect(result).toEqual({
            John: { costs: 25 },
            Jane: { costs: 25 },
            Bob: { costs: 30 },
        });
    });

    test('should handle empty cost values correctly', () => {
        const data = [
            { name: 'John', costs: '' },
            { name: 'Jane', costs: '20' },
            { name: 'John', costs: '' },
            { name: 'Jane', costs: '5' },
            { name: 'Bob', costs: '30' },
        ] as TableData[];
        const result = addUpHowMuchUserSpent(data);
        expect(result).toEqual({
            John: { costs: 0 },
            Jane: { costs: 25 },
            Bob: { costs: 30 },
        });
    });

    test('should handle missing cost values correctly', () => {
        const data = [
            { name: 'John' },
            { name: 'Jane', costs: '20' },
            { name: 'John' },
            { name: 'Jane', costs: '5' },
            { name: 'Bob', costs: '30' },
        ] as TableData[];
        const result = addUpHowMuchUserSpent(data);
        expect(result).toEqual({
            John: { costs: 0 },
            Jane: { costs: 25 },
            Bob: { costs: 30 },
        });
    });
});

describe('addUpHowManyHoursWorked', () => {
    it('should return an empty object if no data is provided', () => {
        const result = addUpHowManyHoursWorked([]);
        expect(result).toEqual({});
    });

    it('should correctly sum the hours worked for each user', () => {
        const data = [
            { name: 'John', hours: '2' },
            { name: 'Jane', hours: '3' },
            { name: 'John', hours: '1' },
        ] as TableData[];

        const result = addUpHowManyHoursWorked(data);
        expect(result).toEqual({ John: { hours: 3 }, Jane: { hours: 3 } });
    });

    it('should handle empty or undefined hours correctly', () => {
        const data = [
            { name: 'John', hours: '2' },
            { name: 'Jane', hours: '' },
            { name: 'John', hours: undefined },
            { name: 'Jane', hours: '1' },
        ] as TableData[];

        const result = addUpHowManyHoursWorked(data);
        expect(result).toEqual({ John: { hours: 2 }, Jane: { hours: 1 } });
    });

    it('should handle initial undefined hours correctly', () => {
        const data = [
            { name: 'John', hours: '2' },
            { name: 'Jane', hours: '3' },
            { name: 'John', hours: '1' },
            { name: 'Jane', hours: '1' },
        ] as TableData[];

        const result = addUpHowManyHoursWorked(data);
        expect(result).toEqual({ John: { hours: 3 }, Jane: { hours: 4 } });
    });
});

describe('addValuesTogether', () => {
    test('should update array elements with total cost and hours, removing duplicates', () => {
        const inputArray = [
            {
                postId: '1',
                name: 'A',
                createdAt: '2022-02-02',
                costs: '5',
                hours: '2',
            },
            {
                postId: '2',
                name: 'B',
                createdAt: '2022-02-02',
                costs: '10',
                hours: '3',
            },
            {
                postId: '3',
                name: 'A',
                createdAt: '2022-02-02',
                costs: '3',
                hours: '1',
            },
            {
                postId: '4',
                name: 'C',
                createdAt: '2022-02-02',
                costs: '8',
                hours: '4',
            },
        ] as TableData[];

        const expectedArray = [
            {
                postId: '1',
                name: 'A',
                createdAt: '2022-02-02',
                costs: '8',
                hours: '3',
            },
            {
                postId: '2',
                name: 'B',
                createdAt: '2022-02-02',
                costs: '10',
                hours: '3',
            },
            {
                postId: '4',
                name: 'C',
                createdAt: '2022-02-02',
                costs: '8',
                hours: '4',
            },
        ];

        const updatedArray = addValuesTogether(inputArray);

        expect(updatedArray).toEqual(expectedArray);
    });

    test('should return an empty array for an empty input array', () => {
        const inputArray = [] as TableData[];

        const updatedArray = addValuesTogether(inputArray);

        expect(updatedArray).toEqual([]);
    });

    test('should not modify the original input array', () => {
        const inputArray = [
            { postId: '1', name: 'A', createdAt: new Date().toString(), costs: '5', hours: '2' },
            { postId: '2', name: 'B', createdAt: new Date().toString(), costs: '10', hours: '3' },
        ] as TableData[];

        const originalArray = [...inputArray];

        addValuesTogether(inputArray);

        expect(inputArray).toEqual(originalArray);
    });
});

describe('addDailyUserEntriesTogether', () => {
    const mockData: DataMappedToDay = {
        monday: [
            {
                id: '1',
                postId: '1',
                name: 'Entry 1',
                createdAt: new Date().toString(),
                costs: '10',
                hours: '2',
            },
            {
                id: '1',
                postId: '2',
                name: 'Entry 2',
                createdAt: new Date().toString(),
                costs: '15',
                hours: '3',
            },
            {
                id: '1',
                postId: '1',
                name: 'Entry 1',
                createdAt: new Date().toString(),
                costs: '20',
                hours: '3',
            },
        ],
        tuesday: [
            {
                id: '1',
                postId: '3',
                name: 'Entry 3',
                createdAt: new Date().toString(),
                costs: '20',
                hours: '4',
            },
            {
                id: '1',
                postId: '4',
                name: 'Entry 4',
                createdAt: new Date().toString(),
                costs: '25',
                hours: '5',
            },
        ],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
    };

    const expectedOutput: DataMappedToDay = {
        monday: [
            {
                id: '1',
                postId: '1',
                name: 'Entry 1',
                createdAt: expect.any(String),
                costs: '30',
                hours: '5',
            },
            {
                id: '1',
                postId: '2',
                name: 'Entry 2',
                createdAt: expect.any(String),
                costs: '15',
                hours: '3',
            },
        ],
        tuesday: [
            {
                id: '1',
                postId: '3',
                name: 'Entry 3',
                createdAt: expect.any(String),
                costs: '20',
                hours: '4',
            },
            {
                id: '1',
                postId: '4',
                name: 'Entry 4',
                createdAt: expect.any(String),
                costs: '25',
                hours: '5',
            },
        ],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
    };

    it('should add the values of costs and hours for each unique name', () => {
        const result = addDailyUserEntriesTogether(mockData);
        expect(result).toEqual(expectedOutput);
    });
});

describe('sortDataByWeek', () => {
    it('should correctly separate data into two arrays based on createdAt', () => {
        const previousDays = new Date('2023-09-20');
        const postData: TableData[] = [
            {
                id: '1',
                postId: '1',
                name: 'Item 1',
                costs: '10',
                hours: '2',
                createdAt: '2023-09-15',
            },
            {
                id: '2',
                postId: '2',
                name: 'Item 2',
                costs: '15',
                hours: '3',
                createdAt: '2023-09-25',
            },
        ];

        const result = sortDataByWeek(postData, previousDays);

        // The first array should contain items with createdAt < previousDays
        expect(result[0]).toEqual([
            {
                id: '1',
                name: 'Item 1',
                costs: '10',
                hours: '2',
                createdAt: '2023-09-15',
            },
        ]);

        // The second array should contain items with createdAt >= previousDays
        expect(result[1]).toEqual([
            {
                id: '2',
                name: 'Item 2',
                costs: '15',
                hours: '3',
                createdAt: '2023-09-25',
            },
        ]);
    });

    it('should handle an empty input array', () => {
        const previousDays = new Date('2023-09-20');
        const postData: TableData[] = [];

        const result = sortDataByWeek(postData, previousDays);

        expect(result[0]).toEqual([]);
        expect(result[1]).toEqual([]);
    });
});
