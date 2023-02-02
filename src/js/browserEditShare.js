



var MY_ID = null;

function loadData(socket) {
    return new Promise((resolve) => {
        console.log("loadData")
        try {
            console.log("Requesting to seed the cache from the server");
            socket.emit('seed-request');
            console.log("Requested:  waiting for data...");
            socket.on('seed-reply', (data) => {
                console.log("socket response received");
                console.log(data);
                resolve(data);
            });


        } catch (error) {
            console.log(error);
            resolve([])
        }
    });

}

function updateUiFromCache(cache, socket) {
    console.log("updateUiFromCache");
    // update the UI from the cache

    // render the records
    console.log("render the records");
    renderRecords(cache, socket);
    // clear the record viewer
    console.log("clear the record viewer");
    clearRecordViewer();

    // clear the editor
    console.log("clear the editor");
    clearEditor();
}
function clearRecordViewer() {
    console.log("clearRecordViewer");
    const ldoDisplay = document.getElementById('ldoDisplay');
    ldoDisplay.innerHTML = '';
}

function clearEditor() {
    console.log("clearEditor");
    const recordId = document.getElementById('recordId');
    recordId.value = '';
    const recordTitle = document.getElementById('recordTitle');
    recordTitle.value = '';
    const editorSave = document.getElementById('editorSave');
    editorSave.disabled = true;

}

function tidyActivity(data) {
    console.log("tidyActivity");
    const activity_list = document.getElementById('activity_list');
    const target = `Client ${data.client} is editing record #${data.id}`
    const message = `Client ${data.client} edited record #${data.id}`

    // filter the LI elements in the activity list
    // remove those that match target

    const listItems = activity_list.getElementsByTagName('li');
    for (let i = 0; i < listItems.length; i++) {
        if (listItems[i].innerHTML === target) {
            activity_list.removeChild(listItems[i]);
        }
    }
   // now lets add message but remove it after 30 seconds
   // but only if it is not already there
    const listItems2 = activity_list.getElementsByTagName('li');
    for (let i = 0; i < listItems2.length; i++) {
        if (listItems2[i].innerHTML === message) {
            return;
        }
    }


    const li = document.createElement('li');
    li.innerHTML = `${message}`;
    activity_list.appendChild(li);
    setTimeout(() => {
        activity_list.removeChild(li);
    }, 30000);

   
}

function renderRecord(label, id, socket) {
    console.log("renderRecord");
    // render the record
    const outerDiv = document.createElement('div');
    outerDiv.id = `record-${id}`;
    outerDiv.classList.add('db-record-button', 'w3-button', 'w3-padding-small', 'w3-bar', 'w3-border', 'w3-round-large');
    outerDiv.innerHTML = `    <i class="fa fa-car w3-bar-item vehicle w3-xlarge"></i>
    <div class="w3-bar-item">
        <span class="car-id">#${id}</span><span class="car-label">${label}</span>
    </div>`
    outerDiv.addEventListener('click', () => {
        editRecord(id, socket);

    }
    )
    return outerDiv;

}

function renderRecords(cache, socket) {
    console.log("renderRecords");
    // render the records
    const records = cache;
    console.log(records);
    const recordList = document.getElementById('record-list');
    recordList.innerHTML = ' <h3>Records</h3>';

    records.forEach(record => {
        const recordItem = renderRecord(record.label, record.id, socket);
        recordList.appendChild(recordItem);
    });
}


function editRecord(id, socket) {




    // edit the record
    return new Promise((resolve) => {
        console.log("editRecord", { id, socket });
        try {

            console.log("socketEmitEdit");
            socket.emit('edit-request', id)
            console.log("socketWaiting");
            socket.on('edit-reply', (data) => {
                console.log(data);
                // change the record button to indicate it is being edited.
                // disable the record button
                const recordButton = document.getElementById(`record-${data.id}`);
                recordButton.classList.add('w3-disabled', 'w3-purple');
                


                // place the record into the editor
                const recordId = document.getElementById('recordId');
                recordId.value = data.id;
                const recordTitle = document.getElementById('recordTitle');
                recordTitle.value = data.label;

                // enable the editor-save button
                const editorSave = document.getElementById('editorSave');
                editorSave.disabled = false;


                const ldoDisplay = document.getElementById('ldoDisplay');
                ldoDisplay.innerHTML = ""
                ldoDisplay.innerText = JSON.stringify(data, null, 2);



                resolve(data);
            });
            socket.on('record-cleanup', (data) => {
                console.log(data);
                clearEditor();
                clearRecordViewer();
                tidyActivity(data)
                const recordButton = document.getElementById(`record-${data.id}`);
                recordButton.classList.remove('w3-disabled', 'w3-purple');

                resolve(null);
            });

        } catch (error) {
            console.log(error);
            resolve({ id: false })
        }
    });

}


