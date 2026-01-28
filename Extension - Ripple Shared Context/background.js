chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("./example.html")
    });
});

function handle_messages(message, sender, sendResponse){
  if (message.msg === "tabcheck"){
    sendResponse({id: sender.tab.id});
  }
}

chrome.runtime.onMessage.addListener(handle_messages);