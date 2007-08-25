var ljl_loaded = false;
var ljl_conn = undefined;

function ljlinit() {
  // We only care to have this stuff loaded up once.
  window.removeEventListener("load", ljlinit, true);
  if (ljl_loaded) return true;

  // Drop in a little something temporarily to indicate that yes, the
  // extension is loaded, even if it hasn't gotten to doing anything yet.
  document.getElementById("ljlogin").setAttribute("value", "LJlogin");
  document.getElementById("ljlogin-status").setAttribute("class","loaded");
//  return true;

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
  var observerService = Components.classes["@mozilla.org/observer-service;1"]
                        .getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(cookiemonster,"cookie-changed",false);

  // First, assume we're logged out:
  ljl_loggedout();

  // And then we need to set the login status as it currently is, in case
  // we're already logged in via a persistent cookie or something.
  var ljsession = ljl_getljsession();
  if (ljsession) {
    // Make extra certain *all* of the cookies are there:
    ljl_trashsession();
    ljl_savesession(ljsession);
  } else {
    // We're not logged in. Check to see if we should log in
    // as a default user:
    var defenabled;
    try {
      var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService);
      prefs = prefs.getBranch("extensions.ljlogin.");
      defenabled = prefs.getBoolPref("defaultlogin.enable");
    } catch(e) {
      var prompts = Components
                     .classes["@mozilla.org/embedcomp/prompt-service;1"]
                     .getService(Components.interfaces.nsIPromptService);
      prompts.alert(window, "LJlogin",
                            "Problem getting default login enable pref: " + e);
      return false;
    }
    if (defenabled) { // Yes, log in as a default user.
      var ljuser = ljl_getdefaultlogin();
      if (ljuser) { // Make sure there's actually a user to log in as.
        // Is this a user for whom we have an account stored?
        if (ljl_userlist().indexOf(ljuser) > -1) {
          // Yes. Hand off to automated login:
          ljl_userlogin(ljuser);
        } else {
          // No, hand off to user-prompted login:
          ljl_loginas(ljuser);
        }
      } else { // Blank username. Don't bother.
        ljl_loggedout();
      }
    } else { // No, no default login, start as logged out.
      ljl_loggedout();
    }
  }

  // Finally, flag that the extension is loaded.
  ljl_loaded = true;
  return true;
}

