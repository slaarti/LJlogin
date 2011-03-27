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

function LJlogin_savepassword(siteid, ljuser, ljpass) {
  // Save a username/password pair in the Password Manager.
  try {
    if ("@mozilla.org/passwordmanager;1" in Components.classes) { // FF2
      // Our old friend, the Password Manager
      var passman = Components.classes["@mozilla.org/passwordmanager;1"]
          .getService(Components.interfaces.nsIPasswordManagerInternal);
      passman.addUserFull(LJlogin_sites[siteid].passmanurl,
                          ljuser, ljpass,
                          "user", "password");
    } else if ("@mozilla.org/login-manager;1" in Components.classes) { // FF3
      // Our new friend, the Login Manager!
      var logman = Components.classes["@mozilla.org/login-manager;1"]
          .getService(Components.interfaces.nsILoginManager);

      // Okay, this shit is utterly bananas. In order to make sure I
      // don't save an entry where I already have one (which, with
      // the PM, would just cause it to overwrite/update the old
      // entry, the LM doesn't just throw an exception; it throws an
      // exception that's *just a string*, with no useful exception
      // class or anything. So, as a prophylactic measure before we
      // save the entry, we search and destroy any such entry that
      // might already be there. Lame!
      var linfos = logman.findLogins({},
                                     LJlogin_sites[siteid].passmanurl,
                                     "", null);
      for (var i = 0; i < linfos.length; i++) {
        if (linfos[i].username == ljuser) {
           logman.removeLogin(linfos[i]);
           break;
        }
      }

      var linfo = Components.classes["@mozilla.org/login-manager/loginInfo;1"]
                          .createInstance(Components.interfaces.nsILoginInfo);
      linfo.init(LJlogin_sites[siteid].passmanurl,
                 LJlogin_sites[siteid].passmanurl, null,
                 ljuser, ljpass,
                 "user", "password");
      logman.addLogin(linfo);
    }
  } catch(e) {
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
    prompts.alert(window, "LJlogin",
                          "Error while attempting to save password: " + e);
    return false;
  }

  return true;
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
    if ((ljcookie.test(yumcookie.host)) &&
        (yumcookie.name == LJlogin_sites[siteid].cookiename)) {
      return decodeURIComponent(yumcookie.value);
    }
  }
  return false; // Didn't find the cookie we wanted.
}

function LJlogin_uidmap_lookup(siteid, ljuid) {
  // Do a lookup on the uidmap for a given site.

  if ("@mozilla.org/passwordmanager;1" in Components.classes) { // FF2
    // Our old friend, the Password Manager

    // Need a dummy username variable to put the result in.
    var username = new Object();

    try {
      var passman = Components.classes["@mozilla.org/passwordmanager;1"]
          .getService(Components.interfaces.nsIPasswordManagerInternal);

      // Dummy objects to hold things we don't really care about,
      // but must have a place for nonetheless.
      var temphost = new Object();
      var temppass = new Object();

      // Do the job.
      passman.findPasswordEntry("ljlogin." + siteid + ".uidmap", null, ljuid,
                                temphost, username, temppass);
    } catch(e if e instanceof Components.Exception) {
      // Oops. Probably no match.
      if (e.result == Components.results.NS_ERROR_FAILURE) {
        return "?UNKNOWN!";
      } else { // Something else wrong?! Uh oh.
        prompts.alert(window, "LJlogin", "Error looking up uid map: " + e);
        return "?UNKNOWN!";
      }
    } catch(e) { // Big oops. What happened?!
      prompts.alert(window, "LJlogin", "Error looking up uid map: " + e);
      return "?UNKNOWN!";
    }

    // Yay! Win! Hand back the username.
    return username.value;

  } else if ("@mozilla.org/login-manager;1" in Components.classes) { // FF3
    try {
      // Our new friend, the Login Manager!
      var logman = Components.classes["@mozilla.org/login-manager;1"]
          .getService(Components.interfaces.nsILoginManager);
      // I have to say, though, that this method of searching
      // for an entry? Pretty fucking stupid, compared to the
      // relative simplicity of the Password Manager method.
      var linfos = logman.findLogins({},
                                     "ljlogin." + siteid + ".uidmap",
                                     "", null);
      // Loop over the logins we've got, looking for the right one.
      for (var i = 0; i < linfos.length; i++) {
        if (linfos[i].password == ljuid) {
          // Yay! Win! Hand back the username.
          return linfos[i].username;
          break;
        }
      }

      return "?UNKNOWN!"; // No matches.

    } catch(e) { // Big oops. What happened?!
      prompts.alert(window, "LJlogin", "Error looking up uid map: " + e);
      return "?UNKNOWN!";
    }
  }
}

