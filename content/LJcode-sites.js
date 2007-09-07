var LJlogin_sites = {
  'lj': {
                  name: 'LiveJournal',
                domain: 'livejournal.com',
            passmanurl: 'http://www.livejournal.com',
              cookiere: 'livejournal\.com$',
             cookiedom: '.livejournal.com',
             cookieurl: 'http://www.livejournal.com/',
            cookiename: 'ljmastersession',
          interfaceurl: 'http://www.livejournal.com/interface/flat'
        },
  'ij': {
                  name: 'InsaneJournal',
                domain: 'insanejournal.com',
            passmanurl: 'http://www.insanejournal.com',
              cookiere: 'insanejournal\.com$',
             cookiedom: '.insanejournal.com',
             cookieurl: 'http://www.insanejournal.com/',
            cookiename: 'ljmastersession',
          interfaceurl: 'http://www.insanejournal.com/interface/flat'
        },
  'gj': {
                  name: 'GreatestJournal',
                domain: 'greatestjournal.com',
            passmanurl: 'http://www.greatestjournal.com',
              cookiere: 'greatestjournal\.com$',
             cookiedom: '.greatestjournal.com',
             cookieurl: 'http://www.greatestjournal.com/',
            cookiename: 'ljsession',
          interfaceurl: 'http://www.greatestjournal.com/interface/flat'
        },
  'jf': {
                  name: 'JournalFen',
                domain: 'journalfen.net',
            passmanurl: 'http://www.journalfen.net',
              cookiere: 'journalfen\.net$',
             cookiedom: '.journalfen.net',
             cookieurl: 'http://www.journalfen.net/',
            cookiename: 'ljsession',
          interfaceurl: 'http://www.journalfen.net/interface/flat'
        },
  'dj': {
                  name: 'DeadJournal',
                domain: 'deadjournal.com',
            passmanurl: 'http://www.deadjournal.com',
              cookiere: 'deadjournal\.com$',
             cookiedom: '.deadjournal.com',
             cookieurl: 'http://www.deadjournal.com/',
            cookiename: 'ljmastersession',
          interfaceurl: 'http://www.deadjournal.com/interface/flat'
        }
};

function LJlogin_enabled_sites() {
  var key = "ljcode.enabledsites";

  if (arguments.length > 0) { // Set
    var sites = LJlogin_preference(key, '', arguments[0].join(','));
  } else {
    var sites = LJlogin_preference(key, '');
  }

  if (sites == '') {
    return [];
  } else {
    return sites.split(',');
  }
}

function LJlogin_sites_defaultlogin_enabled(siteid) {
  var key = "site." + siteid + ".defaultlogin.enable";
  if (arguments.length > 1) { // Set
    return LJlogin_preference(key, false, arguments[1]);
  } else {
    return LJlogin_preference(key, false);
  }
}

function LJlogin_sites_defaultlogin_ljuser(siteid) {
  var key = "site." + siteid + ".defaultlogin.ljuser";
  if (arguments.length > 1) { // Set
    return LJlogin_preference(key, '', arguments[1]);
  } else {
    return LJlogin_preference(key, '');
  }
}
