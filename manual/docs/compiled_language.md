# Introduction
**Blizzard 4 Compiled Language** (file extension `.b4`) is a statically & strongly typed, general purpose, procedural programming language. Much like C, it is designed to efficiently map high-level constructs to machine code instructions. Blocks are indented with two spaces, therefore whitespace at the start of lines is significant.

Compiled programs contain no runtime environment.

### Scope
local scope:
occupied by local variables and arguments

global scope:
occupied by function names and global variables

local variables/arguments can shadow global variables/constants, for example

```javascript
global str my_string "global"

def func1()
  var str my_string "local"
  sys.print_string(my_string)

def func2()
  sys.print_string(my_string)

// prints "local"
func1()

// prints "global"
func2()
```

### Names
Variables, arguments, constants and functions are all referred to by alphanumeric names. There are a number of restrictions
- must not start with number
- must not be a reserved keyword
- must not already exist in the scope that it is being created in
- must not be the name of a data type

### Reserved Keywords
`if` `for` `while` `repeat` `struct` `def` `true` `false` `sys` `sys.odd` `sys.ov` `array` `return` `break` `continue` `include` `__root` `__global`

# Syntax
Each line in a `b4` program must be one of the following:
- a command
- a control structure
- a function call
- a comment
- a blank line
- an inline assembly block


Words in **bold** words are part of the syntax of a token.

Items in **[square brackets]** are required parameters. Items in **<triangular brackets\>** are optional parameters.

## Commands

+ **var** [type] [name] <expression\>

Declare a local variable of the specified type with the specified name. e.g.
```javascript
var u32 counter 123456789
```

+ **const** [type] [name] <expression\>

Declare a global constant of the specified type with the specified name. e.g.
```javascript
const u16 speed 340
```

+ **global** [type] [name] <expression\>

Declare a global variable of the specified type with the specified name. e.g.
```javascript
global bool shift_key_pressed true
```

+ **free** [name]

De-allocated the memory assigned to a local or global variable. The variable cannot then be refered to after this command.
```javascript
free my_array
```

+ **include** [name]

Load an object from the standard library. This is not necessary when calling functions from the standard library because they are automatically included when you call them. Use the name ```*``` to include the entire standard library.
```javascript
// load the font used to print text
include sys.vram.glyphs
```

+ **return** <expression\>

End execution of a function and pass control back to the caller of the function. If the function has a return type that is not 'none', then this command can also pass a value back to the caller.
```javascript
def my_func() -> u16
  // ends the execution of the function and returns 42 to the caller
  return 42
```

+ **break**

Terminate the innermost loop control structure.
```javascript
// some_func is called for 0, 1 and 2
for var u16 i; i < 10; i++
  if i == 3
    break
  some_func(i)

```

+ **continue**

Skip the current cycle of the innermost loop and begin the next cycle (if the loop condition is still met).
```javascript
// some_func is called for 0, 1, 2, and 4
for var u16 i; i < 5; i++
  if i == 3
    continue
  some_func(i)
```

+ [name] **=** [value]

Assign the *value* to the argument/variable called *name*.
```javascript
// sets my_variable to 42
my_variable = 42
```

+ **\***[name] **=** [value]

Write the specified *value* to the memory address contained in the ```u16``` type *name*.
```javascript
// write 0xffff to the address stored in some_addr
*some_addr = 0xffff
```

+ [name] **+=** [expression]

Add the value of the *expression* to the variable/argument called *name*.
```javascript
// adds 12 to my_num
my_num += 12
```

+ [name] **-=** [expression]

Subtract the value of the *expression* from the variable/argument called *name*.
```javascript
// subtracts 12 from my_num
my_num -= 12
```

+ [name] **\*=** [expression]

Multiply the value of the variable/argument called *name* by the value of the *expression*.
```javascript
// multiplies my_num by 2
my_num *= 2
```

+ [name] **/=** [expression]

Divide the value of the variable/argument called *name* by the value of the *expression*.
```javascript
// divides my_num by 2
my_num /= 2
```

Modulo the value of the variable/argument called *name* by the value of the *expression*.
+ [name] **%=** [expression]

```javascript
// stores the modulo of my_num and 2 in my_num
my_num %= 2
```

+ [name]**++**

Increment *name* by 1.
```javascript
// adds one to my_num
my_num++
```

+ [name]**--**

Decrement *name* by 1.
```javascript
// subtracts one from my_num
my_num--
```

+ **sig** [name]( <args> ) < -> type>

Defines the signature of function *name*. This gives the compiler all the information it needs to compile calls to the function. The function can then either be defined later in the program or it can be linked at assembly time.

