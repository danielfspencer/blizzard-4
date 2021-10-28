## Reset Behaviour

The only register which has a defined value\* after system reset is the program counter.
It can be one of two values depending on the "Boot Mode" setting of the control unit.

| Boot Mode | Value |
| --------------- | ----- |
| Flash | 0x2000 |
| RAM | 0x4000 |

See the [Flash unit](/manual/docs/isa/flash.md) documentation for more details.

\* the value of any other register is undefined after system reset.
Software should therefore ensure that the stack pointer is set to a known value before any instructions which use it are executed.
