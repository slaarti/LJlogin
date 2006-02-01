// Rename an account in the uidmap
function ljl_prefs_uidmap_rename() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);

  // Get the uid to rename, and make sure it's actually there.
  var ljuid = document.getElementById("ljl-prefs-uidmap-select")
                      .getAttribute("value");
  if (!ljuid) {
    prompts.alert(window, "LJlogin", "No uid/username provided for edit!");
    return false;
  }

  // Load the existing username as a basis for edit:
  var username = new Object();
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService(Components.interfaces.nsIPasswordManagerInternal);
    var temphost = new Object();
    var temppass = new Object();
    passman.findPasswordEntry("ljlogin.uidmap", null, ljuid,
                              temphost, username, temppass);
  } catch(e) {
    prompts.alert(window, "LJlogin", "Error getting username: " + e);
    return false;
  }

  // Ask for the new username. Make sure it's valid while we're at it.
  var chkbx = { value: false }; // Unused but required
  var needuser = true;
  while (needuser) {
    var doit = prompts.prompt(window, "LJlogin: Change Username",
                              "What is the correct username for this userid?",
                              username, null, chkbx);
    if (!doit) return false; // User canceled.
    if (ljl_validuser(username.value)) needuser = false; // Validity check
  }

  // Save the new username:
  if (!ljl_mkuidmap(username.value, ljuid)) {
    prompts.alert(window, "LJlogin", "Username save failed!");
    return false;
  }

  // Reset the username in the status widget if we just changed the
  // username for the currently logged-in user:
  var ljsession = ljl_getljsession();
  if ((ljsession) && (ljsession.split(":")[1] == ljuid)) {
    ljl_loggedin(ljsession);
  }

  // Finally, reload the uidmap section of the Prefs window:
  ljl_prefs_uidmap_init();

  // And, done.
  return true;
}

// Initialize the uidmap box
function ljl_prefs_uidmap_init() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
  // Before we can build, we must first destroy:
  ljl_cleanmenu("ljl-prefs-uidmap-menu");

  // Load up the uidmap.
  var uidmap = new Array();
  var uidcount = 0; // Keep a count, since .length apparently
                    // doesn't work on hashes.
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
                         .getService(Components.interfaces.nsIPasswordManager);
    var uidload = passman.enumerator;
    while (uidload.hasMoreElements()) {
      var mapping = uidload.getNext(); // Get the mapping.
      if (!mapping) continue; // Oops. Nothing actually there.
      // Break it down.
      mapping = mapping.QueryInterface(Components.interfaces.nsIPassword);
      if (mapping.host == "ljlogin.uidmap") { // Make sure it is one of ours.
        uidmap[mapping.password] = mapping.user; // Add to the list.
        uidcount++; // Up the count.
      }
    }
  } catch(e) {
    prompts.alert(window, "LJlogin", "Error populating uidmap: " + e);
    return false;
  }

  if (uidcount <= 0) { // Nobody home, apparently.
    document.getElementById("ljl-prefs-uidmap-select")
            .setAttribute("disabled", "true");
    document.getElementById("ljl-prefs-uidmap-rename")
            .setAttribute("disabled", "true");
    document.getElementById("ljl-prefs-uidmap-remove")
            .setAttribute("disabled", "true");
    return true;
  } else {
    // Since I don't think there are Perl-like ways of handling hashes in
    // JavaScript, we'll instead have to load all the keys into their own
    // array, sort on that, and use the array of keys to get usernames out
    // of uidmap.
    var uidkeys = new Array();
    for (uid in uidmap) {
      var uuid = Number(uid.substring(1))
      uidkeys.push(uuid);
    }
    // Sort the keys:
    uidkeys = uidkeys.sort();
    // Now churn out the menu items.
    var menu = document.getElementById("ljl-prefs-uidmap-menu");
    var f = true;
    while (uidkeys.length > 0) {
      var uid = uidkeys.shift();
      var mapnode = document.createElement("menuitem");
      var uuid = "u" + uid;
      mapnode.setAttribute("value", uuid);
      mapnode.setAttribute("label", uuid + " - " + uidmap[uuid]);
      if (f) { // Select the first one by default.
        // Apparently selected doesn't work here. So, brute it.
        var box = document.getElementById("ljl-prefs-uidmap-select");
        box.setAttribute("value", uuid);
        box.setAttribute("label", uuid + " - " + uidmap[uuid]);
        f = false;
      }
      menu.appendChild(mapnode);
    };

    // And now, make the menu and its related buttons available for action:
    document.getElementById("ljl-prefs-uidmap-select")
            .setAttribute("disabled", "false");
    document.getElementById("ljl-prefs-uidmap-rename")
            .setAttribute("disabled", "false");
    document.getElementById("ljl-prefs-uidmap-remove")
            .setAttribute("disabled", "false");
  }
  return true;
}

// Initialize the Preferences window
function ljl_prefs_init() {
  ljl_prefs_uidmap_init();
}