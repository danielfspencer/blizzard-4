#### Load/fetch controller
Address = 4 bits

<table>
  <tr>
    <td>Bit</td><td>1</td><td>2</td><td>3</td><td>4</td>
  </tr><tr>
    <td>Function</td>
    <td colspan="1">Mode</td>
    <td colspan="2">Arg. count</td>
    <td colspan="1">Is first clock?</td>
  </tr>
</table>


```
001100000
110000000
001100000
110000000
001100000
110000000
000000000
000000000
000000000
001000000
000110101
100001000
000110110
100001000
000000000
000000000
```

#### Execute controller
Address = opcode | is_first_clock

<table>
  <tr>
    <td>Bit</td><td>1</td><td>2</td><td>3</td><td>4</td>
  </tr><tr>
    <td>Function</td>
    <td colspan="3">Opcode</td>
    <td colspan="1">Is first clock?</td>
  </tr>
</table>

```
000000000000
100000000001
000100000001
010000001000
000000000000
000001000001
000011000001
001000000010
000000000000
000000100101
000000000000
000000010101
```
