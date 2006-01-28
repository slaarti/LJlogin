var ljl_loaded = false;
var ljl_conn = undefined;

function ljlinit() {
  // We only care to have this stuff loaded up once.
  window.removeEventListener("load", ljlinit, true);
  if (ljl_loaded) return;

  // Drop in a little something temporarily to indicate that yes, the
  // extension is loaded, even if it hasn't gotten to doing anything yet.
  document.getElementById("ljlogin").setAttribute("value", "LJlogin");
  document.getElementById("ljlogin-status").setAttribute("class","loaded");
//  return;

  // Hook into the Observer service so we can see when the ljsession
  // cookie changes and update the statusbar widget appropriately.
  var cookiemonster = {
    observe: function(subject, topic, data) {
      // Get the cookie
      var yumcookie = subject.QueryInterface(Components.interfaces.nsICookie);
      // Do we even care about this cookie?
      var ljcookie = new RegExp("livejournal\.com$");
      if ((!ljcookie.test(yumcookie.host)) ||
          (yumcookie.name != "ljsession")) {
        return;
      }
      // Okay. We got this far, so this should be a cookie we want. Now
      // to handle it accordingly.
      switch(data) {
        // Yay, logging in!
        case "added":
        case "changed":
          ljl_loggedin(yumcookie.value);
          break;
        // Aw. Logged out.
        case "deleted":
        case "cleared":
          ljl_loggedout();
          break;
        default:
          break;
      }
    }
  };
  var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(cookiemonster,"cookie-changed",false);

  // And then we need to set the login status as it currently is, in case
  // we're already logged in via a persistent cookie or something.
  var ljsession = ljl_getljsession();
  if (ljsession) {
    ljl_loggedin(ljsession);
  } else {
    ljl_loggedout();
  }

  // Finally, flag that the extension is loaded.
  ljl_loaded = true;
}

function ljl_getljsession() {
  var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
  var handinjar = cookiejar.enumerator;

  while (handinjar.hasMoreElements()) {
    try { // Get the cookie
      var yumcookie = handinjar.getNext();
      if (!yumcookie) { // Oops. No actual cookie there.
        return false;
      }
    } catch (exception) {
      alert(exception);
    }
    // Make the cookie comprehensible.
    yumcookie = yumcookie.QueryInterface(Components.interfaces.nsICookie);
    // Check if it's the one we want.
    var ljcookie = new RegExp("livejournal\.com$");
    if ((ljcookie.test(yumcookie.host)) && (yumcookie.name == "ljsession")) {
      return yumcookie.value;
    }
  }
  return false; // Didn't find the cookie we wanted.
}

function ljl_getljuser(ljcookie) {
  // Try to get the username out of the cookie.

  // First, we need to extract the userid from the ljsession:
  var sessfields = ljcookie.split(":");
  var ljuid = sessfields[1];
  if (!ljuid) { // If there's nothing there, then punt:
    return false;
  }
  return ljuid; // Until the rest of the stuff goes here FIXME
}

function ljl_loggedin(ljcookie) {
  var ljuser = ljl_getljuser(ljcookie);
  if (!ljuser) {
    // Oops. Nothing there, apparently.
    ljl_loggedout();
    return;
  } else {
    document.getElementById("ljlogin").setAttribute("value", ljuser);
    document.getElementById("ljlogin-status").setAttribute("class", "ljuser");
    return;
  }
}

function ljl_loggedout() {
  document.getElementById("ljlogin").setAttribute("value", "Not logged in.");
  document.getElementById("ljlogin-status").setAttribute("class", "loggedout");
}

// Prep a network connection. We should only be trying to do one network-y
// thing at a time (especially since we're using synchronous connection),
// so this will cancel any existing connection before allocating the new one.
function ljl_newconn() {
  ljl_cancelconn(); // Kill any possibly existing connection.
  ljl_conn = new XMLHttpRequest(); // Allocate the new connection.
  // Since we're always going to do these, may as well do them here
  // once and for all. Point the connection at LJ's flat interface,
  // and prep for form posting.
  ljl_conn.open("POST", "http://www.livejournal.com/interface/flat", false);
  ljl_conn.setRequestHeader("Content-Type",
                            "application/x-www-form-urlencoded");
//  ljl_conn.timeout = window.setTimeout("ljl_cancelconn()", 30000);
}

// Finalize the connection.
function ljl_endconn() {
  ljl_conn = undefined;
//  window.clearTimeout(ljl_conn.timeout);
}

// Allow the user (or the extension, should the connection take too long)
// to cancel the current connection attempt.
function ljl_cancelconn() {
  if (ljl_conn !== undefined) {
    ljl_conn.abort();
    ljl_endconn();
  }
}

// Turns the response handed back by LJ's flat interface into a hash object.
function ljl_parseljresponse(ljtext) {
  var ljsaid = new Object();
  var ljlines = ljtext.split("\n");

  for (var i = 0; i < ljlines.length; i += 2) {
    ljsaid[ljlines[i]] = decodeURIComponent(ljlines[i+1]);
  }

  return ljsaid;
}

