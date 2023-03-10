
import fs from 'fs';
import events from 'events';
export const eventEmitter = new events.EventEmitter();
export interface DBRecord {
    id: string;
    label: string;
}

export interface SimpleLiveObject {
    id: string;
    label: string;
    isLive: boolean;
    beenEdited: boolean;
    lastUpdated: Date;
    client: string;
}



/* The LiveObject class is a class that represents a live object */
export class LiveObject {

    private handler?: ReturnType<typeof setTimeout>;
    id: string;
    label: string;
    isLive: boolean;
    beenEdited: boolean;
    lastUpdated: Date;
    client: string;
    constructor(record: DBRecord, socketId: string) {
        this.id = record.id;
        this.label = record.label;
        this.isLive = true;
        this.beenEdited = false
        this.lastUpdated = new Date();
        this.client = socketId;
        this.startTimer();
    }
/**
 * It takes the id and label of the object and saves it to the database.
 * @returns The flat object is being returned.
 */
    flatten() {
        const flat = {
            id: this.id,
            label: this.label
        }
        if (!this.beenEdited) saveDBRecord(flat)
        return flat;

    }
/**
 * It returns a new object with the same properties as the current object, but with the client property
 * removed
 * @returns An object with the id, label, isLive, lastUpdated, and client properties.
 */
    simple() {
        return {
            id: this.id,
            label: this.label,
            isLive: this.isLive,
            beenEdited: this.beenEdited,
            lastUpdated: this.lastUpdated,
            client: this.client
        }
    }
    
    /**
     * The function starts a timer, and when the timer expires, it emits an event
     */
    startTimer() {
        console.log(`startedTimex for ${this.label}`);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        this.handler = setTimeout(function () {
            console.log("Live Object Timexed");
            // create an event
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const eventData:any = self.simple();
            console.log(`firing timex event for ${eventData.label}`);
            eventEmitter.emit('timex', eventData)



        }, 30000);
    }

/**
 * If the user is editing, reset the timer.
 * 
 */
    async resetTimer() {
        console.log(`resetting timer for record #${this.id} ${this.label}`);
        await clearTimeout(this.handler);
  
       await this.startTimer();
       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
       //@ts-ignore
       console.log("LiveObject",this.handler?._idleStart);
       return
    }
    
/**
 * Deactivate the timer
 * 
 */
    endTimer() {
        console.log(`stopping timer for record #${this.id} ${this.label}`);
        return clearTimeout(this.handler);
    }
      
}

/**
 * It reads the contents of the database/fakeDB.json file and returns the parsed JSON data
 * @returns An array of objects
 */
export const readAll = async () => {
    // use fs to read database/fakeDB.json
    console.log("???????  Reading all records from the db");
    const data = await fs.promises.readFile('./database/fakeDB.json', 'utf-8');
    return JSON.parse(data);

}


/**
 * It reads the database/fakeDB.json file, parses it into a JavaScript object, and returns the record with the
 * matching id
 * @param {string} id - string - the id of the record we want to read
 * @returns The first record that matches the id
 */
export const readById = async (id: string) => {
    // use fs to read database/fakeDB.json
    console.log(`???????  Reading record #${id} from the db`);
    const data = await fs.promises.readFile('./database/fakeDB.json', 'utf-8');
    const records = JSON.parse(data);
    return records.filter((r: DBRecord) => r.id == id)[0];
}

/**
 * It reads the database/fakeDB.json file, parses the JSON, finds the record with the same id as the record
 * passed in, updates the record, and then writes the updated records back to the file
 * @param {DBRecord} record - DBRecord - this is the record that we want to save to the database.
 * @returns A promise that resolves to a boolean
 */
export const saveDBRecord = async (record: DBRecord) => {
    // use fs to read database/fakeDB.json
    console.log(`???????  Saving record #${record.id} to the db`);
    const data = await fs.promises.readFile('./database/fakeDB.json', 'utf-8');
    const records = JSON.parse(data);
    const index = records.findIndex((r: DBRecord) => r.id == record.id);
    records[index] = record;
    try {
        await fs.promises.writeFile('./database/fakeDB.json', JSON.stringify(records, null, 2));

        return true
    } catch (error) {
        console.log(error);
        return false;

    }

}
/**
 * It takes a database record and a socket ID, and returns a live object
 * @param {DBRecord} record - The record from the database
 * @param {string} socketId - The socket id of the client that created the record.
 * @returns A live object
 */
export const createLiveObject = (record: DBRecord, socketId: string) => {
    // create a live object
    console.log("???? Creating a live object");
    const liveRecord = new LiveObject(record, socketId);
    return liveRecord;
}

/**
 *  Save a live object to the database
 * @param {LiveObject} liveRecord - LiveObject - the live object to save
 * @returns A promise that resolves to the saved record
 */
export const saveLiveObject = async (liveRecord: LiveObject) => {
    // save the data out of hte live object to the database 
    console.log("???? Saving a live object");
    // flatten the live object
    const flatRecord = liveRecord.flatten();
    // write the record to the database
    return await saveDBRecord(flatRecord);
}