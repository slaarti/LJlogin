// Initialize the uidmap box
function ljl_prefs_uidmap_init() {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
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