function ljl_logmeout(dlg) {
  // Get the session cookie. If this isn't there, then there's no point in
  // trying to do anything, 'cause we're not even logged in.
  var ljsession = ljl_getljsession();
  if (!ljsession) return true;

  // Get the browser window.
  var w = (dlg ? window.opener : window);

  // Tell LJ that we want to expire this session.
  ljl_newconn(); // Create the connection.
  // Give the connection our existing login credentials, which we're expiring.
  ljl_conn.setRequestHeader("X-LJ-Auth", "cookie");
  ljl_conn.setRequestHeader("Cookie", "ljsession=" + ljsession);
  // Aaaaaand, go!
  w.status = "Logging out of LiveJournal...";
  ljl_conn.send("mode=sessionexpire&user="
               + encodeURIComponent(ljl_getljuser(ljsession)) +
               "&auth_method=cookie");
  if (ljl_conn.status == 200) { // Assuming a successful request...
    // Check whether the request accomplished the job.
    var ljsaid = ljl_parseljresponse(ljl_conn.responseText);
    if ((ljsaid["success"] == "OK") && (!ljsaid["errmsg"])) {
      // Logout worked. Hooray!
      // Now that we're logged out, trash the cookie. Updating the display
      // in the status bar should happen automagically via the Observer
      // service.
      var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
      cookiejar.remove(".livejournal.com", "ljsession", "/", false);
    } else { // Aw. Logout failed.
      alert("Could not log out of LiveJournal: " + ljsaid["errmsg"]);
    }
  } else { // Something else happened.
    alert("Could not log out of LiveJournal: " + ljl_conn.status
                                         + " " + ljl_conn.statusText);
  }
  w.status = "Done";
  ljl_endconn();
  return true;
}

function ljl_dologin(ljuser, ljpass, dlg) {
  var ljsaid;
  var w = (dlg ? window.opener : window);

  // First thing's first: Before we try to log in as someone, we should
  // log out first. Assuming we are logged in, but the logout function
  // handles checking for that, so we don't have to.
  ljl_logmeout(dlg);

  // Login, Phase I: Get the challenge
  ljl_newconn(); // Create the connection.
  w.status = "Getting challenge from LiveJournal...";
  ljl_conn.send("mode=getchallenge");
  if (ljl_conn.status != 200) { // If something went wrong
    alert("Could not get login challenge from LiveJournal: "
          + ljl_conn.status + " " + ljl_conn.statusText);
    w.status = "Done";
    ljl_endconn();
    return false;
  } else { // Transaction itself was OK, but did it work?
    ljsaid = ljl_parseljresponse(ljl_conn.responseText);
    if ((ljsaid["success"] != "OK") || (ljsaid["errmsg"])) {
      // Trouble in getchallenge land...
      alert("Could not get login challenge from LiveJournal: "
            + ljsaid["errmsg"]);
      w.status = "Done";
      ljl_endconn();
      return false;
    }
  }
  ljl_endconn();
  var challenge = ljsaid["challenge"];
  var response = hex_md5(challenge + hex_md5(ljpass));

  // Login, Phase II: Send back the response.
  ljl_newconn(); // Create the connection.
  w.status = "Sending response to LiveJournal...";
  ljl_conn.send("mode=sessiongenerate&auth_method=challenge"
                + "&user=" + encodeURIComponent(ljuser)
                + "&auth_challenge=" + encodeURIComponent(challenge)
                + "&auth_response=" + encodeURIComponent(response));
  if (ljl_conn.status != 200) { // If something went wrong
    alert("Login connection failed: "
          + ljl_conn.status + " " + ljl_conn.statusText);
    w.status = "Done";
    ljl_endconn();
    return false;
  } else { // Transaction itself was OK, but did it work?
    ljsaid = ljl_parseljresponse(ljl_conn.responseText);
    if ((ljsaid["success"] != "OK") || (ljsaid["errmsg"])) {
      // Oops. Login failed. Tell us how.
      alert("Login failed: " + ljsaid["errmsg"]);
      w.status = "Done";
      ljl_endconn();
      return false;
    }
  }
  ljl_endconn();
  var mysession = ljsaid["ljsession"]; // Hooray!

  // Login, Phase III: We've gone through the challenge/response hoops,
  // and gotten our session. Now stash that puppy into a cookie so the
  // browser can use it. Our status-bar widget should pick up on it and
  // update automagically.
  w.status = "Saving login credentials...";
// This code was written on the assumption that the nsICookieManager2
// interface, which had this nifty add() method that did just what you'd
// expect, would be available. Alas, it's not, so we have to do some
// fucked-up hackery instead.
//  var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager2);
//  cookiejar.add(".livejournal.com", "/", "ljsession", ljsession,
//                false, true, 0);
  // This fucked-up hackery, BTW, is based on SaveCookie() from the
  // "Add N Edit Cookies" extension.
  // For some reason, this *has* to be a URI object, and not just the
  // string, like our IQ was normal.
  var ljuri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
  ljuri.spec = "http://www.livejournal.com/";
  // The cookies, on the other hand, can be strings, but need to be
  // formatted like they were being handed back from a server.
  var ljsession = "ljsession=" + mysession +
                  "; path=/; domain=.livejournal.com; HttpOnly";
  var ljmasters = "ljmastersession=" + mysession +
                  "; path=/; domain=.livejournal.com; HttpOnly";
  // This bit's tricky: Gotta pull the uid and session id out of the
  // session info, and use that to build the ljloggedin cookie:
  var sessfields = mysession.split(":");
  var ljloggedin = "ljloggedin=" + sessfields[1]+":"+sessfields[2] +
                   "; path=/; domain=.livejournal.com; HttpOnly";
  // Do the actual saves.
  try {
//    var cookiejar = Components.classes["@mozilla.org/cookieService;1"].getService().QueryInterface(Components.interfaces.nsICookieService);
    var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieService);
    cookiejar.setCookieString(ljuri, null, ljsession, null);
    cookiejar.setCookieString(ljuri, null, ljmasters, null);
    cookiejar.setCookieString(ljuri, null, ljloggedin, null);
  } catch(e) {
    alert("Error in cookie creation: " + e);
  }

  // Aaaaand, done.
  w.status = "Done";
  return true;
}

