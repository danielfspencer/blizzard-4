## Instruction Set
`PC = program counter`

`SP = stack pointer`

| Opcode<sub>2</sub> | Opcode<sub>10</sub> | Name | Operands | Description | Cycles |
| ------------------ | ------------------- | ---- | --------- | ----------- | ------ |
| 000 | 0 | `stop` | none | Stops the clock. | 4 |
| 001 | 1 | `return` | PC value, SP value | Sets PC & SP to the given values.\* | 4 |
| 010 | 2 | `goto` | PC value, condition value | Sets PC to *PC value* if the least-significant bit of *condition value* is 0. | 4 |
| 011 | 3 | `call` | PC value, SP value | Stores the PC of the next instruction to the address *SP value*, then sets the PC and SP to the new values.\* | 5 |
| 100 | 4 | `write` | value, dest. address | Writes *value* to the destination *address* | 4 |
| 101 | 5 | `copy` | source address, dest. address | Copies 1 word from the source to the destination address. | 4 |
| 110 | 6 | `invalid` | none | Stops the clock. | 4 |
| 111 | 7 | `invalid` | none | Stops the clock. | 4 |

\* Stack pointer values must be 2-word aligned (even).
This is because the PC setting operation is always predicated on the 2nd operand's least significant bit equalling 0.

## Addressing Modes

- Immediate mode (value is stored in the instruction)
- Direct mode (address is stored in the instruction)
- Indirect mode (a pointer is stored in the instruction)

| Type of argument | Without substitution | With substitution |
| --- | --- | --- |
| *value* | immediate mode | direct mode |
| *address* | direct mode | indirect mode |


## Machine Code Format
Each instruction consists of one *command word*  followed by 2 *argument words* which contain the value of the operands.
For instructions that have no operands, the argument words are still present but their value is irrelevant.

#### Command Word
<table>
  <tr>
    <td><b>Bit</b></td><td>15</td><td>14</td><td>13</td><td>12</td><td>11</td><td>10</td><td>9</td><td>8</td><td>7</td><td>6</td><td>5</td><td>4</td><td>3</td><td>2</td><td>1</td><td>0</td>
  </tr><tr>
    <td><b>Function</b></td><td colspan="3">Opcode</td>
    <td colspan="3">Addr.<br>Mode Op. 1</td>
    <td colspan="3">Addr.<br>Mode Op. 2</td>
    <td colspan="11">Unused</td>
  </tr>
</table>

#### Argument Word
<table>
  <tr>
    <td><b>Bit</b></td><td>15</td><td>14</td><td>13</td><td>12</td><td>11</td><td>10</td><td>9</td><td>8</td><td>7</td><td>6</td><td>5</td><td>4</td><td>3</td><td>2</td><td>1</td><td>0</td>
  </tr><tr>
    <td><b>Function</b></td>
    <td colspan="16">Address / data</td>
  </tr>
</table>
