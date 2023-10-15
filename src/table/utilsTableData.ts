import { TableData } from './getTableData';

export type DataMappedToDay = {
    monday: TableData[];
    tuesday: TableData[];
    wednesday: TableData[];
    thursday: TableData[];
    friday: TableData[];
    saturday: TableData[];
    sunday: TableData[];
};

export type UserCosts = {
    [key: string]: {
        costs: number;
    };
};

export type UserHours = {
    [key: string]: {
        hours: number;
    };
};

export type WeeklyMappedData = {
    weeklyData: DataMappedToDay;
    overallCosts: UserCosts;
    overallHours: UserHours;
};

export const sortDataByWeek = (postData: TableData[], previousDays: Date) => {
    const first: TableData[] = [];
    const second: TableData[] = [];

    postData.forEach((post) => {
        const objDate = new Date(post.createdAt);

        if (objDate < previousDays) {
            first.push(post);
        } else {
            second.push(post);
        }
    });

    return [first, second];
};

export const sortDataByDay = (data: TableData[]): DataMappedToDay => {
    //Mon: 1, Tues: 2, Wed: 3, Thur: 4, Fri: 5, Sat: 6, Sun: 0
    const dayGroups: DataMappedToDay = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
    };

    for (const post of data) {
        const postDay = new Date(post.createdAt).getDay();

        switch (postDay) {
            case 0:
                dayGroups.sunday.push(post);
                break;

            case 1:
                dayGroups.monday.push(post);
                break;

            case 2:
                dayGroups.tuesday.push(post);
                break;

            case 3:
                dayGroups.wednesday.push(post);
                break;

            case 4:
                dayGroups.thursday.push(post);
                break;

            case 5:
                dayGroups.friday.push(post);
                break;

            case 6:
                dayGroups.saturday.push(post);
                break;

            default:
                throw new Error('A number that is not a day was given to the tableData switch');
        }
    }

    return dayGroups;
};

export const addValuesTogether = (postValues: TableData[]): TableData[] => {
    const duplicatePosts = postValues.map((element) => {
        const matchingElements = postValues.filter((el) => el.name === element.name);

        const totalCost = matchingElements.reduce((acc, el) => acc + +el.costs, 0);

        const totalHours = matchingElements.reduce((acc, el) => acc + +el.hours, 0);

        return {
            id: element.id,
            postId: element.postId,
            name: element.name,
            createdAt: element.createdAt,
            costs: totalCost.toString(),
            hours: totalHours.toString(),
        };
    });

    //remove duplicates created by above algo
    return duplicatePosts.filter(
        (post, index) => duplicatePosts.findIndex((item) => item.name === post.name) === index,
    );
};

export const addDailyUserEntriesTogether = (data: DataMappedToDay): DataMappedToDay => {
    return {
        monday: addValuesTogether(data.monday),
        tuesday: addValuesTogether(data.tuesday),
        wednesday: addValuesTogether(data.wednesday),
        thursday: addValuesTogether(data.thursday),
        friday: addValuesTogether(data.friday),
        saturday: addValuesTogether(data.saturday),
        sunday: addValuesTogether(data.sunday),
    };
};

export const addUpHowMuchUserSpent = (data: TableData[]): UserCosts => {
    const finalSums: UserCosts = {};

    for (const post of data) {
        let builtCosts: TableData | { name: string; costs: string };

        if (!post.name) {
            throw new Error('No name on post when adding up costs');
        }

        if (post.costs === '' || !post.costs) {
            builtCosts = {
                name: post.name,
                costs: '0',
            };
        } else {
            builtCosts = post;
        }

        if (!finalSums[builtCosts.name]) {
            finalSums[builtCosts.name] = { costs: +builtCosts.costs };
        } else {
            finalSums[builtCosts.name].costs = +finalSums[builtCosts.name].costs + +builtCosts.costs;
        }
    }
    return finalSums;
};

export const addUpHowManyHoursWorked = (data: TableData[]): UserHours => {
    const finalSums: UserHours = {};

    for (const post of data) {
        let builtHours: TableData | { name: string; hours: string };

        if (!post.name) {
            throw new Error('No name on post when adding up hours worked');
        }

        if (post.hours === '' || !post.hours) {
            builtHours = {
                name: post.name,
                hours: '0',
            };
        } else {
            builtHours = post;
        }

        if (!finalSums[builtHours.name]) {
            finalSums[builtHours.name] = { hours: +builtHours.hours };
        } else {
            finalSums[builtHours.name].hours = +finalSums[builtHours.name].hours + +builtHours.hours;
        }
    }

    return finalSums;
};

export const mapTableData = (postData: TableData[], previousDays: Date): WeeklyMappedData[] => {
    const dataByWeek = sortDataByWeek(postData, previousDays);

    return dataByWeek.map((oneWeeksData): WeeklyMappedData => {
        const dataByDay = sortDataByDay(oneWeeksData);

        const weeklyData = addDailyUserEntriesTogether(dataByDay);

        const overallCosts = addUpHowMuchUserSpent(oneWeeksData);

        const overallHours = addUpHowManyHoursWorked(oneWeeksData);

        return {
            weeklyData,
            overallCosts,
            overallHours,
        };
    });
};

export const subtractDaysFromWeek = (currentDay: Date) => {
    const currentDayOfWeek = currentDay.getDay();
    const daysToSubtract = (currentDayOfWeek + 6) % 7; // Calculate the number of days to subtract inside a 7 day modulo

    const previousDays = new Date(currentDay);
    previousDays.setDate(currentDay.getDate() - daysToSubtract);

    const previousDaysAndWeek = new Date(previousDays.getTime() - 7 * 24 * 60 * 60 * 1000);

    return { previousDaysAndWeek, previousDays };
};
