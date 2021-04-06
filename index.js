// ==UserScript==
// @name         True Groups Hacks
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Make True Groups great again. Latest version at https://github.com/fatso83/truegroupshacks
// @author       Carl-Erik Kopseng <carlerik@gmail.com>
// @match        https://www.truegroups.com/Messages/Index
// @grant        none
// ==/UserScript==

const hasGreaseMonkeyAPI = typeof GM_info !== "undefined";
let userId = null;

function init() {
  const elem = document.getElementById("loggedinuserid");
  userId = elem.value;

  addMarkElementAsReadToUI();
}

function allMessagesRead() {
  const elem = document.getElementById("ButtonMsgNotification");
  return elem.classList.contains("msg-count-zero");
}

function clickMoreButtonAwaitAndDo(action) {
  const moreButton = document.getElementById("seeMoreMessages");
  if (moreButton) {
    console.log("Fetching more messages ...");
    moreButton.children[0].click();
    setTimeout(action, 5000); // could of course had a MutationObserver or something, but this is a one-off script ...
  } else {
    console.log("No 'more' button found. Nothing more to do!");
    alert("Alle meldinger lest");
  }
}

async function markAllAsRead() {
  if (!userId) {
    init();
  }

  if (allMessagesRead()) {
    console.log("No unread messages. Aborting execution.");
    alert("Ingen uleste meldinger");
    return;
  }

  const prefix = "liParentMessage";
  const unfilteredNodes = document.querySelectorAll(`[id^=${prefix}]`);
  const nodes = [].filter.call(unfilteredNodes, (n) =>
    n.querySelector(".unreadMessage")
  );

  const promises = [];
  for (const node of nodes) {
    const messageId = node.id.replace(prefix, "");
    const p = fetch(
      `https://www.truegroups.com/Message/GetMessageThread?userId=${userId}&parentMessageId=${messageId}&eventId=0&groupId=0&grpEvtName=&messagePermission=0`
    );
    promises.push(p);

    // don't DOS the server :D
    if (promises.length > 10) {
      await Promise.all(promises);
    }
  }

  return clickMoreButtonAwaitAndDo(markAllAsRead);
}

function expandMessageList() {
  return clickMoreButtonAwaitAndDo(expandMessageList);
}

function addMarkElementAsReadToUI() {
  const isDesktop = window.matchMedia('(min-width: 720px)').matches;
  const messages = document.getElementById("div_MessageNotificationSection");

  const button = document.createElement("button");
  button.style = `
background: red;
border-radius: 8px;
border: 0;
height: 16px;
width: 16px;
display: inline-block;
margin-right: 3px;
position: relative;
top: 3px;
`;

  const text = document.createElement("span");

  if(isDesktop) {
    text.append("Merk som lest");
  }

  text.style = `
display: inline-block;
color: white;
font-weight: 700;
`;

  const link = document.createElement("a");
  if(isDesktop) link.style = "padding: 15px 8px;";
  link.append(button);
  link.append(text);

  const liElem = document.createElement("li");
  liElem.append(link);
  messages.insertAdjacentElement("afterend", liElem);

  liElem.onclick = markAllAsRead;
}

// Running inside of TamperMonkey or GreaseMonkey? Auto-start
if(hasGreaseMonkeyAPI){
    console.info(GM_info.script.description);
    init();

    // expose on window for experimentation
    window.TGHacks = {
        markAllAsRead,
        expandMessageList,
        addMarkElementAsReadToUI,
        init
    };

}
