/* Telling the linter to ignore the `any` type. */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { Logger } from "tslog";
import { createServer } from "http";
import { readAll, readById, createLiveObject, DBRecord, LiveObject, eventEmitter } from './database'
import { Server } from "socket.io";

const fancyLogger = new Logger();
const liveObjects: any[] = []
const activeUsers: any[] = []

// load the environment variables from the .env file
dotenv.config();

// create a new express app and save it as "app"
const app: Express = express();

// create a http server from the express app
const httpServer = createServer(app);

// create a socket.io server from the http server
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});

// set the view engine to ejs
app.set('view engine', 'ejs');

const port = process.env.PORT;

/**
 * Optional logging middleware.
 */
function serverLog(req: Request, res: Response, next: NextFunction) {
    // the logger suppoers classes:
    // silly, trace, debug, info, warn, error, fatal
    // is is colored different
    console.log('=============================');
    console.log('time: ' + new Date().toLocaleString());
    console.log('%s %s', req.method, req.url);
    console.log('connection from: ' + req.ip);
    console.log("ROUTE:", req.originalUrl)


    return next()
}

// setup the io handler
io.on("connection", async (socket) => {
    console.log("IO-I: 🟢🔗 A user connected to socket", socket.id);
    eventEmitter.on('timex', async (data) => {
        // since the liveObject timexed, it is not loger valid.
        console.log(`liveObject ${data.label} timexed, there are now`, liveObjects.length, "live Objects");
        // we must save it and remove it from the liveObjects array.
        // so lets find it
        const targetRecord = await liveObjects.filter((r: LiveObject) => r.client == data.client && r.id == data.id)[0];
        // remove  targetRecord record from the liveObjects array
        if (typeof targetRecord !== 'undefined') {
            liveObjects.splice(liveObjects.indexOf(targetRecord), 1);
            console.log("Object Checked back in, there are now", liveObjects.length, "live Objects");
           io.emit('record-cleanup', targetRecord.simple());
           console.log("IO-O:🧹 record-cleanup");
           console.log("-------------------------------------");
           return
        } else {
            console.log("Object not found, there are ", liveObjects.length, "live Objects");
            console.log("-------------------------------------");
        }        
    
    })
    console.log(" ");
    
    await activeUsers.push(socket.id)
    console.log("activeUsers after connection", activeUsers.length);

    // send to all clients
    console.log("notifying all users of new connection");
    // sleep for 3 seconds
    await new Promise(r => setTimeout(r, 3000));
    await io.emit('user-announce', activeUsers);
    console.log("All users notified");
    socket.on('seed-request', async () => {

        console.log('IO-I: 🌱' + `seed request from ${socket.id}`);
        try {
            const data = await readAll()
            console.log("Sending data to client");
            socket.emit('seed-reply', data);

        } catch (error) {
            console.log(error);
            socket.emit('seed-reply', []);
        }
    })
    socket.on('edit-request', async (id) => {
        try {
            console.log('IO-I: ✍🏻' + `edit request from ${socket.id}`);
            console.log("for record #", id);
            console.log("-------------------------------------");
            // A client can only be editing one record at a time.

            //is the client already editing a record?
            console.log("total liveobjects", liveObjects.length);
            const openRecord = liveObjects.filter((r: LiveObject) => r.client == socket.id)[0];
            if (openRecord) {
                // we must close the open record before we can edit a new one.
                console.log("Found an open record", openRecord.label);
                if (openRecord.id === id) {
                    console.log("We are already editing that record, do nothing.");
                    // reset the timex
                    return
                }
                else {
                    console.log("We are editing a different record, close the open record.");
                    if (openRecord.beenEdited) {
                        const flat = openRecord.flatten();
                        console.log("saved the record", flat);
                        io.emit('record-notify', openRecord);
                        
                        
                        // remove  targetRecord record from the liveObjects array
                        liveObjects.splice(liveObjects.indexOf(openRecord), 1);
                        console.log("Object Checked back in, there are now", liveObjects.length, "live Objects");
                        io.emit('record-cleanup', openRecord.simple());






                    }
                    else {
                        console.log("record was not edited, no need to save");
                          // remove  targetRecord record from the liveObjects array
                          liveObjects.splice(liveObjects.indexOf(openRecord), 1);
                          console.log("Object Checked back in, there are now", liveObjects.length, "live Objects");
                          io.emit('record-cleanup', openRecord.simple());
                    }
                    console.log("-------------------------------------");
                }


            }
            else {
                console.log("No open record found", openRecord);
                console.log("check for a live record...");
            }








            //find one in the liveObjects array
            const liveRecord = liveObjects.filter((r: DBRecord) => r.id == id)[0];
            if (liveRecord) {
                console.log("Found a live record", liveRecord);
                console.log("-------------------------------------");
                // send the record to the user
                socket.emit('edit-reply', liveRecord);
                // notify all users
                io.emit('edit-notify', liveRecord);
                return;
            }

            else {
                const flatRecord = await readById(id);
                console.log("Found a flat record");
                const liveRecord = createLiveObject(flatRecord, socket.id);
                console.log("Created a live record");
                liveObjects.push(liveRecord);
                console.log("-------------------------------------");
                // send the record to the user
                socket.emit('edit-reply', liveRecord.simple());
                console.log("Sent the record to the user", liveRecord.simple());
                // notify all users
                io.emit('edit-notify', liveRecord.simple());
                console.log("Notified all users");
                return
            }



        } catch (error) {
            console.log("major error", error);
            socket.emit('edit-reply', { id: "" });
            return
        }
    })
    socket.on('edit-action', async (id) => {
        try {
            console.log('IO-I: 💬 ' + `edit Action from ${socket.id}`);
            console.log("for record #", id);
            console.log("-------------------------------------");
            // A client can only be editing one record at a time.

            //is the client already editing a record?
            console.log("total liveobjects", liveObjects.length);
            const openRecord = liveObjects.filter((r: LiveObject) => r.client == socket.id && r.id == id)[0];
            if (openRecord) {
                //user is editing the record
                console.log("User is editing the record");
                // reset the timex on this record.
                openRecord.resetTimer()



            }


        } catch (error) {

            return
        }
    })
    socket.on('edit-save', async (data) => {
        try {
            console.log('IO-I: ✍🏻' + `edit save from ${socket.id}`);
            console.log("for record ", data);
            console.log("-------------------------------------");
            // A client can only be editing one record at a time.

            //is the client already editing a record?
            console.log("total liveobjects", liveObjects.length);
            const openRecord = liveObjects.filter((r: LiveObject) => r.client == socket.id)[0];
            if (openRecord) {
            
                console.log("Found an open record", openRecord.label);
                if (Number(openRecord.id) === Number(data.id)) {
                    console.log("We have the record, save it.");
                    
                    await openRecord.endTimer();
                    openRecord.beenEdited = true;
                    openRecord.label = data.label;
                    const final = openRecord.simple();
                    await openRecord.flatten();
                    console.log("final", final);
                    // send the record to the user
                    // socket.emit('edit-stop', final);
                    // // notify all users
                    // io.emit('edit-stop-notify', final);
                    io.emit('record-cleanup', final);
                    console.log("IO-O:🧹 record-cleanup");
                    console.log("-------------------------------------");
                    return

                }
   

            }
            else {
                console.log("No open record found", openRecord);
  
            }








        } catch (error) {
            console.log("major error", error);
            socket.emit('edit-reply', { id: "" });
            return
        }
    })
   
    socket.on("disconnect", (reason) => {
        console.log("IO-I: 🔴🔗 A user disconnected from socket", socket.id, reason);
        // remove the socket id from the activeUsers array
        console.log("activeUsers before splice", activeUsers);
        activeUsers.splice(activeUsers.indexOf(socket.id), 1);
        console.log("activeUsers after splice", activeUsers);
        //send to all users
        io.emit('user-announce', activeUsers);
    });
});




// attach the logging middleware to the app
// app.use(serverLog); // disabled during development
// serve the static files from the public folder
app.use(express.static('public'));

// serve the compiled javascript files as static files from the dist folder
app.use("/js", express.static('dist/js'));

// serves up the application at hte web root
app.get('/', (req: Request, res: Response) => {
    // send the HTML version of our template to the browser
    res.render('pages/edit');
});

/* Telling the server to listen on the port specified in the .env file. */

httpServer.listen(port, () => {
    //launch the backend and log it
    console.clear();
    console.log(`🔥[server]: Server is running at http://localhost:${port}`);
});