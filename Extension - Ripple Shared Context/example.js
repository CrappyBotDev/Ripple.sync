/*

An example of how you might use Ripple.js

  "./Ripple_Shared_Environment" has been setup with generic Ripple classes, which have been customized in "Ripple_Customizations.js" to use chrome.storage.local as storage for synced Ripple_Objects
  
  this setup interacts with chrome.storage.local directly, rather than send messages to another page (or context) that
  would interact with storage on its behalf - that's why this is the "Ripple Shared Context" example
  ("Ripple Separate Context" is an example of how you might set up Ripple.js to communicate with an external storage context
  - for example, a background service worker that interacts with chrome.storage.local)

  In any case, this page shows a list of ripple_objects existing on this page, and some controls for them.
  To watch things sync, open two windows of this page side by side.

  The controls at the bottom let you make or edit Ripple_Objects
    ripple_id is the ripple_id of the ripple_object you'd like to edit (if it exists), or create (if its an id that doesn't exist yet on this page)
    color is the text color for it
    backgroundColor is the backgroundColor for it
    Click "Make / Edit Ripple Obj" to make / edit the object locally, changes will immediately appear in the list

  Ripple_Objects will not appear in other windows until synced (the sync process saves it in storage and propagates it to other environments), to do so, click the "sync" button next to the item you wish to sync
  Click the "delete" button to delete the ripple_object in both the local environment and in storage.
  Click the "edit" button to edit the ripple_object's color or backgroundColor in the local environment - note that changes will not be propagated until synced

  "Run Test" will run the test() function below
  "Sync From Storage" will pull all stored synced objects into this environment (note it will not delete / sync / otherwise modify ripple_objects that only exist in this environment)
  "Log Ripple.lookup" will log the Ripple.lookup object to the console in devtools.
  "Clear Storage" will wipe chrome.storage.local (note, it doesn't update the page though, so you might want to refresh)
  "Log Storage" will log chrome.storage.local to the console in devtools.

  this file contains just the page controls
  Ripple_Shared_Environment is the generic ripple code
  "Ripple_Customzations.js" contains most of the customization to implement chrome.storage.local as a storage area
    and handlers to create desired sync behavior

  code doesn't have to be separated out like this, this is just for example purposes
  customization could be in this file, or even directly written into the classes in Ripple_Shared_Environment

  
*/

async function test(){
  /* INSERT TEST CODE YOU'D LIKE TO TRY OUT HERE */  
}

document.getElementById('run_test').onclick = test;

document.getElementById('sync_from_storage').onclick = function(){
  Ripple.sync({
    storage_areas: {
      "storage_area": {
        sync_settings: {
          all: true
        }
      }
    }
  });
};

document.getElementById('log_ripple').onclick = function(){
  console.log(Ripple.lookup)
};

document.getElementById('clear_storage').onclick = function(){
  chrome.storage.local.clear();
}

document.getElementById('log_storage').onclick = function(){
  chrome.storage.local.get(null, function(a){console.log(a)});
}

document.getElementById('make_edit_obj').onclick = function(){
  let id = document.getElementById('make_id').value || undefined;
  let color = document.getElementById('make_color').value;
  let bgcolor = document.getElementById('make_bgcolor').value;
  if (id !== undefined && Ripple.lookup[id] !== undefined){
    Ripple.lookup[id].ripple_data.color = color;
    Ripple.lookup[id].ripple_data.backgroundColor = bgcolor;
    Ripple.lookup[id].modified();
  } else {
    Ripple.create({
      color: color,
      backgroundColor: bgcolor
    }, id || undefined, Ripple_Page_Element);
  }
}

/* 
  call Ripple.listen() to listen for updates to synced objects 
  note Ripple is loaded in a separate <script> tag in example.html
*/

Ripple.listen();