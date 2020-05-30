## Instruction Set
`PC = program counter`
`SP = stack pointer`

| Opcode<sub>2</sub> | Opcode<sub>10</sub> | Name | Arguments | Description | Cycles* |
| ------------------ | ------------------- | ---- | --------- | ----------- | ------ |
| 000 | 0 | `stop` | none | stops the computer | 4 |
| 001 | 1 | `return` | PC value, SP value | sets PC & SP to the given values | 4 |
| 010 | 2 | `goto` | address, cond | sets PC to *address* if the LSB of *cond* is 0 | 4 |
| 011 | 3 | `call` | address, frame size| sets PC to *address* & increments SP by *frame size* | 7 |
| 100 | 4 | `write` | data, address | writes *data* to *address* | 4 |
| 101 | 5 | `copy` | address, address | writes the data at the first address to the second address | 4 |

\*Each use of the `[]` substitution syntax requires 1 extra cycle to execute the instruction. Therefore each instruction can take up to 2 cycles longer to execute if both arguments use `[]`.

## Addressing modes

- Immediate mode (value is stored in the instruction)
- Direct mode (address is stored in the instruction)
- Indirect mode (a pointer is stored in the instruction) (only available in the 1st argument of copy)

Use `[]` substitution syntax to use another level of indirect lookup. Promotes each to a higher level.

| Type of arg. | Without substitution | With substitution |
| --- | --- | --- |
| *data* | immediate mode | direct mode |
| *address* | direct mode | indirect mode |


## Machine code format
Each instruction consists of one *command word*  followed by 2 *argument words*.

#### Command word
<table>
  <tr>
    <td>Bit</td><td>15</td><td>14</td><td>13</td><td>12</td><td>11</td><td>10</td><td>9</td><td>8</td><td>7</td><td>6</td><td>5</td><td>4</td><td>3</td><td>2</td><td>1</td><td>0</td>
  </tr><tr>
    <td>Function</td><td colspan="3">Opcode</td>
    <td colspan="2">Addr.<br>Mode</td>
    <td colspan="11">Unused</td>
  </tr>
</table>

#### Argument word
<table>
  <tr>
    <td>Bit</td><td>15</td><td>14</td><td>13</td><td>12</td><td>11</td><td>10</td><td>9</td><td>8</td><td>7</td><td>6</td><td>5</td><td>4</td><td>3</td><td>2</td><td>1</td><td>0</td>
  </tr><tr>
    <td>Function</td>
    <td colspan="16">Address / data</td>
  </tr>
</table>
