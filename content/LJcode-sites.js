var LJlogin_sites = {
  'lj': {
                  name: 'LiveJournal',
                domain: 'livejournal.com',
            passmanurl: 'http://www.livejournal.com',
              cookiere: 'livejournal\.com$',
             cookiedom: '.livejournal.com',
             cookieurl: 'http://www.livejournal.com/',
            cookiename: 'ljmastersession',
          interfaceurl: 'http://www.livejournal.com/interface/flat',
           siteschemes: {
                           'horizon': 'Horizon',
                           'vertigo': 'Vertigo',
                          'xcolibur': "XColibur",
                          'dystopia': "Dystopia",
                          'lanzelot': "Lanzelot",
                         'bluewhite': "Blue White",
                           'opalcat': "Opal Cat",
                              'lynx': "Lynx"
                        }
        },
  'ij': {
                  name: 'InsaneJournal',
                domain: 'insanejournal.com',
            passmanurl: 'http://www.insanejournal.com',
              cookiere: 'insanejournal\.com$',
             cookiedom: '.insanejournal.com',
             cookieurl: 'http://www.insanejournal.com/',
            cookiename: 'ljmastersession',
          interfaceurl: 'http://www.insanejournal.com/interface/flat',
           siteschemes: {
                                        'tweak': 'New Tweak',
                                   'insanelook': 'InsaneLook',
                                        'anime': 'Insanime',
                                    'honeycomb': 'Honeycomb Redesigned',
                                'honeycomb_old': 'Honeycomb',
                                         'hand': 'Hand',
                                       'trails': 'Trails',
                                        'brown': 'Brown',
                                        'clean': 'Clean',
                                     'worksafe': 'Worksafe (Sidebar)',
                             'worksafedropdown': 'Worksafe (Dropdown)',
                                     'dramatic': 'Dramatic (Dropdown)',
                              'dramaticsidebar': 'Dramatic (Sidebar)',
                         'monodramaticdropdown': 'Monodramatic (Dropdown)',
                          'monodramaticsidebar': 'Monodramatic (Sidebar)',
                                    'bluewhite': "Blue White",
                                      'opalcat': "Opal Cat",
                                         'lynx': "Lynx"
                        }
        },
  'jf': {
                  name: 'JournalFen',
                domain: 'journalfen.net',
            passmanurl: 'http://www.journalfen.net',
              cookiere: 'journalfen\.net$',
             cookiedom: '.journalfen.net',
             cookieurl: 'http://www.journalfen.net/',
            cookiename: 'ljsession',
          interfaceurl: 'http://www.journalfen.net/interface/flat',
           siteschemes: {
                                'jf': 'JournalFen',
                         'bluewhite': "Blue White",
                           'opalcat': "Opal Cat",
                              'lynx': "Lynx"
                        }
        },
  'dj': {
                  name: 'DeadJournal',
                domain: 'deadjournal.com',
            passmanurl: 'http://www.deadjournal.com',
              cookiere: 'deadjournal\.com$',
             cookiedom: '.deadjournal.com',
             cookieurl: 'http://www.deadjournal.com/',
            cookiename: 'ljmastersession',
          interfaceurl: 'http://www.deadjournal.com/interface/flat',
           siteschemes: {
                             'mindvamp': 'skull',
                          'deadjournal': 'radioactive',
                            'bluewhite': "Blue White",
                              'opalcat': "Opal Cat",
                                 'lynx': "Lynx"
                        }
        },
  'scribbld': {
                  name: 'Scribbld',
                domain: 'scribbld.net',
            passmanurl: 'http://www.scribbld.net',
              cookiere: 'scribbld\.net$',
             cookiedom: '.scribbld.net',
             cookieurl: 'http://www.scribbld.net/',
            cookiename: 'ljmastersession',
          interfaceurl: 'http://www.scribbld.net/interface/flat',
           siteschemes: {
                                'scribbld': 'Scribbld',
                          'scribbldspring': 'Scribbld Spring',
                         'scribbldpinkish': 'Scribbld Pink',
                           'scribbldrocks': 'Scribbld Rocks',
                          'scribbldfleurs': 'Scribbld Fleurs',
                                 'opalcat': "Opal Cat",
                                    'lynx': "Lynx"
                        }
        },
  'dreamwidth': {
                  name: 'Dreamwidth',
                domain: 'dreamwidth.org',
            passmanurl: 'http://www.dreamwidth.org',
              cookiere: 'dreamwidth\.org$',
             cookiedom: '.dreamwidth.org',
             cookieurl: 'http://www.dreamwidth.org/',
            cookiename: 'ljmastersession',
          interfaceurl: 'http://www.dreamwidth.org/interface/flat',
           siteschemes: {
                              'tropo-red': 'Tropospherical Red',
                           'tropo-purple': 'Tropospherical Purple',
                         'celerity-local': 'Celerity',
                                   'lynx': "Lynx"
                        }
        },
  'inksome': {
                  name: 'Inksome',
                domain: 'inksome.com',
            passmanurl: 'http://www.inksome.com',
              cookiere: 'inksome\.com$',
             cookiedom: '.inksome.com',
             cookieurl: 'http://www.inksome.com/',
            cookiename: 'ljmastersession',
          interfaceurl: 'http://www.inksome.com/interface/flat',
           siteschemes: {
                          'bluewhite': 'Blue Ink',
                              'green': 'Pengreen',
                           'stewblue': 'The Stewart Blues',
                               'pink': 'Pinkuin',
                            'spikeit': 'Spikeit',
                            'opalcat': "Opal Cat",
                               'lynx': "Lynx"
                        }
        }
};

