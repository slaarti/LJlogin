var LJlogin_loaded = false;
var ljl_conn = undefined;

function LJlogin_init() {
  // We only care to have this stuff loaded up once.
  window.removeEventListener("load", LJlogin_init, true);
  if (LJlogin_loaded) return true;

  // Drop in a little something temporarily to indicate that yes, the
  // extension is loaded, even if it hasn't gotten to doing anything yet.
  var sb = document.getElementById("ljlogin-status");
  sb.label = "LJlogin";
  sb.setAttribute("class", "statusbarpanel-iconic-text loaded");
//  return true;

  // Hook into the Observer service so we can see when the ljsession
  // cookie changes and update the statusbar widget appropriately.
  var cookiemonster = {
    observe: function(subject, topic, data) {
      // Get the cookie
      var yumcookie = subject.QueryInterface(Components.interfaces.nsICookie);

      // Loop over active sites
      var enabledsites = LJlogin_enabled_sites();
      for (var i = 0; i < enabledsites.length; i++) {
        var siteid = enabledsites[i];

        // Do we even care about this cookie?
        var ljcookie = new RegExp(LJlogin_sites[siteid].cookiere);
        if ((!ljcookie.test(yumcookie.host)) ||
            (yumcookie.name != "ljsession")) {
          continue;
        }

        // Okay. We got this far, so this should be a cookie we want. Now
        // to handle it accordingly.
        switch(data) {
          // Yay, logging in!
          case "added":
          case "changed":
            LJlogin_loggedin(siteid, yumcookie.value);
            break;
          // Aw. Logged out.
          case "deleted":
          case "cleared":
            LJlogin_loggedout(siteid);
            break;
          default:
            break;
        }
      }
    }
  };
  var observerService = Components.classes["@mozilla.org/observer-service;1"]
                        .getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(cookiemonster,"cookie-changed",false);

  // Set up a preferences observer to keep the statusbar widgets
  // in tune with the list of enabled sites.
  var prerogative = {
    observe: function(subject, topic, data) {
               // Only care if we're talking a changed preference.
               if (topic != "nsPref:changed") return;
               // There's only one preference we truly care about.
               if (data != "ljcode.enabledsites") return;
               // And here we are. Go for it...
               LJlogin_statusbar_refresh();
               return; // And done.
             }
  };
  var prefsObserver = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService)
                        .getBranch("extensions.ljlogin.");
  prefsObserver.QueryInterface(Components.interfaces.nsIPrefBranch2);
  prefsObserver.addObserver("", prerogative, false);

  // And set the statusbar by hand once, to get things started.
  LJlogin_statusbar_refresh();

  // Finally, flag that the extension is loaded.
  LJlogin_loaded = true;
  return true;
}

