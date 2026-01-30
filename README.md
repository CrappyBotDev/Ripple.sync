# Ripple.sync:
Javascript framework for keeping objects in sync between tabs / different execution contexts.  Adaptable to different storage types / envrionments, and has events and handlers for creating your own syncing logic.

# The Basics:
"Ripple_Objects" are created in local execution contexts, when you want to sync them, the "Ripple" class and its methods connect these objects with "Storage_Adapter" classes that communicate with corresponding "Storage_Area" classes that may or may not exist in the same execution context as the "Ripple_Object" (and "Ripple" / "Storage_Adapter" class) that is being synced.  The "Storage_Area" class handles storage of synced_objets and sends out sync update messages to other contexts.

# This Repository:
- Classes.js (generic Ripple_Object, Ripple, Storage_Adapter, and Storage_Area classes)
- Annotated_Classes.js (Classes.js with notes on how everything works)
- Extension - Ripple Shared Context (chrome extension example - see "Examples" below)
- Extension - Ripple Separate Context (chrome extension example - see "Examples" below)

# General Use:
The general setup process is probably easiest to see in "Extension - Ripple Shared Context/Ripple_Customizations.js".  Start by setting up a Storage_Area by:
- implementing storage functions: Storage_Area.get_by_id(), Storage_Area.set_by_id(), Storage_Area.delete_by_id(), Storage_Area.storage_serialize(), Storage_Area.storage_deserialize(), - may also require setting up access to your database or whatever storage you want to use
- figuring out how your Storage_Area and Storage_Adapter will communicate: may require implementing Storage_Area.listen(), Storage_Area.stop_listening(), Storage_Area.serialize_message(), Storage_Area.deserialize_message() if your Storage_Area and Storage_Adapter are in different contexts
- set up your Storage_Area.propagate() function to send sync update messages to all relevant execution contexts that you want to use Ripple to sync objects between
- set up your storage handler functions for "Create", "Read", "Update" "Delete" and "Write" operations to customize behavior as desired

Then set up the other classes:
- Storage_Adapter.send_message_to_external() may need to be implemented (depends on whether your Storage_Adapter and Storage_Area are in the same execution context)
- Ripple.listen() and Ripple.stop_listening() will need to be implemented to receive sync update messages from other Storage_Area contexts that may exist, this may also require Ripple.serialize_message() and Ripple.deserialize_message() to be implemented
- implement extended Ripple_Object classes and/or customize event handlers / default handlers (for events such as: "sync_response", "sync_update", "modified", "deleted_locally") on Ripple or Ripple_Objects / extended Ripple_Objects

And that should be about it.  Now when you do things like 
```
Ripple.create({hello: "hello world!"}).sync();
```
in one tab, it'll trigger handlers in the Storage_Area context and possibly send sync updates to other contexts and trigger additional code depending on how you've customized it.

# Examples
Examples are provided in the form of Chrome extensions. To load them:
- open the Chrome browser
- go to the extensions page
- enable "Developer Mode" (top right corner)
- click "Load Unpacked"
- and select the "Extension - ..." folder you'd like to load.

Once loaded, click the extension icon to open the example page, click it again to open a second example page, and then move them to different windows to watch things sync between the two pages as you make changes with the controls on the example page.  "Extension - Ripple Shared Context" is an example of a Ripple.sync set up where all the classes exist in the same context and that context has access to the storage to be used to store synced objects.  "Extension - Ripple Separate Context" is an example of a Ripple.sync set up where the "Storage_Area" is in a separate context (in this case it's a background service worker).

# Caveats:
This does not implement cloning or comparison functions, so whenever Ripple.sync has to sync objects, it sends the full object being synced.  Keep that in mind - this may not be the ideal choice for syncing massive objects.  Similarly, it does not implement any sort of cloning, so when writing handlers, you'll need to be careful about where and when you modify things that are pass by reference.

# To Do
- update this readme w/ more thorough documentation, excalidraw diagrams / example screenshots
