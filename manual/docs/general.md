<h2><a name="intro">Introduction</a></h2>
Blizzard 4 is a 16-bit computer capable of advanced arithmetic (through software), logical operations and basic graphics via its 128x128
display. It has a small (RISC) instructon set that is designed with simplicity in mind. Every function of the computer is memory-mapped
to simplify the hardware design. It has been designed around a transport triggered architecture.

<h2><a name="set">Instruction Set</a></h2>
<table id="ops">
  <tr style="font-weight: bold;">
    <td style="width: 80px;">Opcode<sub>2</sub>
    <td style="width: 80px;">Opcode<sub>10</sub></td>
    <td style="width: 80px;">Name</td>
    <td style="width: 130px;">Arguments</td>
    <td>Description</td>
  </tr>
  <tr><td>000</td><td>0</td><td>stop</td><td>none</td><td>stops the computer</td></tr>
  <tr><td>001</td><td>1</td><td>return</td><td>none</td><td>returns to function call (and moves to the previous frame)</td></tr>
  <tr><td>010</td><td>2</td><td>goto</td><td>address</td><td>sets the program counter to the specified address</td></tr>
  <tr><td>011</td><td>3</td><td>call</td><td>address</td><td>calls the function at the given address (moves to next frame up)</td></tr>
  <tr><td>100</td><td>4</td><td>write</td><td>data, address</td><td>writes the data to the address</td></tr>
  <tr><td>101</td><td>5</td><td>copy</td><td>address, address</td><td>writes the data at the first address to the second</td></tr>
</table>
