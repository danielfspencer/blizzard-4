if (parent.window == window) {
  tools.storage.get_key('theme', set_theme, 'dark')
} else {
  parent.child_set_theme(document)
}
