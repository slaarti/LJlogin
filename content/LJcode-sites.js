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
                          'dystopia': "Dystopia"
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
                                  'clean': 'Clean'
                        }
        },
  'gj': {
                  name: 'GreatestJournal',
                domain: 'greatestjournal.com',
            passmanurl: 'http://www.greatestjournal.com',
              cookiere: 'greatestjournal\.com$',
             cookiedom: '.greatestjournal.com',
             cookieurl: 'http://www.greatestjournal.com/',
            cookiename: 'ljsession',
          interfaceurl: 'http://www.greatestjournal.com/interface/flat',
           siteschemes: {
                            'dystopia': 'Red and Gold',
                              'purple': 'purple',
                                'pink': 'Pink',
                                'lust': 'Lust',
                               'blood': 'Blood',
                                'gray': 'Gray',
                                'lime': 'Lime',
                               'sugar': 'Sugar',
                                 'sky': 'Sky',
                              'forest': 'Forest',
                                'sage': 'Sage',
                               'night': 'Night',
                              'casual': 'Casual',
                               'grape': 'Grape',
                            'lavender': 'Lavender',
                          'watermelon': 'Watermelon',
                           'tangerine': 'Tangerine',
                            'defaultb': 'Top_Navigation'
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
                          'jf': 'JournalFen'
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
                          'deadjournal': 'radioactive'
                        }
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
    return LJlogin_preference(key, false, arguments[1]);
  } else {
    return LJlogin_preference(key, false);
  }
}

