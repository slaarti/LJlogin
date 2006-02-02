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
  var olduname = new Object();
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService(Components.interfaces.nsIPasswordManagerInternal);
    var temphost = new Object();
    var temppass = new Object();
    passman.findPasswordEntry("ljlogin.uidmap", null, ljuid,
                              temphost, olduname, temppass);
  } catch(e) {
    prompts.alert(window, "LJlogin", "Error getting username: " + e);
    return false;
  }

  // Ask for the new username. Make sure it's valid while we're at it.
  var newuname = { value: olduname.value }; // Copy the object for editing
  var chkbx = { value: false }; // Unused but required
  var needuser = true;
  while (needuser) {
    var doit = prompts.prompt(window, "LJlogin: Change Username",
                              "What is the correct username for this userid?",
                              newuname, null, chkbx);
    if (!doit) return false; // User canceled.
    if (ljl_validuser(newuname.value)) needuser = false; // Validity check
  }

  // Because we're saving a new username, and the PM doesn't let you pick
  // which field you key on, we have to remove the old uidmap entry before
  // you can add the new one:
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService().QueryInterface(Components.interfaces.nsIPasswordManager);
    passman.removeUser("ljlogin.uidmap", olduname.value);
  } catch(e) {
    prompts.alert(window, "LJlogin", "Error removing old username: " + e);
    return false;
  }
  // Save the new username:
  if (!ljl_mkuidmap(newuname.value, ljuid)) {
    prompts.alert(window, "LJlogin", "Username save failed!");
    return false;
  }

  // Reset the username in the status widget if we just changed the
  // username for the currently logged-in user:
  var ljsession = ljl_getljsession();
  if ((ljsession) && (ljsession.split(":")[1] == ljuid)) {
    // Can't use ljl_loggedin(), since we're not in the right window, so
    // trash and remake the session cookies instead:
    ljl_trashsession();
    ljl_savesession(ljsession);
  }

  // Finally, reload the uidmap section of the Prefs window:
  ljl_prefs_uidmap_init();

  // And, done.
  return true;
}

// Remove an entry from the uidmap
function ljl_prefs_uidmap_remove() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);

  // Get the uid to remove, and make sure it's actually there.
  var ljuid = document.getElementById("ljl-prefs-uidmap-select")
                      .getAttribute("value");
  if (!ljuid) {
    prompts.alert(window, "LJlogin", "No uid/username provided for edit!");
    return false;
  }

  // Give the user a chance to cancel:
  if (!prompts.confirm(window, "LJlogin: Remove name/uid from uidmap",
                       "Are you sure you want to remove this entry " +
                       "from the uidmap?")) {
    return false; // Never mind!
  }

  // Can't just remove by uid, because the username is the key field,
  // so we have to do an extract from the PM first:
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

  // Do the removal:
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService().QueryInterface(Components.interfaces.nsIPasswordManager);
    passman.removeUser("ljlogin.uidmap", username.value);
  } catch(e) {
    prompts.alert(window, "LJlogin", "Error removing entry from uidmap: " + e);
    return false;
  }

  // Reset the username in the status widget if we just removed the
  // username for the currently logged-in user:
  var ljsession = ljl_getljsession();
  if ((ljsession) && (ljsession.split(":")[1] == ljuid)) {
    // Can't use ljl_loggedin(), since we're not in the right window, so
    // trash and remake the session cookies instead:
    ljl_trashsession();
    ljl_savesession(ljsession);
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
  var bbox = document.getElementById("ljl-prefs-uidmap-select");
  bbox.setAttribute("value", "");
  bbox.setAttribute("label", "");

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

function ljl_prefs_account_init() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
  // Before we can build, we must first destroy:
  ljl_cleanmenu("ljl-prefs-account-menu");
  ljl_cleanmenu("ljl-prefs-default-menu");
  var bbox = document.getElementById("ljl-prefs-account-select");
  bbox.setAttribute("value", "");
  bbox.setAttribute("label", "");
  var bbox = document.getElementById("ljl-prefs-default-select");
  bbox.setAttribute("value", "");
  bbox.setAttribute("label", "");

  // FIXME: Need function here to get default login and handle
  //        if the username selected for that is invalid.
  var defaultuser;

  // Get the user list to populate the menu.
  var userlist = ljl_userlist();

  if ((!userlist) || (userlist.length <= 0)) { // Nobody home, apparently.
    document.getElementById("ljl-prefs-account-select")
            .setAttribute("disabled", "true");
    document.getElementById("ljl-prefs-account-passwd")
            .setAttribute("disabled", "true");
    document.getElementById("ljl-prefs-account-remove")
            .setAttribute("disabled", "true");
    document.getElementById("ljl-prefs-default-enable")
            .setAttribute("disabled", "true");
    document.getElementById("ljl-prefs-default-select")
            .setAttribute("disabled", "true");
    document.getElementById("ljl-prefs-default-setacct")
            .setAttribute("disabled", "true");
    return true;
  } else {
    var amenu = document.getElementById("ljl-prefs-account-menu");
    var dmenu = document.getElementById("ljl-prefs-default-menu");
    var f = true;
    while (userlist.length > 0) {
      var ljuser = userlist.shift();
      // This is kind of messy, that we have to do everything twice
      // for each step of setting up a menu item. Check later if
      // we can just make one item and add it to both menus happily.
      var aitem = document.createElement("menuitem");
      var ditem = document.createElement("menuitem");
      aitem.setAttribute("value", ljuser);
      ditem.setAttribute("value", ljuser);
      aitem.setAttribute("label", ljuser);
      ditem.setAttribute("label", ljuser);
      aitem.setAttribute("image", "chrome://ljlogin/content/userinfo.gif");
      ditem.setAttribute("image", "chrome://ljlogin/content/userinfo.gif");
      aitem.setAttribute("class", "menuitem-iconic ljuser");
      ditem.setAttribute("class", "menuitem-iconic ljuser");
      if (f) { // Auto-fill the account options list w/first item.
        // Apparently selected doesn't work here. So, brute it.
        var box = document.getElementById("ljl-prefs-account-select");
        box.setAttribute("value", ljuser);
        box.setAttribute("label", ljuser);
        f = false;
      }
      // If we have a default user, and this ljuser is that one, then
      // set the default user menu to select it.
      if ((defaultuser) && (ljuser == defaultuser)) {
        var box = document.getElementById("ljl-prefs-account-select");
        box.setAttribute("value", ljuser);
        box.setAttribute("label", ljuser);
        ditem.setAttribute("selected", "true");
      }
      // Do the adds.
      amenu.appendChild(aitem);
      dmenu.appendChild(ditem);
    }

    // And now, make the menus and related buttons/boxes useable:
    document.getElementById("ljl-prefs-account-select")
            .setAttribute("disabled", "false");
    document.getElementById("ljl-prefs-account-passwd")
            .setAttribute("disabled", "false");
    document.getElementById("ljl-prefs-account-remove")
            .setAttribute("disabled", "false");
    document.getElementById("ljl-prefs-default-enable")
            .setAttribute("disabled", "false");
    document.getElementById("ljl-prefs-default-select")
            .setAttribute("disabled", "false");
    // Note that we keep the "Set Default Account" button disabled. That's
    // because that only gets enabled by making a selection in the
    // Default Account menu.
    document.getElementById("ljl-prefs-default-setacct")
            .setAttribute("disabled", "true");
  }
  return true;
}

// Initialize the Preferences window
function ljl_prefs_init() {
  ljl_prefs_uidmap_init();
  ljl_prefs_account_init();
}
