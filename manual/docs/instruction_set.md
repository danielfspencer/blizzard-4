## Instruction Set

| Opcode<sub>2</sub> | Opcode<sub>10</sub> | Name | Arguments | Description | Cycles |
| ------------------ | ------------------- | ---- | --------- | ----------- | ------ |
| 000 | 0 | `stop` | none | stops the computer | TODO |
| 001 | 1 | `return` | none | returns to function call (and moves to the previous frame) | TODO |
| 010 | 2 | `goto` | address | sets the program counter to the specified address | TODO |
| 100 | 3 | `call` | address | calls the function at the given address (moves to next frame up) | TODO |
| 101 | 4 | `write` | data, address | writes the data to the address | TODO |
| 111 | 5 | `copy` | address, address | copies the data at the first address to the second | TODO |
