/* 
Classes without customizations or with basic defaults, and notes indicating where environment specific customizations may be needed 
  some notes: 
    "batch_message" / "batch_sync_message" usually refers to the batch sync message - all sync operations are sent from Storage_Adapter classes to Storage_Area classes as a batch_sync
      batch_sync contains property "ids" which maps [ripple_id]: individual sync message for that id
    "sync_message" / "individual_sync_message" usually refers to the individual sync message contained with batch_message.ids[ripple_id]

    forgot to write it down, but a lot of the returns are actually promises that resolve to the specified value due to being asynchronous functions

    there is no clone function implemented here, that means you need to be careful about modifying things since js objs are pass by reference
    if your Storage_Area and Storage_Adapter are in the same environment, when you modify things in storage_handler functions, they'll be modified
    everywhere, so keep that in mind - thats not an issue when your Storage_Area and Storage_Adapter contexts are separate

    you might notice there is no listen() function on the Storage_Adapter, 
    that's because its intended for there to be multiple Storage_Adapter classes in the live context, but only a single Ripple class that handles all the incoming messages
*/

class Storage_Area extends Object{
  /*
    "Storage_Area" class
      generally there are two sides to storage for synced objects:
        the "Storage_Area" class that exist in the environment that has access to whatever storage you want to use to save things (maybe a server)
        and the "Storage_Adapter" class that exists in whatever environment you want to use the synced objects (maybe a script in a webpage) which communicates with the server to save / sync objects
      these two sides could be in the same environment or "context", or they could be in different contexts - see examples
  */
  static batch_queue = []; //queue for processing batch_sync_messages one at a time
  static listening = false; //whether this is listening for incoming sync messages
  /*
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
    START OF THINGS LIKELY TO REQUIRE ENVIRONMENT SPECIFIC CUSTOMIZATION FOR THIS CLASS:
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  */
  static storage_identifier = "storage_area"; //unique identifier name of this storage area, needs to match storage_identifier in corresponding Storage_Adapter class(es)
  static settings = {
    //settings for doing sync operations
    default_skip_storage_check: false, //true, false, or {[operation]: <bool>} - whether to skip the storage check for the specified operation(s), or for all operations if boolean, when skip_storage_check option is not specified in sync_message
    default_operation: "read", //required, single string to fallback on when no operation specified in sync_message
    force_skip_storage_check: undefined, //true, false, or {[operation]: <bool>} - forces skip_storage_check regardless of sync_message for the specified operation(s), or for all operations if boolean
    force_operation: undefined //string = forces the specified operations, or all operations if boolean, to a set operation regardless of sync_message
  }
  static async listen(){
    /*
      call to start listening to messages - set listening = true
      optional - implementing this is optional, but you will need some way to:
        receive messages from Storage_Adapter classes, 
        pass them to Storage_Area.receive_and_respond() to get a response
        and send the response back
      arguments:
        none
      returns: 
        promise that resolves when ready

      note: really just a placeholder for code you may or may not want to bundle into this class - see examples
    */
  }
  static async stop_listening(){
    /*
      call to stop listening to messages - set listening = false
      optional - again, implementing this is optional, but you will need some way of handling messages
      arguments:
        none
      returns: 
        promise that resolves when ready

      note: really just a placeholder for code you may or may not want to bundle into this class - see examples
    */
  }
  static async storage_deserialize(thing_from_storage){
    /*
      deserializes things coming out of storage
      arguments:
        "thing_from_storage" - thing from storage in serialized format to be deserialized
      returns: 
        deserialized version of thing_from_storage
    */
    return thing_from_storage;
  }
  static async storage_serialize(thing_to_store){
    /*
      serializes things going into storage
      arguments:
        "thing_to_store" - thing to put in storage
      returns: 
        serialized version thing_to_store
    */
    return thing_to_store
  }
  static async deserialize_message(message, serialize_pass){
    /*
      deserializes received messages
      arguments:
        "message" is a serialized message received from the Storage_Adapter class
        "serialize_pass" is an arbitrary value passed into Storage_Area.receive_and_respond()
      returns:
        unserialized message
    */
    return message;
  }
  static async serialize_message(message, serialize_pass){
    /*
      serializes messages to be sent
      arguments:
        "message" is the unserialized message to be sent
        "serialize_pass" is an arbitrary value passed into Storage_Area.receive_and_respond()
      returns:
        serialized message
    */
    return message;
  }
  static async storage_key_from_ripple_id(ripple_id){
    /*
      determines storage key from ripple_id (in case you want to append something to it, or change it in some way)
      storage_keys need to be 1:1 with ripple_ids
      arguments:
        "ripple_id" is the unique identifier of the Ripple synced object
      returns:
        storage_key (unique identifier for the synced object saved in storage)
    */
    return ripple_id;
  }
  static async get_by_id(keys_arr){
    /* 
      retrieve things from storage based on storage_key
      arguments:
        "keys_arr": arr of storage_keys to fetch all info for, or null - if null fetch all Ripple synced objects from storage
      return: 
        {
          [storage_key]: corresponding Ripple synced object from storage
        }

      note: this will likely make use of the Storage_Area.storage_deserialize() method - see examples  
    */
  }
  static async set_by_id(obj){
    /*
      for storing objects to be synced
      arguments 
        "obj" is a ripple synced object or a representation of it that includes everything that needs to be stored in storage
      returns
        none

      note: this will likely make use of the Storage_Area.storage_key_from_ripple_id() and Storage_Area.storage_serialize() methods - see examples  
    */
  }
  static async delete_by_id(keys_arr){
    /* 
      deletes things from storage based on provided storage_key(s)
      arguments:
        "keys_arr": arr of storage_keys to delete from storage
      returns:
        none
    */
  }
  static async propagate(propagation_message, batch_sync_message, sync_message, sync_response, propagation_pass){
    /*
      function called after updating an individual Ripple synced object in storage
      this needs to send "propagation_message" to environments that were not the originating environment for the change to the synced object
      arguments:
        "propagation_message" is the message to be sent to other environments
        "batch_sync_message" is the batch_sync_message that triggered the storage update
        "sync_message" is the individual_sync_message included in the batch_sync_message that triggered the storage update 
        "sync_response" is the individual_sync_response to the individual_sync_message
        "propagation_pass" is an arbitrary value passed into this function from storage_handlers
      returns:
        none

      note: this will likely make use of Storage_Area.serialize_message() method - see examples
    */
  }
  /* Storage Handlers: */
  static async handle_create(operation_info){
    /* 
      called when doing a "create" operation
      if the synced object already exists (based on its ripple_id derived storage_key), the "create" operation is automatically cancelled, this handler will still be done though
      if not cancelled, operation_info.incoming_value will be the value saved in storage, 
        this function is where to make any needed modifications to that value
        such as setting ripple_version or anything like that
        it does not need to be serialized for storage here, that will be done later
      args: 
        "operation_info" = {
          ripple_id: id, // id of ripple_object in storage being operated on
          requested_operation: "create", // operation from sync_message or batch_message.defaults.listed.operation
          pending_operation: "create", // the operation that is going to be done after checking arguments
          stored_value: <ripple_object from storage, frozen>, // value in storage for this ripple_object - undefined means we didn't check, null means we checked and it doesn't exist
          incoming_value: <ripple_object from sync_message.sync>, // value sent in the message from the ripple environment - mostly for "create" or "update" operations
          pass: sync_message.storage_pass, // from sync_message
          sync_message: <individual_sync_message> // the individual sync message received that triggered this operation - somewhat redundant, as it includes storage pass, incoming, etc.>
          batch_message: <batch_sync_message> // the full batch message the sync_message is a part of
        }
      return:
        {
          status: "cancelled" || "denied" // to cancel (still sends info back in response) or deny (does not send info back in response, just status: "denied") the operation
          cancel_propagation: true, // to cancel propagation for create, update, delete operations (read operations don't propagate)
          response_pass: <arbitrary> // will be passed back in the response, as long as the status is not "denied"
          propagation_pass: <arbitrary> // will be passed to propagation, which is only done on "create", "read", or "update" operations that are not cancelled
        } 
    */
  }
  static async handle_update(operation_info){
    /* 
      called when doing an update operation
      if the ripple_id doesn't exist, the "update" operation is automatically cancelled, this handler will still be done though
      if not cancelled, operation_info.incoming_value will overwrite the existing value in storage, 
        this function is where to make any needed modifications to that value
        such as setting ripple_version or anything like that
        it does not need to be serialized for storage here, that will be done later
      args: 
        "operation_info" = {
          ripple_id: id, // id of ripple_object in storage being operated on
          requested_operation: "update", // operation from sync_message or batch_message.defaults.listed.operation
          pending_operation: "update", // the operation that is going to be done after checking arguments
          stored_value: <ripple_object from storage, frozen>, // value in storage for this ripple_object - undefined means we didn't check, null means we checked and it doesn't exist
          incoming_value: <ripple_object from sync_message.sync>, // value sent in the message from the ripple environment - mostly for "create" or "update" operations
          pass: sync_message.storage_pass, // from sync_message
          sync_message: <sync_message> // the individual sync message received that triggered this operation - somewhat redundant, as it includes storage pass, incoming, etc.>
          batch_message: <batch_message> // the full batch message the sync_message is a part of
        }
      return:
        {
          status: "cancelled" || "denied" // to cancel (still sends info back in response) or deny (does not send info back in response, just status: "denied") the operation
          cancel_propagation: true, // to cancel propagation for create, update, delete operations (read operations don't propagate)
          response_pass: <arbitrary> // will be passed back in the response, as long as the status is not "denied"
          propagation_pass: <arbitrary> // will be passed to propagation, which is only done on "create", "read", or "update" operations that are not cancelled
        } 
    */
  }
  static async handle_write(operation_info){
    /* 
      called when doing a write operation
      the "write" operation will save to storage regardless of whether there is an existing value for this ripple_id or not
      NOTE: write will be relabelled as "create" or "update" depending on if storage was checked for this operation and whether the ripple_object with the specified ripple_id exists in storage yet
      if not cancelled, operation_info.incoming_value will be saved in storage, 
        this function is where to make any needed modifications to that value
        such as setting ripple_version or anything like that
        it does not need to be serialized for storage here, that will be done later
      args: 
        "operation_info" = {
          ripple_id: id, // id of ripple_object in storage being operated on
          requested_operation: "write", // operation from sync_message or batch_message.defaults.listed.operation
          pending_operation: "write" || "create" || "update", // the operation that is going to be done after checking arguments - "create" if stored_value is null, "update" if stored_value is not undefined or null
          stored_value: <ripple_object from storage, frozen>, // value in storage for this ripple_object - undefined means we didn't check, null means we checked and it doesn't exist
          incoming_value: <ripple_object from sync_message.sync>, // value sent in the message from the ripple environment - mostly for "create" or "update" operations
          pass: sync_message.storage_pass, // from sync_message
          sync_message: <sync_message> // the individual sync message received that triggered this operation - somewhat redundant, as it includes storage pass, incoming, etc.>
          batch_message: <batch_message> // the full batch message the sync_message is a part of
        }
      return:
        {
          status: "cancelled" || "denied" // to cancel (still sends info back in response) or deny (does not send info back in response, just status: "denied") the operation
          cancel_propagation: true, // to cancel propagation for create, update, delete operations (read operations don't propagate)
          response_pass: <arbitrary> // will be passed back in the response, as long as the status is not "denied"
          propagation_pass: <arbitrary> // will be passed to propagation, which is only done on "create", "read", or "update" operations that are not cancelled
        } 
    */
  }
  static async handle_read(operation_info){
    /* 
      called when doing a read operation - which simply reads storage and returns the result, or null if it doesn't exist
      stored_value is the value in the database, which will be sent in the sync_response if this is not cancelled or denied
      args: 
        "operation_info" = {
          ripple_id: id, // id of ripple_object in storage being operated on
          requested_operation: "read" || "write" || "create" || "update", undefined // operation from sync_message or batch_message.defaults.listed.operation, note that this may not match pending_operation since "read" is default for undefined, or "create", "update", "write" when missing sync_message.sync
          pending_operation: "read", // the operation that is going to be done after checking arguments - note that "read" operations have technically already been done, result is stored_value
          stored_value: <ripple_object from storage, frozen>, // value in storage for this ripple_object - undefined means we didn't check, null means we checked and it doesn't exist
          incoming_value: <ripple_object from sync_message.sync>, // value sent in the message from the ripple environment - mostly for "create" or "update" operations
          pass: sync_message.storage_pass, // from sync_message
          sync_message: <sync_message> // the individual sync message received that triggered this operation - somewhat redundant, as it includes storage pass, incoming, etc.>
          batch_message: <batch_message> // the full batch message the sync_message is a part of
        }
      return:
        {
          status: "cancelled" || "denied" // to cancel (still sends info back in response) or deny (does not send info back in response, just status: "denied") the operation
          cancel_propagation: true, // to cancel propagation for create, update, delete operations (read operations don't propagate)
          response_pass: <arbitrary> // will be passed back in the response, as long as the status is not "denied"
          propagation_pass: <arbitrary> // will be passed to propagation, which is only done on "create", "read", or "update" operations that are not cancelled
        } 
    */
  }
  static async handle_delete(operation_info){
    /* 
      called when doing delete operation
      args: 
        "operation_info" = {
          ripple_id: id, // id of ripple_object in storage being operated on
          requested_operation: "delete", // operation from sync_message or batch_message.defaults.listed.operation
          pending_operation: "delete", // the operation that is going to be done after checking arguments
          stored_value: <ripple_object from storage, frozen>, // value in storage for this ripple_object - undefined means we didn't check, null means we checked and it doesn't exist
          incoming_value: <ripple_object from sync_message.sync>, // value sent in the message from the ripple environment - mostly for "create" or "update" operations
          pass: sync_message.storage_pass, // from sync_message
          sync_message: <sync_message> // the individual sync message received that triggered this operation - somewhat redundant, as it includes storage pass, incoming, etc.>
          batch_message: <batch_message> // the full batch message the sync_message is a part of        }
        }
      return:
        {
          status: "cancelled" || "denied" // to cancel (still sends info back in response) or deny (does not send info back in response, just {status: "denied"}) the operation
          cancel_propagation: true, // to cancel propagation for create, update, delete operations (read operations don't propagate)
          response_pass: <arbitrary> // will be passed back in the response, as long as the status is not "denied"
          propagation_pass: <arbitrary> // will be passed to propagation, which is only done on "create", "read", or "update" operations that are not cancelled
        } 
    */
  }
  /*
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
    END OF THINGS LIKELY TO REQUIRE ENVIRONMENT SPECIFIC CUSTOMIZATION FOR THIS CLASS

    START OF MORE GENERIC METHODS:
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  */
  static async receive_and_respond(message, serialize_pass){
    /*
      does the sync process when a mesage is received: deserializes, does sync, serializes response
      arguments:
        "message" is the message that was sent to this storage space
        "message_pass" is arbitrary thing passed in from listener function
      returns:
        a promise that resolves to batch_sync_response to be sent back
    */
    let deserialized = await Storage_Area.deserialize_message(message, serialize_pass);
    let result = null;
    return new Promise(async (resolve, reject)=>{
      result = await Storage_Area.sync_process(deserialized);
      let reserialized = await Storage_Area.serialize_message(result, serialize_pass);
      resolve(reserialized);
    });
  }
  static add_to_queue(msg, resolver){
    /*
      adds sync process to end of queue
      starts if its the only thing in queue
      arguments:
        "msg" is unserialized batch_sync_message
        "resolver" is the resolver function for  Storage_Area.sync_process()
      returns:
        none
    */
    Storage_Area.batch_queue.push({
      msg: msg,
      resolver: resolver
    });
    if (Storage_Area.batch_queue.length === 1){
      Storage_Area.batch_sync_process(msg, resolver);
    }
  }
  static shift_queue(){
    /*
      removes first from queue
      starts if there are remaining sync processes in queue
      arguments:
        none
      returns:
        none
    */
    Storage_Area.batch_queue.shift();
    if (Storage_Area.batch_queue.length !== 0){
      let next = Storage_Area.batch_queue[0];
      Storage_Area.batch_sync_process(next.msg, next.resolver);
    }
  }
  static async sync_process(batch_sync_message){
    /*
      queues requested sync
      arguments:
        "batch_sync_message" is deserialized batch_sync_message
      returns:
        promise that resolves with batch_sync_response when finished doing sync
    */
    return new Promise(async (resolve, reject)=>{
      Storage_Area.add_to_queue(batch_sync_message, resolve);
    });
  } 
  static async individual_sync_process(batch_message, sync_message, storage_results, batch_results, listed = "listed", checked_args){
    /*
      checks arguments,
      does storage_handler,
      does save process and propagation (if needed)
      arguments:
        "batch_message" - batch_sync_message
        "sync_message" - individual_sync_message
        "storage_results" - results of storage check for the batch sync this is a part of
        "batch_results" - batch response (so far) that the response to this individual sync process will be included in
        "listed" - whether this was "listed" (a listed id in batch_message.ids), or "others" (not listed in batch_message.ids)
        "checked_args" - args that were already checked while checking storage
      returns
        a promise that resolves to the individual sync response for this sync process
    */
    let id = sync_message.ripple_id;

    let requested_operation = sync_message.operation || batch_message.defaults?.[listed]?.operation;
    let attempted_operation = null;
    let skip_storage_check = null;
    if (checked_args === undefined){
      attempted_operation = requested_operation || Storage_Area.settings.default_operation;
      if (Storage_Area.settings.force_operation !== undefined){
        if (typeof Storage_Area.settings.force_operation === "string"){
          attempted_operation = Storage_Area.settings.force_operation;
        } else if (Storage_Area.settings.force_operation[attempted_operation] !== undefined){
          attempted_operation = Storage_Area.settings.force_operation[attempted_operation];
        }
      }

      skip_storage_check = sync_message.skip_storage_check || batch_message.defaults?.[listed]?.skip_storage_check;
      if (skip_storage_check === undefined && Storage_Area.settings.default_skip_storage_check !== undefined){
        if (Storage_Area.settings.default_skip_storage_check === true){
          skip_storage_check = true;
        } else {
          skip_storage_check = Storage_Area.settings.default_skip_storage_check[attempted_operation];
        }
      }
      if (Storage_Area.settings.force_skip_storage_check !== undefined){
        if (Storage_Area.settings.force_skip_storage_check === true){
          skip_storage_check = true;
        } else if (Storage_Area.settings.force_skip_storage_check[attempted_operation] !== undefined) {
          skip_storage_check = Storage_Area.settings.force_skip_storage_check[attempted_operation];
        }
      }
    } else {
      attempted_operation = checked_args.operation;
      skip_storage_check = checked_args.skip_storage_check;
    }

    let storage_pass = sync_message.storage_pass || batch_message.defaults?.[listed]?.storage_pass;
    let handler = await Storage_Area["handle_"+attempted_operation];
    let key_str = await Storage_Area.storage_key_from_ripple_id(id);

    let storage_needed = true;
    if ((attempted_operation === "delete" || attempted_operation === "write") && (skip_storage_check === true || Storage_Area.skip_storage_check === true || Storage_Area.skip_storage_check?.[attempted_operation] === true)){
      storage_needed = false;
    }
    let relevant_storage = undefined;
    if (storage_needed === true){
      if (key_str in storage_results){
        relevant_storage = Object.freeze(storage_results[key_str]);
      } else {
        relevant_storage = null;
      }
    }
    if (key_str in storage_results){
      delete storage_results[key_str];
    }
    let handler_arg = {
      ripple_id: id,
      requested_operation: requested_operation,
      pending_operation: attempted_operation,
      stored_value: relevant_storage,
      incoming_value: sync_message.sync,
      pass: storage_pass,
      sync_message: sync_message,
      batch_message: batch_message
    };
    let handler_result = handler(handler_arg) || {};
   
    if (
      handler_result.status !== "denied" && handler_result.status !== "cancelled" && 
      (attempted_operation === "create" && (relevant_storage !== undefined || handler_arg.incoming_value === undefined)) || 
      (attempted_operation === "update" && (relevant_storage === undefined || handler_arg.incoming_value === undefined)) ||
      (attempted_operation === "write" && handler_arg.incoming_value === undefined)
    ){
      handler_result.status = "cancelled";
    }

    let performed_operation = attempted_operation;
    if (attempted_operation === "write" && storage_needed === true){
      if (relevant_storage === null){
        performed_operation = "create";
      } else {
        performed_operation = "update";
      }
    }

    return new Promise(async (resolve, reject)=>{
      
      if (handler_result.status === "denied"){
        batch_results[id] = {
          denied: true
        }
        resolve(batch_results[id])
      } else if (handler_result.status === "cancelled"){
        batch_results[id] = {
          ripple_id: id,
          operation: performed_operation,
          status: "cancelled",
          pass: handler_result.response_pass,
        }
        if (attempted_operation !== "read"){
           batch_results[id].sync = relevant_storage;
        } 
        resolve(batch_results[id])
      } else {
        batch_results[id] = {
          ripple_id: id,
          operation: performed_operation,
          status: "completed",
          pass: handler_result.response_pass,
        } 
        if (attempted_operation === "create" || attempted_operation === "update" || attempted_operation === "write"){
          await Storage_Area.set_by_id(handler_arg.incoming_value);
          batch_results[id].sync = handler_arg.incoming_value;
        } else if (attempted_operation === "delete"){
          await Storage_Area.delete_by_id([key_str]);
          batch_results[id].sync = null;
        } else {
          batch_results[id].sync = relevant_storage;
        }
        resolve(batch_results[id])
        if (attempted_operation !== "read" && handler_result.cancel_propagation !== true){
          let propagation_message = {
            ripple_id: id,
            operation: performed_operation,
            status: "completed",
            pass: handler_result.propagation_pass,
            sync: batch_results[id].sync,
            ripple_sender: Storage_Area.storage_identifier
          }
          Storage_Area.propagate(propagation_message, batch_message, sync_message, batch_results[id], handler_result.propagation_pass);
        }
      }
    });
  }
  static async batch_sync_process(batch_message, resolve_fn){
    /*
      checks storage in a batch operation (if needed)
      then does individual sync according to arguments in batch_message
      collecting the results as a response to send back to the "live" environment
      arguments:
        "batch_message" - batch sync message
        "resolve_function" - resolver for the Storage_Area.sync_process() function
    */
    let keys_arr = [];
    let checked_args = {};
    if (batch_message.all === true){
      keys_arr = null;
    } else {
      for (let ripple_id in batch_message.ids){
        let operation = batch_message.ids[ripple_id].operation || batch_message.defaults?.listed?.operation || Storage_Area.settings.default_operation;
        if (Storage_Area.settings.force_operation !== undefined){
          if (typeof Storage_Area.settings.force_operation === "string"){
            operation = Storage_Area.settings.force_operation;
          } else if (Storage_Area.settings.force_operation[operation] !== undefined){
            operation = Storage_Area.settings.force_operation[operation];
          }
        }
        let skip_storage_check = batch_message.ids[ripple_id].skip_storage_check || batch_message.defaults?.listed?.skip_storage_check;
        if (skip_storage_check === undefined && Storage_Area.settings.default_skip_storage_check !== undefined){
          if (Storage_Area.settings.default_skip_storage_check === true){
            skip_storage_check = true;
          } else {
            skip_storage_check = Storage_Area.settings.default_skip_storage_check[operation];
          }
        }
        if (Storage_Area.settings.force_skip_storage_check !== undefined){
          if (Storage_Area.settings.force_skip_storage_check === true){
            skip_storage_check = true;
          } else if (Storage_Area.settings.force_skip_storage_check[operation] !== undefined) {
            skip_storage_check = Storage_Area.settings.force_skip_storage_check[operation];
          }
        }
        checked_args[ripple_id] = {
          operation: operation,
          skip_storage_check: skip_storage_check
        }

        if (operation === "read" || operation === "create" || operation === "update" || !skip_storage_check){
          let storage_key = await Storage_Area.storage_key_from_ripple_id(ripple_id);
          keys_arr.push(storage_key);
        }
      }
    }
    
    let storage_results = {};
    if (keys_arr === null || keys_arr.length !== 0){
      storage_results = await Storage_Area.get_by_id(keys_arr);
    }

    let results_obj = {};
    let results_promises = [];
    for (let id in batch_message.ids){
      results_promises.push(Storage_Area.individual_sync_process(batch_message, batch_message.ids[id], storage_results, results_obj, "listed", checked_args[id]));
    }

    for (let thing in storage_results){
      let sync_message = {
        ripple_id: storage_results[thing].ripple_id,
      }
      results_promises.push(Storage_Area.individual_sync_process(batch_message, sync_message, storage_results, results_obj, "others"));
    }
    
    await Promise.all(results_promises);  
    resolve_fn({
      ids: results_obj
    });
    Storage_Area.shift_queue();
  }
}

