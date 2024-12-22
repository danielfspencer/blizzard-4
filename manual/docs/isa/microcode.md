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

| Dest. Select <sub>10</sub> | Store data bus value to: |
| --- | --- |
| 0 | Command register |
| 1 | Operand. 1 |
| 2 | Operand. 2 |
| 3 | Direct register |

<table>
  <tr>
    <td colspan="3">Address<sub>2</sub></td>
    <td rowspan="2">Operand <br> Addressing</td>
    <td rowspan="2">Stage Name</td>
    <td colspan="8">&micro; instruction</td>
  </tr>
  <tr>
    <td><div class="rotate">bit 4 <br> Op. 1 direct addr. mode</div></td>
    <td><div class="rotate">bit 3 <br> Op. 2 direct addr. mode</div></td>
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
