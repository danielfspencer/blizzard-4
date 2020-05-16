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

### Load/fetch controller
<table>
  <tr>
    <td rowspan="2">Address<sub>2</sub> (&micro;PC)</td>
    <td rowspan="2">Argument Addressing</td>
    <td rowspan="2">Stage Name</td>
    <td colspan="8">&micro; instruction</td>
  </tr>
  <tr>
    <td><div class="rotate">pc -> read bus</div></td>
    <td><div class="rotate">arg 3 -> read bus</div></td>
    <td><div class="rotate">data bus -> command reg</div></td>
    <td><div class="rotate">data bus -> arg 1</div></td>
    <td><div class="rotate">data bus -> arg 2</div></td>
    <td><div class="rotate">data bus -> arg 3</div></td>
    <td><div class="rotate">increment pc</div></td>
    <td><div class="rotate">increment mode</div></td>
  </tr>
  <tr>
    <td>0</td>
    <td rowspan="8">[immediate][immediate]</td>
    <td>fetch</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
  </tr>
  <tr>
    <td>00001</td>
    <td>load arg1</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
  </tr>
  <tr>
    <td>00010</td>
    <td>load arg2</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>00011</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>00100</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>00101</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>00110</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>00111</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01000</td>
    <td rowspan="8">[immediate][direct]</td>
    <td>fetch</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
  </tr>
  <tr>
    <td>01001</td>
    <td>load arg1</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
  </tr>
  <tr>
    <td>01010</td>
    <td>load arg2</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01011</td>
    <td>load arg2</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>01100</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01101</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01110</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01111</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10000</td>
    <td rowspan="8">[direct][immediate]</td>
    <td>fetch</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
  </tr>
  <tr>
    <td>10001</td>
    <td>load arg1</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10010</td>
    <td>load arg1</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
  </tr>
  <tr>
    <td>10011</td>
    <td>load arg2</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>10100</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10101</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10110</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10111</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>11000</td>
    <td rowspan="8">[direct][direct]</td>
    <td>fetch</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
  </tr>
  <tr>
    <td>11001</td>
    <td>load arg1</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>11010</td>
    <td>load arg1</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
  </tr>
  <tr>
    <td>11011</td>
    <td>load arg2</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>11100</td>
    <td>load arg2</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>11101</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>11110</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>11111</td>
    <td></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
</table>

### Execute controller
<table>
  <tr>
    <td rowspan="2">Address<sub>2</sub> (opcode followed by &micro;PC)</td>
    <td rowspan="2">Instruction</td>
    <td rowspan="2">&micro;PC value</td>
    <td colspan="16">&micro; instruction</td>
  </tr>
  <tr>
    <td><div class="rotate">arg 1 -> data bus</div></td>
    <td><div class="rotate">arg 1 -> read bus</div></td>
    <td><div class="rotate">arg 2 - > data bus</div></td>
    <td><div class="rotate">arg 3 -> data bus</div></td>
    <td><div class="rotate">arg 2 + arg 3 -> data bus</div></td>
    <td><div class="rotate">#ctl.sp -> read bus</div></td>
    <td><div class="rotate">pc -> data bus</div></td>
    <td><div class="rotate">#ctl.sp -> write bus</div></td>
    <td><div class="rotate">#stack.0 -> write bus</div></td>
    <td><div class="rotate">#stack.1 -> write bus</div></td>
    <td><div class="rotate">arg 2 -> write bus</div></td>
    <td><div class="rotate">data bus -> arg 3</div></td>
    <td><div class="rotate">arg 1 -> pc [if arg 2 LSB = 0]</div></td>
    <td><div class="rotate">arg 1 -> pc</div></td>
    <td><div class="rotate">stop clock</div></td>
    <td><div class="rotate">increment mode</div></td>
  </tr>
  <tr>
    <td>00000</td>
    <td rowspan="4">stop</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>00001</td>
    <td>1</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>00010</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>00011</td>
    <td>3</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>00100</td>
    <td rowspan="4">return</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>00101</td>
    <td>1</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>00110</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>00111</td>
    <td>3</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01000</td>
    <td rowspan="4">goto</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>01001</td>
    <td>1</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01010</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01011</td>
    <td>3</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01100</td>
    <td rowspan="4">call</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01101</td>
    <td>1</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01110</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>01111</td>
    <td>3</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>10000</td>
    <td rowspan="4">write</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>10001</td>
    <td>1</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10010</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10011</td>
    <td>3</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10100</td>
    <td rowspan="4">copy</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td><div class="one">1</div></td>
  </tr>
  <tr>
    <td>10101</td>
    <td>1</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10110</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <td>10111</td>
    <td>3</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
</table>