```javascript
// the function signature of the u16_multiply standard library function
sig sys.u16_multiply(u16 a, u16 b) -> u16
```

#### Array-Only Commands
+ [array name]**.append(**[expression]**)**

Append the value of *expression* to the end of array. The type of *expression* must be the same as the type of the array. The type of *index* must be ```u16```.
```javascript
// appends "hello" to the end of the array
my_array.append("hello")
```

+ [array name]**.insert(**[index expr.], [expression]**)**

Insert the value of *expression* into the *index* position of the array. Any elements after the specified index are shifted down to make space for the new value. The type of *expression* must be the same as the type of the array. The type of *index* must be ```u16```.
```javascript
// inserts "hello" at the start of the array
my_array.insert(0,"hello")
```

+ [array name]**[**[index expr.]**]** **=** [expression]

Set the element at *index* to have the value of *expression*. The type of *expression* must be the same as the type of the array. The type of *index* must be ```u16```.
```javascript
// sets the 4th element of the array to "hello"
my_array[3] = "hello"
```

## Expressions

+ **true**
Hardcoded value representing a boolean true.
+ **false**
Hardcoded value representing a boolean false.

+ [name]

The names of variables/arguments and constant are expressions because they return the value of the item.
```javascript
my_var
```

+ **\***[name]

Returns the value at the memory location pointed to by the ```u16``` type variable/argument/constant called *name*.
```javascript
*some_addr
```

+ [name]**(**[expressions]**)**

```javascript
my_function(arg1, arg2, my_var % other_var)
```

+ [name] ***operator*** [name]

```javascript
my_var * other_var
```

+ **(**[type],<length\>**)[**[expressions]**]**

```javascript
var array test (u16,16)[1,2,3,4]
```

#### Array-Only Expressions
+ [array name]**[**[index]**]**

Returns the item at the given *index* of the array without modifying the array. The data type is determined by the type of array. Indexes are zero-based.
```javascript
// print the 4th element of my_array
sys.print_string(my_array[3])
```

+ [array name]**.len()**

Returns the current length of the array as type ```u16```.
```javascript
// prints the current length of my_array
sys.print_u16(my_array.len())
```

+ [array name]**.max_len()**

Returns the maximum length of the array as type ```u16```.
```javascript
for var u16 i; i < my_array.max_len(); i++
// fill my_array with zeroes
  my_array[i] = 0
```

+ [array name]**.pop()**

Removes the last element of the array and returns it. The data type is determined by the type of array.
```javascript
// where my_array is an array of strings,
// print out the items of my_array in reverse order
while my_array.len() > 0
  sys.print_string(my_array.pop())
```


## Control Structures

+ **if** [conditional expression]

If the conditional expression is true, then the commands in the block will be executed. Otherwise, the block is skipped.
```javascript
// execute some_func only if my_var is 123
if my_var == 123
  some_func()
```

+ **else if** [conditional expression]

Execute this block if the ```if``` statement's condition is not met but this conditional expression is.
```javascript
if my_var == 123
  // the value is 123
else if my_var == 321
  // the value is 321
```

+ **else**

Can only be used following and ```if``` or ```else if``` structure. Executes block if the ```if``` statement's (and any subsequent ```else if``` statement's) conditions were false.
```javascript
if my_var == 123
  // the value is 123
else
  // the value is not 123
```

+ **while** [conditional expression]

Loops until the conditional expression is false. **NOTE the condition must initially be true for the first iteration to occur. This is the case for most languages but not all.**
```javascript
// print numbers 10 to 1
var u16 counter 10
while counter > 0
  sys.print_u16(counter)
  counter--
```

+ **for** [setup command]**;** [cond. expression]**;** [loop command]

Useful control structure for iteration. Firstly, the setup command is executed. Then, if the conditional expression is true, the body will be executed. Finally, the loop command will be executed. Looping continues until the conditional expression becomes false.
```javascript
// print numbers 0, 1, 2, 3 and 4
for var u16 i; i < 5; i++
  sys.print_u16(i)
```

+ **def** [name]\( <args\> \) < -> type\>

Defines a new function. If the return data type is not specified, it defaults to 'none'. This means the function cannot return a value.

```javascript
// the standard library function used to multiply ints
def sys.u16_multiply(u16 a, u16 b) -> u16
  var u16 ans
  while b > 0
    if b sys.odd
      ans += a  
    a = a <<
    b = b >>
  return ans
```

+ **repeat** [number]

**NOTE this is not for general use, only for unrolling performance-critical loops.** Repeat a block of code the specified number of times. This causes the compiler to emit the contained commands *number* times. Therefore large numbers will result in very large program sizes. Also, *number* must be static and known at compile time.

