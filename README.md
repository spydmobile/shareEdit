# shared edit demo

Some research and development is required to be sure that the Live Object Editing paradigm is the right one for IntelliFire. I am building a proof of concept live demo, of the entire concept. the work is quite simple compared to intellifire, but this prototype will show that live object editing is superior to old school form to database editing.

In short, editing a record instantiates a live aware object across the active userspace, so as user 1 edits, record 5, all other users and their system are aware of this, and keeps users informed and insures that a record can only be edited by one person at a time.

The code is here (https://github.com/spydmobile/shareEdit) and a full report will be made to the team when I complete this R&D so we can move forward.

## Screenshot

![app screenshot](public/images/app_screenshot.png)

## how it works.

First, this is done using sockets, [Socket IO](https://socket.io/) in fact. so its incredibly fast and there is no http round trips to the backend except the initial one to load the application

Second, this demo does not cover off every single use case, but does illustrate the principle quite nicely.

When a user loads the UI, a known current copy of the dataset is cached into the browser space. When a use edits a record , a flat db record is  checked out of the database into a live object, this live object is sent to the client to work on, this live object keeps all the browsers in the loop as you work, and when you are done, the love objects is flattened back into a typical DB record and saved back to the database. When the edit is complete, the new state of the record is sent to all users and their local cache is updated with the latest record.