function ljl_loggedin(ljcookie) {
  var ljuser = ljl_getljuser(ljcookie);
  if (!ljuser) {
    // Oops. Nothing there, apparently.
    ljl_loggedout();
    return;
  } else if (ljuser == "?UNKNOWN!") {
    document.getElementById("ljlogin").setAttribute("value", "(Unknown user)");
    document.getElementById("ljlogin-status").setAttribute("class", "unknown");
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

  // The array containing the split-up response alternates between key and
  // value, with the last element being a blank remainder of the split
  // process. Thus, the jumping loop, and the ignoring of the last part.
  for (var i = 0; i < ljlines.length - 1; i += 2) {
    ljsaid[ljlines[i]] = decodeURIComponent(ljlines[i+1]);
  }

  return ljsaid;
}

function ljl_logmeout() {
  // Get the session cookie. If this isn't there, then there's no point in
  // trying to do anything, 'cause we're not even logged in.
  var ljsession = ljl_getljsession();
  if (!ljsession) return true;

  // Okay, we're logged in, but are we logged in as someone whose username
  // we can get from the userid?
  var ljuser = ljl_getljuser(ljsession);
  if ((ljuser) && (ljuser != "?UNKNOWN!")) {
    // Yup. We're good to go.

    // Get the browser window.
    var w = window;

    // Tell LJ that we want to expire this session.
    ljl_newconn(); // Create the connection.
    // Give the connection our existing login credentials, which we're expiring.
    ljl_conn.setRequestHeader("X-LJ-Auth", "cookie");
    ljl_conn.setRequestHeader("Cookie", "ljsession=" + ljsession);
    ljl_conn.setRequestHeader("Cookie", "ljmastersession=" + ljsession);
    var sessfields = ljsession.split(":");
    ljl_conn.setRequestHeader("Cookie", "ljloggedin=" +
                                         sessfields[1]+":"+sessfields[2]);
    // Aaaaaand, go!
    w.status = "Logging out of LiveJournal...";
    ljl_conn.send("mode=sessionexpire&user="
                 + encodeURIComponent(ljuser) +
                 "&auth_method=cookie");
    if (ljl_conn.status == 200) { // Assuming a successful request...
      // Check whether the request accomplished the job.
      var ljsaid = ljl_parseljresponse(ljl_conn.responseText);
      if ((ljsaid["success"] != "OK") || (ljsaid["errmsg"])) {
        // Something went wrong here.
        window.openDialog("chrome://ljlogin/content/logouterr.xul",
                          "ljl-logouterr", "chrome,dialog",
                          ljsaid["errmsg"]);
        return false;
      }
    } else { // Something else happened.
      window.openDialog("chrome://ljlogin/content/logouterr.xul",
                        "ljl-logouterr", "chrome,dialog",
                        ljl_conn.status + " " + ljl_conn.statusText);
      return false;
    }
    w.status = "Done";
    ljl_endconn();
  } else if (ljuser == "?UNKNOWN!") {
    // No username/uid mapping available. Make just trashing the session
    // an option:
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
    if (!prompts.confirm(window, "LJlogin: Unknown username",
                         "Unknown username. Unable to request session " +
                         "close from LiveJournal. Log out anyway?")) {
      return false; // No, never mind.
    }
  }
  // Okay, we're done. Trash the session. Updating the display in the
  // status bar should happen automagically via the Observer service.
  ljl_trashsession();
  return true;
}

function ljl_dologin(ljuser, ljpass) {
  var ljsaid;
  var w = window;

  // First thing's first: Is this user okay to log in as?
  if (!ljl_validuser(ljuser)) {
    return false;
  }

  // Before we try to log in as someone, we should log out first.
  // Assuming we are logged in, but the logout function handles checking
  // for that, so we don't have to.
  ljl_logmeout();

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
  var response = ljl_hex_md5(challenge + ljl_hex_md5(ljpass));

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

  // Before we can stash the cookies, we need to stash a mapping of
  // username to userid in the PM, so that other functions that need
  // to know the username can find out, now that LJ's taken the usernames
  // out of ljsession:
  ljl_mkuidmap(ljuser, mysession.split(":")[1]);
  // Now save:
  ljl_savesession(mysession);

  // Aaaaand, done.
  w.status = "Done";
  return true;
}

function ljl_loginas() {
  // Were we handed a username to log in as?
  var username = ((arguments.length > 0) ? arguments[0] : "");
  // Ask the user for the account information to log in with, and optionally
  // if they want to save is in the Password Manager.
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
  var ljuser = { value: username };
  var ljpass = { value: "" };
  var saveit = { value: false };
  var needuser = true;

  while (needuser) { // Want not only credentials, but valid ones.
    var doit = prompts.promptUsernameAndPassword(window, "Log In As...", "",
                       ljuser, ljpass,
                       "Use Password Manager to remember this password.",
                       saveit);
    if (!doit) return false; // User canceled.
    if (ljl_validuser(ljuser.value)) needuser = false; // Validity check
  }

  // First thing, saving the login into the Password Manager, if that
  // checkbox were clicked.
  if (saveit.value) {
    try {
      var passman = Components.classes["@mozilla.org/passwordmanager;1"]
          .getService(Components.interfaces.nsIPasswordManagerInternal);
      passman.addUserFull("http://www.livejournal.com",
                          ljuser.value, ljpass.value,
                          "user",       "password");
    } catch(e) {
      alert("Password saving failed: " + e);
    }
  }

  // Hand off main logging-in duties:
  return ljl_dologin(ljuser.value, ljpass.value);
}

function ljl_userlogin(username) {
  var password = '';
  // Get the password for the given username from the Password Manager.
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService(Components.interfaces.nsIPasswordManagerInternal);
    var temphost = new Object();
    var tempuser = new Object();
    var temppass = new Object();
    passman.findPasswordEntry("http://www.livejournal.com", username, null,
                              temphost, tempuser, temppass);
    password = temppass.value;
  } catch(e) {
    alert ("Unable to get password for " + username + ": " + e);
  }

  // And, now that we have that, make the hand-off to the logging-in function:
  return ljl_dologin(username, password);
}