function ljl_loginbox() {
  window.openDialog("chrome://ljlogin/content/loginas.xul",
                    "ljl-loginas", "chrome,dialog");
  return true;
}

function ljl_loginas() {
  var ljuser = document.getElementById("ljuser").value;
  var ljpass = document.getElementById("ljpass").value;
  var saveit = document.getElementById("savepassword").checked;

  // First thing, saving the login into the Password Manager, if that
  // checkbox were clicked.
  if (saveit) {
    try {
      var passman = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManagerInternal);
      passman.addUserFull("http://www.livejournal.com", ljuser, ljpass,
                          "user", "password");
    } catch(e) {
      alert("Password saving failed: " + e);
    }
  }

  // Hand off main logging-in duties:
  return ljl_dologin(ljuser, ljpass, true);
}

function ljl_userlogin(username) {
  // Get the password for the given username from the Password Manager.
  var passman = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManagerInternal);
  var temphost = new Object();
  var tempuser = new Object();
  var temppass = new Object();
  var password = '';
  try {
    passman.findPasswordEntry("http://www.livejournal.com", username, null,
                              temphost, tempuser, temppass);
    password = temppass.value;
  } catch(exception) {
    alert ("Unable to get password for " + username + ": " + exception);
  }

  // And, now that we have that, make the hand-off to the logging-in function:
  return ljl_dologin(username, password, false);
}

function ljl_listlogins() {
try {
  var didstuff = false;
  var passman = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
  var passcheck = passman.enumerator;
  var themenu = document.getElementById("ljlogin-menu");

  // Grab logins to form menu.
  while (passcheck.hasMoreElements()) {
    try { // Get the password
      var signon = passcheck.getNext();
      if (!signon) { // Oops. No actual password info there.
        return false;
      }
    } catch (exception) {
      alert(exception);
    }
    // Translate the object into parts.
    signon = signon.QueryInterface(Components.interfaces.nsIPassword);
    if (signon.host == "http://www.livejournal.com") {
      // We have a winner! Add the username to the list.
      var ljuser = signon.user;
      var ljnode = document.createElement("menuitem");
      ljnode.setAttribute("image", "chrome://ljlogin/content/userinfo.gif");
      ljnode.setAttribute("label", ljuser);
//      ljnode.setAttribute("class", "ljuser");
      ljnode.setAttribute("class", "menuitem-iconic ljuser");
      ljnode.setAttribute("oncommand", "ljl_userlogin('" + ljuser + "');");
      themenu.appendChild(ljnode);
      didstuff = true;
    }
  }
  if (didstuff) { // If we inserted menu items, then we need a separator.
    var menusep = document.createElement("menuseparator");
    themenu.appendChild(menusep);
  }
  // And, finally, the two items that are always there, for the login box
  // and the logout option.
  var loginas = document.createElement("menuitem");
  loginas.setAttribute("label", "Log in as...");
  loginas.setAttribute("oncommand", "ljl_loginbox();");
  themenu.appendChild(loginas);
  var logout = document.createElement("menuitem");
  logout.setAttribute("label", "Log out of LiveJournal");
  logout.setAttribute("oncommand", "ljl_logmeout(false);");
  themenu.appendChild(logout);
  return true;
} catch(wtf) {
  alert("WTF?! " + wtf);
}
}

// Clean out the contents of the ljlogin-menu.
function ljl_cleanmenu() {
  var themenu = document.getElementById("ljlogin-menu");
  while (themenu.hasChildNodes()) {
    themenu.removeChild(themenu.firstChild);
  }
  return true;
}

//window.addEventListener("load", ljlinit, false);
