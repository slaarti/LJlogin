function LJlogin_prefs_siteid() {
  // Extract and return the current siteid.
  // For use with per-site preference settings.
  var sitemenu = document.getElementById("ljlogin-prefs-site-select");
  return sitemenu.value;
}

// Set stealth widget preference according to checkbox.
function LJlogin_prefs_stealth_onoff() {
  var siteid = LJlogin_prefs_siteid();

  var chx = document.getElementById('ljlogin-prefs-stealth-enable').checked;
  LJlogin_sites_stealthwidget(siteid, chx);

  return;
}

// Configure checkbox for stealth widget preference.
function LJlogin_prefs_stealth_init(siteid) {
  var chx = document.getElementById('ljlogin-prefs-stealth-enable');

  // Unset/disable by default.
  chx.checked = false;
  chx.disabled = true;

  // If no siteid, we're done.
  if (!siteid) return;

  // Set the checked status according to preference, and enable.
  chx.checked = LJlogin_sites_stealthwidget(siteid);
  chx.disabled = false;

  // Done.
  return;
}

// Set preference for site scheme cookie. Setting 'none' will unset.
function LJlogin_prefs_scheme_set() {
  var siteid = LJlogin_prefs_siteid();
  var scheme = document.getElementById('ljlogin-prefs-scheme').value;
  LJlogin_sites_sitescheme(siteid, scheme);

  // Handle doing the cookie op.
  LJlogin_save_sitescheme(siteid, scheme);

  return;
}

// Configure menu for setting site scheme cookie
function LJlogin_prefs_scheme_init(siteid) {
  // Before we can build, we must first destroy:
  var menu = document.getElementById("ljlogin-prefs-scheme");
  menu.selectedIndex = -1; // Unselect...
  menu.removeAllItems(); // ...and clear.

  // Disable all of the elements; we'll re-enable if we have uidmap
  // elements to deal with for this siteid (assuming it's a real one.)
  document.getElementById("ljlogin-prefs-scheme").disabled = true;
  document.getElementById("ljlogin-prefs-scheme-set").disabled = true;

  // If we got handed the empty siteid, then we're actually just here
  // to disable this set of elements, so we're done.
  if (siteid == '') {
    return;
  }

  // Get the scheme list to populate the menu.
  var schemes = LJlogin_sites[siteid].siteschemes;

  // First, we provide a null option, which means to set no cookie at all.
  menu.appendItem('(None)', '');

  for (var scheme in schemes) { // Make the menu.
    menu.appendItem(schemes[scheme], scheme); // Add item to menu
  }

  // And a few bonus schemes, bundled with LJcode:
  menu.appendItem('Lynx', 'lynx');
  menu.appendItem('Blue White', 'bluewhite');
  menu.appendItem('Opal Cat', 'opalcat');

  // Set the initial value from preferences:
  menu.value = LJlogin_sites_sitescheme(siteid);

  // And now, make the menu and related buttons useable:
  document.getElementById("ljlogin-prefs-scheme").disabled = false;
  document.getElementById("ljlogin-prefs-scheme-set").disabled = false;

  return;
}