// Allow a user to name an account for which no username/uid map exists.
function ljl_uidfix() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
  // Get the ljsession:
  var ljsession = ljl_getljsession();
  if (!ljsession) {
    // Guess we weren't really logged in.
    prompts.alert(window, "LJlogin", "Not logged in!");
    return false;
  }
  // Is this actually a uid for which we have no username?
  if (ljl_getljuser(ljsession) != "?UNKNOWN!") {
    prompts.alert(window, "LJlogin", "Username already on file " +
                                     "or not logged in!");
    return false;
  }

  // Get the username:
  var ljuser = { value: "" };
  var chkbx = { value: false }; // Apparently required even if you aren't
                                // going to have a checkbox.
  var needuser = true;
  while (needuser) {
    var doit = prompts.prompt(window, "LJlogin: Set Username...",
                       "What is the username for the currently " +
                       "logged-in account?", ljuser, null, chkbx);
    if (!doit) return false; // User canceled.
    if (ljl_validuser(ljuser.value)) needuser = false; // Validity check
  }

  // Extract the uid from the ljsession for mapping:
//  var sessfields = ljsession.split(":");
  var ljuid = ljsession.split(":")[1];

  // Stash the username/uid pair into the PM:
  if (!ljl_mkuidmap(ljuser.value, ljuid)) return false;

  // Update the display of the status widget:
  ljl_loggedin(ljsession);

  return true;
}

function ljl_prefs() {
  window.openDialog("chrome://ljlogin/content/prefs.xul",
                    "ljl-prefs", "chrome,dialog");
}

function ljl_createmenu() {
  var themenu = document.getElementById("ljlogin-menu");

  // First, offer the option of naming the account we're logged in with,
  // if we're logged into one whose username we don't know.
  // Get the ljsession:
  var ljsession = ljl_getljsession();
  if (ljsession) {
    // Is this actually a uid for which we have no username?
    if (ljl_getljuser(ljsession) == "?UNKNOWN!") {
      var nameacct = document.createElement("menuitem");
      nameacct.setAttribute("label", "Assign username to this login");
      nameacct.setAttribute("oncommand", "ljl_uidfix();");
      themenu.appendChild(nameacct);
      var namesep = document.createElement("menuseparator");
      themenu.appendChild(namesep);
    }
  }

  // Get the user list:
  var userlist = ljl_userlist();

  // Did we get anything for display?
  if (userlist.length > 0) {
    // Yes. Generate menu items for them.
    while (userlist.length > 0) {
      var ljuser = userlist.shift();
      var ljnode = document.createElement("menuitem");
      ljnode.setAttribute("image", "chrome://ljlogin/content/userinfo.gif");
      ljnode.setAttribute("label", ljuser);
      ljnode.setAttribute("class", "menuitem-iconic ljuser");
      ljnode.setAttribute("oncommand", "ljl_userlogin('" + ljuser + "');");
      themenu.appendChild(ljnode);
    }
    // To top it off, a separator to keep the userlist away from
    // the fixed menu items.
    var menusep = document.createElement("menuseparator");
    themenu.appendChild(menusep);
  }

  // And, finally, the three items that are always there: The login box,
  // the logout option, and access to the Preferences box.
  var loginas = document.createElement("menuitem");
  loginas.setAttribute("label", "Log in as...");
  loginas.setAttribute("oncommand", "ljl_loginas();");
  themenu.appendChild(loginas);
  var logout = document.createElement("menuitem");
  logout.setAttribute("label", "Log out of LiveJournal");
  logout.setAttribute("oncommand", "ljl_logmeout();");
  themenu.appendChild(logout);
  var prefs = document.createElement("menuitem");
  prefs.setAttribute("label", "Preferences");
  prefs.setAttribute("oncommand", "ljl_prefs();");
  themenu.appendChild(prefs);

  // Done and done.
  return true;
}

// Clean out the contents of the ljlogin-menu.
function ljl_cleanmenu(menuname) {
  var themenu = document.getElementById(menuname);
  while (themenu.hasChildNodes()) {
    themenu.removeChild(themenu.firstChild);
  }
  return true;
}