```javascript
def shift_right(u16 start = 6144, u16 end = 7167)
  // shift a portion of the screen right one pixel
  while end > start
    // the following code only needs to be written out once
    // but will be present 8 times in the assembly output
    repeat 8
      {write 1 alu.2}
      {copy $end alu.1}
      {copy alu.>> $end}
      {write $end alu.1}
      {write [alu.-] &end}
```

### Mathematical Operators
| Symbol | Operation | Defined for | Return type |
| :----: | :-------: | :---------: | ----------- |
| `+` | addition | `u16 s16 u32 s32` | (same as input) |
| `-` | subtraction | `u16 s16 u32 s32` | (same as input) |
| `/` | division | `u16 s16 u32 s32` | (same as input) |
| `*` | multiplication | `u16 s16 u32 s32` | (same as input) |
| `^` | exponentiation | `u16 s16 u32 s32` | (same as input) |
| `%` | modulo | `u16 s16 u32 s32` | (same as input) |
| `&` | bit-wise AND | `bool u16 s16 u32 s32` | (same as input) |
| `\|` | bit-wise OR | `bool u16 s16 u32 s32` | (same as input) |
| `!` | bit-wise NOT | `bool u16 s16 u32 s32` | (same as input) |
| `>>` |  bit-shift 1 bit right | `u16 s16 u32 s32` | (same as input) |
| `<<` |  bit-shift 1 bit left | `u16 s16 u32 s32` | (same as input) |
| `>` | greater than | `u16 s16 u32 s32` | `bool` |
| `<` | less than | `u16 s16 u32 s32` | `bool` |
| `>=` |  greater than or equal to | `u16 s16 u32 s32` | `bool` |
| `<=` |  less than or equal to | `u16 s16 u32 s32` | `bool` |
| `==` |  equal | `bool u16 s16 u32 s32` | `bool` |
| `!=` |  not equal | `bool u16 s16 u32 s32` | `bool` |
| `sys.odd` | true if number is odd | `u16 s16 u32 s32` | `bool` |
| `sys.ov` | true if the last calculation<br> overflowed | `n/a` | `bool` |

## Inline assembly

#### Single line mode
Single lines of assembly language can be included as if they were any other command. Simply enclose the assembly in a pair of hash characters:
```javascript
#copy [alu.+] [ram.0]#
```
In this mode there are special symbols that can be used to refer to variables that exist in the compiled program:

- Address of variable: **&**[name]
- Value of variable: **$**[name]

| ```.b4``` becomes -> | assembly |
| :------------------- | :------- |
| `var u16 test 0xffff`<br>`#write &test vram.0#`<br>`#write $test vram.0#` | `write 0xffff stack.0`<br>`write stack.0 vram.0`<br>`write [stack.0] vram.0` |

If the variable's data type is more than one word long, a (zero-based) index in square brackets can be added to specify which word in should be referred to:

- Address of variable: **&**[name]**[**index**]**
- Value of variable: **$**[name]**[**index**]**

| ```.b4``` becomes -> | assembly |
| :------------------- | :------- |
| `var u16 u32 0xffffffff`<br>`#write &test[1] vram.0#`<br>`#write $test[1] vram.0#` | `write 0xffff stack.0`<br>`write 0xffff stack.1`<br>`write stack.1 vram.0`<br>`write [stack.1] vram.0` |



#### Multi-line assembly mode
```
###
// assembly goes here
// supports multiple lines
0b1111111111111111
###
```
Multi-line blocks completely bypass the compiler and are included directly in the assembly output. This is useful for including raw data in a program.


## Data types

| Name | Description | Default Value |
| ---- | ----------- | ------------- |
| `bool` | Holds only true or false | `false` |
| `str` | Holds an immutable ASCII string | `""` |
| `array` | A collection of indexable values | `n/a` |
| `none` | Dummy type for functions that<br> do not return a value | `n/a` |
| `u16` | (see numerical types) | `0` |
| `s16` | (see numerical types) | `0` |
| `u32` | (see numerical types) | `0` |
| `s32` | (see numerical types) | `0` |
| `float` | *coming soon* | `0` |
| `double` | *coming soon* | `0` |

#### Numerical types

| Name | Size | Type | Format | Range |
| ---- | ---- | ---- | ------ | :---: |
| `u16` | 16 bit | integer | unsigned | 0 to 65535 |
| `s16` | 16 bit | integer | two's complement | -32767 to 32767 |
| `u32` | 32 bit | integer | unsigned | 0 to 4.29 x 10⁹ |
| `s32` | 32 bit | integer | two's complement| -2.15 x 10⁹ to 2.15 x 10⁹ |
