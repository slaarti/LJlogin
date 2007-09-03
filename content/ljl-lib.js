function LJlogin_preference(pref, failval) {
  // Get (or, optionally, set) a preference.

  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
  try {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.ljlogin.");
  } catch(e) {
    prompts.alert(window, "LJlogin",
                          "Problem accessing preferences: " + e);
    return null;
  }

  // Being called with a third argument means that we want to save
  // a value to the preference, so do that first.
  if (arguments.length > 2) {
    try {
      var value = arguments[2]; // Get what we're setting the pref to.

      // Just how we save the pref depends on what kind it is.
      switch (typeof value) {
        case 'boolean':
          prefs.setBoolPref(pref, value);
          break;
        case 'string':
          prefs.setCharPref(pref, value);
          break;
        case 'number':
          prefs.setIntPref(pref, value);
          break;
      }
    } catch(e) { // Oops.
      prompts.alert(window, "LJlogin",
                            "Problem saving preference: " + e);
      return null;
    }
  }

  try { // Get the current preference value.
    // Need to handle based on type. This determines not only which
    // function we use, but also what kind of value needs to be
    // returned in the event of a failure.
    switch(prefs.getPrefType(pref)) {
      case prefs.PREF_BOOL:
        var pval = prefs.getBoolPref(pref);
        break;
      case prefs.PREF_STRING:
        var pval = prefs.getCharPref(pref);
        break;
      case prefs.PREF_INT:
        var pval = prefs.getIntPref(pref);
        break;
      default: // No type probably means it doesn't exist, so punt.
        return failval;
    }
  } catch(e if e instanceof Components.Exception) { // Oops. Probably no value.
    if (e.result == Components.results.NS_ERROR_UNEXPECTED) {
      return failval;
    } else {
      prompts.alert(window, "LJlogin",
                            "Problem getting preference: " + e);
      return failval;
    }
  } catch(e) { // Other oops.
    prompts.alert(window, "LJlogin",
                          "Problem getting preference: " + e);
    return failval;
  }

  return pval;
}

function LJlogin_getljsession(siteid) {
  var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"]
                  .getService(Components.interfaces.nsICookieManager);
  var handinjar = cookiejar.enumerator;

  while (handinjar.hasMoreElements()) {
    try { // Get the cookie
      var yumcookie = handinjar.getNext();
      if (!yumcookie) { // Oops. No actual cookie there.
        return false;
      }
    } catch(e) {
      alert(e);
    }
    // Make the cookie comprehensible.
    yumcookie = yumcookie.QueryInterface(Components.interfaces.nsICookie);
    // Check if it's the one we want.
    var ljcookie = new RegExp(LJlogin_sites[siteid].cookiere);
    if ((ljcookie.test(yumcookie.host)) && (yumcookie.name == "ljsession")) {
      return yumcookie.value;
    }
  }
  return false; // Didn't find the cookie we wanted.
}

function LJlogin_getljuser(siteid, ljcookie) {
  // Try to get the username out of the cookie.

  // First, we need to extract the userid from the ljsession:
  var sessfields = ljcookie.split(":");
  var ljuid = sessfields[1];
  if (!ljuid) { // If there's nothing there, then punt:
    return false;
  }

  // Now, go through the Password Manager and hopefully find a matching
  // username/uid pair. I *would* use findPasswordEntry instead, except
  // that whoever wrote it makes it throw an exception if there's no
  // match, instead of doing something sane with return values. Cockbites.
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
                  .getService(Components.interfaces.nsIPasswordManager);
    var passcheck = passman.enumerator;
    while (passcheck.hasMoreElements()) {
      var signon = passcheck.getNext();
      if (!signon) { // Oops. No actual info there.
        continue; // So skip it.
      }
      // Translate the object into parts.
      uidmap = signon.QueryInterface(Components.interfaces.nsIPassword);
      if ((uidmap.host == "ljlogin." + siteid + ".uidmap") &&
          (uidmap.password == ljuid)) {
        return uidmap.user; // Yay, we found it!
      }
    }
  } catch(e) {
    alert("Error looking up uid map: " + e);
    return false;
  }
  return "?UNKNOWN!"; // No match found. Aw.
}

function LJlogin_trashsession(siteid) {
  try {
    var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"]
                    .getService(Components.interfaces.nsICookieManager);
    var cookiedom = LJlogin_sites[siteid].cookiedom;
    cookiejar.remove(cookiedom, "ljsession", "/", false);
    cookiejar.remove(cookiedom, "ljmastersession", "/", false);
    cookiejar.remove(cookiedom, "ljloggedin", "/", false);
  } catch(e) {
    alert("Error removing login cookies: " + e);
  }
  return;
}

// Test a username for validity
function LJlogin_validuser(ljuser) {
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
  // First is the bad-character check. Uppercase characters are technically
  // verboten by LJ, or at least that's what they say in the account creation
  // page, as is the hyphen, but in post-create ops, they work just fine in
  // place of the lowercase letters and underscore, respectively, so allow
  // them in the check:
  var badchars = new RegExp("[^a-zA-Z0-9_-]");
  if (badchars.test(ljuser)) {
    prompts.alert(window, "LJlogin", "Invalid character(s) in username!");
    return false;
  } else if (ljuser.length > 15) {
    // Also, check for if the username provided is too long. It's possible
    // that there's no actual harm in letting people screw up this way, but
    // we may as well check for it and handle appropriately:
    prompts.alert(window, "LJlogin",
                  "Invalid username: Must be no longer than 15 characters.");
    return false;
  } else if (ljuser.length == 0) {
    // Finally, check that we got anything at all. I suppose it's silly that
    // this should be the final check, but that's they way the tests got
    // added.
    prompts.alert(window, "LJlogin",
                  "No username given!");
    return false;
  } else {
    return true;
  }
}

