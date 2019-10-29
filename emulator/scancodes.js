const keycode_to_scancode = {
  KeyA: [[0x1c],[0xF0,0x1c]],
  KeyB: [[0x32],[0xF0,0x32]],
  KeyC: [[0x21],[0xF0,0x21]],
  KeyD: [[0x23],[0xF0,0x23]],
  KeyE: [[0x24],[0xF0,0x24]],
  KeyF: [[0x2b],[0xF0,0x2b]],
  KeyG: [[0x34],[0xF0,0x34]],
  KeyH: [[0x33],[0xF0,0x44]],
  KeyI: [[0x43],[0xF0,0x43]],
  KeyJ: [[0x3b],[0xF0,0x3b]],
  KeyK: [[0x42],[0xF0,0x42]],
  KeyL: [[0x4b],[0xF0,0x4b]],
  KeyM: [[0x3a],[0xF0,0x3a]],
  KeyN: [[0x31],[0xF0,0x31]],
  KeyO: [[0x44],[0xF0,0x33]],
  KeyP: [[0x4d],[0xF0,0x4d]],
  KeyQ: [[0x15],[0xF0,0x15]],
  KeyR: [[0x2d],[0xF0,0x2d]],
  KeyS: [[0x1b],[0xF0,0x1b]],
  KeyT: [[0x2c],[0xF0,0x2c]],
  KeyU: [[0x3c],[0xF0,0x3c]],
  KeyV: [[0x2a],[0xF0,0x2a]],
  KeyW: [[0x1d],[0xF0,0x1d]],
  KeyX: [[0x22],[0xF0,0x22]],
  KeyY: [[0x35],[0xF0,0x35]],
  KeyZ: [[0x1a],[0xF0,0x1a]],
  Digit0: [[0x45],[0xF0,0x45]],
  Digit1: [[0x16],[0xF0,0x16]],
  Digit2: [[0x1e],[0xF0,0x1e]],
  Digit3: [[0x26],[0xF0,0x26]],
  Digit4: [[0x25],[0xF0,0x25]],
  Digit5: [[0x2e],[0xF0,0x2e]],
  Digit6: [[0x36],[0xF0,0x36]],
  Digit7: [[0x3d],[0xF0,0x2d]],
  Digit8: [[0x3e],[0xF0,0x3e]],
  Digit9: [[0x46],[0xF0,0x46]],
  Backquote: [[0x0e],[0xF0,0x0e]],
  Minus: [[0x4e],[0xF0,0x4e]],
  Equal: [[0x55],[0xF0,0x55]],
  Backspace: [[0x66],[0xF0,0x66]],
  Enter: [[0x5a],[0xF0,0x5a]],
  Tab: [[0x0d],[0xF0,0x0d]],
  CapsLock: [[0x58],[0xF0,0x58]],
  ShiftLeft: [[0x12],[0xF0,0x12]],
  ControlLeft: [[0x14],[0xF0,0x14]],
  AltLeft: [[0x11],[0xF0,0x11]],
  Space: [[0x29],[0xF0,0x29]],
  AltRight: [[0xe0,0x11],[0xe0,0xF0,0x11]],
  ControlRight: [[0xe0,0x14],[0xe0,0xF0,0x14]],
  ShiftRight: [[0x59],[0xF0,0x59]],
  IntlBackslash: [[0x5d],[0xF0,0x5d]],
  Comma: [[0x41],[0xF0,0x41]],
  Period: [[0x49],[0xF0,0x49]],
  Slash: [[0x4a],[0xF0,0x4a]],
  Semicolon: [[0x4c],[0xF0,0x4c]],
  Quote: [[0x52],[0xF0,0x52]],
  BracketLeft: [[0x54],[0xF0,0x54]],
  BracketRight: [[0x5b],[0xF0,0x5b]],
  ArrowUp: [[0xe0,0x75],[0xe0,0xf0,0x75]],
  ArrowLeft: [[0xe0,0x6b],[0xe0,0xf0,0x6b]],
  ArrowDown: [[0xe0,0x72],[0xe0,0xf0,0x72]],
  ArrowRight: [[0xe0,0x74],[0xe0,0xf0,0x74]],
  F1: [[0x05],[0xF0,0x05]],
  F2: [[0x06],[0xF0,0x06]],
  F3: [[0x04],[0xF0,0x04]],
  F4: [[0x0c],[0xF0,0x0c]],
  F5: [[0x03],[0xF0,0x03]],
  F6: [[0x0b],[0xF0,0x0b]],
  F7: [[0x83],[0xF0,0x83]],
  F8: [[0x0A],[0xF0,0x0A]],
  F9: [[0x01],[0xF0,0x01]],
  F10: [[0x09],[0xF0,0x09]],
  F11: [[0x78],[0xF0,0x78]],
  F12: [[0x07],[0xF0,0x07]],
  Insert: [[0xE0,0x70],[0xE0,0xF0,0x70]],
  Home: [[0xE0,0x6C],[0xE0,0xF0,0x6C]],
  PageUp: [[0xE0,0x7D],[0xE0,0xF0,0x7D]],
  Delete: [[0xE0,0x71],[0xE0,0xF0,0x71]],
  End: [[0xE0,0x69],[0xE0,0xF0,0x69]],
  PageDown: [[0xE0,0x7A],[0xE0,0xF0,0x7A]],
  Escape: [[0x76],[0xF0,0x76]],
  PrintScreen: [[0xE0,0x12,0xE0,0x7C],[0xE0,0xF0,0x7C,0xE0,0xF0,0x12]],
  ScrollLock: [[0x7E],[0xF0,0x7E]],
  Pause: [[0xE1,0x14,0x77,0xE1,0xF0,0x14,0xF0,0x77],[]],
  ContextMenu: [[0xE0,0x2F],[0xE0,0xF0,0x2F]],
  Backslash: [[0x53],[0xF0,0x53]],                     // 102nd key, hash and tilde on UK layout
  MetaLeft: [[0xE0,0x1F],[0xE0,0xF0,0x1F]],            // chrome calls this Meta, firefox calls it OS
  MetaRight: [[0xE0,0x27],[0xE0,0xF0,0x27]],
  OSLeft: [[0xE0,0x1F],[0xE0,0xF0,0x1F]],
  OSRight: [[0xE0,0x27],[0xE0,0xF0,0x27]],
  Numpad0: [[0x70],[0xF0,0x70]],
  Numpad1: [[0x69],[0xF0,0x69]],
  Numpad2: [[0x72],[0xF0,0x72]],
  Numpad3: [[0x7a],[0xF0,0x7a]],
  Numpad4: [[0x6b],[0xF0,0x6b]],
  Numpad5: [[0x73],[0xF0,0x73]],
  Numpad6: [[0x74],[0xF0,0x74]],
  Numpad7: [[0x6c],[0xF0,0x6c]],
  Numpad8: [[0x75],[0xF0,0x75]],
  Numpad9: [[0x7d],[0xF0,0x7d]],
  NumpadDecimal: [[0x71],[0xF0,0x71]],
  NumpadAdd: [[0x79],[0xF0,0x79]],
  NumpadSubtract: [[0x7b],[0xF0,0x7b]],
  NumpadMultiply: [[0x7c],[0xF0,0x7c]],
  NumpadDivide: [[0xE0,0x4A],[0xE0,0xF0,0x4A]],
  NumpadEnter: [[0xE0,0x5A],[0xE0,0xF0,0x5A]],
  NumLock: [[0x77],[0xF0,0x77]]
}
