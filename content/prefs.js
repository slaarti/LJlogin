// Rename an account in the uidmap
function ljl_prefs_uidmap_rename() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);

  // Get the uid to rename, and make sure it's actually there.
  var ljuid = document.getElementById("ljl-prefs-uidmap-menu").value;
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
  var ljuid = document.getElementById("ljl-prefs-uidmap-menu").value;
  if (!ljuid) {
    prompts.alert(window, "LJlogin", "No uid/username provided for removal!");
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
function LJlogin_prefs_uidmap_init(siteid) {
  // Before we can build, we must first destroy:
  var menu = document.getElementById("ljlogin-prefs-uidmap-menu");
  menu.selectedIndex = -1; // Unselect...
  menu.removeAllItems(); // ...and clear.

  // Disable all of the elements; we'll re-enable if we have uidmap
  // elements to deal with for this siteid (assuming it's a real one.)
  document.getElementById("ljlogin-prefs-uidmap-menu").disabled = true;
  document.getElementById("ljlogin-prefs-uidmap-rename").disabled = true;
  document.getElementById("ljlogin-prefs-uidmap-remove").disabled = true;

  // If we got handed the empty siteid, then we're actually just here
  // to disable this set of elements, so we're done.
  if (siteid == '') {
    return;
  }

  // Load up the uidmap.
  var uidmap = new Object();
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
      // Make sure it is one of ours.
      if (mapping.host == "ljlogin." + siteid + ".uidmap") {
        uidmap[mapping.password] = mapping.user; // Add to the list.
        uidcount++; // Up the count.
      }
    }
  } catch(e) {
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
    prompts.alert(window, "LJlogin", "Error populating uidmap: " + e);
    return;
  }

  if (uidcount <= 0) { // Nobody home, apparently, so we're done.
    return;
  } else {
    // This function will allow for sorting on the uids, numerically,
    // ignoring that uids are stored in the PM with an initial "u".
    function uidsort(a, b) {
      var ua = Number(a.substring(1));
      var ub = Number(b.substring(1));
      return ua - ub;
    }

    // Extract the uids into an array and sort...
    var uida = [ i for (i in uidmap) ].sort(uidsort);
    // ...Then use them to format the menu items.
    for (var uidn = 0; uidn < uida.length; uidn++) {
      var uid = uida[uidn]; // Turn index into uid
      menu.appendItem(uid + " - " + uidmap[uid], uid);
    }

    // Select the first, zero-ordered:
    menu.selectedIndex = 0;

    // And now, make the menu and its related buttons available for action:
    document.getElementById("ljlogin-prefs-uidmap-menu").disabled = false;
    document.getElementById("ljlogin-prefs-uidmap-rename").disabled = false;
    document.getElementById("ljlogin-prefs-uidmap-remove").disabled = false;
  }
  return;
}

function ljl_prefs_account_passwd() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);

  // Get the uid to rename, and make sure it's actually there.
  var ljuser = document.getElementById("ljl-prefs-account-menu").value;
  if (!ljuser) {
    prompts.alert(window, "LJlogin",
                          "No username provided for password change!");
    return false;
  }

  // Ask for the new oassword, and get confirmation of it as well.
  var passwd = { value: "" }; // Copy the object for editing
  var chkbx = { value: false }; // Unused but required
  var needpw = true;
  while (needpw) {
    var doit = prompts.promptPassword(window, "LJlogin: Change Password",
                      "What is the new password for this account? " +
                      "(Keep in mind that this does not change the " +
                      "password on LiveJournal's servers.)",
                      passwd, null, chkbx);
    if (!doit) return false; // User canceled.

    // Now we need confirmation:
    var confpw = { value: "" };
    doit = prompts.promptPassword(window, "LJlogin: Change Password",
                  "Please re-enter the new password to confirm:",
                  confpw, null, chkbx);
    if (!doit) return false; // User canceled.

    if (passwd.value == confpw.value) {
      needpw = false; // Got a confirmation match.
    } else {
      // Replacement password and confirmation were different.
      prompts.alert(window, "LJlogin: Change Password",
                            "New password and confirmation must match!");
    }
  }

  // Okay. Now we have the goods. Update the password
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService(Components.interfaces.nsIPasswordManagerInternal);
    passman.addUserFull("http://www.livejournal.com",
                        ljuser, passwd.value,
                        "user", "password");
  } catch(e) {
    prompts.alert(window, "LJlogin",
                          "Error while attempting to save password: " + e);
    return false;
  }

  prompts.alert(window, "LJlogin: Change Password",
                        "Password change successful!");
  return true;
}