function LJlogin_statusbar_refresh() {
  // Loop over enabled sites to set up statusbar widgets for
  // enabled LJcode sites.

  // First, reduce things to a known-base state: No enabled
  // per-site widgets, base LJlogin widget enabled.
  var ljsb = document.getElementById("ljlogin-status");
  var sb = document.getElementById("status-bar");
  var popupset = document.getElementById("mainPopupSet");
  ljsb.collapsed = false;

  for (var siteid in LJlogin_sites) {
    // Check for the existence of a widget, and if it's there, remove.
    var rmwidget = document.getElementById("ljlogin-" + siteid + "-status");
    if (rmwidget != null) {
      sb.removeChild(rmwidget);
    }

    // And do the same for its associated popup menu.
    var rmmenu = document.getElementById("ljlogin-" + siteid + "-menu");
    if (rmmenu != null) {
      popupset.removeChild(rmmenu);
    }
  }


  // Now create/enable widgets for enabled sites, if any.
  var enabledsites = LJlogin_enabled_sites();
  if (enabledsites.length > 0) { // If any enabled sites, hide generic widget.
    ljsb.collapsed = true;
  }

  for (var i = 0; i < enabledsites.length; i++) {
    var siteid = enabledsites[i];

    // Create the widget and associated popup menu.
    var thepanel = document.createElement("statusbarpanel");
    thepanel.setAttribute("id", "ljlogin-" + siteid + "-status");
    thepanel.setAttribute("class", "statusbarpanel-iconic-text loading");
    thepanel.setAttribute("collapsed", "false");
    thepanel.setAttribute("label", LJlogin_sites[siteid].name);
    thepanel.setAttribute("context", "ljlogin-" + siteid + "-menu");
    thepanel.setAttribute("popup", "ljlogin-" + siteid + "-menu");
    sb.insertBefore(thepanel, ljsb);

    var themenu = document.createElement("popup");
    themenu.setAttribute("id", "ljlogin-" + siteid + "-menu");
    themenu.setAttribute("position", "after_start");
    themenu.setAttribute("onpopupshowing",
                         "LJlogin_createmenu('" + siteid + "');");
    themenu.setAttribute("onpopuphidden",
                         "LJlogin_cleanmenu('ljlogin-" + siteid + "-menu');");
    popupset.appendChild(themenu);

    // Now that we have the widget, we can set its state appropriately.
    // First, assume we're logged out:
    LJlogin_loggedout(siteid);

    // And then we need to set the login status as it currently is, in case
    // we're already logged in via a persistent cookie or something.
    var ljsession = LJlogin_getljsession(siteid);
    if (ljsession) {
      // Make extra certain *all* of the cookies are there:
      LJlogin_trashsession(siteid);
      LJlogin_savesession(siteid, ljsession);
    } else {
      // We're not logged in. Check to see if we should log in
      // as a default user:
      if (LJlogin_sites_defaultlogin_enabled(siteid)) {
        // Yes, log in as a default user.
        var ljuser = LJlogin_sites_defaultlogin_ljuser(siteid);
        if (ljuser) { // Make sure there's actually a user to log in as.
          // Is this a user for whom we have an account stored?
          if (LJlogin_userlist(siteid).indexOf(ljuser) != -1) {
            // Yes. Hand off to automated login:
            LJlogin_userlogin(siteid, ljuser);
          } else {
            // No, hand off to user-prompted login:
            LJlogin_loginas(siteid, ljuser);
          }
        } else { // Blank username. Don't bother.
          LJlogin_loggedout(siteid);
        }
      } else { // No, no default login, start as logged out.
        LJlogin_loggedout(siteid);
      }
    }
  }
  return;
}

function LJlogin_loggedin(siteid, ljcookie) {
  var ljuser = LJlogin_getljuser(siteid, ljcookie);
  var sb = document.getElementById("ljlogin-" + siteid + "-status");
  if (!ljuser) {
    // Oops. Nothing there, apparently.
    LJlogin_loggedout(siteid);
  } else if (ljuser == "?UNKNOWN!") {
    sb.label = "(Unknown user)";
    sb.src = "chrome://ljlogin/content/whoareyou.gif";
    sb.setAttribute("class", "statusbarpanel-iconic-text unknown");
  } else {
    sb.label = ljuser;
    sb.src = "chrome://ljlogin/content/userinfo.gif";
    sb.setAttribute("class", "statusbarpanel-iconic-text ljuser");
  }
  return;
}

function LJlogin_loggedout(siteid) {
  var sb = document.getElementById("ljlogin-" + siteid + "-status");
  sb.label = "Not logged in.";
  sb.src = "chrome://ljlogin/content/anonymous.gif";
  sb.setAttribute("class", "statusbarpanel-iconic-text loggedout");
}

// Prep a network connection. We should only be trying to do one network-y
// thing at a time (especially since we're using synchronous connection),
// so this will cancel any existing connection before allocating the new one.
function LJlogin_newconn(siteid) {
  LJlogin_cancelconn(); // Kill any possibly existing connection.
  ljl_conn = new XMLHttpRequest(); // Allocate the new connection.
  // Since we're always going to do these, may as well do them here
  // once and for all. Point the connection at LJ's flat interface,
  // and prep for form posting.
  ljl_conn.open("POST", LJlogin_sites[siteid].interfaceurl, false);
  ljl_conn.setRequestHeader("Content-Type",
                            "application/x-www-form-urlencoded");
//  ljl_conn.timeout = window.setTimeout("ljl_cancelconn()", 30000);
}