// Stash a username/userid pair into the Password Manager to make available
// later for getting a username from a uid.
function LJlogin_mkuidmap(siteid, ljuser, ljuid) {
  try {
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
                  .getService(Components.interfaces.nsIPasswordManagerInternal);
    passman.addUserFull("ljlogin." + siteid + ".uidmap",
                         ljuser,     ljuid,
                        "username", "userid");
  } catch(e) {
    alert("Password saving failed: " + e);
    return false;
  }
  return true;
}

// Take an ljsession and make the requisite cookies.
function LJlogin_savesession(siteid, mysession) {
  if (!mysession) return false; // No point if no session.
  // Also no point if invalid siteid.
  if (!LJlogin_sites.hasOwnProperty(siteid)) return false;
// This code was written on the assumption that the nsICookieManager2
// interface, which had this nifty add() method that did just what you'd
// expect, would be available. Alas, it's not, so we have to do some
// fucked-up hackery instead.
//  var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"]
//                 .getService(Components.interfaces.nsICookieManager2);
//  cookiejar.add(".livejournal.com", "/", "ljsession", ljsession,
//                false, true, 0);
  // This fucked-up hackery, BTW, is based on SaveCookie() from the
  // "Add N Edit Cookies" extension.
  // For some reason, this *has* to be a URI object, and not just the
  // string, like our IQ was normal.
  var ljuri = Components.classes["@mozilla.org/network/standard-url;1"]
                        .createInstance(Components.interfaces.nsIURI);
  ljuri.spec = LJlogin_sites[siteid].cookieurl;
  // The cookies, on the other hand, can be strings, but need to be
  // formatted like they were being handed back from a server.
  var cookiedom = LJlogin_sites[siteid].cookiedom;
  var ljsession = "ljsession=" + mysession +
                  "; path=/; domain=" + cookiedom + ";";
  var ljmasters = "ljmastersession=" + mysession +
                  "; path=/; domain=" + cookiedom + ";";
  // This bit's tricky: Gotta pull the uid and session id out of the
  // session info, and use that to build the ljloggedin cookie:
  var sessfields = mysession.split(":");
  var ljloggedin = "ljloggedin=" + sessfields[1]+":"+sessfields[2] +
                   "; path=/; domain=" + cookiedom + ";";
  // Do the actual saves.
  try {
//    var cookiejar = Components.classes["@mozilla.org/cookieService;1"]
//    .getService().QueryInterface(Components.interfaces.nsICookieService);
    var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"]
                    .getService(Components.interfaces.nsICookieService);
    cookiejar.setCookieString(ljuri, null, ljsession, null);
    cookiejar.setCookieString(ljuri, null, ljmasters, null);
    cookiejar.setCookieString(ljuri, null, ljloggedin, null);
  } catch(e) {
    alert("Error in cookie creation: " + e);
    return false;
  }
  return true;
}

// Pull a list of usernames from the PM, hand them back as a sorted array.
function LJlogin_userlist(siteid) {
  var userlist = new Array();
  try {
    // Grab logins to form menu.
    var passman = Components.classes["@mozilla.org/passwordmanager;1"]
                  .getService(Components.interfaces.nsIPasswordManager);
    var passcheck = passman.enumerator;
    while (passcheck.hasMoreElements()) {
      var signon = passcheck.getNext(); // Get the password
      if (!signon) continue; // Oops. No actual password info there.
      // Translate the object into parts.
      signon = signon.QueryInterface(Components.interfaces.nsIPassword);
      if (signon.host == LJlogin_sites[siteid].passmanurl) {
        // We have a winner! Add the username to the list.
        userlist.push(signon.user);
      }
    }
  } catch(e) {
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
    prompts.alert(window, "LJlogin",
                  "Error loading username list: " + e);
    return []; // Null list for failure.
  }

  return userlist.sort();
}

// The meat of this function is lifted pretty much wholesale from the
// page on nsICryptoHash on MozDevCenter. Take a string, pass it back
// as hexified md5 hash. Presumably, this'll be cleaner than the md5
// library that I'd previously been using.
function LJlogin_hex_md5(plaintext) {
  var converter =
    Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
      createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

  // we use UTF-8 here, you can choose other encodings.
  converter.charset = "UTF-8";
  // result is an out parameter,
  // result.value will contain the array length
  var result = {};
  // data is an array of bytes
  var pt = converter.convertToByteArray(plaintext, result);
  var ch = Components.classes["@mozilla.org/security/hash;1"]
                     .createInstance(Components.interfaces.nsICryptoHash);
  ch.init(ch.MD5);
  ch.update(pt, pt.length);
  var hash = ch.finish(false);

  // Mmmmm, embedded function...
  function toHexString(charCode) {
    return ("0" + charCode.toString(16)).slice(-2);
  }

  return [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
}
