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
    eventEmitter.on('timex', async (data) => {
        // since the liveObject timexed, it is not loger valid.
        console.log("liveObject timexed", liveObjects);
        // we must save it and remove it from the liveObjects array.
        // so lets find it
        const targetRecord = await liveObjects.filter((r: LiveObject) => r.client == data.client && r.id == data.id)[0];
        // remove the target record from the list
        liveObjects.splice(liveObjects.indexOf(targetRecord), 1);
        // const flat = targetRecord.flatten();
         console.log("Object Checked back in", liveObjects);
        io.emit('record-cleanup', targetRecord.simple());
        console.log("-------------------------------------");
    })
    console.log(" ");
    console.log("🔗🟢 A user connected to socket", socket.id);
    await activeUsers.push(socket.id)
    console.log("activeUsers after connection", activeUsers);

    // send to all clients
    console.log("notifying all users of new connection");
    // sleep for 3 seconds
    await new Promise(r => setTimeout(r, 3000));
    await io.emit('user-announce', activeUsers);
    console.log("All users notified");
    socket.on('seed-request', async () => {

        console.log('IO: ' + `seed request from ${socket.id}`);
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
            console.log('IO: ' + `edit request from ${socket.id}`);
            console.log("for record #", id);
            console.log("-------------------------------------");
            // A client can only be editing one record at a time.

            //is the client already editing a record?
            console.log("liveobjects", liveObjects);
            const openRecord = liveObjects.filter((r: LiveObject) => r.client == socket.id)[0];
            if (openRecord) {
                // we must close the open record before we can edit a new one.
                console.log("Found an open record", openRecord);
                if (openRecord.id === id) {
                    console.log("We are already editing that record, do nothing.");
                    return
                }
                else {
                    console.log("We are editing a different record, close the open record.");

                    const flat = openRecord.flatten();
                    console.log("saved the record", flat);
                    io.emit('record-notify', openRecord);
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
    socket.on("disconnect", (reason) => {
        console.log("🔗🔴 A user disconnected from socket", socket.id, reason);
        // remove the socket id from the activeUsers array
        console.log("activeUsers before splice", activeUsers);
        activeUsers.splice(activeUsers.indexOf(socket.id), 1);
        console.log("activeUsers after splice", activeUsers);
        //send to all users
        io.emit('user-announce', activeUsers);
    });
});




// attach the logging middleware to the app
// app.use(serverLog);
// serve the static files from the public folder
app.use(express.static('public'));

// serve the compiled javascrip files as static files from the dist folder
app.use("/js", express.static('dist/js'));

app.get('/', (req: Request, res: Response) => {
    // send the HTML version of our template to the browser
    res.render('pages/edit');
});


// app.get('/api/seed', async (req: Request, res: Response) => {
//     // send the database data to the browser.
//     try {
//         const data = await readAll()
//         res.json(data);

//     } catch (error) {
//         console.log(error);
//         res.json([]);
//     }




// });




httpServer.listen(port, () => {
    //launch the backend and log it
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});