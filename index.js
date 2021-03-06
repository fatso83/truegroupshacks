// ==UserScript==
// @name         True Groups Hacks
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Make True Groups great again. Latest version at https://github.com/fatso83/truegroupshacks
// @author       Carl-Erik Kopseng <carlerik@gmail.com>
// @match        https://www.truegroups.com/Messages/Index
// @grant        none
// ==/UserScript==

const hasGreaseMonkeyAPI = typeof GM_info !== "undefined";
const buttonId = "start-mark-read-btn";
const pulseSpeed = 500;
let userId = null;

function init() {
  const elem = document.getElementById("loggedinuserid");
  userId = elem.value;

  addMarkElementAsReadToUI();
}

function getUnreadMessagesElem(){
  return document.getElementById("ButtonMsgNotification");
}

function getNumberOfUnreadMessagesFromDOM(){
  const elem = getUnreadMessagesElem();
  return parseInt(elem.innerText, 10);
}

async function getNumberOfUnreadMessages(){
  return (await fetch("https://www.truegroups.com/Message/GetMessageMenuNotification", {
    "credentials": "include"
  }).then(res => res.json())).Count
}

function allMessagesReadAtStartup() {
  return getUnreadMessagesElem().classList.contains("msg-count-zero");
}

async function clickMoreButtonAwaitAndDo(action) {
  const moreButton = document.getElementById("seeMoreMessages");
  const unread = await getNumberOfUnreadMessages();

  if (unread > 0) {
    console.log("Fetching more messages ...");
    moreButton.children[0].click();
    setTimeout(action, 5000); // could of course had a MutationObserver or something, but this is a one-off script ...
  } else {
    console.log("No unread messages. Nothing more to do!");
    stopPulse();
    alert("Alle meldinger lest; laster siden på nytt");
    location.reload()
  }
}

let currentColor;
function changeColor(){
    const btn = getButton();
    currentColor = currentColor === 'yellow'? 'red' : 'yellow';

    btn.style.backgroundColor = currentColor;
}

let pulseProcess = null;;
function startPulse(){
  if( pulseProcess ) return;

  changeColor();
  pulseProcess = setInterval(changeColor, pulseSpeed);
};

function stopPulse(){
    getButton().style.backgroundColor = 'red';
    clearInterval(pulseProcess);
    pulseProcess = null;
}

function getButton(){
  const btn = document.getElementById(buttonId);
  if(!btn) {
      throw new Error("No button found!");
      return;
  }
  return btn;
}

async function markAllAsRead() {
  if (!userId) {
    init();
  }

  if (allMessagesReadAtStartup()) {
    console.log("No unread messages. Aborting execution.");
    alert("Ingen uleste meldinger");
    return;
  }

  startPulse();
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
  button.id=buttonId;
  button.style = `
display: inline-block;
position: relative;
top: 3px;
height: 16px;
width: 16px;
margin-right: 3px;
transition-duration:${pulseSpeed/1000}s;
background: red;
border-radius: 8px;
border: 0;
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
        startPulse,
        stopPulse,
        init
    };
}