class Storage_Adapter extends Object{
  /*
    the "Storage_Adapter" class 
    this class needs to exist in the same environment as the "Ripple" class
    just defines ways to communicate with the "Storage_Area" class
  */
   /*
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
    START OF THINGS LIKELY TO REQUIRE ENVIRONMENT SPECIFIC CUSTOMIZATION FOR THIS CLASS:
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  */
  static sync_settings = {}; //see Ripple.sync() for sync arguments that can be put on Storage_Adapters and synced objects
  static storage_identifier = "storage_area"; //unique identifier of the corresponding Storage_Area
  static async send_message_to_external(message){
    /*
      method for sending message to the Storage_Area class
      arguments:
        "message" - serialized message to send
      returns:
        response to sent message

      note: code below just calls Storage_Area.receive_and_respond() directly, this works for shared context, but not separate context 
        - see example "Extension - Ripple Separate Context" using chrome.runtime.sendMessage
    */
    let response = await Storage_Area.receive_and_respond(message);
    return response;
  }
  /*
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
    END OF THINGS LIKELY TO REQUIRE ENVIRONMENT SPECIFIC CUSTOMIZATION FOR THIS CLASS

    START OF MORE GENERIC METHODS:
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  */
  static async sync(message, serialize_pass){
    /*
      sync function, simply sends sync_message to Storage_Area
      arguments:
        "message" is a batch_sync_message
        "serialize_pass" is an arbitrary value to pass to serialize_message and deserialize_message
      returns:
        a promise that resolves with the deserialized batch_sync_response
    */
    let serialized = await Ripple.serialize_message(message, serialize_pass);
    return new Promise(async (resolve, reject)=>{
      let response = await Storage_Adapter.send_message_to_external(serialized);
      let response_deserialized = await Ripple.deserialize_message(response, serialize_pass);
      resolve(response_deserialized);
    });
  }
}

