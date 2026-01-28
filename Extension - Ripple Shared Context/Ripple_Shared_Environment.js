class Storage_Area extends Object{
  static storage_identifier = "storage_area";
  static settings = {
    default_skip_storage_check: false,
    default_operation: "read",
    force_skip_storage_check: undefined,
    force_operation: undefined
  }
  static batch_queue = [];
  static listening = false;
  static async listen(){
  }
  static async stop_listening(){
  }
  static async storage_deserialize(thing_from_storage){
    return thing_from_storage
  }
  static async storage_serialize(thing_to_store){
    return thing_to_store;
  }
  static async deserialize_message(message, serialize_pass){
    return message;
  }
  static async serialize_message(message, serialize_pass){
    return message;
  }
  static async storage_key_from_ripple_id(ripple_id){
    return ripple_id;
  }
  static async get_by_id(keys_arr){
  }
  static async set_by_id(obj){
  }
  static async delete_by_id(keys_arr){
  }
  static async propagate(propagation_message, batch_message, sync_message, sync_response, propagation_pass){
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
    let deserialized = await Storage_Area.deserialize_message(message, serialize_pass);
    let result = null;
    return new Promise(async (resolve, reject)=>{
      result = await Storage_Area.sync_process(deserialized);
      let reserialized = await Storage_Area.serialize_message(result, serialize_pass);
      resolve(reserialized);
    });
  }
  static add_to_queue(msg, resolver){
    Storage_Area.batch_queue.push({
      msg: msg,
      resolver: resolver
    });
    if (Storage_Area.batch_queue.length === 1){
      Storage_Area.batch_sync_process(msg, resolver);
    }
  }
  static shift_queue(){
    Storage_Area.batch_queue.shift();
    if (Storage_Area.batch_queue.length !== 0){
      let next = Storage_Area.batch_queue[0];
      Storage_Area.batch_sync_process(next.msg, next.resolver);
    }
  }
  static async sync_process(sync_message){
    return new Promise(async (resolve, reject)=>{
      Storage_Area.add_to_queue(sync_message, resolve);
    });
  } 
  static async individual_sync_process(batch_message, sync_message, storage_results, batch_results, listed = "listed", checked_args){
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
  static sync_settings = {};
  static storage_identifier = "storage_area";
  static async send_message_to_external(message){
    return Storage_Area.receive_and_respond(message);
  }
  static async sync(message, serialize_pass){
    let serialized = await Ripple.serialize_message(message, serialize_pass);
    return new Promise(async (resolve, reject)=>{
      let response = await Storage_Adapter.send_message_to_external(serialized);
      let response_deserialized = await Ripple.deserialize_message(response, serialize_pass);
      resolve(response_deserialized);
    });
  }
}

class Ripple extends Object{
  static lookup = {};
  static listening = false;
  static async deserialize_message(message, serialize_pass){
    return message;
  }
  static async serialize_message(message, serialize_pass){
    return message;
  }
  static async listen(){
  }
  static async stop_listening(){
  }
  static async receive_message(message, serialize_pass){
    let deserialized = await Ripple.deserialize_message(message, serialize_pass);
    Ripple.handle_event("message_received", undefined, [deserialized]);
  }
  static environment_identifier = "content_script";
  static storage_areas = {
    [Storage_Adapter.storage_identifier]: Storage_Adapter,
  };
  static async default_on_message_received(event_info, message){
    let ripple_id = message.ripple_id;
    Ripple.handle_event("sync_update", Ripple.lookup[ripple_id], [message]);
  }
  static async default_on_sync_update(event_info, propagation_message){
  }
  static async default_on_sync_response(event_info, sync_response, batch_sync_response, sync_message, batch_sync_message, post_pass){
  }
  static async handle_event(evt_name, origin, args_array){
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
    Ripple.storage_areas[storage_area.storage_identifier] = storage_area;
  }
  static add_to_batch_sync_dict(sync_args, batch_sync_dict, storage_identifier, ripple_id, operation, storage_pass, skip_storage_check, single_id){
    if (batch_sync_dict[storage_identifier] === undefined){
      batch_sync_dict[storage_identifier] = Ripple.prep_batch_sync_message(single_id === undefined ? sync_args.storage_areas?.[storage_identifier]?.sync_settings?.all : false, sync_args.storage_areas?.[storage_identifier]?.sync_settings?.defaults);
    }
    Ripple.prep_individual_sync_message(ripple_id, operation, storage_pass, skip_storage_check, batch_sync_dict[storage_identifier]);
  }
  static add_to_post_pass_dict(post_pass_dict, storage_identifier, ripple_id, post_pass){
    if (post_pass_dict[storage_identifier] === undefined){
      post_pass_dict[storage_identifier] = {};
    }
    post_pass_dict[storage_identifier][ripple_id] = post_pass;
  }
}

class Ripple_Object extends Object{
  ripple_data = {};
  ripple_version = null;
  ripple_id = null;
  sync_settings = {
  }
  constructor(initial_val, storage_id = crypto.randomUUID(), opt_ripple_version){
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
    return new Promise(async (resolve, reject)=>{
      let batch_reply = await Ripple.sync(sync_args, this.ripple_id, undefined, serialize_pass);
      resolve(batch_reply);
    })
  }
  async sync_to(where, operation = "create", storage_pass, skip_storage_check, serialize_pass, post_pass){
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
    return this.sync_to(where, "delete", storage_pass, skip_storage_check, serialize_pass, post_pass);
  }
  async delete(arg, serialize_pass){
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
    Ripple.handle_event('modified', this, [])
  }
}