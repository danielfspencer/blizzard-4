## Instruction Set
| Opcode<sub>2</sub> | Opcode<sub>10</sub> | Name | Arguments | Description | Cycles |
| ------------------ | ------------------- | ---- | --------- | ----------- | ------ |
| 000 | 0 | `stop` | none | stops the computer | 4 |
| 001 | 1 | `return` | none | returns to function call (and moves to the previous frame) | 5 |
| 010 | 2 | `goto` | address | sets the program counter to the specified address | 6 |
| 011 | 3 | `call` | address | calls the function at the given address (moves to next frame up) | 7 |
| 100 | 4 | `write` | data, address | writes the data to the address | 8 |
| 101 | 5 | `copy` | address, address | copies the data at the first address to the second | 8 |

## Addressing modes
- Immediate mode (value is stored in the instruction)
- Direct mode (address is stored in the instruction)
- Indirect mode (a pointer is stored in the instruction)

Use `[]` substitution syntax to use another level of indirect lookup. Promotes each to a higher level.

| Type of arg. | Without substitution | With substitution |
| --- | --- | --- |
| *data* | immediate mode | direct mode |
| *address* | direct mode | indirect mode |


## Machine code format
Each instruction consists of one *command word*  followed by between 0 and 2 *argument words*.

#### Command word
<table>
  <tr>
    <td>Bit</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td><td>16</td>
  </tr><tr>
    <td>Function</td><td colspan="3">Opcode</td>
    <td colspan="2">Addr.<br>Mode</td>
    <td colspan="10">Unused</td>
    <td>cond.<br>bit</td>
  </tr>
</table>

The first two bits of the command word determine the number of argument words that follow it.

#### Argument word
<table>
  <tr>
    <td>Bit</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td><td>16</td>
  </tr><tr>
    <td>Function</td>
    <td colspan="16">Address / data</td>
  </tr>
</table>

#### Examples
| | 0 args. | 1 arg. | 2 args. |
| --- | --- | --- | --- |
| Format | command word | command word<br>argument word #1 | command word<br>argument word #1<br>argument word #2 |
| Example<br>(assembly) | `return` | `goto 0x8001` | `copy ram.0 alu.1` |
| Example<br>(machine code) | `0010000000000000` | `0100000000000000`<br>`1000000000000001` | `1010000000000000`<br>`0101000000000000`<br>`0000100000000000` |
