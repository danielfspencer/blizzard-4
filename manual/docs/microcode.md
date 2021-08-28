<style>
.rotate {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
}

.one {
  background: #3399FF;
}
</style>

A \# before the name of a &micro; instruction means that is is active low.

### Load/fetch controller
<table>
  <tr>
    <td colspan="3">Address<sub>2</sub></td>
    <td rowspan="2">Operand <br> Addressing</td>
    <td rowspan="2">Stage Name</td>
    <td colspan="8">&micro; instruction</td>
  </tr>
  <tr>
    <td><div class="rotate">bit 4 <br> Op. 1 addr. mode</div></td>
    <td><div class="rotate">bit 3 <br> Op. 2 addr. mode</div></td>
    <td>bits 2:0 <br> &micro;PC</td>
    <td><div class="rotate"># pc -> read bus</div></td>
    <td><div class="rotate"># op. 3 -> read bus</div></td>
    <td><div class="rotate">dest. select bit 1</div></td>
    <td><div class="rotate">dest. select bit 0</div></td>
    <td><div class="rotate">loading op. 2</div></td>
    <td><div class="rotate">loading op. 1</div></td>
    <td><div class="rotate">increment pc</div></td>
    <td><div class="rotate">increment mode</div></td>
  </tr>
  <tr><td>0</td><td>0</td><td>000</td> <td rowspan="8">imm/imm</td><td>fetch</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td> <td class="one">1</td><td>0</td></tr>
  <tr><td>0</td><td>0</td><td>001</td><td>load arg1</td><td>0</td> <td class="one">1</td><td>0</td> <td class="one">1</td><td>0</td> <td class="one">1</td> <td class="one">1</td><td>0</td></tr>
  <tr><td>0</td><td>0</td><td>010</td><td>load arg2</td><td>0</td> <td class="one">1</td> <td class="one">1</td><td>0</td> <td class="one">1</td><td>0</td> <td class="one">1</td> <td class="one">1</td></tr>
  <tr><td>0</td><td>0</td><td>011</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>0</td><td>100</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>0</td><td>101</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>0</td><td>110</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>0</td><td>111</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>000</td> <td rowspan="8">imm/direct</td><td>fetch</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td> <td class="one">1</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>001</td><td>load arg1</td><td>0</td> <td class="one">1</td><td>0</td> <td class="one">1</td><td>0</td> <td class="one">1</td> <td class="one">1</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>010</td><td>load arg2</td><td>0</td> <td class="one">1</td> <td class="one">1</td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>011</td><td>lookup arg2</td> <td class="one">1</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td> <td class="one">1</td> <td class="one">1</td></tr>
  <tr><td>0</td><td>1</td><td>100</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>101</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>110</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>111</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>000</td> <td rowspan="8">direct/imm</td><td>fetch</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td> <td class="one">1</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>001</td><td>load arg1</td><td>0</td> <td class="one">1</td> <td class="one">1</td> <td class="one">1</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>010</td><td>lookup arg1</td> <td class="one">1</td><td>0</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td> <td class="one">1</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>011</td><td>load arg2</td><td>0</td> <td class="one">1</td> <td class="one">1</td><td>0</td> <td class="one">1</td><td>0</td> <td class="one">1</td> <td class="one">1</td></tr>
  <tr><td>1</td><td>0</td><td>100</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>101</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>110</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>111</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>1</td><td>000</td> <td rowspan="8">direct/direct</td><td>fetch</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td> <td class="one">1</td><td>0</td></tr>
  <tr><td>1</td><td>1</td><td>001</td><td>load arg1</td><td>0</td> <td class="one">1</td> <td class="one">1</td> <td class="one">1</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>1</td><td>010</td><td>lookup arg1</td> <td class="one">1</td><td>0</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td> <td class="one">1</td><td>0</td></tr>
  <tr><td>1</td><td>1</td><td>011</td><td>load arg2</td><td>0</td> <td class="one">1</td> <td class="one">1</td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>1</td><td>100</td><td>lookup arg2</td> <td class="one">1</td><td>0</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td> <td class="one">1</td> <td class="one">1</td></tr>
  <tr><td>1</td><td>1</td><td>101</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>1</td><td>110</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>1</td><td>111</td><td></td> <td class="one">1</td> <td class="one">1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
</table>

### Execute controller
<table>
  <tr>
    <td colspan="2">Address<sub>2</sub></td>
    <td rowspan="2">Instruction</td>
    <td colspan="8">&micro; instruction</td>
  </tr>
  <tr>
    <td><div>bits 4:2 <br> Opcode</div></td>
    <td><div>bits 1:0 <br> &micro;PC</div></td>
    <td><div class="rotate"># op 1 -> data bus</div></td>
    <td><div class="rotate"># op 1 -> read bus</div></td>
    <td><div class="rotate"># op 1 -> PC (if op 2 LSB == 0)</div></td>
    <td><div class="rotate"># op 2 -> write bus</div></td>
    <td><div class="rotate"># op 2 -> SP</div></td>
    <td><div class="rotate"># PC -> data bus</div></td>
    <td><div class="rotate">stop clock</div></td>
    <td><div class="rotate">increment mode</div></td>
  </tr>
  <tr><td>000</td><td>0</td><td rowspan="2">stop</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td></tr>
  <tr><td>000</td><td>1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td>0</td><td>0</td></tr>
  <tr><td>001</td><td>0</td><td rowspan="2">return</td><td class="one">1</td><td class="one">1</td><td>0</td><td class="one">1</td><td>0</td><td class="one">1</td><td>0</td><td class="one">1</td></tr>
  <tr><td>001</td><td>1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td>0</td><td>0</td></tr>
  <tr><td>010</td><td>0</td><td rowspan="2">goto</td><td class="one">1</td><td class="one">1</td><td>0</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td>0</td><td class="one">1</td></tr>
  <tr><td>010</td><td>1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td>0</td><td>0</td></tr>
  <tr><td>011</td><td>0</td><td rowspan="2">call</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td>0</td><td class="one">1</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>011</td><td>1</td><td class="one">1</td><td class="one">1</td><td>0</td><td class="one">1</td><td>0</td><td class="one">1</td><td>0</td><td class="one">1</td></tr>
  <tr><td>100</td><td>0</td><td rowspan="2">write</td><td>0</td><td class="one">1</td><td class="one">1</td><td>0</td><td class="one">1</td><td class="one">1</td><td>0</td><td class="one">1</td></tr>
  <tr><td>100</td><td>1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td>0</td><td>0</td></tr>
  <tr><td>101</td><td>0</td><td rowspan="2">copy</td><td class="one">1</td><td>0</td><td class="one">1</td><td>0</td><td class="one">1</td><td class="one">1</td><td>0</td><td class="one">1</td></tr>
  <tr><td>101</td><td>1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td>0</td><td>0</td></tr>
  <tr><td>110</td><td>0</td><td rowspan="2">invalid</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td></tr>
  <tr><td>110</td><td>1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td>0</td><td>0</td></tr>
  <tr><td>111</td><td>0</td><td rowspan="2">invalid</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td></tr>
  <tr><td>111</td><td>1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td class="one">1</td><td>0</td><td>0</td></tr>
</table>
