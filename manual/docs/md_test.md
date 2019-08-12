*   [Working ](#overview)
*   [Not working](#philosophy)

| Name | Size | Type | Format | Range |
| ---- | ---- | ---- | ------ | :---: |
| `int` | 16 bit | integer | unsigned | 0 to 65535 |
| `sint` | 16 bit | integer | two's complement | -32767 to 32767 |
| `long` | 32 bit | integer | unsigned | 0 to 4.29 x 10⁹ |
| `slong` | 32 bit | integer | two's complement| -2.15 x 10⁹ to 2.15 x 10⁹ |

<h2 id="overview">Overview</h2>

### Mathematical Operators
| Symbol | Operation | Defined for | Return type |
| :----: | :-------: | :---------: | ----------- |
| `+` | addition | `int sint long slong` | (same as input) |
| `-` | subtraction | `int sint long slong` | (same as input) |
| `/` | division | `int sint long slong` | (same as input) |
| `*` | multiplication | `int sint long slong` | (same as input) |
| `^` | exponentiation | `int sint long slong` | (same as input) |
| `%` | modulo | `int sint long slong` | (same as input) |
| `&` | bit-wise AND | `bool int sint long slong` | (same as input) |
| `\|` | bit-wise OR | `bool int sint long slong` | (same as input) |
| `!` | bit-wise NOT | `bool int sint long slong` | (same as input) |
| `>>` |  bit-shift 1 bit right | `int sint long slong` | (same as input) |
| `<<` |  bit-shift 1 bit left | `int sint long slong` | (same as input) |
| `>` | greater than | `int sint long slong` | `bool` |
| `<` | less than | `int sint long slong` | `bool` |
| `>=` |  greater than or equal to | `int sint long slong` | `bool` |
| `<=` |  less than or equal to | `int sint long slong` | `bool` |
| `==` |  equal | `bool int sint long slong` | `bool` |
| `!=` |  not equal | `bool int sint long slong` | `bool` |
| `sys.odd` | true if number is odd | `int sint long slong` | `bool` |
| `sys.ov` | true if the last calculation<br> overflowed | `n/a` | `bool` |

### philosophy


### Mathematical Operators
| Symbol | Operation | Defined for | Return type |
| :----: | :-------: | :---------: | ----------- |
| `+` | addition | `int sint long slong` | (same as input) |
| `-` | subtraction | `int sint long slong` | (same as input) |
| `/` | division | `int sint long slong` | (same as input) |
| `*` | multiplication | `int sint long slong` | (same as input) |
| `^` | exponentiation | `int sint long slong` | (same as input) |
| `%` | modulo | `int sint long slong` | (same as input) |
| `&` | bit-wise AND | `bool int sint long slong` | (same as input) |
| `\|` | bit-wise OR | `bool int sint long slong` | (same as input) |
| `!` | bit-wise NOT | `bool int sint long slong` | (same as input) |
| `>>` |  bit-shift 1 bit right | `int sint long slong` | (same as input) |
| `<<` |  bit-shift 1 bit left | `int sint long slong` | (same as input) |
| `>` | greater than | `int sint long slong` | `bool` |
| `<` | less than | `int sint long slong` | `bool` |
| `>=` |  greater than or equal to | `int sint long slong` | `bool` |
| `<=` |  less than or equal to | `int sint long slong` | `bool` |
| `==` |  equal | `bool int sint long slong` | `bool` |
| `!=` |  not equal | `bool int sint long slong` | `bool` |
| `sys.odd` | true if number is odd | `int sint long slong` | `bool` |
| `sys.ov` | true if the last calculation<br> overflowed | `n/a` | `bool` |
