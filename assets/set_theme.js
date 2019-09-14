if (parent.window == window) {
  storage_get_key("theme", set_theme, "dark")
} else {
  parent.child_set_theme(document)
}