// Rename an account in the uidmap
function LJlogin_prefs_uidmap_rename() {
  var siteid = LJlogin_prefs_siteid();

  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);

  // Get the uid to rename, and make sure it's actually there.
  var ljuid = document.getElementById("ljlogin-prefs-uidmap-menu").value;
  if (!ljuid) {
    prompts.alert(window, "LJlogin", "No uid/username provided for edit!");
    return;
  }

  // Load the existing username as a basis for edit:
  var olduname = LJlogin_uidmap_lookup(siteid, ljuid);
  if (olduname == "?UNKNOWN!") { // Something didn't happen right here.
    prompts.alert(window, "LJlogin", "Unable to change username!");
    return;
  }

  // Ask for the new username. Make sure it's valid while we're at it.
  var newuname = { value: olduname }; // Copy the object for editing
  var chkbx = { value: false }; // Unused but required
  var needuser = true;
  while (needuser) {
    var doit = prompts.prompt(window, "LJlogin: Change Username",
                              "What is the correct username for this userid?",
                              newuname, null, chkbx);
    if (!doit) return; // User canceled.
    if (LJlogin_validuser(newuname.value)) needuser = false; // Validity check
  }

  // Because we're saving a new username, and the PM doesn't let you pick
  // which field you key on, we have to remove the old uidmap entry before
  // you can add the new one:
  if (!LJlogin_uidmap_rmentry(siteid, olduname)) return;

  // Save the new username:
  if (!LJlogin_mkuidmap(siteid, newuname.value, ljuid)) {
    prompts.alert(window, "LJlogin", "uidmap update failed!");
    return;
  }

  // Reset the username in the status widget if we just changed the
  // username for the currently logged-in user:
  LJlogin_refreshsession(siteid, ljuid);

  // Finally, reload the uidmap section of the Prefs window:
  LJlogin_prefs_uidmap_init(siteid);

  // And, done.
  return;
}

// Remove an entry from the uidmap
function LJlogin_prefs_uidmap_remove() {
  var siteid = LJlogin_prefs_siteid();

  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);

  // Get the uid to remove, and make sure it's actually there.
  var ljuid = document.getElementById("ljlogin-prefs-uidmap-menu").value;
  if (!ljuid) {
    prompts.alert(window, "LJlogin", "No uid/username provided for removal!");
    return;
  }

  // Give the user a chance to cancel:
  if (!prompts.confirm(window, "LJlogin: Remove name/uid from uidmap",
                       "Are you sure you want to remove this entry " +
                       "from the uidmap?")) {
    return; // Never mind!
  }

  // Can't just remove by uid, because the username is the key field,
  // so we have to do an extract from the PM first:
  var username = LJlogin_uidmap_lookup(siteid, ljuid);
  if (username == "?UNKNOWN!") { // Something didn't happen right here.
    prompts.alert(window, "LJlogin", "Unable to find username for removal!");
    return;
  }

  // Do the removal. Punt if it doesn't work.
  if (!LJlogin_uidmap_rmentry(siteid, username)) return;

  // Reset the username in the status widget if we just removed the
  // username for the currently logged-in user:
  LJlogin_refreshsession(siteid, ljuid);

  // Finally, reload the uidmap section of the Prefs window:
  LJlogin_prefs_uidmap_init(siteid);

  // And, done.
  return;
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

function LJlogin_prefs_account_passwd() {
  var siteid = LJlogin_prefs_siteid();

  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);

  // Get the uid to rename, and make sure it's actually there.
  var ljuser = document.getElementById("ljlogin-prefs-account-menu").value;
  if (!ljuser) {
    prompts.alert(window, "LJlogin",
                          "No username provided for password change!");
    return;
  }

  // Ask for the new password, and get confirmation of it as well.
  var passwd = { value: "" }; // Copy the object for editing
  var chkbx = { value: false }; // Unused but required
  var needpw = true;
  while (needpw) {
    var doit = prompts.promptPassword(window, "LJlogin: Change Password",
                      "What is the new password for this account? " +
                      "(Keep in mind that this does not change the " +
                      "password on LiveJournal's servers.)",
                      passwd, null, chkbx);
    if (!doit) return; // User canceled.

    // Now we need confirmation:
    var confpw = { value: "" };
    doit = prompts.promptPassword(window, "LJlogin: Change Password",
                  "Please re-enter the new password to confirm:",
                  confpw, null, chkbx);
    if (!doit) return; // User canceled.

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
    return;
  }

  if (LJlogin_savepassword(siteid, ljuser, passwd.value)) {
    prompts.alert(window, "LJlogin: Change Password",
                          "Password change successful!");
  }
}