class Ripple extends Object{
  /* 
    "Ripple" class used to keep track of / interact with synced "Ripple_Object"s
    has handlers for incoming sync messages and updates on individual Ripple_Objects
    and methods for batch syncing
  */
  static lookup = {}; //[ripple_id]: [corresponding Ripple_Object]
  static listening = false; //whether this is currently listening for incoming messages
  /*
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
    START OF THINGS LIKELY TO REQUIRE ENVIRONMENT SPECIFIC CUSTOMIZATION FOR THIS CLASS:
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  */
  static environment_identifier = "content_script"; //identifier for this environment - not really used rn, but included in batch_sync_message
  static storage_areas = {
    /*
    [storage_identifier]: Storage_Adapter class, required for each storage_adapter, used to map string arguments to their relevant class
    if changing Storage_Area.storage_identifier and Storage_Adapter.storage_identifier in a separate file, use Ripple.add_storage_area()
    otherwise can hardcode it like below:
    */
    [Storage_Adapter.storage_identifier]: Storage_Adapter,
  };
  static async deserialize_message(message, serialize_pass){
    /*
      deserializes received messages
      arguments:
        "message" is a serialized message received from the Storage_Area class
        "serialize_pass" is an arbitrary value passed into Ripple.receive_message()
      returns:
        unserialized message
    */
    return message;
  }
  static async serialize_message(message, serialize_pass){
    /*
      serializes outgoing messages
      arguments:
        "message" is an unserialized message to be sent
        "serialize_pass" is an arbitrary value passed into Ripple.sync() and Storage_Adapter.sync()
      returns:
        serialized message
    */
    return message;
  }
  static async listen(){
    /*
      call to start listening to messages - set listening = true
      optional - implementing this is optional, but you will need some way to receive messages from Storage_Area classes
        and pass them to Ripple.receive_message();
      arguments:
        none
      returns: 
        promise that resolves when ready

      note: really just a placeholder for code you may or may not want to bundle into this class - see examples
    */
  }
  static async stop_listening(){
    /*
      call to stop listening to messages - set listening = false
      optional - again, implementing this is optional, but you will need some way of handling messages
      arguments:
        none
      returns: 
        promise that resolves when ready

      note: really just a placeholder for code you may or may not want to bundle into this class - see examples
    */
  }
  static async receive_message(message, serialize_pass){
    /*
      handles received message
      function to be called when receiving a message relevant to ripple
      arguments:
        "message" is serialized message 
        "serialize_pass" is an arbitrary value to pass to Ripple.serialize() and Ripple.deserialize() functions
      returns:
        none
    */
    let deserialized = await Ripple.deserialize_message(message, serialize_pass);
    Ripple.handle_event("message_received", undefined, [deserialized]);
  }
  static async default_on_message_received(event_info, message){
    /*
      message_received event is called when any ripple-relevant message is received
      default behavior is to just call the sync_update event for the synced_object
      regardless of whether it exists in this Ripple environment or not
      arguments:
        "event_info" = {
          event_name: (name of the event)
          handler_name: (name of handler function), 
          origin: (ripple object / thing that triggered this event), 
          target: (ripple object / thing this handler function belongs to)
        }
        "message" - deserialized message that was received (current implementation this is always a propagation message from a Storage_Area)
      returns
        none
    */
    let ripple_id = message.ripple_id;
    Ripple.handle_event("sync_update", Ripple.lookup[ripple_id], [message]);
  }
  static async default_on_sync_update(event_info, propagation_message){
    /*
      sync_update event is when there's an update to a synced object in a Storage_Area, the Storage_Area will send out a propagation message
      note: propagation_messages do not get sent to the environment that caused the sync update, that environment receives a sync_response instead as part of its sync process
      arguments:
        "event_info" = {
          event_name: (name of the event)
          handler_name: (name of handler function), 
          origin: (ripple object / thing that triggered this event), 
          target: (ripple object / thing this handler function belongs to)
        }
        "propagation_message" = {
          ripple_id: id, //id of synced object modified
          operation: performed_operation, //operation done
          status: "completed",
          pass: handler_result.propagation_pass //arbitrary value from storage_handler passed to propagation message / function
          sync: batch_results[id].sync, //new value in database, or null if deleted
          ripple_sender: Storage_Area.storage_identifier //identifier of Storage_Area where this update occurred
        }
      returns:
        none
    */
  }
  static async default_on_sync_response(event_info, sync_response, batch_sync_response, sync_message, batch_sync_message, post_pass){
    /*
      sync_response event occurs when there's a response to a sync call from this Ripple environment - is called for each individual ripple synced object that was part of the batch sync operation
      arguments:
        "event_info" = {
          event_name: (name of the event)
          handler_name: (name of handler function), 
          origin: (ripple object / thing that triggered this event), 
          target: (ripple object / thing this handler function belongs to)
        }
        "sync_response" - individual sync response describing results of a sync operation: 
          {
            ripple_id: id,
            operation: performed_operation,
            status: "completed" || "cancelled",
            pass: handler_result.response_pass, //arbitrary value passed from storage_handler to sync response
            sync: current value in database or null if deleted (missing if it was a cancelled read operation)
          }
            or 
          {denied: true} if the sync operation was denied
        "batch_sync_response" - batch sync response the individual response is a part of
        "sync_message" - individual sync request message
        "batch_sync_message" - batch sync request message the individual sync_message was a part of
        "post_pass" - arbitrary value passed to the sync function
      returns:
        none
    */
  }
  /*
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
    END OF THINGS LIKELY TO REQUIRE ENVIRONMENT SPECIFIC CUSTOMIZATION FOR THIS CLASS

    START OF MORE GENERIC METHODS:
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  */
  static async handle_event(evt_name, origin, args_array){
    /*
      for determining what function to use when handling an event
      handler priority for "event" is as follows:
        Ripple_Object.on_"event" (if its an event for a specific object)
        Ripple.on_"event", 
        Ripple.default_on_"event"
      terminates on being handled (does not continue to bubble)
      arguments:
        "evt_name" - the name of the event
        "origin" - originating thing (ripple object) of the event
        "args_array" - array of arguments to pass to handler
      returns:
        result of the handler (technically promise that resolves to result of handler function)
    */
    let last_stop = false;
    let keep_running = true;
    let current_target = origin;
    if (origin === undefined){
      current_target = Ripple;
      last_stop = true;
    }
    while(keep_running === true){
      if ("on_"+evt_name in current_target && typeof current_target["on_"+evt_name] === 'function'){
        let final_val = await current_target["on_"+evt_name]({
          event_name: evt_name, 
          handler_name: "on_"+evt_name, 
          origin: origin, 
          target: current_target}, ...args_array);
        return(final_val);
      }
      if (last_stop === true){
        keep_running = false;
      } else {
        current_target = Ripple;
        last_stop = true;
      }
    }
    if (Ripple["default_on_"+evt_name] !== undefined) {
      let final_val = await Ripple["default_on_"+evt_name]({
        event_name: evt_name,
        handler_name: "default_on_"+evt_name, 
        origin: origin, 
        target: Ripple}, ...args_array);
      return(final_val);
    } 
    return;
  }
  static create(initial_obj, optional_ripple_id, optional_extended_class){
    /* 
      "soft" creation function for synced Ripple_Objects
      arguments:
        initial_obj = object, or Ripple_Object to base the created Ripple_Object off of
        optional_ripple_id = the id to use for the Ripple_Object to be created
        optional_extended_class = class to make the created synced object (should be an extension of Ripple_Object class)

        if initial_obj has ripple_id property, its treated like a Ripple_Object and will use the initial_object's ripple_version and ripple_data
        otherwise, initial_obj is treated like the ripple_data for a new Ripple_Object
        if a ripple_id is specified (either optional_ripple_id or initial_obj.ripple_id) and already exists, this function returns
        the existing Ripple_Object rather than creating a new one
      returns:
        newly created ripple synced object, or if one already exists for the provided ripple_id, the existing one
      
      should note: this function, and the Ripple_Object constructor do not clone objects
      so be careful about using other existing variables as initial_obj
    */
    let thing = null;
    if ("ripple_id" in initial_obj){
      let ripple_id = optional_ripple_id || initial_obj.ripple_id;
      let ripple_version = initial_obj.ripple_version;
      if (ripple_id in Ripple.lookup){
        thing = Ripple.lookup[ripple_id];
      } else if (optional_extended_class !== undefined) {
        thing = new optional_extended_class(initial_obj.ripple_data, ripple_id, ripple_version);
      } else {
        thing = new Ripple_Object(initial_obj.ripple_data, ripple_id, ripple_version);
      }
    } else {
      if (optional_ripple_id !== undefined && optional_ripple_id in Ripple.lookup){
        thing = Ripple.lookup[optional_ripple_id];
      } else if (optional_extended_class !== undefined) {
        thing = new optional_extended_class(initial_obj, optional_ripple_id);
      } else {
        thing = new Ripple_Object(initial_obj, optional_ripple_id);
      }
    }
    return thing;
  }
  static async sync(sync_args = {
    storage_areas: Ripple.storage_areas,
    ripple_objects: Ripple.lookup
  }, single_id, deletion = false, serialize_pass){
    /*
      batch sync function
      args:
        single_id is for specifying a the ripple_id of a single ripple_object to sync when there may be multiple included in sync_args
        sync_args is a dictionary, organizing arguments for syncing storage_areas, and/or Ripple_Objects within those storage spaces,
        generally argument priority is most specific > least specific, ie specified arguments for an individual Ripple_Object will take precedence
        over arguments specified for an entire storage space...
        {
          storage_areas: {
            [storage_identifier]: {
              sync_settings: { //maps to default arguments to use for syncing operations involving that storage area
                all: //whether to do operations on things not listed in storage_area.ripple_objects
                defaults: { //defaults put in batch_sync_message for this storage area, applied when things are otherwise missing these arguments
                  listed: { //applied to all the ripple_objects listed in sync_args for this storage_area if missing
                    storage_pass:
                    skip_storage_check:
                    operation:
                    post_pass
                  }
                  others: { //for use with all, these are applied to ripple_objects existing in storage, but not listed in sync_args for this storage_area if missing
                    storage_pass:
                    skip_storage_check:
                    operation:
                    post_pass
                  }
                }
                //rest of these objects are actually attached to each ripple_objects individual_sync_message within batch_sync_message depending on priority
                storage_pass:
                post_pass:
                operation:
                skip_storage_check:
                ripple_objects: {
                  [ripple_id]: {
                    sync_settings: {
                      storage_pass:
                      post_pass:
                      operation:
                      skip_storage_check:
                    }
                  }
                }
              } 
            }
            ...
          }
          ripple_objects: { //these take precedence over the ripple_objects in sync_args.storage_areas
            [ripple_id]: { 
              sync_settings: {//maps to arguments to use for syncing this ripple_id, if no arguments specified, will use Ripple_Object.sync_settings, or default storage arguments
                storage_pass:
                post_pass:
                operation:
                storage_areas: {
                  [storage_identifier]: {
                    storage_pass:
                    post_pass:
                    operation:
                    skip_storage_check:
                  }
                  ...
                }
              }
            }
          }
        }
    */
    let post_pass_dict = {};
    let batch_sync_dict = {};
    if (sync_args.ripple_objects !== undefined){
      for (let ripple_id in sync_args.ripple_objects){
        if (single_id === undefined || ripple_id === single_id){
          let settings = sync_args.ripple_objects[ripple_id].sync_settings;
          if (Object.keys(settings.storage_areas || {}).length === 0){
            if (sync_args.storage_areas !== undefined){
              for (let storage_identifier in sync_args.storage_areas){
                let operation = settings.operation || sync_args.storage_areas[storage_identifier].sync_settings.operation;
                if (deletion === true){
                  operation = "delete";
                }
                let storage_pass = settings.storage_pass || sync_args.storage_areas[storage_identifier].sync_settings.storage_pass;
                let post_pass = settings.post_pass || sync_args.storage_areas[storage_identifier].sync_settings.post_pass;
                let skip_storage_check = settings.skip_storage_check || sync_args.storage_areas[storage_identifier].sync_settings.skip_storage_check;
                if (post_pass !== undefined){
                  Ripple.add_to_post_pass_dict(post_pass_dict, post_pass);
                }
                Ripple.add_to_batch_sync_dict(sync_args, batch_sync_dict, storage_identifier, ripple_id, operation, storage_pass, skip_storage_check, single_id);
              }
            }
          } else {
            for (let storage_identifier in settings.storage_areas){
              let operation = settings[storage_identifier].operation || settings.operation || sync_args.storage_areas?.[storage_identifier]?.sync_settings.operation;
              if (deletion === true){
                operation = "delete";
              }
              let storage_pass = settings[storage_identifier].storage_pass || settings.storage_pass || sync_args.storage_areas?.[storage_identifier]?.sync_settings.storage_pass;
              let post_pass = settings[storage_identifier].post_pass || settings.post_pass || sync_args.storage_areas?.[storage_identifier]?.sync_settings.post_pass;
              let skip_storage_check = settings[storage_identifier].skip_storage_check || settings.skip_storage_check || sync_args.storage_areas?.[storage_identifier]?.sync_settings.skip_storage_check;
              if (post_pass !== undefined){
                Ripple.add_to_post_pass_dict(post_pass_dict, post_pass);
              }
              Ripple.add_to_batch_sync_dict(sync_args, batch_sync_dict, storage_identifier, ripple_id, operation, storage_pass, skip_storage_check, single_id);
            }
          }
        }
      }
    }
    let listed_post_pass_default = {};
    let others_post_pass_default = {};
    if (sync_args.storage_areas !== undefined){
      for (let storage_identifier in sync_args.storage_areas){
        if (sync_args.storage_areas[storage_identifier].sync_settings.defaults?.listed?.post_pass !== undefined){
          listed_post_pass_default[storage_identifier] = sync_args.storage_areas[storage_identifier].sync_settings.defaults.listed.post_pass;
          delete sync_args.storage_areas[storage_identifier].sync_settings.defaults.listed.post_pass;
        }
        if (sync_args.storage_areas[storage_identifier].sync_settings.defaults?.others?.listed?.post_pass !== undefined){
          others_post_pass_default[storage_identifier] = sync_args.storage_areas[storage_identifier].sync_settings.defaults.others.post_pass;
          delete sync_args.storage_areas[storage_identifier].sync_settings.defaults.others.post_pass
        }
        if (sync_args.storage_areas[storage_identifier].ripple_objects !== undefined){
          for (let ripple_id in sync_args.storage_areas[storage_identifier].ripple_objects){
            if (single_id === undefined || ripple_id === single_id){
              if (batch_sync_dict[storage_identifier].ids[ripple_id] === undefined){
                let operation = sync_args.storage_areas[storage_identifier].ripple_objects[ripple_id].sync_settings.storage_areas?.[storage_identifier].operation || sync_args.storage_areas[storage_identifier].ripple_objects[ripple_id].sync_settings.operation || sync_args.storage_areas[storage_identifier].operation;
                if (deletion === true){
                  operation = "delete";
                }
                let storage_pass = sync_args.storage_areas[storage_identifier].ripple_objects[ripple_id].sync_settings.storage_areas?.[storage_identifier].storage_pass || sync_args.storage_areas[storage_identifier].ripple_objects[ripple_id].sync_settings.storage_pass || sync_args.storage_areas[storage_identifier].storage_pass;
                let post_pass = sync_args.storage_areas[storage_identifier].ripple_objects[ripple_id].sync_settings.storage_areas?.[storage_identifier].post_pass || sync_args.storage_areas[storage_identifier].ripple_objects[ripple_id].sync_settings.post_pass || sync_args.storage_areas[storage_identifier].post_pass;
                let skip_storage_check = sync_args.storage_areas[storage_identifier].ripple_objects[ripple_id].sync_settings.storage_areas?.[storage_identifier].skip_storage_check || sync_args.storage_areas[storage_identifier].ripple_objects[ripple_id].sync_settings.skip_storage_check || sync_args.storage_areas[storage_identifier].skip_storage_check;
                if (post_pass !== undefined){
                  Ripple.add_to_post_pass_dict(post_pass_dict, post_pass);
                }
                Ripple.add_to_batch_sync_dict(sync_args, batch_sync_dict, storage_identifier, ripple_id, operation, storage_pass, skip_storage_check, single_id);
              }
            }
          }
        }
        if (sync_args.storage_areas[storage_identifier].sync_settings.all === true && batch_sync_dict[storage_identifier] === undefined && single_id === undefined){
          batch_sync_dict[storage_identifier] = Ripple.prep_batch_sync_message(true, sync_args.storage_areas?.[storage_identifier]?.sync_settings?.defaults);
        }
      }
    }
    let promises = [];
    let responses = {};
    for (let storage_identifier in batch_sync_dict){
      promises.push(Ripple.batch_sync_process(storage_identifier, batch_sync_dict[storage_identifier], post_pass_dict[storage_identifier] || {}, serialize_pass, {listed: listed_post_pass_default[storage_identifier], others: others_post_pass_default[storage_identifier]}, responses));
    }
    await Promise.all(promises);
    return responses;
  }
  static async batch_sync_process(storage_identifier, send_msg, post_pass_lookup, serialize_pass, default_post_pass, response_collection){
    /*
      batch sync process for an individual Storage_Area
      sends the sync message with the batch of ripple_ids
      and then for each id in the response, does sync_response event handler
      arguments:
        "storage_identifier" - identifier for the storage_area to sync with
        "send_msg" - the batch_sync_message to send
        "post_pass_lookup" - [ripple_id]: post_pass (arbitrary values to pass to sync_response handler)
        "serialize_pass" - to pass to message serialization
        "default_post_pass" - more post_pass values, these are defaults for ids that may not exist in this Ripple environment yet but are in the response as part of the "all" sync_arg
        "response_collection" - for collecting this batch response for sync processes involving multiple Storage_Areas
      returns:
        the batch_sync_response
    */
    let batch_response = await Ripple.storage_areas[storage_identifier].sync(send_msg, serialize_pass);
    if (response_collection !== undefined){
     response_collection[storage_identifier] = batch_response;
    }
    let promises = [];
    for (let ripple_id in batch_response.ids){
      promises.push(
        Ripple.handle_event(
          "sync_response", 
          Ripple.lookup[ripple_id], 
          [batch_response.ids[ripple_id], {[storage_identifier]: batch_response}, send_msg.ids[ripple_id], send_msg, ripple_id in Ripple.lookup ? (post_pass_lookup[ripple_id] || default_post_pass.listed) : (post_pass_lookup[ripple_id] || default_post_pass.others)]
        )
      );
    }
    await Promise.all(promises);
    return batch_response;
  }
  static prep_individual_sync_message(ripple_id, operation, storage_pass, skip_storage_check, batch_message){
    /*
      preps individual sync operation message based on desired operation
      adds it to batch_message.ids, or creates a new batch_message for it if none is specified
      see Ripple.prep_batch_sync_message() for more details
      arguments:
        "ripple_id" - the id of the Ripple synced object to be synced
        "operation" - the operation to perform - "create", "read", "update", "write", "delete"
        "storage_pass" - arbitrary value to include and pass to storage_handler functions during sync
        "skip_storage_check" - whether to skip checking current value in storage as part of sync
        "batch_message" - an existing batch_message to add the prepped individual sync message to
      returns:
        batch_sync_message the prepped individual sync message is a part of
    */
    let ret_obj = {
      ripple_id: ripple_id,
    }
    if (operation !== undefined){
      ret_obj.operation = operation;
    }
    if (storage_pass !== undefined){
      ret_obj.storage_pass = storage_pass;
    }
    if (skip_storage_check === true){
      ret_obj.skip_storage_check = true;
    }
    if (operation === "create" || operation === "update" || operation === "write"){
      let ripple_obj = Ripple.lookup[ripple_id];
      /* IMPORTANT: the lines below (ret_obj.sync = ...) is the code that actually determines what gets sent as a ripple_object to storage: */
      ret_obj.sync = {
        ripple_id: ripple_obj.ripple_id,
        ripple_version: ripple_obj.ripple_version,
        ripple_data: ripple_obj.ripple_data
      }
    }
    if (batch_message !== undefined){
      batch_message.ids[ripple_id] = ret_obj; 
    } else {
      batch_message = Ripple.prep_batch_sync_message();
      batch_message.ids[ripple_id] = ret_obj;
    }
    return batch_message;
  }
  static prep_batch_sync_message(all, defaults){
    /*
      preps a batch sync message
      all sync operations are performed as if batched, message format is as follows
      {
        ripple_sender: Ripple.environment_identifier, //the identifier for this Ripple environment
        all: true, //(optional - if you want to perform operations on all ripple_objects that are in storage, ie things that are nonexistent in this Ripple environment or not included in batch_message.ids),
        ids: { //dictionary organizing operations by the id to operate on
          [<ripple_id str>]: { //object describing operation to be performed:
            ripple_id: <ripple_id str>, //the identifier of the Ripple_Object to operate on
            operation: "create" || "update" || "read" || "delete", //the operation to perform on this id - optional if using defaults (see below)
            storage_pass: <arbitrary>, //optional, arbitrary thing that gets passed to storage handler for this operation
            sync: <ripple_object>, //optional, required for "create" and "update" operations, if missing will fall back to a "read" operation
          }
          ...
        }
        defaults: { 
          listed: { //are applied to ids with no "operation" or "storage_pass" specified in batch_message.ids[id]
            operation: "create" || "update" || "read" || "delete",
            storage_pass: <arbitrary>
          }
          others: { //are applied to ids not listed in batch_message.ids[id] - for example, when using batch_message.all for things that exist in storage, but weren't part of this batch message
            operation: "create" || "update" || "read" || "delete",
            storage_pass: <arbitrary>
          }
        }
      }
      arguments:
        "all" - optional boolean setting for retrieving unlisted "others", see above
        "defaults" - optional default arguments, see above
      returns:
        batch sync message
    */
    let ret = {
      ripple_sender: Ripple.environment_identifier,
      ids: {}
    }
    if (all === true){
      ret.all = true;
    }
    if (defaults !== undefined){
      ret.defaults = {};
      function loop_set(to_set, from){
        for (let prop in from){
          if (prop !== "post_pass"){
            if (typeof from[prop] === "object"){
              to_set[prop] = {};
              loop_set(to_set[prop], from[prop]);
            } else {
              to_set[prop] = from[prop];
            }
          }
        }
      }
      loop_set(ret.defaults, defaults);
    }
    return ret;
  }
  static add_storage_area(storage_area){
    //adds storage area to Ripple.storage_areas
    Ripple.storage_areas[storage_area.storage_identifier] = storage_area;
  }
  static add_to_batch_sync_dict(sync_args, batch_sync_dict, storage_identifier, ripple_id, operation, storage_pass, skip_storage_check, single_id){
    //used during Ripple.sync() to prep sync messages
    if (batch_sync_dict[storage_identifier] === undefined){
      batch_sync_dict[storage_identifier] = Ripple.prep_batch_sync_message(single_id === undefined ? sync_args.storage_areas?.[storage_identifier]?.sync_settings?.all : false, sync_args.storage_areas?.[storage_identifier]?.sync_settings?.defaults);
    }
    Ripple.prep_individual_sync_message(ripple_id, operation, storage_pass, skip_storage_check, batch_sync_dict[storage_identifier]);
  }
  static add_to_post_pass_dict(post_pass_dict, storage_identifier, ripple_id, post_pass){
    //used during Ripple.sync() to keep track of arguments
    if (post_pass_dict[storage_identifier] === undefined){
      post_pass_dict[storage_identifier] = {};
    }
    post_pass_dict[storage_identifier][ripple_id] = post_pass;
  }
}