// Remove an account from the Password Manager:
function ljl_prefs_account_remove() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);

  // Get the username, and make sure it's actually there.
  var ljuser = document.getElementById("ljl-prefs-account-menu").value;
  if (!ljuser) {
    prompts.alert(window, "LJlogin", "No username provided for removal!");
    return false;
  }

  // Give the user a chance to cancel:
  if (!prompts.confirm(window, "LJlogin: Remove Account",
                       "Are you sure you want to remove this account? " +
                       "(" + ljuser + ") " +
                       "(Note: Does not log you out if logged in to " +
                       "this account.)")) {
    return false; // Never mind!
  }

  // Do the removal:
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService().QueryInterface(Components.interfaces.nsIPasswordManager);
    passman.removeUser("http://www.livejournal.com", ljuser);
  } catch(e) {
    prompts.alert(window, "LJlogin", "Error removing account: " + e);
    return false;
  }

  // Finally, reload the account section of the Prefs window:
  ljl_prefs_account_init();

  // And, done.
  return true;
}

function LJlogin_prefs_account_init(siteid) {
  // Before we can build, we must first destroy:
  var amenu = document.getElementById("ljlogin-prefs-account-menu");
  amenu.selectedIndex = -1; // Unselect...
  amenu.removeAllItems(); // ...and clear.

  // Disable all of the elements; we'll re-enable if we have account
  // elements to deal with for this siteid (assuming it's a real one.)
  document.getElementById("ljlogin-prefs-account-menu").disabled = true;
  document.getElementById("ljlogin-prefs-account-passwd").disabled = true;
  document.getElementById("ljlogin-prefs-account-remove").disabled = true;

  // If empty siteid, then everything's clear and disabled and we're done.
  if (siteid == '') {
    return;
  }

  // Get the user list to populate the menu.
  var userlist = LJlogin_userlist(siteid);

  if (userlist.length <= 0) { // Nobody home, apparently; done.
    return;
  } else {
    for (var i = 0; i < userlist.length; i++) { // Make the menu.
      var ljuser = userlist[i]; // Get item content
      amenu.appendItem(ljuser, ljuser); // Add item to account menu
    }

    amenu.selectedIndex = 0; // Select first item by default;
                             // Remember that it's zero-indexed.

    // And now, make the menus and related buttons/boxes useable:
    document.getElementById("ljlogin-prefs-account-menu").disabled = false;
    document.getElementById("ljlogin-prefs-account-passwd").disabled = false;
    document.getElementById("ljlogin-prefs-account-remove").disabled = false;
  }

  return;
}

// Toggle the availability of the default-user select menu, as well as
// setting the value of the relevant preference.
function ljl_prefs_default_onoff() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
  // Get checkbox state:
  var checked = document.getElementById("ljl-prefs-default-enable")
                        .getAttribute("checked");
  // Remember that checked means enabled means "disabled" must be false
  // and vice versa:
  if (checked == "true") {
    document.getElementById("ljl-prefs-default-ljuser")
            .removeAttribute("disabled");
  } else {
    document.getElementById("ljl-prefs-default-ljuser")
            .setAttribute("disabled", "true");
  }
  // We always disable this, because it's only allowed by entering text
  // in the account name box:
  document.getElementById("ljl-prefs-default-setacct")
          .setAttribute("disabled", "true");

  // Save the enable/disable value to the preference system:
  try {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.ljlogin.");
    prefs.setBoolPref("defaultlogin.enable",
                      (checked == "true" ? true : false));
  } catch(e) {
    prompts.alert(window, "LJlogin: Default login on/off",
                          "Problem saving preference: " + e);
    return false;
  }

  return true;
}

// Make sure we can set a default account when the menu is changed
function ljl_prefs_default_change() {
  document.getElementById("ljl-prefs-default-setacct")
          .removeAttribute("disabled");
  return true;
}

// Set the default account preference
function ljl_prefs_default_setacct() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
  // Get the username, and make sure it's actually there.
  var ljuser = document.getElementById("ljl-prefs-default-ljuser").value;
  // Check that it's an okay username, but first check if it's set to
  // anything at all, because ljl_validuser() doesn't allow that but
  // we should probably let the user do that here.
  if ((!ljuser) || (!ljl_validuser(ljuser))) return false;

  try {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.ljlogin.");
    prefs.setCharPref("defaultlogin.ljuser", ljuser);
  } catch(e) {
    prompts.alert(window, "LJlogin: Default login username",
                          "Problem saving preference: " + e);
    return false;
  }

  // We've set the default, so disable the button until the user
  // wants to change it again.
  document.getElementById("ljl-prefs-default-setacct")
          .setAttribute("disabled", "true");
  return true;
}