function LJlogin_getljuser(siteid, ljcookie) {
  // Try to get the username out of the cookie.

  // On some sites, if you log in via the webpage, the cookies they hand back
  // have their colons URI encoded, which makes it difficult to get anything
  // out of them. Thus, we first need to decode the cookie:
  var decoded_cookie = decodeURIComponent(ljcookie);
  // Now we can extract the userid from the ljsession:
  var sessfields = decoded_cookie.split(":");
  var ljuid = sessfields[1];
  if (!ljuid) { // If there's nothing there, then punt:
    return false;
  }

  // We've got a uid, so now try to get a result from the uidmap:
  return LJlogin_uidmap_lookup(siteid, ljuid);
}

function LJlogin_trashsession(siteid) {
  try {
    var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"]
                    .getService(Components.interfaces.nsICookieManager);
    var cookiedom = LJlogin_sites[siteid].cookiedom;
    cookiejar.remove(cookiedom, "ljsession", "/", false);
    cookiejar.remove(cookiedom, "ljmastersession", "/", false);
    cookiejar.remove(cookiedom, "ljloggedin", "/", false);
    cookiejar.remove(".www" + cookiedom, "ljsession", "/", false);
    cookiejar.remove(".www" + cookiedom, "ljmastersession", "/", false);
    cookiejar.remove(".www" + cookiedom, "ljloggedin", "/", false);
    cookiejar.remove("www" + cookiedom, "ljsession", "/", false);
    cookiejar.remove("www" + cookiedom, "ljmastersession", "/", false);
    cookiejar.remove("www" + cookiedom, "ljloggedin", "/", false);
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
  } else if (ljuser.length > 25) {
    // Also, check for if the username provided is too long. It's possible
    // that there's no actual harm in letting people screw up this way, but
    // we may as well check for it and handle appropriately:
    prompts.alert(window, "LJlogin",
                  "Invalid username: Must be no longer than 25 characters.");
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

// Remove a username's entry in a site's uidmap
function LJlogin_uidmap_rmentry(siteid, ljuser) {
  try {
    if ("@mozilla.org/passwordmanager;1" in Components.classes) { // FF2
      // Our old friend, the Password Manager
      var passman = Components.classes["@mozilla.org/passwordmanager;1"]
        .getService().QueryInterface(Components.interfaces.nsIPasswordManager);
      passman.removeUser("ljlogin." + siteid + ".uidmap", ljuser);
    } else if ("@mozilla.org/login-manager;1" in Components.classes) { // FF3
      // Our new friend, the Login Manager!
      var logman = Components.classes["@mozilla.org/login-manager;1"]
          .getService(Components.interfaces.nsILoginManager);
      // I have to say, though, that this method of deleting
      // a password? Pretty fucking stupid, compared to the
      // relative simplicity of the Password Manager method.
      var linfos = logman.findLogins({},
                                     "ljlogin." + siteid + ".uidmap",
                                     "", null);
      for (var i = 0; i < linfos.length; i++) {
        if (linfos[i].username == ljuser) {
           logman.removeLogin(linfos[i]);
           break;
        }
      }
    }
  } catch(e) {
    prompts.alert(window, "LJlogin", "Error removing entry from uidmap: " + e);
    return false;
  }
  return true;
}

// Stash a username/userid pair into the Password Manager to make available
// later for getting a username from a uid.
function LJlogin_mkuidmap(siteid, ljuser, ljuid) {
  try {
    if ("@mozilla.org/passwordmanager;1" in Components.classes) { // FF2
      // Our old friend, the Password Manager
      var passman = Components.classes["@mozilla.org/passwordmanager;1"]
          .getService(Components.interfaces.nsIPasswordManagerInternal);
      passman.addUserFull("ljlogin." + siteid + ".uidmap",
                           ljuser,     ljuid,
                          "username", "userid");
    } else if ("@mozilla.org/login-manager;1" in Components.classes) { // FF3
      // Our new friend, the Login Manager!
      var logman = Components.classes["@mozilla.org/login-manager;1"]
          .getService(Components.interfaces.nsILoginManager);

      // Okay, this shit is utterly bananas. In order to make sure I
      // don't save an entry where I already have one (which, with
      // the PM, would just cause it to overwrite/update the old
      // entry, the LM doesn't just throw an exception; it throws an
      // exception that's *just a string*, with no useful exception
      // class or anything. So, as a prophylactic measure before we
      // save the entry, we search and destroy any such entry that
      // might already be there. Lame!
      var linfos = logman.findLogins({},
                                     "ljlogin." + siteid + ".uidmap",
                                     "", null);
      for (var i = 0; i < linfos.length; i++) {
        if (linfos[i].username == ljuser) {
           logman.removeLogin(linfos[i]);
           break;
        }
      }

      var linfo = Components.classes["@mozilla.org/login-manager/loginInfo;1"]
                          .createInstance(Components.interfaces.nsILoginInfo);
      linfo.init("ljlogin." + siteid + ".uidmap",
                 "ljlogin." + siteid + ".uidmap", null,
                 ljuser, ljuid,
                 "user", "password");
      logman.addLogin(linfo);
    }
  } catch(e) {
    alert("Password saving failed: " + e);
    return false;
  }
  return true;
}

// Set the site scheme for a given site to a given value,
// or unset of a blank scheme value is given.
function LJlogin_save_sitescheme(siteid, scheme) {
  // No point if invalid siteid.
  if (!LJlogin_sites.hasOwnProperty(siteid)) return;
  var cookiedom = LJlogin_sites[siteid].cookiedom;

  // If blank scheme, then unset any cookies that might be here.
  // We do this possibility first 'cause it's simpler.
  if (!scheme) {

    try {
      var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"]
                      .getService(Components.interfaces.nsICookieManager);
      cookiejar.remove(cookiedom, "BMLschemepref", "/", false);
      cookiejar.remove(".www" + cookiedom, "BMLschemepref", "/", false);
      cookiejar.remove("www" + cookiedom, "BMLschemepref", "/", false);
      return;
    } catch(e) {
      alert("Error removing site scheme cookies: " + e);
      return;
    }

  } else {

    // See the gripe in LJlogin_savesession() about all of the
    // hoops that I have to jump through to save a cookie.
    var ljuri = Components.classes["@mozilla.org/network/standard-url;1"]
                          .createInstance(Components.interfaces.nsIURI);
    ljuri.spec = LJlogin_sites[siteid].cookieurl;
    // The cookies need to be formatted like they
    // were being handed back from a server.
    var cookiedom = LJlogin_sites[siteid].cookiedom;
    var schemecookie = "BMLschemepref=" + scheme +
                       "; path=/; domain=" + cookiedom + ";";

    // Do the actual save.
    try {
      var cookiejar = Components.classes["@mozilla.org/cookiemanager;1"]
                      .getService(Components.interfaces.nsICookieService);
      cookiejar.setCookieString(ljuri, null, schemecookie, null);
    } catch(e) {
      alert("Error in cookie creation: " + e);
      return;
    }

  }

  return;
}

// Take an ljsession and make the requisite cookies.
function LJlogin_savesession(siteid, mysession) {
  if (!mysession) return false; // No point if no session.
  // Also no point if invalid siteid.
  if (!LJlogin_sites.hasOwnProperty(siteid)) return false;

  // If we're supposed to make persistent sessions, then
  // crunch the numbers for cookie expiry. 1 year sounds good.
  var expiry = '';
  if (LJlogin_sites_persistdefault(siteid) == "1") {
    var exdate = new Date();
    exdate.setTime(exdate.getTime() + (365*24*60*60*1000));
    expiry = "; expires=" + exdate.toGMTString();
  }

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
                  expiry +
                  "; path=/; domain=" + cookiedom + ";";
  var ljmasters = "ljmastersession=" + mysession +
                  expiry +
                  "; path=/; domain=" + cookiedom + ";";
  // This bit's tricky: Gotta pull the uid and session id out of the
  // session info, and use that to build the ljloggedin cookie:
  var sessfields = mysession.split(":");
  var ljloggedin = "ljloggedin=" + sessfields[1]+":"+sessfields[2] +
                  expiry +
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

// Conditionally refresh a login session, if it's for a userid
// whose uidmap entry has been changed in some way.
function LJlogin_refreshsession(siteid, ljuid) {
  var ljsession = LJlogin_getljsession(siteid);
  if ((ljsession) && (ljsession.split(":")[1] == ljuid)) {
    // Can't use ljl_loggedin(), since we're not in the right window, so
    // trash and remake the session cookies instead:
    LJlogin_trashsession(siteid);
    LJlogin_savesession(siteid, ljsession);
  }
}

// Pull a list of usernames from the PM, hand them back as a sorted array.
function LJlogin_userlist(siteid) {
  var userlist = new Array();
  try {
    // Grab logins to form menu.
    if ("@mozilla.org/passwordmanager;1" in Components.classes) { // FF2
      // Our old friend, the Password Manager
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
    } else if ("@mozilla.org/login-manager;1" in Components.classes) { // FF3
      // Our new friend, the Login Manager!
      var logman = Components.classes["@mozilla.org/login-manager;1"]
          .getService(Components.interfaces.nsILoginManager);
      // Finally, a function in which the findLogins method isn't
      // one of the stupider ways to go about doing what I want,
      // and turns out to actually be an improvement over the PM.
      var linfos = logman.findLogins({},
                                     LJlogin_sites[siteid].passmanurl,
                                     "", null);
      for (var i = 0; i < linfos.length; i++) {
        userlist.push(linfos[i].username);
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

// Handle post-login action, if one is defined for the site.
function LJlogin_sessionaction(siteid, ljuser) {
  // Check for basic argument presence.
  if ((!siteid) || (!ljuser)) return;

  // Get action and see what, if anything, we should do.
  var action = LJlogin_sites_session_action(siteid);
  switch (action) {
    case "4":
      // Reload the current page
      var gb = getBrowser();
      gb.reload();
      return;
    case "3":
      // Update Journal
      var url = LJlogin_sites[siteid].passmanurl + "/update.bml";
      break;
    case "2":
      // Friends page
      var url = LJlogin_sites[siteid].passmanurl + "/users/"
                                                 + ljuser + "/friends/";
      break;
    case "1":
      var url = LJlogin_sites[siteid].passmanurl + "/users/" + ljuser;
      break;
    case "0":
    default:
      return;
  }

  // Now we know what we're getting, but where to put it?
  switch (LJlogin_sites_session_dest(siteid)) {
    case "0": // Current window/tab
      var gb = getBrowser();
      gb.loadURI(url);
      break;
    case "3": // New window
      window.open(url, '_blank');
      break;
    case "2": // Backgrounded tab
      var gb = getBrowser();
      gb.addTab(url);
      break;
    case "1": // Focused tab
      var gb = getBrowser();
      gb.selectedTab = gb.addTab(url);
      break;
    default:
      return;
  }

  // Done.
  return;
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

  return [toHexString(hash.charCodeAt(i)) for (i in hash)].join("")
                                                          .slice(0,32);
}
