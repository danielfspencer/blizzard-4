### Card 0 (ALU)

| Absolute<br>Address | Internal<br>Address | Description |	Mnemonic | Read/Write | Width<br>(bits) |
| --- | --- | --- | --- | --- | --- |
| 8 | 8 | Operand 1 Register | `alu.1` | W | 16 |
| 9 | 9 | Operand 2 Register | `alu.2` | W | 16 |
| 10 | 10 | Store into Operand 1 & Operand 2 | `alu.1&2` | W | 16 |
| 10 | 10 | Addition | `alu.+` | R | 16 |
| 11 | 11 | Subtraction | `alu.-` | R | 16 |
| 12 | 12 | 1-bit logical right shift | `alu.>>` | R | 15 |
| 14 | 14 | bitwise AND | `alu.&` | R | 16 |
| 15 | 15 | bitwise OR | `alu.\|` | R | 16 |
| 17 | 17 | op.1 greater than op.2 | `alu.>` | R | 1 |
| 18 | 18 | op.1 less than op.2 | `alu.<` | R | 1 |
| 19 | 19 | op.1 equal to op.2 | `alu.=` | R | 1 |
| 20 | 20 | has addition overflowed? | `alu.ov` | R |	1 |

<br>

### Card 2 (User I/O)

| base address | 4096 |
| --- | --- |
| active when addr bus = | 0b00010xxxxxxxxxxx |

| Absolute<br>Address | Internal<br>Address | Description |	Mnemonic | Read/Write | Width<br>(bits) |
| --- | --- | --- | --- | --- | --- |
| 4096 | 0 | User input switches #1 | `io.inp1` | R | 16 |
| 4097 | 1 | User input switches #2 | `io.inp2` | R | 16 |
| 4099 | 3 | Output LEDs row #1 | `io.out1` | W | 16 |
| 4100 | 4 | Output LEDs row #2 | `io.out2` | W | 16 |
| 4102 | 6 | ps/2 fifo pop last element | `io.pop` | R | 16 |

<br>

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
