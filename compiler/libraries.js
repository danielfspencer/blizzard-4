var libs = {
    "sys.int_multiply":["def sys.int_multiply","  arg int a", "  arg int b", "  var int c","  while b > 0", "    if b sys.odd", "      c += a", "    a = a <<", "    b = b >>", "  return c"],
    "sys.int_divide":["def sys.int_divide", "  arg int a", "  arg int b", "  var int current 1", "  if b == 0", "    return b", "  if a == 0", "    return a", "  while b < a", "    current = current <<", "    b = b <<", "  var int c", "  while current > 0", "    if a >= b", "      a -= b", "      c += current", "    current = current >>", "    b = b >>", "  return c"],
    "sys.int_exponent":["def sys.int_exponent","  arg int a","  arg int b","  var int c 1","  while b > 0","    c = c * a","    b -= 1","  return c"],
    "sys.int_modulo":["def sys.int_modulo", "  arg int a", "  arg int b", "  var int c", "  c = a / b", "  c = c * b", "  c = a - c", "  return c"],

    "sys.sint_multiply":["def sys.sint_multiply", "  arg sint a", "  arg sint b", "  var bool sign", "  if a < 0", "    sign = true", "    a = 0 - a", "  if b < 0", "    sign = !sign", "    b = 0 - b", "  var sint c", "  while b != 0", "    if b sys.odd", "      c += a", "    a = a <<", "    b = b >>", "  if sign", "    c = 0 - c", "  return c"],
    "sys.sint_divide":  ["def sys.sint_divide", "  arg sint a", "  arg sint b", "  var sint current 1", "  if b == 0", "    return b", "  if a == 0", "    return a", "  var bool sign", "  if a < 0", "    sign = true", "    a = 0 - a", "  if b < 0", "    sign = !sign", "    b = 0 - b", "  while b < a", "    current = current <<", "    b = b <<", "  var sint c", "  while current > 0", "    if a >= b", "      a -= b", "      c += current", "    current = current >>", "    b = b >>", "  if sign", "    c = 0 -c", "  return c"],
    "sys.sint_exponent":["def sys.sint_exponent", "  arg sint a", "  arg sint b", "  var sint c 1", "  while b > 0", "    c = c * a", "    b -= 1", "  return c"],
    "sys.sint_modulo": ["def sys.sint_modulo", "  arg sint a", "  arg sint b", "  var sint c", "  c = a / b", "  c = c * b", "  c = a - c", "  return c"],
    "sys.sint_rshift": ["def sys.sint_rshift", "  arg sint a", "  var bool negative", "  var sint answer", "  {write [ram.0] alu.1}", "  {write 0b1000000000000000 alu.2}", "  {write [alu.ov] ram.1}", "  {write [alu.>>] ram.2}", "  if negative", "    {write [ram.2] alu.1}", "    {write 0b1000000000000000 alu.2}", "    {write [alu.|] ram.2}", "  return answer"],

    "sys.long_add":["def sys.long_add", "  arg long a", "  arg long b", "", "  var int a_high a:0", "  var int a_low a:1", "  var int b_high b:0", "  var int b_low b:1", "", "  var long c", "  var int c_high ", "  var int c_low", "  var int carry", "", "  c_low = a_low + b_low", "  if sys.ov", "    carry = 1", "  c_high = a_high + b_high", "  c_high += carry", "  c = c_high..c_low", "  return c"],
    "sys.long_subtract":["def sys.long_subtract", "  arg long a", "  arg long b", "  var int b_high b:0", "  var int b_low b:1", "  b_high = !b_high", "  b_low = !b_low", "  b = b_high..b_low", "  b++","  var long c a + b", "  return c"],
    "sys.long_multiply":["def sys.long_multiply", "  arg long a", "  arg long b", "  var long c", "  var int b_low b:1", "  if a == 0", "    return 0", "  while b > 0", "    b_low = b:1", "    if b_low sys.odd", "      c = c + a", "    a = a <<", "    b = b >>", "  return c "],
    "sys.long_divide":["def sys.long_divide", "  arg long a", "  arg long b", "  var long current 1", "  while b < a", "    current = current <<", "    b = b <<", "  var long c", "  while current > 0", "    if a >= b", "      a -= b", "      c += current", "    current = current >>", "    b = b >>", "  return c"],
    "sys.long_exponent":["def sys.long_exponent", "  arg long a", "  arg long b", "  var long c 1", "  while b > 0", "    c = c * a", "    b -= 1", "  return c"],
    "sys.long_modulo": ["def sys.long_modulo", "  arg long a", "  arg long b", "  var long c", "  c = a / b", "  c = c * b", "  c = a - c", "  return c"],
    "sys.long_lshift":["def sys.long_lshift", "  arg long a", "  var int a_high a:0", "  var int a_low a:1", "  var long c", "  var int carry a_low & 0b1000000000000000", "  carry += 0xffff", "  carry = sys.ov", "  a_high = a_high <<", "  a_low = a_low <<", "  a_high += carry", "  c = a_high..a_low", "  return c"],
    "sys.long_rshift":["def sys.long_rshift", "  arg long a", "  var int a_high a:0", "  var int a_low a:1", "  var long c", "  var int carry a_high & 1", "  a_high = a_high >>", "  a_low = a_low >>", "  if carry", "    a_low = a_low | 0b1000000000000000", "  c = a_high..a_low", "  return c"],
    "sys.long_not_equal":["def sys.long_not_equal", "  arg long a", "  arg long b", "  var int a_high a:1", "  var int a_low a:0", "  var int b_high b:1", "  var int b_low b:0", "  var bool result true", "  if a_high == b_high", "    if a_low == b_low", "      result = false", "      return result", "  else", "    return result"],
    "sys.long_equal":["def sys.long_equal", "  arg long a", "  arg long b", "  var int a_high a:1", "  var int a_low a:0", "  var int b_high b:1", "  var int b_low b:0", "  var bool result", "  if a_high == b_high", "    if a_low == b_low", "      result = true", "      return result", "  else", "    return result"],
    "sys.long_greater":["def sys.long_greater", "  arg long a", "  arg long b", "  var int a_high a:0", "  var int a_low a:1 ", "  var int b_high b:0", "  var int b_low b:1", "  var bool result true", "", "  if a_high > b_high", "    return result", "  else if a_high == b_high", "    if a_low > b_low", "      return result", "    ", "  result = false", "  return result"],
    "sys.long_less":["def sys.long_less", "  arg long a", "  arg long b", "  var int a_high a:0", "  var int a_low a:1 ", "  var int b_high b:0", "  var int b_low b:1", "  var bool result true", "", "  if a_high < b_high", "    return result", "  else if a_high == b_high", "    if a_low < b_low", "      return result", "    ", "  result = false", "  return result"],

    "sys.slong_add":["def sys.slong_add", "  arg slong a", "  arg slong b", "", "  var int a_high a:0", "  var int a_low a:1", "  var int b_high b:0", "  var int b_low b:1", "", "  var long c", "  var int c_high ", "  var int c_low", "  var int carry", "", "  c_low = a_low + b_low", "  if sys.ov", "    carry = 1", "  c_high = a_high + b_high", "  c_high += carry", "  c = c_high..c_low", "  return c"],
    "sys.slong_subtract":["def sys.slong_subtract", "  arg slong a", "  arg slong b", "  var int b_high b:0", "  var int b_low b:1", "  b_high = !b_high", "  b_low = !b_low", "  b = b_high..b_low", "  b++","  var slong c a + b", "  return c"],
    "sys.slong_lshift":["def sys.slong_lshift", "  arg slong a", "  var int a_high a:0", "  var int a_low a:1", "  var long c", "  var int carry a_low & 0b1000000000000000", "  carry += 0xffff", "  carry = sys.ov", "  a_high = a_high <<", "  a_low = a_low <<", "  a_high += carry", "  c = a_high..a_low", "  return c"],
    "sys.slong_equal":["def sys.slong_equal", "  arg slong a", "  arg slong b", "  var int a_high a:1", "  var int a_low a:0", "  var int b_high b:1", "  var int b_low b:0", "  var bool result", "  if a_high == b_high", "    if a_low == b_low", "      result = true", "      return result", "  else", "    return result"],
    "sys.slong_not_equal":["def sys.slong_not_equal", "  arg slong a", "  arg slong b", "  var int a_high a:1", "  var int a_low a:0", "  var int b_high b:1", "  var int b_low b:0", "  var bool result true", "  if a_high == b_high", "    if a_low == b_low", "      result = false", "      return result", "  else", "    return result"],

    "sys.array_pointer":["def sys.array_pointer", "  arg int index", "  arg int item_size", "  arg int base_addr", "  var int addr index*item_size", "  addr += base_addr", "  return addr"],
    "sys.rom_to_ram_copy":["def sys.rom_to_ram_copy", "  arg int origin_address ", "  arg int target_address", "  arg int length", "", "  target_address -= 4096", "  for var int i; i < length; i++", "    {copy [ram.0] [ram.1] }", "    origin_address++", "    target_address++"],
    "sys.ram_to_ram_copy":["def sys.ram_to_ram_copy", "  arg int origin_address ", "  arg int target_address", "  arg int length", "", "  origin_address -= 4096", "  target_address -= 4096", "", "  origin_address += length", "  target_address += length ", "", "  for var int i; i < length; i++", "    origin_address--", "    target_address--", "    {copy [ram.0] [ram.1] }"],

    "sys.vram.or_word":["def sys.vram.or_word", "  arg int word", "  arg int addr", "  addr += 6144", "  {copy [ram.1] alu.1}", "  {copy ram.0 alu.2}", "  {write [alu.|] [ram.1]}"],
    "sys.vram.nand_word":["def sys.vram.nand_word", "  arg int word", "  arg int addr", "  addr += 6144", "  {copy [ram.1] alu.2}", "  word = !word", "  {copy ram.0 alu.1}", "  {write [alu.&] [ram.1]}"],
    "sys.vram.set_pixel": ["def sys.vram.set_pixel", "  include sys.vram.shifted_pixels", "  arg int x", "  arg int y", "  arg bool data true", "  var int large", "  var int small", "  var int addr y", "  addr = addr <<", "  addr = addr <<", "  addr = addr <<", "  var int table_addr", "  {write sys.vram.shifted_pixels ram.6}", "  if x != 0 ", "    large = x ", "    large = large >>", "    large = large >>", "    large = large >>", "    large = large >>", "", "    small = large ", "    small = small <<", "    small = small <<", "    small = small <<", "    small = small <<", "    small = x - small", "    addr += large", "  table_addr += small", "  addr += 6144", "  if data", "    {copy [ram.6] alu.1}", "    {copy [ram.5] alu.2}", "    {write [alu.|] [ram.5]}", "  else", "    {copy [ram.6] alu.1}", "    {copy alu.! ram.6}", "    {copy ram.6 alu.1}", "    {copy [ram.5] alu.2}", "    {write [alu.&] [ram.5]}"],
	  "sys.vram.render_char":["def sys.vram.render_char","  include sys.vram.glyphs","  arg int char_code","  arg int x","  arg int y","  ","  if char_code < 32","    char_code = 127","  else if char_code > 129","    char_code = 127","","  char_code -= 32","  ","  var int char_pointer ","  var int char_offset char_code","  char_offset = char_offset <<","  char_offset = char_offset <<","  char_offset += char_code","  char_offset += char_code","  {write sys.vram.glyphs ram.3}","  char_pointer += char_offset","","  var int vram_pointer 6144","  var int vram_offset_x x >>","  var int vram_offset_y y","  vram_offset_y = vram_offset_y <<","  vram_offset_y = vram_offset_y <<","  vram_offset_y = vram_offset_y <<","  vram_offset_y = vram_offset_y <<","  vram_offset_y = vram_offset_y <<","  vram_offset_y = vram_offset_y <<","  vram_pointer += vram_offset_x","  vram_pointer += vram_offset_y","  vram_pointer += 8","","  var int mask 0xff00","  var int inv_mask 0x00ff","","  if x sys.odd","    mask = 0x00ff","    inv_mask = 0xff00","","  for var int i; i < 6; i++","    {copy [ram.3] alu.1}","    {copy ram.8 alu.2}","    {copy alu.& ram.12}","    {copy [ram.5] alu.1}","    {copy ram.9 alu.2}","    {copy alu.& ram.13}","    {copy ram.12 alu.1}","    {copy ram.13 alu.2}","    {copy alu.| [ram.5]}","    char_pointer++","    vram_pointer += 8"],
    "sys.vram.draw_hex_digit":["def sys.vram.draw_hex_digit", "  arg int num", "  arg int x", "  arg int y", "  if num < 10", "    sys.vram.render_char(48+num,x,y)", "  else ", "    sys.vram.render_char(55+num,x,y)"],
    "sys.vram.fast_fill":  ["def sys.vram.fast_fill", "  arg int data 0xffff", "  {write vram.0 alu.1}", "  {func_sys.vram.fast_fill_loop:}", "  {write 0 alu.2}", "  {write [ram.0] [alu.+]}", "  {write 1 alu.2}", "  {write [ram.0] [alu.+]}", "  {write 2 alu.2}", "  {write [ram.0] [alu.+]}", "  {write 3 alu.2}", "  {write [ram.0] [alu.+]}", "  {write 4 alu.2}", "  {write [ram.0] [alu.+]}", "  {write 5 alu.2}", "  {write [ram.0] [alu.+]}", "  {write 6 alu.2}", "  {write [ram.0] [alu.+]}", "  {write 7 alu.2}", "  {write [ram.0] [alu.+]}", "  {write 8 alu.2}", "  {write [alu.+] ram.1}", "  {write [ram.1] alu.1}", "  {write vram.1023 alu.2}", "  {write [alu.>] ctl.cnd}", "  {goto? func_sys.vram.fast_fill_loop}"],
    "sys.vram.clear":  ["def sys.vram.clear", "  sys.vram.fast_fill(0)"],

    "sys.vram.draw_square":["def sys.vram.draw_square", "  arg int x ", "  arg int y", "  arg int length", "  arg bool data true", "  var int x_offset x+length", "  var int y_offset y+length", "  var int counter", "  var int x_current", "  var int y_current", "  length++", "  while counter < length", "    x_current = x + counter", "    y_current = y + counter", "    sys.vram.set_pixel(x_current,y,data)", "    sys.vram.set_pixel(x_current,y_offset,data)", "    sys.vram.set_pixel(x,y_current,data)", "    sys.vram.set_pixel(x_offset,y_current,data)", "    counter++"],
    "sys.vram.draw_circle":["def sys.vram.draw_circle", "  arg int x1", "  arg int y1", "  arg int radius0", "  arg bool data true", "", "  var sint x0 x1:0", "  var sint y0 y1:0", "  var sint radius radius0:0", "  var sint minustwo -2", "  var sint f 1 - radius", "  var sint dx 1", "  var sint dy minustwo * radius", "  var sint x 0", "  var sint y radius", "  ", "  sys.vram.set_pixel(x0:0, y0 + radius,data)", "  sys.vram.set_pixel(x0:0, y0 - radius,data)", "  sys.vram.set_pixel(x0 + radius, y0:0,data)", "  sys.vram.set_pixel(x0 - radius, y0:0,data)", "  ", "  while x < y", "    if f >= 0", "      y--", "      dy += 2", "      f += dy", "    x++", "    dx += 2", "    f += dx", "  ", "    sys.vram.set_pixel(x0 + x, y0 + y,data)", "    sys.vram.set_pixel(x0 + y, y0 + x,data)", "    sys.vram.set_pixel(x0 - y, y0 + x,data)", "    sys.vram.set_pixel(x0 - x, y0 + y,data)", "    sys.vram.set_pixel(x0 - x, y0 - y,data)", "    sys.vram.set_pixel(x0 - y, y0 - x,data)", "    sys.vram.set_pixel(x0 + y, y0 - x,data)", "    sys.vram.set_pixel(x0 + x, y0 - y,data)"],
    "sys.vram.draw_line":["def sys.vram.draw_line", "  arg int x0_i", "  arg int y0_i", "  arg int x1_i", "  arg int y1_i", "  arg bool data true", "", "  var sint x0 x0_i:0", "  var sint y0 y0_i:0", "  var sint x1 x1_i:0", "  var sint y1 y1_i:0", "  ", "  var sint dx", "  var sint dy", "  var sint sx", "  var sint sy", "  ", "  var sint err", "  var sint e2", "  var sint minus_dx", "  ", "  if x0 > x1", "    dx = x0 - x1", "    sx = -1", "  else", "    dx = x1 - x0", "    sx = 1", "	", "  if y0 > y1", "    dy = y0 - y1", "    sy = -1", "  else", "    dy = y1 - y0", "    sy = 1", " ", "  if dx > dy", "    err = dx", "  else", "    err = 0-dy", "	", "  err = err >>", "  e2 = 0", " ", "  while true", "    sys.vram.set_pixel(x0:0,y0:0,data)", "    minus_dx = 0 - dx", "    if x0 == x1 ", "      if y0 == y1", "        return 0", "", "    e2 = err", "    if e2 > minus_dx", "      err -= dy", "      x0 += sx ", "    ", "    if e2 < dy", "      err += dx", "      y0 += sy"],
    "sys.print_string":["def sys.print_string","  arg str string","  arg int x ","  arg int y","  var int pointer string:0","  var int char *pointer","  ","  while char > 0","    sys.vram.render_char(char,x,y)","    x++","    if x > 15","      y++","      x = 0","    pointer++","    char = *pointer"],
    "sys.print_int":["def sys.print_int", "  arg int num", "  arg int x", "  arg int y", "  arg bool print_all_places false", "  ", "  var int x_offset x", "  var bool is_rendering", "", "  var int _4_power 48", "  var int _3_power 48", "  var int _2_power 48", "  var int _1_power 48", "  ", "  while num > 9999", "    num -= 10000", "    _4_power += 1", "    is_rendering = true", "	", "  if is_rendering | print_all_places", "    sys.vram.render_char(_4_power,x_offset,y)", "    x_offset++", "", "  while num > 999", "    num -= 1000", "    _3_power += 1", "    is_rendering = true", "	", "  if is_rendering | print_all_places", "    sys.vram.render_char(_3_power,x_offset,y)", "    x_offset++", "", "  while num > 99", "    num -= 100", "    _2_power += 1", "    is_rendering = true", "	", "  if is_rendering | print_all_places", "    sys.vram.render_char(_2_power,x_offset,y)", "    x_offset++", "", "  while num > 9", "    num -= 10", "    _1_power += 1", "    is_rendering = true", "	", "  if is_rendering | print_all_places", "    sys.vram.render_char(_1_power,x_offset,y)", "    x_offset++", "", "  sys.vram.render_char(num+48,x_offset,y)"],
    "sys.print_int_as_hex": ["def sys.print_int_as_hex","  arg int num","  arg int x","  arg int y","  arg bool print_all_places false","  ","  var int x_offset x","  var bool is_rendering","","  var int _3_power ","  var int _2_power ","  var int _1_power ","  var int _0_power","","  _0_power = num & 0x000f","  num = num >>","  num = num >>","  num = num >>","  num = num >>","  _1_power = num & 0x000f","  num = num >>","  num = num >>","  num = num >>","  num = num >>","  _2_power = num & 0x000f","  num = num >>","  num = num >>","  num = num >>","  num = num >>","  _3_power = num & 0x000f","  num = num >>","  num = num >>","  num = num >>","  num = num >>","","  if _3_power > 0","    is_rendering = true","","  if is_rendering | print_all_places","    sys.vram.draw_hex_digit(_3_power,x_offset,y)","    x_offset++","","  if _2_power > 0","    is_rendering = true","","  if is_rendering | print_all_places","    sys.vram.draw_hex_digit(_2_power,x_offset,y)","    x_offset++","","  if _1_power > 0","    is_rendering = true","","  if is_rendering | print_all_places","    sys.vram.draw_hex_digit(_1_power,x_offset,y)","    x_offset++","","  sys.vram.draw_hex_digit(_0_power,x_offset,y)"],

    "sys.global.addr_calc":["def sys.global.addr_calc", "  include sys.global.frame_offsets", "  {write sys.global.frame_offsets alu.1}", "  {write [ctl.framenum] alu.2}", "  {copy [alu.+] ram.1022}", "  {copy ram.1022 alu.1}", "  {copy ram.1021 alu.2}", "  {write [alu.+] ram.1022}", "  {copy ram.1022 alu.1}"],
    "sys.global.frame_offsets":["///", "sys.global.frame_offsets:", "0", "0", "1024", "2048", "3072", "4096", "5120", "6144", "7168", "8192", "9216", "10240", "11264", "12288", "13312", "14336", "///"],
    "sys.kbd.scancode_to_charcode": ["def sys.kbd.scancode_to_charcode", "  include sys.kbd.scancode_charcode_table", "  arg int scancode", "  arg bool shifted false", "", "  if scancode == 0", "    return 0", "", "  var int table_addr", "  var int word", "  var int charcode", "", "  {write sys.kbd.scancode_charcode_table ram.2}", "", "  table_addr += scancode", "  word = *table_addr", "", "  if shifted", "    word = word >>", "    word = word >>", "    word = word >>", "    word = word >>", "    word = word >>", "    word = word >>", "    word = word >>", "    word = word >>", "    charcode = word", "  else", "    charcode = word & 0x00ff", "", "  return charcode"],

    "sys.vram.glyphs":["///","sys.vram.glyphs:","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0000000000000000","0b0100000001000000","0b0101000001010000","0b0101000001010000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0010100000101000","0b0111110001111100","0b0010100000101000","0b0111110001111100","0b0010100000101000","0b0000000000000000","0b0001000000010000","0b0011110000111100","0b0101000001010000","0b0011100000111000","0b0001010000010100","0b0111100001111000","0b0110001001100010","0b0110010001100100","0b0000100000001000","0b0001000000010000","0b0010011000100110","0b0100011001000110","0b0011000000110000","0b0100100001001000","0b0011000000110000","0b0101100001011000","0b0100100001001000","0b0011010000110100","0b0100000001000000","0b0100000001000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0001000000010000","0b0010000000100000","0b0100000001000000","0b0100000001000000","0b0010000000100000","0b0001000000010000","0b0001000000010000","0b0000100000001000","0b0000010000000100","0b0000010000000100","0b0000100000001000","0b0001000000010000","0b0101010001010100","0b0011100000111000","0b0110110001101100","0b0011100000111000","0b0101010001010100","0b0000000000000000","0b0001000000010000","0b0001000000010000","0b0111110001111100","0b0001000000010000","0b0001000000010000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0110000001100000","0b0010000000100000","0b0100000001000000","0b0000000000000000","0b0000000000000000","0b0111110001111100","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0100000001000000","0b0001000000010000","0b0001000000010000","0b0010000000100000","0b0010000000100000","0b0100000001000000","0b0100000001000000","0b0011100000111000","0b0100010001000100","0b0100110001001100","0b0101010001010100","0b0110010001100100","0b0011100000111000","0b0000100000001000","0b0001100000011000","0b0000100000001000","0b0000100000001000","0b0000100000001000","0b0001110000011100","0b0011100000111000","0b0000010000000100","0b0000010000000100","0b0001100000011000","0b0010000000100000","0b0011110000111100","0b0011100000111000","0b0000010000000100","0b0001100000011000","0b0000010000000100","0b0000010000000100","0b0011100000111000","0b0001100000011000","0b0010100000101000","0b0100100001001000","0b0011110000111100","0b0000100000001000","0b0000100000001000","0b0011110000111100","0b0010000000100000","0b0001100000011000","0b0000010000000100","0b0010010000100100","0b0001100000011000","0b0001100000011000","0b0010000000100000","0b0011100000111000","0b0010010000100100","0b0010010000100100","0b0001100000011000","0b0111100001111000","0b0000100000001000","0b0001110000011100","0b0000100000001000","0b0000100000001000","0b0000100000001000","0b0001100000011000","0b0010010000100100","0b0001100000011000","0b0010010000100100","0b0010010000100100","0b0001100000011000","0b0001100000011000","0b0010010000100100","0b0010010000100100","0b0001110000011100","0b0000010000000100","0b0001100000011000","0b0001000000010000","0b0001000000010000","0b0000000000000000","0b0001000000010000","0b0001000000010000","0b0000000000000000","0b0001000000010000","0b0001000000010000","0b0000000000000000","0b0001000000010000","0b0001000000010000","0b0010000000100000","0b0000000000000000","0b0001000000010000","0b0010000000100000","0b0100000001000000","0b0010000000100000","0b0001000000010000","0b0000000000000000","0b0111110001111100","0b0000000000000000","0b0111110001111100","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0100000001000000","0b0010000000100000","0b0001000000010000","0b0010000000100000","0b0100000001000000","0b0011100000111000","0b0100010001000100","0b0001100000011000","0b0001000000010000","0b0000000000000000","0b0001000000010000","0b0011110000111100","0b0100001001000010","0b0101101001011010","0b0101111001011110","0b0100000001000000","0b0011110000111100","0b0001000000010000","0b0010100000101000","0b0100010001000100","0b0111110001111100","0b0100010001000100","0b0100010001000100","0b0111100001111000","0b0100010001000100","0b0111100001111000","0b0100010001000100","0b0100010001000100","0b0111100001111000","0b0011100000111000","0b0100010001000100","0b0100000001000000","0b0100000001000000","0b0100010001000100","0b0011100000111000","0b0111100001111000","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0111100001111000","0b0111110001111100","0b0100000001000000","0b0111100001111000","0b0100000001000000","0b0100000001000000","0b0111110001111100","0b0111110001111100","0b0100000001000000","0b0111100001111000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0011100000111000","0b0100000001000000","0b0100000001000000","0b0101110001011100","0b0100010001000100","0b0011100000111000","0b0100010001000100","0b0100010001000100","0b0111110001111100","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0111110001111100","0b0001000000010000","0b0001000000010000","0b0001000000010000","0b0001000000010000","0b0111110001111100","0b0111110001111100","0b0001000000010000","0b0001000000010000","0b0001000000010000","0b1001000010010000","0b0110000001100000","0b0100010001000100","0b0100100001001000","0b0101000001010000","0b0111000001110000","0b0100100001001000","0b0100010001000100","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0111110001111100","0b0100010001000100","0b0110110001101100","0b0101010001010100","0b0101010001010100","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0110010001100100","0b0101010001010100","0b0100110001001100","0b0100010001000100","0b0100010001000100","0b0011100000111000","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0011100000111000","0b0111100001111000","0b0100010001000100","0b0100010001000100","0b0111100001111000","0b0100000001000000","0b0100000001000000","0b0011100000111000","0b0100010001000100","0b0100010001000100","0b0101010001010100","0b0100100001001000","0b0011010000110100","0b0111100001111000","0b0100010001000100","0b0100010001000100","0b0111100001111000","0b0100100001001000","0b0100010001000100","0b0011100000111000","0b0100010001000100","0b0011000000110000","0b0000100000001000","0b0100010001000100","0b0011100000111000","0b0111110001111100","0b0001000000010000","0b0001000000010000","0b0001000000010000","0b0001000000010000","0b0001000000010000","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0011100000111000","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0010100000101000","0b0010100000101000","0b0001000000010000","0b0100010001000100","0b0100010001000100","0b0101010001010100","0b0101010001010100","0b0110110001101100","0b0100010001000100","0b0100010001000100","0b0010100000101000","0b0001000000010000","0b0010100000101000","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0011100000111000","0b0001000000010000","0b0001000000010000","0b0001000000010000","0b0111110001111100","0b0000010000000100","0b0000100000001000","0b0001000000010000","0b0010000000100000","0b0111110001111100","0b0110000001100000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0110000001100000","0b0100000001000000","0b0100000001000000","0b0010000000100000","0b0010000000100000","0b0001000000010000","0b0001000000010000","0b0110000001100000","0b0010000000100000","0b0010000000100000","0b0010000000100000","0b0010000000100000","0b0110000001100000","0b0001000000010000","0b0010100000101000","0b0100010001000100","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0111111001111110","0b0100000001000000","0b0010000000100000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0011100000111000","0b0000010000000100","0b0011110000111100","0b0100010001000100","0b0011110000111100","0b0100000001000000","0b0101100001011000","0b0110010001100100","0b0100010001000100","0b0100010001000100","0b0111100001111000","0b0000000000000000","0b0011100000111000","0b0100000001000000","0b0100000001000000","0b0100010001000100","0b0011100000111000","0b0000010000000100","0b0011010000110100","0b0100110001001100","0b0100010001000100","0b0100010001000100","0b0011110000111100","0b0000000000000000","0b0011100000111000","0b0100010001000100","0b0111110001111100","0b0100000001000000","0b0011100000111000","0b0000011000000110","0b0000100000001000","0b0001110000011100","0b0000100000001000","0b0000100000001000","0b0000100000001000","0b0000000000000000","0b0011110000111100","0b0100010001000100","0b0011110000111100","0b0000010000000100","0b0011100000111000","0b0100000001000000","0b0100000001000000","0b0101100001011000","0b0110010001100100","0b0100010001000100","0b0100010001000100","0b0010000000100000","0b0000000000000000","0b0110000001100000","0b0010000000100000","0b0010000000100000","0b0111000001110000","0b0001000000010000","0b0000000000000000","0b0011000000110000","0b0001000000010000","0b1001000010010000","0b0110000001100000","0b0100000001000000","0b0100100001001000","0b0101000001010000","0b0110000001100000","0b0101000001010000","0b0100100001001000","0b0110000001100000","0b0010000000100000","0b0010000000100000","0b0010000000100000","0b0010000000100000","0b0111000001110000","0b0000000000000000","0b0110100001101000","0b0101010001010100","0b0101010001010100","0b0101010001010100","0b0101010001010100","0b0000000000000000","0b0101100001011000","0b0110010001100100","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0000000000000000","0b0011100000111000","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0011100000111000","0b0000000000000000","0b0111100001111000","0b0100010001000100","0b0111100001111000","0b0100000001000000","0b0100000001000000","0b0000000000000000","0b0011110000111100","0b0100010001000100","0b0011110000111100","0b0000010000000100","0b0000010000000100","0b0000000000000000","0b0101100001011000","0b0110010001100100","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0000000000000000","0b0011110000111100","0b0100000001000000","0b0011100000111000","0b0000010000000100","0b0111100001111000","0b0010000000100000","0b0111100001111000","0b0010000000100000","0b0010000000100000","0b0010010000100100","0b0001100000011000","0b0000000000000000","0b0100010001000100","0b0100010001000100","0b0100010001000100","0b0100110001001100","0b0011010000110100","0b0000000000000000","0b0100010001000100","0b0100010001000100","0b0010100000101000","0b0010100000101000","0b0001000000010000","0b0000000000000000","0b0100010001000100","0b0100010001000100","0b0101010001010100","0b0101010001010100","0b0010100000101000","0b0000000000000000","0b0110010001100100","0b0001100000011000","0b0001000000010000","0b0011000000110000","0b0100110001001100","0b0000000000000000","0b0100010001000100","0b0100010001000100","0b0011110000111100","0b0000010000000100","0b0011100000111000","0b0000000000000000","0b0111110001111100","0b0000100000001000","0b0001000000010000","0b0010000000100000","0b0111110001111100","0b0011000000110000","0b0010000000100000","0b0100000001000000","0b0100000001000000","0b0010000000100000","0b0011000000110000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0100000001000000","0b0110000001100000","0b0010000000100000","0b0001000000010000","0b0001000000010000","0b0010000000100000","0b0110000001100000","0b0000000000000000","0b0010000000100000","0b0101010001010100","0b0000100000001000","0b0000000000000000","0b0000000000000000","0b0111011101110111","0b0100010101000101","0b0111011001110110","0b0100010101000101","0b0100010101000101","0b0111010101110101","0b1000000010000000","0b1000000010000000","0b1000000010000000","0b1000000010000000","0b1000000010000000","0b1000000010000000","///"],
    "sys.kbd.scancode_charcode_table":["///","sys.kbd.scancode_charcode_table:","0b0000000000000000","0b0001001100010011","0b0000000000000000","0b0000111100001111","0b0000110100001101","0b0000101100001011","0b0000110000001100","0b0001011000010110","0b0000000000000000","0b0001010000010100","0b0001001000010010","0b0001000000010000","0b0000111000001110","0b0000001000000010","0b1010110001100000","0b0000000000000000","0b0000000000000000","0b0000011000000110","0b0000010000000100","0b0000000000000000","0b0000010100000101","0b0101000101110001","0b0010000100110001","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0101101001111010","0b0101001101110011","0b0100000101100001","0b0101011101110111","0b0010001000110010","0b0000000000000000","0b0000000000000000","0b0100001101100011","0b0101100001111000","0b0100010001100100","0b0100010101100101","0b0010010000110100","0b1010001100110011","0b0000000000000000","0b0000000000000000","0b0010000000100000","0b0101011001110110","0b0100011001100110","0b0101010001110100","0b0101001001110010","0b0010010100110101","0b0000000000000000","0b0000000000000000","0b0100111001101110","0b0100001001100010","0b0100100001101000","0b0100011101100111","0b0101100101111001","0b0101111000110110","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0100110101101101","0b0100101001101010","0b0101010101110101","0b0010011000110111","0b0010101000111000","0b0000000000000000","0b0000000000000000","0b0011110000101100","0b0100101101101011","0b0100100101101001","0b0100111101101111","0b0010100100110000","0b0010100000111001","0b0000000000000000","0b0000000000000000","0b0011111000101110","0b0011111100101111","0b0100110001101100","0b0011101000111011","0b0101000001110000","0b0101111100101101","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0100000000100111","0b0000000000000000","0b0111101101011011","0b0010101100111101","0b0000000000000000","0b0000000000000000","0b0000001100000011","0b0000011100000111","0b0000100000001000","0b0111110101011101","0b0000000000000000","0b0111110001011100","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000100000001","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0001110000011100","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0001111000011110","0b0000000000000000","0b0001101100011011","0b0001110100011101","0b0000100100001001","0b0000000000000000","0b0001010100010101","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0000000000000000","0b0001000100010001","///"],
    "sys.vram.shifted_pixels":["///", "sys.vram.shifted_pixels:", "0b1000000000000000", "0b0100000000000000", "0b0010000000000000", "0b0001000000000000", "0b0000100000000000", "0b0000010000000000", "0b0000001000000000", "0b0000000100000000", "0b0000000010000000", "0b0000000001000000", "0b0000000000100000", "0b0000000000010000", "0b0000000000001000", "0b0000000000000100", "0b0000000000000010", "0b0000000000000001", "///"]
}
