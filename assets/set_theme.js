if (parent.window == window) {
  set_theme(tools.storage.get_key('theme', 'dark'))
} else {
  parent.inject_theme(document)
}