// Remove an account from the Password Manager:
function LJlogin_prefs_account_remove() {
  var siteid = LJlogin_prefs_siteid();

  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);

  // Get the username, and make sure it's actually there.
  var ljuser = document.getElementById("ljlogin-prefs-account-menu").value;
  if (!ljuser) {
    prompts.alert(window, "LJlogin", "No username provided for removal!");
    return;
  }

  // Give the user a chance to cancel:
  if (!prompts.confirm(window, "LJlogin: Remove Account",
                       "Are you sure you want to remove this account? " +
                       "(" + ljuser + ") " +
                       "(Note: Does not log you out if logged in to " +
                       "this account.)")) {
    return; // Never mind!
  }

  // Do the removal:
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService().QueryInterface(Components.interfaces.nsIPasswordManager);
    passman.removeUser(LJlogin_sites[siteid].passmanurl, ljuser);
  } catch(e) {
    prompts.alert(window, "LJlogin", "Error removing account: " + e);
    return;
  }

  // Finally, reload the account and default user
  // sections of the Prefs window. (Yes, this will
  // trash any unsaved state in the default user
  // section, but c'est la vie, should've saved.)
  LJlogin_prefs_account_init(siteid);
  LJlogin_prefs_default_init(siteid);

  // And, done.
  return;
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
function LJlogin_prefs_persist_default() {
  var siteid = LJlogin_prefs_siteid();

  // Get menu state:
  var choice = document.getElementById("ljlogin-prefs-persist-default")
                       .value;

  // Save the value to the preference system:
  LJlogin_sites_persistdefault(siteid, choice);

  // And re-initialize the menus/buttons, to set whether or not
  // the default-login options are enabled.
  LJlogin_prefs_default_init(siteid);

  return;
}

// Make sure we can set a default account when the menu is changed
function LJlogin_prefs_default_change() {
  document.getElementById("ljlogin-prefs-default-setacct").disabled = false;
}

// Set the default account preference
function LJlogin_prefs_default_setacct() {
  var siteid = LJlogin_prefs_siteid();

  // Get the username, and make sure it's actually there.
  var ljuser = document.getElementById("ljlogin-prefs-default-ljuser").value;

  // Check that it's an okay username, but first check if it's set to
  // anything at all, because LJlogin_validuser() doesn't allow that but
  // we should probably let the user do that here.
  if ((ljuser.length > 0) && (!LJlogin_validuser(ljuser))) return;

  // Set the username
  LJlogin_sites_defaultlogin_ljuser(siteid, ljuser);

  // We've set the default, so disable the button until the user
  // wants to change it again.
  document.getElementById("ljlogin-prefs-default-setacct").disabled = true;
}

function LJlogin_prefs_default_init(siteid) {
  // Elements at play:
  var act = document.getElementById("ljlogin-prefs-persist-default");
  var menu = document.getElementById("ljlogin-prefs-default-ljuser");

  // Before we can build, we must first destroy:
  menu.value = ''; // Blank out any possible custom text.
  menu.selectedIndex = -1; // Unselect...
  menu.removeAllItems(); // ...and clear.
  act.value = "0"; // Set to do nothing by default.

  // Disable all of the elements; we'll re-enable if we have account
  // elements to deal with for this siteid (assuming it's a real one.)
  act.disabled = true;
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

  // Get the preference for whether the user wants persistent sessions
  // or default account, and set the state of that menu and the default
  // account selection menu's enable/disable accordingly:
  var pd = LJlogin_sites_persistdefault(siteid);
  act.value = pd;
  if (pd == "2") { // Default login.
    menu.disabled = false;
  }

  // And enable the persistent/default menu. The account setter
  // button stays disabled, because it's only allowed when the
  // user changes the username in the box.
  act.disabled = false;

  // And now we're done.
  return;
}

function LJlogin_prefs_session_action() {
  var siteid = LJlogin_prefs_siteid();

  // Get the value of the menu, and set the preference accordingly.
  var actionmenu = document.getElementById("ljlogin-prefs-session-action");
  var action = actionmenu.value;
  LJlogin_sites_session_action(siteid, action);

  // Refresh the prefbox session, to possibly change the dest menu's state.
  LJlogin_prefs_session_init(siteid);

  // Done.
  return;
}

