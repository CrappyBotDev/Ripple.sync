async function narrow_results(results){
  /*
    just a chrome storage helper function
    deserializes "ripple_data" part of stored stuff
    and removes anything that isn't relevant to ripple
    could be built into the Storage_Area class
  */
  let ret = {}
  for (let prop in results){
    if ("ripple" in results[prop]){
      ret[prop] = await Background_Chrome_Local_Storage_Area.storage_deserialize(results[prop].ripple)
    }
  }
  return ret;
}

function chrome_message_handler(message, sender, sendResponse){
  /*
    named function for handling Ripple messages
    could be built into the Storage_Area class
  */
  async function do_sync(){
    let response = await Background_Chrome_Local_Storage_Area.receive_and_respond(message, {chrome_sender: sender});
    sendResponse(response);
  }
  if ("ripple_sender" in message){
    do_sync();
  }
  return true; //keep open for sendResponse
}

class Background_Chrome_Local_Storage_Area extends Object{
  /* Storage Area: */
  static storage_identifier = "background_chrome_local";
  static settings = {
    default_skip_storage_check: false,
    default_operation: "read",
    force_skip_storage_check: undefined,
    force_operation: undefined
  }
  static batch_queue = [];
  static listening = false;
  static async listen(){
    /* customized for this environment / implementation */
    if (Background_Chrome_Local_Storage_Area.listening === false){
      chrome.runtime.onMessage.addListener(chrome_message_handler);
      Background_Chrome_Local_Storage_Area.listening = true;
    }
  }
  static async stop_listening(){
    /* customized for this environment / implementation */
    if (Background_Chrome_Local_Storage_Area.listening === true){
      chrome.runtime.onMessage.removeListener(chrome_message_handler);
      Background_Chrome_Local_Storage_Area.listening = false;
    }
  }
  static async storage_deserialize(thing_from_storage){
    /* customized for this environment / implementation */
    return JSON.parse(thing_from_storage);
  }
  static async storage_serialize(thing_to_store){
    /* customized for this environment / implementation */
    return {ripple: JSON.stringify(thing_to_store)};
  }
  static async deserialize_message(message, serialize_pass){
   /* customized for this environment / implementation */
    let deserialized = JSON.parse(message.msg);
    deserialized.chrome_sender = serialize_pass.chrome_sender;
    deserialized.ripple_sender =  message.ripple_sender;
    return deserialized;
  }
  static async serialize_message(message, serialize_pass){
    /* customized for this environment / implementation */
    return {
      msg: JSON.stringify(message),
      ripple_sender: Background_Chrome_Local_Storage_Area.storage_identifier
    }
  }
  static async storage_key_from_ripple_id(ripple_id){
    return ripple_id;
  }
  static async get_by_id(keys_arr){
    /* customized for this environment / implementation */
    return new Promise(async (resolve, reject)=>{
      chrome.storage.local.get(keys_arr, (a)=>{
        let ret = narrow_results(a);
        resolve(ret);
      })
    });
  }
  static async set_by_id(obj){
    /* customized for this environment / implementation */
    let storage_key = await Background_Chrome_Local_Storage_Area.storage_key_from_ripple_id(obj.ripple_id);
    let store_obj = await Background_Chrome_Local_Storage_Area.storage_serialize(obj);
    let chrome_obj = {
      [storage_key]: store_obj
    }
    return new Promise(async (resolve, reject)=>{
      chrome.storage.local.set(chrome_obj, resolve);
    });
  }
  static async delete_by_id(keys_arr){
    /* customized for this environment / implementation */
    return new Promise(async (resolve, reject)=>{
      chrome.storage.local.remove(keys_arr, ()=>{
        resolve();
      })
    });
  }
  static async propagate(propagation_message, batch_message, sync_message, sync_response, propagation_pass){
    /* customized for this environment / implementation */
    let send = await Background_Chrome_Local_Storage_Area.serialize_message(propagation_message);
    send.ripple_propagation = true;
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id !== batch_message.chrome_sender.tab.id){ //not propagating to originating tab
          try{
            chrome.tabs.sendMessage(tab.id, send);
          } catch(err){
            //will still put an error message in console: Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist. for tabs that don't have a message listener from this extension environment
          }
        }
      });
      //for pages that don't exist in tabs, such as extension popups:
      chrome.runtime.sendMessage(send);
    });
  }
  static async handle_create(operation_info){
  }
  static async handle_update(operation_info){
  }
  static async handle_write(operation_info){
  }
  static async handle_read(operation_info){
  }
  static async handle_delete(operation_info){
  }
  static async receive_and_respond(message, serialize_pass){
    let deserialized = await Background_Chrome_Local_Storage_Area.deserialize_message(message, serialize_pass);
    let result = null;
    return new Promise(async (resolve, reject)=>{
      result = await Background_Chrome_Local_Storage_Area.sync_process(deserialized);
      let reserialized = await Background_Chrome_Local_Storage_Area.serialize_message(result, serialize_pass);
      resolve(reserialized);
    });
  }
  static add_to_queue(msg, resolver){
    Background_Chrome_Local_Storage_Area.batch_queue.push({
      msg: msg,
      resolver: resolver
    });
    if (Background_Chrome_Local_Storage_Area.batch_queue.length === 1){
      Background_Chrome_Local_Storage_Area.batch_sync_process(msg, resolver);
    }
  }
  static shift_queue(){
    Background_Chrome_Local_Storage_Area.batch_queue.shift();
    if (Background_Chrome_Local_Storage_Area.batch_queue.length !== 0){
      let next = Background_Chrome_Local_Storage_Area.batch_queue[0];
      Background_Chrome_Local_Storage_Area.batch_sync_process(next.msg, next.resolver);
    }
  }
  static async sync_process(sync_message){
    return new Promise(async (resolve, reject)=>{
      Background_Chrome_Local_Storage_Area.add_to_queue(sync_message, resolve);
    });
  } 
  static async individual_sync_process(batch_message, sync_message, storage_results, batch_results, listed = "listed", checked_args){
    let id = sync_message.ripple_id;

    let requested_operation = sync_message.operation || batch_message.defaults?.[listed]?.operation;
    let attempted_operation = null;
    let skip_storage_check = null;
    if (checked_args === undefined){
      attempted_operation = requested_operation || Background_Chrome_Local_Storage_Area.settings.default_operation;
      if (Background_Chrome_Local_Storage_Area.settings.force_operation !== undefined){
        if (typeof Background_Chrome_Local_Storage_Area.settings.force_operation === "string"){
          attempted_operation = Background_Chrome_Local_Storage_Area.settings.force_operation;
        } else if (Background_Chrome_Local_Storage_Area.settings.force_operation[attempted_operation] !== undefined){
          attempted_operation = Background_Chrome_Local_Storage_Area.settings.force_operation[attempted_operation];
        }
      }

      skip_storage_check = sync_message.skip_storage_check || batch_message.defaults?.[listed]?.skip_storage_check;
      if (skip_storage_check === undefined && Background_Chrome_Local_Storage_Area.settings.default_skip_storage_check !== undefined){
        if (Background_Chrome_Local_Storage_Area.settings.default_skip_storage_check === true){
          skip_storage_check = true;
        } else {
          skip_storage_check = Background_Chrome_Local_Storage_Area.settings.default_skip_storage_check[attempted_operation];
        }
      }
      if (Background_Chrome_Local_Storage_Area.settings.force_skip_storage_check !== undefined){
        if (Background_Chrome_Local_Storage_Area.settings.force_skip_storage_check === true){
          skip_storage_check = true;
        } else if (Background_Chrome_Local_Storage_Area.settings.force_skip_storage_check[attempted_operation] !== undefined) {
          skip_storage_check = Background_Chrome_Local_Storage_Area.settings.force_skip_storage_check[attempted_operation];
        }
      }
    } else {
      attempted_operation = checked_args.operation;
      skip_storage_check = checked_args.skip_storage_check;
    }

    let storage_pass = sync_message.storage_pass || batch_message.defaults?.[listed]?.storage_pass;
    let handler = await Background_Chrome_Local_Storage_Area["handle_"+attempted_operation];
    let key_str = await Background_Chrome_Local_Storage_Area.storage_key_from_ripple_id(id);

    let storage_needed = true;
    if ((attempted_operation === "delete" || attempted_operation === "write") && (skip_storage_check === true || Background_Chrome_Local_Storage_Area.skip_storage_check === true || Background_Chrome_Local_Storage_Area.skip_storage_check?.[attempted_operation] === true)){
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
          await Background_Chrome_Local_Storage_Area.set_by_id(handler_arg.incoming_value);
          batch_results[id].sync = handler_arg.incoming_value;
        } else if (attempted_operation === "delete"){
          await Background_Chrome_Local_Storage_Area.delete_by_id([key_str]);
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
            ripple_sender: Background_Chrome_Local_Storage_Area.storage_identifier
          }
          Background_Chrome_Local_Storage_Area.propagate(propagation_message, batch_message, sync_message, batch_results[id], handler_result.propagation_pass);
        }
      }
    });
  }
  static async batch_sync_process(batch_message, resolve_fn){
    let keys_arr = [];
    let checked_args = {};
    if (batch_message.all === true){
      keys_arr = null;
    } else {
      for (let ripple_id in batch_message.ids){
        let operation = batch_message.ids[ripple_id].operation || batch_message.defaults?.listed?.operation || Background_Chrome_Local_Storage_Area.settings.default_operation;
        if (Background_Chrome_Local_Storage_Area.settings.force_operation !== undefined){
          if (typeof Background_Chrome_Local_Storage_Area.settings.force_operation === "string"){
            operation = Background_Chrome_Local_Storage_Area.settings.force_operation;
          } else if (Background_Chrome_Local_Storage_Area.settings.force_operation[operation] !== undefined){
            operation = Background_Chrome_Local_Storage_Area.settings.force_operation[operation];
          }
        }
        let skip_storage_check = batch_message.ids[ripple_id].skip_storage_check || batch_message.defaults?.listed?.skip_storage_check;
        if (skip_storage_check === undefined && Background_Chrome_Local_Storage_Area.settings.default_skip_storage_check !== undefined){
          if (Background_Chrome_Local_Storage_Area.settings.default_skip_storage_check === true){
            skip_storage_check = true;
          } else {
            skip_storage_check = Background_Chrome_Local_Storage_Area.settings.default_skip_storage_check[operation];
          }
        }
        if (Background_Chrome_Local_Storage_Area.settings.force_skip_storage_check !== undefined){
          if (Background_Chrome_Local_Storage_Area.settings.force_skip_storage_check === true){
            skip_storage_check = true;
          } else if (Background_Chrome_Local_Storage_Area.settings.force_skip_storage_check[operation] !== undefined) {
            skip_storage_check = Background_Chrome_Local_Storage_Area.settings.force_skip_storage_check[operation];
          }
        }
        checked_args[ripple_id] = {
          operation: operation,
          skip_storage_check: skip_storage_check
        }

        if (operation === "read" || operation === "create" || operation === "update" || !skip_storage_check){
          let storage_key = await Background_Chrome_Local_Storage_Area.storage_key_from_ripple_id(ripple_id);
          keys_arr.push(storage_key);
        }
      }
    }
    
    let storage_results = {};
    if (keys_arr === null || keys_arr.length !== 0){
      storage_results = await Background_Chrome_Local_Storage_Area.get_by_id(keys_arr);
    }

    let results_obj = {};
    let results_promises = [];
    for (let id in batch_message.ids){
      results_promises.push(Background_Chrome_Local_Storage_Area.individual_sync_process(batch_message, batch_message.ids[id], storage_results, results_obj, "listed", checked_args[id]));
    }

    for (let thing in storage_results){
      let sync_message = {
        ripple_id: storage_results[thing].ripple_id,
      }
      results_promises.push(Background_Chrome_Local_Storage_Area.individual_sync_process(batch_message, sync_message, storage_results, results_obj, "others"));
    }
    
    await Promise.all(results_promises);  
    resolve_fn({
      ids: results_obj
    });
    Background_Chrome_Local_Storage_Area.shift_queue();
  }
}

export default Background_Chrome_Local_Storage_Area;