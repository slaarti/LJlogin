// Initialize the uidmap box
function ljl_prefs_uidmap_init() {
  document.getElementById("ljl-prefs-uidmap-select").setAttribute("disabled", "true");
  document.getElementById("ljl-prefs-uidmap-rename").setAttribute("disabled", "true");
  document.getElementById("ljl-prefs-uidmap-remove").setAttribute("disabled", "true");
}

// Initialize the Preferences window
function ljl_prefs_init() {
  ljl_prefs_uidmap_init();
}
