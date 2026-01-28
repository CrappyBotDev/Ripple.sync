class Background_Chrome_Local_Storage_Adapter extends Object{
  /* Storage Adapter: */
  static sync_settings = {};
  static storage_identifier = "background_chrome_local";
  static async send_message_to_external(message){
    /* customized for this environment / implementation */
    let response = await chrome.runtime.sendMessage(message);
    return response;
  }
  static async sync(message, serialize_pass){
    let serialized = await Ripple.serialize_message(message, serialize_pass);
    return new Promise(async (resolve, reject)=>{
      let response = await Background_Chrome_Local_Storage_Adapter.send_message_to_external(serialized);
      let response_deserialized = await Ripple.deserialize_message(response, serialize_pass);
      resolve(response_deserialized);
    });
  }
}

function listener_function(message, sender, sendResponse){
  /*
    named function for handling Ripple messages
    could be built into the Ripple class
  */
  if ("ripple_propagation" in message){
    //filtering to propagation messages only since chrome.runtime.sendmessage broadcasts to all extension pages and we don't want to handle messages intended for the Background_Chrome_Local_Storage_Area class
    Ripple.receive_message(message, {chrome_sender: sender});
  }
}

class Ripple extends Object{
  static lookup = {};
  static listening = false;
  static environment_identifier = "content_script";
  static storage_areas = {
    [Background_Chrome_Local_Storage_Adapter.storage_identifier]: Background_Chrome_Local_Storage_Adapter,
  };
  static async deserialize_message(message, serialize_pass){
    /* customized for this environment / implementation */
    let deserialized = JSON.parse(message.msg);
    deserialized.chrome_sender = serialize_pass?.chrome_sender;
    deserialized.ripple_sender =  message.ripple_sender;
    return deserialized;
  }
  static async serialize_message(message, serialize_pass){
    /* customized for this environment / implementation */
    return {
      msg: JSON.stringify(message),
      ripple_sender: Ripple.environment_identifier
    }
  }
  static async listen(){
    /* customized for this environment / implementation */
    if (Ripple.listening === false){
      Ripple.listening = true;
      chrome.runtime.onMessage.addListener(listener_function);
    }
  }
  static async stop_listening(){
    /* customized for this environment / implementation */
    if (Ripple.listening === true){
      Ripple.listening = false;
      chrome.runtime.onMessage.removeListener(listener_function);
    }
  }
  static async receive_message(message, serialize_pass){
    let deserialized = await Ripple.deserialize_message(message, serialize_pass);
    Ripple.handle_event("message_received", undefined, [deserialized]);
  }
  static async default_on_message_received(event_info, message){
    let ripple_id = message.ripple_id;
    Ripple.handle_event("sync_update", Ripple.lookup[ripple_id], [message]);
  }
  static async default_on_sync_update(event_info, propagation_message){
    /* customized for this environment / implementation */
    //just handles propagated updates to ripple objects that dont exist in this environment yet
    //existing ones have their own on_sync_update handler function, and the on_sync_update event does not continue / bubble after the handler is called
    if (propagation_message.sync !== null){
      Ripple.create(propagation_message.sync, undefined, Ripple_Page_Element);
    }
  }
  static async default_on_sync_response(event_info, sync_response, batch_sync_response, sync_message, batch_sync_message, post_pass){
    /* customized for this environment / implementation */
    //similar to on_sync_update, this should only be handling sync_responses for things that don't exist in this environment yet
    //ie, when the "all" argument is used, such as clicking the "Sync From Storage" button
    if (sync_response.sync !== null){
      Ripple.create(sync_response.sync, undefined, Ripple_Page_Element);
    }
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

class Ripple_Page_Element extends Ripple_Object{
  /*
    Ripple Object with an html element representing it on the page
      .ripple_data.color = text color
      .ripple_data.backgroundColor = background color
  */
  page_element = null;
  constructor(ripple_data, ripple_id, ripple_version){
    super(ripple_data, ripple_id, ripple_version);
    this.page_element = Ripple_Page_Element.make_ripple_page_element(this);
  }
  static make_ripple_page_element(ripple_obj){
    let ripple_data = ripple_obj.ripple_data;
    let ripple_id = ripple_obj.ripple_id;
    let page_element = document.createElement('div');
    page_element.id = ripple_id;
    page_element.className = "ripple_obj";
    page_element.style.backgroundColor = ripple_data.backgroundColor;
    page_element.style.color = ripple_data.color;
    page_element.innerHTML = '<div class="ripple_sync"><button class="sync_button" data-ripple="'+ripple_id+'">sync</button></div><div class="ripple_edit"><button class="edit_button" data-ripple="'+ripple_id+'">edit</button></div><div class="ripple_delete"><button class="delete_button" data-ripple="'+ripple_id+'">delete</button></div><div class="id_label">'+ripple_id+'</div>';
    page_element.getElementsByClassName('sync_button')[0].onclick = function(){
      //sync button writes the value on this page into storage, will propagatye to other instances
      ripple_obj.sync_to(Background_Chrome_Local_Storage_Adapter, "write");
    };
    page_element.getElementsByClassName('delete_button')[0].onclick = function(){
      //delete button deletes this from all storage areas
      ripple_obj.delete(true);
    };
    page_element.getElementsByClassName('edit_button')[0].onclick = function(){
      //edit button just sets up the edit controls at the bottom
      //which will change the local environment value when "Make / Edit Ripple Obj" is clicked
      //new value won't be saved in storage / propagated until synced
      document.getElementById('make_id').value = ripple_id;
      document.getElementById('make_color').value = ripple_data.color;
      document.getElementById('make_bgcolor').value = ripple_data.backgroundColor;
    };
    document.getElementById('test_container').appendChild(page_element);
    return page_element;
  }
  async on_deleted_locally(event_info){
    //just gets rid of the page element when this is deleted from local environment
    this.page_element.remove();
  }
  async on_sync_response(event_info, sync_response, batch_sync_response, sync_message, batch_sync_message, post_pass){
    //handles responses to syncs that originated in this environment
    //technically, this is a bit redundant, since in this setup:
    if (sync_response.status === "completed"){
      if (sync_response.operation === "delete"){
        this.delete(); //if the deletion originated here, it should already be deleted locally
      } else {
        this.ripple_data = sync_response.sync.ripple_data;
        this.modified(); //and if it was anything else that originated here, this should already have been called when the local change was made
      }
    }
  }
  async on_sync_update(event_info, propagation_message){
    // this isn't redundant though, this handles sync_updates from other environments
    if (propagation_message.status === "completed"){
      if (propagation_message.operation === "delete"){
        this.delete(); //if it was deleted in storage, delete this
      } else {
        this.ripple_data = propagation_message.sync.ripple_data; //keep it in sync
        this.modified(); //and update the page element
      }
    }
  }
  async on_modified(event_info){
    //update the page element to match ripple_data colors
    this.page_element.style.backgroundColor = this.ripple_data.backgroundColor;
    this.page_element.style.color = this.ripple_data.color;
  }
}