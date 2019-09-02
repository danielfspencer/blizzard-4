### Card 0 (Control Unit)

| base address | 0 |
| --- | --- |
| active when addr bus = | 0b00000xxxxxxxxxxx |

| Absolute<br>Address | Internal<br>Address | Description |	Mnemonic | Read/Write | Width<br>(bits) |
| --- | --- | --- | --- | --- | --- |
| 1 |	1	| Conditional Bit | `ctl.cnd`	| R/W	| 1
| 2	| 2	| RAM addressing mode	| `ctl.addrmode` |W |	1
| 4	| 4	| RAM frame number | `ctl.framenum`	| R/W |	1
| 8	| 8	| 32-bit timer (lower 16 bits) | `ctl.lowtimer`	| R |	16
| 16 | 16	| 32-bit timer (upper 16 bits) | `ctl.hightimer` | R | 16

<br>

---

### Card 1 (ALU)

| base address | 2048 |
| --- | --- |
| active when addr bus = | 0b00001xxxxxxxxxxx |

| Absolute<br>Address | Internal<br>Address | Description |	Mnemonic | Read/Write | Width<br>(bits) |
| --- | --- | --- | --- | --- | --- |
| 2048 | 0 | Operand 1 Register | `alu.1` | W | 16 |
| 2049 | 1 | Operand 2 Register | `alu.2` | W | 16 |
| 2050 | 2 | Addition | `alu.+` | R | 16 |
| 2051 | 3 | Subtraction | `alu.-` | R | 16 |
| 2052 | 4 | 1-bit logical right shift | `alu.>>` | R | 15 |
| 2053 | 5 | 1-bit logical left shift | `alu.<<` | R | 15 |
| 2054 | 6 | bitwise AND | `alu.&` | R | 16 |
| 2055 | 7 | bitwise OR | `alu.\|` | R | 16 |
| 2056 | 8 | operand 1 NOT | `alu.!` | R | 16 |
| 2057 | 9 | op.1 greater than op.2 | `alu.>` | R | 1 |
| 2058 | 10 | op.1 less than op.2 | `alu.<` | R | 1 |
| 2059 | 11 | op.1 equal to op.2 | `alu.=` | R | 1 |
| 2060 | 12 | has addition overflowed? | `alu.ov` | R |	1 |

<br>

---

### Card 2 (User I/O)

| base address | 4096 |
| --- | --- |
| active when addr bus = | 0b00010xxxxxxxxxxx |

| Absolute<br>Address | Internal<br>Address | Description |	Mnemonic | Read/Write | Width<br>(bits) |
| --- | --- | --- | --- | --- | --- |
| 4096 | 0 | User input switches #1 | `usrio.inp1` | R | 16 |
| 4097 | 1 | User input switches #2 | `usrio.inp2` | R | 16 |
| 4098 | 2 | User input switches #3 | `usrio.inp3` | R | 16 |
| 4099 | 3 | Output LEDs row #1 | `usrio.out1` | W | 16 |
| 4100 | 4 | Output LEDs row #2 | `usrio.out2` | W | 16 |
| 4101 | 5 | Output LEDs row #3 | `usrio.out3` | W | 16 |

<br>

---

### Card 3 (Video Adapter)

| base address | 6144 |
| --- | --- |
| active when addr bus = | 0b00011xxxxxxxxxxx |

| Absolute<br>Address | Internal<br>Address | Description |	Mnemonic | Read/Write | Width<br>(bits) |
| --- | --- | --- | --- | --- | --- |
| 6144 | 0 | vram first address | `vram.0` | R/W | 16 |
| ... | ... | ... | ... | ... | ... |
| 7167 | 1023 | vram last address | `vram.1023` | R/W	| 16 |

<br>

---

### Card 4 (Keyboard Interface)

| base address | 8192 |
| --- | --- |
| active when addr bus = | 0b00100xxxxxxxxxxx |

| Absolute<br>Address | Internal<br>Address | Description |	Mnemonic | Read/Write | Width<br>(bits) |
| --- | --- | --- | --- | --- | --- |
| 8192 | 0 | ps/2 fifo pop last element | `kbd.pop` | R | 16 |
| 8193 | 1 | fifo queue length<br>NOT IMPLEMENTED | `kbd.len` | R | 8 |