// Finalize the connection.
function LJlogin_endconn() {
  ljl_conn = undefined;
//  window.clearTimeout(ljl_conn.timeout);
}

// Allow the user (or the extension, should the connection take too long)
// to cancel the current connection attempt.
function LJlogin_cancelconn() {
  if (ljl_conn !== undefined) {
    ljl_conn.abort();
    LJlogin_endconn();
  }
}

// Turns the response handed back by LJ's flat interface into a hash object.
function LJlogin_parseljresponse(ljtext) {
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

function LJlogin_logmeout(siteid) {
  // Get the session cookie. If this isn't there, then there's no point in
  // trying to do anything, 'cause we're not even logged in.
  var ljsession = LJlogin_getljsession(siteid);
  if (!ljsession) return true;

  // Okay, we're logged in, but are we logged in as someone whose username
  // we can get from the userid?
  var ljuser = LJlogin_getljuser(siteid, ljsession);
  if ((ljuser) && (ljuser != "?UNKNOWN!")) {
    // Yup. We're good to go.

    // Get the browser window.
    var w = window;

    // Tell LJ that we want to expire this session.
    LJlogin_newconn(siteid); // Create the connection.
    // Give the connection our existing login credentials, which we're expiring.
    ljl_conn.setRequestHeader("X-LJ-Auth", "cookie");
    ljl_conn.setRequestHeader("Cookie", "ljsession=" + ljsession);
    ljl_conn.setRequestHeader("Cookie", "ljmastersession=" + ljsession);
    var sessfields = ljsession.split(":");
    ljl_conn.setRequestHeader("Cookie", "ljloggedin=" +
                                         sessfields[1]+":"+sessfields[2]);
    // Aaaaaand, go!
    w.status = "Logging out of " + LJlogin_sites[siteid].name + "...";
    ljl_conn.send("mode=sessionexpire&user="
                 + encodeURIComponent(ljuser) +
                 "&auth_method=cookie");
    if (ljl_conn.status == 200) { // Assuming a successful request...
      // Check whether the request accomplished the job.
      var ljsaid = LJlogin_parseljresponse(ljl_conn.responseText);
      if ((ljsaid["success"] != "OK") || (ljsaid["errmsg"])) {
        // Something went wrong here.
        window.openDialog("chrome://ljlogin/content/logouterr.xul",
                          "ljlogin-logouterr", "chrome,dialog",
                          siteid, ljsaid["errmsg"]);
        return false;
      }
    } else { // Something else happened.
      window.openDialog("chrome://ljlogin/content/logouterr.xul",
                        "ljlogin-logouterr", "chrome,dialog", siteid,
                        ljl_conn.status + " " + ljl_conn.statusText);
      return false;
    }
    w.status = "Done";
    LJlogin_endconn();
  } else if (ljuser == "?UNKNOWN!") {
    // No username/uid mapping available. Make just trashing the session
    // an option:
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
    if (!prompts.confirm(window, "LJlogin: Unknown username",
                         "Unknown username. Unable to request session " +
                         "close from " + LJlogin_sites[siteid].name +
                         ". Log out anyway?")) {
      return false; // No, never mind.
    }
  }
  // Okay, we're done. Trash the session. Updating the display in the
  // status bar should happen automagically via the Observer service.
  LJlogin_trashsession(siteid);
  return true;
}

function LJlogin_dologin(siteid, ljuser, ljpass) {
  var ljsaid;
  var w = window;

  // First thing's first: Is this user okay to log in as?
  if (!LJlogin_validuser(ljuser)) {
    return false;
  }

  // Before we try to log in as someone, we should log out first.
  // Assuming we are logged in, but the logout function handles checking
  // for that, so we don't have to.
  LJlogin_logmeout(siteid);

  // Login, Phase I: Get the challenge
  LJlogin_newconn(siteid); // Create the connection.
  w.status = "Getting challenge from " +
             LJlogin_sites[siteid].name + "...";
  ljl_conn.send("mode=getchallenge");
  if (ljl_conn.status != 200) { // If something went wrong
    alert("Could not get login challenge from " +
          LJlogin_sites[siteid].name + ": " +
          ljl_conn.status + " " + ljl_conn.statusText);
    w.status = "Done";
    LJlogin_endconn();
    return false;
  } else { // Transaction itself was OK, but did it work?
    ljsaid = LJlogin_parseljresponse(ljl_conn.responseText);
    if ((ljsaid["success"] != "OK") || (ljsaid["errmsg"])) {
      // Trouble in getchallenge land...
      alert("Could not get login challenge from " +
            LJlogin_sites[siteid].name + ": " + ljsaid["errmsg"]);
      w.status = "Done";
      LJlogin_endconn();
      return false;
    }
  }
  LJlogin_endconn();
  var challenge = ljsaid["challenge"];
  var response = LJlogin_hex_md5(challenge + LJlogin_hex_md5(ljpass));

  // Login, Phase II: Send back the response.
  LJlogin_newconn(siteid); // Create the connection.
  w.status = "Sending response to " + LJlogin_sites[siteid].name + "...";
  ljl_conn.send("mode=sessiongenerate&auth_method=challenge"
                + "&user=" + encodeURIComponent(ljuser)
                + "&auth_challenge=" + encodeURIComponent(challenge)
                + "&auth_response=" + encodeURIComponent(response));
  if (ljl_conn.status != 200) { // If something went wrong
    alert("Login connection failed: "
          + ljl_conn.status + " " + ljl_conn.statusText);
    w.status = "Done";
    LJlogin_endconn();
    return false;
  } else { // Transaction itself was OK, but did it work?
    ljsaid = LJlogin_parseljresponse(ljl_conn.responseText);
    if ((ljsaid["success"] != "OK") || (ljsaid["errmsg"])) {
      // Oops. Login failed. Tell us how.
      alert("Login failed: " + ljsaid["errmsg"]);
      w.status = "Done";
      LJlogin_endconn();
      return false;
    }
  }
  LJlogin_endconn();
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
  LJlogin_mkuidmap(siteid, ljuser, mysession.split(":")[1]);
  // Now save:
  LJlogin_savesession(siteid, mysession);

  // Aaaaand, done.
  w.status = "Done";
  return true;
}

function LJlogin_loginas(siteid) {
  // Were we handed a username to log in as?
  var username = ((arguments.length > 1) ? arguments[1] : "");
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
    if (LJlogin_validuser(ljuser.value)) needuser = false; // Validity check
  }

  // First thing, saving the login into the Password Manager, if that
  // checkbox were clicked.
  if (saveit.value) {
    LJlogin_savepassword(siteid, ljuser.value, ljpass.value);
  }

  // Hand off main logging-in duties:
  return LJlogin_dologin(siteid, ljuser.value, ljpass.value);
}