function LJlogin_prefs_session_dest() {
  var siteid = LJlogin_prefs_siteid();

  // Get the value of the menu, and set the preference accordingly.
  var destmenu = document.getElementById("ljlogin-prefs-session-dest");
  var dest = destmenu.value;
  LJlogin_sites_session_dest(siteid, dest);

  // Done.
  return;
}

function LJlogin_prefs_session_init(siteid) {
  // Elements at play:
  var actionmenu = document.getElementById("ljlogin-prefs-session-action");
  var destmenu = document.getElementById("ljlogin-prefs-session-dest");

  // Deselect and disable by default.
  actionmenu.selectedIndex = -1;
  actionmenu.disabled = true;
  destmenu.selectedIndex = -1;
  destmenu.disabled = true;

  // If no siteid, then we're done.
  if (!siteid) return;

  // Get settings to apply to menus.
  var action = LJlogin_sites_session_action(siteid);
  var dest = LJlogin_sites_session_dest(siteid);

  // Set values.
  actionmenu.value = action;
  destmenu.value = dest;

  // Always enable action, but only enable dest if we have an action.
  actionmenu.disabled = false;
  if (action != "0") destmenu.disabled = false;

  // And done.
  return;
}

function LJlogin_prefs_ljcode_select(siteid) {
  var enabledsites = LJlogin_enabled_sites();

  var site = document.getElementById("ljlogin-prefs-ljcode-" + siteid);
  var enable = site.checked;
  var destid = ''; // Where we'll go after this; nowhere by default.

  if (enable) { // Activate this siteid.
    // Make sure it's not already there.
    if (enabledsites.indexOf(siteid) == -1) {
      enabledsites.push(siteid);
      destid = siteid; // Always go to the siteid we just enabled.
    } else {
      window.alert("Attempt to enable site that's already enabled!");
      return;
    }
  } else { // Actually, disable.
    var idx = enabledsites.indexOf(siteid); // Find it in the list.
    if (idx != -1) { // Make sure that it is, in fact, already enabled.
      enabledsites.splice(idx, 1);
      var cursite = LJlogin_prefs_siteid();
      // If we're disabling the current site, then go nowhere, else stay.
      if (siteid == cursite) {
        destid = '';
      } else {
        destid = cursite;
      }
    } else {
      window.alert("Attempt to disable site that's already disabled!");
      return;
    }
  }

  // Update the preference
  LJlogin_enabled_sites(enabledsites);

  // And update the site selection menu and either go to the newly-enabled
  // site, or to no site if we're disabling one.
  LJlogin_prefs_site_menu(destid);
  return;
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
  LJlogin_prefs_scheme_init(siteid);
  LJlogin_prefs_stealth_init(siteid);
  LJlogin_prefs_session_init(siteid);
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

    // And enable the menu.
    sitemenu.disabled = false;

    // And select the site we need, or none if needed.
    LJlogin_prefs_site_select(gotoidx);
  }
}

// Initialize the Preferences window
function LJlogin_prefs_init(mysite) {
  // What sites are already enabled?
  var enabledsites = LJlogin_enabled_sites();

  // Create the list of enable/disable checkboxes for all sites.
  var sitebox = document.getElementById("ljlogin-prefs-ljcode-menu");
  for (var siteid in LJlogin_sites) {
    var item = document.createElement("checkbox");

    item.setAttribute("id", "ljlogin-prefs-ljcode-" + siteid);
    item.setAttribute("label", LJlogin_sites[siteid].name);
    item.setAttribute("oncommand",
                      "LJlogin_prefs_ljcode_select('" + siteid + "');");

    if (enabledsites.indexOf(siteid) != -1) { // Check if enabled.
      item.setAttribute("checked", "true");
    }

    // Add to the box.
    sitebox.appendChild(item);
  }

  // Finally go to the site matching the menu that called us here.
  LJlogin_prefs_site_menu(mysite);
}
