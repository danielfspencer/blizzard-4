if (parent.window == window) {
  tools.storage.get_key('theme', set_theme, 'dark')
} else {
  parent.inject_theme(document)
}