function LJlogin_userlogin(siteid, username) {
  var password = '';
  // Get the password for the given username from the Password Manager.
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService(Components.interfaces.nsIPasswordManagerInternal);
    var temphost = new Object();
    var tempuser = new Object();
    var temppass = new Object();
    passman.findPasswordEntry(LJlogin_sites[siteid].passmanurl, username, null,
                              temphost, tempuser, temppass);
    password = temppass.value;
  } catch(e) {
    alert ("Unable to get password for " + username + ": " + e);
  }

  // And, now that we have that, make the hand-off to the logging-in function:
  return LJlogin_dologin(siteid, username, password);
}

// Allow a user to name an account for which no username/uid map exists.
function LJlogin_uidfix(siteid) {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
  // Get the ljsession:
  var ljsession = LJlogin_getljsession(siteid);
  if (!ljsession) {
    // Guess we weren't really logged in.
    prompts.alert(window, "LJlogin", "Not logged in!");
    return false;
  }
  // Is this actually a uid for which we have no username?
  if (LJlogin_getljuser(siteid, ljsession) != "?UNKNOWN!") {
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
    if (LJlogin_validuser(ljuser.value)) needuser = false; // Validity check
  }

  // Extract the uid from the ljsession for mapping:
//  var sessfields = ljsession.split(":");
  var ljuid = ljsession.split(":")[1];

  // Stash the username/uid pair into the PM:
  if (!LJlogin_mkuidmap(siteid, ljuser.value, ljuid)) return false;

  // Update the display of the status widget:
  LJlogin_loggedin(siteid, ljsession);

  return true;
}

