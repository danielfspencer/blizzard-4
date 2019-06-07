if (parent.window == window) {
  storage_get_key("theme", (name) => {set_theme(name)}, null)
} else {
  parent.child_set_theme(document)
}
