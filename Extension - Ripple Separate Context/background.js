/* import the Storage_Area class and call its .listen() method */
import Generic_Direct_Storage from './Ripple_Storage_Area.mjs'
Generic_Direct_Storage.listen();

/* other extension stuff */
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("./example.html")
    });
});