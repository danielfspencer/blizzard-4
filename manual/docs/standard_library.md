sys.**u16_multiply**(u16 a, u16 b) -> u16

sys.**u16_divide**(u16 a, u16 b) -> u16

sys.**u16_exponent**(u16 a, u16 b) -> u16

sys.**u16_modulo**(u16 a, u16 b) -> u16

sys.**s16_multiply**(s16 a, s16 b) -> s16

sys.**s16_divide**(s16 a, s16 b) -> s16

sys.**s16_exponent**(s16 a, s16 b) -> s16

sys.**s16_modulo**(s16 a, s16 b) -> s16

sys.**s16_rshift**(s16 a) -> s16

sys.**u32_add**(u32 a, u32 b) -> u32

sys.**u32_subtract**(u32 a, u32 b) -> u32

sys.**u32_multiply**(u32 a, u32 b) -> u32

sys.**u32_divide**(u32 a, u32 b) -> u32

sys.**u32_exponent**(u32 a, u32 b) -> u32

sys.**u32_modulo**(u32 a, u32 b) -> u32

sys.**u32_lshift**(u32 a) -> u32

sys.**u32_rshift**(u32 a) -> u32

sys.**u32_not_equal**(u32 a, u32 b) -> bool

sys.**u32_equal**(u32 a, u32 b) -> bool

sys.**u32_greater**(u32 a, u32 b) -> bool

sys.**u32_less**(u32 a, u32 b) -> bool

sys.**s32_multiply**(s32 a, s32 b) -> s32

sys.**s32_divide**(s32 a, s32 b) -> s32

sys.**s32_exponent**(s32 a, s32 b) -> s32

sys.**s32_modulo**(s32 a, s32 b) -> s32

sys.**s32_rshift**(s32 a) -> s32

sys.**s32_greater**(s32 a, s32 b) -> bool

sys.**s32_less**(s32 a, s32 b) -> bool

sys.**mem_copy**(u16 origin_addr, u16 target_addr, u16 length)

sys.**array_set**(u16 base_addr, u16 item_size, u16 index, u16 item_addr)

sys.**array_read**(u16 base_addr, u16 item_size, u16 index, u16 target_addr)

sys.**array_shift**(u16 base_addr, u16 item_size, u16 index, u16 length)

sys.**vram.set_pixel**(u16 x, u16 y, bool data = true)

sys.**vram.render_char**(u16 char_code, u16 x, u16 y, bool dont_render_spaces = true)

sys.**vram.draw_hex_digit**(u16 num, u16 x, u16 y)

sys.**vram.fast_fill**(u16 data)

sys.**vram.clear**()

sys.**vram.draw_square**(u16 x, u16 y, u16 length, bool data = true)

sys.**vram.draw_circle**(u16 x, u16 y, u16 radius, bool data = true)

sys.**vram.draw_line**(u16 x0, u16 y0, u16 x1, u16 y1, bool data = true)

sys.**print_string**(str string, u16 x = 0, u16 y = 0)

sys.**print_u16**(u16 num, u16 x = 0, u16 y = 0, bool print_all_places = false)

sys.**print_u16_as_hex**(u16 num, u16 x = 0, u16 y = 0, bool print_all_places = false)

sys.**print_s16**(s16 num, u16 x = 0, u16 y = 0, bool print_all_places = false)

sys.**print_u32**(u32 num, u16 x = 0, u16 y = 0, bool print_all_places = false)

sys.**print_s32**(s32 num, u16 x = 0, u16 y = 0, bool print_all_places = false)

sys.**kbd.scancode_to_charcode**(u16 scancode, bool shifted = false) -> u16

sys.**kbd.get_charcode**() -> u16

sys.**get_lib_version**() -> str