function LJlogin_prefs_default_init(siteid) {
  // Elements at play:
  var menu = document.getElementById("ljlogin-prefs-default-ljuser");
  var chx = document.getElementById("ljlogin-prefs-default-enable");

  // Before we can build, we must first destroy:
  menu.value = ''; // Blank out any possible custom text.
  menu.selectedIndex = -1; // Unselect...
  menu.removeAllItems(); // ...and clear.

  // Disable all of the elements; we'll re-enable if we have account
  // elements to deal with for this siteid (assuming it's a real one.)
  chx.disabled = true;
  menu.disabled = true;
  document.getElementById("ljlogin-prefs-default-setacct").disabled = true;

  // If we got handed the empty siteid, then we're actually just here
  // to disable this set of elements, so we're done.
  if (siteid == '') {
    return;
  }

  // Get the user list to populate the menu.
  var userlist = LJlogin_userlist(siteid);

  for (var i = 0; i < userlist.length; i++) { // Make the menu.
    var ljuser = userlist[i]; // Get item content
    menu.appendItem(ljuser, ljuser); // Add item to defaults menu
  }

  // Get the default username, and fill the field info:
  menu.value = LJlogin_sites_defaultlogin_ljuser(siteid);

  // Get the default account enable preference, and set the state of the
  // default-account checkbox and menu being enabled accordingly:
  var defchecked = LJlogin_sites_defaultlogin_enabled(siteid);
  chx.checked = defchecked;
  menu.disabled = !defchecked;

  // And enable the default enable checkbox. The account setter
  // button stays disabled, because it's only allowed when the
  // user changes the username in the box.
  chx.disabled = false;

  // And now we're done.
  return;
}

function LJlogin_prefs_ljcode_select(siteid) {
  var site = document.getElementById("ljlogin-prefs-ljcode-" + siteid);
  var enable = site.checked;
  window.alert(siteid + ": " + (enable ? "enable" : "disable"));
}

function LJlogin_prefs_site_select() {
  var menu = document.getElementById("ljlogin-prefs-site-select");

  // A bit of tricksy-ness: If called with an index argument, then
  // set the index to select the menu item in question before letting
  // the rest of the function decide what to do about which item
  // is selected.
  if (arguments.length > 0) {
    menu.selectedIndex = arguments[0];
  }

  // Get the siteid from the menu (assuming there is one;
  // non-selection is possible, and will yield an empty value,
  // but there's still use for it as a signal to disable everything.)
  var siteid = menu.value;
  // ...and then get per-site set up accordingly.
  LJlogin_prefs_uidmap_init(siteid);
  LJlogin_prefs_account_init(siteid);
  LJlogin_prefs_default_init(siteid);
}

function LJlogin_prefs_site_menu(gotosite) {
  // Creates/refreshes the drop-down menu to select which site to set
  // site-specific preferences, and selects the site specified in the
  // argument.
  // ('' is the null siteid, and will yield a selection of no site.)
  // If there are no enabled siteids, disable the menu.

  var sitemenu = document.getElementById("ljlogin-prefs-site-select");
  var enabledsites = LJlogin_enabled_sites();

  // First things first: Unselect the menu and remove its existing
  // elements, if any. Unselecting this way will have the bonus effect
  // of disabling all fields of the per-site section of the prefs box,
  // which will be automatically re-enabled if there's an actual siteid
  // to select/go to, or left disabled if its either left un-selected or
  // if there are no enabled sites to select.
  LJlogin_prefs_site_select(-1);
  sitemenu.removeAllItems();

  if (enabledsites.length == 0) {
    // No enabled sites? Disable the menu entirely.
    sitemenu.disabled = true;
  } else {
    // There are sites, so create the menu and possibly select a site.
    var gotoidx = -1; // No selection by default.

    // Loop through the enabled siteids.
    for (var idx = 0; idx < enabledsites.length; idx++) {
      var siteid = enabledsites[idx];

      if (siteid == gotosite) { // A match! Save this index for later.
        gotoidx = idx;
      }

      sitemenu.appendItem(LJlogin_sites[siteid].name, siteid);
    }

    // And select the site we need, or none if needed.
    LJlogin_prefs_site_select(gotoidx);
  }
}

// Initialize the Preferences window
function LJlogin_prefs_init() {
  var enabledsites = LJlogin_enabled_sites();
  var sitebox = document.getElementById("ljlogin-prefs-ljcode-menu");
  for (var siteid in LJlogin_sites) {
    var item = document.createElement("checkbox");
    item.setAttribute("id", "ljlogin-prefs-ljcode-" + siteid);
    item.setAttribute("label", LJlogin_sites[siteid].name);
    item.setAttribute("oncommand",
                      "LJlogin_prefs_ljcode_select('" + siteid + "');");
    if (enabledsites.indexOf(siteid) != -1) {
      item.setAttribute("checked", "true");
    }
    sitebox.appendChild(item);
  }

  LJlogin_prefs_site_menu('dj');
}