function LJlogin_prefs(siteid) {
  window.openDialog("chrome://ljlogin/content/prefs.xul",
                    "ljl-prefs", "chrome,dialog", siteid);
}

function LJlogin_createmenu(siteid) {
  // Get the parent popup to populate.
  var themenu = document.getElementById("ljlogin-" + siteid + "-menu");

  // First, since we're providing login capabilities for a range of
  // LJcode systems, we should probably label which one this menu
  // exists for. Since there isn't an attribute for putting a label
  // on a popup menu itself, we'll have to get a little tricky by
  // using the elements we can attach to the popup.
  var headtext = document.createElement("menuitem");
  headtext.setAttribute("label", LJlogin_sites[siteid].name);
  headtext.setAttribute("disabled", "true");
  themenu.appendChild(headtext);
  var headsep = document.createElement("menuseparator");
  themenu.appendChild(headsep);

  // Next, offer the option of naming the account we're logged in with,
  // if we're logged into one whose username we don't know.
  // Get the ljsession:
  var ljsession = LJlogin_getljsession(siteid);
  if (ljsession) {
    // Is this actually a uid for which we have no username?
    if (LJlogin_getljuser(siteid, ljsession) == "?UNKNOWN!") {
      var nameacct = document.createElement("menuitem");
      nameacct.setAttribute("label", "Assign username to this login");
      nameacct.setAttribute("oncommand", "LJlogin_uidfix('" + siteid + "');");
      themenu.appendChild(nameacct);
      var namesep = document.createElement("menuseparator");
      themenu.appendChild(namesep);
    }
  }

  // Get the user list:
  var userlist = LJlogin_userlist(siteid);

  // Did we get anything for display?
  if (userlist.length > 0) {
    // Yes. Generate menu items for them.
    while (userlist.length > 0) {
      var ljuser = userlist.shift();
      var ljnode = document.createElement("menuitem");
      ljnode.setAttribute("image", "chrome://ljlogin/content/userinfo.gif");
      ljnode.setAttribute("label", ljuser);
      ljnode.setAttribute("class", "menuitem-iconic ljuser");
      ljnode.setAttribute("oncommand",
                          "LJlogin_userlogin('" + siteid + "', '"
                                                + ljuser + "');");
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
  loginas.setAttribute("oncommand", "LJlogin_loginas('" + siteid + "');");
  themenu.appendChild(loginas);
  var logout = document.createElement("menuitem");
  logout.setAttribute("label", "Log out of " + LJlogin_sites[siteid].name);
  logout.setAttribute("oncommand", "LJlogin_logmeout('" + siteid + "');");
  themenu.appendChild(logout);
  var prefs = document.createElement("menuitem");
  prefs.setAttribute("label", "Preferences");
  prefs.setAttribute("oncommand", "LJlogin_prefs('" + siteid + "');");
  themenu.appendChild(prefs);

  // Done and done.
  return true;
}

// Clean out the contents of an LJlogin menu.
function LJlogin_cleanmenu(menuname) {
  var themenu = document.getElementById(menuname);
  while (themenu.hasChildNodes()) {
    themenu.removeChild(themenu.firstChild);
  }
  return true;
}