function LJlogin_notify_statusbar() {
  // Get statusbar updated. FIXME by getting rid of this when Firefox
  // hopefully fixes their shit.
  Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .notifyObservers(null, "ljlogin-update-statusbar", null);
}

function LJlogin_enabled_sites() {
  var key = "ljcode.enabledsites";

  if (arguments.length > 0) { // Set
    var sites = LJlogin_preference(key, '', arguments[0].join(','));
    // Get statusbar updated. FIXME by getting rid of this when Firefox
    // hopefully fixes their shit.
    LJlogin_notify_statusbar();
  } else {
    var sites = LJlogin_preference(key, '');
  }

  if (sites == '') {
    return [];
  } else {
    return sites.split(',');
  }
}

function LJlogin_sites_persistdefault(siteid) {
  var key = "site." + siteid + ".persistdefault";
  if (arguments.length > 1) { // Set
    var pd = LJlogin_preference(key, 0, Number(arguments[1]));
  } else {
    var pd = LJlogin_preference(key, 0);
  }

  return pd.toString();
}

function LJlogin_sites_defaultlogin_ljuser(siteid) {
  var key = "site." + siteid + ".defaultlogin.ljuser";
  if (arguments.length > 1) { // Set
    return LJlogin_preference(key, '', arguments[1]);
  } else {
    return LJlogin_preference(key, '');
  }
}

function LJlogin_sites_sitescheme(siteid) {
  var key = "site." + siteid + ".sitescheme";
  if (arguments.length > 1) { // Set
    return LJlogin_preference(key, '', arguments[1]);
  } else {
    return LJlogin_preference(key, '');
  }
}

function LJlogin_sites_stealthwidget(siteid) {
  var key = "site." + siteid + ".stealthwidget";
  if (arguments.length > 1) { // Set
    var value = LJlogin_preference(key, false, arguments[1]);
    // Get statusbar updated. FIXME by getting rid of this when Firefox
    // hopefully fixes their shit.
    LJlogin_notify_statusbar();
    return value;
  } else {
    return LJlogin_preference(key, false);
  }
}

function LJlogin_sites_session_action(siteid) {
  var key = "site." + siteid + ".sessionaction.src";
  if (arguments.length > 1) { // Set
    var pd = LJlogin_preference(key, 0, Number(arguments[1]));
  } else {
    var pd = LJlogin_preference(key, 0);
  }

  return pd.toString();
}

function LJlogin_sites_session_dest(siteid) {
  var key = "site." + siteid + ".sessionaction.dest";
  if (arguments.length > 1) { // Set
    var pd = LJlogin_preference(key, 0, Number(arguments[1]));
  } else {
    var pd = LJlogin_preference(key, 0);
  }

  return pd.toString();
}