class Ripple_Object extends Object{
  /*
    synced object class:
    the following gets saved in storage - see Ripple.prep_individual_sync_message()
      ripple_data is the object that gets synced
      ripple_id is its unique identifier
      ripple_version is "version" info, but really its just an extra property that isn't id or data and gets saved in storage and isn't really used for anything right now
    not included:
      sync_settings - if desired you can attach sync settings that'll be used in batch sync, these don't get saved in storage though
  */
  ripple_data = {};
  ripple_version = null;
  ripple_id = null;
  sync_settings = {
    //see Ripple.sync()
    //storage_pass, operation, post_pass, skip_storage_check
    //storage_areas: {
    // [storage_identifier]: {
    //    storage_pass, operation, post_pass, skip_storage_check
    // }
  }
  constructor(initial_val, storage_id = crypto.randomUUID(), opt_ripple_version){
    /*
      initial_val -> ripple_data, *NOTE: uses object.assign, so beware reference issues (TO DO: implement clone function?)
      storage_id -> ripple_id,
      opt_ripple_version -> ripple_version

      in event of an id collision with existing id in Ripple.lookup, will use a randomUUID instead
    */
    super();
    if (initial_val !== undefined && typeof initial_val === "object"){
       Object.assign(this.ripple_data, initial_val);
    }
    while (storage_id in Ripple.lookup){
      let new_id = crypto.randomUUID()
      console.warn("sync id collision: "+storage_id+", using this id instead: "+new_id);
      storage_id = new_id;
    }
    this.ripple_id = storage_id;
    if (opt_ripple_version !== undefined){
      this.ripple_version = opt_ripple_version;
    } 
    Ripple.lookup[this.ripple_id] = this;
  }
  async sync(sync_args = {
    storage_areas: Ripple.storage_areas,
    ripple_objects: {
      [this.ripple_id]: this
    }
  }, serialize_pass){
    /*
      batch sync - pretty much just Ripple.sync(), 
      but with an extra argument telling it to ignore anything that isn't this ripple_object
      arguments:
        "sync_args" - see Ripple.sync()
        "serialize_pass" - arbitrary value to pass to serialization of sync messages
      returns:
        {[storage_identifier]: batch_sync_response}
    */
    return new Promise(async (resolve, reject)=>{
      let batch_reply = await Ripple.sync(sync_args, this.ripple_id, undefined, serialize_pass);
      resolve(batch_reply);
    })
  }
  async sync_to(where, operation = "create", storage_pass, skip_storage_check, serialize_pass, post_pass){
    /*
      fine-grained individual sync process for a single ripple_object to a single storage_area
      technically still sends a "batch" sync message, but doesn't go through the whole process of putting it together the way Ripple.sync() or Ripple_Object.sync() does
      basically just puts together the message and then passes it to the storage area's sync function
      arguments:
        "where" = storage_area to sync to (Class, or string storage_identifier of correesponding storage_area in Ripple.storage_areas)
        "operation" = "create" || "update" || "write" || "read" || "delete"
        "storage_pass" = anything else to pass to handlers in storage
        "serialize_pass" - arbitrary value to pass to serialization of sync messages
        "skip_storage_check" = true if you don't want to check storage while doing this operation, false to force storage check (ignored for "read", "create", "update" which require checking storage if ommitted uses the storage_area's settings)
        "post_pass" = anything else to pass to handlers in the post_sync process, ie the "storage_update" event handlers
      returns:
        {[storage_identifier]: batch_sync_response}
    */
    if (typeof where === "string"){
      where = Ripple.storage_areas[where];
    }
    return new Promise(async (resolve, reject)=>{
      let batch_message = Ripple.prep_individual_sync_message(this.ripple_id, operation, storage_pass, skip_storage_check)
      let sync_response = await where.sync(batch_message, serialize_pass);
      await Ripple.handle_event("sync_response", this, [sync_response.ids[this.ripple_id], {[where.storage_identifier]: sync_response}, batch_message.ids[this.ripple_id], batch_message, post_pass]);
      resolve({[where.storage_identifier]: sync_response});
    })
  }
  async delete_from(where, storage_pass, skip_storage_check, serialize_pass, post_pass){
    /*
      fine-grained individual deletion process for a single ripple_object to a single storage_area
      technically still sends a "batch" sync message, but doesn't go through the whole process of putting it together the way Ripple.sync() or Ripple_Object.sync() does
      basically just puts together the message and then passes it to the storage area's sync function
      args:
        "where" = storage_area to sync to (Class, or string storage_identifier of correesponding storage_area in Ripple.storage_areas)
        "storage_pass" = anything else to pass to handlers in storage
        "skip_storage_check" = true if you don't want to check storage while doing this operation, false to force storage check (ignored for "read", "create", "update" which require checking storage if ommitted uses the storage_area's settings)
        "serialize_pass" - arbitrary value to pass to serialization of sync messages
        "post_pass" = anything else to pass to handlers in the post_sync process, ie the "storage_update" event handlers
      returns:
        {[storage_identifier]: batch_sync_response}
    */
    return this.sync_to(where, "delete", storage_pass, skip_storage_check, serialize_pass, post_pass);
  }
  async delete(arg, serialize_pass){
    /*
      batch sync, but only deletion on this ripple_object
        Ripple_Object.delete() = just delete locally (arg undefined)
        Ripple_Object.delete(true) = delete from all storage areas
        Ripple_Object.delete(arg_dict) = delete based on arg_dict, which should be a .sync() function sync_args, that gets forced to just this ripple_id, and just "delete" operations
      arguments:
        "sync_args" - see Ripple.sync()
        "serialize_pass" - arbitrary value to pass to serialization of sync messages
      returns:
        {[storage_identifier]: batch_sync_response}
        or
        {} - if only deleted locally
    */
    if (arg === true){
      arg = {
        storage_areas: Ripple.storage_areas,
        ripple_objects: {
          [this.ripple_id]: this
        }
      }
    }
    delete Ripple.lookup[this.ripple_id];
    await Ripple.handle_event("deleted_locally", this, [this]);
    if (arg !== undefined){
      return new Promise(async (resolve, reject)=>{
        let batch_reply = await Ripple.sync(arg, this.ripple_id, true, serialize_pass);
        resolve(batch_reply);
      });
    } else {
      return new Promise(async (resolve, reject)=>{
        resolve({});
      });
    }
  }
  modified(){
    /*
      just a function to trigger "modified" event on this Ripple_Object
    */
    Ripple.handle_event('modified', this, [])
  }
}