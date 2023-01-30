import fs from 'fs';

export interface DBRecord {
    id: string;
    label: string;
}

// create a class for live objects
export class LiveObject {
    id: string;
    label: string;
    isLive: boolean;
    lastUpdated: Date;
    client: string;
    constructor(record: DBRecord, socketId: string) {
        this.id = record.id;
        this.label = record.label;
        this.isLive = true;
        this.lastUpdated = new Date();
        this.client = socketId;
    }
    flatten() {
        const flat = {
            id: this.id,
            label: this.label
        }
        saveDBRecord(flat)
        return flat;

    }
}

export const readAll = async () => {
    // use fs to read fakeDB.json
    console.log("🛢️  Reading all records from the db");
    const data = await fs.promises.readFile('./fakeDB.json', 'utf-8');
    return JSON.parse(data);

}


export const readById = async (id: string) => {
    // use fs to read fakeDB.json
    console.log(`🛢️  Reading record #${id} from the db`);
    const data = await fs.promises.readFile('./fakeDB.json', 'utf-8');
    const records = JSON.parse(data);
    return records.filter((r: DBRecord) => r.id == id)[0];
}

export const saveDBRecord = async (record: DBRecord) => {
    // use fs to read fakeDB.json
    console.log(`🛢️  Saving record #${record.id} to the db`);
    const data = await fs.promises.readFile('./fakeDB.json', 'utf-8');
    const records = JSON.parse(data);
    const index = records.findIndex((r: DBRecord) => r.id == record.id);
    records[index] = record;
    try {
        await fs.promises.writeFile('./fakeDB.json', JSON.stringify(records, null, 2));

        return true
    } catch (error) {
        console.log(error);
        return false;

    }

}
export const createLiveObject = (record: DBRecord, socketId: string) => {
    // create a live object
    console.log("🔥 Creating a live object");
    const liveRecord = new LiveObject(record, socketId);
    return liveRecord;
}

export const saveLiveObject = async (liveRecord: LiveObject) => {
    // save the data out of hte live object to the database 
    console.log("🔥 Saving a live object");
    // flatten the live object
    const flatRecord = liveRecord.flatten();
    // write the record to the database
    return await saveDBRecord(flatRecord);
}