//aiife 
(async function () {
    const socket = io();


    // client-side

    socket.on("connect", async () => {
        console.log(`my socket ID is: ${socket.id}`);
        socket.onAny((event, ...{}) => {
            console.log(`Socket Event: got ${event}`);
          });
      
        console.log("ready for a connection");
        socket.on("user-announce", (list) => {
            console.log(`user-announce: ${list}`); // x8WIv7-mJelg7on_ALbx
            const user_list = document.getElementById('user_list');
            user_list.innerHTML = '';

            const li = document.createElement('li');
            li.innerHTML = `Our Browser is socket ID ${socket.id} and active`;
            user_list.appendChild(li);
            const notMeList = list.filter((id) => id !== socket.id);
            for (const clientId of notMeList) {
                const li = document.createElement('li');
                li.innerHTML = `socket ID ${clientId} is active`;
                user_list.appendChild(li);
            }
            // console.log(`socket ID ${socket.id} is active`); // x8WIv7-mJelg7on_ALbx
            //get element by id user_list

            // add an li element to the user_list

        });
        console.log("ready for user-announce");
        socket.on('edit-notify', (data) => {
            console.log("edit-notify", data);
            const activity_list = document.getElementById('activity_list');
            const message = `Client ${data.client} is editing record #${data.id}`;
            const recordButton = document.getElementById(`record-${data.id}`);
            recordButton.classList.add('w3-disabled', 'w3-grey');

            // check if the message is already in the activity list
            const listItems2 = activity_list.getElementsByTagName('li');
                for (let i = 0; i < listItems2.length; i++) {
                    if (listItems2[i].innerHTML === message) {
                        return;
                    }
                }


            const newLi = document.createElement('li');
            newLi.innerHTML = message;
            activity_list.appendChild(newLi);

        });
        console.log("ready for edit-notify");
        socket.on('record-notify', async (data) => {
            console.log("record-notify", data);
            if (data.isEdited) {
                console.log("record-notify isEdited",data);
                const activity_list = document.getElementById('activity_list');
                const message = `Client ${data.client} updated record #${data.id}`;
                await removeOldData(data.id, data.client, activity_list);
                const recordButton = document.getElementById(`record-${data.id}`);
                recordButton.classList.remove('w3-disabled', 'w3-grey');
                const newLi = document.createElement('li');
                newLi.innerHTML = message;
                activity_list.appendChild(newLi);
            }
            else {
                console.log("record-notify is not Edited",data);
                const activity_list = document.getElementById('activity_list');
                const message = `Client ${data.client} updated record #${data.id}`;
                await removeOldData(data.id, data.client, activity_list);
                const recordButton = document.getElementById(`record-${data.id}`);
                recordButton.classList.remove('w3-disabled', 'w3-grey');
            }

        });

        // wait 1 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));

        console.log("Loading data into the cache");
        // load the data from the server
        const cache = await loadData(socket);
        console.log("Updating the UI from the cache");
        updateUiFromCache(cache, socket);
    });




}
)();

function removeOldData(id, client, activity_list) {
    return new Promise((resolve) => {
        console.log("removeOldData", { id, client, activity_list });
        // the activity_list is the ul element
        // filter the elements and remove the ones that match the id and client
        let children = activity_list.children;
        children = Array.from(children);
        console.log({ children });
        children.forEach((child) => {
            console.log({ child });
            const idMatch = child.innerText.includes(id);
            const clientMatch = child.innerText.includes(client);
            if (idMatch && clientMatch) {
                activity_list.removeChild(child);
            }
            resolve();
        });
    })
}