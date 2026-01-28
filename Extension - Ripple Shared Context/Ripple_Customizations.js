/*
  implementing chrome.storage.local:
  will store things as [ripple_id]: {ripple: JSON.stringify(obj)}
*/

async function narrow_results(results){
  /*
    just a chrome storage helper function
    removes anything that isn't relevant to ripple
    and deserializes
  */
  let ret = {}
  for (let prop in results){
    if ("ripple" in results[prop]){
      ret[prop] = await Storage_Area.storage_deserialize(results[prop].ripple);
    }
  }
  return ret;
}

Storage_Area.storage_serialize = async function(obj){
  return {ripple: JSON.stringify(obj)};
}

Storage_Area.storage_deserialize = async function(str){
  return JSON.parse(str);
}

Storage_Area.get_by_id = async function(keys_arr){
  return new Promise(async (resolve, reject)=>{
    chrome.storage.local.get(keys_arr, (a)=>{
      let ret = narrow_results(a);
      resolve(ret);
    })
  });
}

Storage_Area.set_by_id = async function(obj){
  let storage_key = await Storage_Area.storage_key_from_ripple_id(obj.ripple_id);
  let store_obj = await Storage_Area.storage_serialize(obj);
  let chrome_obj = {
    [storage_key]: store_obj
  }
  return new Promise(async (resolve, reject)=>{
    chrome.storage.local.set(chrome_obj, resolve);
  });
}

Storage_Area.delete_by_id = async function(keys_arr){
  return new Promise(async (resolve, reject)=>{
    chrome.storage.local.remove(keys_arr, ()=>{
      resolve();
    })
  });
}

/*
  messaging and propagation for chrome extensions:

  in this case we'll send messages as js objects in format: 
  {
    msg: <string> (JSON.stringify(message)),
    ripple_sender: <string> (storage_identifier, or environment_identifier)
  }

*/

let listener_function = function(message, sender, sendResponse){
  /* function to do when message received in chrome.runtime.onmessage */
  if ("ripple_sender" in message){
    Ripple.receive_message(message, {chrome_sender: sender});
  }
}

Ripple.listen = async function(){
  if (Ripple.listening === false){
    Ripple.listening = true;
    chrome.runtime.onMessage.addListener(listener_function);
  }
}

Ripple.stop_listening = async function(){
  if (Ripple.listening === true){
    Ripple.listening = false;
    chrome.runtime.onMessage.removeListener(listener_function);
  }
}

Ripple.serialize_message = async function(message, serialize_pass){
  return {
    msg: JSON.stringify(message),
    ripple_sender: Ripple.environment_identifier
  }
}

Ripple.deserialize_message = async function(message, serialize_pass){
  let deserialized = JSON.parse(message.msg);
  deserialized.chrome_sender = serialize_pass?.chrome_sender;
  deserialized.ripple_sender =  message.ripple_sender;
  return deserialized;
}


Storage_Area.serialize_message = async function(message, serialize_pass){
  return {
    msg: JSON.stringify(message),
    ripple_sender: Storage_Area.storage_identifier
  }
}

Storage_Area.deserialize_message = async function(message, serialize_pass){
  //adding tab info to message so that it can be used later during propagation
  //sort of spoofing the way it would work in separate extension tabs/contexts
  let tab_check = await chrome.runtime.sendMessage({msg: "tabcheck"});
  let deserialized = JSON.parse(message.msg);
  deserialized.chrome_sender = {tab: {id: tab_check.id}};
  deserialized.ripple_sender =  message.ripple_sender;
  return deserialized;
}

Storage_Area.propagate = async function(propagation_message, batch_message, sync_message, sync_response, propagation_pass){
  let send = await Storage_Area.serialize_message(propagation_message);
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

/*
  Behavior customization
*/

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
      ripple_obj.sync_to(Storage_Adapter, "write");
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

Ripple.default_on_sync_update = async function(event_info, propagation_message){
  //just handles propagated updates to ripple objects that dont exist in this environment yet
  //existing ones have their own on_sync_update handler function, and the on_sync_update event does not continue / bubble after the handler is called
  if (propagation_message.sync !== null){
    Ripple.create(propagation_message.sync, undefined, Ripple_Page_Element);
  }
}

Ripple.default_on_sync_response = async function(event_info, sync_response, batch_sync_response, sync_message, batch_sync_message, post_pass){
  //similar to on_sync_update, this should only be handling sync_responses for things that don't exist in this environment yet
  //ie, when the "all" argument is used, such as clicking the "Sync From Storage" button
  if (sync_response.sync !== null){
    Ripple.create(sync_response.sync, undefined, Ripple_Page_Element);
  }
}
